<?php

/*
 * Wird per docker-compose nach /opt/flarum/extend.php gemountet.
 *
 * Discord-only Sign-up: Ist die Einstellung "bbforum.oauth_only_signup" = 1,
 * können neue Accounts nur über einen OAuth-Login (fof/oauth → Discord)
 * angelegt werden. Normale E-Mail/Passwort-Registrierung wird abgelehnt.
 * Admins können weiterhin Accounts anlegen. Bestehende Accounts können sich
 * weiterhin mit Passwort einloggen.
 *
 * Hintergrund: Flarums eigener Schalter "Allow sign up" (allow_sign_up) sperrt
 * auch die Registrierung über Discord – er muss daher AN bleiben.
 * Umschalten: DISCORD_ONLY_SIGNUP in .env ändern und scripts/setup-forum.sh
 * erneut ausführen.
 *
 * Außerdem: Sicherheits-Header für alle Forum-, Admin- und API-Antworten
 * (unabhängig davon, ob Caddy oder Cloudflare Tunnel davor sitzt).
 *
 * flarum/forum.js (per docker-compose unter /bbforum): Website- und Discord-Links in der
 * Kopfzeile, Registrieren-Fenster nur mit Discord-Button. Die Adressen kommen aus den
 * Einstellungen "bbforum.website_url" und "bbforum.discord_url" (setzt setup-forum.sh).
 *
 * flarum/icons.less: eigene Icons (bbicon-*, CC0) für Kategorien, in Forum und Admin.
 *
 * /api/hunters-dream: Live-Zahlen vom Online-Server The Hunter's Dream (thehuntersdream.com)
 * für das Feld im Forum (flarum/forum.js), eingeschaltet auch für die Website-Startseite. Das Forum holt
 * deren /api/stats höchstens einmal pro Minute (nach einem Fehler erst nach 5 Minuten wieder),
 * speichert das Ergebnis zwischen und gibt nur Gesamtzahlen weiter, keine Spielernamen. Sind die
 * Zahlen älter als 15 Minuten, antwortet es mit 503 und die Felder bleiben ausgeblendet.
 *
 * Neue Themen nach Discord: Ist die Einstellung "bbforum.discord_webhook" gesetzt (setup-forum.sh aus
 * FORUM_DISCORD_WEBHOOK in .env), meldet das Forum jedes neue Thema, das Gäste sehen dürfen, mit Titel,
 * Autor, Tags, Textanfang und Link in diesem Discord-Kanal. Fehler oder ein langsames Discord halten das
 * Forum höchstens 3 Sekunden auf und gehen nur ins Log.
 *
 * Discord-Rollen als Forum-Gruppen, Namen vom Server und Bann/Sperre in beide Richtungen:
 * flarum/discord-roles.php (Befehl bbforum:discord-roles jede Minute, dazu das Ereignis Suspended).
 *
 * Übersicht (flarum/overview.php): Stimmen (👍 auf dem Eröffnungsbeitrag) als Sortierung "-bbVotes", Filter "bbview"
 * für die Reiter über den Listen, Befehl bbforum:close-stale (Hilfe-Themen nach 7 Tagen ohne Beitrag schließen).
 *
 * Profile (flarum/profiles.php): Banner, Profilfarbe und Avatar-Deko von Discord (über den Rollen-Abgleich), verdiente
 * Effekte aus den Discord-Rollen, Hunter-Karte. „About me“ (fof/user-bio) und eigenes Titelbild (sycho/flarum-profile-cover).
 *
 * Arbeitslisten fürs Team (Team-Block in flarum/forum.js): Suche und Filter "is:unanswered" = Themen ohne Antwort.
 * Wer ein Thema startet oder antwortet, folgt ihm (Voreinstellung, jeder kann es in den Einstellungen abschalten):
 * so meldet das Forum Antworten auf die eigene Hilfe-Frage.
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

            // HSTS nur, wenn das Forum per HTTPS betrieben wird (FORUM_URL)
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

            // Nur eine Anfrage pro Minute geht an The Hunter's Dream, alle anderen bekommen den Zwischenstand
            if ($cache->add(self::LOCK_KEY, 1, 60)) {
                $fresh = $this->fetch();
                if ($fresh) {
                    $cache->forever(self::DATA_KEY, $fresh);
                } else {
                    $cache->put(self::LOCK_KEY, 1, 300);
                }
            }

            // Älter als 15 Minuten (The Hunter's Dream länger nicht erreichbar): lieber nichts zeigen
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

            // Erster Eintrag einer [[Name, Anzahl], …]-Liste; Sammelposten wie "Hunter (NPC or player)" überspringen
            $top = function ($list) {
                foreach ((array) $list as $entry) {
                    if (is_array($entry) && isset($entry[0], $entry[1]) && strpos((string) $entry[0], '(') === false) {
                        return ['name' => (string) $entry[0], 'count' => (int) $entry[1]];
                    }
                }

                return null;
            };

            // Häufigstes Blutlevel-Band, z. B. "BL 10-19"
            $levels = (array) ($stats['activity']['level_distribution'] ?? []);
            usort($levels, function ($a, $b) {
                return ((int) ($b[1] ?? 0)) <=> ((int) ($a[1] ?? 0));
            });

            // Gebiete mit Beschwörungszeichen gerade jetzt (höchstens zwei Namen)
            $bellAreas = [];
            foreach (array_slice((array) ($stats['activity']['summon_by_area'] ?? []), 0, 2) as $area) {
                if (is_array($area) && isset($area[0])) {
                    $bellAreas[] = (string) $area[0];
                }
            }

            // Neueste geteilte Kelch-Glyphe, ohne den Namen des Erstellers
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

            // Nur Themen, die auch Gäste sehen (nicht private, nicht noch ungeprüfte)
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
                // Ohne die Webhook-Adresse: sie enthält den geheimen Schlüssel
                resolve(LoggerInterface::class)->warning('Discord feed: '.str_replace($webhook, '[webhook]', $e->getMessage()));
            }
        }

        // Textanfang ohne Markdown, Bilder und BBCode, höchstens 280 Zeichen
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
    // "is:unanswered": nur der Eröffnungsbeitrag, noch keine Antwort ("-is:unanswered": mit Antwort)
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
    // Kommandozeile (Scheduler, bbforum:*-Befehle, Mails von dort): erst die Sprachdateien laden, wie es im Web die
    // Middleware SetLocale tut. Sonst baut der erste Befehl nach cache:clear einen leeren Übersetzungs-Katalog, Flarum
    // speichert ihn, und das Forum zeigt bis zum nächsten cache:clear nur noch Schlüssel wie core.forum.index.…
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
                // ohne Datenbank (z. B. beim Container-Start) gibt es nichts zu übersetzen
            }
        }
    }
}

require_once __DIR__.'/discord-roles.php';
require_once __DIR__.'/betas.php';
require_once __DIR__.'/contest.php';
require_once __DIR__.'/overview.php';
require_once __DIR__.'/profiles.php';

return [
    (new Extend\ServiceProvider())->register(BBForumCliLocale::class),

    (new Extend\Routes('api'))->get('/hunters-dream', 'bbforum.huntersDream', BBForumHuntersDream::class),

    // Discord-Rollen übernehmen: jede Minute frisch angemeldete Nutzer, alle 10 Minuten alle
    (new Extend\Console())
        ->command(BBForumDiscordRolesCommand::class)
        ->schedule(BBForumDiscordRolesCommand::class, function ($event) {
            $event->everyMinute();
        }),

    // Neue Testversionen von GitHub als Themen im Bereich Beta (flarum/betas.php), alle 10 Minuten
    (new Extend\Console())
        ->command(BBForumBetasCommand::class)
        ->schedule(BBForumBetasCommand::class, function ($event) {
            $event->everyTenMinutes();
        }),

    // Sperrt ein Mod jemanden im Forum, wird er auch auf dem Discord-Server gebannt
    (new Extend\Event())->listen('Flarum\Suspend\Event\Suspended', BBForumDiscordBanOnSuspend::class),

    (new Extend\Event())->listen(Started::class, function (Started $event) {
        (new BBForumDiscordFeed())->handle($event);
    }),

    (new Extend\SimpleFlarumSearch(DiscussionSearcher::class))->addGambit(BBForumUnansweredGambit::class),
    (new Extend\Filter(DiscussionFilterer::class))->addFilter(BBForumUnansweredGambit::class),

    // Übersicht (flarum/overview.php): nach Stimmen sortieren, Filter für die Reiter, Hilfe nach 7 Tagen schließen
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

    // Profile (flarum/profiles.php): Effekte, Deko, Rollen-Schild und Rechner an jedem Nutzer; im Profil Banner, Farbe,
    // Hunter-Karte, alle Rollen und fürs Team der Discord-Link
    (new Extend\ApiSerializer(Flarum\Api\Serializer\BasicUserSerializer::class))
        ->attributes(function ($serializer, $user) {
            return BBForumProfiles::basic($user);
        }),
    (new Extend\ApiSerializer(Flarum\Api\Serializer\UserSerializer::class))
        ->attributes(function ($serializer, $user) {
            return BBForumProfiles::full($user, $serializer->getActor());
        }),
    // Was Nitro kann, für alle: eigene Profilfarben speichern, animierte Profil- und Titelbilder behalten
    (new Extend\Event())
        ->listen(Flarum\User\Event\Saving::class, function ($event) {
            BBForumProfiles::saving($event);
        }),
    (new Extend\ServiceProvider())
        ->register(BBForumProfilesProvider::class),

    // Logo-Contest (flarum/contest.php): Stimme = „Gefällt mir“ auf einem Werk, eine pro Mitglied, nur in der Abstimmung
    (new Extend\Policy())
        ->modelPolicy(Flarum\Post\Post::class, BBForumContestLikePolicy::class)
        ->modelPolicy(Flarum\Tags\Tag::class, BBForumContestTagPolicy::class),
    (new Extend\Event())->listen('Flarum\Likes\Event\PostWasLiked', function ($event) {
        BBForumContest::keepOneVote($event->post, $event->user);
    }),
    // Werke als Karten in den Discord-Kanal des Contests (BBForumContestFeed): neu, geändert, freigegeben, entfernt
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
    // Plausibilitätsprüfung für Werke (BBForumContestCheck): PNG, quadratisch, durchsichtig, Zip dabei
    (new Extend\Event())->listen('Flarum\Post\Event\Saving', function ($e) {
        BBForumContestCheck::validate($e->post, $e->data['attributes']['content'] ?? null, $e->actor);
    }),
    // Die Seite /logo-contest auch beim direkten Aufruf (Link von bbport.de) ausliefern, nicht nur im Browser
    (new Extend\Frontend('forum'))->route('/logo-contest', 'logoContest'),
    (new Extend\ApiSerializer(Flarum\Api\Serializer\DiscussionSerializer::class))
        ->attributes(function ($serializer, $discussion) {
            return BBForumContest::attributes($serializer->getActor(), $discussion);
        }),

    // Eigenen Themen folgen (statt Flarums "aus"): Antworten erscheinen in den Benachrichtigungen
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

        // OAuth-Registrierungen bringen ein (vom Core bereits geprüftes) Token mit.
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
        ->serializeToForum('bbContestVoteUntil', 'bbforum.contest_vote_until'),

    ...(is_file('/bbforum/forum.js') ? [(new Extend\Frontend('forum'))->js('/bbforum/forum.js')] : []),
    ...(is_file('/bbforum/icons.less') ? [
        (new Extend\Frontend('forum'))->css('/bbforum/icons.less'),
        (new Extend\Frontend('admin'))->css('/bbforum/icons.less'),
    ] : []),
];
