# Bloodborne PC Port – Community-Forum

Schlankes, sofort deploybares Forum für die Community des **Bloodborne PC Port**
(englischsprachig, Login über Discord). Basis: **Flarum 1.8** + **MariaDB 10.11** in Docker,
Bloodborne-Gothic-Theme im Discord-Stil.

> **Warum `crazymax/flarum` statt `mondedie/flarum:stable`?**
> `mondedie/flarum:stable` wurde zuletzt 2022 gebaut (Flarum 1.3.0, PHP 8.0) und hat bekannte
> Sicherheitslücken. `:latest` enthält zwar Flarum 1.8, läuft aber noch auf dem nicht mehr
> gepflegten PHP 8.0 mit Alpine 3.16. [`crazymax/flarum`](https://hub.docker.com/r/crazymax/flarum)
> wird aktiv gepflegt (Flarum 1.8.19, PHP 8.4, Alpine 3.23) und bringt den Befehl `extension require` mit.
> Flarum 2.0 ist erst seit Oktober 2026 stabil. Die Erweiterungen ziehen gerade nach, deshalb bleibt
> dieses Setup bewusst auf 1.8 (siehe [Update](#update)).

> **Website:** Die Projekt-Website (Startseite, Install-Guide, FAQ, Changelog) liegt in
> [`website/`](website/README.md). Sie wird automatisch über GitHub Pages veröffentlicht
> (https://nick24051998.github.io/Bloodborne-Forum/), später optional unter eigener Domain.

## Inhalt

| Pfad | Zweck |
|---|---|
| `docker-compose.yml` | Flarum, MariaDB (benannte Volumes), cloudflared (Profil `tunnel`) |
| `.env.example` | Alle Einstellungen mit Platzhaltern, wird nach `.env` kopiert |
| `scripts/bootstrap.sh` | **Komplett-Installer:** fragt ein paar Werte ab, erzeugt Passwörter, startet und richtet alles ein |
| `scripts/install-extensions.sh` | Installiert die Erweiterungen aus `flarum/extensions.txt` (fof/oauth, upload, best-answer, discussion-templates, sitemap, flarum-seo 2.x; optional fof/user-directory) |
| `flarum/extensions.txt`, `flarum/restore-extensions.sh` | Erweiterungsliste; wird vor jedem Start des Containers wiederhergestellt |
| `flarum/scheduler.sh` | Startet den Flarum-Scheduler (jede Minute) im Forum-Container |
| `scripts/setup-forum.sh` | Richtet alles per Flarum-API ein: Admin, Erweiterungen, Tags, Rechte, Theme, Banner, Regeln, Logo |
| `scripts/backup.sh` | DB-Dump + Datenvolume als `.tar.gz` |
| `flarum/extend.php` | Schalter „neue Accounts nur über Discord“ und Sicherheits-Header |
| `flarum/forum.js` | Links zur Website und zu Discord in der Forum-Kopfzeile, Registrieren-Fenster nur mit Discord-Button |
| `theme/custom.less` | Theme (Admin → Appearance → Custom Styles) |
| `theme/logo.svg`, `theme/favicon.svg` | Platzhalter-Logo (Blutmond mit Krähe), Quelldateien |
| `theme/logo.png`, `theme/favicon.png` | Dieselben Bilder als PNG zum Hochladen (Flarum 1.x nimmt kein SVG) |
| `theme/fonts/` | Cinzel + Inter als `.woff2`, selbst gehostet (SIL OFL) |
| `content/` | Welcome-Banner, Fußzeile (Imprint/Privacy), Regel-Thema, Vorlage für Help & Support |
| `website/` | Projekt-Website (Astro, statisch, GitHub Pages), siehe `website/README.md` |

## Voraussetzungen

- Debian-VM mit Docker Engine und dem Compose-Plugin (`docker compose version` ≥ 2.20)
- 1 vCPU und 1 GB RAM reichen für den Start, 2 GB sind empfohlen. Gemessen im Leerlauf:
  Flarum ≈ 110 MB, MariaDB ≈ 110 MB.
- Eine Domain bei Cloudflare, z. B. `forum.example.com`
- Zugriff auf das [Discord Developer Portal](https://discord.com/developers/applications)
- Ausgehender Internetzugang für den Container (Composer lädt die Erweiterungen)

## Schnellstart (ein Befehl)

Auf dem Server (per SSH):

```bash
git clone https://github.com/nick24051998/Bloodborne-Forum && cd Bloodborne-Forum
scripts/bootstrap.sh
```

Der Installer fragt nach Domain, Admin-Name und -Mail, dem Discord-Link und der HTTPS-Variante.
Erzeugt alle Passwörter selbst und schreibt `.env`. Startet die Container, installiert und
konfiguriert alles (die Schritte 1–2 unten) und startet bei Variante (b) den Cloudflare Tunnel.
Zum Schluss zeigt er das Admin-Passwort und die restlichen Browser-Schritte an (Discord-Portal,
Client Secret, Cloudflare). Im Test dauerte das von null bis zum fertigen Forum unter einer Minute.
Den Installer kannst du gefahrlos erneut ausführen.

Die folgenden Abschnitte beschreiben dieselben Schritte einzeln zum Nachvollziehen.

## 1. Starten

```bash
git clone <dieses-repo> bloodborne-forum && cd bloodborne-forum
cp .env.example .env && chmod 600 .env
# Passwörter erzeugen und in .env eintragen:
openssl rand -base64 32 | tr -d '/+='   # für DB_PASSWORD, DB_ROOT_PASSWORD, FLARUM_ADMIN_PASS
nano .env                               # FORUM_URL, Admin, DISCORD_INVITE_URL, …

docker compose up -d
docker compose logs -f flarum           # erster Start dauert ca. 1 Minute
```

Flarum lauscht danach nur auf `127.0.0.1:8888`, ist also noch nicht öffentlich erreichbar.

> **`FORUM_URL` muss exakt der Adresse entsprechen, die Besucher aufrufen**
> (`https://`, mit oder ohne `www`, ohne Slash am Ende). Sonst brechen Icons, Schriften, Logins
> und die Discord-Redirect-URL.

## 2. Erstinstallation: Erweiterungen und Einrichtung

```bash
scripts/install-extensions.sh                 # optional: --with-user-directory
scripts/setup-forum.sh
```

`setup-forum.sh` ist idempotent und kann nach jeder Änderung an `.env`, `theme/` oder `content/`
erneut laufen. Es erledigt:

1. **Admin anlegen.** Das Image legt beim ersten Start den Account `flarum`/`flarum` an. Das
   Skript wandelt ihn in den Admin aus `.env` um (Name, E-Mail, Passwort). Danach funktioniert
   `flarum`/`flarum` nicht mehr.
   ⚠️ **Das Forum erst nach diesem Schritt öffentlich machen (Schritt 3).**
2. **Erweiterungen aktivieren:** Tags, Markdown, BBCode, Emoji, Mentions, Likes, Sticky, Lock,
   Subscriptions, Flags, Approval, Suspend, Statistics, GDPR sowie die fof-Erweiterungen.
3. **Theme und Startseite:** Dark Mode, Farben, `theme/custom.less`, Schriften, Welcome-Banner mit
   Discord-Link, Logo und Favicon.
4. **Tags, Reihenfolge, Rechte, Best Answer, Help-Vorlage, Upload-Regeln** (siehe [Tags & Rechte](#tags--rechte)).
5. **Regel-Thema** in Announcements, angepinnt und gesperrt.
6. **Discord-Login**, sofern `DISCORD_CLIENT_ID` gesetzt ist.

Manuell geht alles auch im Admin-Bereich unter `https://forum.example.com/admin`. Unter
*Extensions* lassen sich die Erweiterungen dort einzeln einschalten.

## Lokal im Netzwerk testen (vor dem Livegang)

Flarum baut alle Links aus `FORUM_URL`. Zum Testen im LAN stellst du deshalb URL und
Bind-Adresse auf die LAN-IP des Docker-Hosts um (Beispiel `192.168.13.84`):

```bash
sed -i -e 's|^FORUM_URL=.*|FORUM_URL=http://192.168.13.84:8888|' \
       -e 's|^FLARUM_BIND=.*|FLARUM_BIND=192.168.13.84|' .env
grep -q '^FLARUM_BIND=' .env || echo 'FLARUM_BIND=192.168.13.84' >> .env
docker compose up -d db flarum
```

Danach im Browser `http://192.168.13.84:8888` öffnen. **Zum Livegang zurückstellen:**

```bash
sed -i -e 's|^FORUM_URL=.*|FORUM_URL=https://forum.example.com|' -e 's|^FLARUM_BIND=.*|FLARUM_BIND=127.0.0.1|' .env
docker compose up -d
```

## 3. Öffentlich machen: HTTPS

### Variante (a): Caddy auf dem Host

`/etc/caddy/Caddyfile`:

```caddy
forum.example.com {
    # Cloudflare-Proxy (orange Wolke) mit SSL-Modus "Full (strict)":
    # Origin-Zertifikat aus Cloudflare → SSL/TLS → Origin Server.
    # Bei grauer Wolke die tls-Zeile weglassen, dann holt Caddy selbst Let's Encrypt.
    tls /etc/caddy/cf-origin.pem /etc/caddy/cf-origin.key
    encode zstd gzip
    # Zusatzschutz: niemals PHP aus dem Upload-/Asset-Ordner ausführen
    @phpInAssets path_regexp ^/assets/.*\.php
    respond @phpInAssets 404
    reverse_proxy 127.0.0.1:8888
}
```

```bash
sudo systemctl reload caddy
```

Cloudflare-DNS: `A forum → <deine feste IP>`, proxied (orange Wolke).
Flarum liest die echte Besucher-IP aus `CF-Connecting-IP`, wichtig für Spam-Schutz und Sperren.
Deshalb sollten die Ports 80 und 443 der VM nur für die
[Cloudflare-IP-Bereiche](https://www.cloudflare.com/ips/) offen sein. Sonst könnte jemand den
Header fälschen.

### Variante (b): Cloudflare Tunnel (keine offenen Ports)

1. Cloudflare Zero Trust → *Networks → Tunnels* → *Create a tunnel* → *Cloudflared* → Token kopieren.
2. Im Tunnel unter *Public Hostname* `forum.example.com` → Service `HTTP` → `flarum:8000` eintragen.
3. In `.env` `CF_TUNNEL_TOKEN=…` und `COMPOSE_PROFILES=tunnel` setzen. Bei `bootstrap.sh` mit
   Variante 1 steht das schon drin.
4. `docker compose up -d` startet jetzt auch den Service `cloudflared`.

## 4. Discord-Login einrichten

1. Im [Developer Portal](https://discord.com/developers/applications) auf **New Application** klicken,
   z. B. „Bloodborne PC Port Forum“. Als Icon kannst du `theme/favicon.png` nehmen.
2. **OAuth2 → Redirects → Add Redirect**, exakt eintragen:

   ```
   https://forum.example.com/auth/discord
   ```

   Das ist `${FORUM_URL}/auth/discord`: mit `https`, ohne Slash am Ende, kein Query-String.
   Dann **Save Changes**. Diese Route erwartet fof/oauth.
3. **OAuth2 → Client ID** kopieren, in `.env` als `DISCORD_CLIENT_ID` eintragen und
   `scripts/setup-forum.sh` erneut ausführen. Das schaltet den Discord-Provider ein und setzt die ID.
4. **Reset Secret** klicken und das Secret kopieren. Das Secret **nicht** in `.env` oder ins Repo
   eintragen, sondern hier: **Flarum Admin → Extensions → OAuth (FriendsOfFlarum) → Discord
   (Zahnrad) → Client Secret** → Speichern. Dort prüfen, dass Discord eingeschaltet ist.
5. In einem privaten Browserfenster testen: *Log In → Log in with Discord*.

fof/oauth fragt bei Discord automatisch die Scopes `identify` und `email` an. Einen Bot brauchst du nicht.
Hat jemand seine E-Mail bei Discord verifiziert, übernimmt Flarum sie als bestätigt. Es geht dann
keine Bestätigungsmail raus.

### E-Mail-Registrierung abschalten (Discord als Hauptweg)

`DISCORD_ONLY_SIGNUP=true` (Standard) in `.env` → `scripts/setup-forum.sh`. Danach lehnt Flarum
neue Accounts ohne Discord-Login ab und zeigt die Meldung „New accounts can only be created with
'Log in with Discord'“. Das Registrieren-Fenster zeigt dann nur den Discord-Button
(`flarum/forum.js`, solange der Discord-Login aktiv ist). Bestehende Accounts und Admins sind nicht betroffen. Zum Abschalten:
`DISCORD_ONLY_SIGNUP=false` und das Skript erneut ausführen.

> Den Core-Schalter *Admin → Basics → Allow Sign Up* **nicht** ausschalten. Er sperrt in Flarum
> auch die Registrierung über Discord. Die Sperre übernimmt `flarum/extend.php`.

### E-Mail-Versand (empfohlen)

Für Benachrichtigungen und Passwort-Resets: **Admin → Email** → SMTP eines Mail-Dienstes eintragen
(z. B. Brevo, Mailgun oder ein eigener Server). Ohne SMTP läuft das Forum, verschickt aber keine Mails.

## Sicherheit

**Schon eingebaut:**

- **Aktuelles Image:** Flarum 1.8.19, PHP 8.4, Alpine 3.23. Die Prozesse laufen als
  Nicht-Root-User `flarum`, und alle Container haben `no-new-privileges` und Log-Rotation.
- **Kaum Angriffsfläche:** Flarum lauscht nur auf `127.0.0.1`, die Datenbank hat gar keinen Port nach
  außen. Mit Cloudflare Tunnel braucht die VM keinen einzigen offenen Port.
- **Keine Geheimnisse im Repo:** `.env` ist in `.gitignore`, das Discord-Secret liegt nur in der
  Flarum-Datenbank. Der Standard-Admin `flarum`/`flarum` wird durch `setup-forum.sh` ersetzt.
- **Uploads:** nur Bilder, `.zip`/`.7z` und `.txt`, bis 20 MB, kein SVG. Die gespeicherte
  Dateiendung leitet fof/upload aus dem erkannten Dateityp ab, nicht aus dem Dateinamen. Ein
  hochgeladenes `.php` kann also nicht entstehen. Herunterladen dürfen nur eingeloggte Mitglieder,
  denn Report-Zips können Systemdetails enthalten.
- **Sicherheits-Header** über `flarum/extend.php`: `X-Frame-Options`, `Permissions-Policy` und
  `Strict-Transport-Security` bei `https`. `nosniff` setzt bereits nginx. Session-Cookies sind
  `HttpOnly` und `SameSite=Lax`, bei `https` zusätzlich `Secure`.
- **Spam:** Neue Accounts nur über Discord. Dazu kommen Flarums Flood-Schutz, die Extensions
  Flags/Approval zum Melden und Freigeben und Suspend zum zeitweisen Sperren.

**Selbst erledigen (empfohlen):**

1. **Firewall:** Bei Variante (a) die Ports 80 und 443 nur für die
   [Cloudflare-IPs](https://www.cloudflare.com/ips/) öffnen, SSH nur per Key. Sonst kann man
   Cloudflare umgehen und die Besucher-IP fälschen. Bei Variante (b) eingehend alles zu lassen.
2. **Login-Drosselung:** Flarum 1.8 bremst falsche Passwörter nicht. In Cloudflare unter
   *Security → WAF → Rate limiting rules* eine Regel anlegen: URI-Pfad ist `/login` oder
   `/api/token`, Methode POST, mehr als 5 Anfragen in 10 Sekunden → Block. Das ist im Free-Plan
   enthalten. Für Discord-Logins ist das egal.
3. **Admin-Konten:** Langes Zufallspasswort und Discord-Konto mit aktivierter 2FA. Optional 2FA
   direkt in Flarum mit `docker compose exec flarum extension require ianm/twofactor`
   (Version 1.2.x für Flarum 1.8, von mir nicht getestet). Danach unter *Admin → Extensions*
   aktivieren.
4. **Updates:** Sicherheitsmeldungen für Flarum
   ([Security Advisories](https://github.com/flarum/framework/security/advisories)) und neue
   [crazymax/flarum-Releases](https://github.com/crazy-max/docker-flarum/releases) abonnieren, dann
   wie unter [Update](#update) beschrieben aktualisieren. Debian selbst mit `unattended-upgrades`.
5. **Backups** nächtlich und zusätzlich verschlüsselt auf einen anderen Rechner (siehe [Backup](#backup)).
6. **Rechtliches** (Betreiber in Deutschland): Impressum und Datenschutzerklärung als Seiten
   verlinken. Darin Discord-Login, Cloudflare und die Uploads erwähnen. Die Erweiterung
   *GDPR* (aktiviert) liefert Datenexport und Account-Löschung für Nutzer.

## Tags & Rechte

| Tag | Lesen | Themen starten | Besonderheiten |
|---|---|---|---|
| **Announcements** | alle | nur Mods/Admins | eingeschränkter Tag, Antworten für Mitglieder erlaubt, angepinntes Regel-Thema |
| **Help & Support** | alle | Mitglieder | **Best Answer**, Beitragsvorlage mit Pflichtangaben, Uploads |
| **Suggestions** | alle | Mitglieder | |
| **Mods & Patches** | alle | Mitglieder | keine Spieldateien (Regeln) |
| **Guides** | alle | Mitglieder | |
| **The Hunter's Dream** | alle | Mitglieder | Off-Topic |

Rollenfarben: Admin Blutrot `#a3161e`, Mod Messing `#b08d57`. Uploads erlaubt: Bilder, `.zip`/`.7z`
(BB-Report-Tool) und `.txt`-Logs bis 20 MB. Hoch- und herunterladen dürfen nur eingeloggte Mitglieder.

**Manuell im Admin-Bereich** (falls du das Skript nicht nutzt):

1. *Tags → Create Tag*: Name, Slug, Farbe und Icon wie in `scripts/lib/setup-inside.sh`. Die
   Reihenfolge stellst du per Drag & Drop ein.
2. *Permissions → Restrict by tag → Announcements*: View = Everyone, Start discussions = Mods,
   Reply = Members. Moderationsrechte setzt du wie in den globalen Rechten.
3. *Best Answer* → Tag „Help & Support“ aktivieren.
4. *Tags → Help & Support → Edit*: Feld **Template** mit dem Inhalt von `content/help-template.md` füllen.
5. *FoF Upload* → Mime-Typen und Max-Größe setzen. *Permissions* → Upload = Members, Download = Members.

Die Vorlage füllt den Editor vor. Technisch erzwingen kann Flarum die Pflichtangaben nicht.
Das Regel-Thema macht sie aber verbindlich, und Mods können unvollständige Themen sperren.

## Theme einspielen

`setup-forum.sh` setzt alles automatisch. Manuell geht es so:

1. *Admin → Appearance*: Dark Mode an, Primary `#a3161e`, Secondary `#b08d57`.
2. *Edit Custom CSS*: den Inhalt von `theme/custom.less` einfügen und speichern.
3. Die Schriften liegen selbst gehostet unter `/assets/fonts/bb/`. Das Skript kopiert sie ins Volume.
   Flarum blockiert externe Imports in Custom LESS, und so gehen keine Anfragen an Google (DSGVO).
4. **Logo und Favicon:** *Admin → Appearance → Logo / Favicon* → `theme/logo.png` bzw.
   `theme/favicon.png` hochladen. Flarum 1.x wandelt Uploads in PNG um, SVG geht deshalb nicht.
   Eigenes Logo: SVG bearbeiten und als PNG exportieren, ca. 120 px hoch.

Welcome-Banner: Text in `content/welcome.html`, Titel und Discord-Link kommen aus `.env`
(`DISCORD_INVITE_URL`). Manuell geht es unter *Admin → Basics → Welcome Banner*.

**Verbindung zur Website:** `setup-forum.sh` trägt `WEBSITE_URL` und `DISCORD_INVITE_URL` aus
`.env` ein. Daraus entstehen die Links in der Kopfzeile (Website, Install guide, FAQ, Discord; auf dem
Handy im Seitenmenü) und die Fußzeile mit Imprint und Privacy aus `content/footer.html`
(*Admin → Appearance → Custom Footer*). Ist eine Adresse leer oder noch ein Platzhalter, fehlen die
zugehörigen Links einfach. Nach Änderungen an `flarum/forum.js` das Skript erneut ausführen, es baut
das JavaScript des Forums neu.

## Forenregeln (Kurzfassung)

Respektvoll bleiben, **keine Piraterie: keine Links zu Spieldateien, Firmware oder Keys, auch
keine Fragen danach**, keine Malware, Englisch, richtige Kategorie, kein Spam. Den vollständigen
Text in `content/rules.md` veröffentlicht das Setup als angepinntes Thema.

## Backup

```bash
scripts/backup.sh                    # → ./backups/db-<datum>.sql.gz + flarum-data-<datum>.tar.gz
```

Nächtlich per Cron (`crontab -e`), 14 Tage aufbewahren:

```cron
30 3 * * * cd /opt/bloodborne-forum && scripts/backup.sh /opt/backups/forum >/dev/null 2>&1 && find /opt/backups/forum -name '*.gz' -mtime +14 -delete
```

Zusätzlich gehören `.env` und am besten eine Kopie der Backups auf einen anderen Rechner.

**Wiederherstellen** (bei laufendem Stack):

```bash
gunzip -c backups/db-XXXX.sql.gz | docker compose exec -T db sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"'
docker compose exec -T flarum tar -C /data -xzf - < backups/flarum-data-XXXX.tar.gz
docker compose restart flarum
```

Alternativ sicherst du die Volumes roh, bei gestopptem Stack:
`docker run --rm -v bloodborne-forum_db-data:/v -v "$PWD":/b alpine tar czf /b/db-volume.tgz -C /v .`
(analog für `bloodborne-forum_flarum-data`).

## Update

```bash
scripts/backup.sh
git pull                          # Änderungen an Theme und Skripten
# Neue Flarum-Version: FLARUM_IMAGE_TAG in .env anheben (z. B. 1.8.20)
docker compose pull
docker compose up -d --remove-orphans   # Migrationen laufen beim Start automatisch
scripts/setup-forum.sh            # Theme und Einstellungen erneut anwenden (optional)
```

- Die Erweiterungen stehen in `flarum/extensions.txt`. Bei jedem Start stellt
  `flarum/restore-extensions.sh` die Liste wieder her, und das Image installiert sie neu. Dafür
  braucht der Container Internet. Eigene Zusätze gehören in `flarum/extensions.local.txt`.
- MariaDB bleibt auf 10.11 (LTS). Patch-Updates kommen über `docker compose pull`.
- **Flarum 2.0:** Erst umsteigen, wenn ein 2.x-Image von crazymax erscheint und alle genutzten
  Erweiterungen stabil für 2.x verfügbar sind. Vorher eine Kopie testen, die du aus einem Backup
  wiederherstellst. 2.0 ist ein Major-Update mit eigenen Migrationen.

## Fehlersuche

- `docker compose logs -f flarum`; Flarum-Logs liegen in `/data/storage/logs`
  (`docker compose exec flarum ls /data/storage/logs`).
- Bei „Something went wrong“ vorübergehend `FLARUM_DEBUG: "true"` in `docker-compose.yml` setzen.
- Fehlen Icons oder Schriften oder klappen Logins nicht, passt `FORUM_URL` nicht zur aufgerufenen
  Adresse.
- Bei „Redirect URI mismatch“ von Discord weicht die Redirect-URL im Portal von
  `${FORUM_URL}/auth/discord` ab.
- `Pool overlaps with other one on this address space` beim Start: Das feste Forum-Netz
  `10.88.0.0/24` ist schon vergeben. In `.env` `FORUM_SUBNET` auf ein freies Netz setzen,
  z. B. `10.89.0.0/24`.
- „Flarum encountered a boot error“ direkt nach dem Installieren von Erweiterungen: Der PHP-Cache
  kennt die neuen Dateien noch nicht. `docker compose up -d --force-recreate flarum` und danach
  `scripts/setup-forum.sh`. Das aktuelle `install-extensions.sh` macht das schon selbst.
- **Erweiterungen „not installed“** nach einem Neustart oder Update: `docker compose up -d
  --force-recreate flarum`. Beim Start wird die Liste aus `flarum/extensions.txt`
  wiederhergestellt und neu installiert (dauert 1–2 Minuten). Danach `scripts/setup-forum.sh`.
  Zum Neustarten des Forums lieber `docker compose up -d --force-recreate flarum` als
  `docker compose restart` verwenden.
- **„circular_dependencies“** beim Ein- oder Ausschalten einer Erweiterung (Admin oder
  `setup-forum.sh`): Zwei Erweiterungen nennen sich gegenseitig als Abhängigkeit, dann lehnt
  Flarum 1.8 jede Änderung ab. Bekannt sind FoF SEO 3.x und FoF Sitemap; `flarum/extensions.txt`
  legt SEO deshalb auf 2.x fest. `scripts/install-extensions.sh` und danach
  `scripts/setup-forum.sh` ausführen.
- **Erweiterungen schalten sich nach ein bis zwei Minuten wieder ab:** Es läuft noch der frühere
  `cron`-Container. Ihm fehlen die Erweiterungen, und Flarum entfernt sie dann bei jedem
  Scheduler-Lauf aus der Liste der aktivierten Erweiterungen. `docker compose up -d --remove-orphans`
  entfernt ihn, danach `scripts/setup-forum.sh`. Den Scheduler startet jetzt `flarum/scheduler.sh`
  im Forum-Container.
- **Host mit knappem RAM** (der Kernel beendet Prozesse, sichtbar mit `dmesg -T | grep -i "killed process"`):
  In `.env` `FORUM_OOM_SCORE_ADJ=-500` setzen und `docker compose up -d` ausführen. Dann beendet der
  Kernel zuerst andere Container statt Forum und Datenbank. Startet danach ein Container mit
  „Permission denied“ nicht, den Wert wieder auf `0` setzen.
