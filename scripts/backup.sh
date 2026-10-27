#!/usr/bin/env bash
# Backup: database dump + Flarum data volume (uploads, assets, extension list).
#   scripts/backup.sh [TARGET_DIR]   (default: ./backups)
# Clean up old backups yourself, e.g. via cron:
#   find /pfad/backups -name '*.gz' -mtime +14 -delete
set -euo pipefail
cd "$(dirname "$0")/.."

DEST=${1:-./backups}
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"

echo "▸ Datenbank-Dump"
docker compose exec -T db sh -c \
  'exec mariadb-dump --single-transaction --quick --routines --triggers -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' |
  gzip > "$DEST/db-$STAMP.sql.gz"

echo "▸ Flarum-Daten (/data)"
docker compose exec -T flarum tar -C /data -czf - --exclude=./extensions/.cache --exclude=./storage/cache . \
  > "$DEST/flarum-data-$STAMP.tar.gz"

ls -lh "$DEST"/*"$STAMP"*
