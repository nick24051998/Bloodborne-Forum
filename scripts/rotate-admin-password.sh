#!/usr/bin/env bash
# Erneuert das Passwort des Forum-Admins (Benutzer 1) und trägt es in .env ein, damit
# scripts/setup-forum.sh und die automatischen Updates sich weiter anmelden können.
# Meldet den Admin überall ab. Zeigt das neue Passwort einmal an: sofort im Passwort-Manager speichern.
#
#   scripts/rotate-admin-password.sh
#
# Über das Forum selbst lässt sich das Passwort nicht ändern, ohne dass .env veraltet; Flarum würde
# dafür außerdem eine E-Mail schicken.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo ".env fehlt" >&2; exit 1; }
grep -q '^FLARUM_ADMIN_PASS=' .env || { echo "FLARUM_ADMIN_PASS fehlt in .env" >&2; exit 1; }
docker compose ps --status running --services 2>/dev/null | grep -qx flarum || {
  echo "Der Flarum-Container läuft nicht." >&2
  exit 1
}

new=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 || true)

# Im Container: Passwort-Hash wie Flarum (bcrypt), in die Datenbank schreiben, Anmeldungen löschen
docker compose exec -T -e NEW_PASS="$new" flarum sh -s <<'INNER'
set -e
prefix=$(php -r '$c = include "/opt/flarum/config.php"; echo $c["database"]["prefix"];')
hash=$(php -r 'echo password_hash(getenv("NEW_PASS"), PASSWORD_BCRYPT);')
mariadb -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
  UPDATE ${prefix}users SET password = '$hash' WHERE id = 1;
  DELETE FROM ${prefix}access_tokens WHERE user_id = 1;"
INNER

cp -p .env .env.bak
sed -i "s|^FLARUM_ADMIN_PASS=.*|FLARUM_ADMIN_PASS=$new|" .env
rm -f .env.bak

echo "✓ Neues Admin-Passwort gesetzt und in .env eingetragen. Der Admin ist überall abgemeldet."
echo "  Benutzer: $(grep -E '^FLARUM_ADMIN_USER=' .env | cut -d= -f2-)"
echo "  Passwort: $new"
echo "  Jetzt im Passwort-Manager speichern; es wird nirgends sonst angezeigt."
