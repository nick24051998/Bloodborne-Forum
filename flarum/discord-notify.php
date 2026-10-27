<?php
/*
 * Forum notifications in Discord (Nick, 26.10.2026; loaded by flarum/extend.php, UI in flarum/forum.js).
 *
 * Flow: Discord is a notification channel of its own in the forum (driver "discord", column "Discord" in the
 * settings). Whatever a member has ticked there, the driver puts into the queue bb_discord_notify. BB Helper
 * picks it up via GET /api/bb-discord-notify (key bbforum.discord_notify_token in the header X-BB-Token) and writes
 * into the member's private thread "📬 Forum inbox" in #🔔・forum-inbox, with a ping. No DMs (Nick's wish).
 *
 * - Off as long as bbforum.discord_notify_enabled is not 1: then nothing is collected, so that after switching it
 *   on nothing old goes out all at once. Only what is at most 6 hours old is picked up.
 * - Only after 2 minutes: whoever has read the post in the forum by then gets no ping (skipped).
 * - Replies in the same discussion come as one notification; in discussions that one merely follows, at most
 *   once per hour. At most 8 notifications per hour and member, the rest waits.
 * - On by default: replies in your own or a followed discussion, reply to your own post, mentions (also
 *   @Helpers), best answer, reminder "select the best answer", status of your own suggestion or bug (new
 *   notification statusChanged). Not likes, renames and suspensions.
 * - Whoever starts a discussion or replies now follows it by default (followAfterReply, otherwise the
 *   asker would not hear about replies).
 * - POST /api/bb-discord-notify/ack (ids, state sent|failed|skipped) and /api/bb-discord-notify/action (mute: stop
 *   following the discussion, off: all Discord ticks off), both with the same key, without CSRF (no browser).
 */

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Notification\Blueprint\BlueprintInterface;
use Flarum\Notification\Driver\NotificationDriverInterface;
use Flarum\Post\Post;
use Flarum\User\User;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

