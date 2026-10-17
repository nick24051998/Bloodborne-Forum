#!/usr/bin/env bash
# Installiert die benötigten Flarum-Erweiterungen per Composer im laufenden Container.
# Die Liste wird vom Image in /data/extensions/list gespeichert und bei jedem
# Container-Neustart automatisch wieder installiert.
#
#   scripts/install-extensions.sh                        # Pflicht-Erweiterungen
#   scripts/install-extensions.sh --with-user-directory  # + fof/user-directory
#
# Aktiviert werden sie anschließend von scripts/setup-forum.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

EXTENSIONS=(
  fof/oauth                # Login über Discord
  fof/upload               # Screenshots, Logs, BB-Report-Tool-Zips anhängen
  fof/best-answer          # Lösung markieren (Help & Support)
  fof/discussion-templates # Pflichtangaben-Vorlage für Help & Support
)

for arg in "$@"; do
  case "$arg" in
    --with-user-directory) EXTENSIONS+=(fof/user-directory) ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unbekannte Option: $arg" >&2; exit 1 ;;
  esac
done

if ! docker compose ps --status running --services 2>/dev/null | grep -qx flarum; then
  echo "Der Flarum-Container läuft nicht. Erst 'docker compose up -d' ausführen." >&2
  exit 1
fi

echo "Warte, bis Flarum bereit ist …"
for _ in $(seq 1 60); do
  if docker compose exec -T flarum curl -fsS -o /dev/null http://127.0.0.1:8000/api; then
    break
  fi
  sleep 2
done

echo "Installiere: ${EXTENSIONS[*]}"
docker compose exec -T flarum extension require "${EXTENSIONS[@]}"

echo
echo "Installiert. Persistente Liste:"
docker compose exec -T flarum extension list
echo
echo "Weiter mit: scripts/setup-forum.sh  (aktiviert und konfiguriert die Erweiterungen)"
