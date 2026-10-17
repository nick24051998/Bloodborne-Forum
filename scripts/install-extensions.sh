#!/usr/bin/env bash
# Installiert die Flarum-Erweiterungen aus flarum/extensions.txt (+ optional
# flarum/extensions.local.txt) per Composer im laufenden Container.
#
#   scripts/install-extensions.sh                        # Erweiterungen aus der Liste
#   scripts/install-extensions.sh --with-user-directory  # + fof/user-directory
#
# Bei jedem Container-Start stellt flarum/restore-extensions.sh die Liste wieder her,
# und das Image installiert sie neu. Aktiviert werden sie von scripts/setup-forum.sh.
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

# Neu ERSTELLEN statt neu starten: PHP-FPM lädt dann die neuen Dateien, und das Image
# installiert die Liste frisch. (Ein reines "restart" bringt die Liste des Images durcheinander.)
echo
echo "Erstelle den Flarum-Container neu, damit die Erweiterungen geladen werden …"
docker compose up -d --force-recreate flarum
wait_for_flarum

echo
echo "Installiert:"
docker compose exec -T flarum extension list
echo
echo "Weiter mit: scripts/setup-forum.sh  (aktiviert und konfiguriert die Erweiterungen)"
