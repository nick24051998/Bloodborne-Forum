<?php

/*
 * Discord-Rollen als Forum-Gruppen (geladen von flarum/extend.php).
 *
 * Wer sich im Forum mit Discord anmeldet, bekommt dieselben Rollen wie auf dem Discord-Server, als
 * Gruppen mit gleichem Namen und gleicher Farbe (Abzeichen an Beiträgen). Discord ist die Quelle:
 * kommt eine Rolle dazu oder fällt weg, passiert das auch im Forum. Owner, Admin und Mod
 * (bbforum.discord_mod_role_ids) kommen zusätzlich in Flarums Gruppe „Mod“ und dürfen moderieren;
 * die Admin-Gruppe des Forums fasst der Abgleich nie an.
 *
 * Gelesen wird mit dem Bot der Forum-App „Bloodborne PC Port Forum“ (ohne Rechte auf dem Server, nur
 * REST, keine privilegierten Intents): GET /guilds/{id}/roles und /guilds/{id}/members/{user}.
 * Einstellungen (setzt scripts/setup-forum.sh aus .env): bbforum.discord_bot_token,
 * bbforum.discord_guild_id, bbforum.discord_mod_role_ids. Ohne Token passiert nichts.
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
        // Owner, Admin, Mod auf dem Discord-Server (Standard, falls nichts eingestellt ist)
        const DEFAULT_MOD_ROLES = '1557459945291513996,1557459946994401412,1557459950312103976';

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
            $raw = (string) ($this->settings->get('bbforum.discord_mod_role_ids') ?: self::DEFAULT_MOD_ROLES);
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
            $next = [];
            foreach ($roles as $role) {
                $id = (string) $role['id'];
                $name = mb_substr(trim((string) $role['name']), 0, 100) ?: 'Discord role';
                $color = ! empty($role['color']) ? sprintf('#%06x', (int) $role['color']) : null;
                $group = isset($map[$id]) ? Group::find($map[$id]) : null;
                if (! $group) {
                    $group = Group::build($name, $name, $color, null);
                    $group->save();
                } elseif ($group->name_singular !== $name || ($group->color ?: null) !== $color) {
                    $group->name_singular = $name;
                    $group->name_plural = $name;
                    $group->color = $color;
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

        /** Rollen eines Nutzers übernehmen; 'changed', 'same', 'left' (nicht mehr auf dem Server) oder 'error'. */
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
            if ($status === 404) {
                return 'left';
            }
            return ($attach || $detach) ? 'changed' : 'same';
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
            $stats = ['roles' => count($map), 'users' => 0, 'changed' => 0, 'left' => 0, 'error' => 0];
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
