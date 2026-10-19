#!/usr/bin/env bash
# Holt neue Commits vom Upstream-Branch (in der Regel origin/main) und spielt sie ins Forum ein.
# Läuft per systemd-Timer alle 5 Minuten; einrichten mit scripts/install-auto-update.sh.
#
#   scripts/auto-update.sh           nur wenn es neue Commits gibt
#   scripts/auto-update.sh --force   Einrichtung auch ohne neue Commits erneut anwenden
#
# - Nur Fast-Forward: lokale Änderungen werden nie überschrieben. Geht das nicht, bricht es ab
#   und meldet sich.
# - Ändern sich nur Website oder Doku (website/, .github/, README und die .md-Dateien in media/),
#   ist im Forum nichts zu tun. content/*.md sind Forum-Inhalte und zählen nicht als Doku.
# - Ändert sich die Container-Konfiguration (docker-compose.yml, Erweiterungsliste, Start-Skripte),
#   macht es zuerst ein Backup (./backups) und erstellt den Container dann neu.
# - Meldung nach Discord, wenn AUTO_UPDATE_DISCORD_WEBHOOK in .env gesetzt ist (Webhook-URL eines
#   Kanals, z. B. eines Admin-Kanals).
# - Schlägt ein Update fehl, geht der Code auf den alten Stand zurück und das Skript versucht es erst
#   wieder, wenn ein neuer Commit kommt oder es mit --force gestartet wird (kein Fehler alle 5 Minuten).
# Log: journalctl -u bbforum-auto-update -n 100
set -euo pipefail
cd "$(dirname "$0")/.."

force=false
[[ ${1:-} == --force ]] && force=true

webhook=$(grep -E '^AUTO_UPDATE_DISCORD_WEBHOOK=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'" || true)

json_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/}
  s=${s//$'\t'/ }
  printf '%s' "$s"
}

notify() {
  echo "$1"
  [[ -n $webhook ]] && command -v curl >/dev/null || return 0
  curl -fsS -m 10 -H 'Content-Type: application/json' \
    -d "{\"content\":\"$(json_escape "${1:0:1900}")\"}" "$webhook" >/dev/null || true
}

failed_marker=.git/bbforum-auto-update-failed
step="Abruf von GitHub"
old=""
upstream=""

on_error() {
  trap - ERR
  # Zurück auf den alten Stand, damit der nächste Versuch das ganze Update wiederholt
  [[ -n $old ]] && git reset --quiet --keep "$old" || true
  [[ -n $upstream ]] && echo "$upstream" > "$failed_marker"
  notify "❌ Forum-Update fehlgeschlagen bei: $step. Log: journalctl -u bbforum-auto-update -n 100 · erneut versuchen: scripts/auto-update.sh --force"
  exit 1
}
trap on_error ERR

git fetch --quiet
old=$(git rev-parse HEAD)
upstream=$(git rev-parse '@{u}')

if [[ $old == "$upstream" ]] && ! $force; then
  exit 0
fi
if ! $force && [[ -f $failed_marker && $(cat "$failed_marker") == "$upstream" ]]; then
  echo "Letzter Versuch für $upstream ist fehlgeschlagen; erst wieder bei einem neuen Commit oder mit --force."
  exit 0
fi

if [[ $old != "$upstream" ]]; then
  step="Übernahme der neuen Commits"
  if ! git merge --ff-only --quiet '@{u}'; then
    trap - ERR
    echo "$upstream" > "$failed_marker"
    notify "⚠️ Forum-Update übersprungen: Die neuen Commits lassen sich nicht übernehmen (lokale Änderungen in $(pwd)?). Bitte von Hand prüfen, danach: scripts/auto-update.sh --force"
    exit 1
  fi
fi
new=$(git rev-parse HEAD)
changed=$(git diff --name-only "$old" "$new")

# Was muss passieren?
recreate_compose=false
recreate_flarum=false
grep -qx 'docker-compose.yml' <<<"$changed" && recreate_compose=true
grep -qE '^flarum/(extensions[^/]*\.txt|restore-extensions\.sh|scheduler\.sh|extend-loader\.php)$' <<<"$changed" && recreate_flarum=true
needs_setup=$force
grep -vE '^(website/|\.github/|[^/]*\.md$|media/[^/]*\.md$)' <<<"$changed" | grep -q . && needs_setup=true

if ! $needs_setup && ! $recreate_compose && ! $recreate_flarum; then
  rm -f "$failed_marker"
  echo "Nur Website/Doku geändert ($(git log --format=%h -1)), im Forum ist nichts zu tun."
  exit 0
fi

if $recreate_compose || $recreate_flarum; then
  step="Backup vor dem Neustart"
  scripts/backup.sh
  step="Neustart der Container"
  $recreate_compose && docker compose up -d --remove-orphans
  $recreate_flarum && docker compose up -d --force-recreate flarum
fi

step="Einrichtung (scripts/setup-forum.sh)"
scripts/setup-forum.sh

rm -f "$failed_marker"
summary=$(git log --format='• %s' "$old..$new" | head -n 10)
notify "✅ Forum aktualisiert auf $(git log --format=%h -1)${summary:+$'\n'$summary}"
