#!/usr/bin/env bash
# Installs the Flarum extensions from flarum/extensions.txt (+ optionally
# flarum/extensions.local.txt) via Composer in the running container.
#
#   scripts/install-extensions.sh                        # extensions from the list
#   scripts/install-extensions.sh --with-user-directory  # + fof/user-directory
#
# On every container start flarum/restore-extensions.sh restores the list,
# and the image reinstalls them. They are activated by scripts/setup-forum.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

for arg in "$@"; do
  case "$arg" in
    --with-user-directory)
      grep -qs '^fof/user-directory' flarum/extensions.local.txt ||
        echo 'fof/user-directory:*' >> flarum/extensions.local.txt
      ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "Unbekannte Option: $arg" >&2; exit 1 ;;
  esac
done

mapfile -t EXTENSIONS < <(cat flarum/extensions.txt flarum/extensions.local.txt 2>/dev/null |
  sed -e 's/#.*//' -e 's/[[:space:]]//g' | grep -v '^$' | awk -F: '!seen[$1]++')

if ! docker compose ps --status running --services 2>/dev/null | grep -qx flarum; then
  echo "Der Flarum-Container läuft nicht. Erst 'docker compose up -d' ausführen." >&2
  exit 1
fi

wait_for_flarum() {
  for _ in $(seq 1 120); do
    if docker compose exec -T flarum curl -fs -o /dev/null http://127.0.0.1:8000/api 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  echo "Flarum antwortet nicht – docker compose logs flarum" >&2
  return 1
}

echo "Warte, bis Flarum bereit ist …"
wait_for_flarum

echo "Installiere: ${EXTENSIONS[*]}"
docker compose exec -T flarum extension require "${EXTENSIONS[@]}"

# RECREATE instead of restart: PHP-FPM then loads the new files, and the image
# installs the list fresh. (A plain "restart" messes up the image's list.)
echo
echo "Erstelle den Flarum-Container neu, damit die Erweiterungen geladen werden …"
docker compose up -d --force-recreate flarum
wait_for_flarum

echo
echo "Installiert:"
docker compose exec -T flarum extension list
echo
echo "Weiter mit: scripts/setup-forum.sh  (aktiviert und konfiguriert die Erweiterungen)"
