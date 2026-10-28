<?php

/*
 * Mounted to /opt/flarum/extend.php via docker-compose.
 *
 * Discord-only sign-up: if the setting "bbforum.oauth_only_signup" = 1,
 * new accounts can only be created through an OAuth login (fof/oauth → Discord).
 * Normal email/password registration is rejected.
 * Admins can still create accounts. Existing accounts can still
 * log in with a password.
 *
 * Background: Flarum's own switch "Allow sign up" (allow_sign_up) also blocks
 * registration via Discord, so it has to stay ON.
 * To toggle: change DISCORD_ONLY_SIGNUP in .env and run scripts/setup-forum.sh
 * again.
 *
 * Also: security headers for all forum, admin and API responses
 * (regardless of whether Caddy or a Cloudflare Tunnel sits in front).
 *
 * flarum/forum.js (mounted at /bbforum via docker-compose): website and Discord links in the
 * header, sign-up dialog with only the Discord button. The URLs come from the settings
 * "bbforum.website_url" and "bbforum.discord_url" (set by setup-forum.sh).
 *
 * flarum/icons.less: custom icons (bbicon-*, CC0) for categories, in forum and admin.
 *
 * /api/hunters-dream: live numbers from the online server The Hunter's Dream (thehuntersdream.com)
 * for the widget in the forum (flarum/forum.js), also enabled for the website home page. The forum fetches
 * its /api/stats at most once per minute (after an error, not again for 5 minutes),
 * caches the result and passes on only totals, no player names. If the
 * numbers are older than 15 minutes, it answers with 503 and the fields stay hidden.
 *
 * /api/bb-ai/…: open help topics for BB Helper's AI answers and its reply as BB-Helper (flarum/ai-help.php)
 * /api/bb-discord-notify: queue of forum notifications for BB Helper (flarum/discord-notify.php), which delivers
 * them in the member's private inbox thread on Discord; off until bbforum.discord_notify_enabled = 1.
 *
 * New discussions to Discord: if the setting "bbforum.discord_webhook" is set (setup-forum.sh from
 * FORUM_DISCORD_WEBHOOK in .env), the forum reports every new discussion that guests may see, with title,
 * author, tags, the start of the text and a link, in that Discord channel. Errors or a slow Discord hold up the
 * forum for 3 seconds at most and only go to the log.
 *
 * Discord roles as forum groups, names from the server and ban/suspension in both directions:
 * flarum/discord-roles.php (command bbforum:discord-roles every minute, plus the Suspended event).
 *
 * Top helpers (flarum/helpers.php): /api/bb-top-helpers with the ranking of the last 30 days and of all time
 * (solutions, Known Fixes, topics helped), page /top-helpers; the top 3 get the mark "Top helper".
 *
 * "My game account" (flarum/supermedo-account.php): /supermedo-account hands the logged-in member over to their
 * account on SuperMedo Server with a signed note; off (404, no button) while bbforum.supermedo_account_key is empty.
 *
 * SuperMedo Server statistics (flarum/server-stats.php): /api/bb-server, /api/bb-server/summary and
 * /api/bb-server/hunters/{id} for the website's /server/ page, its home page band and the forum box, cached a minute.
 *
 * Overview (flarum/overview.php): votes (👍 on the opening post) as the sort order "-bbVotes", filter "bbview"
 * for the tabs above the lists, command bbforum:close-stale (close help discussions after 7 days without a post).
 *
 * Profiles (flarum/profiles.php): banner, profile color and avatar decoration from Discord (via the role sync),
 * earned effects from the Discord roles, hunter card. "About me" (fof/user-bio) and own cover image
 * (sycho/flarum-profile-cover).
 *
 * Work lists for the team (team block in flarum/forum.js): search and filter "is:unanswered" = discussions without a
 * reply. Whoever starts a discussion or replies to it follows it (default; anyone can turn it off in their settings):
 * this way the forum notifies about replies to one's own help question.
 */

use Flarum\Discussion\Discussion;
use Flarum\Discussion\Event\Started;
use Flarum\Discussion\Filter\DiscussionFilterer;
use Flarum\Discussion\Search\DiscussionSearcher;
use Flarum\Filter\FilterInterface;
use Flarum\Filter\FilterState;
use Flarum\Search\AbstractRegexGambit;
use Flarum\Search\SearchState;
use Flarum\Extend;
use Flarum\Foundation\Config;
use Flarum\Foundation\ValidationException;
use Flarum\Http\SlugManager;
use Flarum\Http\UrlGenerator;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Event\Saving;
use Flarum\User\Guest;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;

