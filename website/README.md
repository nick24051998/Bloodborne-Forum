# Website

Statische Projekt-Website zum Forum: Startseite, Installationsanleitung, FAQ, Changelog,
Impressum, Datenschutz. Gebaut mit [Astro](https://astro.build), gleicher Bloodborne-Look wie das
Forum, kein JavaScript im Browser, keine Cookies, keine externen Schriften.

Getestet mit Google Lighthouse (Handy und Desktop): SEO 100, Barrierefreiheit 100,
Best Practices 100, Performance 99–100.

## Texte bearbeiten

| Was | Datei |
|---|---|
| Name, Adresse, Discord-, Forum- und Download-Link, Google-Beschreibung | `site.config.mjs` |
| Community-Seite (Forum/Discord, Hilfe-Hinweise) | `src/pages/community.astro` |
| Startseite (Einleitung, Feature-Karten) | `src/pages/index.astro` (oben die Liste `features`, im Hero der Satz mit `TODO`) |
| Installationsanleitung und Systemanforderungen | `src/texts/install.md` |
| „Will it run on my PC?“ (Grafikkarten, Prozessoren, Regeln) | `src/data/hardware.js` (neue Karte: eine Zeile ergänzen) |
| Galerie der Startseite (Texte, Reihenfolge; Bilder in `src/assets/showcase/`) | `src/texts/showcase.md` |
| FAQ (Frage/Antwort-Liste oben in der Datei) | `src/texts/faq.md` |
| Changelog (nur die Kurzfassungen; Version, Download und Liste aller Releases kommen automatisch von GitHub, siehe `scripts/fetch-releases.mjs`) | `src/texts/changelog.md` |
| Kontakt / Datenschutz | `src/texts/contact.md`, `src/texts/privacy.md` |

Die `.md`-Dateien sind normaler Text (Markdown): `## Überschrift`, `**fett**`, `- Liste`,
`[Linktext](https://…)`. Oben zwischen den `---` stehen Titel und Beschreibung für Google.

**Ohne eigenen Rechner:** Datei auf GitHub öffnen, auf den Stift klicken, ändern, unten
„Commit changes“. GitHub baut die Seite danach in etwa einer Minute neu.

**Was noch fehlt:** Alles mit `TODO` ist ein Platzhalter. Eine Liste bekommst du mit:

```bash
cd website && npm run todo
```

## Lokal ansehen (optional)

Voraussetzung: Node.js ab 22.22.

```bash
cd website
npm install
npm run dev        # http://localhost:4321, Änderungen erscheinen sofort
npm run build      # fertige Seite nach dist/
```

## Veröffentlichen mit GitHub Pages (kostenlos, ohne eigene Domain)

Die Website wird bei jedem Push auf `main` automatisch gebaut und veröffentlicht
(`.github/workflows/website.yml`). Einmalig einschalten:

1. Auf GitHub das Repository öffnen → **Settings** → links **Pages**.
2. Unter **Build and deployment → Source** die Option **GitHub Actions** wählen.
3. Oben im Repo **Actions** → links **Website** → **Run workflow** → **Run workflow**.
   Nach etwa einer Minute ist die Seite online:

   **https://nick24051998.github.io/Bloodborne-Forum/**

Voraussetzung: Das Repository ist öffentlich (bei privaten Repos braucht GitHub Pages ein
kostenpflichtiges Konto). Jede spätere Änderung an `website/` geht automatisch online.

Solange `forumUrl` und `discordUrl` in `site.config.mjs` leer sind, blendet die Website die
Forum- und Discord-Buttons aus. Links im Text zeigen auf die Seite `/community/`, die anzeigt, was
gerade verfügbar ist. So gibt es keine toten Links.

## Später: eigene Domain (z. B. bbport.com)

1. In `site.config.mjs` `url: 'https://bbport.com'` und `base: '/'` setzen, außerdem `forumUrl`
   und `discordUrl` eintragen. Committen.
2. GitHub → **Settings → Pages → Custom domain** → `bbport.com` → Save → **Enforce HTTPS**.
3. Beim Domain-Anbieter bzw. in Cloudflare-DNS die vier `A`-Einträge von GitHub Pages auf
   `bbport.com` setzen sowie `www` als `CNAME` auf `nick24051998.github.io` (die aktuellen
   IP-Adressen nennt GitHub in der Pages-Hilfe unter „Managing a custom domain“).

GitHub leitet die alten `github.io`-Adressen danach automatisch auf die Domain um. Die
Google-Platzierungen gehen also nicht verloren. Alternativ kannst du die Seite dann auch
über Cloudflare Pages ausliefern (Root directory `website`, Build `npm run build`,
Output `dist`, `NODE_VERSION=22.22.0`).

## Bei Google anmelden

1. [Google Search Console](https://search.google.com/search-console) → **Property hinzufügen** →
   Typ **URL-Präfix** → `https://nick24051998.github.io/Bloodborne-Forum/` → Bestätigung per
   **HTML-Tag**: den `<meta name="google-site-verification" …>`-Code kopieren und mir schicken
   (oder in `src/layouts/Base.astro` im `<head>` einfügen).
2. Unter **Sitemaps** `https://nick24051998.github.io/Bloodborne-Forum/sitemap-index.xml` einreichen.
3. Mit eigener Domain später dasselbe für `bbport.com` (Typ *Domain*, Bestätigung per DNS-Eintrag)
   und für das Forum (`https://forum.bbport.com/sitemap.xml`).

## Technik (zur Info)

- Jede Seite hat einen eigenen Titel, eine eigene Beschreibung, einen Canonical-Link sowie eine
  Social-Vorschau für Discord, X und andere (`public/og-image.jpg`, aus dem Einladungs-Hintergrund des Discord-Servers, erzeugt mit `python3 media/brand.py`).
- Strukturierte Daten für Google: `WebSite` und `Organization`, auf der FAQ-Seite `FAQPage`.
- `sitemap-index.xml` und `robots.txt` werden beim Build automatisch erzeugt.
- Die Schriften Cinzel und Inter stehen unter der SIL Open Font License (`public/fonts/OFL-*.txt`).
