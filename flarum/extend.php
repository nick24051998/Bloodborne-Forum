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
 * für das Feld im Forum (flarum/forum.js) und auf der Website-Startseite. Das Forum holt
 * deren /api/stats höchstens einmal pro Minute (nach einem Fehler erst nach 5 Minuten wieder),
 * speichert das Ergebnis zwischen und gibt nur Gesamtzahlen weiter, keine Spielernamen. Sind die
 * Zahlen älter als 15 Minuten, antwortet es mit 503 und die Felder bleiben ausgeblendet.
 */

use Flarum\Extend;
use Flarum\Foundation\Config;
use Flarum\Foundation\ValidationException;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Event\Saving;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

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
                        'User-Agent' => 'BBPP-Community-Forum (+https://bbport.nrnetworks.de)',
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

            return [
                'serverOnline' => (bool) ($sessions['server_online'] ?? false),
                'online' => (int) ($sessions['count'] ?? 0),
                'bossClears24h' => (int) ($stats['hunt']['boss_clears_24h'] ?? 0),
                'kills24h' => (int) ($stats['hunt']['kills_24h'] ?? 0),
                'bossClears' => (int) ($stats['hunt']['boss_clears'] ?? 0),
                'kills' => (int) ($stats['hunt']['kills'] ?? 0),
                'hunters' => (int) ($stats['overview']['total_users'] ?? 0),
                'summons' => (int) ($stats['overview']['total_summons'] ?? 0),
                'deaths' => (int) ($stats['overview']['total_deaths'] ?? 0),
                'deadliestFoe' => $top($stats['deaths']['top_killers'] ?? []),
                'deadliestArea' => $top($stats['deaths']['by_location'] ?? []),
                'updatedAt' => time(),
                'source' => 'https://thehuntersdream.com',
            ];
        }
    }
}

return [
    (new Extend\Routes('api'))->get('/hunters-dream', 'bbforum.huntersDream', BBForumHuntersDream::class),

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
        ->serializeToForum('bbforumDiscordOnly', 'bbforum.oauth_only_signup', 'boolval'),

    ...(is_file('/bbforum/forum.js') ? [(new Extend\Frontend('forum'))->js('/bbforum/forum.js')] : []),
    ...(is_file('/bbforum/icons.less') ? [
        (new Extend\Frontend('forum'))->css('/bbforum/icons.less'),
        (new Extend\Frontend('admin'))->css('/bbforum/icons.less'),
    ] : []),
];