if (! class_exists('BBForumSecurityHeaders')) {
    class BBForumSecurityHeaders implements MiddlewareInterface
    {
        public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
        {
            $response = $handler->handle($request)
                ->withHeader('X-Frame-Options', 'SAMEORIGIN')
                ->withHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

            // HSTS only if the forum is served over HTTPS (FORUM_URL)
            if (resolve(Config::class)->url()->getScheme() === 'https') {
                $response = $response->withHeader('Strict-Transport-Security', 'max-age=15552000');
            }

            return $response;
        }
    }
}

if (! class_exists('BBForumHuntersDream')) {
    class BBForumHuntersDream implements RequestHandlerInterface
    {
        private const SOURCE = 'https://thehuntersdream.com/api/stats';
        private const DATA_KEY = 'bbforum.huntersdream.data';
        private const LOCK_KEY = 'bbforum.huntersdream.lock';

        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            $cache = resolve(Cache::class);

            // Only one request per minute goes to The Hunter's Dream, all others get the cached result
            if ($cache->add(self::LOCK_KEY, 1, 60)) {
                $fresh = $this->fetch();
                if ($fresh) {
                    $cache->forever(self::DATA_KEY, $fresh);
                } else {
                    $cache->put(self::LOCK_KEY, 1, 300);
                }
            }

            // Older than 15 minutes (The Hunter's Dream unreachable for a while): better to show nothing
            $data = $cache->get(self::DATA_KEY);
            if ($data && $data['updatedAt'] < time() - 900) {
                $data = null;
            }
            $headers = ['Access-Control-Allow-Origin' => '*', 'Cache-Control' => 'public, max-age=60'];

            return $data
                ? new JsonResponse($data, 200, $headers)
                : new JsonResponse(['error' => 'unavailable'], 503, $headers);
        }

        private function fetch(): ?array
        {
            try {
                $response = (new \GuzzleHttp\Client(['timeout' => 5, 'connect_timeout' => 3]))->get(self::SOURCE, [
                    'headers' => [
                        'Accept' => 'application/json',
                        'User-Agent' => 'BBPP-Community-Forum (+https://bbport.de)',
                    ],
                ]);
                $raw = json_decode((string) $response->getBody(), true);
            } catch (\Throwable $e) {
                return null;
            }

            if (! is_array($raw) || ! isset($raw['stats'], $raw['active_sessions'])) {
                return null;
            }

            $stats = $raw['stats'];
            $sessions = $raw['active_sessions'];

            // First entry of a [[name, count], …] list; skip catch-all entries such as "Hunter (NPC or player)"
            $top = function ($list) {
                foreach ((array) $list as $entry) {
                    if (is_array($entry) && isset($entry[0], $entry[1]) && strpos((string) $entry[0], '(') === false) {
                        return ['name' => (string) $entry[0], 'count' => (int) $entry[1]];
                    }
                }

                return null;
            };

            // Most common blood level band, e.g. "BL 10-19"
            $levels = (array) ($stats['activity']['level_distribution'] ?? []);
            usort($levels, function ($a, $b) {
                return ((int) ($b[1] ?? 0)) <=> ((int) ($a[1] ?? 0));
            });

            // Areas with summon signs right now (two names at most)
            $bellAreas = [];
            foreach (array_slice((array) ($stats['activity']['summon_by_area'] ?? []), 0, 2) as $area) {
                if (is_array($area) && isset($area[0])) {
                    $bellAreas[] = (string) $area[0];
                }
            }

            // Newest shared chalice glyph, without the creator's name
            $dungeon = $stats['chalice']['dungeons'][0] ?? null;
            $glyph = is_array($dungeon) && preg_match('/^[a-z0-9]{6,12}$/i', (string) ($dungeon['glyph'] ?? ''))
                ? ['glyph' => (string) $dungeon['glyph'], 'dungeon' => (string) ($dungeon['dungeon_name'] ?? ''), 'id' => (int) ($dungeon['channel_id'] ?? 0)]
                : null;

            return [
                'serverOnline' => (bool) ($sessions['server_online'] ?? false),
                'online' => (int) ($sessions['count'] ?? 0),
                'coopSigns' => (int) ($stats['activity']['summon_coop'] ?? 0),
                'sinisterBells' => (int) ($stats['activity']['summon_invade'] ?? 0),
                'bellAreas' => $bellAreas,
                'bossClears24h' => (int) ($stats['hunt']['boss_clears_24h'] ?? 0),
                'kills24h' => (int) ($stats['hunt']['kills_24h'] ?? 0),
                'bossClears' => (int) ($stats['hunt']['boss_clears'] ?? 0),
                'kills' => (int) ($stats['hunt']['kills'] ?? 0),
                'hunters' => (int) ($stats['overview']['total_users'] ?? 0),
                'summons' => (int) ($stats['overview']['total_summons'] ?? 0),
                'deaths' => (int) ($stats['overview']['total_deaths'] ?? 0),
                'ghosts' => (int) ($stats['overview']['total_ghosts'] ?? 0),
                'messages' => (int) ($stats['overview']['total_messages'] ?? 0),
                'chaliceDungeons' => (int) ($stats['overview']['total_dungeons'] ?? 0),
                'deadliestFoe' => $top($stats['deaths']['top_killers'] ?? []),
                'deadliestArea' => $top($stats['deaths']['by_location'] ?? []),
                'mostSlainBoss' => $top($stats['hunt']['slain'] ?? []),
                'mostHunted' => $top($stats['hunt']['hunted'] ?? []),
                'levelPeak' => isset($levels[0][0]) ? (string) $levels[0][0] : null,
                'newestGlyph' => $glyph,
                'updatedAt' => time(),
                'source' => 'https://thehuntersdream.com',
            ];
        }
    }
}

