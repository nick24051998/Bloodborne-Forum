# Website (bbport.com)

Statische Projekt-Website zum Forum: Startseite, Installationsanleitung, FAQ, Changelog,
Impressum, Datenschutz. Gebaut mit [Astro](https://astro.build), gleicher Bloodborne-Look wie das
Forum, kein JavaScript im Browser, keine Cookies, keine externen Schriften.

Getestet mit Google Lighthouse (Handy und Desktop): SEO 100, Barrierefreiheit 100,
Best Practices 100, Performance 99–100.

## Texte bearbeiten

| Was | Datei |
|---|---|
| Name, Adresse, Discord-, Forum- und Download-Link, Google-Beschreibung | `site.config.mjs` |
| Startseite (Einleitung, Feature-Karten) | `src/pages/index.astro` (oben die Liste `features`, im Hero der Satz mit `TODO`) |
| Installationsanleitung und Systemanforderungen | `src/texts/install.md` |
| FAQ (Frage/Antwort-Liste oben in der Datei) | `src/texts/faq.md` |
| Changelog | `src/texts/changelog.md` |
| Impressum / Datenschutz | `src/texts/imprint.md`, `src/texts/privacy.md` |

Die `.md`-Dateien sind normaler Text (Markdown): `## Überschrift`, `**fett**`, `- Liste`,
`[Linktext](https://…)`. Oben zwischen den `---` stehen Titel und Beschreibung für Google.

**Ohne eigenen Rechner:** Datei auf GitHub öffnen, auf den Stift klicken, ändern, unten
„Commit changes“. Cloudflare baut die Seite danach in etwa einer Minute neu.

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

## Veröffentlichen mit Cloudflare Pages (kostenlos)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → Reiter
   **Pages** → **Connect to Git** → GitHub verbinden → dieses Repository auswählen.
2. Build-Einstellungen:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory (Advanced): `website`
   - Environment variable: `NODE_VERSION` = `22.22.0`
3. **Save and Deploy.** Nach etwa einer Minute ist die Seite unter `<projekt>.pages.dev` erreichbar.
4. Im Projekt unter **Custom domains** `bbport.com` hinzufügen, zusätzlich `www.bbport.com`.
   Liegt die Domain bei Cloudflare, legt Cloudflare den DNS-Eintrag selbst an.
5. Optional: Unter **Settings → Builds → Build watch paths** `website/*` eintragen. Dann baut
   Cloudflare nur neu, wenn sich die Website ändert, nicht bei Forum-Änderungen.

## Bei Google anmelden

1. [Google Search Console](https://search.google.com/search-console) → Property `bbport.com` (Typ
   *Domain*) hinzufügen → den angezeigten TXT-Eintrag in Cloudflare-DNS eintragen.
2. Unter **Sitemaps** `https://bbport.com/sitemap-index.xml` einreichen.
3. Für das Forum dasselbe mit `forum.bbport.com` und `https://forum.bbport.com/sitemap.xml`
   (kommt von der Forum-Erweiterung `fof/sitemap`).

## Technik (zur Info)

- Jede Seite hat einen eigenen Titel, eine eigene Beschreibung, einen Canonical-Link sowie eine
  Social-Vorschau für Discord, X und andere (`public/og-image.png`).
- Strukturierte Daten für Google: `WebSite` und `Organization`, auf der FAQ-Seite `FAQPage`.
- `sitemap-index.xml` und `robots.txt` werden beim Build automatisch erzeugt.
- Die Schriften Cinzel und Inter stehen unter der SIL Open Font License (`public/fonts/OFL-*.txt`).
