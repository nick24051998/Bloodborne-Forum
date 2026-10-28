<?php

/*
 * Discord roles as forum groups (loaded by flarum/extend.php).
 *
 * Whoever logs in to the forum with Discord gets the same roles as on the Discord server, as groups with the
 * same name and color. Discord is the source: when a role is added or removed there, the same happens in the
 * forum. Owner, Admin and Mod (bbforum.discord_mod_role_ids) additionally join Flarum's "Mod" group and may
 * moderate; the sync never touches the forum's Admin group.
 *
 * Only the team roles (bbforum.discord_shown_role_ids) are visible as badges on posts. All other groups are
 * hidden: weapon, GPU or setup roles are only visible on the Discord server itself, in the forum they would be
 * visible to everyone. They are still useful for permissions (e.g. a category for one role only).
 *
 * Names: with the "nickname" display name driver (flarum/nicknames, set up by setup-forum.sh) the forum shows
 * the name from the Discord server, otherwise the Discord display name. The username stays for login,
 * profile URL and @-mentions.
 *
 * Profile pictures: the server profile picture, otherwise the Discord picture, as a copy in the forum (visitors
 * load nothing from Discord). If it changes on Discord, the sync follows. If someone has uploaded a different
 * picture in the forum themselves, that one stays (bbforum.discord_avatars remembers which picture the sync
 * set last). Animated Discord pictures (Nitro) arrive as GIF and stay animated.
 *
 * Ban and suspension: whoever is banned on the server is suspended in the forum; when Discord lifts the ban,
 * the sync lifts their suspension again. If a mod suspends someone in the forum (Suspended event from
 * flarum/suspend), the bot bans them on the server; when the suspension ends, it lifts the ban again. Both
 * apply only to suspensions and bans that the sync set itself, and never to admins. For this the bot needs the
 * "Ban Members" permission, and its role must be above the members' roles on the server (team roles stay
 * above it, it cannot ban those).
 *
 * Reading is done with the bot of the forum app "Bloodborne PC Port Forum" (REST only, no privileged
 * intents): GET /guilds/{id}/roles, /guilds/{id}/members/{user} and /guilds/{id}/bans/{user}.
 * Settings (set by scripts/setup-forum.sh from .env): bbforum.discord_bot_token,
 * bbforum.discord_guild_id, bbforum.discord_mod_role_ids, bbforum.discord_shown_role_ids.
 * Without a token nothing happens.
 *
 * Flow: the command "php flarum bbforum:discord-roles" runs every minute (Flarum scheduler). It syncs
 * users who logged in or linked with Discord in the last few minutes, and every 10 minutes all linked
 * users. With --all, all of them immediately.
 *
 * Remembered in the settings:
 * - bbforum.discord_role_groups: Discord role → forum group; only these groups are managed by the sync
 * - bbforum.discord_mod_grants: users who got "Mod" via Discord (only from them is it taken
 *   away again; mods appointed by hand stay)
 * - bbforum.discord_roles_full_at: time of the last full sync
 * - bbforum.discord_ban_suspensions: users who are suspended because of a Discord ban
 * - bbforum.forum_suspension_bans: user → Discord ID, banned because of a forum suspension
 * - bbforum.discord_avatars: user → most recently adopted Discord picture (hash) and its file in the forum
 */

use Flarum\Console\AbstractCommand;
use Flarum\Group\Group;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\LoginProvider;
use Flarum\User\User;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Input\InputOption;

