<?php
/*
 * Logo contest in the forum (loaded by flarum/extend.php; the /logo-contest page is built by flarum/forum.js).
 *
 * Every submission is a discussion in the "Logo Contest" category (tag logo-contest), the first image in the
 * opening post is the entry. Voting is done with "Like" on the opening post, with these rules:
 * - voting only when logged in and only in the voting phase (after the submission deadline until the end)
 * - one vote per member: whoever picks a different entry loses their old vote
 * - not for your own entry
 * - new submissions in the category only until the submission deadline (the team always)
 * - plausibility check when submitting and editing an entry (BBForumContestCheck): an uploaded PNG,
 *   square, at least 512 × 512, transparent corners, plus a zip with the source file. Otherwise the forum says
 *   what is missing and creates nothing. Photos and pictures on a solid background are filtered out this way.
 *   The team is exempt.
 * The dates are set by scripts/lib/setup-inside.sh (CONTEST_SUBMIT_UNTIL, CONTEST_VOTE_UNTIL in .env).
 * For the page, the API provides bbVotes, bbVoted, bbCanVote and bbFirstPostId on discussions in the category.
 */

use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Tags\Tag;
use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;

if (! class_exists('BBForumContest')) {
    class BBForumContest
    {
        const TAG = 'logo-contest';

        /** [submission deadline, end of voting] as Unix time; 0 if not set */
        public static function dates(): array
        {
            $settings = resolve(SettingsRepositoryInterface::class);
            return [
                (int) strtotime((string) $settings->get('bbforum.contest_submit_until', '')),
                (int) strtotime((string) $settings->get('bbforum.contest_vote_until', '')),
            ];
        }

        public static function voting(): bool
        {
            [$submit, $vote] = self::dates();
            return $submit && $vote && time() > $submit && time() <= $vote;
        }

        public static function inContest(?Discussion $discussion): bool
        {
            return $discussion && $discussion->tags->contains('slug', self::TAG);
        }

        public static function isEntry(Post $post): bool
        {
            return (int) $post->number === 1 && self::inContest($post->discussion);
        }

        public static function isTeam(User $actor): bool
        {
            return $actor->isAdmin() || $actor->groups->contains('id', 4);
        }

        /** After a new vote: remove the same member's votes for other entries */
        public static function keepOneVote(Post $post, User $user): void
        {
            if (! self::isEntry($post)) {
                return;
            }
            $others = Discussion::whereHas('tags', fn ($q) => $q->where('slug', self::TAG))
                ->where('id', '!=', $post->discussion_id)
                ->pluck('first_post_id');
            $post->getConnection()->table('post_likes')
                ->where('user_id', $user->id)
                ->whereIn('post_id', $others)
                ->delete();
        }

        /** Additional data for the contest page on discussions in the category */
        public static function attributes(User $actor, Discussion $discussion): array
        {
            if (! $discussion->relationLoaded('tags') || ! self::inContest($discussion) || ! $discussion->first_post_id) {
                return [];
            }
            $likes = $discussion->getConnection()->table('post_likes')->where('post_id', $discussion->first_post_id);
            $first = Post::find($discussion->first_post_id);
            return [
                'bbFirstPostId' => (string) $discussion->first_post_id,
                'bbVotes' => (clone $likes)->count(),
                'bbVoted' => ! $actor->isGuest() && (clone $likes)->where('user_id', $actor->id)->exists(),
                'bbCanVote' => $first ? $actor->can('like', $first) : false,
            ];
        }
    }

    // "Like" on an entry = vote: only in the voting phase, not for your own
    class BBForumContestLikePolicy extends AbstractPolicy
    {
        public function like(User $actor, Post $post)
        {
            if (! BBForumContest::isEntry($post)) {
                return null;
            }
            if ((int) $post->user_id === (int) $actor->id || ! BBForumContest::voting()) {
                return $this->deny();
            }
            return null;
        }
    }

    // New entries only until the submission deadline (the team always can, e.g. to move an entry)
    class BBForumContestTagPolicy extends AbstractPolicy
    {
        public function startDiscussion(User $actor, Tag $tag)
        {
            if ($tag->slug !== BBForumContest::TAG || BBForumContest::isTeam($actor)) {
                return null;
            }
            [$submit] = BBForumContest::dates();
            return $submit && time() > $submit ? $this->deny() : null;
        }

        public function addToDiscussion(User $actor, Tag $tag)
        {
            return $this->startDiscussion($actor, $tag);
        }
    }
}

