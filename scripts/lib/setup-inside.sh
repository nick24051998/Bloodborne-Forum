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
         flarum/approval flarum/suspend flarum/statistics flarum/gdpr \
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
help-support|Help & Support|#9c8458|bbicon bbicon-lamppost|Something broken? Include port version, GPU + driver, what happens and your BB Report Tool zip.
suggestions|Suggestions|#6e6656|bbicon bbicon-candle|Ideas and feature requests for the port.
mods-patches|Mods & Patches|#6b3a45|bbicon bbicon-tools|Share and discuss mods, patches and tweaks. No game files.
guides|Guides|#4c5d5a|bbicon bbicon-book|Tutorials and how-tos written by the community.
hunters-dream|The Hunter'"'"'s Dream|#57526e|bbicon bbicon-crescent|Off-topic. Rest a while, good hunter.'

if ! installed flarum/tags; then die "flarum/tags is missing"; fi
existing=$(api GET /tags)
echo "$TAGS" | while IFS='|' read -r slug name color icon desc; do
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

order=$(for s in announcements help-support suggestions mods-patches guides hunters-dream; do tag_id "$s"; done |
  jq -R . | jq -s 'map({id: ., children: []})')
api POST /tags/order "{\"order\": $order}" >/dev/null && ok "order set"

# --------------------------------------------------------------------------
log "Permissions"
ann=$(tag_id announcements)
help=$(tag_id help-support)
# Announcements: restricted tag. Copy all global discussion permissions to the
# tag, then let only moderators (group 4) start topics (admins always can).
api PATCH "/tags/$ann" "{\"data\":{\"type\":\"tags\",\"id\":\"$ann\",\"attributes\":{\"isRestricted\":true}}}" >/dev/null
sql "INSERT IGNORE INTO ${DB_PREFIX}group_permission (group_id, permission)
       SELECT group_id, CONCAT('tag${ann}.', permission) FROM ${DB_PREFIX}group_permission
       WHERE permission = 'viewForum' OR permission LIKE 'discussion.%';"
api POST /permission "{\"permission\": \"tag${ann}.startDiscussion\", \"groupIds\": [4]}" >/dev/null
ok "Announcements: everyone can read, members can reply, only staff (mods/admins) can start topics"

# --------------------------------------------------------------------------
log "Help & Support: Best Answer + template"
if installed fof/best-answer; then
  api POST /settings "{\"fof-best-answer.enabled-tags\": \"[$help]\"}" >/dev/null && ok "Best Answer enabled for Help & Support"
fi
if installed fof/discussion-templates; then
  body=$(jq -n --rawfile t "$D/content/help-template.md" '{data: {template: $t}}')
  api PATCH "/tags/$help/template" "$body" >/dev/null && ok "post template for Help & Support"
fi

# --------------------------------------------------------------------------
log "Group colours (role colours)"
api PATCH /groups/1 '{"data":{"type":"groups","id":"1","attributes":{"color":"#8a1118","icon":"fas fa-moon"}}}' >/dev/null && ok "Admin: blood red"
api PATCH /groups/4 '{"data":{"type":"groups","id":"4","attributes":{"color":"#9c8458","icon":"fas fa-shield-alt"}}}' >/dev/null && ok "Mod: brass"

# --------------------------------------------------------------------------
log "Rules topic"
if api GET "/discussions?filter%5Btag%5D=announcements&page%5Blimit%5D=50" |
  jq -e '.data[] | select(.attributes.title | startswith("Forum rules"))' >/dev/null 2>&1; then
  ok "already exists"
else
  rules=$(subst "$D/content/rules.md")
  body=$(jq -n --arg c "$rules" --arg t "$ann" \
    '{data: {type: "discussions", attributes: {title: "Forum rules & how to ask for help", content: $c},
      relationships: {tags: {data: [{type: "tags", id: $t}]}}}}')
  did=$(api POST /discussions "$body" | jq -r '.data.id')
  api PATCH "/discussions/$did" "{\"data\":{\"type\":\"discussions\",\"id\":\"$did\",\"attributes\":{\"isSticky\":true,\"isLocked\":true}}}" >/dev/null || true
  ok "created, pinned and locked"
fi

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
