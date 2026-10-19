#!/usr/bin/env bash
# Nächtliches Backup (per systemd-Timer, einrichten mit scripts/install-backup.sh):
# scripts/backup.sh in BACKUP_DIR, danach prüfen, ob sich die Dateien lesen lassen, und Backups
# löschen, die älter als BACKUP_KEEP_DAYS sind. Fehler meldet es nach Discord
# (AUTO_UPDATE_DISCORD_WEBHOOK in .env), Erfolg nur einmal pro Woche (montags).
#
#   scripts/nightly-backup.sh
#
# Einstellungen in .env: BACKUP_DIR (Standard /opt/backups/bloodborne-forum), BACKUP_KEEP_DAYS (14).
# Wichtig: Ein Backup auf derselben Maschine schützt nicht vor deren Ausfall. Den Ordner zusätzlich
# auf einen anderen Rechner kopieren (siehe README, Backup).
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/notify.sh
source scripts/lib/notify.sh

setting() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'" || true; }
dest=$(setting BACKUP_DIR)
dest=${dest:-/opt/backups/bloodborne-forum}
keep=$(setting BACKUP_KEEP_DAYS)
keep=${keep:-14}

step="Backup"
trap 'notify "❌ Nächtliches Forum-Backup fehlgeschlagen bei: $step. Log: journalctl -u bbforum-backup -n 50"' ERR

scripts/backup.sh "$dest"

step="Prüfung"
db=$(ls -t "$dest"/db-*.sql.gz | head -1)
data=$(ls -t "$dest"/flarum-data-*.tar.gz | head -1)
gzip -t "$db"
# grep -q hört beim ersten Treffer auf; ohne pipefail zählt nur sein Ergebnis, nicht gzips SIGPIPE
(set +o pipefail; gzip -cd "$db" | grep -q 'CREATE TABLE')
tar -tzf "$data" >/dev/null

step="Aufräumen"
find "$dest" -maxdepth 1 -name '*.gz' -mtime +"$keep" -delete

size=$(du -sh "$dest" | cut -f1)
echo "✓ Backup geprüft: $(basename "$db"), $(basename "$data"); Ordner $dest: $size"
if [[ $(date +%u) == 1 ]]; then
  notify "✅ Forum-Backups laufen: letztes $(basename "$db" .sql.gz | sed 's/^db-//'), $(find "$dest" -maxdepth 1 -name 'db-*.sql.gz' | wc -l) Backups vorrätig, $size."
fi
