<?php
/*
 * Profile wie auf Discord (Nick, 26.10.2026; geladen von flarum/extend.php, Oberfläche in flarum/forum.js).
 *
 * - Von Discord: Banner, Profilfarbe und Avatar-Deko. Der Rollen-Abgleich (flarum/discord-roles.php) ruft
 *   BBForumProfiles::sync() mit dem Mitglieds-Objekt auf; höchstens einmal am Tag je Nutzer und höchstens
 *   SYNC_PER_RUN Nutzer pro Lauf fragt es dazu GET /users/{id} (dort stehen Banner und Farbe sicher drin).
 *   Banner und Deko liegen als Kopie unter assets/bbprofile/ (keine Bilder von Discord-Servern im Forum, wie beim
 *   Profilbild). Stand je Nutzer in der Tabelle bb_profiles (legt sich selbst an).
 * - Verdiente Effekte (Nick: verdient, nicht frei wählbar), aus den Gruppen, die der Abgleich von Discord spiegelt:
 *   booster (Server Booster laut premium_since des Mitglieds: Blutmond-Rahmen, Name glüht, Zeichen), lantern
 *   (Helper, Mod, Admin, Owner: Messing-Laterne), insight1–4 (Insight-Stufen: Zeichen mit Stufe), beta (Beta Hunter,
 *   Test Subject, Beta Testers: Zeichen), winner (bbforum.contest_winners, Forum-IDs mit Komma: Mondlicht-Name).
 * - Rollen-Schilder statt Flarums Gruppen-Abzeichen (roles()): Entwickler des Ports, dann die Team-Rollen.
 * - Hunter-Karte im Profil: Waffe (/hunter auf Discord), Insight-Stufe, Grafikkarte und VRAM (Hardware-Rollen);
 *   Grafikkarte und VRAM stehen außerdem an Beiträgen in Hilfe- und Bug-Themen.
 *
 * API: an jedem Nutzer (auch an Beiträgen) bbPerks, bbDecoration, bbRole, bbRig; im Profil dazu bbBanner, bbAccent,
 * bbHunter, bbRoles und fürs Team bbDiscordUrl.
 */

use Flarum\User\User;

