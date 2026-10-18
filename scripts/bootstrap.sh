#!/usr/bin/env bash
# Komplett-Installation in einem Rutsch (auf dem Docker-Host ausführen):
#
#   git clone https://github.com/nick24051998/Bloodborne-Forum && cd Bloodborne-Forum
#   scripts/bootstrap.sh
#
# Fragt Domain, Admin-Name/-Mail, Discord-Link und die HTTPS-Variante ab,
# erzeugt alle Passwörter, schreibt .env, startet die Container, installiert und
# konfiguriert die Erweiterungen, Tags, Rechte und das Theme. Erneut ausführbar:
# Ist .env schon da, wird sie weiterverwendet.
#
# Ohne Rückfragen (alle Werte vorgeben):
#   BB_DOMAIN=forum.example.com BB_ADMIN_USER=admin BB_ADMIN_MAIL=a@example.com \
#   BB_DISCORD_INVITE=https://discord.gg/xyz BB_HTTPS_MODE=tunnel BB_TUNNEL_TOKEN=... \
#   scripts/bootstrap.sh
set -euo pipefail
cd "$(dirname "$0")/.."

red()   { printf '\033[1;31m%s\033[0m\n' "$*"; }
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
step()  { printf '\n\033[1;31m▸ %s\033[0m\n' "$*"; }

ask() { # ask VAR "Frage" [Default]
  local var=$1 prompt=$2 def=${3:-} val
  if [[ -n ${!var:-} ]]; then return; fi
  if [[ ! -t 0 ]]; then
    [[ -n $def ]] || { red "$var fehlt (keine Eingabe möglich)"; exit 1; }
    printf -v "$var" '%s' "$def"; return
  fi
  read -r -p "$prompt${def:+ [$def]}: " val
  printf -v "$var" '%s' "${val:-$def}"
}

randpw() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c "${1:-32}"; }

# --- Voraussetzungen -----------------------------------------------------------
step "Voraussetzungen prüfen"
for cmd in docker git curl; do
  command -v "$cmd" >/dev/null || { red "$cmd fehlt – bitte installieren"; exit 1; }
done
docker compose version >/dev/null 2>&1 || { red "docker compose (Plugin) fehlt"; exit 1; }
if ! docker info >/dev/null 2>&1; then
  red "Kein Zugriff auf Docker. Mit sudo starten oder: sudo usermod -aG docker \$USER (neu einloggen)"
  exit 1
fi
echo "  ok: docker, docker compose, git, curl"

# --- .env ------------------------------------------------------------------------
if [[ -f .env ]]; then
  step ".env existiert bereits – wird weiterverwendet"
