#!/usr/bin/with-contenv bash
# shellcheck shell=bash
# Läuft beim Start des Flarum-Containers vor /etc/cont-init.d/03-config.sh, das die
# Erweiterungen aus /data/extensions/list installiert. Das Image schreibt diese Liste
# nach jedem Start neu und verliert dabei Einträge, wenn der Container nur neu gestartet
# (nicht neu erstellt) wurde. Daher wird die Liste hier aus dem Repo wiederhergestellt.

LIST=/data/extensions/list
mkdir -p /data/extensions
touch "$LIST"

tmp=$(mktemp)
# Repo-Einträge zuerst (gewinnen bei Duplikaten), dann bisherige Liste; Kommentare raus
cat /bbforum/extensions.txt /bbforum/extensions.local.txt "$LIST" 2>/dev/null |
  sed -e 's/#.*//' -e 's/[[:space:]]//g' | grep -v '^$' |
  awk -F: '!seen[$1]++' >"$tmp"

mv "$tmp" "$LIST"
chown flarum:flarum "$LIST" 2>/dev/null || true
echo "bbforum: extension list restored ($(wc -l <"$LIST") packages)"
