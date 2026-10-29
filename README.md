# Bloodborne PC Port – Community Forum

A lean forum for the **Bloodborne PC Port** community that you can deploy right away
(English-language, login via Discord). Stack: **Flarum 1.8** + **MariaDB 10.11** in Docker,
with a Bloodborne gothic theme in Discord style.

> **Why `crazymax/flarum` instead of `mondedie/flarum:stable`?**
> `mondedie/flarum:stable` was last built in 2022 (Flarum 1.3.0, PHP 8.0) and has known
> security holes. `:latest` does contain Flarum 1.8, but still runs on PHP 8.0 with Alpine 3.16,
> which is no longer maintained. [`crazymax/flarum`](https://hub.docker.com/r/crazymax/flarum)
> is actively maintained (Flarum 1.8.19, PHP 8.4, Alpine 3.23) and comes with the `extension require` command.
> Flarum 2.0 has only been stable since October 2026. The extensions are still catching up, so this
> setup stays on 1.8 on purpose (see [Update](#update)).

> **Website:** The project website (home page, install guide, FAQ, changelog) lives in
> [`website/`](website/README.md). It is published automatically via GitHub Pages at https://bbport.de;
> the forum runs at https://forum.bbport.de.

## Contents

| Path | Purpose |
|---|---|
| `docker-compose.yml` | Flarum, MariaDB (named volumes), cloudflared (profile `tunnel`) |
| `.env.example` | All settings with placeholders; gets copied to `.env` |
| `scripts/bootstrap.sh` | **All-in-one installer:** asks for a few values, generates passwords, starts and sets up everything |
| `scripts/install-extensions.sh` | Installs the extensions from `flarum/extensions.txt` (fof/oauth, upload, best-answer, discussion-templates, sitemap, flarum-seo 2.x; optionally fof/user-directory) |
| `flarum/extensions.txt`, `flarum/restore-extensions.sh` | Extension list; restored before every container start |
| `flarum/scheduler.sh` | Runs the Flarum scheduler (every minute) inside the forum container |
| `scripts/setup-forum.sh` | Sets up everything via the Flarum API: admin, extensions, tags, permissions, theme, banner, rules, logo |
| `scripts/backup.sh` | DB dump + data volume as `.tar.gz` |
| `scripts/nightly-backup.sh`, `scripts/install-backup.sh` | Nightly backup (3:30 am, systemd timer) with a check and cleanup after `BACKUP_KEEP_DAYS` |
| `scripts/rotate-admin-password.sh` | Sets a new admin password, writes it to `.env` and logs the admin out everywhere |
| `scripts/auto-update.sh`, `scripts/install-auto-update.sh` | Fetches new commits every 5 minutes and applies them (systemd timer), optionally with a notification in Discord |
| `scripts/uptime-check.sh`, `.github/workflows/uptime.yml` | Downtime watcher: checks website and forum every 10 minutes from GitHub, reports outages and recovery in Discord |
| `.github/workflows/website.yml` | Builds the website on changes, and every 2 hours when the port has a new version; announces it in Discord |
| `flarum/extend.php` | "New accounts only via Discord" switch, security headers, and new topics to Discord |
| `flarum/extend-loader.php` | Mounted as `/opt/flarum/extend.php`; loads `flarum/extend.php` so changes take effect after `git pull` without a restart |
| `flarum/forum.js` | Links to the website and to Discord in the forum header, sign-up dialog with only the Discord button, live numbers from SuperMedo Server (sidebar; on phones below the banner) |
| `flarum/helpers.php` | Top helpers: ranking of the last 30 days and of all time (`/api/bb-top-helpers`), box in the sidebar, page `/top-helpers`, mark for the top 3 |
| `flarum/supermedo-account.php` | "My game account" in the member's menu: `/supermedo-account` signs the member in on SuperMedo Server (game.supermedo.com) with a note signed by the shared key `SUPERMEDO_ACCOUNT_KEY`, valid for 60 seconds; off without the key |
| `flarum/server-stats.php` | SuperMedo Server statistics for the website (`/server/`, `/server/hunter/?id=…`, band on the home page) and the forum box: `/api/bb-server`, `/api/bb-server/summary`, `/api/bb-server/hunters/{id}`, one request a minute to game.supermedo.com |
| `media/` | Icons (CC0), banner images (`media/images/`, AI-generated) and self-made textures; sources in `media/CREDITS.md`, rebuild with `python3 media/build.py`. Brand rules in `media/BRAND.md`, ChatGPT prompts for new media in `media/PROMPTS.md` |
| `flarum/icons.less` | Custom category icons (`bbicon bbicon-NAME`), generated from `media/icons/` |
| `theme/custom.less` | Theme (Admin → Appearance → Custom Styles) |
| `media/brand/`, `media/brand.py`, `media/logo.html`, `media/og.html` | The community sigil (`sigil.png`); the Discord icon, logo, favicons, website emblem and preview image are made from it |
| `theme/logo.png`, `theme/favicon.png` | The same images as PNG for uploading (Flarum 1.x doesn't accept SVG) |
| `theme/fonts/` | Cinzel + Inter as `.woff2`, self-hosted (SIL OFL) |
| `content/` | Welcome banner, footer (Contact/Privacy), pinned topics (rules, short install guide, "Read first" for Help & Support, guide for Share your FPS), templates for Help & Support and Share your FPS |
| `website/` | Project website (Astro, static, GitHub Pages), see `website/README.md` |

## Requirements

- Debian VM with Docker Engine and the Compose plugin (`docker compose version` ≥ 2.20)
- 1 vCPU and 1 GB RAM are enough to start; 2 GB are recommended. Measured at idle:
  Flarum ≈ 110 MB, MariaDB ≈ 110 MB.
- A domain on Cloudflare, e.g. `forum.example.com`
- Access to the [Discord Developer Portal](https://discord.com/developers/applications)
- Outbound internet access for the container (Composer downloads the extensions)

## Quick start (one command)

On the server (via SSH):

```bash
git clone https://github.com/nick24051998/Bloodborne-Forum && cd Bloodborne-Forum
scripts/bootstrap.sh
```

The installer asks for the domain, admin name and email, the Discord link and the HTTPS option.
It generates all passwords itself and writes `.env`. It starts the containers, installs and
configures everything (steps 1–2 below) and, with option (b), starts the Cloudflare Tunnel.
At the end it shows the admin password and the remaining browser steps (Discord portal,
client secret, Cloudflare). In testing, it took under a minute from zero to a finished forum.
You can safely run the installer again.

The sections below describe the same steps one by one, so you can follow what happens.

## 1. Start

```bash
git clone <dieses-repo> bloodborne-forum && cd bloodborne-forum
cp .env.example .env && chmod 600 .env
# Generate passwords and put them in .env:
openssl rand -base64 32 | tr -d '/+='   # for DB_PASSWORD, DB_ROOT_PASSWORD, FLARUM_ADMIN_PASS
nano .env                               # FORUM_URL, admin, DISCORD_INVITE_URL, …

docker compose up -d
docker compose logs -f flarum           # first start takes about 1 minute
```

After that, Flarum only listens on `127.0.0.1:8888`, so it is not publicly reachable yet.

> **`FORUM_URL` must exactly match the address visitors open**
> (`https://`, with or without `www`, no trailing slash). Otherwise icons, fonts, logins
> and the Discord redirect URL break.

## 2. First install: extensions and setup

```bash
scripts/install-extensions.sh                 # optional: --with-user-directory
scripts/setup-forum.sh
```

`setup-forum.sh` is idempotent and can run again after any change to `.env`, `theme/` or `content/`.
It does the following:

1. **Create the admin.** On first start, the image creates the account `flarum`/`flarum`. The
   script turns it into the admin from `.env` (name, email, password). After that,
   `flarum`/`flarum` no longer works.
   ⚠️ **Only make the forum public after this step (step 3).**
2. **Enable extensions:** Tags, Markdown, BBCode, Emoji, Mentions, Likes, Sticky, Lock,
   Subscriptions, Flags, Approval, Suspend, Statistics, GDPR and the fof extensions.
3. **Theme and home page:** dark mode, colors, `theme/custom.less`, fonts, welcome banner with
   Discord link, logo and favicon.
4. **Tags, order, permissions, Best Answer, Help template, upload rules** (see [Tags & Permissions](#tags--permissions)).
5. **Rules topic** in Announcements, pinned and locked.
6. **Discord login**, if `DISCORD_CLIENT_ID` is set.

You can also do all of this by hand in the admin area at `https://forum.example.com/admin`. Under
*Extensions* you can turn the extensions on one by one.

## Test on your local network (before going live)

Flarum builds all links from `FORUM_URL`. To test on the LAN, switch the URL and the
bind address to the LAN IP of the Docker host (example `192.168.13.84`):

```bash
sed -i -e 's|^FORUM_URL=.*|FORUM_URL=http://192.168.13.84:8888|' \
       -e 's|^FLARUM_BIND=.*|FLARUM_BIND=192.168.13.84|' .env
grep -q '^FLARUM_BIND=' .env || echo 'FLARUM_BIND=192.168.13.84' >> .env
docker compose up -d db flarum
```

Then open `http://192.168.13.84:8888` in the browser. **To switch back for going live:**

```bash
sed -i -e 's|^FORUM_URL=.*|FORUM_URL=https://forum.example.com|' -e 's|^FLARUM_BIND=.*|FLARUM_BIND=127.0.0.1|' .env
docker compose up -d
```

## 3. Go public: HTTPS

### Option (a): Caddy on the host

`/etc/caddy/Caddyfile`:

```caddy
forum.example.com {
    # Cloudflare proxy (orange cloud) with SSL mode "Full (strict)":
    # origin certificate from Cloudflare → SSL/TLS → Origin Server.
    # With a grey cloud, leave out the tls line; Caddy then gets a Let's Encrypt certificate itself.
    tls /etc/caddy/cf-origin.pem /etc/caddy/cf-origin.key
    encode zstd gzip
    # Extra protection: never run PHP from the upload/asset folder
    @phpInAssets path_regexp ^/assets/.*\.php
    respond @phpInAssets 404
    reverse_proxy 127.0.0.1:8888
}
```

```bash
sudo systemctl reload caddy
```

Cloudflare DNS: `A forum → <your static IP>`, proxied (orange cloud).
Flarum reads the real visitor IP from `CF-Connecting-IP`, which matters for spam protection and bans.
So ports 80 and 443 on the VM should only be open to the
[Cloudflare IP ranges](https://www.cloudflare.com/ips/). Otherwise someone could fake the
header.

### Option (b): Cloudflare Tunnel (no open ports)

1. Cloudflare Zero Trust → *Networks → Tunnels* → *Create a tunnel* → *Cloudflared* → copy the token.
2. In the tunnel, under *Public Hostname*, enter `forum.example.com` → service `HTTP` → `flarum:8000`.
3. In `.env`, set `CF_TUNNEL_TOKEN=…` and `COMPOSE_PROFILES=tunnel`. If you ran `bootstrap.sh` with
   option 1, this is already there.
4. `docker compose up -d` now also starts the `cloudflared` service.

## 4. Set up Discord login

1. In the [Developer Portal](https://discord.com/developers/applications), click **New Application**,
   e.g. "Bloodborne PC Port Forum". You can use `theme/favicon.png` as the icon.
2. **OAuth2 → Redirects → Add Redirect**, enter exactly:

   ```
   https://forum.example.com/auth/discord
   ```

   That is `${FORUM_URL}/auth/discord`: with `https`, no trailing slash, no query string.
   Then **Save Changes**. fof/oauth expects this route.
3. Copy **OAuth2 → Client ID**, put it in `.env` as `DISCORD_CLIENT_ID` and
   run `scripts/setup-forum.sh` again. This turns on the Discord provider and sets the ID.
4. Click **Reset Secret** and copy the secret. Do **not** put the secret in `.env` or the repo.
   Put it here instead: **Flarum Admin → Extensions → OAuth (FriendsOfFlarum) → Discord
   (gear icon) → Client Secret** → Save. Check there that Discord is turned on.
5. Test in a private browser window: *Log In → Log in with Discord*.

fof/oauth automatically requests the scopes `identify` and `email` from Discord. You don't need a bot.
If someone has verified their email on Discord, Flarum takes it as confirmed. No confirmation
email is sent in that case.

### Turn off email sign-up (Discord as the main way in)

`DISCORD_ONLY_SIGNUP=true` (default) in `.env` → `scripts/setup-forum.sh`. After that, Flarum rejects
new accounts without a Discord login and shows the message "New accounts can only be created with
'Log in with Discord'". The sign-up dialog then only shows the Discord button
(`flarum/forum.js`, as long as Discord login is active). Existing accounts and admins are not affected. To turn it off:
set `DISCORD_ONLY_SIGNUP=false` and run the script again.

> Do **not** turn off the core switch *Admin → Basics → Allow Sign Up*. In Flarum it also blocks
> sign-up via Discord. `flarum/extend.php` handles the block instead.

### Sending email (recommended)

For email notifications: **Admin → Email** → enter the SMTP details of a mail service
(e.g. Brevo, Mailgun or your own server). The setup leaves a configured service as it is.

Without a mail service, the setup sets the driver to `log`: emails only end up in the forum log, and notifications
show up in the forum itself. Flarum's default `mail` doesn't work in the container (BusyBox `sendmail` can't do `-bs`) and
would otherwise make replies fail with an error as soon as someone should get an email notification.

## Security

**Already built in:**

- **Current image:** Flarum 1.8.19, PHP 8.4, Alpine 3.23. The processes run as the
  non-root user `flarum`, and all containers have `no-new-privileges` and log rotation.
- **Small attack surface:** Flarum only listens on `127.0.0.1`, and the database has no outside
  port at all. With Cloudflare Tunnel the VM doesn't need a single open port.
- **No secrets in the repo:** `.env` is in `.gitignore`, and the Discord secret only lives in the
  Flarum database. `setup-forum.sh` replaces the default admin `flarum`/`flarum`.
- **Uploads:** images, `.zip`/`.7z` and `.txt` only, up to 20 MB, no SVG. fof/upload derives the
  stored file extension from the detected file type, not from the file name. So an uploaded
  `.php` file can't come about. Only logged-in members can download,
  because report zips can contain system details.
- **Security headers** via `flarum/extend.php`: `X-Frame-Options`, `Permissions-Policy` and
  `Strict-Transport-Security` with `https`. nginx already sets `nosniff`. Session cookies are
  `HttpOnly` and `SameSite=Lax`, and also `Secure` with `https`.
- **Spam:** New accounts only via Discord. On top of that come Flarum's flood protection, the
  Flags/Approval extensions for reporting and approving, and Suspend for temporary bans.

**Do it yourself (recommended):**

1. **Firewall:** With option (a), open ports 80 and 443 only to the
   [Cloudflare IPs](https://www.cloudflare.com/ips/), and allow SSH with a key only. Otherwise people can
   bypass Cloudflare and fake the visitor IP. With option (b), keep all inbound ports closed.
2. **Login throttling:** Flarum 1.8 doesn't slow down wrong passwords. In Cloudflare, under
   *Security → WAF → Rate limiting rules*, create a rule: URI path is `/login` or
   `/api/token`, method POST, more than 5 requests in 10 seconds → Block. This is included in the
   Free plan. It doesn't affect Discord logins.
3. **Admin accounts:** Long random password and a Discord account with 2FA turned on. Optionally, 2FA
   directly in Flarum with `docker compose exec flarum extension require ianm/twofactor`
   (version 1.2.x for Flarum 1.8, not tested by me). Then enable it under *Admin → Extensions*.
4. **Updates:** Subscribe to Flarum's security notices
   ([Security Advisories](https://github.com/flarum/framework/security/advisories)) and to new
   [crazymax/flarum releases](https://github.com/crazy-max/docker-flarum/releases), then
   update as described under [Update](#update). Keep Debian itself updated with `unattended-upgrades`.
5. **Backups** nightly, plus an encrypted copy on another machine (see [Backup](#backup)).
6. **Legal** (operator based in Germany): link an imprint (Impressum) and a privacy policy as pages.
   Mention the Discord login, Cloudflare and the uploads in them. The *GDPR* extension
   (enabled) gives users data export and account deletion.

## Tags & Permissions

| Tag | Read | Start topics | Notes |
|---|---|---|---|
| **Announcements** | everyone | mods/admins only | restricted tag, members can reply, pinned rules topic |
| **Help & Support** | everyone | members | **Best Answer**, post template with required info, uploads |
| **Share your FPS** | everyone | members | template for hardware, settings and FPS on a fixed test route, pinned guide; source of real numbers for the website's hardware check |
| **Suggestions** | everyone | members | |
| **Mods & Patches** | everyone | members | no game files (rules) |
| **Guides** | everyone | members | |
| **Off-topic** | everyone | members | anything that isn't about the port (slug `hunters-dream`) |

Role colors: Admin blood red `#8a1118`, Mod brass `#9c8458`. Allowed uploads: images, `.zip`/`.7z`
(report zips from the launcher) and `.txt` logs up to 20 MB. Only logged-in members can upload and download.

**By hand in the admin area** (if you don't use the script):

1. *Tags → Create Tag*: name, slug, color and icon as in `scripts/lib/setup-inside.sh`. Set the
   order by drag and drop.
2. *Permissions → Restrict by tag → Announcements*: View = Everyone, Start discussions = Mods,
   Reply = Members. Set the moderation permissions as in the global permissions.
3. *Best Answer* → enable it for the tag "Help & Support".
4. *Tags → Help & Support → Edit*: fill the **Template** field with the contents of `content/help-template.md`,
   and do the same for *Share your FPS* with `content/performance-template.md`.
5. *FoF Upload* → set MIME types and max size. *Permissions* → Upload = Members, Download = Members.

The template pre-fills the editor. Flarum can't technically enforce the required info.
The rules topic makes it mandatory, though, and mods can lock incomplete topics.

## Applying the theme

`setup-forum.sh` sets everything automatically. To do it by hand:

1. *Admin → Appearance*: dark mode on, Primary `#8a1118`, Secondary `#9c8458`.
2. *Edit Custom CSS*: paste the contents of `theme/custom.less` and save.
3. The fonts are self-hosted under `/assets/fonts/bb/`. The script copies them into the volume.
   Flarum blocks external imports in custom LESS, and this way no requests go to Google (GDPR).
4. **Logo and favicon:** *Admin → Appearance → Logo / Favicon* → upload `theme/logo.png` or
   `theme/favicon.png`. Flarum 1.x converts uploads to PNG, so SVG doesn't work.
   Your own logo: edit the SVG and export it as PNG, about 120 px tall.

Welcome banner: the text is in `content/welcome.html`; title and Discord link come from `.env`
(`DISCORD_INVITE_URL`). By hand: *Admin → Basics → Welcome Banner*.

**Icons and textures:** The categories use custom icons (bell, lamppost, candle, tools,
book, crescent moon) instead of Font Awesome; in the admin, the icon is set as e.g. `bbicon bbicon-bell`. More
icons: put an SVG (CC0/public domain only) in `media/icons/`, add it to `media/CREDITS.md` and
run `python3 media/build.py`. `setup-forum.sh` copies the fog, grain and the images
from `media/images/` (e.g. the welcome banner `forum-banner.webp`) to
`/assets/media/bb/`. New banner: replace the file with one of the same name and run the script again.

**Link to the website:** `setup-forum.sh` takes `WEBSITE_URL` and `DISCORD_INVITE_URL` from
`.env`. From these come the header links (Website, Install guide, FAQ, Discord; on
phones in the side menu) and the footer with Contact, Privacy and the contact address from `content/footer.html`
(*Admin → Appearance → Custom Footer*). If an address is empty or still a placeholder, the
matching links are simply left out. After changes to `flarum/forum.js`, run the script again; it rebuilds
the forum's JavaScript.

## Forum rules (short version)

Be respectful, **no piracy: no links to game files, firmware or keys, and no
asking for them either**, no malware, English only, right category, no spam. The setup publishes the full
text from `content/rules.md` as a pinned topic.

## Backup

```bash
scripts/backup.sh                    # → ./backups/db-<date>.sql.gz + flarum-data-<date>.tar.gz
```

Nightly via cron (`crontab -e`), kept for 14 days:

```cron
30 3 * * * cd /opt/bloodborne-forum && scripts/backup.sh /opt/backups/forum >/dev/null 2>&1 && find /opt/backups/forum -name '*.gz' -mtime +14 -delete
```

Also keep `.env`, and ideally a copy of the backups, on another machine.

**Restore** (with the stack running):

```bash
gunzip -c backups/db-XXXX.sql.gz | docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"'
docker compose exec -T flarum tar -C /data -xzf - < backups/flarum-data-XXXX.tar.gz
docker compose restart flarum
```

Alternatively, back up the raw volumes with the stack stopped:
`docker run --rm -v bloodborne-forum_db-data:/v -v "$PWD":/b alpine tar czf /b/db-volume.tgz -C /v .`
(same for `bloodborne-forum_flarum-data`).

## Automatic updates

Set this up once as root on the server:

```bash
scripts/install-auto-update.sh
```

After that, a systemd timer checks every 5 minutes whether the branch has new commits and applies them
(`scripts/auto-update.sh`): fast-forward only, forum setup only for forum changes, backup
and container restart only when the container configuration changes. If an update fails,
the code goes back to the previous state; the next attempt comes with the next commit or via
`scripts/auto-update.sh --force`. With `AUTO_UPDATE_DISCORD_WEBHOOK` in `.env`, every
update posts a message in a Discord channel.

```bash
journalctl -u bbforum-auto-update -n 100          # Log
systemctl start bbforum-auto-update               # check now
systemctl disable --now bbforum-auto-update.timer # turn off
```

## Discord roles in the forum

Anyone who logs in with Discord gets the same roles in the forum as on the Discord server, as groups with
the same name and color. Discord stays the source: if a role is added or removed,
the forum follows within 10 minutes at most. After a login it takes one minute at most.
Owner, Admin and Mod are also added to the group "Mod" and can moderate. The sync doesn't touch the Admin group
or mods appointed by hand. Code: `flarum/discord-roles.php`.

Only the team roles show as badges on posts: Owner, Admin, Contributor, Mod, Support and Helper
(`DISCORD_SHOWN_ROLE_IDS` in `.env`). All other groups are hidden. On Discord, weapon, GPU or
setup roles are only visible inside the server, but the forum is public. For permissions, e.g. a category only for
"Beta Hunter", you can use the hidden groups too. The sync sets "hidden" again on every run:
if you change it by hand in the admin, it only lasts until the next run.

**Names:** The forum shows the name someone uses on our Discord server, otherwise their
Discord display name (Nicknames extension, driver "nickname"). If they change it on Discord, the sync
follows; it can't be changed in the forum itself. The username stays for login, the profile URL and
@mentions.

**Avatars:** the server avatar, otherwise the Discord avatar, as a copy in the forum (visitors don't load anything from
Discord). If it changes on Discord, the sync follows. An avatar uploaded in the forum itself stays.

**Badges:** `flarum/forum.js` never shows hidden groups as badges, not even to admins and mods who
are allowed to see them. Flarum's own Admin and Mod badge is dropped when someone has a team role from Discord. A
post shows three badges at most (`theme/custom.less`).

**Bans and suspensions:**
- Anyone banned on the server is suspended in the forum within 10 minutes at most. If Discord lifts the ban,
  the sync lifts the suspension again.
- If a mod suspends someone in the forum, the bot bans them on the server right away too. When the suspension ends (lifted
  or expired), the bot lifts the ban within a minute. The user can then rejoin the server
  through an invite link.
- Both only apply to suspensions and bans that the sync set itself, and never to admins. The
  reason is in the server's audit log.

The data is read with the bot of the forum app in the Developer Portal. It only needs the **Ban Members** permission
(for the ban list and for banning) and no intents:

1. Developer Portal → app "Bloodborne PC Port Forum" → **Bot**: turn off "Public Bot", then
   **Reset Token** and copy the token.
2. On the server, put the token in `.env` at `DISCORD_BOT_TOKEN=` (never in the repo or in chats),
   then run `scripts/setup-forum.sh`.
3. Invite the bot with "Ban Members" only (`permissions=4`; inviting again changes the permissions of a bot
   that is already on the server):
   `https://discord.com/oauth2/authorize?client_id=<Client-ID>&scope=bot&permissions=4&guild_id=<Server-ID>`
4. Server Settings → Roles: drag the bot's role above the members' roles, but below the
   team roles. The bot can only ban people whose highest role is below its own.

Sync right away instead of waiting: `docker compose exec --user flarum flarum php /opt/flarum/flarum bbforum:discord-roles --all`

## Notifications in Discord

Three automatic notifications, each with its own webhook (in Discord: Server Settings →
Integrations → Webhooks → New Webhook → choose the channel → Copy Webhook URL). The URL is secret:
only enter it in the places listed, never in chats or the repo.

| Notification | Where to enter it | When |
|---|---|---|
| New version of the port (e.g. #announcements) | GitHub: Repo → Settings → Secrets and variables → Actions → New repository secret `DISCORD_RELEASES_WEBHOOK` | The website workflow checks for new releases every 2 hours, rebuilds the website and announces the version |
| Website or forum down (e.g. an admin channel) | GitHub secret `DISCORD_STATUS_WEBHOOK` | Once when it goes down, once when everything is back up (checked every 10 minutes) |
| New forum topics (e.g. #forum-feed) | Server: `FORUM_DISCORD_WEBHOOK` in `.env`, then `scripts/setup-forum.sh` | Right away, for every topic that guests can see |

There is also `AUTO_UPDATE_DISCORD_WEBHOOK` (see [Automatic updates](#automatic-updates)).
Without an entry, that notification is simply skipped; everything else still works. Note: GitHub pauses
scheduled workflows when a public repo gets no commits for 60 days (Actions → Workflow
→ "Enable workflow").

## Update

```bash
scripts/backup.sh
git pull                          # changes to theme and scripts
# New Flarum version: raise FLARUM_IMAGE_TAG in .env (e.g. 1.8.20)
docker compose pull
docker compose up -d --remove-orphans   # migrations run automatically on start
scripts/setup-forum.sh            # apply theme and settings again (optional)
```

- The extensions are listed in `flarum/extensions.txt`. On every start,
  `flarum/restore-extensions.sh` restores the list, and the image reinstalls them. For this the
  container needs internet access. Your own additions go in `flarum/extensions.local.txt`.
- MariaDB stays on 10.11 (LTS). Patch updates come via `docker compose pull`.
- If `docker-compose.yml` changes (e.g. new mounts), the change only takes effect with
  `docker compose up -d`; `git pull` alone isn't enough in that case.
- **Flarum 2.0:** Only switch once a 2.x image from crazymax is out and all extensions in use
  are available as stable releases for 2.x. Before that, test on a copy you restore from a backup.
  2.0 is a major update with its own migrations.

## Troubleshooting

- `docker compose logs -f flarum`; Flarum logs are in `/data/storage/logs`
  (`docker compose exec flarum ls /data/storage/logs`).
- On "Something went wrong", temporarily set `FLARUM_DEBUG: "true"` in `docker-compose.yml`.
- If icons or fonts are missing or logins fail, `FORUM_URL` doesn't match the address
  you opened.
- If Discord reports "Redirect URI mismatch", the redirect URL in the portal differs from
  `${FORUM_URL}/auth/discord`.
- `Pool overlaps with other one on this address space` on start: the fixed forum network
  `10.88.0.0/24` is already taken. Set `FORUM_SUBNET` in `.env` to a free network,
  e.g. `10.89.0.0/24`.
- "Flarum encountered a boot error" right after installing extensions: the PHP cache
  doesn't know the new files yet. Run `docker compose up -d --force-recreate flarum` and then
  `scripts/setup-forum.sh`. The current `install-extensions.sh` already does this itself.
- **Extensions "not installed"** after a restart or update: `docker compose up -d
  --force-recreate flarum`. On start, the list from `flarum/extensions.txt` is
  restored and reinstalled (takes 1–2 minutes). Then run `scripts/setup-forum.sh`.
  To restart the forum, use `docker compose up -d --force-recreate flarum` rather than
  `docker compose restart`.
- **"circular_dependencies"** when turning an extension on or off (in the admin or via
  `setup-forum.sh`): two extensions list each other as a dependency, and then
  Flarum 1.8 rejects every change. Known case: FoF SEO 3.x and FoF Sitemap; that's why `flarum/extensions.txt`
  pins SEO to 2.x. Run `scripts/install-extensions.sh` and then
  `scripts/setup-forum.sh`.
- **Extensions turn themselves off again after one or two minutes:** the old
  `cron` container is still running. It doesn't have the extensions, so Flarum removes them from the list of
  enabled extensions on every scheduler run. `docker compose up -d --remove-orphans`
  removes it; then run `scripts/setup-forum.sh`. The scheduler is now started by `flarum/scheduler.sh`
  inside the forum container.
- **Host with little RAM** (the kernel kills processes, visible with `dmesg -T | grep -i "killed process"`):
  set `FORUM_OOM_SCORE_ADJ=-500` in `.env` and run `docker compose up -d`. The kernel then kills
  other containers first instead of the forum and the database. If a container then fails to start with
  "Permission denied", set the value back to `0`.