else
  step "Ein paar Fragen (Enter übernimmt den Vorschlag)"
  ask BB_DOMAIN     "Domain des Forums (ohne https://), z. B. forum.deine-domain.de"
  BB_DOMAIN=${BB_DOMAIN#http://}; BB_DOMAIN=${BB_DOMAIN#https://}; BB_DOMAIN=${BB_DOMAIN%%/*}
  [[ $BB_DOMAIN =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { red "Ungültige Domain: $BB_DOMAIN"; exit 1; }
  ask BB_ADMIN_USER "Admin-Benutzername (3-30 Zeichen: a-z 0-9 _ -)" "admin"
  [[ $BB_ADMIN_USER =~ ^[A-Za-z0-9_-]{3,30}$ ]] || { red "Ungültiger Benutzername"; exit 1; }
  ask BB_ADMIN_MAIL "Admin-E-Mail"
  [[ $BB_ADMIN_MAIL =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || { red "Ungültige E-Mail"; exit 1; }
  ask BB_DISCORD_INVITE "Discord-Einladungslink (später änderbar)" "https://discord.gg/CHANGE_ME"
  ask BB_DISCORD_CLIENT_ID "Discord Client ID (leer lassen = später)" " "
  BB_DISCORD_CLIENT_ID=${BB_DISCORD_CLIENT_ID// /}
  echo
  echo "  HTTPS-Variante:"
  echo "    1) Cloudflare Tunnel  – keine offenen Ports, empfohlen wenn noch kein Webserver läuft"
  echo "    2) Eigener Reverse Proxy (Caddy/nginx auf dem Host, Snippet wird angezeigt)"
  ask BB_HTTPS_CHOICE "Auswahl" "1"
  case "${BB_HTTPS_MODE:-$BB_HTTPS_CHOICE}" in
    1|tunnel) BB_HTTPS_MODE=tunnel ;;
    2|proxy)  BB_HTTPS_MODE=proxy ;;
    *) red "Bitte 1 oder 2 wählen"; exit 1 ;;
  esac
  if [[ $BB_HTTPS_MODE == tunnel ]]; then
    echo
    echo "  Tunnel-Token holen: dash.cloudflare.com → Zero Trust → Networks → Tunnels →"
    echo "  Create a tunnel → Cloudflared → Name z. B. 'forum' → den Token aus dem Befehl kopieren"
    echo "  (die lange Zeichenkette nach '--token'). Leer lassen = später in .env eintragen."
    ask BB_TUNNEL_TOKEN "Tunnel-Token" " "
    BB_TUNNEL_TOKEN=${BB_TUNNEL_TOKEN// /}
  fi

  port=${BB_PORT:-8888}
  if command -v ss >/dev/null && ss -ltn 2>/dev/null | grep -q "127.0.0.1:$port \|0.0.0.0:$port \|\*:$port "; then
    red "Port $port ist belegt – setze BB_PORT=<freier Port> und starte erneut"; exit 1
  fi

  declare -A V=(
    [FORUM_URL]="${BB_FORUM_URL:-https://$BB_DOMAIN}"
    [FLARUM_PORT]="$port"
    [DB_PASSWORD]="$(randpw 32)"
    [DB_ROOT_PASSWORD]="$(randpw 32)"
    [FLARUM_ADMIN_USER]="$BB_ADMIN_USER"
    [FLARUM_ADMIN_MAIL]="$BB_ADMIN_MAIL"
    [FLARUM_ADMIN_PASS]="$(randpw 24)"
    [DISCORD_CLIENT_ID]="$BB_DISCORD_CLIENT_ID"
    [DISCORD_INVITE_URL]="$BB_DISCORD_INVITE"
    [WEBSITE_URL]="${BB_WEBSITE_URL:-https://${BB_DOMAIN#forum.}}"
    [CF_TUNNEL_TOKEN]="${BB_TUNNEL_TOKEN:-}"
  )
  umask 077
  while IFS= read -r line || [[ -n $line ]]; do
    key=${line%%=*}
    if [[ $line != \#* && -v V[$key] ]]; then
      printf '%s=%s\n' "$key" "${V[$key]}"
    else
      printf '%s\n' "$line"
    fi
  done < .env.example > .env
  if [[ $BB_HTTPS_MODE == tunnel ]]; then
    printf '\n# Cloudflare Tunnel aktiv (startet den Service "cloudflared")\nCOMPOSE_PROFILES=tunnel\n' >> .env
  fi
  echo "  .env geschrieben (Passwörter zufällig erzeugt, Rechte 600)"
fi

env_get() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }
FORUM_URL=$(env_get FORUM_URL)
PORT=$(env_get FLARUM_PORT); PORT=${PORT:-8888}

# --- Start (ohne Tunnel, bis der Standard-Admin ersetzt ist) ------------------------
step "Container starten (erster Start dauert ca. 1 Minute)"
docker compose pull -q db flarum ||
  echo "  Hinweis: Image-Update fehlgeschlagen (z. B. Docker-Hub-Limit) – nutze vorhandene Images"
docker compose up -d --remove-orphans db flarum
printf '  warte auf Flarum'
for i in $(seq 1 120); do
  if curl -fs -o /dev/null "http://127.0.0.1:$PORT/"; then break; fi
  printf '.'; sleep 3
  [[ $i -eq 120 ]] && { echo; red "Flarum startet nicht – docker compose logs flarum"; exit 1; }
done
echo " ok"

step "Erweiterungen installieren"
if [[ ${BB_SKIP_EXTENSIONS:-0} == 1 ]]; then
  echo "  übersprungen (BB_SKIP_EXTENSIONS=1)"
elif ! scripts/install-extensions.sh; then
  red "  Installation der Erweiterungen fehlgeschlagen – später erneut: scripts/install-extensions.sh"
fi

step "Forum einrichten (Admin, Tags, Rechte, Theme, Regeln)"
scripts/setup-forum.sh

# --- Öffentlich machen -----------------------------------------------------------------
if grep -q '^COMPOSE_PROFILES=.*tunnel' .env; then
  step "Cloudflare Tunnel"
  if [[ -n $(env_get CF_TUNNEL_TOKEN) ]]; then
    docker compose up -d cloudflared
    echo "  cloudflared läuft. Im Cloudflare-Dashboard beim Tunnel unter 'Public Hostname':"
    echo "  Hostname ${FORUM_URL#https://} → Service HTTP → flarum:8000"
  else
    echo "  Noch kein Token: CF_TUNNEL_TOKEN in .env eintragen, dann: docker compose up -d"
  fi
else
  step "Reverse Proxy (Caddy-Beispiel für /etc/caddy/Caddyfile)"
  cat <<EOF
  ${FORUM_URL#https://} {
      encode zstd gzip
      @phpInAssets path_regexp ^/assets/.*\.php
      respond @phpInAssets 404
      reverse_proxy 127.0.0.1:$PORT
  }
  → danach: sudo systemctl reload caddy   (Details/Cloudflare-Zertifikat: README)
EOF
fi

# --- Backup-Cronjob -------------------------------------------------------------------
if [[ -t 0 ]] && ! crontab -l 2>/dev/null | grep -q "scripts/backup.sh"; then
  read -r -p $'\nNächtliches Backup (03:30, 14 Tage aufbewahren) per Cron einrichten? [J/n]: ' yn
  if [[ ! $yn =~ ^[nN] ]]; then
    dir=$(pwd)
    (crontab -l 2>/dev/null; echo "30 3 * * * cd $dir && scripts/backup.sh $dir/backups >/dev/null 2>&1 && find $dir/backups -name '*.gz' -mtime +14 -delete") | crontab -
    echo "  Cronjob eingerichtet (crontab -l)"
  fi
fi

# --- Zusammenfassung --------------------------------------------------------------------
green $'\n✔ Fertig.'
cat <<EOF

  Forum:        $FORUM_URL
  Admin:        $(env_get FLARUM_ADMIN_USER)
  Passwort:     $(env_get FLARUM_ADMIN_PASS)      (steht auch in .env – gut aufheben!)

  Was nur du im Browser machen kannst:
  1. discord.com/developers/applications → New Application → OAuth2 → Redirects:
       $FORUM_URL/auth/discord
     Client ID in .env (DISCORD_CLIENT_ID) eintragen → scripts/setup-forum.sh
  2. Client Secret: $FORUM_URL/admin → Extensions → OAuth → Discord (Zahnrad)
  3. Cloudflare: Rate-Limit für /login und /api/token (README → Sicherheit)
  4. $FORUM_URL/admin → Email: SMTP eintragen (für Benachrichtigungen)
EOF