if (! class_exists('BBForumContestFeed')) {
    /*
     * Submissions to Discord: each entry appears as a card in its own channel (webhook bbforum.contest_webhook,
     * from FORUM_CONTEST_WEBHOOK in .env): large logo, name (link to the discussion), who made it, the idea, link to
     * the contest page. Only once the entry has an image and guests may see it (i.e. approved and not hidden).
     * If the title or image changes, the card is updated; if the entry disappears, so does the card.
     * Remembered in bbforum.contest_feed_messages: discussion ID → Discord message. Voting happens only in the forum:
     * in the channel, writing and reactions are turned off for everyone (a setting in Discord).
     */
    class BBForumContestFeed
    {
        const MESSAGES = 'bbforum.contest_feed_messages';

        private $settings;

        public function __construct()
        {
            $this->settings = resolve(SettingsRepositoryInterface::class);
        }

        private function webhook(): string
        {
            $url = trim((string) $this->settings->get('bbforum.contest_webhook', ''));
            return preg_match('#^https://(discord|discordapp)\.com/api/webhooks/\d+/[\w-]+$#', $url) ? $url : '';
        }

        private function messages(): array
        {
            $value = json_decode((string) $this->settings->get(self::MESSAGES, ''), true);
            return is_array($value) ? $value : [];
        }

        private function request(string $method, string $url, array $body = null)
        {
            $options = ['headers' => ['Content-Type' => 'application/json'], 'http_errors' => false];
            if ($body !== null) {
                $options['json'] = $body;
            }
            return (new \GuzzleHttp\Client(['timeout' => 5, 'connect_timeout' => 3]))->request($method, $url, $options);
        }

        /** Create, update or remove the card, depending on the current state of the entry */
        public function sync(?Discussion $discussion): void
        {
            $webhook = $this->webhook();
            if (! $webhook || ! $discussion) {
                return;
            }
            // Pinned rules or moved out of the category: no card (any more)
            if ($discussion->is_sticky || ! BBForumContest::inContest($discussion)) {
                $this->remove($discussion->id);
                return;
            }
            try {
                $visible = Discussion::whereVisibleTo(new \Flarum\User\Guest())->where('discussions.id', $discussion->id)->exists();
                $post = $discussion->firstPost;
                $image = $post ? $this->image($post) : null;
                if (! $visible || ! $image) {
                    $this->remove($discussion->id);
                    return;
                }
                $payload = $this->payload($discussion, $post, $image);
                $messages = $this->messages();
                $id = $messages[(string) $discussion->id] ?? null;
                if ($id) {
                    $res = $this->request('PATCH', "$webhook/messages/$id", $payload);
                    if ($res->getStatusCode() !== 404) {
                        return;
                    }
                }
                $res = $this->request('POST', "$webhook?wait=true", $payload);
                $message = json_decode((string) $res->getBody(), true);
                if (! empty($message['id'])) {
                    $messages[(string) $discussion->id] = (string) $message['id'];
                    $this->settings->set(self::MESSAGES, json_encode($messages));
                }
            } catch (\Throwable $e) {
                resolve(\Psr\Log\LoggerInterface::class)->warning('Contest feed: '.str_replace($webhook, '[webhook]', $e->getMessage()));
            }
        }

        public function remove($discussionId): void
        {
            $webhook = $this->webhook();
            $messages = $this->messages();
            $id = $messages[(string) $discussionId] ?? null;
            if (! $webhook || ! $id) {
                return;
            }
            try {
                $this->request('DELETE', "$webhook/messages/$id");
            } catch (\Throwable $e) {
                resolve(\Psr\Log\LoggerInterface::class)->warning('Contest feed: could not remove a message');
            }
            unset($messages[(string) $discussionId]);
            $this->settings->set(self::MESSAGES, json_encode($messages));
        }

        /** The entry = the first image in the opening post (as on the contest page) */
        private function image(Post $post): ?string
        {
            $html = method_exists($post, 'formatContent') ? (string) $post->formatContent() : '';
            return preg_match('/<img[^>]+src="([^"]+)"/', $html, $m) ? html_entity_decode($m[1]) : null;
        }

        /**
         * The idea in words: without attachments (image, zip with file name), without title and form lines,
         * without repetitions
         */
        private function idea(Post $post, string $title): string
        {
            $text = (string) $post->content;
            $text = preg_replace('/\[upl-file\b[^\]]*\].*?\[\/upl-file\]/is', '', $text);
            $text = preg_replace('/\[\/?[a-z0-9-]+(=[^\]]*)?[^\]]*\]/i', '', $text);
            $text = preg_replace('/!\[[^\]]*\]\([^)]*\)/', '', $text);
            $lines = [];
            foreach (preg_split('/\R/u', $text) as $line) {
                $line = trim(preg_replace('/[*_`>#~|]+/', '', $line));
                if ($line === '' || preg_match('/^((name|title)( of the logo)?|preview|source)\s*:/i', $line)
                    || strpos($line, '(what it shows') === 0 || mb_strtolower($line) === mb_strtolower(trim($title))) {
                    continue;
                }
                $lines[] = preg_replace('/^(idea|concept|description)\s*:\s*/i', '', $line);
            }
            $text = trim(preg_replace('/\s+/u', ' ', implode(' ', array_unique($lines))));
            return mb_strlen($text) > 300 ? rtrim(mb_substr($text, 0, 297)).'…' : $text;
        }

        private function payload(Discussion $discussion, Post $post, string $image): array
        {
            $urls = resolve(\Flarum\Http\UrlGenerator::class)->to('forum');
            $slug = resolve(\Flarum\Http\SlugManager::class)->forResource(Discussion::class)->toSlug($discussion);
            $user = $discussion->user;
            $idea = $this->idea($post, (string) $discussion->title);
            return [
                'username' => 'Logo Contest',
                'avatar_url' => rtrim((string) $this->settings->get('bbforum.website_url'), '/').'/apple-touch-icon.png',
                'allowed_mentions' => ['parse' => []],
                'embeds' => [array_filter([
                    'title' => mb_substr((string) $discussion->title, 0, 250),
                    'url' => $urls->route('discussion', ['id' => $slug]),
                    'description' => trim(($idea ? $idea."\n\n" : '').'[All entries and voting]('.$urls->path('logo-contest').')'),
                    'color' => 0x8a1118,
                    'author' => array_filter([
                        'name' => 'by '.mb_substr($user ? (string) $user->display_name : 'a former member', 0, 240),
                        'icon_url' => $user ? $user->avatar_url : null,
                    ]),
                    'image' => ['url' => $image],
                    'footer' => ['text' => 'Logo contest · forum.bbport.de'],
                    'timestamp' => $discussion->created_at ? $discussion->created_at->toIso8601String() : null,
                ])],
            ];
        }
    }

    class BBForumContestFeedCommand extends \Flarum\Console\AbstractCommand
    {
        protected function configure()
        {
            $this->setName('bbforum:contest-feed')->setDescription('Post all logo contest entries to the Discord channel');
        }

        protected function fire()
        {
            $feed = new BBForumContestFeed();
            $all = Discussion::whereHas('tags', fn ($q) => $q->where('slug', BBForumContest::TAG))->orderBy('created_at')->get();
            foreach ($all as $discussion) {
                $feed->sync($discussion);
            }
            $this->info(count($all).' contest topics checked');
            return 0;
        }
    }
}

