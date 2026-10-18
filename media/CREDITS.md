# Medien: Herkunft und Lizenzen

Alle Medien in `media/` sind gemeinfrei (CC0 bzw. Unlicense) oder selbst erzeugt. Eine
Namensnennung ist rechtlich nicht nötig; sie steht hier trotzdem, damit nachvollziehbar bleibt,
woher jede Datei stammt.

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
| `images/forum-banner.webp` (Forum-Banner) | für dieses Projekt mit ChatGPT (OpenAI) erzeugt, gotische Stadt unter dem Blutmond | KI-generiert; Nutzung nach den OpenAI-Nutzungsbedingungen frei |
| `textures/fog.webp` | selbst erzeugt mit `media/build.py` (Zufallsrauschen) | eigenes Werk, frei |
| `textures/grain.svg` | selbst erzeugt (SVG-Rauschfilter) | eigenes Werk, frei |

Bezogen über die Iconify-Pakete `@iconify-json/pinhead` und `@iconify-json/simple-icons` (npm),
deren Lizenzangaben mit den Projekten übereinstimmen.

Neue Icons: SVG nach `media/icons/` legen (nur CC0/Public Domain), Quelle hier eintragen und
`python3 media/build.py` ausführen. Das erzeugt `flarum/icons.less` (Klassen `bbicon bbicon-NAME`,
z. B. als Tag-Icon im Admin) und `website/src/lib/icons.js` (`<Icon name="NAME" />`).
