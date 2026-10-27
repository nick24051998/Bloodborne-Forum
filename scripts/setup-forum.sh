#!/usr/bin/env bash
# Sets up the forum after the first start (can be repeated any number of times):
#   - replaces the default admin flarum/flarum with the admin from .env
#   - activates the bundled + installed extensions
#   - theme (theme/custom.less), colors, dark mode, welcome banner, logo/favicon
#   - tags, ordering, permissions (Announcements staff only), Best Answer,
#     Help-&-Support template, upload rules, Discord login (Client ID)
#   - pinned rules topic
#
#   scripts/setup-forum.sh
#
# The API calls run inside the Flarum container (curl/jq are available there),
# the host only needs bash and docker compose.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo ".env fehlt: cp .env.example .env und Werte eintragen" >&2; exit 1; }

# Read .env (without executing it as shell code; values may contain spaces)
while IFS= read -r line || [[ -n $line ]]; do
  [[ $line =~ ^[[:space:]]*(#|$) ]] && continue
  key=${line%%=*}
  val=${line#*=}
  [[ $key =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
  val=${val%\"}; val=${val#\"}; val=${val%\'}; val=${val#\'}
  export "$key=$val"
done < .env

for v in FORUM_URL FLARUM_ADMIN_USER FLARUM_ADMIN_MAIL FLARUM_ADMIN_PASS DB_PASSWORD; do
  [[ -n ${!v:-} ]] || { echo "$v ist in .env nicht gesetzt" >&2; exit 1; }
  [[ ${!v} != *CHANGE_ME* ]] || { echo "$v enthält noch einen CHANGE_ME-Platzhalter" >&2; exit 1; }
done
if (( ${#FLARUM_ADMIN_PASS} < 8 )); then
  echo "FLARUM_ADMIN_PASS muss mindestens 8 Zeichen lang sein" >&2
  exit 1
fi

if ! docker compose ps --status running --services 2>/dev/null | grep -qx flarum; then
  echo "Der Flarum-Container läuft nicht. Erst 'docker compose up -d' ausführen." >&2
  exit 1
fi

# Copy repo files into the container
tar -cf - theme content media/textures media/images scripts/lib |
  docker compose exec -T flarum sh -c 'rm -rf /tmp/bbsetup && mkdir -p /tmp/bbsetup && tar -xf - -C /tmp/bbsetup'

status=0
docker compose exec -T \
  -e FORUM_TITLE="${FORUM_TITLE:-Bloodborne PC Port Community}" \
  -e FLARUM_ADMIN_USER="$FLARUM_ADMIN_USER" \
  -e FLARUM_ADMIN_MAIL="$FLARUM_ADMIN_MAIL" \
  -e FLARUM_ADMIN_PASS="$FLARUM_ADMIN_PASS" \
  -e DISCORD_CLIENT_ID="${DISCORD_CLIENT_ID:-}" \
  -e DISCORD_INVITE_URL="${DISCORD_INVITE_URL:-}" \
  -e WEBSITE_URL="${WEBSITE_URL:-}" \
  -e FORUM_DISCORD_WEBHOOK="${FORUM_DISCORD_WEBHOOK:-}" \
  -e DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN:-}" \
  -e DISCORD_GUILD_ID="${DISCORD_GUILD_ID:-1557458508096610446}" \
  -e DISCORD_MOD_ROLE_IDS="${DISCORD_MOD_ROLE_IDS:-}" \
  -e DISCORD_SHOWN_ROLE_IDS="${DISCORD_SHOWN_ROLE_IDS:-}" \
  -e DISCORD_BETA_ROLE_IDS="${DISCORD_BETA_ROLE_IDS:-}" \
  -e BETA_REPOS="${BETA_REPOS:-}" \
  -e CONTEST_SUBMIT_UNTIL="${CONTEST_SUBMIT_UNTIL:-}" \
  -e CONTEST_VOTE_UNTIL="${CONTEST_VOTE_UNTIL:-}"   -e FORUM_CONTEST_WEBHOOK="${FORUM_CONTEST_WEBHOOK:-}" \
  -e DISCORD_ONLY_SIGNUP="${DISCORD_ONLY_SIGNUP:-true}" \
  flarum sh /tmp/bbsetup/scripts/lib/setup-inside.sh || status=$?

docker compose exec -T flarum rm -rf /tmp/bbsetup
exit "$status"