if (! class_exists('BBForumDiscordNotify')) {
    class BBForumDiscordNotify
    {
        const TABLE = 'bb_discord_notify';
        const DELAY = 120;            // seconds before a notification goes out
        const MAX_AGE = 6 * 3600;     // older ones are no longer sent
        const KEEP = 3 * 86400;       // rows are kept this long for reference
        const PER_HOUR = 8;
        const DEFAULT_ON = ['newPost', 'postMentioned', 'userMentioned', 'groupMentioned', 'awardedBestAnswer',
            'bestAnswerInDiscussion', 'selectBestAnswer', 'statusChanged'];
        const STATUS_NAMES = ['status-open' => 'Open', 'status-in-progress' => 'In progress', 'status-fixed' => 'Fixed',
            'status-planned' => 'Planned', 'status-done' => 'Done', 'status-not-planned' => 'Not planned',
            'status-duplicate' => 'Duplicate'];

        private static function db()
        {
            return resolve('db');
        }

        private static function settings()
        {
            return resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
        }

        public static function enabled(): bool
        {
            return (string) self::settings()->get('bbforum.discord_notify_enabled', '0') === '1';
        }

        public static function ensureTable(): void
        {
            $schema = self::db()->getSchemaBuilder();
            if ($schema->hasTable(self::TABLE)) {
                return;
            }
            $schema->create(self::TABLE, function ($table) {
                $table->increments('id');
                $table->unsignedInteger('user_id')->index();
                $table->string('discord_id', 32);
                $table->string('type', 40);
                $table->unsignedInteger('discussion_id')->nullable();
                $table->unsignedInteger('post_number')->nullable();
                $table->boolean('own')->default(false);
                $table->string('title', 255);
                $table->string('topic', 255)->nullable();
                $table->text('excerpt')->nullable();
                $table->string('url', 400);
                $table->string('state', 12)->default('pending')->index();
                $table->dateTime('created_at');
                $table->dateTime('sent_at')->nullable();
            });
        }

        private static function discordId(User $user): ?string
        {
            return \Flarum\User\LoginProvider::where('provider', 'discord')->where('user_id', $user->id)->value('identifier');
        }

        private static function url(Discussion $discussion, ?int $number): string
        {
            $base = rtrim(resolve(\Flarum\Http\UrlGenerator::class)->to('forum')->base(), '/');
            return $base.'/d/'.$discussion->id.'-'.$discussion->slug.($number && $number > 1 ? '/'.$number : '');
        }

        private static function excerpt(?Post $post): ?string
        {
            if (! $post || $post->type !== 'comment') {
                return null;
            }
            try {
                $html = str_replace(['</p>', '<br>', '<br/>'], ' ', $post->formatContent());
                // Mentions as "@Name" (in the HTML only the name is in the link)
                $html = preg_replace('#<a [^>]*class="(?:PostMention|UserMention)[^"]*"[^>]*>(.*?)</a>#s', '@$1', $html);
                $text = strip_tags($html);
            } catch (\Throwable $e) {
                $text = (string) $post->content;
            }
            $text = trim(preg_replace('/\s+/u', ' ', html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
            return mb_strlen($text) > 180 ? rtrim(mb_substr($text, 0, 177)).'…' : $text;
        }

        /** Queue one notification for a member (from the driver, only if enabled and ticked) */
        public static function queue(User $user, BlueprintInterface $blueprint): void
        {
            $discordId = self::discordId($user);
            if (! $discordId) {
                return;
            }
            $type = $blueprint::getType();
            $subject = $blueprint->getSubject();
            $data = (array) $blueprint->getData();
            $discussion = $subject instanceof Discussion ? $subject : ($subject instanceof Post ? $subject->discussion : null);
            if (! $discussion) {
                return;
            }
            $number = $data['replyNumber'] ?? $data['postNumber'] ?? ($subject instanceof Post ? $subject->number : null);
            if (in_array($type, ['awardedBestAnswer', 'bestAnswerInDiscussion'], true) && $discussion->best_answer_post_id) {
                $number = Post::where('id', $discussion->best_answer_post_id)->value('number');
            }
            $post = $number ? $discussion->posts()->where('number', $number)->first() : null;
            $from = $blueprint->getFromUser();
            $who = $from ? ($from->display_name ?: $from->username) : 'Someone';
            $own = (int) $discussion->user_id === (int) $user->id;
            $kind = self::kindOf($discussion);
            switch ($type) {
                case 'newPost': $title = $who.($own ? ' replied in your topic' : ' replied in a topic you follow'); break;
                case 'postMentioned': $title = $who.' replied to your post'; break;
                case 'userMentioned': $title = $who.' mentioned you'; break;
                case 'groupMentioned': $title = $who.' mentioned your team'; break;
                case 'awardedBestAnswer': $title = 'Your answer was chosen as the best answer'; break;
                case 'bestAnswerInDiscussion': $title = $own ? 'Your question is solved' : 'A topic you follow has a best answer'; break;
                case 'selectBestAnswer': $title = 'Did an answer help you? Mark it as the best answer'; break;
                case 'statusChanged':
                    $title = 'Your '.$kind.' is now '.(self::STATUS_NAMES[$data['status'] ?? ''] ?? 'updated');
                    break;
                default: $title = 'New activity in a topic'; break;
            }
            self::ensureTable();
            self::db()->table(self::TABLE)->insert([
                'user_id' => $user->id,
                'discord_id' => $discordId,
                'type' => $type,
                'discussion_id' => $discussion->id,
                'post_number' => $number,
                'own' => $own,
                'title' => mb_substr($title, 0, 255),
                'topic' => mb_substr((string) $discussion->title, 0, 255),
                'excerpt' => self::excerpt($post),
                'url' => self::url($discussion, $number),
                'state' => 'pending',
                'created_at' => Carbon::now(),
            ]);
        }

        private static function kindOf(Discussion $discussion): string
        {
            $slugs = $discussion->tags()->pluck('slug')->all();
            return in_array('bug-reports', $slugs, true) ? 'bug report' : 'suggestion';
        }

        /** Status tag changed (Suggestions, Bug Reports): notify the author if someone else did it */
        public static function tagged(\Flarum\Tags\Event\DiscussionWasTagged $event): void
        {
            $discussion = $event->discussion;
            $old = array_map(function ($tag) { return $tag->slug; }, $event->oldTags);
            $new = $discussion->tags()->pluck('slug')->all();
            $added = array_values(array_filter(array_diff($new, $old), function ($slug) {
                return strpos($slug, 'status-') === 0;
            }));
            $author = $discussion->user;
            if (! $added || ! $author || (int) $author->id === (int) $event->actor->id) {
                return;
            }
            resolve(\Flarum\Notification\NotificationSyncer::class)->sync(
                new BBForumStatusChangedBlueprint($discussion, $event->actor, $added[0]),
                [$author]
            );
        }

        public static function authorized(ServerRequestInterface $request): bool
        {
            $token = trim((string) self::settings()->get('bbforum.discord_notify_token', ''));
            return $token !== '' && hash_equals($token, $request->getHeaderLine('X-BB-Token'));
        }

        /** What may go out now, bundled per member and discussion */
        public static function pending(): array
        {
            self::ensureTable();
            $db = self::db();
            $now = Carbon::now();
            $db->table(self::TABLE)->where('created_at', '<', $now->copy()->subSeconds(self::KEEP))->delete();
            $db->table(self::TABLE)->where('state', 'pending')->where('created_at', '<', $now->copy()->subSeconds(self::MAX_AGE))
                ->update(['state' => 'expired']);
            $rows = $db->table(self::TABLE)->where('state', 'pending')
                ->where('created_at', '<=', $now->copy()->subSeconds(self::DELAY))->orderBy('id')->get();

            // The same reply as a mention and as a "new reply": only the more specific notification (the mention)
            $mentioned = [];
            foreach ($rows as $row) {
                if ($row->type !== 'newPost' && $row->post_number) {
                    $mentioned[$row->user_id.'/'.$row->discussion_id.'/'.$row->post_number] = true;
                }
            }
            $skip = [];
            $ready = [];
            $approval = $db->getSchemaBuilder()->hasColumn('posts', 'is_approved');
            foreach ($rows as $row) {
                if ($row->type === 'newPost' && isset($mentioned[$row->user_id.'/'.$row->discussion_id.'/'.$row->post_number])) {
                    $skip[] = $row->id;
                    continue;
                }
                // Hidden or deleted in the meantime (spam that a mod cleaned up within the 2 minutes)?
                if ($row->discussion_id && ! $db->table('discussions')->where('id', $row->discussion_id)->whereNull('hidden_at')->exists()) {
                    $skip[] = $row->id;
                    continue;
                }
                if ($row->discussion_id && $row->post_number) {
                    $post = $db->table('posts')->where('discussion_id', $row->discussion_id)->where('number', $row->post_number)
                        ->whereNull('hidden_at');
                    if ($approval) {
                        $post->where('is_approved', true);
                    }
                    if (! $post->exists()) {
                        $skip[] = $row->id;
                        continue;
                    }
                }
                // Already read in the forum?
                if ($row->discussion_id && $row->post_number) {
                    $read = $db->table('discussion_user')->where('user_id', $row->user_id)
                        ->where('discussion_id', $row->discussion_id)->value('last_read_post_number');
                    if ($read !== null && (int) $read >= (int) $row->post_number) {
                        $skip[] = $row->id;
                        continue;
                    }
                }
                $ready[] = $row;
            }
            if ($skip) {
                $db->table(self::TABLE)->whereIn('id', $skip)->update(['state' => 'skipped', 'sent_at' => $now]);
            }

            $hourAgo = $now->copy()->subHour();
            $sentLastHour = [];
            $groups = [];
            foreach ($ready as $row) {
                $uid = $row->user_id;
                if (! isset($sentLastHour[$uid])) {
                    $sentLastHour[$uid] = $db->table(self::TABLE)->where('user_id', $uid)->where('state', 'sent')
                        ->where('sent_at', '>=', $hourAgo)->count();
                }
                $replies = $row->type === 'newPost';
                // In followed (not own) discussions at most one notification per hour
                if ($replies && ! $row->own && $db->table(self::TABLE)->where('user_id', $uid)
                    ->where('discussion_id', $row->discussion_id)->where('state', 'sent')->where('sent_at', '>=', $hourAgo)->exists()) {
                    continue;
                }
                $key = $replies ? $uid.'/'.$row->discussion_id.'/replies' : $uid.'/'.$row->id;
                if (! isset($groups[$key])) {
                    if ($sentLastHour[$uid] >= self::PER_HOUR) {
                        continue;
                    }
                    $sentLastHour[$uid]++;
                    $groups[$key] = [];
                }
                $groups[$key][] = $row;
            }

            $out = [];
            foreach ($groups as $list) {
                $first = $list[0];
                $last = $list[count($list) - 1];
                $n = count($list);
                $title = $last->title;
                if ($n > 1) {
                    $title = $n.' new replies '.($first->own ? 'in your topic' : 'in a topic you follow');
                }
                $out[] = [
                    'ids' => array_map(function ($r) { return (int) $r->id; }, $list),
                    'user_id' => (int) $first->user_id,
                    'discord_id' => $first->discord_id,
                    'type' => $first->type,
                    'count' => $n,
                    'title' => $title,
                    'topic' => $first->topic,
                    'excerpt' => $last->excerpt,
                    'url' => $first->url, // to the first new reply
                    'discussion_id' => (int) $first->discussion_id,
                ];
            }
            return $out;
        }

        public static function ack(array $ids, string $state): int
        {
            if (! in_array($state, ['sent', 'failed', 'skipped'], true) || ! $ids) {
                return 0;
            }
            self::ensureTable();
            return self::db()->table(self::TABLE)->whereIn('id', array_map('intval', $ids))->where('state', 'pending')
                ->update(['state' => $state, 'sent_at' => Carbon::now()]);
        }

        /** Buttons in the notification: mute (stop following this discussion) or off (all Discord ticks off) */
        public static function action(string $action, string $discordId, int $discussionId): bool
        {
            $userId = \Flarum\User\LoginProvider::where('provider', 'discord')->where('identifier', $discordId)->value('user_id');
            $user = $userId ? User::find($userId) : null;
            if (! $user) {
                return false;
            }
            if ($action === 'mute' && $discussionId) {
                self::db()->table('discussion_user')->updateOrInsert(
                    ['user_id' => $user->id, 'discussion_id' => $discussionId],
                    ['subscription' => 'ignore']
                );
                self::db()->table(self::TABLE)->where('user_id', $user->id)->where('discussion_id', $discussionId)
                    ->where('state', 'pending')->update(['state' => 'skipped', 'sent_at' => Carbon::now()]);
                return true;
            }
            if ($action === 'off') {
                foreach (array_keys(\Flarum\Notification\Notification::getSubjectModels()) as $type) {
                    $user->setPreference(User::getNotificationPreferenceKey($type, 'discord'), false);
                }
                $user->save();
                self::db()->table(self::TABLE)->where('user_id', $user->id)->where('state', 'pending')
                    ->update(['state' => 'skipped', 'sent_at' => Carbon::now()]);
                return true;
            }
            return false;
        }
    }
}

if (! class_exists('BBForumDiscordNotifyDriver')) {
    class BBForumDiscordNotifyDriver implements NotificationDriverInterface
    {
        public function send(BlueprintInterface $blueprint, array $users): void
        {
            if (! BBForumDiscordNotify::enabled()) {
                return;
            }
            $type = $blueprint::getType();
            $from = $blueprint->getFromUser();
            foreach ($users as $user) {
                if (! $user->getPreference(User::getNotificationPreferenceKey($type, 'discord'))) {
                    continue;
                }
                if ($from && (int) $from->id === (int) $user->id) {
                    continue; // nothing for own actions
                }
                try {
                    BBForumDiscordNotify::queue($user, $blueprint);
                } catch (\Throwable $e) {
                    resolve(\Psr\Log\LoggerInterface::class)->warning('Discord notify: '.$e->getMessage());
                }
            }
        }

        public function registerType(string $blueprintClass, array $driversEnabledByDefault): void
        {
            User::registerPreference(
                User::getNotificationPreferenceKey($blueprintClass::getType(), 'discord'),
                'boolval',
                in_array($blueprintClass::getType(), BBForumDiscordNotify::DEFAULT_ON, true)
            );
        }
    }
}

if (! class_exists('BBForumStatusChangedBlueprint')) {
    /** New notification: the status (tag status-…) of a suggestion or bug has changed */
    class BBForumStatusChangedBlueprint implements BlueprintInterface
    {
        public $discussion;
        public $actor;
        public $status;

        public function __construct(Discussion $discussion, User $actor, string $status)
        {
            $this->discussion = $discussion;
            $this->actor = $actor;
            $this->status = $status;
        }

        public function getFromUser()
        {
            return $this->actor;
        }

        public function getSubject()
        {
            return $this->discussion;
        }

        public function getData()
        {
            return ['status' => $this->status];
        }

        public static function getType()
        {
            return 'statusChanged';
        }

        public static function getSubjectModel()
        {
            return Discussion::class;
        }
    }
}

if (! class_exists('BBForumDiscordNotifyPending')) {
    class BBForumDiscordNotifyPending implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            return new JsonResponse(['enabled' => BBForumDiscordNotify::enabled(), 'messages' => BBForumDiscordNotify::pending()]);
        }
    }

    class BBForumDiscordNotifyAck implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $body = (array) json_decode((string) $request->getBody(), true);
            $done = BBForumDiscordNotify::ack((array) ($body['ids'] ?? []), (string) ($body['state'] ?? ''));
            return new JsonResponse(['updated' => $done]);
        }
    }

    class BBForumDiscordNotifyAction implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $body = (array) json_decode((string) $request->getBody(), true);
            $ok = BBForumDiscordNotify::action((string) ($body['action'] ?? ''), (string) ($body['discord_id'] ?? ''),
                (int) ($body['discussion_id'] ?? 0));
            return new JsonResponse(['ok' => $ok], $ok ? 200 : 404);
        }
    }
}
