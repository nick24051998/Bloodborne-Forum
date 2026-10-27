<?php
/*
 * Betas in the forum (loaded by flarum/extend.php).
 *
 * Test builds appear only in the "Beta" section, which only approved testers and the team can see (permissions are
 * set by scripts/lib/setup-inside.sh: Discord roles "Beta Hunter" and "Test Subject" via the role sync, plus
 * the forum group "Beta Testers" for approvals in the forum only).
 *
 * The command "php flarum bbforum:betas" runs every 10 minutes (Flarum scheduler). It reads the pre-releases
 * of the repos in bbforum.beta_repos on GitHub and creates a discussion in the Beta section for each new one:
 * downloads, testing notes, the text of the release page, a mention of the tester groups (they get
 * a notification). The newest discussion is pinned; the previous one gets a note pointing to the new one.
 * On the very first run only the newest pre-release goes into the forum; older ones count as done.
 *
 * Remembered in the settings:
 * - bbforum.beta_posted: "repo@tag" → discussion ID (0 = skipped)
 * - bbforum.beta_etags: "repo" → ETag of the last response (GitHub does not count unchanged responses toward
 *   the rate limit)
 * With --dry-run only show what would be new.
 */

use Flarum\Console\AbstractCommand;
use Flarum\Discussion\Command\StartDiscussion;
use Flarum\Discussion\Discussion;
use Flarum\Group\Group;
use Flarum\Http\UrlGenerator;
use Flarum\Post\Command\PostReply;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Tags\Tag;
use Illuminate\Contracts\Bus\Dispatcher;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Input\InputOption;

