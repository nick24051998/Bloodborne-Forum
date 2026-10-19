# Bild-Prompts für ChatGPT

Mit diesen Prompts erzeugt ChatGPT Medien im Stil der Community: für Discord, den Launcher, die
Website und das Forum. Führend ist der Stil des Siegels: klare, flache Formen mit geschwungenen,
kalligrafischen Kurven, harte Schattierung in zwei bis drei Tönen, Knochenweiß und Blutrot auf
dunklem Schiefergrau. Regeln für Farben, Schrift und das Siegel selbst stehen in
[`BRAND.md`](BRAND.md).

Die Prompts sind englisch, weil ChatGPT damit verlässlicher Bilder erzeugt.

## Einrichten (einmal)

1. In ChatGPT ein **Projekt** anlegen (z. B. „BBPP Medien“) und den Stil-Brief (Teil 1) in die
   **Projekt-Anweisungen** kopieren. Jeder Chat in diesem Projekt hält sich dann daran.
   Sollen auch andere (Mods, Helfer) Bilder erzeugen, statt des Projekts einen **eigenen GPT**
   anlegen (GPTs → Erstellen): Teil 1 als Anweisungen, die Referenzbilder als Wissen, dann den Link
   teilen.
2. Als **Projekt-Dateien** hochladen: das Siegel (`media/brand/sigil.png`) und, sobald es sie gibt,
   ein bis zwei fertige Bilder in diesem Stil. Je mehr gute Beispiele, desto einheitlicher wird es.

## Arbeiten

1. Pro Bild den Auftrag (Teil 2) ausfüllen oder eine Vorlage aus Teil 3 nehmen.
2. Erst Varianten als Raster anfordern, dann den Favoriten einzeln ausarbeiten lassen.
3. **Nur einen Teil ändern:** Bild anklicken, mit dem Auswahl-Werkzeug (Pinsel oben) den Bereich
   markieren und die Änderung beschreiben. Ohne Auswahl zeichnet ChatGPT das ganze Bild neu und
   verändert nebenbei anderes.
4. Driftet ChatGPT ab (Verläufe, gemalte Textur, zu bunt), antworten:
   „Stick to the style guide: flat shapes, hard-edged shading, palette.“
5. Das fertige Bild als PNG herunterladen (nicht das Vorschaubild im Chat), auf Endgröße bringen
   (Tabelle unten) und vor der Nutzung prüfen (Teil 4).

## Teil 1: Stil-Brief

