#!/bin/sh
# Runs INSIDE the Flarum container (curl, jq and the mariadb client are available).
# Started by scripts/setup-forum.sh, which copies the repo files to $D first.
# Idempotent: safe to run as often as you like.
set -eu

API=http://127.0.0.1:8000/api
D=/tmp/bbsetup
TOKEN=""

log()  { printf '\033[1;31m▸\033[0m %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# api METHOD PATH [JSON-BODY] -> response body on stdout; non-zero on HTTP >= 400
api() {
  _out=$(mktemp)
  if [ $# -ge 3 ]; then
    _code=$(printf '%s' "$3" | curl -sS -o "$_out" -w '%{http_code}' -X "$1" \
      -H "Authorization: Token $TOKEN" -H 'Content-Type: application/json' \
      --data-binary @- "$API$2")
  else
    _code=$(curl -sS -o "$_out" -w '%{http_code}' -X "$1" -H "Authorization: Token $TOKEN" "$API$2")
  fi
  if [ "$_code" -ge 500 ] && grep -q "boot error" "$_out"; then
    rm -f "$_out"
    die "Flarum cannot boot (usually right after installing extensions). Fix:
    docker compose up -d --force-recreate flarum && scripts/setup-forum.sh
  Details: docker compose exec flarum sh -c 'tail -n 40 /data/storage/logs/*.log'"
  fi
  if [ "$_code" -ge 400 ]; then
    warn "$1 $2 -> HTTP $_code: $(head -c 300 "$_out")"
    rm -f "$_out"
    return 1
  fi
  cat "$_out"
  rm -f "$_out"
}

login() { # login USER PASS -> sets TOKEN
  TOKEN=$(jq -n --arg u "$1" --arg p "$2" '{identification: $u, password: $p}' |
    curl -sS -X POST -H 'Content-Type: application/json' --data-binary @- "$API/token" |
    jq -r '.token // empty' 2>/dev/null || true)
  [ -n "$TOKEN" ]
}

sql() {
  mariadb -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "$1"
}

# Unset or placeholder addresses count as missing: their links are left out
case "${WEBSITE_URL:-}" in *example.com*) SITE_URL="" ;; *) SITE_URL=${WEBSITE_URL:-} ;; esac
SITE_URL=${SITE_URL%/}
case "${DISCORD_INVITE_URL:-}" in *CHANGE_ME*) INVITE_URL="" ;; *) INVITE_URL=${DISCORD_INVITE_URL:-} ;; esac

fill() { # fill NAME VALUE (stdin -> stdout); empty VALUE: Markdown links become text, other lines go
  if [ -n "$2" ]; then
    sed "s|{{$1}}|$2|g"
  else
    sed -e "s|\[\([^]]*\)\]({{$1}}[^)]*)|\1|g" -e "/{{$1}}/d"
  fi
}
subst() { # replace placeholders in a content file
  fill DISCORD_INVITE_URL "$INVITE_URL" <"$1" | fill WEBSITE_URL "$SITE_URL"
}

# --------------------------------------------------------------------------
log "Waiting for Flarum"
i=0
until curl -fsS -o /dev/null "$API"; do
  i=$((i + 1))
  [ $i -gt 150 ] && die "Flarum API not reachable (docker compose logs flarum)"
  sleep 2
done
ok "API reachable"
# Only now: a freshly created container writes config.php during its start
[ -f /opt/flarum/config.php ] || die "/opt/flarum/config.php is missing (docker compose logs flarum)"
DB_PREFIX=$(php -r '$c = include "/opt/flarum/config.php"; echo $c["database"]["prefix"];')

# --------------------------------------------------------------------------
log "Admin account"
if login "$FLARUM_ADMIN_USER" "$FLARUM_ADMIN_PASS"; then
  ok "logged in as $FLARUM_ADMIN_USER"
elif login "$FLARUM_ADMIN_MAIL" "$FLARUM_ADMIN_PASS"; then
  # The admin's name in the forum has changed since (e.g. to their Discord name): log in via the e-mail address
  ok "logged in with the admin e-mail (the username differs from FLARUM_ADMIN_USER)"
