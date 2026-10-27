#!/usr/bin/env bash
# Nightly backup (via systemd timer, set up with scripts/install-backup.sh):
# runs scripts/backup.sh into BACKUP_DIR, then checks that the files can be read, and deletes backups
# older than BACKUP_KEEP_DAYS. Failures are reported to Discord
# (AUTO_UPDATE_DISCORD_WEBHOOK in .env), success only once a week (Mondays).
#
#   scripts/nightly-backup.sh
#
# Settings in .env: BACKUP_DIR (default /opt/backups/bloodborne-forum), BACKUP_KEEP_DAYS (14).
# Important: a backup on the same machine does not protect against that machine failing. Also copy the
# folder to another computer (see README, Backup).
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
# grep -q stops at the first match; without pipefail only its result counts, not gzip's SIGPIPE
(set +o pipefail; gzip -cd "$db" | grep -q 'CREATE TABLE')
tar -tzf "$data" >/dev/null

step="Aufräumen"
find "$dest" -maxdepth 1 -name '*.gz' -mtime +"$keep" -delete

size=$(du -sh "$dest" | cut -f1)
echo "✓ Backup geprüft: $(basename "$db"), $(basename "$data"); Ordner $dest: $size"
if [[ $(date +%u) == 1 ]]; then
  notify "✅ Forum-Backups laufen: letztes $(basename "$db" .sql.gz | sed 's/^db-//'), $(find "$dest" -maxdepth 1 -name 'db-*.sql.gz' | wc -l) Backups vorrätig, $size."
fi
