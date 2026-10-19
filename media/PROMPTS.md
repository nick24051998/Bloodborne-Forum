# Bild-Prompts für ChatGPT

Wiederverwendbare Designrichtung für neue Bilder (Forum, Website, Discord). Alle Bilder des Projekts
sind Pixel-Art, passend zur Pixel-Art des Discord-Servers. Teil 1 legt den Stil einmal fest, Teil 2
ist der kurze Auftrag pro Bild. Die Prompts sind englisch, weil ChatGPT damit
verlässlicher Bilder erzeugt.

## So geht's

1. In ChatGPT ein Projekt anlegen (z. B. „BBPP Bilder“) und Teil 1 in die **Projekt-Anweisungen**
   kopieren. Ohne Projekt: Teil 1 als erste Nachricht in einen neuen Chat.
2. `media/brand/invite-splash.webp` als **Projekt-Datei** hochladen. Es ist die Stilreferenz für
   Pixelgröße, Palette und Licht (Teil 1 sagt ChatGPT, dass es Komposition und Emblem nicht kopiert).
3. Pro Bild Teil 2 ausfüllen oder eine Vorlage unten nehmen.
4. Driftet ChatGPT ab (zu bunt, verwaschene Pixel), antworten: „Stick to the style guide: palette and
   crisp pixels.“
5. Fertige Bilder ins Repo geben: Zuschnitt, Palette angleichen, Pixelraster säubern, WebP, Eintrag in
   `CREDITS.md`.

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
Always pixel art, matching the attached reference image (pixel size, palette, lighting). Do not
copy its composition or the framed emblem in its center. Chunky, hand-placed pixels: every art
pixel is a crisp square of the same size (about 4x4 px at 1536 px width), hard edges, no
anti-aliasing, no blur, no smooth gradients. Shade with flat color steps and ordered dithering.
At most about 16 colors. Silhouettes read clearly against the sky. Never painterly, photographic
or 3D, even if a request sounds like it.

PALETTE (use these and shades in between, nothing else)
- Night and stone, cold desaturated slate with a slight blue-green tint:
  #0a0d12 #0f1317 #14191d #181e22 #1e272a #242c2e #2b2e2f #333b3c
- Fog and lit stone: #828275
- Moonlight and highlights: #e4d9bd (pale bone, not white)
- Lamp light, small warm spots only: #bc9570
- Brass details: #9c8458 #c2a878
- Blood red, rare accent only (at most about 5% of the image, e.g. a red moon or one lit
  window): #8a1118 #a3161e
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
- Emblems and icons: one simple shape, centered, wide margin, readable at 32x32 px, on flat
  #0d0e10 (or transparent if I ask).
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

Ziel ist ein eigenes Siegel mit dem Wiedererkennungswert des Hunter-Zeichens: ein abstraktes,
einfarbiges Zeichen aus wenigen Pinselstrichen, kein Bildchen. ChatGPT entwirft die Form als
Pinselzeichnung (das kann es gut); die Pixel-Fassungen (32 × 32, 16 × 16) entstehen danach aus dem
gewählten Entwurf.

Schritt 1, Entwürfe:

```text
New image: an original sigil for our community, used as Discord server icon, favicon and forum
logo. Show 4 different sigils in a 2x2 grid so I can choose.

Idea: the secret sign of an old hunters' guild in a Victorian gothic city. Meaning: a gate under
the moon, the way into the old city.

Form:
- One glyph made of 3 to 5 bold calligraphic brush strokes (thick and thin), like ink.
- Abstract, not a picture: no objects, figures or realistic drawings. Build it from simple
  elements such as an arch, a vertical stroke, a crescent, a dot.
- Upright, symmetric or nearly symmetric, compact; fits inside a circle with margin.
- Still recognizable as a silhouette at 32x32 px: thick strokes, open spaces, no fine detail.
- One flat color: pale bone #e4d9bd on dark slate #0f1317. No texture, no glow, no frame.

Originality (strict):
- Must not resemble the Hunter's Mark, any Caryll rune, or any symbol, logo or item from
  Bloodborne or other games.
- No letters, no runes from real alphabets (no Norse or Germanic runes), no religious or
  political symbols, no crosses or plus signs.
- No text.
```

Schritt 2, Favorit ausarbeiten:

```text
Take sigil [number]: one sigil, centered, 1024x1024, same strokes and proportions, flat
#e4d9bd on #0f1317, no texture, no glow.
```

Prüfen vor der Nutzung: keine Ähnlichkeit mit Spielsymbolen (Hunter-Zeichen, Caryll-Runen), mit
Runen (einige sind in Deutschland als Kennzeichen verbotener Organisationen strafbar, § 86a StGB)
oder mit dem Roten Kreuz (geschützt, § 125 OWiG).

Rechtlich: Rein KI-erzeugte Bilder sind in Deutschland und den USA in der Regel nicht
urheberrechtlich geschützt, andere dürften das Zeichen also kopieren. Wer das vermeiden will,
zeichnet den Favoriten selbst nach und verändert ihn dabei; dann ist es ein eigenes Werk.