elif login flarum flarum; then
  # The image creates the root admin (id 1) as flarum/flarum. Flarum cannot delete
  # the root admin, and changing your own e-mail needs a confirmation mail. So a
  # temporary helper admin renames user 1 and sets the credentials from .env.
  warn "default admin flarum/flarum found, converting it to $FLARUM_ADMIN_USER"
  tmp_user="bbsetup$(tr -dc a-z0-9 </dev/urandom | head -c 8)"
  tmp_pass=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
  body=$(jq -n --arg u "$tmp_user" --arg p "$tmp_pass" \
    '{data: {type: "users", attributes: {username: $u, email: ($u + "@localhost.invalid"), password: $p, isEmailConfirmed: true}}}')
  tmp_id=$(api POST /users "$body" | jq -r '.data.id') || die "could not create helper admin"
  api PATCH "/users/$tmp_id" "{\"data\":{\"type\":\"users\",\"id\":\"$tmp_id\",\"relationships\":{\"groups\":{\"data\":[{\"type\":\"groups\",\"id\":\"1\"}]}}}}" >/dev/null
  login "$tmp_user" "$tmp_pass" || die "helper admin login failed"
  body=$(jq -n --arg u "$FLARUM_ADMIN_USER" --arg e "$FLARUM_ADMIN_MAIL" --arg p "$FLARUM_ADMIN_PASS" \
    '{data: {type: "users", id: "1", attributes: {username: $u, email: $e, password: $p, isEmailConfirmed: true}}}')
  if ! api PATCH /users/1 "$body" >/dev/null; then
    login flarum flarum && api DELETE "/users/$tmp_id" >/dev/null || true
    die "could not set the admin credentials (username 3-30 chars a-z 0-9 _ -, valid e-mail, password >= 8 chars)"
  fi
  login "$FLARUM_ADMIN_USER" "$FLARUM_ADMIN_PASS" || die "login as $FLARUM_ADMIN_USER failed"
  api DELETE "/users/$tmp_id" >/dev/null || warn "please delete the helper user $tmp_user manually"
  ok "admin is now $FLARUM_ADMIN_USER (flarum/flarum no longer works)"
else
  die "login failed: neither $FLARUM_ADMIN_USER (check .env) nor flarum/flarum works"
fi

# --------------------------------------------------------------------------
log "Enabling extensions"
installed() { [ -f "/opt/flarum/vendor/$1/composer.json" ]; }
enable_ext() { # enable_ext vendor/package
  # Flarum's extension id: vendor-package without a "flarum-ext-"/"flarum-" prefix
  _pkg=${1#*/}; _pkg=${_pkg#flarum-ext-}; _pkg=${_pkg#flarum-}
  _id="${1%%/*}-$_pkg"
  if ! installed "$1"; then
    warn "$1 is not installed (run scripts/install-extensions.sh first), skipping"
    return 0
  fi
  if sql "SELECT value FROM ${DB_PREFIX}settings WHERE \`key\`='extensions_enabled'" | grep -q "\"$_id\""; then
    ok "$_id (already enabled)"
    return 0
  fi
  _resp=$(printf '%s' '{"enabled": true}' | curl -sS -w '\n%{http_code}' -X PATCH \
    -H "Authorization: Token $TOKEN" -H 'Content-Type: application/json' --data-binary @- "$API/extensions/$_id")
  _code=$(printf '%s\n' "$_resp" | tail -n 1)
  if [ "$_code" -lt 400 ]; then
    ok "$_id"
  elif printf '%s' "$_resp" | grep -q circular_dependencies; then
    # e.g. FoF SEO 3.x <-> FoF Sitemap; flarum/extensions.txt pins versions without the cycle
    warn "$_id could not be enabled: circular dependency with another extension." \
         "Run scripts/install-extensions.sh (installs the versions from flarum/extensions.txt), then this script again"
  else
    warn "$_id could not be enabled: HTTP $_code $(printf '%s' "$_resp" | head -c 300)"
  fi
}
for e in flarum/lang-english flarum/markdown flarum/bbcode flarum/emoji flarum/mentions \
         flarum/likes flarum/tags flarum/sticky flarum/lock flarum/subscriptions flarum/flags \
         flarum/approval flarum/suspend flarum/statistics flarum/gdpr flarum/nicknames \
         fof/oauth fof/upload fof/best-answer fof/discussion-templates fof/sitemap \
         v17development/flarum-seo fof/user-directory fof/user-bio sycho/flarum-profile-cover; do
  case "$e" in
    fof/user-directory|fof/user-bio|sycho/flarum-profile-cover) installed "$e" && enable_ext "$e" ;;  # optional
    *) enable_ext "$e" ;;
  esac
done

