#!/usr/bin/env bash
# Prüft, ob Website und Forum antworten (für .github/workflows/uptime.yml, alle 10 Minuten).
# Meldet in Discord nur Wechsel: einmal, wenn etwas ausfällt, und einmal, wenn wieder alles läuft.
# Den letzten Zustand (up/down) merkt es sich in STATE_FILE, das der Workflow im Actions-Cache aufhebt.
#
#   WEBSITE_URL, FORUM_URL    zu prüfende Adressen (Forum: dessen /api muss JSON liefern)
#   DISCORD_STATUS_WEBHOOK    Webhook-URL eines Discord-Kanals (leer: keine Meldung)
#   STATE_FILE                Datei mit dem letzten Zustand (Standard .uptime-state)
#   RETRY_DELAY               Sekunden zwischen den drei Versuchen (Standard 20)
#
# Antwortet Cloudflare mit einer Bot-Prüfung (Header cf-mitigated), gilt das nicht als Ausfall: Der Lauf
# zeigt dann nur eine Warnung (in Cloudflare die Prüfung für /api bzw. die Startseite ausnehmen).
set -uo pipefail

STATE_FILE=${STATE_FILE:-.uptime-state}
UA="BBPort-Uptime/1.0 (+https://github.com/${GITHUB_REPOSITORY:-})"
down=()
blocked=()

check() { # check NAME URL TEXT – erreichbar = HTTP 200 und TEXT kommt in der Antwort vor
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

send() { # send TEXT – an Discord, falls ein Webhook gesetzt ist
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
