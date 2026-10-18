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
 */

use Flarum\Extend;
use Flarum\Foundation\Config;
use Flarum\Foundation\ValidationException;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Event\Saving;
use Illuminate\Support\Arr;
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

return [
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
];
