#!/usr/bin/env bash
# Renews the forum admin's password (user 1) and writes it to .env, so that
# scripts/setup-forum.sh and the automatic updates can keep logging in.
# Logs the admin out everywhere. Shows the new password once: save it in the password manager right away.
#
#   scripts/rotate-admin-password.sh
#
# The password cannot be changed through the forum itself without leaving .env outdated; Flarum would
# also send an email for that.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo ".env fehlt" >&2; exit 1; }
grep -q '^FLARUM_ADMIN_PASS=' .env || { echo "FLARUM_ADMIN_PASS fehlt in .env" >&2; exit 1; }
docker compose ps --status running --services 2>/dev/null | grep -qx flarum || {
  echo "Der Flarum-Container läuft nicht." >&2
  exit 1
}

new=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 || true)

# In the container: password hash like Flarum (bcrypt), write it to the database, delete logins
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
