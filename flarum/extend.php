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
 */

use Flarum\Extend;
use Flarum\Foundation\ValidationException;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Event\Saving;
use Illuminate\Support\Arr;

return [
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
];
