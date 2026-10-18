# Medien: Herkunft und Lizenzen

Alle Medien in `media/` sind gemeinfrei (CC0), vom Projekt selbst gestaltet oder für dieses Projekt mit
ChatGPT erzeugt. Eine Namensnennung ist rechtlich nicht nötig; sie steht hier trotzdem, damit
nachvollziehbar bleibt, woher jede Datei stammt.

## Pixel-Art des Discord-Servers

Vom Admin des Discord-Servers selbst gestaltet und für Forum und Website freigegeben. `media/brand.py`
und `media/logo.html` leiten daraus ab: Logo (`theme/logo.png`, `website/public/logo.png`), Favicons,
das Emblem der Website-Startseite (`website/public/emblem-frame.webp`) und das Vorschaubild
(`website/public/og-image.jpg`).

| Datei | Motiv |
|---|---|
| `brand/server-icon.png` | Server-Icon „BBPP“ (Jäger vor dem Blutmond) |
| `brand/invite-splash.webp` | Einladungs-Hintergrund: Pixel-Stadt bei Vollmond mit gerahmtem Emblem |

## Icons und Texturen

| Datei | Quelle | Lizenz |
|---|---|---|
| `icons/bell.svg` (Announcements) | [Pinhead Map Icons](https://github.com/waysidemapping/pinhead) (Quincy Morgan), Icon `bell` | CC0 1.0 |
| `icons/lamppost.svg` (Help & Support) | Pinhead, `lantern-lamppost` | CC0 1.0 |
| `icons/candle.svg` (Suggestions) | Pinhead, `candle-with-flame` | CC0 1.0 |
| `icons/tools.svg` (Mods & Patches) | Pinhead, `wrench-and-hammer` | CC0 1.0 |
| `icons/book.svg` (Guides) | Pinhead, `book-with-bookmark` | CC0 1.0 |
| `icons/crescent.svg` (The Hunter's Dream) | Pinhead, `crescent` | CC0 1.0 |
| `icons/droplet.svg`, `icons/key.svg` (Website) | Pinhead, `droplet`, `cast-iron-key-with-heart-shaped-handle` | CC0 1.0 |
| `icons/discord.svg` | [Simple Icons](https://simpleicons.org/), `discord` | CC0 1.0 (Marke: Discord Inc., Nutzung nach deren Brand Guidelines für Links zum Server) |
| `textures/grain.svg` | selbst erzeugt (SVG-Rauschfilter) | eigenes Werk, frei |

Bezogen über die Iconify-Pakete `@iconify-json/pinhead` und `@iconify-json/simple-icons` (npm),
deren Lizenzangaben mit den Projekten übereinstimmen.

Neue Icons: SVG nach `media/icons/` legen (nur CC0/Public Domain), Quelle hier eintragen und
`python3 media/build.py` ausführen. Das erzeugt `flarum/icons.less` (Klassen `bbicon bbicon-NAME`,
z. B. als Tag-Icon im Admin) und `website/src/lib/icons.js` (`<Icon name="NAME" />`).

## KI-generierte Bilder (für dieses Projekt mit ChatGPT erzeugt)

Prompts: ohne Bezug auf das Spiel, nur Stil (viktorianische Gotik, Nebel, Gaslaternen, Blutmond).
Nutzung nach den OpenAI-Nutzungsbedingungen frei; kein Material aus Bloodborne.

| Datei | Motiv | Verwendung |
|---|---|---|
| `images/forum-banner.webp` | Gasse mit Gaslaternen, Kathedralen und Blutmond | Forum-Willkommens-Banner |
| `images/website-hero.webp` | Skyline aus Dächern und Türmen im Nebel | Website-Startseite |
| `images/page-header.webp` | Kathedralen-Innenraum mit Mondlicht und Kerzen | Website-Unterseiten |
| `images/not-found.webp` | Friedhof mit Laterne unter dem Blutmond | Website-404 |
| `textures/stone.webp` | dunkle Steinmauer, Kanten nahtlos überblendet | Fußzeilen von Forum und Website |
