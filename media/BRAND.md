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
Siegel ist ein eigenes Werk und kein Symbol aus dem Spiel. Seit dem 19.10.2026 gilt die gemeißelte
Fassung: Knochen mit abgeschrägten Facetten, Schiefer in den Vertiefungen, feine Steinstruktur.

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
  Einzige Ausnahme: der Auftritt auf der Startseite (leerer Kelch, der sich füllt, kurzes rotes Pochen;
  siehe Bewegung). Danach steht das Siegel unverändert da.
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

Illustrationen im Stil des Siegels: Formen wie aus altem Knochen und Stein gemeißelt, mit
kalligrafischen Kurven, abgeschrägten Facetten und harter Schattierung in drei bis vier Tönen,
Schiefer in Rillen und Vertiefungen, feine Steinstruktur ohne Schmutzeffekte. Tiefe durch
Silhouetten-Ebenen und Nebel. Motive aus einer eigenen, namenlosen viktorianischen Stadt bei
Nacht. Keine Fotos, kein Glanz, keine sichtbaren Pinselstriche, keine 3D-Renderoptik, keine
Pixel-Art, kein Material aus dem Spiel. Kleine Icons und Emojis vereinfacht (zwei Facettentöne,
keine Struktur); die Forum-Kategorie-Icons bleiben flach und einfarbig. Prompts und Endgrößen:
`PROMPTS.md`.

## Bewegung

Langsam und schwer wie die Welt des Spiels, wenige Effekte mit klarer Aufgabe.

- Höchstens eine Daueranimation pro Ansicht (Ausnahme: die kleine Laterne als Statusanzeige).
- Tempo: Interaktion 150 bis 250 ms, Auftritte 600 bis 900 ms, Atmosphäre 30 bis 110 Sekunden.
  Ausnahme: der Auftritt des Siegels auf der Startseite, gut 5 Sekunden mit gleichmäßiger Kurve, damit
  man ihn überhaupt wahrnimmt. Zwei Nebelbänke liegen über dem Siegel; es wird dahinter sichtbar und
  scharf, die Bänke ziehen auseinander. Dann steigt das Blut mit schwappender Oberfläche in den leeren
  Kelch, und das Siegel schlägt zweimal wie ein Herz (kurz größer, rot glühend).
- Eine Kurve für alles: `cubic-bezier(0.2, 0.7, 0.1, 1)`, schneller Start, langes Auslaufen. Kein Federn,
  kein Hüpfen.
- Nur Position und Deckkraft animieren, keine Unschärfe auf großen Flächen.
- „Bewegung reduzieren“ im System schaltet alles ab außer der Ladeanzeige.
- Nichts schneller als 3 Wechsel pro Sekunde; nichts aus dem Spiel nachbauen.

Im Einsatz:

| Bewegung | Website | Forum |
|---|---|---|
| Ziehender Nebel (`media/textures/fog.svg`) | Kopfbilder | Willkommens-Banner |
| Tiefe beim Scrollen | Kopfbild der Startseite | – |
| Laterne flackert | Live-Abschnitt (wenn eingeschaltet) | Hunter's-Dream-Kasten |
| Blut füllt den Knopf | Haupt- und Rahmenknöpfe | Hauptknöpfe |
| Messinglinie | Menü und Fußzeile | Website-Links im Kopf |
| Karte hebt sich | Karten | Themenliste |
| Seitenwechsel ins Dunkle | alle Seiten | – (das Forum lädt nicht neu) |
| Siegel taucht aus dem Nebel auf, Kelch füllt sich, Herzschlag | Startseite, beim Laden | – |
| Abschnitte erscheinen | Abschnitte der Startseite | – |
| Zahlen zählen hoch | – | Hunter's-Dream-Kasten |
| Blutstropfen als Ladeanzeige | – | überall |
| Neuer Beitrag pulsiert | – | nach dem Antworten |
| Beste Antwort glüht auf | – | markierter Beitrag |

Zum Ausprobieren gibt es eine Demo-Seite (Bewegungsstudie, als Artifact geteilt).

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
