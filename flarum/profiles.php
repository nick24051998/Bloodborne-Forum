<?php
/*
 * Profiles like on Discord (Nick, 26.10.2026; loaded by flarum/extend.php, UI in flarum/forum.js).
 *
 * - From Discord: banner, profile color and avatar decoration. The role sync (flarum/discord-roles.php) calls
 *   BBForumProfiles::sync() with the member object; at most once a day per user and at most
 *   SYNC_PER_RUN users per run it asks GET /users/{id} for this (banner and color are reliably in there).
 *   Banner and decoration are kept as a copy under assets/bbprofile/ (no images from Discord servers in the forum,
 *   as with the profile picture). State per user in the table bb_profiles (creates itself).
 * - Earned effects (Nick's wish: earned, not freely selectable), from the groups that the sync mirrors from Discord:
 *   booster (Server Booster according to the member's premium_since: blood moon frame, glowing name, mark), lantern
 *   (Helper, Mod, Admin, Owner: brass lantern), insight1–4 (Insight levels: mark with level), beta (Beta Hunter,
 *   Test Subject, Beta Testers: mark), winner (bbforum.contest_winners, forum IDs separated by commas: moonlight name).
 * - Role shields instead of Flarum's group badges (roles()): developer of the Port, then the team roles.
 * - Hunter card in the profile: weapon (/hunter on Discord), Insight level, graphics card and VRAM (hardware roles);
 *   graphics card and VRAM also appear on posts in help and bug discussions.
 *
 * - What Nitro can do, for everyone (Nick, 26.10.2026): custom profile colors (bbTheme, two colors as a gradient,
 *   takes precedence over the Discord color), animated profile and cover images (BBForumAvatarUploader,
 *   BBForumCoverUploader below).
 *
 * API: on every user (also on posts) bbPerks, bbDecoration, bbRole, bbRig; in the profile additionally bbBanner,
 * bbAccent, bbTheme, bbHunter, bbRoles and, for the team, bbDiscordUrl.
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
            if (! $schema->hasColumn(self::TABLE, 'theme1')) {
                $schema->table(self::TABLE, function ($table) {
                    $table->string('theme1', 7)->nullable();
                    $table->string('theme2', 7)->nullable();
                });
            }
        }

        /** GIF with more than one frame (the usual check for multiple Graphic Control Extensions) */
        public static function isAnimatedGif(string $bytes): bool
        {
            return strncmp($bytes, 'GIF8', 4) === 0
                && preg_match_all('#\x00\x21\xF9\x04.{4}\x00[\x2C\x21]#s', $bytes) > 1;
        }

        /**
         * Profile colors (like Nitro's "Profile themes", Nick 26.10.2026: what Nitro can do, for everyone): PATCH
         * /users/{id} with bbTheme = ['#rrggbb', '#rrggbb'] or null (back to the Discord color). Only oneself or
         * whoever may edit the user.
         */
        public static function saving(\Flarum\User\Event\Saving $event): void
        {
            $attributes = $event->data['attributes'] ?? [];
            if (! array_key_exists('bbTheme', $attributes)) {
                return;
            }
            $user = $event->user;
            if ($event->actor->id !== $user->id) {
                $event->actor->assertCan('edit', $user);
            }
            $theme = $attributes['bbTheme'];
            if ($theme !== null && ! (is_array($theme) && count($theme) === 2
                && preg_match('/^#[0-9a-f]{6}$/i', (string) $theme[0]) && preg_match('/^#[0-9a-f]{6}$/i', (string) $theme[1]))) {
                throw new \Flarum\Foundation\ValidationException(['bbTheme' => 'Pick two colours.']);
            }
            $user->afterSave(function ($user) use ($theme) {
                self::ensureTable();
                self::db()->table(self::TABLE)->updateOrInsert(['user_id' => $user->id], [
                    'theme1' => $theme ? strtolower($theme[0]) : null,
                    'theme2' => $theme ? strtolower($theme[1]) : null,
                ]);
                unset(self::$rows[$user->id]);
            });
        }

        /**
         * From the role sync: booster (premium_since in the member object; Discord manages the role itself and it
         * does not come as a group) on every run; banner, color and decoration when the last state is older than a day.
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
                return; // the rest follows in the next runs
            }
            self::$synced++;
            $discordId = (string) ($member['user']['id'] ?? '');
            [$status, $full] = $get('/users/'.rawurlencode($discordId));
            $u = $status === 200 && is_array($full) ? $full : (array) ($member['user'] ?? []);

            // Server profile before Discord profile (as with the picture)
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

            // Many users share the same decoration presets: one file per preset (animated PNG)
            if ($decoAsset === '') {
                $data['decoration'] = null;
            } elseif (preg_match('/^[a-z0-9_]{6,80}$/i', $decoAsset)) {
                // For animation Discord serves the decoration only as the original APNG (passthrough=true, size is then
                // ignored, often 1–2 MB; WebP would be a still image). The browser loads each preset only once.
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
                    self::$rows[$user->id] = []; // table not created yet
                }
            }
            return self::$rows[$user->id];
        }

        private static function url(?string $file): ?string
        {
            return $file ? self::disk()->url(self::DIR.'/'.$file) : null;
        }

        /** Names of the groups (= Discord roles, without the leading emoji) */
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
         * Roles for the shield next to the name, most important first: medo as developer of the Port
         * (bbforum.developer_discord_ids), then the team roles from Discord ("Great Hunter · Admin" → Admin), finally
         * code contributors. Instead of Flarum's badges (for Discord roles just colored dots without an icon, which
         * sat over the profile picture).
         */
        public static function roles(User $user): array
        {
            $order = ['developer' => 0, 'owner' => 1, 'admin' => 2, 'mod' => 3, 'contributor' => 4, 'helper' => 5, 'modding' => 6,
                'code' => 7, 'modder' => 8];
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
                        'Helper' => 'helper', 'Modding' => 'modding', 'Code Contributor' => 'code', 'Modder' => 'modder'][$label] ?? null;
                } elseif ((int) $group->id === 1) {
                    [$key, $label, $name] = ['admin', 'Admin', 'Forum admin'];
                } elseif ((int) $group->id === 4) {
                    [$key, $label, $name] = ['mod', 'Mod', 'Forum moderator'];
                }
                // The name of the Discord role takes precedence over Flarum's own group
                if ($key && (! isset($roles[$key]) || $label !== null && strpos($name, '·') !== false)) {
                    $roles[$key] = ['key' => $key, 'label' => $label, 'title' => $name];
                }
            }
            uasort($roles, fn ($a, $b) => $order[$a['key']] <=> $order[$b['key']]);
            // Of Owner, Admin and Mod only the highest rank (medo is Owner, not additionally Mod)
            $rank = false;
            foreach (['owner', 'admin', 'mod'] as $key) {
                if (isset($roles[$key]) && $rank) {
                    unset($roles[$key]);
                }
                $rank = $rank || isset($roles[$key]);
            }
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

        /**
         * On every user (also on posts): effects, decoration, the most important role shield, the PC (rig) for help
         * discussions
         */
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

        /** In the profile: banner, color, all roles, hunter card; for the team the link to the Discord account */
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
                'bbTheme' => ! empty($row['theme1']) && ! empty($row['theme2']) ? [$row['theme1'], $row['theme2']] : null,
            ];
        }
    }
}