if (! class_exists('BBForumDiscordFeed')) {
    class BBForumDiscordFeed
    {
        public function handle(Started $event): void
        {
            $settings = resolve(SettingsRepositoryInterface::class);
            $webhook = (string) $settings->get('bbforum.discord_webhook');
            if (! preg_match('#^https://(discord|discordapp)\.com/api/webhooks/#', $webhook)) {
                return;
            }

            // Only discussions that guests can see as well (not private, not still unapproved)
            $discussion = $event->discussion;
            if (! Discussion::whereVisibleTo(new Guest())->where('discussions.id', $discussion->id)->exists()) {
                return;
            }

            try {
                $tags = $discussion->tags()->get();
                $post = $discussion->firstPost;
                $color = $tags->pluck('color')->first(function ($c) {
                    return is_string($c) && preg_match('/^#[0-9a-f]{6}$/i', $c);
                });
                $slug = resolve(SlugManager::class)->forResource(Discussion::class)->toSlug($discussion);
                $site = rtrim((string) $settings->get('bbforum.website_url'), '/');

                $embed = array_filter([
                    'title' => mb_substr((string) $discussion->title, 0, 250),
                    'url' => resolve(UrlGenerator::class)->to('forum')->route('discussion', ['id' => $slug]),
                    'description' => $this->excerpt($post ? (string) $post->content : ''),
                    'color' => $color ? hexdec(substr($color, 1)) : 0x9c8458,
                    'author' => ['name' => mb_substr((string) $event->actor->display_name, 0, 250)],
                    'footer' => ['text' => $tags->pluck('name')->implode(' · ') ?: 'Forum'],
                    'timestamp' => $discussion->created_at ? $discussion->created_at->toIso8601String() : null,
                ]);

                (new \GuzzleHttp\Client(['timeout' => 3, 'connect_timeout' => 2]))->post($webhook, ['json' => array_filter([
                    'username' => 'Bloodborne PC Port Forum',
                    'avatar_url' => $site ? "$site/apple-touch-icon.png" : null,
                    'allowed_mentions' => ['parse' => []],
                    'embeds' => [$embed],
                ])]);
            } catch (\Throwable $e) {
                // Without the webhook URL: it contains the secret token
                resolve(LoggerInterface::class)->warning('Discord feed: '.str_replace($webhook, '[webhook]', $e->getMessage()));
            }
        }

        // Start of the text without Markdown, images and BBCode, 280 characters at most
        private function excerpt(string $text): string
        {
            $text = preg_replace('/!\[[^\]]*\]\([^)]*\)/', '', $text);
            $text = preg_replace('/\[([^\]]*)\]\([^)]*\)/', '$1', $text);
            $text = preg_replace('/\[\/?[a-z0-9]+(=[^\]]*)?\]/i', '', $text);
            $text = preg_replace('/[*_`>#~|]+/', '', $text);
            $text = trim(preg_replace('/\s+/u', ' ', $text));

            return mb_strlen($text) > 280 ? rtrim(mb_substr($text, 0, 277)).'…' : $text;
        }
    }
}

