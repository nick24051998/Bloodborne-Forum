<?php
/*
 * "My game account" (Nick, 28.10.2026, after SuperMedo Server's spec; loaded by flarum/extend.php, the button lives
 * in flarum/forum.js).
 *
 * - GET /supermedo-account: a member who is logged in on the forum lands on their account page on SuperMedo Server
 *   (game.supermedo.com/account/forum), already signed in there. The forum vouches for them with a short note
 *   v1.<discord_id>.<expires>.<nonce>.<signature>: Discord user ID from their Discord login, valid for 60 seconds,
 *   a random nonce, and as signature the HMAC-SHA256 (hex) of everything before the last dot with the key
 *   bbforum.supermedo_account_key, used as is. SuperMedo Server has the same key and checks the signature, the time
 *   and that the nonce is new. The note goes after "#", so it stays out of server logs and referrers.
 * - Guests are sent to the forum to log in first (?gameAccount=login; forum.js continues to the game server after the
 *   login), members without a Discord login get a notice there (?gameAccount=no-discord).
 * - Off while the key is empty: the address answers 404 and the button is hidden (forum attribute
 *   bbSupermedoAccount, only true/false). scripts/setup-forum.sh takes the key from SUPERMEDO_ACCOUNT_KEY in .env.
 * - Neither the note nor the key is ever logged or sent anywhere else.
 */

use Flarum\Http\Exception\RouteNotFoundException;
use Flarum\Http\RequestUtil;
use Flarum\Http\UrlGenerator;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\LoginProvider;
use Laminas\Diactoros\Response\RedirectResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

if (! class_exists('BBForumSupermedoAccount')) {
    class BBForumSupermedoAccount implements RequestHandlerInterface
    {
        const TARGET = 'https://game.supermedo.com/account/forum';
        const LIFETIME = 60;

        protected $settings;
        protected $url;

        public function __construct(SettingsRepositoryInterface $settings, UrlGenerator $url)
        {
            $this->settings = $settings;
            $this->url = $url;
        }

        /** The shared key, '' while the feature is off */
        public static function key(SettingsRepositoryInterface $settings): string
        {
            return trim((string) $settings->get('bbforum.supermedo_account_key', ''));
        }

        /** Signature of a note: HMAC-SHA256 as lowercase hex, the key used as is (not hex-decoded) */
        public static function sign(string $payload, string $key): string
        {
            return hash_hmac('sha256', $payload, $key);
        }

        /** v1.<discord_id>.<expires>.<nonce>.<signature> */
        public static function note(string $discordId, string $key): string
        {
            $payload = 'v1.'.$discordId.'.'.(time() + self::LIFETIME).'.'.bin2hex(random_bytes(16));

            return $payload.'.'.self::sign($payload, $key);
        }

        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            $key = self::key($this->settings);
            if ($key === '') {
                throw new RouteNotFoundException();
            }

            $actor = RequestUtil::getActor($request);
            $forum = rtrim($this->url->to('forum')->base(), '/');
            if ($actor->isGuest()) {
                return self::redirect($forum.'/?gameAccount=login');
            }

            $discordId = (string) LoginProvider::where('provider', 'discord')->where('user_id', $actor->id)->value('identifier');
            if (! ctype_digit($discordId)) {
                return self::redirect($forum.'/?gameAccount=no-discord');
            }

            return self::redirect(self::TARGET.'#'.self::note($discordId, $key));
        }

        protected static function redirect(string $to): ResponseInterface
        {
            return new RedirectResponse($to, 302, ['Cache-Control' => 'no-store', 'Referrer-Policy' => 'no-referrer']);
        }
    }
}