if (! class_exists('BBForumBetas')) {
    class BBForumBetas
    {
        const POSTED = 'bbforum.beta_posted';
        const ETAGS = 'bbforum.beta_etags';
        const DEFAULT_REPOS = 'nick24051998/bloodborne_pc';

        private $settings;
        private $client;

        public function __construct(SettingsRepositoryInterface $settings)
        {
            $this->settings = $settings;
            $this->client = new \GuzzleHttp\Client(['timeout' => 10, 'connect_timeout' => 4, 'http_errors' => false]);
        }

        private function json(string $key): array
        {
            $value = json_decode((string) $this->settings->get($key, ''), true);
            return is_array($value) ? $value : [];
        }

        private function repos(): array
        {
            $list = (string) $this->settings->get('bbforum.beta_repos', '') ?: self::DEFAULT_REPOS;
            return array_values(array_filter(array_map('trim', explode(',', $list)),
                fn ($r) => preg_match('#^[\w.-]+/[\w.-]+$#', $r)));
        }

        /** Pre-releases of all repos, oldest first; null if nothing changed on GitHub.
         *  The ETags are returned in $etags and only saved after a real run. */
        private function prereleases(array &$etags): ?array
        {
            $changed = false;
            $all = [];
            foreach ($this->repos() as $repo) {
                $headers = ['Accept' => 'application/vnd.github+json', 'User-Agent' => 'bbport-forum'];
                if (! empty($etags[$repo])) {
                    $headers['If-None-Match'] = $etags[$repo];
                }
                $res = $this->client->get("https://api.github.com/repos/$repo/releases?per_page=20", ['headers' => $headers]);
                if ($res->getStatusCode() === 304) {
                    continue;
                }
                if ($res->getStatusCode() !== 200) {
                    throw new RuntimeException("GitHub $repo: HTTP ".$res->getStatusCode());
                }
                $changed = true;
                $etags[$repo] = $res->getHeaderLine('ETag');
                foreach ((array) json_decode((string) $res->getBody(), true) as $rel) {
                    if (! empty($rel['prerelease']) && empty($rel['draft'])) {
                        $all[] = $rel + ['_repo' => $repo];
                    }
                }
            }
            if (! $changed) {
                return null;
            }
            usort($all, fn ($a, $b) => strcmp($a['published_at'] ?? '', $b['published_at'] ?? ''));
            return $all;
        }

        public function run(bool $dryRun = false): array
        {
            $tag = Tag::where('slug', 'beta')->first();
            if (! $tag) {
                return ['skipped' => 'no beta tag'];
            }
            $posted = $this->json(self::POSTED);
            // Without remembered discussions (first run) always ask fresh, otherwise only on changes
            $etags = $posted ? $this->json(self::ETAGS) : [];
            $releases = $this->prereleases($etags);
            if ($releases === null) {
                return ['new' => 0, 'github' => 'unchanged'];
            }
            $key = fn ($rel) => $rel['_repo'].'@'.$rel['tag_name'];
            $new = array_values(array_filter($releases, fn ($rel) => ! array_key_exists($key($rel), $posted)));
            // First run: show only the newest pre-release, older ones count as done
            if (! $posted && count($new) > 1) {
                foreach (array_slice($new, 0, -1) as $old) {
                    $posted[$key($old)] = 0;
                }
                $new = array_slice($new, -1);
            }
            if ($dryRun) {
                return ['new' => array_map($key, $new)];
            }
            $actor = Group::find(Group::ADMINISTRATOR_ID)->users()->orderBy('id')->first();
            foreach ($new as $rel) {
                $previous = array_filter($posted);
                $discussion = resolve(Dispatcher::class)->dispatch(new StartDiscussion($actor, ['attributes' => [
                    'title' => $this->title($rel),
                    'content' => $this->content($rel),
                ], 'relationships' => ['tags' => ['data' => [['type' => 'tags', 'id' => (string) $tag->id]]]]], '127.0.0.1'));
                $posted[$key($rel)] = (int) $discussion->id;
                $this->settings->set(self::POSTED, json_encode($posted));

                // Pin the new discussion, unpin the older ones; post a note pointing to the new one in the previous one
                Discussion::whereIn('id', array_values($previous))->update(['is_sticky' => false]);
                $discussion->is_sticky = true;
                $discussion->save();
                if ($previous) {
                    $url = resolve(UrlGenerator::class)->to('forum')->route('discussion', ['id' => $discussion->id]);
                    resolve(Dispatcher::class)->dispatch(new PostReply((int) end($previous), $actor, ['attributes' => [
                        'content' => 'A newer test build is out: ['.$this->title($rel).']('.$url.'). Please test that one.',
                    ]], '127.0.0.1'));
                }
            }
            $this->settings->set(self::POSTED, json_encode($posted));
            $this->settings->set(self::ETAGS, json_encode($etags));
            return ['new' => count($new)];
        }

        private function title(array $rel): string
        {
            $title = trim((string) ($rel['name'] ?? '')) ?: (string) $rel['tag_name'];
            return mb_strlen($title) > 80 ? mb_substr($title, 0, 79).'…' : $title;
        }

        private function content(array $rel): string
        {
            $downloads = [];
            foreach ($rel['assets'] ?? [] as $asset) {
                $size = $asset['size'] > 1048576 ? ' ('.round($asset['size'] / 1048576).' MB)' : '';
                $downloads[] = '['.$asset['name'].']('.$asset['browser_download_url'].')'.$size;
            }
            $mentions = [];
            $ids = array_filter(array_map('intval', explode(',', (string) $this->settings->get('bbforum.beta_group_ids', ''))));
            foreach (Group::whereIn('id', $ids)->get() as $group) {
                $mentions[] = '@"'.str_replace('"', '', $group->name_plural).'"#g'.$group->id;
            }
            $lines = [
                '**New test build:** '.$this->title($rel).'. Not an official release: unpack it into a **new, empty folder**, '
                    .'next to your normal port. Bring your characters over with **Saves → From other versions**.',
                '',
                '**Download:** '.($downloads ? implode(' · ', $downloads) : '['.$rel['tag_name'].']('.$rel['html_url'].')'),
                '',
                'Found a bug? Reply here with what you did, what happened, and **Help → Save a report** attached.',
            ];
            if ($mentions) {
                $lines[] = '';
                $lines[] = implode(' ', $mentions);
            }
            $body = trim((string) ($rel['body'] ?? ''));
            if ($body !== '') {
                $lines[] = '';
                $lines[] = '---';
                $lines[] = '';
                $lines[] = mb_substr($body, 0, 50000);
            }
            return implode("\n", $lines);
        }
    }

    class BBForumBetasCommand extends AbstractCommand
    {
        protected function configure()
        {
            $this->setName('bbforum:betas')
                ->setDescription('Post new test builds from GitHub in the Beta section')
                ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Only show what would be new');
        }

        protected function fire()
        {
            try {
                $stats = resolve(BBForumBetas::class)->run((bool) $this->input->getOption('dry-run'));
            } catch (Throwable $e) {
                resolve(LoggerInterface::class)->warning('Beta posts: '.$e->getMessage());
                $this->error('Beta posts failed: '.$e->getMessage());
                return 1;
            }
            $this->info(json_encode($stats));
            return 0;
        }
    }
}
