#!/usr/bin/env bash
# Richtet die automatische Aktualisierung ein: ein systemd-Timer startet alle 5 Minuten
# scripts/auto-update.sh (holt neue Commits und spielt sie ins Forum ein). Einmal als root:
#
#   scripts/install-auto-update.sh
#
# Log ansehen:   journalctl -u bbforum-auto-update -n 100
# Sofort laufen: systemctl start bbforum-auto-update
# Abschalten:    systemctl disable --now bbforum-auto-update.timer
set -euo pipefail
cd "$(dirname "$0")/.."
dir=$(pwd)

[[ $EUID -eq 0 ]] || { echo "Bitte als root ausführen." >&2; exit 1; }
command -v systemctl >/dev/null || { echo "systemd fehlt auf diesem System." >&2; exit 1; }
command -v flock >/dev/null || { echo "flock fehlt (Paket util-linux)." >&2; exit 1; }
git rev-parse '@{u}' >/dev/null 2>&1 || {
  echo "Der Branch hat keinen Upstream. Einmal setzen: git branch -u origin/main" >&2
  exit 1
}

cat > /etc/systemd/system/bbforum-auto-update.service <<EOF
[Unit]
Description=Bloodborne-Forum: neue Commits holen und einspielen
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$dir
Environment=HOME=/root
ExecStart=$(command -v flock) -n /run/bbforum-auto-update.lock $dir/scripts/auto-update.sh
TimeoutStartSec=30min
EOF

cat > /etc/systemd/system/bbforum-auto-update.timer <<EOF
[Unit]
Description=Bloodborne-Forum alle 5 Minuten aktualisieren

[Timer]
OnBootSec=3min
OnUnitActiveSec=5min
RandomizedDelaySec=30s

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now bbforum-auto-update.timer
echo "✓ Automatische Aktualisierung eingerichtet ($(git rev-parse --abbrev-ref '@{u}'), alle 5 Minuten)."
grep -qE '^AUTO_UPDATE_DISCORD_WEBHOOK=.+' .env 2>/dev/null \
  && echo "✓ Meldungen gehen an den Discord-Webhook aus .env." \
  || echo "  Tipp: AUTO_UPDATE_DISCORD_WEBHOOK in .env setzen, dann meldet jedes Update sich in Discord."
command -v curl >/dev/null || echo "  Hinweis: curl fehlt, Discord-Meldungen gehen erst nach 'apt install curl'."