if (! class_exists('BBForumUnansweredGambit')) {
    // "is:unanswered": only the opening post, no reply yet ("-is:unanswered": has a reply)
    class BBForumUnansweredGambit extends AbstractRegexGambit implements FilterInterface
    {
        protected function getGambitPattern()
        {
            return 'is:unanswered';
        }

        protected function conditions(SearchState $search, array $matches, $negate)
        {
            $this->constrain($search->getQuery(), $negate);
        }

        public function getFilterKey(): string
        {
            return 'unanswered';
        }

        public function filter(FilterState $filterState, string $filterValue, bool $negate)
        {
            $this->constrain($filterState->getQuery(), $negate);
        }

        private function constrain($query, bool $negate): void
        {
            $query->where('discussions.comment_count', $negate ? '>' : '<=', 1);
        }
    }
}

if (! class_exists('BBForumCliLocale')) {
    // Command line (scheduler, bbforum:* commands, mails sent from there): load the language files first, as the
    // SetLocale middleware does on the web. Otherwise the first command after cache:clear builds an empty translation
    // catalog, Flarum caches it, and until the next cache:clear the forum shows only keys like core.forum.index.…
    class BBForumCliLocale extends Flarum\Foundation\AbstractServiceProvider
    {
        public function boot()
        {
            if (PHP_SAPI !== 'cli') {
                return;
            }
            try {
                $this->container->make(Flarum\Locale\LocaleManager::class);
            } catch (Throwable $e) {
                // without a database (e.g. at container start) there is nothing to translate
            }
        }
    }
}

require_once __DIR__.'/discord-roles.php';
require_once __DIR__.'/betas.php';
require_once __DIR__.'/contest.php';
require_once __DIR__.'/overview.php';
require_once __DIR__.'/profiles.php';
require_once __DIR__.'/discord-notify.php';
require_once __DIR__.'/ai-help.php';
require_once __DIR__.'/helpers.php';
require_once __DIR__.'/supermedo-account.php';
require_once __DIR__.'/server-stats.php';

