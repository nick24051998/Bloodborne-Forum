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
  # Der Admin heißt im Forum inzwischen anders (z. B. sein Discord-Name): Anmeldung über die Mail-Adresse
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
         v17development/flarum-seo fof/user-directory; do
  case "$e" in
    fof/user-directory) installed "$e" && enable_ext "$e" ;;  # optional
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
body=$(jq -n --rawfile less "$D/theme/custom.less" '{custom_less: $less}')
api POST /settings "$body" >/dev/null && ok "theme/custom.less applied"
ok "Discord-only sign-up: $([ $only_signup = 1 ] && echo on || echo off)"
footer=$(subst "$D/content/footer.html")
body=$(jq -n --arg site "$SITE_URL" --arg discord "$INVITE_URL" --arg footer "$footer" \
  '{"bbforum.website_url": $site, "bbforum.discord_url": $discord, custom_footer: $footer}')
api POST /settings "$body" >/dev/null && ok "header links and footer: website ${SITE_URL:-(not set)}, Discord ${INVITE_URL:-(not set)}"
# Neue Themen nach Discord (flarum/extend.php); die Adresse wird nicht ausgegeben, sie ist geheim
feed=${FORUM_DISCORD_WEBHOOK:-}
case "$feed" in
  "" | https://discord.com/api/webhooks/* | https://discordapp.com/api/webhooks/*) ;;
  *) warn "FORUM_DISCORD_WEBHOOK is not a Discord webhook URL, ignored"; feed="" ;;
esac
body=$(jq -n --arg w "$feed" '{"bbforum.discord_webhook": $w}')
api POST /settings "$body" >/dev/null && ok "new discussions to Discord: $([ -n "$feed" ] && echo on || echo off)"
# Discord-Rollen als Forum-Gruppen (flarum/discord-roles.php); das Bot-Token wird nicht ausgegeben
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
# Anzeigenamen kommen vom Discord-Server (flarum/discord-roles.php): Treiber „nickname“, Name nicht bei der
# Registrierung abfragen und nicht selbst änderbar, sonst überschreibt ihn der Abgleich ohnehin wieder
if installed flarum/nicknames; then
  api POST /settings '{"display_name_driver": "nickname", "flarum-nicknames.set_on_registration": "0",
    "flarum-nicknames.random_username": "0", "flarum-nicknames.unique": "0"}' >/dev/null &&
    api POST /permission '{"permission": "user.editOwnNickname", "groupIds": []}' >/dev/null &&
    ok "display names from the Discord server (nicknames)"
fi

# Mails: Der Treiber "mail" ruft "sendmail -bs" auf, das BusyBox im Container nicht kann. Flarum verschickt Mails
# direkt in der Anfrage, dann bricht z. B. eine Antwort mit Fehler ab, sobald jemand per Mail benachrichtigt wird.
# Ohne Mail-Dienst landen Mails darum nur im Log; einen im Admin eingetragenen Dienst (SMTP usw.) lassen wir stehen.
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

# --------------------------------------------------------------------------
log "Tags"
# slug|name|color|icon|description
TAGS='announcements|Announcements|#8a1118|bbicon bbicon-bell|News, releases and changelogs from the team. Only staff can start topics here.
known-fixes|Known Fixes|#4f6b55|bbicon bbicon-key|Solutions that worked, checked by a helper. Search here first. Only the team starts topics here.
help-support|Help & Support|#9c8458|bbicon bbicon-lamppost|Something doesn'"'"'t work for you: crash, error, setup, performance. Include port version, GPU + driver and your BB Report Tool zip.
bug-reports|Bug Reports|#7a2a2e|fas fa-bug|Confirmed bugs in the port and their status. Only the team starts topics here: report problems in Help & Support.
performance|Performance Reports|#475a6b|bbicon bbicon-droplet|Your frame rates with your hardware and settings. Use the form: real numbers help everyone choose settings.
suggestions|Suggestions|#6e6656|bbicon bbicon-candle|Ideas and feature requests for the port, the launcher, this forum or Discord.
mods-patches|Mods & Patches|#6b3a45|bbicon bbicon-tools|Share and discuss mods, patches and tweaks. No game files.
guides|Guides|#4c5d5a|bbicon bbicon-book|Tutorials and how-tos written by the community.
hunters-dream|The Hunter'"'"'s Dream|#57526e|bbicon bbicon-crescent|Off-topic. Rest a while, good hunter.'

# Zusatz-Tags (ohne Platz in der Reihenfolge). Themen: jeder darf sie setzen, damit man Hilfe, Bugs und Fixes
# nach Thema filtern kann. Status: setzt nur das Team (siehe Permissions), Ablauf eines Bugs oder Vorschlags.
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

if ! installed flarum/tags; then die "flarum/tags is missing"; fi
existing=$(api GET /tags)
printf '%s\n%s\n%s\n' "$TAGS" "$TOPIC_TAGS" "$STATUS_TAGS" | while IFS='|' read -r slug name color icon desc; do
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

# Alles, was hier fehlt, wird ein Zusatz-Tag (Flarum setzt bei der Reihenfolge die übrigen Plätze zurück)
order=$(for s in announcements known-fixes help-support bug-reports suggestions performance mods-patches guides hunters-dream; do tag_id "$s"; done |
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

# --------------------------------------------------------------------------
log "Help & Support: Best Answer + template"
if installed fof/best-answer; then
  api POST /settings "{\"fof-best-answer.enabled-tags\": \"[$help]\"}" >/dev/null && ok "Best Answer enabled for Help & Support"
fi
if installed fof/discussion-templates; then
  body=$(jq -n --rawfile t "$D/content/help-template.md" '{data: {template: $t}}')
  api PATCH "/tags/$help/template" "$body" >/dev/null && ok "post template for Help & Support"
  # Performance Reports: Hardware, Einstellungen und FPS auf einer festen Teststrecke (Grundlage für Schätzungen)
  body=$(jq -n --rawfile t "$D/content/performance-template.md" '{data: {template: $t}}')
  api PATCH "/tags/$(tag_id performance)/template" "$body" >/dev/null && ok "post template for Performance Reports"
  for t in known-fixes:known-fix bug-reports:bug suggestions:suggestion; do
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
  _did=$(api GET "/discussions?filter%5Btag%5D=$1&page%5Blimit%5D=50" |
    jq -r --arg t "$3" '[.data[] | select(.attributes.title == $t) | .id][0] // empty' 2>/dev/null || true)
  if [ -n "$_did" ]; then
    # Text aus dem Repo übernehmen, wenn er sich geändert hat
    # Den Text liefert nur /posts/ID (die Themen-Abfrage enthält ihn nicht)
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

printf '\n\033[1;32mDone.\033[0m Clear the browser cache once, then check %s\n' "$FLARUM_BASE_URL"
