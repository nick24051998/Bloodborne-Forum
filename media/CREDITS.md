# Medien: Herkunft und Lizenzen

Alle Medien in `media/` sind gemeinfrei (Public Domain, CC0) oder selbst erzeugt. Eine
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
| `textures/fog.webp` | selbst erzeugt mit `media/build.py` (Zufallsrauschen) | eigenes Werk, frei |
| `textures/grain.svg` | selbst erzeugt (SVG-Rauschfilter) | eigenes Werk, frei |

Bezogen über die Iconify-Pakete `@iconify-json/pinhead` und `@iconify-json/simple-icons` (npm),
deren Lizenzangaben mit den Projekten übereinstimmen.

Neue Icons: SVG nach `media/icons/` legen (nur CC0/Public Domain), Quelle hier eintragen und
`python3 media/build.py` ausführen. Das erzeugt `flarum/icons.less` (Klassen `bbicon bbicon-NAME`,
z. B. als Tag-Icon im Admin) und `website/src/lib/icons.js` (`<Icon name="NAME" />`).

## Radierungen und Lithografien (Art Institute of Chicago, Open Access)

Gemeinfreie Werke, vom Museum unter CC0 1.0 bereitgestellt. `media/artworks.py` lädt sie über die
offizielle API, prüft `is_public_domain`, schneidet sie zu und wandelt die Striche in mondgraue,
transparente Linien um.

| Datei | Werk | Lizenz |
|---|---|---|
| `artworks/notre-dame-apse.webp` (Forum-Banner) | Charles Meryon, [The Apse of Notre-Dame, Paris](https://www.artic.edu/artworks/28755), 1854 | Public Domain / CC0 1.0 |
| `artworks/pier-with-lamp.webp` (Website-Start) | Giovanni Battista Piranesi, [The Pier with a Lamp, Imaginary Prisons, Tafel 15](https://www.artic.edu/artworks/7380), 1761 | Public Domain / CC0 1.0 |
| `artworks/gothic-arch.webp` (Website-Unterseiten) | Giovanni Battista Piranesi, [The Gothic Arch, Imaginary Prisons, Tafel 14](https://www.artic.edu/artworks/7377), 1761 | Public Domain / CC0 1.0 |
| `artworks/graveyard-moonlight.webp` (Website-404) | Carl Blechen, [Church and Graveyard in the Snow by Moonlight](https://www.artic.edu/artworks/148401), 1827 | Public Domain / CC0 1.0 |