```text
You are the art director of "BBPP", the community (Discord, forum, website) around a free,
open-source PC port of a gothic action game. You create all of its media: Discord graphics,
launcher artwork, website and forum images, icons. Apply this style guide to every image in this
project, even when a request doesn't repeat it.

REFERENCE
The attached sigil (a chalice merged with a blade, a crescent moon floating in blood) defines
the style: shapes, shading and colors. Match it. Do not put the sigil itself into an image
unless I ask for it.

WORLD AND MOOD
An original, nameless Victorian gothic city at night: steep slate roofs, spires, chimneys,
cathedral silhouettes, iron fences, gas lamps, wet cobblestone, fog in the streets, a large pale
full moon. Quiet, melancholic, slightly threatening. Atmosphere over action: no fights, no
monsters in view, no gore.

STYLE
A flat graphic illustration in the style of the sigil. Bold, clean shapes with smooth
calligraphic curves: thick and thin, pointed ends, curved hooks. Hard-edged cel shading in 2 to 3
flat tones per color, light from the top left. Depth comes from layered silhouettes: the
foreground darkest, farther layers lighter through fog, each layer one flat tone, fog as flat
bands. Few shapes, little detail, crisp edges. No smooth gradients, no texture or noise, no
painterly brush marks, no outlines, no glow, no photorealism, no 3D render look, no pixel art.

PALETTE (use these and shades in between, nothing else)
- Night and stone, cold desaturated slate: #0a0d12 #0f1317 #14191d #181e22 #1e272a #242c2e
  #2b2e2f #333b3c
- Fog and lit stone: #828275
- Bone and moonlight: base #e4d9bd, highlight #f3ecd9, shadow #a99d80 (never pure white)
- Blood: base #8a1118, highlight #c22a30, shadow #5a0a10
- Lamp light and brass, small spots only: #bc9570 #9c8458 #c2a878
- Scenes are about 85% dark. Blood red is an accent in scenes (at most about 5%); icons and
  emblems may use more.
- Avoid pure black, pure white, saturated blue, purple, green, orange sunset skies and neon.

COMPOSITION
- Keep the areas I name free (for text, buttons or overlays): dark, calm, no fine detail.
- Main subject on the opposite side; low horizon; strong silhouettes.
- Let the bottom edge fade into dark #0d0e10, the background of our pages, unless I say otherwise.
- Nothing important in the outer 10% of the image.

USES (compose for the final crop; you generate 1536x1024, 1024x1024 or 1024x1536)
- Discord server banner: 16:9; the server name sits over the top left.
- Discord invite background: 16:9; the invite card covers the center, put the subject at the sides.
- Discord event cover: 5:2; subject in the middle band.
- Discord announcement image: 16:9 or 2:1.
- Role icon, emoji: square, one bold shape that reads at 20 px, no background detail.
- Sticker: square, one subject with a clear silhouette on a flat background.
- Launcher background: 16:9; keep the areas I name free for the launcher's buttons and text.
- Website hero: text on the left; website page header: very wide (about 5:1), motif in the
  right third; link preview: 1.91:1, important parts in the center.
- Forum banner: very wide, title in the center, important parts in the upper half.
- Icon sets: one icon per grid cell, same stroke weight, shading and size in every icon.
- Textures: seamless on all four sides, even lighting, no vignette, no focal point.

ORIGINAL WORK ONLY (strict)
- Do not recreate anything from Bloodborne or any other FromSoftware or Sony game: no logos or
  title lettering, no Hunter's Mark, Caryll runes or other symbols, no recognizable locations,
  no characters, no outfits (tricorn hat with long coat and face mask), no weapons (saw blades,
  cleavers, scythes, cane swords, transforming weapons), no bosses, creatures, items or UI.
- Never put game titles or "in the style of <game>" into the image prompt.
- Generic genre elements are fine: gothic architecture, gas lamps, moon, fog, chalices, bells,
  candles, simple blades, cloaked figures far in the distance.
- No letters, runes from real alphabets, crosses or plus signs, religious or political symbols.
- No text, numbers, signatures, watermarks, frames or borders unless I ask for them.
- No people in the foreground; at most tiny silhouettes far away.

WORKING
- One image per request unless I ask for variants; variants as a grid.
- If a request breaks these rules, say so and suggest an alternative instead of ignoring a rule.
```

## Teil 2: Auftrag

```text
New image:
- Use: [e.g. Discord banner / launcher background / website hero / role icon set]
- Subject: [what to show]
- Keep free: [where text, buttons or overlays go, or "nothing"]
- Format: [landscape / square / portrait]
- Variants: [1 / 4 as a 2x2 grid / 6 as a 3x2 grid]
- Extra: [optional, e.g. "red moon", "rain", "no moon", "include the sigil"]
```

## Teil 3: Vorlagen

### Discord

**Serverbanner** (über der Kanalliste, der Servername liegt oben links darüber)

```text
New image:
- Use: Discord server banner
- Subject: a street of the city with gas lamps leading toward a cathedral, moon behind it.
- Keep free: top left
- Format: landscape
- Variants: 4 as a 2x2 grid
```

**Einladungshintergrund** (hinter der Einladungskarte)

```text
New image:
- Use: Discord invite background
- Subject: wide view over the rooftops at night, cathedral spires on the left and right, large
  moon low in the sky, fog between the houses.
- Keep free: center
- Format: landscape
```

**Event-Titelbild** (z. B. Koop-Abend, Release, Stream)

```text
New image:
- Use: Discord event cover
- Subject: [e.g. two lanterns meeting in the fog for a co-op night / a bell tower ringing for a
  new release]
- Keep free: nothing
- Format: landscape
- Variants: 4 as a 2x2 grid
```

