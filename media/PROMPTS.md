# Bild-Prompts für ChatGPT

Wiederverwendbare Designrichtung für neue Bilder (Forum, Website, Discord). Führend ist der Stil des
Siegels: klare, flache Formen mit geschwungenen, kalligrafischen Kurven, harte Schattierung in zwei
bis drei Tönen, Knochenweiß und Blutrot auf dunklem Schiefergrau. Teil 1 legt den Stil einmal fest,
Teil 2 ist der kurze Auftrag pro Bild. Die Prompts sind englisch, weil ChatGPT damit verlässlicher
Bilder erzeugt.

## So geht's

1. In ChatGPT ein Projekt anlegen (z. B. „BBPP Bilder“) und Teil 1 in die **Projekt-Anweisungen**
   kopieren. Ohne Projekt: Teil 1 als erste Nachricht in einen neuen Chat.
2. Das Siegel als **Projekt-Datei** hochladen. Es ist die Stilreferenz für Formen, Schattierung und
   Farben (Teil 1 sagt ChatGPT, dass es das Siegel selbst nicht in Bilder einbaut).
3. Pro Bild Teil 2 ausfüllen oder eine Vorlage unten nehmen.
4. Driftet ChatGPT ab (zu bunt, Verläufe, gemalte Textur), antworten: „Stick to the style guide:
   flat shapes, hard-edged shading, palette.“
5. Nur einen Teil ändern: Bild anklicken, mit dem Auswahl-Werkzeug (Pinsel oben) den Bereich
   markieren und die Änderung beschreiben. Sonst zeichnet ChatGPT das ganze Bild neu und verändert
   nebenbei anderes.
6. Fertige Bilder ins Repo geben: Zuschnitt, Farben prüfen, WebP, Eintrag in `CREDITS.md`.

## Teil 1: Stil-Brief

```text
You are the art director for "BBPP", a fan community (forum, website, Discord) around a free,
open-source PC port of a gothic action game. You create images for it. Apply this style guide to
every image in this project, even when a later request doesn't repeat it.

WORLD AND MOOD
An original, nameless Victorian gothic city at night: steep slate roofs, spires, chimneys,
cathedral silhouettes, iron fences, gas lamps, wet cobblestone, fog in the streets, a large pale
full moon. Quiet, melancholic, slightly threatening. Atmosphere over action: no fights, no
monsters in view, no gore.

STYLE
A flat graphic illustration in the style of the attached sigil (shapes, shading, colors). Do not
put the sigil itself into images unless I ask. Bold, clean shapes with smooth calligraphic curves:
thick and thin, pointed ends, curved hooks. Hard-edged cel shading in 2 to 3 flat tones per
color, light from the top left. Depth comes from layered silhouettes: the foreground darkest,
farther layers lighter through fog, each layer one flat tone, fog as flat bands. Few shapes,
little detail, crisp edges. No smooth gradients, no texture or noise, no painterly brush marks,
no outlines, no glow, no photorealism, no 3D render look, no pixel art.

PALETTE (use these and shades in between, nothing else)
- Night and stone, cold desaturated slate with a slight blue-green tint:
  #0a0d12 #0f1317 #14191d #181e22 #1e272a #242c2e #2b2e2f #333b3c
- Fog and lit stone: #828275
- Moonlight and bone: #e4d9bd, highlight #f3ecd9, shadow #a99d80 (pale bone, not white)
- Lamp light, small warm spots only: #bc9570
- Brass details: #9c8458 #c2a878
- Blood red, rare accent only (at most about 5% of the image, e.g. a red moon or one lit
  window): base #8a1118, highlight #c22a30, shadow #5a0a10
- About 85% of every image is dark (#0a0d12 to #333b3c).
- Avoid pure black, pure white, saturated blue, purple, green, orange sunset skies and neon.

COMPOSITION
- Keep the text area I name calm and dark: no bright spots, no fine detail, low contrast.
- Put the main subject on the opposite side; low horizon; strong silhouettes.
- Let the bottom edge fade into dark #0d0e10, the background of the page the image sits on.
- Nothing important in the outer 10% of the image; it gets cropped.

ORIGINAL WORK ONLY (strict)
- Do not recreate anything from Bloodborne or any other FromSoftware or Sony game: no logos or
  title lettering, no Hunter's Mark, Caryll runes or other symbols from the game, no recognizable
  locations, no characters, no outfits (tricorn hat with long coat and face mask), no weapons,
  bosses, creatures or UI from the game.
- Never put game titles or "in the style of <game>" into the image prompt.
- Generic genre elements are fine: gothic architecture, gas lamps, moon, fog, cemeteries,
  candles, cloaked figures far in the distance.
- No text, letters, numbers, signatures, watermarks, frames or borders unless I ask for them.
- No people in the foreground; at most tiny silhouettes far away.

TECHNICAL
- Sizes: landscape 1536x1024 (banners and headers, I crop them to wide formats), square
  1024x1024 (emblems, icons, textures), portrait 1024x1536 (phones).
- Textures: seamless and tileable on all four sides, even lighting, no vignette, no focal point.
- Emblems and icons: one simple shape, centered, wide margin, readable at 48x48 px, on flat
  #0f1317 (or transparent if I ask).
- One image per request unless I ask for variants.
- If a request breaks these rules, say so and suggest an alternative instead of ignoring a rule.
```