if (! class_exists('BBForumDiscordRoles')) {
    class BBForumDiscordRoles
    {
        const API = 'https://discord.com/api/v10';
        const MAP = 'bbforum.discord_role_groups';
        const MOD_GRANTS = 'bbforum.discord_mod_grants';
        const FULL_AT = 'bbforum.discord_roles_full_at';
        const BAN_SUSPENSIONS = 'bbforum.discord_ban_suspensions';
        const FORUM_BANS = 'bbforum.forum_suspension_bans';
        const AVATARS = 'bbforum.discord_avatars';
        // Suspension due to a Discord ban: lasts until Discord lifts the ban (Flarum's "indefinite" is also a date)
        const BAN_UNTIL = '2038-01-01 00:00:00';
        // Owner, Admin, Mod on the Discord server (default if nothing is configured)
        const DEFAULT_MOD_ROLES = '1557459945291513996,1557459946994401412,1557459950312103976';
        // Team roles that stay visible as badges: Owner, Admin, Contributor, Mod, Support, Helper, Modding, Modder
        const DEFAULT_SHOWN_ROLES = '1557459945291513996,1557459946994401412,1559601172107493427,'
            .'1557459950312103976,1557459952396673196,1559561716642222122,1564921489713537055,'
            .'1564931850412105738';

        private $settings;
        private $log;
        private $client;

        public function __construct(SettingsRepositoryInterface $settings, LoggerInterface $log)
        {
            $this->settings = $settings;
            $this->log = $log;
            $this->client = new \GuzzleHttp\Client(['timeout' => 8, 'connect_timeout' => 4, 'http_errors' => false]);
        }

        public function enabled(): bool
        {
            return $this->token() !== '' && $this->guild() !== '';
        }

        private function token(): string
        {
            return trim((string) $this->settings->get('bbforum.discord_bot_token', ''));
        }

        private function guild(): string
        {
            return trim((string) $this->settings->get('bbforum.discord_guild_id', ''));
        }

        private function modRoles(): array
        {
            return $this->roleIds('bbforum.discord_mod_role_ids', self::DEFAULT_MOD_ROLES);
        }

        private function shownRoles(): array
        {
            return $this->roleIds('bbforum.discord_shown_role_ids', self::DEFAULT_SHOWN_ROLES);
        }

        private function roleIds(string $key, string $default): array
        {
            $raw = (string) ($this->settings->get($key) ?: $default);
            return array_values(array_filter(array_map('trim', explode(',', $raw)), 'ctype_digit'));
        }

        private function json(string $key, $default)
        {
            $value = json_decode((string) $this->settings->get($key, ''), true);
            return is_array($value) ? $value : $default;
        }

        /** GET to the Discord API; [status, JSON]. On 429, wait briefly once and retry. */
        private function get(string $path): array
        {
            for ($try = 0; $try < 2; $try++) {
                $response = $this->client->get(self::API.$path, ['headers' => [
                    'Authorization' => 'Bot '.$this->token(),
                    'User-Agent' => 'DiscordBot (https://forum.bbport.de, 1.0) BBPP-Forum',
                ]]);
                $status = $response->getStatusCode();
                $body = json_decode((string) $response->getBody(), true);
                if ($status === 429 && $try === 0) {
                    usleep((int) (min(5.0, (float) ($body['retry_after'] ?? 1)) * 1_000_000));
                    continue;
                }
                return [$status, $body];
            }
            return [429, null];
        }

        /** PUT/DELETE to the Discord API, with a reason for the server's audit log; returns the status. */
        private function send(string $method, string $path, string $reason): int
        {
            $options = ['headers' => [
                'Authorization' => 'Bot '.$this->token(),
                'User-Agent' => 'DiscordBot (https://forum.bbport.de, 1.0) BBPP-Forum',
                'X-Audit-Log-Reason' => rawurlencode(mb_substr($reason, 0, 400)),
            ]];
            if ($method === 'PUT') {
                $options['json'] = ['delete_message_seconds' => 0];
            }
            return $this->client->request($method, self::API.$path, $options)->getStatusCode();
        }

        /** Align the groups with the server's roles; returns role → group ID. */
        public function syncGroups(): array
        {
            [$status, $roles] = $this->get('/guilds/'.$this->guild().'/roles');
            if ($status !== 200 || ! is_array($roles)) {
                throw new RuntimeException("Discord roles: HTTP $status");
            }
            // @everyone (ID = server ID) and roles of integrations (bots) are left out
            $roles = array_filter($roles, fn ($r) => (string) $r['id'] !== $this->guild() && empty($r['managed']));
            usort($roles, fn ($a, $b) => ($b['position'] ?? 0) <=> ($a['position'] ?? 0));

            $map = $this->json(self::MAP, []);
            $shown = $this->shownRoles();
            $next = [];
            foreach ($roles as $role) {
                $id = (string) $role['id'];
                $name = mb_substr(trim((string) $role['name']), 0, 100) ?: 'Discord role';
                $color = ! empty($role['color']) ? sprintf('#%06x', (int) $role['color']) : null;
                $hidden = ! in_array($id, $shown, true);
                $group = isset($map[$id]) ? Group::find($map[$id]) : null;
                if (! $group) {
                    $group = Group::build($name, $name, $color, null);
                    $group->is_hidden = $hidden;
                    $group->save();
                } elseif ($group->name_singular !== $name || ($group->color ?: null) !== $color || (bool) $group->is_hidden !== $hidden) {
                    $group->name_singular = $name;
                    $group->name_plural = $name;
                    $group->color = $color;
                    $group->is_hidden = $hidden;
                    $group->save();
                }
                $next[$id] = $group->id;
            }
            // Roles that no longer exist on Discord: their group is removed
            foreach (array_diff_key($map, $next) as $groupId) {
                $old = Group::find($groupId);
                if ($old && ! in_array((int) $old->id, [Group::ADMINISTRATOR_ID, Group::GUEST_ID, Group::MEMBER_ID, Group::MODERATOR_ID], true)) {
                    $old->delete();
                }
            }
            $this->settings->set(self::MAP, json_encode($next));
            return $next;
        }

        /**
         * Take over a user's roles, name and ban; returns 'changed', 'same', 'left' (no longer on the server),
         * 'banned' or 'error'.
         */
        public function syncUser(User $user, string $discordId, array $map): string
        {
            [$status, $member] = $this->get('/guilds/'.$this->guild().'/members/'.rawurlencode($discordId));
            if ($status === 404) {
                $roles = [];
            } elseif ($status === 200 && is_array($member)) {
                $roles = array_map('strval', $member['roles'] ?? []);
            } else {
                return 'error';
            }

            $managed = array_map('intval', array_values($map));
            $want = [];
            foreach ($roles as $roleId) {
                if (isset($map[$roleId])) {
                    $want[] = (int) $map[$roleId];
                }
            }
            $have = $user->groups()->pluck('id')->map(fn ($id) => (int) $id)->all();

            // Mod rights for Owner, Admin and Mod; only what the sync granted is taken away again
            $grants = array_map('intval', $this->json(self::MOD_GRANTS, []));
            $isTeam = (bool) array_intersect($roles, $this->modRoles());
            $isAdmin = in_array(Group::ADMINISTRATOR_ID, $have, true);
            $grantsChanged = false;
            if ($isTeam && ! $isAdmin && ! in_array(Group::MODERATOR_ID, $have, true)) {
                $want[] = Group::MODERATOR_ID;
                $grants[] = $user->id;
                $grantsChanged = true;
            } elseif ($isTeam && in_array($user->id, $grants, true)) {
                $want[] = Group::MODERATOR_ID;
            } elseif (! $isTeam && in_array($user->id, $grants, true)) {
                $grants = array_values(array_diff($grants, [$user->id]));
                $grantsChanged = true;
            }
            $controlled = in_array($user->id, $grants, true) || $grantsChanged ? array_merge($managed, [Group::MODERATOR_ID]) : $managed;

            $attach = array_values(array_diff(array_unique($want), $have));
            $detach = array_values(array_diff(array_intersect($have, $controlled), $want));
            if ($attach) {
                $user->groups()->attach($attach);
            }
            if ($detach) {
                $user->groups()->detach($detach);
            }
            if ($grantsChanged) {
                $this->settings->set(self::MOD_GRANTS, json_encode(array_values(array_unique($grants))));
            }
            $renamed = $status === 200 && $this->syncName($user, $member);
            try {
                $pictured = $status === 200 && $this->syncAvatar($user, $member);
            } catch (Throwable $e) {
                // A broken image or a slow Discord CDN must not hold up the sync
                $this->log->warning("Discord avatar for user {$user->id}: ".$e->getMessage());
                $pictured = false;
            }
            if ($status === 200 && class_exists('BBForumProfiles')) {
                try { // Banner, profile color and avatar decoration for the profile (flarum/profiles.php), at most daily
                    BBForumProfiles::sync($user, $member, $this->client, fn ($path) => $this->get($path), $this->guild());
                } catch (Throwable $e) {
                    $this->log->warning("Discord profile for user {$user->id}: ".$e->getMessage());
                }
            }
            if ($this->syncBan($user, $discordId, $status === 404)) {
                return 'banned';
            }
            if ($status === 404) {
                return 'left';
            }
            return ($attach || $detach || $renamed || $pictured) ? 'changed' : 'same';
        }

        /**
         * Profile picture = server profile picture, otherwise Discord picture, as a copy in the forum. Without an
         * entry in AVATARS (new account, picture from sign-up, or none) the sync adopts the picture; afterwards only
         * as long as the forum still shows the most recently adopted picture (or none any more). A picture the user
         * uploaded themselves stays.
         */
        private function syncAvatar(User $user, array $member): bool
        {
            $discordId = (string) ($member['user']['id'] ?? '');
            if (! empty($member['avatar'])) {
                $hash = (string) $member['avatar'];
                $url = 'https://cdn.discordapp.com/guilds/'.$this->guild().'/users/'.$discordId.'/avatars/'.$hash;
            } elseif (! empty($member['user']['avatar'])) {
                $hash = (string) $member['user']['avatar'];
                $url = 'https://cdn.discordapp.com/avatars/'.$discordId.'/'.$hash;
            } else {
                return false; // No picture of their own on Discord: the forum shows the initial letter
            }
            // Animated pictures (Nitro, hash starting with a_) as GIF so they stay animated in the forum
            // (flarum/profiles.php)
            $animated = strpos($hash, 'a_') === 0;
            $url .= $animated ? '.gif?size=128' : '.png?size=256';
            $state = $this->json(self::AVATARS, []);
            $last = $state[$user->id] ?? null;
            $current = $user->getRawOriginal('avatar_url');
            if ($last && $current && $current !== ($last['path'] ?? null)) {
                return false; // uploaded by the user themselves
            }
            if ($last && $current && ($last['hash'] ?? null) === $hash && (! $animated || ! empty($last['gif']))) {
                return false; // unchanged (animated ones that still arrived as a still image are fetched once more)
            }
            $response = $this->client->get($url);
            if ($response->getStatusCode() !== 200) {
                throw new RuntimeException('CDN answered HTTP '.$response->getStatusCode());
            }
            $bytes = (string) $response->getBody();
            $uploader = resolve(\Flarum\User\AvatarUploader::class);
            if ($animated && method_exists($uploader, 'storeGif') && class_exists('BBForumProfiles') && BBForumProfiles::isAnimatedGif($bytes)) {
                $uploader->storeGif($user, $bytes);
            } else {
                $uploader->upload($user, resolve(\Intervention\Image\ImageManager::class)->make($bytes));
            }
            $user->save();
            $state[$user->id] = ['hash' => $hash, 'path' => $user->getRawOriginal('avatar_url'), 'gif' => $animated];
            $this->settings->set(self::AVATARS, json_encode($state, JSON_FORCE_OBJECT));
            return true;
        }

        /** Display name = server name, otherwise Discord display name; only with the "nickname" display name driver. */
        private function syncName(User $user, array $member): bool
        {
            if ($this->settings->get('display_name_driver') !== 'nickname') {
                return false;
            }
            $name = trim((string) ($member['nick'] ?? '')) ?: trim((string) ($member['user']['global_name'] ?? ''));
            $name = $name !== '' ? mb_substr($name, 0, 150) : null;
            if ($user->nickname === $name) {
                return false;
            }
            $user->nickname = $name;
            $user->save();
            return true;
        }

        /**
         * Discord ban → forum suspension, lifted ban → suspension removed. Only touches suspensions that the sync
         * itself set; bans that a forum suspension triggered (FORUM_BANS) are handled by the forum suspension.
         * True = banned.
         */
        private function syncBan(User $user, string $discordId, bool $gone): bool
        {
            if (array_key_exists($user->id, $this->json(self::FORUM_BANS, []))) {
                return false;
            }
            $suspended = array_map('intval', $this->json(self::BAN_SUSPENSIONS, []));
            $ours = in_array($user->id, $suspended, true);
            $banned = false;
            if ($gone) {
                // Only someone who is no longer on the server can be banned; without the "Ban Members" permission (403)
                // or during outages nothing changes
                [$status] = $this->get('/guilds/'.$this->guild().'/bans/'.rawurlencode($discordId));
                if ($status !== 200 && $status !== 404) {
                    return $ours;
                }
                $banned = $status === 200;
            }
            if ($banned && ! $ours && ! $user->isAdmin()) {
                $user->suspended_until = \Carbon\Carbon::parse(self::BAN_UNTIL);
                $user->suspend_reason = 'Banned on the Discord server (role sync)';
                $user->suspend_message = 'You were banned from our Discord server, so your forum account is suspended as well.';
                $user->save();
                $suspended[] = $user->id;
            } elseif (! $banned && $ours) {
                $user->suspended_until = null;
                $user->suspend_reason = null;
                $user->suspend_message = null;
                $user->save();
                $suspended = array_diff($suspended, [$user->id]);
            } else {
                return $banned;
            }
            $this->settings->set(self::BAN_SUSPENSIONS, json_encode(array_values(array_unique($suspended))));
            return $banned;
        }

        /** Forum suspension by a mod → ban on the Discord server (Suspended event from flarum/suspend). */
        public function banForSuspension(User $user, User $actor): void
        {
            if (! $this->enabled() || $user->isAdmin()) {
                return;
            }
            $discordId = (string) LoginProvider::where('provider', 'discord')->where('user_id', $user->id)->value('identifier');
            if ($discordId === '') {
                return;
            }
            $reason = 'Suspended in the forum by '.$actor->username.($user->suspend_reason ? ': '.$user->suspend_reason : '');
            $status = $this->send('PUT', '/guilds/'.$this->guild().'/bans/'.rawurlencode($discordId), $reason);
            if ($status !== 204 && $status !== 200) {
                $this->log->warning("Discord ban for the forum suspension of user {$user->id}: HTTP $status");
                return;
            }
            $bans = $this->json(self::FORUM_BANS, []);
            $bans[$user->id] = $discordId;
            $this->settings->set(self::FORUM_BANS, json_encode($bans, JSON_FORCE_OBJECT));
        }

        /** When a forum suspension ends (lifted or expired), the Discord ban is lifted again. */
        public function releaseForumBans(): int
        {
            $bans = $this->json(self::FORUM_BANS, []);
            $released = 0;
            foreach ($bans as $userId => $discordId) {
                $user = User::find((int) $userId);
                if ($user && $user->suspended_until && $user->suspended_until->isFuture()) {
                    continue;
                }
                $status = $this->send('DELETE', '/guilds/'.$this->guild().'/bans/'.rawurlencode((string) $discordId), 'Forum suspension ended');
                if ($status === 204 || $status === 404) {
                    unset($bans[$userId]);
                    $released++;
                }
            }
            if ($released) {
                $this->settings->set(self::FORUM_BANS, json_encode($bans, JSON_FORCE_OBJECT));
            }
            return $released;
        }

        /** Sync: all linked users ($all) or only those who logged in since $since. */
        public function run(bool $all, int $sinceMinutes = 3): array
        {
            $map = $this->syncGroups();
            $query = LoginProvider::where('provider', 'discord')->with('user');
            if (! $all) {
                $since = \Carbon\Carbon::now()->subMinutes($sinceMinutes);
                $query->where(fn ($q) => $q->where('created_at', '>=', $since)->orWhere('last_login_at', '>=', $since));
            }
            $stats = ['roles' => count($map), 'users' => 0, 'changed' => 0, 'left' => 0, 'banned' => 0, 'error' => 0,
                'unbanned' => $this->releaseForumBans()];
            foreach ($query->get() as $provider) {
                if (! $provider->user) {
                    continue;
                }
                $stats['users']++;
                $result = $this->syncUser($provider->user, (string) $provider->identifier, $map);
                if (isset($stats[$result])) {
                    $stats[$result]++;
                }
            }
            if ($all) {
                $this->settings->set(self::FULL_AT, (string) time());
            }
            return $stats;
        }

        public function fullDue(): bool
        {
            return time() - (int) $this->settings->get(self::FULL_AT, 0) >= 600;
        }
    }
}

