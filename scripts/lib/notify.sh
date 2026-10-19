# Meldung auf der Konsole und, wenn AUTO_UPDATE_DISCORD_WEBHOOK in .env gesetzt ist, in Discord
# (Admin-Kanal). Wird von auto-update.sh und nightly-backup.sh eingebunden; Arbeitsverzeichnis ist
# das Repo (dort liegt .env).

webhook=$(grep -E '^AUTO_UPDATE_DISCORD_WEBHOOK=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'" || true)

json_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/}
  s=${s//$'\t'/ }
  printf '%s' "$s"
}

notify() {
  echo "$1"
  [[ -n $webhook ]] && command -v curl >/dev/null || return 0
  curl -fsS -m 10 -H 'Content-Type: application/json' \
    -d "{\"content\":\"$(json_escape "${1:0:1900}")\"}" "$webhook" >/dev/null || true
}