## Teil 2: Bild-Auftrag

```text
New image:
- Use: [forum banner / website hero / page header / 404 / Discord banner / texture / emblem / other]
- Subject: [what to show]
- Text area: [left / right / center / top strip / none]
- Size: [1536x1024 / 1024x1024 / 1024x1536]
- Extra: [optional, e.g. "red moon", "rain", "no moon"]
```

## Vorlagen pro Einsatzort

Die Textbereiche passen zu den Overlays in `theme/custom.less` und `website/src/styles/global.css`.

**Forum-Banner** (`images/forum-banner.webp`, Titel mittig, sehr breiter Ausschnitt)

```text
New image:
- Use: forum banner
- Subject: wide panorama of the city at night from a rooftop, spires and chimneys on the left and
  right, moon in the upper right. Everything important in the upper half; the lower half is fog
  that fades to dark.
- Text area: center
- Size: 1536x1024
```

**Website-Startseite** (`images/website-hero.webp`, Text links, Emblem rechts darüber)

```text
New image:
- Use: website hero
- Subject: skyline of roofs, towers and a cathedral along the bottom third, night sky with the
  moon above. Keep the sky on the right calm too, a framed emblem sits on top of it.
- Text area: left
- Size: 1536x1024
```

**Unterseiten-Kopf** (`images/page-header.webp`, Ausschnitt etwa 5:1)

```text
New image:
- Use: page header
- Subject: [one motif, e.g. a lamp-lit doorway / a tall cathedral window / a bookshelf by
  candlelight] in the right third, vertically centered. The left two thirds are dark and calm.
- Text area: left
- Size: 1536x1024
```

**404-Seite** (`images/not-found.webp`)

```text
New image:
- Use: 404 page
- Subject: a dead-end alley or an empty cemetery path with a single gas lamp in the right third,
  fog on the ground, the feeling of being lost.
- Text area: left
- Size: 1536x1024
```

**Discord-Serverbanner** (Discord zeigt 960×540; der Servername liegt oben darüber)

```text
New image:
- Use: Discord banner
- Subject: street of the city with gas lamps leading toward a cathedral, moon behind it.
- Text area: top strip
- Size: 1536x1024
```

**Textur** (z. B. Fußzeile, Kartenhintergrund)

```text
New image:
- Use: texture
- Subject: [dark weathered stone wall / wet cobblestone / old patterned wallpaper], seen
  straight on.
- Text area: none
- Size: 1024x1024
```

**Zeichen / Server-Icon** (Discord-Icon, Favicon, Forum-Logo)

Ziel ist ein eigenes Siegel mit dem Wiedererkennungswert des Hunter-Zeichens: ein abstraktes
Zeichen aus wenigen Pinselstrichen, kein Bildchen. So ist das Siegel der Community entstanden
(Kelch und Klinge in einer Form, Mondsichel darin, Blut im Kelch); dieselben Schritte taugen für
weitere Zeichen, z. B. Rollen-Icons.

Schritt 1, Entwürfe (vier Ideen mit Bedeutung; sie spielen auf das Spiel an, ohne etwas daraus zu
übernehmen: Glocken rufen Mitspieler, Laternen sind Rastplätze, Einsicht hat mit Augen zu tun):