/*
 * Animated images for everyone (Nick, 26.10.2026: what Nitro can do, for everyone). Flarum turns every profile
 * picture into a 100×100 PNG and the cover plugin turns every cover image into a JPG; the container only has GD,
 * which loses the animation when resizing. That is why an animated GIF is left unchanged (the validators of the
 * two check the size, cropping is done via CSS). Everything else goes the normal way. Hooked in via
 * BBForumProfilesProvider.
 */
if (! class_exists('BBForumAvatarUploader')) {
    class BBForumAvatarUploader extends \Flarum\User\AvatarUploader
    {
        public function upload(User $user, \Intervention\Image\Image $image)
        {
            $path = $image->basePath();
            $bytes = $path && is_readable($path) ? (string) file_get_contents($path) : '';
            if ($bytes !== '' && BBForumProfiles::isAnimatedGif($bytes)) {
                $this->storeGif($user, $bytes);
                return;
            }
            parent::upload($user, $image);
        }

        /** Also used for animated Discord pictures (flarum/discord-roles.php) */
        public function storeGif(User $user, string $bytes): void
        {
            $avatarPath = \Illuminate\Support\Str::random().'.gif';
            $this->removeFileAfterSave($user);
            $user->changeAvatarPath($avatarPath);
            $this->uploadDir->put($avatarPath, $bytes);
        }
    }
}

if (class_exists('SychO\ProfileCover\CoverUploader') && ! class_exists('BBForumCoverUploader')) {
    class BBForumCoverUploader extends \SychO\ProfileCover\CoverUploader
    {
        public function upload(User $user, \Intervention\Image\Image $image)
        {
            $path = $image->basePath();
            $bytes = $path && is_readable($path) ? (string) file_get_contents($path) : '';
            if ($bytes === '' || ! BBForumProfiles::isAnimatedGif($bytes)) {
                parent::upload($user, $image);
                return;
            }
            $coverPath = \Illuminate\Support\Str::random().'.gif';
            $this->remove($user);
            $user->cover = $coverPath;
            if ($this->config->get('sycho-profile-cover.thumbnails', 0) == 1) {
                // Thumbnail from the first frame, as in the plugin
                $thumbnail = clone $image;
                $thumbnail->resize(500, null, function ($constraint) {
                    $constraint->aspectRatio();
                });
                $thumbnail->crop(500, 144);
                $this->coversDir->put('thumbnails/'.$coverPath, $thumbnail->encode('jpg'));
            }
            $this->coversDir->put($coverPath, $bytes);
        }
    }
}

if (! class_exists('BBForumProfilesProvider')) {
    class BBForumProfilesProvider extends \Flarum\Foundation\AbstractServiceProvider
    {
        public function register()
        {
            $this->container->bind(\Flarum\User\AvatarUploader::class, BBForumAvatarUploader::class);
            if (class_exists('BBForumCoverUploader')) {
                $this->container->bind(\SychO\ProfileCover\CoverUploader::class, BBForumCoverUploader::class);
            }
        }
    }
}