if (! class_exists('BBForumProfiles')) {
    class BBForumProfiles
    {
        const TABLE = 'bb_profiles';
        const DIR = 'bbprofile';
        const REFRESH = 86400;
        const SYNC_PER_RUN = 40;
        const WEAPONS = ['Saw Cleaver', 'Hunter Axe', 'Threaded Cane', "Ludwig's Holy Blade", 'Kirkhammer', 'Blades of Mercy',
            'Burial Blade', 'Chikage', 'Rakuyo', 'Beast Claw', 'Holy Moonlight Sword', 'Whirligig Saw', 'Church Pick',
            'Boom Hammer', 'Tonitrus', "Simon's Bowblade", 'Bare fists, like a beast'];
        const INSIGHT = ['Resonant Bell', 'Lamplighter', 'Old Hunter', 'Hunter of the Workshop'];

        private static $synced = 0;
        private static $rows = [];

        private static function db()
        {
            return resolve('db');
        }

        private static function disk()
        {
            return resolve(\Illuminate\Contracts\Filesystem\Factory::class)->disk('flarum-assets');
        }

        public static function ensureTable(): void
        {
            $schema = self::db()->getSchemaBuilder();
            if (! $schema->hasTable(self::TABLE)) {
                $schema->create(self::TABLE, function ($table) {
                    $table->unsignedInteger('user_id')->primary();
                    $table->string('banner', 120)->nullable();
                    $table->string('banner_hash', 80)->nullable();
                    $table->unsignedInteger('accent')->nullable();
                    $table->string('decoration', 120)->nullable();
                    $table->unsignedInteger('synced_at')->default(0);
                });
            }
            if (! $schema->hasColumn(self::TABLE, 'booster')) {
                $schema->table(self::TABLE, function ($table) {
                    $table->boolean('booster')->default(false);
                });
            }
        }

        /**
         * Aus dem Rollen-Abgleich: Booster (premium_since im Mitglieds-Objekt, die Rolle verwaltet Discord selbst und
         * kommt nicht als Gruppe) bei jedem Lauf; Banner, Farbe und Deko, wenn der letzte Stand älter als ein Tag ist.
         */
        public static function sync(User $user, array $member, \GuzzleHttp\Client $client, callable $get, string $guild): void
        {
            self::ensureTable();
            $row = (array) self::db()->table(self::TABLE)->where('user_id', $user->id)->first();
            $booster = ! empty($member['premium_since']);
            if ($row && (bool) $row['booster'] !== $booster) {
                self::db()->table(self::TABLE)->where('user_id', $user->id)->update(['booster' => $booster]);
            }
            if ($row && time() - (int) $row['synced_at'] < self::REFRESH) {
                return;
            }
            if (self::$synced >= self::SYNC_PER_RUN) {
                return; // der Rest kommt in den nächsten Läufen
            }
            self::$synced++;
            $discordId = (string) ($member['user']['id'] ?? '');
            [$status, $full] = $get('/users/'.rawurlencode($discordId));
            $u = $status === 200 && is_array($full) ? $full : (array) ($member['user'] ?? []);

            // Server-Profil vor Discord-Profil (wie beim Bild)
            $bannerHash = (string) ($member['banner'] ?? '') ?: (string) ($u['banner'] ?? '');
            $bannerUrl = null;
            if ($bannerHash !== '') {
                $ext = strpos($bannerHash, 'a_') === 0 ? 'gif' : 'png';
                $bannerUrl = ! empty($member['banner'])
                    ? "https://cdn.discordapp.com/guilds/$guild/users/$discordId/banners/$bannerHash.$ext?size=600"
                    : "https://cdn.discordapp.com/banners/$discordId/$bannerHash.$ext?size=600";
            }
            $decoAsset = (string) ($member['avatar_decoration_data']['asset'] ?? '') ?: (string) ($u['avatar_decoration_data']['asset'] ?? '');

            $data = [
                'accent' => isset($u['accent_color']) && $u['accent_color'] !== null ? (int) $u['accent_color'] : null,
                'booster' => $booster,
                'synced_at' => time(),
            ];
            $disk = self::disk();

            if ($bannerHash === '') {
                if (! empty($row['banner'])) {
                    $disk->delete(self::DIR.'/'.$row['banner']);
                }
                $data['banner'] = null;
                $data['banner_hash'] = null;
            } elseif (($row['banner_hash'] ?? null) !== $bannerHash || empty($row['banner'])) {
                $response = $client->get($bannerUrl);
                if ($response->getStatusCode() === 200) {
                    $file = 'banner-'.$user->id.'-'.substr(preg_replace('/[^a-z0-9_]/i', '', $bannerHash), 0, 40).'.'.$ext;
                    $disk->put(self::DIR.'/'.$file, (string) $response->getBody());
                    if (! empty($row['banner']) && $row['banner'] !== $file) {
                        $disk->delete(self::DIR.'/'.$row['banner']);
                    }
                    $data['banner'] = $file;
                    $data['banner_hash'] = $bannerHash;
                }
            }

            // Deko-Vorlagen teilen sich viele: je Vorlage eine Datei (animiertes PNG)
            if ($decoAsset === '') {
                $data['decoration'] = null;
            } elseif (preg_match('/^[a-z0-9_]{6,80}$/i', $decoAsset)) {
                // Animiert gibt Discord die Deko nur als Original-APNG (passthrough=true, size wird dann ignoriert,
                // oft 1–2 MB; WebP wäre ein Standbild). Der Browser lädt jede Vorlage nur einmal.
                $file = 'deco-'.$decoAsset.'.png';
                if (! $disk->exists(self::DIR.'/'.$file)) {
                    $response = $client->get("https://cdn.discordapp.com/avatar-decoration-presets/$decoAsset.png?size=160&passthrough=true");
                    if ($response->getStatusCode() === 200) {
                        $disk->put(self::DIR.'/'.$file, (string) $response->getBody());
                    }
                }
                $data['decoration'] = $disk->exists(self::DIR.'/'.$file) ? $file : null;
            }

            self::db()->table(self::TABLE)->updateOrInsert(['user_id' => $user->id], $data);
        }

        private static function row(User $user): array
        {
            if (! array_key_exists($user->id, self::$rows)) {
                try {
                    self::$rows[$user->id] = (array) (self::db()->table(self::TABLE)->where('user_id', $user->id)->first() ?: []);
                } catch (\Throwable $e) {
                    self::$rows[$user->id] = []; // Tabelle noch nicht angelegt
                }
            }
            return self::$rows[$user->id];
        }

        private static function url(?string $file): ?string
        {
            return $file ? self::disk()->url(self::DIR.'/'.$file) : null;
        }

        /** Namen der Gruppen (= Discord-Rollen, ohne Emoji vorne) */
        private static function groupNames(User $user): array
        {
            return $user->groups->map(function ($group) {
                return trim(preg_replace('/^[^\pL\pN]+/u', '', (string) $group->name_singular));
            })->all();
        }

        public static function perks(User $user): array
        {
            $names = self::groupNames($user);
            $has = function (array $needles) use ($names) {
                foreach ($names as $name) {
                    foreach ($needles as $needle) {
                        if (stripos($name, $needle) !== false) {
                            return true;
                        }
                    }
                }
                return false;
            };
            $perks = [];
            if (! empty(self::row($user)['booster']) || $has(['Server Booster'])) {
                $perks[] = 'booster';
            }
            if ($has(['· Helper', '· Mod', '· Admin', '· Owner']) || $user->groups->contains('id', 4)) {
                $perks[] = 'lantern';
            }
            for ($level = count(self::INSIGHT); $level >= 1; $level--) {
                if (in_array(self::INSIGHT[$level - 1], $names, true)) {
                    $perks[] = 'insight'.$level;
                    break;
                }
            }
            if ($has(['Beta Hunter', 'Test Subject', 'Beta Testers'])) {
                $perks[] = 'beta';
            }
            $settings = resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
            $winners = array_filter(array_map('intval', explode(',', (string) $settings->get('bbforum.contest_winners', ''))));
            if (in_array((int) $user->id, $winners, true)) {
                $perks[] = 'winner';
            }
            return $perks;
        }

        private static $discordIds = [];

        private static function discordId(User $user): ?string
        {
            if (! array_key_exists($user->id, self::$discordIds)) {
                self::$discordIds[$user->id] = \Flarum\User\LoginProvider::where('provider', 'discord')
                    ->where('user_id', $user->id)->value('identifier');
            }
            return self::$discordIds[$user->id];
        }

        /**
         * Rollen fürs Schild am Namen, wichtigste zuerst: medo als Entwickler des Ports (bbforum.developer_discord_ids),
         * dann die Team-Rollen von Discord („Great Hunter · Admin“ → Admin), zuletzt Code-Contributors. Statt
         * Flarums Abzeichen (bei Discord-Rollen nur Farbpunkte ohne Symbol, die über dem Profilbild lagen).
         */
        public static function roles(User $user): array
        {
            $order = ['developer' => 0, 'owner' => 1, 'admin' => 2, 'mod' => 3, 'contributor' => 4, 'helper' => 5, 'code' => 6];
            $roles = [];
            $devs = array_filter(array_map('trim', explode(',', (string) resolve(\Flarum\Settings\SettingsRepositoryInterface::class)
                ->get('bbforum.developer_discord_ids', '280443805415505921'))));
            if (in_array((string) self::discordId($user), $devs, true)) {
                $roles['developer'] = ['key' => 'developer', 'label' => 'Port developer', 'title' => 'Makes the Bloodborne PC Port'];
            }
            foreach ($user->groups as $group) {
                $name = trim(preg_replace('/^[^\pL\pN]+/u', '', (string) $group->name_singular));
                $parts = array_map('trim', explode('·', $name, 2));
                $label = count($parts) === 2 ? $parts[1] : null;
                $key = null;
                if ($label !== null) {
                    $key = ['Owner' => 'owner', 'Admin' => 'admin', 'Mod' => 'mod', 'Contributor' => 'contributor',
                        'Helper' => 'helper', 'Code Contributor' => 'code'][$label] ?? null;
                } elseif ((int) $group->id === 1) {
                    [$key, $label] = ['admin', 'Admin'];
                } elseif ((int) $group->id === 4) {
                    [$key, $label] = ['mod', 'Mod'];
                }
                if ($key && ! isset($roles[$key])) {
                    $roles[$key] = ['key' => $key, 'label' => $label, 'title' => $name];
                }
            }
            uasort($roles, fn ($a, $b) => $order[$a['key']] <=> $order[$b['key']]);
            return array_values($roles);
        }

        private static function hunter(User $user): array
        {
            $names = self::groupNames($user);
            return array_filter([
                'weapon' => current(array_intersect($names, self::WEAPONS)) ?: null,
                'insight' => current(array_intersect(array_reverse(self::INSIGHT), $names)) ?: null,
                'gpu' => ($gpu = current(preg_grep('/^GPU · /u', $names))) ? preg_replace('/^GPU · /u', '', $gpu) : null,
                'vram' => ($vram = current(preg_grep('/^VRAM · /u', $names))) ? preg_replace('/^VRAM · /u', '', $vram) : null,
            ]);
        }

        /** An jedem Nutzer (auch an Beiträgen): Effekte, Deko, das wichtigste Rollen-Schild, der Rechner für Hilfe-Themen */
        public static function basic(User $user): array
        {
            if (! $user->exists) {
                return [];
            }
            $row = self::row($user);
            $hunter = self::hunter($user);
            $rig = array_filter([$hunter['gpu'] ?? null, isset($hunter['vram']) ? $hunter['vram'].' VRAM' : null]);
            return [
                'bbPerks' => self::perks($user),
                'bbDecoration' => self::url($row['decoration'] ?? null),
                'bbRole' => self::roles($user)[0] ?? null,
                'bbRig' => $rig ? implode(' · ', $rig) : null,
            ];
        }

        /** Im Profil: Banner, Farbe, alle Rollen, Hunter-Karte; fürs Team der Link zum Discord-Konto */
        public static function full(User $user, User $actor): array
        {
            if (! $user->exists) {
                return [];
            }
            $row = self::row($user);
            $hunter = self::hunter($user);
            $discord = self::discordId($user);
            $team = $actor->isAdmin() || $actor->hasPermission('user.suspend');
            return [
                'bbBanner' => self::url($row['banner'] ?? null),
                'bbAccent' => isset($row['accent']) && $row['accent'] !== null ? sprintf('#%06x', (int) $row['accent']) : null,
                'bbHunter' => $hunter ?: null,
                'bbRoles' => self::roles($user),
                'bbDiscordUrl' => $team && $discord ? 'https://discord.com/users/'.$discord : null,
            ];
        }
    }
}