return [
    (new Extend\ServiceProvider())->register(BBForumCliLocale::class),

    (new Extend\Routes('api'))->get('/hunters-dream', 'bbforum.huntersDream', BBForumHuntersDream::class),

    // Take over Discord roles: freshly logged-in users every minute, all users every 10 minutes
    (new Extend\Console())
        ->command(BBForumDiscordRolesCommand::class)
        ->schedule(BBForumDiscordRolesCommand::class, function ($event) {
            $event->everyMinute();
        }),

    // New test versions from GitHub as discussions in the Beta category (flarum/betas.php), every 10 minutes
    (new Extend\Console())
        ->command(BBForumBetasCommand::class)
        ->schedule(BBForumBetasCommand::class, function ($event) {
            $event->everyTenMinutes();
        }),

    // If a mod suspends someone in the forum, they are also banned on the Discord server
    (new Extend\Event())->listen('Flarum\Suspend\Event\Suspended', BBForumDiscordBanOnSuspend::class),

    (new Extend\Event())->listen(Started::class, function (Started $event) {
        (new BBForumDiscordFeed())->handle($event);
    }),

    (new Extend\SimpleFlarumSearch(DiscussionSearcher::class))->addGambit(BBForumUnansweredGambit::class),
    (new Extend\Filter(DiscussionFilterer::class))->addFilter(BBForumUnansweredGambit::class),

    // Overview (flarum/overview.php): sort by votes, filter for the tabs, close help discussions after 7 days
    (new Extend\ApiController(Flarum\Api\Controller\ListDiscussionsController::class))->addSortField('bbVotes'),
    (new Extend\Filter(DiscussionFilterer::class))
        ->addFilter(BBForumViewFilter::class)
        ->addFilterMutator([BBForumVotes::class, 'select']),
    (new Extend\SimpleFlarumSearch(DiscussionSearcher::class))->addSearchMutator([BBForumVotes::class, 'select']),
    (new Extend\ApiSerializer(Flarum\Api\Serializer\DiscussionSerializer::class))
        ->attributes(function ($serializer, $discussion) {
            return BBForumVotes::attributes($serializer->getActor(), $discussion);
        }),
    (new Extend\Console())
        ->command(BBForumCloseStaleCommand::class)
        ->schedule(BBForumCloseStaleCommand::class, function ($event) {
            $event->hourly();
        }),

    // Profiles (flarum/profiles.php): effects, decoration, role shield and PC (rig) on every user; in the profile
    // banner, color, hunter card, all roles and, for the team, the Discord link
    (new Extend\ApiSerializer(Flarum\Api\Serializer\BasicUserSerializer::class))
        ->attributes(function ($serializer, $user) {
            return BBForumProfiles::basic($user);
        }),
    (new Extend\ApiSerializer(Flarum\Api\Serializer\UserSerializer::class))
        ->attributes(function ($serializer, $user) {
            return BBForumProfiles::full($user, $serializer->getActor());
        }),
    // What Nitro can do, for everyone: save custom profile colors, keep animated profile and cover images
    (new Extend\Event())
        ->listen(Flarum\User\Event\Saving::class, function ($event) {
            BBForumProfiles::saving($event);
        }),
    (new Extend\ServiceProvider())
        ->register(BBForumProfilesProvider::class),

    // Logo contest (flarum/contest.php): vote = a "Like" on an entry, one per member, only during the voting phase
    (new Extend\Policy())
        ->modelPolicy(Flarum\Post\Post::class, BBForumContestLikePolicy::class)
        ->modelPolicy(Flarum\Tags\Tag::class, BBForumContestTagPolicy::class),
    (new Extend\Event())->listen('Flarum\Likes\Event\PostWasLiked', function ($event) {
        BBForumContest::keepOneVote($event->post, $event->user);
    }),
    // Entries as cards in the contest's Discord channel (BBForumContestFeed): new, changed, approved, removed
    (new Extend\Event())
        ->listen(Started::class, fn ($e) => (new BBForumContestFeed())->sync($e->discussion))
        ->listen('Flarum\Discussion\Event\Renamed', fn ($e) => (new BBForumContestFeed())->sync($e->discussion))
        ->listen('Flarum\Discussion\Event\Hidden', fn ($e) => (new BBForumContestFeed())->sync($e->discussion))
        ->listen('Flarum\Discussion\Event\Restored', fn ($e) => (new BBForumContestFeed())->sync($e->discussion))
        ->listen('Flarum\Discussion\Event\Deleted', fn ($e) => (new BBForumContestFeed())->remove($e->discussion->id))
        ->listen('Flarum\Tags\Event\DiscussionWasTagged', fn ($e) => (new BBForumContestFeed())->sync($e->discussion))
        ->listen('Flarum\Post\Event\Revised', function ($e) {
            if ((int) $e->post->number === 1) {
                (new BBForumContestFeed())->sync($e->post->discussion);
            }
        })
        ->listen('Flarum\Approval\Event\PostWasApproved', function ($e) {
            if ((int) $e->post->number === 1) {
                (new BBForumContestFeed())->sync($e->post->discussion);
            }
        }),
    (new Extend\Console())->command(BBForumContestFeedCommand::class),
    // Plausibility check for entries (BBForumContestCheck): PNG, square, transparent, zip attached
    (new Extend\Event())->listen('Flarum\Post\Event\Saving', function ($e) {
        BBForumContestCheck::validate($e->post, $e->data['attributes']['content'] ?? null, $e->actor);
    }),
    // Serve the /logo-contest page on direct requests too (link from bbport.de), not only on in-browser navigation
    (new Extend\Frontend('forum'))->route('/logo-contest', 'logoContest'),
    (new Extend\ApiSerializer(Flarum\Api\Serializer\DiscussionSerializer::class))
        ->attributes(function ($serializer, $discussion) {
            return BBForumContest::attributes($serializer->getActor(), $discussion);
        }),

    // Top helpers (flarum/helpers.php): ranking for the sidebar box and the page /top-helpers
    (new Extend\Routes('api'))->get('/bb-top-helpers', 'bbforum.topHelpers', BBForumTopHelpersController::class),
    (new Extend\Frontend('forum'))->route('/top-helpers', 'topHelpers'),

    // "My game account" (flarum/supermedo-account.php): signed hand-over to SuperMedo Server, off without the key
    (new Extend\Routes('forum'))->get('/supermedo-account', 'bbforum.supermedoAccount', BBForumSupermedoAccount::class),

    // SuperMedo Server statistics (flarum/server-stats.php) for the website's /server/ page and the forum box
    (new Extend\Routes('api'))
        ->get('/bb-server', 'bbforum.server', BBForumServerOverview::class)
        ->get('/bb-server/summary', 'bbforum.server.summary', BBForumServerSummary::class)
        ->get('/bb-server/hunters/{id}', 'bbforum.server.hunter', BBForumServerHunter::class),

    // Follow own discussions (instead of Flarum's "off"): replies show up in the notifications
    (new Extend\User())->registerPreference('followAfterReply', 'boolval', true),

    (new Extend\Middleware('forum'))->add(BBForumSecurityHeaders::class),
    (new Extend\Middleware('admin'))->add(BBForumSecurityHeaders::class),
    (new Extend\Middleware('api'))->add(BBForumSecurityHeaders::class),

    (new Extend\Event())->listen(Saving::class, function (Saving $event) {
        if ($event->user->exists || $event->actor->isAdmin()) {
            return;
        }

        if (! resolve(SettingsRepositoryInterface::class)->get('bbforum.oauth_only_signup')) {
            return;
        }

        // OAuth registrations come with a token (already verified by the core).
        if (! Arr::has($event->data, 'attributes.token')) {
            throw new ValidationException([
                'username' => 'New accounts can only be created with "Log in with Discord".',
            ]);
        }
    }),

    (new Extend\Settings())
        ->serializeToForum('bbforumWebsiteUrl', 'bbforum.website_url')
        ->serializeToForum('bbforumDiscordUrl', 'bbforum.discord_url')
        ->serializeToForum('bbforumDiscordOnly', 'bbforum.oauth_only_signup', 'boolval')
        ->serializeToForum('bbContestSubmitUntil', 'bbforum.contest_submit_until')
        ->serializeToForum('bbContestVoteUntil', 'bbforum.contest_vote_until')
        ->serializeToForum('bbDiscordNotify', 'bbforum.discord_notify_enabled', 'boolval')
        // Only whether the key is set, never the key itself
        ->serializeToForum('bbSupermedoAccount', 'bbforum.supermedo_account_key', function ($key) {
            return trim((string) $key) !== '';
        }),

    // Forum notifications in Discord (flarum/discord-notify.php): notification channel "discord", new notification on
    // status change, queue for BB Helper; own discussions and replies are now followed by default
    (new Extend\Notification())
        ->driver('discord', BBForumDiscordNotifyDriver::class)
        ->type(BBForumStatusChangedBlueprint::class, Flarum\Api\Serializer\BasicDiscussionSerializer::class, ['alert']),
    (new Extend\Event())
        ->listen(Flarum\Tags\Event\DiscussionWasTagged::class, function ($event) {
            BBForumDiscordNotify::tagged($event);
        }),
    (new Extend\User())
        ->registerPreference('followAfterReply', 'boolval', true),
    (new Extend\Routes('api'))
        ->get('/bb-discord-notify', 'bbforum.discordNotify.pending', BBForumDiscordNotifyPending::class)
        ->post('/bb-discord-notify/ack', 'bbforum.discordNotify.ack', BBForumDiscordNotifyAck::class)
        ->post('/bb-discord-notify/action', 'bbforum.discordNotify.action', BBForumDiscordNotifyAction::class)
        ->get('/bb-ai/candidates', 'bbforum.ai.candidates', BBForumAiCandidates::class)
        ->get('/bb-ai/topics/{id}', 'bbforum.ai.topic', BBForumAiTopic::class)
        ->get('/bb-ai/files/{uuid}', 'bbforum.ai.file', BBForumAiFile::class)
        ->post('/bb-ai/reply', 'bbforum.ai.reply', BBForumAiReply::class),
    (new Extend\Csrf())
        ->exemptRoute('bbforum.discordNotify.ack')
        ->exemptRoute('bbforum.discordNotify.action')
        ->exemptRoute('bbforum.ai.reply'),

    ...(is_file('/bbforum/forum.js') ? [(new Extend\Frontend('forum'))->js('/bbforum/forum.js')] : []),
    ...(is_file('/bbforum/icons.less') ? [
        (new Extend\Frontend('forum'))->css('/bbforum/icons.less'),
        (new Extend\Frontend('admin'))->css('/bbforum/icons.less'),
    ] : []),
];
