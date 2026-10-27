# Message on the console and, if AUTO_UPDATE_DISCORD_WEBHOOK is set in .env, in Discord
# (admin channel). Sourced by auto-update.sh and nightly-backup.sh; the working directory is
# the repo (where .env lives).

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
