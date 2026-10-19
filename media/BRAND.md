# Markenhandbuch

Wie die Community nach außen aussieht: Name, Siegel, Farben, Schrift, Bilder, Ton. Neue Bilder
mit ChatGPT: [`PROMPTS.md`](PROMPTS.md). Herkunft aller Medien: [`CREDITS.md`](CREDITS.md).

## Name

- Voll: **Bloodborne PC Port Community**, kurz **BBPP**.
- „Bloodborne“ nur beschreibend nennen (wofür die Community da ist), nie als eigenes Logo oder im
  Schriftzug des Spiels.
- Wo es passt, der Hinweis: *Not affiliated with or endorsed by Sony Interactive Entertainment or
  FromSoftware.*

## Siegel

Kelch und Klinge in einer Form, darin eine Mondsichel, die in Blut schwimmt. Der Kelch steht für
die Gemeinschaft, die Klinge für die Jagd, Mond und Blut für die Nacht in der alten Stadt. Das
Siegel ist ein eigenes Werk und kein Symbol aus dem Spiel.

Einsatz: Discord-Server-Icon, Favicon, Forum- und Website-Logo, Link-Vorschau.

Dateien: `media/brand/sigil.png` (Original, auch Stilreferenz für ChatGPT),
`media/brand/sigil-cutout.png` (freigestellt), `media/brand/discord-icon.png` (zum Hochladen in
Discord). Neu erzeugen nach einer Änderung am Original: `python3 media/brand.py`, dann
`node media/render-logo.cjs` (Logo und Vorschaubild).

- Immer auf dunklem Grund (#0f1317 oder dunkler). Auf hellen Flächen oder unruhigen Bildern nur
  auf einer dunklen runden Platte.
- Ringsum frei lassen: mindestens ein Viertel der Siegelbreite.
- Kleinste Größe: 24 px hoch. Darunter (Favicon 16 px) die runde Fassung mit Platte nehmen.
- Nicht umfärben, verzerren, drehen, beschneiden; keine Effekte (Leuchten, Schatten, Verlauf).
- Nicht mit Symbolen aus dem Spiel kombinieren (Hunter-Zeichen, Runen, Waffen).

## Farben

Oberflächen (Website und Forum; die Werte stehen in `website/src/styles/global.css` und
`theme/custom.less`):

| Rolle | Wert | Einsatz |
|---|---|---|
| Hintergrund tief | `#08090a` | Kopf- und Fußzeile |
| Hintergrund | `#0d0e10` | Seite |
| Karte | `#16171a` | Kästen, Beiträge |
| Rahmen | `#25272b` | Linien, Ränder |
| Text | `#d9d4ca` | Fließtext |
| Text hervorgehoben | `#ece7dd` | Überschriften |
| Text gedämpft | `#8a8c90` | Nebeninfos |
| Messing hell | `#c2a878` | Links, Fokus |
| Messing | `#9c8458` | Linien, Zierrat |
| Blut | `#8a1118` | Knöpfe, Markierungen |
| Blut hover | `#a3161e` | Knöpfe beim Überfahren |

Blutrot ist eine Flächenfarbe, keine Textfarbe: Als Schrift auf dunklem Grund ist der Kontrast zu
gering (2:1). Heller Text auf Blutrot ist gut lesbar (7,8:1).

Bilder und Zeichen (Palette aus `PROMPTS.md`):

| Rolle | Werte |
|---|---|
| Nacht und Stein | `#0a0d12` `#0f1317` `#14191d` `#181e22` `#1e272a` `#242c2e` `#2b2e2f` `#333b3c` |
| Nebel | `#828275` |
| Knochen und Mondlicht | `#e4d9bd`, Licht `#f3ecd9`, Schatten `#a99d80` |
| Blut | `#8a1118`, Licht `#c22a30`, Schatten `#5a0a10` |
| Laternenlicht und Messing | `#bc9570` `#9c8458` `#c2a878` |

Szenen sind zu etwa 85 % dunkel; Rot ist dort nur Akzent.

## Schrift

- **Cinzel** für Überschriften und Schriftzüge, gern in Versalien mit etwas Sperrung.
- **Inter** für Fließtext und Oberflächen.
- Beide unter der SIL Open Font License, selbst gehostet (`website/public/fonts/`).

## Bilder

Flache Illustrationen im Stil des Siegels: klare Formen mit kalligrafischen Kurven, harte
Schattierung in zwei bis drei Tönen, Tiefe durch Silhouetten-Ebenen und Nebel. Motive aus einer
eigenen, namenlosen viktorianischen Stadt bei Nacht. Keine Fotos, keine gemalten oder 3D-Bilder,
keine Pixel-Art, kein Material aus dem Spiel. Prompts und Endgrößen: `PROMPTS.md`.

## Icons

Einfarbig, flach, gleiche Strichstärke in einem Set. Heute: CC0-Icons (`media/icons/`, Quellen in
`CREDITS.md`); eigene Sets nach der Vorlage „Kategorie-Icons“ in `PROMPTS.md`.

## Ton

- Öffentliche Texte auf Englisch, kurz und freundlich, ohne Fachjargon.
- Ehrlich bei Fehlern und bekannten Problemen.
- Keine Hilfe bei Raubkopien: Das Spiel muss man selbst besitzen.

## Rechtliches

- Nichts aus dem Spiel übernehmen: kein Logo, keine Runen, keine Item- oder Waffen-Icons, keine
  Figuren, keine Screenshots oder Artworks ohne Erlaubnis.
- Den Namen nur beschreibend verwenden („für Bloodborne“).
- Runenformen und Kreuze meiden (§ 86a StGB, § 125 OWiG).
- KI-erzeugte Bilder sind in der Regel nicht urheberrechtlich geschützt; wichtige Motive selbst
  überarbeiten.
