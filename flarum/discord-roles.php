<?php

/*
 * Discord-Rollen als Forum-Gruppen (geladen von flarum/extend.php).
 *
 * Wer sich im Forum mit Discord anmeldet, bekommt dieselben Rollen wie auf dem Discord-Server, als
 * Gruppen mit gleichem Namen und gleicher Farbe. Discord ist die Quelle: kommt eine Rolle dazu oder
 * fällt weg, passiert das auch im Forum. Owner, Admin und Mod (bbforum.discord_mod_role_ids) kommen
 * zusätzlich in Flarums Gruppe „Mod“ und dürfen moderieren; die Admin-Gruppe des Forums fasst der
 * Abgleich nie an.
 *
 * Als Abzeichen an Beiträgen sichtbar sind nur die Team-Rollen (bbforum.discord_shown_role_ids). Alle
 * anderen Gruppen sind versteckt: Waffen-, GPU- oder Setup-Rollen sieht in Discord nur der Server, im
 * Forum wären sie für alle sichtbar. Für Rechte (etwa eine Kategorie nur für eine Rolle) taugen sie trotzdem.
 *
 * Namen: Mit dem Display-Name-Treiber „nickname“ (flarum/nicknames, setzt setup-forum.sh) zeigt das Forum
 * den Namen auf dem Discord-Server, sonst den Discord-Anzeigenamen. Der Benutzername bleibt für Anmeldung,
 * Profil-Adresse und @-Erwähnungen.
 *
 * Profilbilder: das Server-Profilbild, sonst das Discord-Bild, als Kopie im Forum (Besucher laden nichts von
 * Discord). Ändert es sich auf Discord, zieht der Abgleich nach. Hat jemand im Forum selbst ein anderes Bild
 * hochgeladen, bleibt das (bbforum.discord_avatars merkt sich, welches Bild der Abgleich zuletzt gesetzt hat).
 *
 * Bann und Sperre: Wer auf dem Server gebannt ist, wird im Forum gesperrt; hebt Discord den Bann auf,
 * hebt der Abgleich seine Sperre wieder auf. Sperrt ein Mod jemanden im Forum (Ereignis Suspended von
 * flarum/suspend), bannt der Bot ihn auf dem Server; endet die Sperre, hebt er den Bann wieder auf. Beides
 * gilt nur für Sperren und Banns, die der Abgleich selbst gesetzt hat, und nie für Admins. Dafür braucht der
 * Bot das Recht „Mitglieder bannen“, und seine Rolle muss auf dem Server über den Rollen der Mitglieder
 * stehen (Team-Rollen bleiben darüber, die kann er nicht bannen).
 *
 * Gelesen wird mit dem Bot der Forum-App „Bloodborne PC Port Forum“ (nur REST, keine privilegierten
 * Intents): GET /guilds/{id}/roles, /guilds/{id}/members/{user} und /guilds/{id}/bans/{user}.
 * Einstellungen (setzt scripts/setup-forum.sh aus .env): bbforum.discord_bot_token,
 * bbforum.discord_guild_id, bbforum.discord_mod_role_ids, bbforum.discord_shown_role_ids.
 * Ohne Token passiert nichts.
 *
 * Ablauf: Der Befehl „php flarum bbforum:discord-roles“ läuft jede Minute (Flarum-Scheduler). Er gleicht
 * Nutzer ab, die sich in den letzten Minuten mit Discord angemeldet oder verknüpft haben, und alle
 * 10 Minuten alle verknüpften Nutzer. Mit --all sofort alle.
 *
 * Gemerkt wird in den Einstellungen:
 * - bbforum.discord_role_groups: Discord-Rolle → Forum-Gruppe; nur diese Gruppen verwaltet der Abgleich
 * - bbforum.discord_mod_grants: Nutzer, die „Mod“ über Discord bekommen haben (nur ihnen wird es
 *   wieder entzogen; von Hand ernannte Mods bleiben)
 * - bbforum.discord_roles_full_at: Zeitpunkt des letzten vollständigen Abgleichs
 * - bbforum.discord_ban_suspensions: Nutzer, die wegen eines Discord-Banns gesperrt sind
 * - bbforum.forum_suspension_bans: Nutzer → Discord-ID, die wegen einer Forensperre gebannt sind
 * - bbforum.discord_avatars: Nutzer → zuletzt übernommenes Discord-Bild (Hash) und seine Datei im Forum
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
        // Sperre wegen eines Discord-Banns: gilt, bis Discord den Bann aufhebt (Flarums „unbefristet“ ist auch ein Datum)
        const BAN_UNTIL = '2038-01-01 00:00:00';
        // Owner, Admin, Mod auf dem Discord-Server (Standard, falls nichts eingestellt ist)
        const DEFAULT_MOD_ROLES = '1557459945291513996,1557459946994401412,1557459950312103976';
        // Team-Rollen, die als Abzeichen sichtbar bleiben: Owner, Admin, Contributor, Mod, Support, Helper
        const DEFAULT_SHOWN_ROLES = '1557459945291513996,1557459946994401412,1559601172107493427,'
            .'1557459950312103976,1557459952396673196,1559561716642222122';

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

        /** GET an die Discord-API; [Status, JSON]. Bei 429 einmal kurz warten und wiederholen. */
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

        /** PUT/DELETE an die Discord-API, mit Begründung fürs Audit-Log des Servers; gibt den Status zurück. */
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

        /** Gruppen an die Rollen des Servers angleichen; gibt Rolle → Gruppen-ID zurück. */
        public function syncGroups(): array
        {
            [$status, $roles] = $this->get('/guilds/'.$this->guild().'/roles');
            if ($status !== 200 || ! is_array($roles)) {
                throw new RuntimeException("Discord roles: HTTP $status");
            }
            // @everyone (ID = Server-ID) und Rollen von Integrationen (Bots) bleiben draußen
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
            // Rollen, die es auf Discord nicht mehr gibt: deren Gruppe fällt weg
            foreach (array_diff_key($map, $next) as $groupId) {
                $old = Group::find($groupId);
                if ($old && ! in_array((int) $old->id, [Group::ADMINISTRATOR_ID, Group::GUEST_ID, Group::MEMBER_ID, Group::MODERATOR_ID], true)) {
                    $old->delete();
                }
            }
            $this->settings->set(self::MAP, json_encode($next));
            return $next;
        }

        /** Rollen, Namen und Bann eines Nutzers übernehmen; 'changed', 'same', 'left' (nicht mehr auf dem Server), 'banned' oder 'error'. */
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

            // Mod-Rechte für Owner, Admin und Mod; entzogen wird nur, was der Abgleich vergeben hat
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
                // Ein kaputtes Bild oder ein langsames Discord-CDN darf den Abgleich nicht aufhalten
                $this->log->warning("Discord avatar for user {$user->id}: ".$e->getMessage());
                $pictured = false;
            }
            if ($status === 200 && class_exists('BBForumProfiles')) {
                try { // Banner, Profilfarbe und Avatar-Deko für das Profil (flarum/profiles.php), höchstens täglich
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
         * Profilbild = Server-Profilbild, sonst Discord-Bild, als Kopie im Forum. Ohne Eintrag in AVATARS (neues
         * Konto, Bild von der Registrierung oder keins) übernimmt der Abgleich das Bild; danach nur, solange das
         * Forum noch das zuletzt übernommene Bild zeigt (oder keins mehr). Ein selbst hochgeladenes Bild bleibt.
         */
        private function syncAvatar(User $user, array $member): bool
        {
            $discordId = (string) ($member['user']['id'] ?? '');
            if (! empty($member['avatar'])) {
                $hash = (string) $member['avatar'];
                $url = 'https://cdn.discordapp.com/guilds/'.$this->guild().'/users/'.$discordId.'/avatars/'.$hash.'.png?size=256';
            } elseif (! empty($member['user']['avatar'])) {
                $hash = (string) $member['user']['avatar'];
                $url = 'https://cdn.discordapp.com/avatars/'.$discordId.'/'.$hash.'.png?size=256';
            } else {
                return false; // Kein eigenes Bild auf Discord: das Forum zeigt seinen Buchstaben
            }
            $state = $this->json(self::AVATARS, []);
            $last = $state[$user->id] ?? null;
            $current = $user->getRawOriginal('avatar_url');
            if ($last && $current && $current !== ($last['path'] ?? null)) {
                return false; // selbst hochgeladen
            }
            if ($last && $current && ($last['hash'] ?? null) === $hash) {
                return false; // unverändert
            }
            $response = $this->client->get($url);
            if ($response->getStatusCode() !== 200) {
                throw new RuntimeException('CDN answered HTTP '.$response->getStatusCode());
            }
            $image = resolve(\Intervention\Image\ImageManager::class)->make((string) $response->getBody());
            resolve(\Flarum\User\AvatarUploader::class)->upload($user, $image);
            $user->save();
            $state[$user->id] = ['hash' => $hash, 'path' => $user->getRawOriginal('avatar_url')];
            $this->settings->set(self::AVATARS, json_encode($state, JSON_FORCE_OBJECT));
            return true;
        }

        /** Anzeigename = Name auf dem Server, sonst Discord-Anzeigename; nur mit Display-Name-Treiber „nickname“. */
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
         * Discord-Bann → Forensperre, aufgehobener Bann → Sperre weg. Fasst nur Sperren an, die der Abgleich selbst
         * gesetzt hat; Banns, die eine Forensperre ausgelöst hat (FORUM_BANS), regelt die Forensperre. True = gebannt.
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
                // Nur wer nicht mehr auf dem Server ist, kann gebannt sein; ohne Recht „Mitglieder bannen“ (403)
                // oder bei Störungen ändert sich nichts
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

        /** Forensperre durch einen Mod → Bann auf dem Discord-Server (Ereignis Suspended von flarum/suspend). */
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

        /** Endet eine Forensperre (aufgehoben oder abgelaufen), wird der Discord-Bann wieder aufgehoben. */
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

        /** Abgleich: alle verknüpften Nutzer ($all) oder nur die seit $since angemeldeten. */
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
    /** Forensperre → Bann auf Discord (flarum/extend.php hängt das an das Ereignis Suspended von flarum/suspend). */
    class BBForumDiscordBanOnSuspend
    {
        public function handle($event): void
        {
            try {
                resolve(BBForumDiscordRoles::class)->banForSuspension($event->user, $event->actor);
            } catch (Throwable $e) {
                // Ein Fehler bei Discord darf die Sperre im Forum nicht verhindern
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
                ->setDescription('Discord-Rollen als Forum-Gruppen übernehmen')
                ->addOption('all', null, InputOption::VALUE_NONE, 'Sofort alle verknüpften Nutzer abgleichen');
        }

        protected function fire()
        {
            $sync = resolve(BBForumDiscordRoles::class);
            if (! $sync->enabled()) {
                $this->info('Discord role sync is off (no bot token set).');
                return 0;
            }
            // Läuft noch ein Abgleich (viele Nutzer), startet kein zweiter; nach 5 Minuten gilt die Sperre als verwaist
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
