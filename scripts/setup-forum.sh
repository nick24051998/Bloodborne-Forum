#!/usr/bin/env bash
# Richtet das Forum nach dem ersten Start ein (beliebig oft wiederholbar):
#   - ersetzt den Standard-Admin flarum/flarum durch den Admin aus .env
#   - aktiviert die gebündelten + installierten Erweiterungen
#   - Theme (theme/custom.less), Farben, Dark Mode, Welcome-Banner, Logo/Favicon
#   - Tags, Reihenfolge, Rechte (Announcements nur Staff), Best Answer,
#     Help-&-Support-Vorlage, Upload-Regeln, Discord-Login (Client ID)
#   - angepinntes Regel-Thema
#
#   scripts/setup-forum.sh
#
# Die API-Aufrufe laufen im Flarum-Container (curl/jq sind dort vorhanden),
# auf dem Host werden nur bash und docker compose gebraucht.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo ".env fehlt: cp .env.example .env und Werte eintragen" >&2; exit 1; }

# .env einlesen (ohne sie als Shell-Code auszuführen; Werte dürfen Leerzeichen enthalten)
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

# Repo-Dateien in den Container kopieren
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
  -e DISCORD_ONLY_SIGNUP="${DISCORD_ONLY_SIGNUP:-true}" \
  flarum sh /tmp/bbsetup/scripts/lib/setup-inside.sh || status=$?

docker compose exec -T flarum rm -rf /tmp/bbsetup
exit "$status"