if (! class_exists('BBForumDiscordBanOnSuspend')) {
    /** Forum suspension → ban on Discord (flarum/extend.php hooks this to the Suspended event from flarum/suspend). */
    class BBForumDiscordBanOnSuspend
    {
        public function handle($event): void
        {
            try {
                resolve(BBForumDiscordRoles::class)->banForSuspension($event->user, $event->actor);
            } catch (Throwable $e) {
                // An error on the Discord side must not prevent the suspension in the forum
                resolve(LoggerInterface::class)->warning('Discord ban for a forum suspension: '.$e->getMessage());
            }
        }
    }
}

if (! class_exists('BBForumDiscordRolesCommand')) {
    class BBForumDiscordRolesCommand extends AbstractCommand
    {
        protected function configure()
        {
            $this->setName('bbforum:discord-roles')
                ->setDescription('Mirror Discord roles as forum groups')
                ->addOption('all', null, InputOption::VALUE_NONE, 'Sync all linked users right away');
        }

        protected function fire()
        {
            $sync = resolve(BBForumDiscordRoles::class);
            if (! $sync->enabled()) {
                $this->info('Discord role sync is off (no bot token set).');
                return 0;
            }
            // If a sync is still running (many users), no second one starts; after 5 minutes the lock counts as orphaned
            $settings = resolve(SettingsRepositoryInterface::class);
            if (time() - (int) $settings->get('bbforum.discord_roles_lock', 0) < 300) {
                $this->info('Discord role sync is already running.');
                return 0;
            }
            $settings->set('bbforum.discord_roles_lock', (string) time());
            $all = (bool) $this->input->getOption('all') || $sync->fullDue();
            try {
                $stats = $sync->run($all);
            } catch (Throwable $e) {
                resolve(LoggerInterface::class)->warning('Discord role sync: '.$e->getMessage());
                $this->error('Discord role sync failed: '.$e->getMessage());
                return 1;
            } finally {
                $settings->set('bbforum.discord_roles_lock', '0');
            }
            $this->info(($all ? 'all' : 'recent').' '.json_encode($stats));
            return 0;
        }
    }
}