# --------------------------------------------------------------------------
log "Settings, theme & welcome banner"
mkdir -p /data/assets/fonts/bb
cp "$D"/theme/fonts/*.woff2 /data/assets/fonts/bb/
chown -R flarum:flarum /data/assets/fonts/bb 2>/dev/null || true
ok "fonts copied to /assets/fonts/bb"
mkdir -p /data/assets/media/bb
cp "$D"/media/textures/* "$D"/media/images/* /data/assets/media/bb/
chown -R flarum:flarum /data/assets/media 2>/dev/null || true
ok "textures and images copied to /assets/media/bb"
only_signup=0
[ "${DISCORD_ONLY_SIGNUP:-true}" = "true" ] && only_signup=1
welcome=$(subst "$D/content/welcome.html")
body=$(jq -n \
  --arg title "$FORUM_TITLE" \
  --arg welcome "$welcome" \
  --arg only "$only_signup" \
  '{
    forum_title: $title,
    forum_description: "Community forum for the Bloodborne PC Port: help & support, mods, guides and suggestions.",
    welcome_title: "Welcome, good hunter",
    welcome_message: $welcome,
    theme_primary_color: "#8a1118",
    theme_secondary_color: "#9c8458",
    theme_dark_mode: "1",
    theme_colored_header: "0",
    allow_sign_up: "1",
    "bbforum.oauth_only_signup": $only
  }')
api POST /settings "$body" >/dev/null && ok "colours, dark mode, welcome banner"
# Flarum takes at most 65000 characters of custom LESS: the comment lines stay in the repo, the forum gets the rules
# (with comments the theme passed the limit on 29.10.2026 and the update was refused with HTTP 422)
less=$(sed -E '/^[[:space:]]*\/\//d' "$D/theme/custom.less")
[ ${#less} -gt 65000 ] && warn "theme/custom.less has ${#less} characters without comments, Flarum takes 65000"
body=$(jq -n --arg less "$less" '{custom_less: $less}')
api POST /settings "$body" >/dev/null && ok "theme/custom.less applied (${#less} characters)"
ok "Discord-only sign-up: $([ $only_signup = 1 ] && echo on || echo off)"
footer=$(subst "$D/content/footer.html")
body=$(jq -n --arg site "$SITE_URL" --arg discord "$INVITE_URL" --arg footer "$footer" \
  '{"bbforum.website_url": $site, "bbforum.discord_url": $discord, custom_footer: $footer}')
api POST /settings "$body" >/dev/null && ok "header links and footer: website ${SITE_URL:-(not set)}, Discord ${INVITE_URL:-(not set)}"
# New topics to Discord (flarum/extend.php); the address is not printed, it is secret
feed=${FORUM_DISCORD_WEBHOOK:-}
case "$feed" in
  "" | https://discord.com/api/webhooks/* | https://discordapp.com/api/webhooks/*) ;;
  *) warn "FORUM_DISCORD_WEBHOOK is not a Discord webhook URL, ignored"; feed="" ;;
esac
body=$(jq -n --arg w "$feed" '{"bbforum.discord_webhook": $w}')
api POST /settings "$body" >/dev/null && ok "new discussions to Discord: $([ -n "$feed" ] && echo on || echo off)"
# Discord roles as forum groups (flarum/discord-roles.php); the bot token is not printed
bot=${DISCORD_BOT_TOKEN:-}
case "$bot" in
  "" | *.*.*) ;;
  *) warn "DISCORD_BOT_TOKEN does not look like a bot token, ignored"; bot="" ;;
esac
guild=$(printf '%s' "${DISCORD_GUILD_ID:-}" | tr -cd '0-9')
modroles=$(printf '%s' "${DISCORD_MOD_ROLE_IDS:-}" | tr -cd '0-9,')
shownroles=$(printf '%s' "${DISCORD_SHOWN_ROLE_IDS:-}" | tr -cd '0-9,')
body=$(jq -n --arg t "$bot" --arg g "$guild" --arg m "$modroles" --arg s "$shownroles" \
  '{"bbforum.discord_bot_token": $t, "bbforum.discord_guild_id": $g, "bbforum.discord_mod_role_ids": $m, "bbforum.discord_shown_role_ids": $s}')
api POST /settings "$body" >/dev/null &&
  ok "Discord roles as forum groups: $([ -n "$bot" ] && [ -n "$guild" ] && echo "on (server $guild)" || echo off)"
# "My game account" (flarum/supermedo-account.php): key shared with SuperMedo Server, 64 characters, used as is.
# Empty = off (button hidden, /supermedo-account answers 404). The key is not printed.
smkey=${SUPERMEDO_ACCOUNT_KEY:-}
case "$smkey" in
  *[!A-Za-z0-9._~+/=-]*) warn "SUPERMEDO_ACCOUNT_KEY has characters that don't belong in it, ignored"; smkey="" ;;
esac
if [ -n "$smkey" ] && [ "${#smkey}" -ne 64 ]; then
  warn "SUPERMEDO_ACCOUNT_KEY is ${#smkey} characters long instead of 64, ignored"; smkey=""
fi
body=$(jq -n --arg k "$smkey" '{"bbforum.supermedo_account_key": $k}')
api POST /settings "$body" >/dev/null && ok "SuperMedo game account button: $([ -n "$smkey" ] && echo on || echo off)"
unset smkey
# Display names come from the Discord server (flarum/discord-roles.php): driver "nickname", don't ask for the name at
# registration and don't let users change it themselves, otherwise the sync overwrites it again anyway
if installed flarum/nicknames; then
  api POST /settings '{"display_name_driver": "nickname", "flarum-nicknames.set_on_registration": "0",
    "flarum-nicknames.random_username": "0", "flarum-nicknames.unique": "0"}' >/dev/null &&
    api POST /permission '{"permission": "user.editOwnNickname", "groupIds": []}' >/dev/null &&
    ok "display names from the Discord server (nicknames)"
fi

# Mail: the "mail" driver calls "sendmail -bs", which BusyBox in the container doesn't support. Flarum sends mail
# directly within the request, so e.g. posting a reply fails with an error as soon as someone is notified by mail.
# Without a mail service, mails only go to the log; a service entered in the admin panel (SMTP etc.) is left alone.
mail_driver=$(sql "SELECT value FROM ${DB_PREFIX}settings WHERE \`key\`='mail_driver'")
case "$mail_driver" in
  "" | mail | log)
    api POST /settings '{"mail_driver": "log"}' >/dev/null &&
      ok "mail: written to the forum log only (enter a mail service under Admin > Email to send real mail)" ;;
  *) ok "mail: sent via $mail_driver" ;;
esac

if installed fof/oauth; then
  if [ -n "${DISCORD_CLIENT_ID:-}" ]; then
    body=$(jq -n --arg id "$DISCORD_CLIENT_ID" '{"fof-oauth.discord": "1", "fof-oauth.discord.client_id": $id}')
    api POST /settings "$body" >/dev/null && ok "Discord login enabled (Client ID set; enter the secret in the admin panel)"
  else
    warn "DISCORD_CLIENT_ID is empty: set up the Discord login later in the admin panel"
  fi
fi

if installed fof/upload; then
  mimes='{"^image\\/(jpeg|png|gif|webp|avif|bmp)$":{"adapter":"local","template":"image-preview"},"^application\\/(zip|x-zip-compressed|x-7z-compressed)$":{"adapter":"local","template":"file"},"^text\\/plain$":{"adapter":"local","template":"file"}}'
  body=$(jq -n --arg m "$mimes" '{"fof-upload.mimeTypes": $m, "fof-upload.maxFileSize": "20480"}')
  api POST /settings "$body" >/dev/null && ok "uploads: images, zip/7z, txt logs (max. 20 MB)"
  api POST /permission '{"permission": "fof-upload.upload", "groupIds": [3]}' >/dev/null
  # Report zips can contain system details: only logged-in members may download
  api POST /permission '{"permission": "fof-upload.download", "groupIds": [3]}' >/dev/null && ok "upload + download: members only"
fi

# Profiles: everyone sees "About me", members write their own, mods correct other people's; own cover image for members
if installed fof/user-bio; then
  api POST /settings '{"fof-user-bio.maxLength": "300"}' >/dev/null
  api POST /permission '{"permission": "fof-user-bio.view", "groupIds": [2]}' >/dev/null
  api POST /permission '{"permission": "fof-user-bio.editOwn", "groupIds": [3]}' >/dev/null
  api POST /permission '{"permission": "fof-user-bio.editAny", "groupIds": [4]}' >/dev/null && ok "About me: everyone reads, members write their own"
fi
if installed sycho/flarum-profile-cover; then
  api POST /permission '{"permission": "setProfileCover", "groupIds": [3]}' >/dev/null && ok "profile cover: members"
  # 8 MB so animated banners fit (flarum/profiles.php keeps GIFs animated; the web server accepts up to UPLOAD_MAX_SIZE)
  api POST /settings '{"sycho-profile-cover.max_size": "8192"}' >/dev/null && ok "profile cover: up to 8 MB"
fi

# --------------------------------------------------------------------------
log "Tags"
# slug|name|color|icon|description
TAGS='announcements|Announcements|#8a1118|bbicon bbicon-bell|News, releases and changelogs from the team. Only staff can start topics here.
logo-contest|Logo Contest|#8a1118|bbicon bbicon-trophy|Design the new launcher logo. Post your logo here; vote on the contest page (forum.bbport.de/logo-contest).
known-fixes|Known Fixes|#4f6b55|bbicon bbicon-key|Solutions that worked, checked by a helper. Search here first. Only the team starts topics here.
help-support|Help & Support|#9c8458|bbicon bbicon-lantern|Something doesn'"'"'t work for you: crash, error, setup, performance. Include port version, GPU + driver and your BB Report Tool zip.
bug-reports|Bug Reports|#7a2a2e|bbicon bbicon-spider|Confirmed bugs in the port and their status. Only the team starts topics here: report problems in Help & Support.
performance|Performance Reports|#475a6b|bbicon bbicon-gauge|Your frame rates with your hardware and settings. Use the form: real numbers help everyone choose settings.
suggestions|Suggestions|#6e6656|bbicon bbicon-candle|Ideas and feature requests for the port, the launcher, this forum or Discord.
beta|Beta|#3b3448|bbicon bbicon-flask|Test builds before their release, for unlocked testers. Report what you find in the topic of the build.
mods-patches|Mods & Patches|#6b3a45|bbicon bbicon-anvil|Share and discuss mods, patches and tweaks. No game files.
guides|Guides|#4c5d5a|bbicon bbicon-book|Tutorials and how-tos written by the community.
hunters-dream|The Hunter'"'"'s Dream|#57526e|bbicon bbicon-moon|Off-topic. Rest a while, good hunter.'

# Additional tags (no slot in the ordering). Topics: anyone may set them, so that help, bugs and fixes
# can be filtered by topic. Status: only the team sets them (see Permissions), the lifecycle of a bug or suggestion.
TOPIC_TAGS='crash|Crash|#6b2f2f||Crashes, freezes, Device lost, the game closes.
graphics|Graphics|#4c5a6e||Wrong colours, flicker, stretched polygons, black screen.
fps|Performance|#475a6b||Low FPS, stutter, VRAM.
launcher|Launcher|#5a5070||The launcher, updates, settings.
online|Online & Co-op|#3f5f6b||Co-op, servers, sign-in.
setup|Setup & Install|#5e5a48||Installing, game files, first start.
controls|Controls & Input|#4f5f4a||Controller, keyboard and mouse, key mapping.
audio|Audio|#5b4e5e||Sound and music.
saves|Saves|#4e5560||Save files and backups.'
STATUS_TAGS='status-open|Open|#8a1118||Confirmed and not fixed yet.
status-in-progress|In progress|#9a6b1f||The developer is working on it.
status-fixed|Fixed|#3f6b4a||Fixed in a release. The topic says which version.
status-planned|Planned|#475a6b||Accepted idea, not built yet.
status-done|Done|#3f6b4a||The idea is in a release.
status-not-planned|Not planned|#4a4a4e||Won'"'"'t be done, the topic says why.
status-duplicate|Duplicate|#4a4a4e||Already covered by another topic, linked inside.'
# Status of a mod in Mods & Patches (Nick, 2026-10-28: a tested mod list). Set by the modding role and the mods,
# the topic names the port version and the date of the test.
MOD_STATUS_TAGS='status-works|Works|#3f6b4a||Tested: works with the port version named in the topic.
status-limits|Works with limits|#9a6b1f||Tested: works, with the limits the topic names.
status-broken|Doesn'"'"'t work|#6b2f2f||Tested: doesn'"'"'t work with the port, the topic says why.
status-retest|Retest|#475a6b||A new port version is out, the mod needs a new test.'

if ! installed flarum/tags; then die "flarum/tags is missing"; fi
existing=$(api GET /tags)
printf '%s\n%s\n%s\n%s\n' "$TAGS" "$TOPIC_TAGS" "$STATUS_TAGS" "$MOD_STATUS_TAGS" | while IFS='|' read -r slug name color icon desc; do
  [ -n "$slug" ] || continue
  attrs=$(jq -n --arg n "$name" --arg s "$slug" --arg c "$color" --arg i "$icon" --arg d "$desc" \
    '{name: $n, slug: $s, color: $c, icon: $i, description: $d, isHidden: false}')
  id=$(echo "$existing" | jq -r --arg s "$slug" '.data[] | select(.attributes.slug == $s) | .id')
  if [ -n "$id" ]; then
    api PATCH "/tags/$id" "{\"data\":{\"type\":\"tags\",\"id\":\"$id\",\"attributes\":$attrs}}" >/dev/null && ok "$name (updated)"
  else
    api POST /tags "{\"data\":{\"type\":\"tags\",\"attributes\":$attrs}}" >/dev/null && ok "$name (created)"
  fi
done

existing=$(api GET /tags)
tag_id() { echo "$existing" | jq -r --arg s "$1" '.data[] | select(.attributes.slug == $s) | .id'; }

# Remove Flarum's default "General" tag if it is still empty
gen=$(echo "$existing" | jq -r '.data[] | select(.attributes.slug == "general" and .attributes.discussionCount == 0) | .id')
[ -n "$gen" ] && api DELETE "/tags/$gen" >/dev/null && ok "empty default tag 'General' removed"

# Everything missing here becomes an additional tag (Flarum resets the remaining slots when the order is set)
order=$(for s in announcements logo-contest known-fixes help-support bug-reports suggestions beta performance mods-patches guides hunters-dream; do tag_id "$s"; done |
  jq -R . | jq -s 'map({id: ., children: []})')
api POST /tags/order "{\"order\": $order}" >/dev/null && ok "order set"

# --------------------------------------------------------------------------
log "Permissions"
ann=$(tag_id announcements)
help=$(tag_id help-support)
# team_only TAG-SLUG: restricted tag. Copy all global discussion permissions to the tag, then let only
# moderators (group 4; the Discord team gets it from discord-roles.php) start topics or add the tag (admins always can).
team_only() {
  _id=$(tag_id "$1")
  [ -n "$_id" ] || { warn "tag $1 missing"; return 0; }
  api PATCH "/tags/$_id" "{\"data\":{\"type\":\"tags\",\"id\":\"$_id\",\"attributes\":{\"isRestricted\":true}}}" >/dev/null
  sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission)
         SELECT group_id, CONCAT('tag${_id}.', permission) FROM ${DB_PREFIX}group_permission
         WHERE permission = 'viewForum' OR permission LIKE 'discussion.%';"
  api POST /permission "{\"permission\": \"tag${_id}.startDiscussion\", \"groupIds\": [4]}" >/dev/null
}
team_only announcements
ok "Announcements: everyone can read, members can reply, only staff (mods/admins) can start topics"
team_only known-fixes
team_only bug-reports
ok "Known Fixes, Bug Reports: everyone can read and reply, only the team starts topics (confirmed bugs are moved from Help & Support)"
echo "$STATUS_TAGS" | while IFS='|' read -r slug _rest; do team_only "$slug"; done
ok "status tags (Open, In progress, Fixed, Planned, Done, Not planned, Duplicate): only the team sets them"

# Helpers (Discord "Messenger · Helper"; the group is created by the role sync, bbforum.discord_role_groups) work
# like the team: edit posts, change titles and tags, lock and unlock topics, set the best answer, set the status
# of suggestions and bugs, create Known Fixes and bugs (Nick, 2026-10-26). Hiding, deleting and pinning stay
# with the mods. Mods and helpers may exceed the limit of 3 additional tags (the status counts too), and mods now also
# set the best answer. In areas with restricted tags only per-tag permissions apply, so those are set too. Add only.
HELPER_ROLE=1559561716642222122
helper=$(sql "SELECT JSON_UNQUOTE(JSON_EXTRACT(value, '\$.\"$HELPER_ROLE\"')) FROM ${DB_PREFIX}settings WHERE \`key\` = 'bbforum.discord_role_groups';" 2>/dev/null)
case "$helper" in ''|NULL|*[!0-9]*) helper= ;; esac
for g in 4 $helper; do
  sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission)
         VALUES ($g, 'discussion.selectBestAnswerNotOwnDiscussion'), ($g, 'bypassTagCounts');"
done
if [ -n "$helper" ]; then
  for p in editPosts rename tag lock; do
    sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission) VALUES ($helper, 'discussion.$p');"
  done
  for slug in known-fixes bug-reports $(echo "$STATUS_TAGS" | cut -d'|' -f1); do
    _id=$(tag_id "$slug")
    [ -n "$_id" ] || continue
    for p in discussion.editPosts discussion.rename discussion.tag discussion.lock startDiscussion; do
      sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission) VALUES ($helper, 'tag${_id}.$p');"
    done
  done
  ok "helpers: edit posts, titles, tags, lock/unlock, best answer, status, Known Fixes and bugs"
else
  warn "helper group not mirrored yet (Discord role sync), helper permissions skipped"
fi

# Modding (Discord "Blood Gem Smith · Modding", Nick 2026-10-28: someone who looks after the modding people without
# too many rights): in Mods & Patches only, edit posts, titles and tags, lock, pin, hide topics and posts, approve
# posts, see reports there and set the best answer. Nothing outside that area, no deleting, no suspending.
# For per-tag rights the tag must be restricted: first everyone keeps what they have (global rights copied to the tag,
# starting topics included), then the modding group gets its rights. Add only.
MODDING_ROLE=1564921489713537055
modding=$(sql "SELECT JSON_UNQUOTE(JSON_EXTRACT(value, '\$.\"$MODDING_ROLE\"')) FROM ${DB_PREFIX}settings WHERE \`key\` = 'bbforum.discord_role_groups';" 2>/dev/null)
case "$modding" in ''|NULL|*[!0-9]*) modding= ;; esac
mods=$(tag_id mods-patches)
if [ -n "$mods" ] && [ -n "$modding" ]; then
  api PATCH "/tags/$mods" "{\"data\":{\"type\":\"tags\",\"id\":\"$mods\",\"attributes\":{\"isRestricted\":true}}}" >/dev/null
  sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission)
         SELECT group_id, CONCAT('tag${mods}.', permission) FROM ${DB_PREFIX}group_permission
         WHERE permission IN ('viewForum', 'startDiscussion') OR permission LIKE 'discussion.%';"
  for p in viewForum startDiscussion discussion.editPosts discussion.rename discussion.tag discussion.lock \
           discussion.sticky discussion.hide discussion.hidePosts discussion.approvePosts discussion.viewFlags \
           discussion.selectBestAnswerNotOwnDiscussion; do
    sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission) VALUES ($modding, 'tag${mods}.$p');"
  done
  ok "modding: Mods & Patches moderated by the modding role (edit, titles, tags, lock, pin, hide, approve, reports)"
  # The mod status (Works, Works with limits, Doesn't work, Retest): only the modding role and the mods set it.
  # The tags are restricted like the other status tags, so the modding role needs its rights there too.
  echo "$MOD_STATUS_TAGS" | while IFS='|' read -r slug _rest; do
    team_only "$slug"
    _id=$(tag_id "$slug")
    [ -n "$_id" ] || continue
    for p in startDiscussion discussion.editPosts discussion.rename discussion.tag discussion.lock discussion.sticky \
             discussion.hide discussion.hidePosts discussion.approvePosts discussion.viewFlags \
             discussion.selectBestAnswerNotOwnDiscussion; do
      sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission) VALUES ($modding, 'tag${_id}.$p');"
    done
  done
  ok "mod status (Works, Works with limits, Doesn't work, Retest): only the modding role and the mods set it"
else
  warn "Mods & Patches or the modding group missing (Discord role sync), modding permissions skipped"
fi

# --------------------------------------------------------------------------
log "Logo contest"
# Dates for the /logo-contest page and the rules in flarum/contest.php (submission deadline, end of voting, UTC)
csub=${CONTEST_SUBMIT_UNTIL:-2026-11-08T23:59:59Z}
cvote=${CONTEST_VOTE_UNTIL:-2026-11-15T23:59:59Z}
body=$(jq -n --arg s "$csub" --arg v "$cvote" '{"bbforum.contest_submit_until": $s, "bbforum.contest_vote_until": $v}')
api POST /settings "$body" >/dev/null && ok "logo contest: entries until $csub, voting until $cvote"
# Entries as cards in a Discord channel (view only): webhook of that channel in FORUM_CONTEST_WEBHOOK
cfeed=${FORUM_CONTEST_WEBHOOK:-}
case "$cfeed" in
  "" | https://discord.com/api/webhooks/* | https://discordapp.com/api/webhooks/*) ;;
  *) warn "FORUM_CONTEST_WEBHOOK is not a Discord webhook URL, ignored"; cfeed="" ;;
esac
body=$(jq -n --arg w "$cfeed" '{"bbforum.contest_webhook": $w}')
api POST /settings "$body" >/dev/null && ok "logo contest entries to Discord: $([ -n "$cfeed" ] && echo on || echo off)"

# --------------------------------------------------------------------------
log "Beta: only for unlocked testers"
# Unlocked are those who have the Discord role "Beta Hunter" or "Test Subject" (the role sync creates a hidden group
# for each role) or who are in the forum group "Beta Testers" (Admin → Users → Groups).
# In the Beta area these groups have normal member permissions, the team (mod) its usual ones; nobody else sees it.
# New test builds are posted by flarum/betas.php (bbforum:betas, every 10 minutes) from the repos in BETA_REPOS.
bt=$(api GET /groups | jq -r '[.data[] | select(.attributes.nameSingular == "Beta Tester") | .id][0] // empty')
if [ -z "$bt" ]; then
  bt=$(api POST /groups '{"data":{"type":"groups","attributes":{"nameSingular":"Beta Tester","namePlural":"Beta Testers","color":"#57526e","icon":"fas fa-flask","isHidden":true}}}' | jq -r '.data.id')
  ok "group Beta Testers created"
fi
betaroles=$(printf '%s' "${DISCORD_BETA_ROLE_IDS:-1561121310837440552,1561067527507943506}" | tr -cd '0-9,')
rolemap=$(sql "SELECT value FROM ${DB_PREFIX}settings WHERE \`key\`='bbforum.discord_role_groups'")
[ -n "$rolemap" ] || rolemap='{}'
rolegroups=$(printf '%s' "$rolemap" | jq -r --arg r "$betaroles" '. as $m | $r | split(",") | map($m[.] // empty | tostring) | join(",")')
allowed=$(printf '%s,%s' "$bt" "$rolegroups" | tr -s ',' | sed 's/^,//; s/,$//')
beta=$(tag_id beta)
if [ -n "$beta" ] && [ -n "$bt" ]; then
  api PATCH "/tags/$beta" "{\"data\":{\"type\":\"tags\",\"id\":\"$beta\",\"attributes\":{\"isRestricted\":true}}}" >/dev/null
  sql "DELETE FROM ${DB_PREFIX}group_permission WHERE permission LIKE 'tag${beta}.%' AND group_id NOT IN (4, $allowed);
       INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission)
         SELECT g.id, CONCAT('tag${beta}.', p.permission) FROM ${DB_PREFIX}group_permission p
         JOIN ${DB_PREFIX}groups g ON g.id IN ($allowed)
         WHERE p.group_id = 3 AND (p.permission = 'startDiscussion' OR p.permission LIKE 'discussion.%');
       INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission)
         SELECT 4, CONCAT('tag${beta}.', permission) FROM ${DB_PREFIX}group_permission
         WHERE group_id = 4 AND permission LIKE 'discussion.%';
       INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission)
         SELECT id, 'tag${beta}.viewForum' FROM ${DB_PREFIX}groups WHERE id IN (4, $allowed);
       INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission) VALUES (4, 'tag${beta}.startDiscussion');"
  repos=$(printf '%s' "${BETA_REPOS:-nick24051998/bloodborne_pc}" | tr -cd 'A-Za-z0-9_.,/-')
  body=$(jq -n --arg r "$repos" --arg g "$allowed" '{"bbforum.beta_repos": $r, "bbforum.beta_group_ids": $g}')
  api POST /settings "$body" >/dev/null &&
    ok "Beta: visible to groups $allowed and the team; new test builds from $repos are posted every 10 minutes"
else
  warn "Beta: tag or group missing, skipped"
fi

# --------------------------------------------------------------------------
log "Help & Support: Best Answer + template"
if installed fof/best-answer; then
  api POST /settings "{\"fof-best-answer.enabled-tags\": \"[$help]\"}" >/dev/null && ok "Best Answer enabled for Help & Support"
fi
if installed fof/discussion-templates; then
  body=$(jq -n --rawfile t "$D/content/help-template.md" '{data: {template: $t}}')
  api PATCH "/tags/$help/template" "$body" >/dev/null && ok "post template for Help & Support"
  # Performance Reports: hardware, settings and FPS on a fixed test route (basis for estimates)
  body=$(jq -n --rawfile t "$D/content/performance-template.md" '{data: {template: $t}}')
  api PATCH "/tags/$(tag_id performance)/template" "$body" >/dev/null && ok "post template for Performance Reports"
  for t in known-fixes:known-fix bug-reports:bug suggestions:suggestion beta:beta logo-contest:logo-entry mods-patches:mod; do
    body=$(jq -n --rawfile t "$D/content/${t#*:}-template.md" '{data: {template: $t}}')
    api PATCH "/tags/$(tag_id "${t%%:*}")/template" "$body" >/dev/null && ok "post template for ${t%%:*}"
  done
fi

# --------------------------------------------------------------------------
log "Group colours (role colours)"
api PATCH /groups/1 '{"data":{"type":"groups","id":"1","attributes":{"color":"#8a1118","icon":"fas fa-moon"}}}' >/dev/null && ok "Admin: blood red"
api PATCH /groups/4 '{"data":{"type":"groups","id":"4","attributes":{"color":"#9c8458","icon":"fas fa-shield-alt"}}}' >/dev/null && ok "Mod: brass"

# --------------------------------------------------------------------------
log "Pinned topics"
pinned_topic() { # pinned_topic TAG-SLUG TAG-ID TITLE CONTENT-FILE: creates the topic once, pinned and locked
  _content=$(subst "$4")
  # Never create or overwrite anything without text (e.g. if a second run has already cleaned up /tmp/bbsetup)
  [ -n "$_content" ] || { warn "$3: $4 missing or empty, skipped"; return 0; }
  _did=$(api GET "/discussions?filter%5Btag%5D=$1&page%5Blimit%5D=50" |
    jq -r --arg t "$3" '[.data[] | select(.attributes.title == $t) | .id][0] // empty' 2>/dev/null || true)
  if [ -n "$_did" ]; then
    # Take over the text from the repo if it has changed
    # Only /posts/ID returns the text (the topic query does not include it)
    _pid=$(api GET "/discussions/$_did?include=firstPost" | jq -r '[.included[]? | select(.type == "posts") | .id][0] // empty')
    if [ -n "$_pid" ] && [ "$(api GET "/posts/$_pid" | jq -r '.data.attributes.content // empty')" != "$_content" ]; then
      _body=$(jq -n --arg c "$_content" --arg id "$_pid" '{data: {type: "posts", id: $id, attributes: {content: $c}}}')
      api PATCH "/posts/$_pid" "$_body" >/dev/null && ok "$3 (text updated)"
    else
      ok "$3 (already exists)"
    fi
    return 0
  fi
  _body=$(jq -n --arg c "$_content" --arg t "$2" --arg title "$3" \
    '{data: {type: "discussions", attributes: {title: $title, content: $c},
      relationships: {tags: {data: [{type: "tags", id: $t}]}}}}')
  _did=$(api POST /discussions "$_body" | jq -r '.data.id')
  api PATCH "/discussions/$_did" "{\"data\":{\"type\":\"discussions\",\"id\":\"$_did\",\"attributes\":{\"isSticky\":true,\"isLocked\":true}}}" >/dev/null || true
  ok "$3 (created, pinned and locked)"
}
pinned_topic announcements "$ann" "Forum rules & how to ask for help" "$D/content/rules.md"
pinned_topic guides "$(tag_id guides)" "Install guide & system requirements" "$D/content/install-topic.md"
pinned_topic guides "$(tag_id guides)" "Best settings & first start, with pictures" "$D/content/best-settings-topic.md"
[ -n "$(tag_id beta)" ] && pinned_topic beta "$(tag_id beta)" "How the beta works" "$D/content/beta-topic.md"
[ -n "$(tag_id logo-contest)" ] && pinned_topic logo-contest "$(tag_id logo-contest)" "Logo contest: rules and how to enter" "$D/content/logo-contest-topic.md"
pinned_topic help-support "$help" "Read first: common fixes before you post" "$D/content/help-first-topic.md"
pinned_topic performance "$(tag_id performance)" "How to post a performance report" "$D/content/performance-topic.md"

# --------------------------------------------------------------------------
log "Logo & favicon"
for kind in logo favicon; do
  if [ -f "$D/theme/$kind.png" ]; then
    if curl -fsS -o /dev/null -X POST -H "Authorization: Token $TOKEN" -F "$kind=@$D/theme/$kind.png" "$API/$kind"; then
      ok "$kind.png uploaded"
    else
      warn "$kind upload failed (upload it manually: Admin → Appearance)"
    fi
  fi
done

# Rebuild the forum JavaScript (flarum/forum.js) and stylesheets
gosu flarum:flarum php /opt/flarum/flarum cache:clear >/dev/null && ok "forum assets rebuilt"
# Trigger a rebuild right away via a page request (translations, JS, CSS) and check that the translations are included
curl -fsS -o /dev/null http://127.0.0.1:8000/ || warn "forum page did not load after the rebuild"
if [ "$(cat /data/assets/forum-*.js 2>/dev/null | wc -c)" -gt 5000 ]; then
  ok "forum translations loaded"
else
  warn "forum translations are empty (texts like core.forum.…). Fix: php flarum cache:clear, then open the forum"
fi

printf '\n\033[1;32mDone.\033[0m Clear the browser cache once, then check %s\n' "$FLARUM_BASE_URL"
