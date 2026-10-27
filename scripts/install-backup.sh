#!/usr/bin/env bash
# Sets up the nightly backup: a systemd timer runs scripts/nightly-backup.sh every night at 3:30 am
# (backup, verification, deleting old backups). Run once as root:
#
#   scripts/install-backup.sh
#
# View log:      journalctl -u bbforum-backup -n 50
# Run now:       systemctl start bbforum-backup
# Turn off:      systemctl disable --now bbforum-backup.timer
set -euo pipefail
cd "$(dirname "$0")/.."
dir=$(pwd)

[[ $EUID -eq 0 ]] || { echo "Bitte als root ausführen." >&2; exit 1; }
command -v systemctl >/dev/null || { echo "systemd fehlt auf diesem System." >&2; exit 1; }

cat > /etc/systemd/system/bbforum-backup.service <<UNIT
[Unit]
Description=Bloodborne-Forum: nächtliches Backup mit Prüfung
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=$dir
Environment=HOME=/root
ExecStart=$dir/scripts/nightly-backup.sh
TimeoutStartSec=2h
UNIT

cat > /etc/systemd/system/bbforum-backup.timer <<UNIT
[Unit]
Description=Bloodborne-Forum: Backup jede Nacht

[Timer]
OnCalendar=*-*-* 03:30
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now bbforum-backup.timer
echo "✓ Nächtliches Backup eingerichtet (3:30 Uhr)."
if crontab -l 2>/dev/null | grep -q 'scripts/backup.sh'; then
  echo "  Hinweis: In der crontab steht noch ein altes Backup (scripts/backup.sh). Mit 'crontab -e' entfernen,"
  echo "  sonst läuft das Backup doppelt."
fi
