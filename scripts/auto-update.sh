#!/usr/bin/env bash
# Fetches new commits from the upstream branch (usually origin/main) and applies them to the forum.
# Runs from a systemd timer every 5 minutes; set it up with scripts/install-auto-update.sh.
#
#   scripts/auto-update.sh           only if there are new commits
#   scripts/auto-update.sh --force   re-apply the setup even without new commits
#
# - Fast-forward only: local changes are never overwritten. If that is not possible, it aborts
#   and reports it.
# - If only the website or docs change (website/, .github/, README and the .md files in media/),
#   there is nothing to do in the forum. content/*.md are forum content and do not count as docs.
# - If the container configuration changes (docker-compose.yml, extension list, start scripts),
#   it first makes a backup (./backups) and then recreates the container.
# - Reports to Discord if AUTO_UPDATE_DISCORD_WEBHOOK is set in .env (webhook URL of a
#   channel, e.g. an admin channel).
# - If an update fails, the code is rolled back to the old state and the script only tries again
#   when a new commit arrives or it is started with --force (no error every 5 minutes).
# Log: journalctl -u bbforum-auto-update -n 100
set -euo pipefail
cd "$(dirname "$0")/.."

force=false
[[ ${1:-} == --force ]] && force=true

# shellcheck source=lib/notify.sh
source scripts/lib/notify.sh

failed_marker=.git/bbforum-auto-update-failed
step="Abruf von GitHub"
old=""
upstream=""

on_error() {
  trap - ERR
  # Back to the old state so that the next attempt repeats the whole update
  [[ -n $old ]] && git reset --quiet --keep "$old" || true
  [[ -n $upstream ]] && echo "$upstream" > "$failed_marker"
  notify "❌ Forum-Update fehlgeschlagen bei: $step. Log: journalctl -u bbforum-auto-update -n 100 · erneut versuchen: scripts/auto-update.sh --force"
  exit 1
}
trap on_error ERR

git fetch --quiet
old=$(git rev-parse HEAD)
upstream=$(git rev-parse '@{u}')

if [[ $old == "$upstream" ]] && ! $force; then
  exit 0
fi
if ! $force && [[ -f $failed_marker && $(cat "$failed_marker") == "$upstream" ]]; then
  echo "Letzter Versuch für $upstream ist fehlgeschlagen; erst wieder bei einem neuen Commit oder mit --force."
  exit 0
fi

if [[ $old != "$upstream" ]]; then
  step="Übernahme der neuen Commits"
  if ! git merge --ff-only --quiet '@{u}'; then
    trap - ERR
    echo "$upstream" > "$failed_marker"
    notify "⚠️ Forum-Update übersprungen: Die neuen Commits lassen sich nicht übernehmen (lokale Änderungen in $(pwd)?). Bitte von Hand prüfen, danach: scripts/auto-update.sh --force"
    exit 1
  fi
fi
new=$(git rev-parse HEAD)
changed=$(git diff --name-only "$old" "$new")

# What needs to happen?
recreate_compose=false
recreate_flarum=false
grep -qx 'docker-compose.yml' <<<"$changed" && recreate_compose=true
grep -qE '^flarum/(extensions[^/]*\.txt|restore-extensions\.sh|scheduler\.sh|extend-loader\.php)$' <<<"$changed" && recreate_flarum=true
needs_setup=$force
grep -vE '^(website/|\.github/|[^/]*\.md$|media/[^/]*\.md$)' <<<"$changed" | grep -q . && needs_setup=true

if ! $needs_setup && ! $recreate_compose && ! $recreate_flarum; then
  rm -f "$failed_marker"
  echo "Nur Website/Doku geändert ($(git log --format=%h -1)), im Forum ist nichts zu tun."
  exit 0
fi

if $recreate_compose || $recreate_flarum; then
  step="Backup vor dem Neustart"
  scripts/backup.sh
  step="Neustart der Container"
  $recreate_compose && docker compose up -d --remove-orphans
  $recreate_flarum && docker compose up -d --force-recreate flarum
fi

step="Einrichtung (scripts/setup-forum.sh)"
scripts/setup-forum.sh

rm -f "$failed_marker"
summary=$(git log --format='• %s' "$old..$new" | head -n 10)
notify "✅ Forum aktualisiert auf $(git log --format=%h -1)${summary:+$'\n'$summary}"
