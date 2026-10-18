#!/usr/bin/with-contenv sh
# shellcheck shell=sh
# Startet den Flarum-Scheduler (php flarum schedule:run, jede Minute) im Forum-Container selbst.
# Ein eigener Cron-Container hätte die Erweiterungen nicht installiert, und Flarum entfernt
# fehlende Erweiterungen bei jedem Lauf aus der Liste der aktivierten Erweiterungen.
# Entspricht /etc/cont-init.d/05-svc-cron.sh des Images (dort nur mit SIDECAR_CRON=1).

CRONTAB_PATH="/var/spool/cron/crontabs"
mkdir -p "$CRONTAB_PATH"
# stdout ("No scheduled commands are ready to run.") verwerfen, Fehler bleiben im Log
echo "* * * * * sh /usr/local/bin/flarum_scheduler >/dev/null" >"$CRONTAB_PATH/flarum"
chmod 0755 "$CRONTAB_PATH"
chmod 0644 "$CRONTAB_PATH/flarum"

mkdir -p /etc/services.d/cron
cat >/etc/services.d/cron/run <<EOL
#!/usr/bin/execlineb -P
with-contenv
exec busybox crond -f -c ${CRONTAB_PATH}
EOL
chmod +x /etc/services.d/cron/run
echo "bbforum: Flarum scheduler enabled (every minute)"
