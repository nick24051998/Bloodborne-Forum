#!/usr/bin/env bash
# Checks whether the website and forum respond (for .github/workflows/uptime.yml, every 10 minutes).
# Reports to Discord only on changes: once when something goes down, and once when everything is up again.
# It remembers the last state (up/down) in STATE_FILE, which the workflow keeps in the Actions cache.
#
#   WEBSITE_URL, FORUM_URL    addresses to check (forum: its /api must return JSON)
#   DISCORD_STATUS_WEBHOOK    webhook URL of a Discord channel (empty: no message)
#   STATE_FILE                file holding the last state (default .uptime-state)
#   RETRY_DELAY               seconds between the three attempts (default 20)
#
# If Cloudflare answers with a bot check (header cf-mitigated), that does not count as an outage: the run
# then only shows a warning (exempt /api or the home page from the check in Cloudflare).
set -uo pipefail

STATE_FILE=${STATE_FILE:-.uptime-state}
UA="BBPort-Uptime/1.0 (+https://github.com/${GITHUB_REPOSITORY:-})"
down=()
blocked=()

check() { # check NAME URL TEXT – reachable = HTTP 200 and TEXT appears in the response
  local name=$1 url=$2 must=$3 code body headers attempt
  body=$(mktemp)
  headers=$(mktemp)
  for attempt in 1 2 3; do
    code=$(curl -sS -o "$body" -D "$headers" -w '%{http_code}' --max-time 20 -A "$UA" "$url" 2>/dev/null) || code=${code:-000}
    if [ "$code" = 200 ] && grep -q -- "$must" "$body"; then
      echo "✓ $name ($url)"
      rm -f "$body" "$headers"
      return 0
    fi
    if grep -qi '^cf-mitigated:' "$headers"; then
      echo "? $name ($url): Cloudflare-Prüfung statt Antwort"
      blocked+=("$name")
      rm -f "$body" "$headers"
      return 0
    fi
    [ "$attempt" -lt 3 ] && sleep "${RETRY_DELAY:-20}"
  done
  [ "$code" = 000 ] && code="no connection"
  [ "$code" = 200 ] && code="200, but unexpected content"
  echo "✗ $name ($url): $code"
  down+=("$name ($url): $code")
  rm -f "$body" "$headers"
}

send() { # send TEXT – to Discord, if a webhook is set
  if [ -z "${DISCORD_STATUS_WEBHOOK:-}" ]; then
    echo "(DISCORD_STATUS_WEBHOOK nicht gesetzt, keine Meldung)"
    return 0
  fi
  jq -n --arg c "$1" '{username: "Bloodborne PC Port status", allowed_mentions: {parse: []}, content: $c}' |
    curl -sS -f -o /dev/null -H 'Content-Type: application/json' -d @- "$DISCORD_STATUS_WEBHOOK" ||
    echo "::warning::Discord-Meldung fehlgeschlagen"
}

check "Website" "${WEBSITE_URL:?WEBSITE_URL fehlt}" "Bloodborne"
check "Forum" "${FORUM_URL%/}/api" '"data"'

previous=$(cat "$STATE_FILE" 2>/dev/null || echo unknown)
if [ ${#down[@]} -gt 0 ]; then now=down; else now=up; fi
run="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"

if [ "$now" = down ] && [ "$previous" != down ]; then
  send "$(printf '🔴 **Not reachable**\n%s\nChecked from GitHub, three tries 20 s apart: %s' "$(printf -- '- %s\n' "${down[@]}")" "$run")"
elif [ "$now" = up ] && [ "$previous" = down ]; then
  send "🟢 **Back up:** website and forum respond again."
fi
for name in ${blocked[@]+"${blocked[@]}"}; do
  echo "::warning::$name: Cloudflare zeigt GitHub eine Bot-Prüfung; der Wächter sieht nicht, ob es läuft."
done
[ "$now" = down ] && echo "::error::Nicht erreichbar: ${down[*]}"

echo "$now" >"$STATE_FILE"
echo "Zustand: $previous → $now"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "changed=$([ "$now" != "$previous" ] && echo true || echo false)" >>"$GITHUB_OUTPUT"
fi