**Ankündigungsbild** (für Posts in #announcements; Text kommt in die Nachricht, nicht ins Bild)

```text
New image:
- Use: Discord announcement image
- Subject: [the topic as one simple scene, e.g. a lit window in a dark tower for "new update"]
- Keep free: nothing
- Format: landscape
```

**Rollen-Icons** (als Set, damit alle zusammenpassen)

```text
New image:
- Use: role icon set
- Subject: 6 role icons, one per cell: [Admin: a chalice / Moderator: a lantern / Helper: a
  bell / Developer: a hammer and a key / Hunter (member): a crescent moon / Booster: a drop of
  blood]
- Keep free: nothing
- Format: square
- Variants: 1 set as a 3x2 grid
```

**Emojis** (als Set)

```text
New image:
- Use: emoji set
- Subject: 6 emojis, one per cell: [a raised chalice (cheers) / a ringing bell (help is
  coming) / a lantern (taking a break) / a crescent moon (good night) / a cracked chalice
  (crash) / a blood drop with a tiny smile (gg)]
- Keep free: nothing
- Format: square
- Variants: 1 set as a 3x2 grid
```

**Sticker**

```text
New image:
- Use: sticker
- Subject: [one subject, e.g. a chalice spilling blood, tipped over dramatically]
- Keep free: nothing
- Format: square
```

### Launcher

Maße und die Bereiche, in denen Knöpfe und Text liegen, vom Launcher übernehmen und unter
„Keep free“ eintragen.

**Hintergrund**

```text
New image:
- Use: launcher background
- Subject: the city at night seen from a cathedral roof, moon on the right, fog in the streets.
- Keep free: [e.g. the left third for the menu and the bottom strip for the play button]
- Format: landscape
- Variants: 4 as a 2x2 grid
```

**News-Bild** (Kachel für Neuigkeiten oder ein Update)

```text
New image:
- Use: launcher news image
- Subject: [the topic as one simple motif, e.g. a key turning in an old gate for "new version"]
- Keep free: bottom third (for the headline)
- Format: landscape
```

### Website

Die freien Bereiche passen zu den Abdunklungen in `website/src/styles/global.css`.

**Startseite** (`images/website-hero.webp`, Text links, Emblem rechts darüber)

```text
New image:
- Use: website hero
- Subject: skyline of roofs, towers and a cathedral along the bottom third, night sky with the
  moon above. Keep the sky on the right calm too, an emblem sits on top of it.
- Keep free: left half
- Format: landscape
```

**Unterseiten-Kopf** (`images/page-header.webp`, sehr breiter Ausschnitt)

```text
New image:
- Use: website page header
- Subject: [one motif, e.g. a lamp-lit doorway / a tall cathedral window / a bookshelf by
  candlelight] in the right third, vertically centered.
- Keep free: left two thirds
- Format: landscape
```

**404-Seite** (`images/not-found.webp`)

```text
New image:
- Use: website page header
- Subject: a dead-end alley with a single gas lamp in the right third, fog on the ground, the
  feeling of being lost.
- Keep free: left half
- Format: landscape
```

**Link-Vorschau** (Bild, das Discord, Reddit usw. beim Teilen eines Links zeigen)

```text
New image:
- Use: link preview
- Subject: the sigil from the reference, large and centered, above a dark city skyline with
  fog.
- Keep free: nothing
- Format: landscape
- Extra: include the sigil
```

### Forum

Die freien Bereiche passen zu den Abdunklungen in `theme/custom.less`.

**Banner** (`images/forum-banner.webp`, Titel mittig, sehr breiter Ausschnitt)

```text
New image:
- Use: forum banner
- Subject: wide panorama of the city at night from a rooftop, spires and chimneys on the left
  and right, moon in the upper right. The lower half is fog that fades to dark.
- Keep free: center
- Format: landscape
```

**Kategorie-Icons** (als Set; im Forum einfarbig, deshalb nur eine Farbe)

```text
New image:
- Use: icon set
- Subject: 6 category icons, one per cell, each a single flat pale bone shape without
  shading: [Announcements: a bell / Help & Support: a lantern / Suggestions: a candle / Mods &
  Patches: a hammer and a key / Guides: an open book / The Hunter's Dream: a crescent moon]
- Keep free: nothing
- Format: square
- Variants: 1 set as a 3x2 grid
```

### Texturen

```text
New image:
- Use: texture
- Subject: [dark stone wall / wet cobblestone / old patterned wallpaper], seen straight on.
- Keep free: nothing
- Format: square
```

## Endgrößen

ChatGPT erzeugt nur 1536 × 1024, 1024 × 1024 und 1024 × 1536; das Bild wird danach zugeschnitten.

| Medium | Endgröße | Format bei ChatGPT |
|---|---|---|
| Discord-Server-Icon | 1024 × 1024 PNG (mindestens 512) | quadratisch |
| Discord-Serverbanner | 960 × 540 | quer |
| Discord-Einladungshintergrund | 1920 × 1080 | quer |
| Discord-Event-Titelbild | 800 × 320 | quer |
| Discord-Rollen-Icon | 64 × 64 PNG, höchstens 256 KB | quadratisch (Set) |
| Discord-Emoji | 128 × 128 PNG, höchstens 256 KB | quadratisch (Set) |
| Discord-Sticker | 320 × 320 PNG, höchstens 512 KB | quadratisch |
| Launcher | nach Vorgabe des Launchers | quer |
| Website-Startseite, Forum-Banner | 1536 × 1024 WebP | quer |
| Website-Unterseiten-Kopf, 404 | 1920 × 720 WebP | quer |
| Link-Vorschau | 1200 × 630 JPG | quer |
| Texturen | 640 × 640 WebP, nahtlos | quadratisch |

## Teil 4: Prüfen vor der Nutzung

- **Spiel:** keine Ähnlichkeit mit Symbolen, Waffen, Orten oder Figuren aus Bloodborne
  (Hunter-Zeichen, Caryll-Runen, Säge, Sense, Stockschwert, bekannte Schauplätze usw.).
- **Runen:** einige Runenformen sind in Deutschland Kennzeichen verbotener Organisationen
  (§ 86a StGB).
- **Rotes Kreuz:** auch ähnliche Zeichen (rotes Kreuz oder Plus auf hellem Grund) sind geschützt
  (§ 125 OWiG).
- **Text im Bild:** ChatGPT verschreibt sich gern; Text besser in die Nachricht oder in die Seite
  setzen.

Rein KI-erzeugte Bilder sind in Deutschland und den USA in der Regel nicht urheberrechtlich
geschützt; andere dürften sie also kopieren. Wer ein Bild schützen will, überarbeitet es selbst
sichtbar, dann ist es ein eigenes Werk. Herkunft jedes Bildes in `CREDITS.md` eintragen.

## Das Siegel: so ist es entstanden

Dieselben Schritte taugen für weitere Zeichen.

Schritt 1, Entwürfe (Kelch, Mond und Nahkampfwaffe kombiniert):

```text
New image: 4 original sigils in a 2x2 grid. Used as Discord server icon, favicon and forum logo.

Style: the mystical sign of an old hunters' guild in a Victorian gothic city. Bold, organic
brush strokes, thick and thin, curved hooks, like occult calligraphy in pale ink. Abstract,
not a picture.

Elements: a chalice, a moon and a melee weapon (a simple blade, dagger or sickle). Play with
them and combine them differently in each sigil, for example:
- the crescent moon forms the bowl of the chalice
- the blade forms the stem of the chalice
- the moon rests inside the chalice like in a gate
Merge the elements into one sign instead of placing three objects next to each other.

Form:
- 3 to 6 strokes, upright, compact, fits inside a circle with margin.
- Recognizable as a silhouette at 48x48 px: thick strokes, open spaces, no fine detail.
- Flat pale bone #e4d9bd on dark slate #0f1317. No texture, no glow, no frame.

Originality (strict):
- Must not resemble the Hunter's Mark, any Caryll rune, or any symbol, logo or item from
  Bloodborne or other games.
- Generic weapon only: no serrated saw blades, no cleavers, no scythes, no cane swords, no
  weapons that transform.
- The weapon must not form a cross (no straight crossguard). No crescent with a star.
- No letters, no runes from real alphabets, no religious or political symbols, no text.
```

Schritt 2, Farbe, Schattierung und Bewegung (im selben Chat):

```text
Keep this exact sigil shape, every stroke and proportion unchanged.
Make 6 variants in a 3x2 grid, playing with two things:

Blood (alive, never a flat bar):
- a wavy brush-stroke surface with movement, as if the chalice was just moved
- blood spilling over the rim, with one or two thick drips running down the outside
- blood rising in a curling wave on one side

Shading:
- the bone-colored shape gets cel shading with hard edges in 3 tones: highlight #f3ecd9,
  base #e4d9bd, shadow #a99d80, light from the top left, like carved bone or old ivory
- the blood gets 3 tones too: highlight #c22a30, base #8a1118, shadow #5a0a10

Rules for all:
- No gradients, no glossy shine, no 3D render look, no glow: flat tones with crisp edges.
- Still readable at 48x48 px: few, thick shapes.
- Flat dark slate background #0f1317. No text, no frame.
```

Schritt 3, Feinschliff mit dem Auswahl-Werkzeug (nur das Blut markiert):

```text
In the selected area only, fix the blood physics. The blood is one connected liquid and the
moon floats in it, so the surface runs continuously behind the moon, with no jumps in height
at the moon's edges. The chalice was just tilted, so the whole surface slopes: highest on the
side of the wave, lowest on the other side. Same three red tones, same cel shading. Nothing
outside the selection changes.
```