if (! class_exists('BBForumContestCheck')) {
    // Plausibility check for entries (Post Saving event in extend.php): runs on the opening post of a discussion
    // in the category, on creation and on editing. If it fails, Flarum does not create the new discussion at all.
    class BBForumContestCheck
    {
        const MIN_SIZE = 512;

        public static function validate(Post $post, ?string $content, User $actor): void
        {
            $discussion = $post->discussion;
            if (! $discussion || ! BBForumContest::inContest($discussion) || $discussion->is_sticky || BBForumContest::isTeam($actor)) {
                return;
            }
            $first = $post->exists ? (int) $post->id === (int) $discussion->first_post_id : ! $discussion->first_post_id;
            if (! $first) {
                return;
            }
            $problems = self::problems($content ?? (string) $post->content);
            if ($problems) {
                throw new \Flarum\Foundation\ValidationException(['content' => implode(' ', $problems)]);
            }
        }

        /** What is wrong with the entry, in sentences for the submitter (empty = all good) */
        public static function problems(string $content): array
        {
            $problems = [];
            if (! preg_match('/\[upl-file\b[^\]]*\][^\[]*\.zip\s*\[\/upl-file\]/i', $content)) {
                $problems[] = 'Please also attach the source file of your logo in a zip (SVG if you can).';
            }
            if (! preg_match('/\[upl-image-preview\b[^\]]*\burl=([^\s\]]+)/i', $content, $m)) {
                array_unshift($problems, 'Your entry needs a picture of the logo: attach a PNG (1024 × 1024, transparent background) with the upload button.');
                return $problems;
            }
            $file = self::localFile($m[1]);
            if (! $file) {
                array_unshift($problems, 'Please upload the picture of your logo here with the upload button.');
                return $problems;
            }
            $info = @getimagesize($file);
            if (! $info || $info['mime'] !== 'image/png') {
                array_unshift($problems, 'The picture of your logo has to be a PNG with a transparent background.');
                return $problems;
            }
            [$w, $h] = $info;
            $picture = [];
            if (abs($w - $h) > 0.02 * max($w, $h)) {
                $picture[] = "The logo has to be square (same width and height); yours is $w × $h.";
            }
            if (min($w, $h) < self::MIN_SIZE) {
                $picture[] = "The picture is too small ($w × $h): at least 512 × 512, best 1024 × 1024.";
            }
            if (! self::transparentCorners($file)) {
                $picture[] = 'The background has to be transparent: photos or pictures on a solid background can\'t be used in the launcher.';
            }
            return array_merge($picture, $problems);
        }

        /** Uploaded file on this server (fof/upload stores it under assets/files), otherwise null */
        private static function localFile(string $url): ?string
        {
            if (! preg_match('#/assets/files/([\w./-]+\.\w+)$#', html_entity_decode($url), $m) || strpos($m[1], '..') !== false) {
                return null;
            }
            $public = resolve(\Flarum\Foundation\Paths::class)->public;
            foreach (["$public/assets/files/{$m[1]}", "/data/assets/files/{$m[1]}"] as $path) {
                if (is_file($path)) {
                    return $path;
                }
            }
            return null;
        }

        /** At least three of the four corners almost transparent (GD: alpha 0 = opaque, 127 = transparent) */
        private static function transparentCorners(string $file): bool
        {
            if (! function_exists('imagecreatefrompng') || ! ($img = @imagecreatefrompng($file))) {
                return true; // cannot be checked without GD: better let it pass
            }
            $w = imagesx($img);
            $h = imagesy($img);
            $clear = 0;
            foreach ([[0, 0], [$w - 1, 0], [0, $h - 1], [$w - 1, $h - 1]] as [$x, $y]) {
                if (((imagecolorat($img, $x, $y) >> 24) & 0x7F) >= 100) {
                    $clear++;
                }
            }
            imagedestroy($img);
            return $clear >= 3;
        }
    }
}