```text
New image: 4 original sigils for our community in a 2x2 grid, one per idea below. Used as Discord
server icon, favicon and forum logo.

Style of all four: the mystical sign of an old hunters' guild in a Victorian gothic city. Drawn
with 3 to 5 bold, organic brush strokes (thick and thin, curved hooks, one dot or drop), like
occult calligraphy in pale ink. Abstract, not a picture: the idea is only hinted at.

1. Resonance: a bell reduced to a few strokes; the sign that calls hunters to help each other.
2. Blood moon: a crescent and a single drop of blood.
3. Refuge: a lamp flame; the safe place where hunters rest.
4. Awakening: an arch or gate with an open eye inside.

Form:
- Upright, compact, fits inside a circle with margin.
- Still recognizable as a silhouette at 32x32 px: thick strokes, open spaces, no fine detail.
- One flat color: pale bone #e4d9bd on dark slate #0f1317. No texture, no glow, no frame.

Originality (strict):
- Must not resemble the Hunter's Mark, any Caryll rune, or any symbol, logo or item from
  Bloodborne or other games.
- No letters, no runes from real alphabets (no Norse or Germanic runes), no religious or
  political symbols (no eye in a triangle), no crosses or plus signs.
- No text.
```

Variante zu Schritt 1: Kelch, Mond und Nahkampfwaffe kombiniert (im selben Chat wie frühere
Entwürfe, sonst bleibt der Stil trotzdem durch die Beschreibung gleich):

```text
New image: 4 new sigils in the same style as the ones above, in a 2x2 grid. Used as Discord
server icon, favicon and forum logo.

Style: the mystical sign of an old hunters' guild in a Victorian gothic city. Bold, organic
brush strokes, thick and thin, curved hooks, like occult calligraphy in pale ink. Abstract,
not a picture.

Elements: a chalice, a moon and a melee weapon (a simple blade, dagger or sickle). Play with
them and combine them differently in each sigil, for example:
- the crescent moon forms the bowl of the chalice
- the blade forms the stem of the chalice
- a blade cuts through the moon and a drop falls into the chalice
- the moon rests inside the chalice like in a gate
Merge the elements into one sign instead of placing three objects next to each other.

Form:
- 3 to 6 strokes, upright, compact, fits inside a circle with margin.
- Recognizable as a silhouette at 32x32 px: thick strokes, open spaces, no fine detail.
- Flat pale bone #e4d9bd on dark slate #0f1317. Optional: one small accent in blood red
  #a3161e, e.g. a drop. No texture, no glow, no frame.

Originality (strict):
- Must not resemble the Hunter's Mark, any Caryll rune, or any symbol, logo or item from
  Bloodborne or other games.
- Generic weapon only: no serrated saw blades, no cleavers, no scythes, no cane swords, no
  weapons that transform.
- The weapon must not form a cross (no straight crossguard). No crescent with a star.
- No letters, no runes from real alphabets, no religious or political symbols, no text.
```

Schritt 2, Farbe, Schattierung und Bewegung (im selben Chat; Beispiel Blut im Kelch):

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
- keep the shading subtle on some variants and stronger on others

Rules for all:
- No gradients, no glossy shine, no 3D render look, no glow: flat tones with crisp edges.
- Still readable at 48x48 px: few, thick shapes.
- Flat dark slate background #0f1317. No text, no frame.
```

Schritt 3, Favorit ausarbeiten: einzeln als 1024 × 1024 ausgeben lassen. Kleine Korrekturen
danach nur noch mit dem Auswahl-Werkzeug (siehe „So geht's“), z. B. für die Physik des Bluts:

```text
In the selected area only, fix the blood physics. The blood is one connected liquid and the
moon floats in it, so the surface runs continuously behind the moon, with no jumps in height
at the moon's edges. The chalice was just tilted, so the whole surface slopes: highest on the
side of the wave, lowest on the other side. Same three red tones, same cel shading. Nothing
outside the selection changes.
```

Prüfen vor der Nutzung: keine Ähnlichkeit mit Spielsymbolen (Hunter-Zeichen, Caryll-Runen), mit
Runen (einige Runenformen sind in Deutschland Kennzeichen verbotener Organisationen, § 86a StGB)
oder mit dem Roten Kreuz (auch ähnliche Zeichen sind geschützt, § 125 OWiG).

Rechtlich: Rein KI-erzeugte Bilder sind in Deutschland und den USA in der Regel nicht
urheberrechtlich geschützt, andere dürften das Zeichen also kopieren. Wer das vermeiden will,
zeichnet den Favoriten selbst nach und verändert ihn dabei; dann ist es ein eigenes Werk.
