# Image prompts for ChatGPT

With these prompts, ChatGPT creates media in the community's style: for Discord, the launcher, the
website and the forum. The sigil's style leads: shapes that look carved from old bone,
with sweeping, calligraphic curves, faceted shading with hard edges,
slate grey in the recesses and a fine stone texture, bone white and blood red on dark
slate grey. Rules for colors, type and the sigil itself are in [`BRAND.md`](BRAND.md).

The prompts are in English because ChatGPT makes images more reliably that way.

## Setup (once)

1. In ChatGPT, create a **Project** (e.g. "BBPP Media") and copy the style brief (Part 1) into the
   **project instructions**. Every chat in that project then follows it.
   If others (mods, helpers) should create images too, create a **custom GPT** instead of the project
   (GPTs → Create): Part 1 as instructions, the reference images as knowledge, then share the
   link.
2. Upload as **project files**: the sigil (`media/brand/sigil.png`) and, once they exist,
   one or two finished images in this style. The more good examples, the more consistent the results.

## Working

1. For each image, fill in the request (Part 2) or take a template from Part 3.
2. Ask for variants as a grid first, then have the favorite worked out on its own.
3. **Change only one part:** click the image, mark the area with the select tool (brush at the top)
   and describe the change. Without a selection, ChatGPT redraws the whole image and
   changes other things along the way.
4. If ChatGPT drifts off (soft gradients, rough brush texture, shine, too colorful), reply:
   "Stick to the style guide: carved, faceted shapes, hard-edged shading, subtle stone grain,
   palette."
5. Download the finished image as PNG (not the preview in the chat), bring it to its final size
   (table below) and check it before use (Part 4).

## Part 1: Style brief

```text
You are the art director of "BBPP", the community (Discord, forum, website) around a free,
open-source PC port of a gothic action game. You create all of its media: Discord graphics,
launcher artwork, website and forum images, icons. Apply this style guide to every image in this
project, even when a request doesn't repeat it.

REFERENCE
The attached sigil (a chalice merged with a blade, carved from old bone with dark slate inlays,
a crescent moon floating in blood) defines the style: shapes, carving, shading, surface and
colors. Match it. Do not put the sigil itself into an image unless I ask for it.

WORLD AND MOOD
An original, nameless Victorian gothic city at night: steep slate roofs, spires, chimneys,
cathedral silhouettes, iron fences, gas lamps, wet cobblestone, fog in the streets, a large pale
full moon. Quiet, melancholic, slightly threatening. Atmosphere over action: no fights, no
monsters in view, no gore.

STYLE
A graphic illustration in the style of the sigil: everything looks carved from old bone and
weathered stone. Bold silhouettes with smooth calligraphic curves: thick and thin, pointed ends,
curved hooks. Forms are chiseled into bevelled facets with hard-edged shading, 3 to 4 tones per
color, light from the top left. Grooves and recesses are filled with dark slate, like inlays.
Surfaces carry a subtle, fine stone grain, never noisy or grungy. Depth comes from layered
silhouettes: the foreground darkest, farther layers lighter through fog, fog as calm bands with
little texture. Crisp edges, few shapes, no tiny detail. No soft airbrush gradients, no glossy
shine or specular highlights, no visible brush strokes, no outlines, no glow, no photorealism,
no 3D render look, no pixel art.

PALETTE (use these and shades in between, nothing else)
- Night and stone, cold desaturated slate: #0a0d12 #0f1317 #14191d #181e22 #1e272a #242c2e
  #2b2e2f #333b3c
- Fog and lit stone: #828275
- Bone and moonlight: base #e4d9bd, highlight #f3ecd9, shadow #a99d80 (never pure white);
  carved recesses and inlays in slate #2b2e2f to #333b3c
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
- Role icon, emoji: square, one bold shape that reads at 20 px, no background detail; keep the
  carving simple (2 facet tones, no stone grain), it disappears at small sizes.
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

## Part 2: Request

```text
New image:
- Use: [e.g. Discord banner / launcher background / website hero / role icon set]
- Subject: [what to show]
- Keep free: [where text, buttons or overlays go, or "nothing"]
- Format: [landscape / square / portrait]
- Variants: [1 / 4 as a 2x2 grid / 6 as a 3x2 grid]
- Extra: [optional, e.g. "red moon", "rain", "no moon", "include the sigil"]
```

## Part 3: Templates

### Discord

**Server banner** (above the channel list; the server name sits on top of it at the top left)

```text
New image:
- Use: Discord server banner
- Subject: a street of the city with gas lamps leading toward a cathedral, moon behind it.
- Keep free: top left
- Format: landscape
- Variants: 4 as a 2x2 grid
```

**Invite background** (behind the invite card)

```text
New image:
- Use: Discord invite background
- Subject: wide view over the rooftops at night, cathedral spires on the left and right, large
  moon low in the sky, fog between the houses.
- Keep free: center
- Format: landscape
```

**Event cover** (e.g. co-op night, release, stream)

```text
New image:
- Use: Discord event cover
- Subject: [e.g. two lanterns meeting in the fog for a co-op night / a bell tower ringing for a
  new release]
- Keep free: nothing
- Format: landscape
- Variants: 4 as a 2x2 grid
```

**Announcement image** (for posts in #announcements; text goes in the message, not in the image)

```text
New image:
- Use: Discord announcement image
- Subject: [the topic as one simple scene, e.g. a lit window in a dark tower for "new update"]
- Keep free: nothing
- Format: landscape
```

**Role icons** (as a set, so they all match)

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

**Emojis** (as a set)

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

Take the dimensions and the areas where buttons and text sit from the launcher, and enter them under
"Keep free".

**Background**

```text
New image:
- Use: launcher background
- Subject: the city at night seen from a cathedral roof, moon on the right, fog in the streets.
- Keep free: [e.g. the left third for the menu and the bottom strip for the play button]
- Format: landscape
- Variants: 4 as a 2x2 grid
```

**News image** (tile for news or an update)

```text
New image:
- Use: launcher news image
- Subject: [the topic as one simple motif, e.g. a key turning in an old gate for "new version"]
- Keep free: bottom third (for the headline)
- Format: landscape
```

### Website

The free areas match the dark overlays in `website/src/styles/global.css`.

**Home page** (`images/website-hero.webp`, text on the left, emblem on top of it on the right)

```text
New image:
- Use: website hero
- Subject: skyline of roofs, towers and a cathedral along the bottom third, night sky with the
  moon above. Keep the sky on the right calm too, an emblem sits on top of it.
- Keep free: left half
- Format: landscape
```

**Subpage header** (`images/page-header.webp`, very wide crop)

```text
New image:
- Use: website page header
- Subject: [one motif, e.g. a lamp-lit doorway / a tall cathedral window / a bookshelf by
  candlelight] in the right third, vertically centered.
- Keep free: left two thirds
- Format: landscape
```

**404 page** (`images/not-found.webp`)

```text
New image:
- Use: website page header
- Subject: a dead-end alley with a single gas lamp in the right third, fog on the ground, the
  feeling of being lost.
- Keep free: left half
- Format: landscape
```

**Link preview** (the image Discord, Reddit etc. show when someone shares a link)

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

The free areas match the dark overlays in `theme/custom.less`.

**Banner** (`images/forum-banner.webp`, title in the center, very wide crop)

```text
New image:
- Use: forum banner
- Subject: wide panorama of the city at night from a rooftop, spires and chimneys on the left
  and right, moon in the upper right. The lower half is fog that fades to dark.
- Keep free: center
- Format: landscape
```

**Category icons** (as a set; single-color in the forum, so deliberately flat in one color, as an
exception to the carved style)

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

### Textures

```text
New image:
- Use: texture
- Subject: [dark stone wall / wet cobblestone / old patterned wallpaper], seen straight on.
- Keep free: nothing
- Format: square
```

## Final sizes

ChatGPT only creates 1536 × 1024, 1024 × 1024 and 1024 × 1536; the image gets cropped afterwards.

| Medium | Final size | Format in ChatGPT |
|---|---|---|
| Discord server icon | 1024 × 1024 PNG (at least 512) | square |
| Discord server banner | 960 × 540 | landscape |
| Discord invite background | 1920 × 1080 | landscape |
| Discord event cover | 800 × 320 | landscape |
| Discord role icon | 64 × 64 PNG, at most 256 KB | square (set) |
| Discord emoji | 128 × 128 PNG, at most 256 KB | square (set) |
| Discord sticker | 320 × 320 PNG, at most 512 KB | square |
| Launcher | as the launcher specifies | landscape |
| Website home page, forum banner | 1536 × 1024 WebP | landscape |
| Website subpage header, 404 | 1920 × 720 WebP | landscape |
| Link preview | 1200 × 630 JPG | landscape |
| Textures | 640 × 640 WebP, seamless | square |

## Part 4: Check before use

- **Game:** no resemblance to symbols, weapons, places or characters from Bloodborne
  (Hunter's Mark, Caryll runes, saw, scythe, cane sword, well-known locations, etc.).
- **Runes:** some rune shapes are symbols of banned organizations in Germany
  (§ 86a StGB).
- **Red cross:** similar signs (a red cross or plus on a light background) are protected too
  (§ 125 OWiG).
- **Text in the image:** ChatGPT often misspells; better put text in the message or on the
  page.

Purely AI-generated images are usually not protected by copyright in Germany and the US;
so others could copy them. If you want to protect an image, rework it yourself in a
visible way; then it is your own work. Record where each image comes from in `CREDITS.md`.

## The sigil: how it was made

The same steps work for other emblems.

Step 1, drafts (chalice, moon and melee weapon combined):

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

Step 2, color, shading and motion (in the same chat):

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

Step 3, fine-tuning with the select tool (only the blood selected):

```text
In the selected area only, fix the blood physics. The blood is one connected liquid and the
moon floats in it, so the surface runs continuously behind the moon, with no jumps in height
at the moon's edges. The chalice was just tilted, so the whole surface slopes: highest on the
side of the wave, lowest on the other side. Same three red tones, same cel shading. Nothing
outside the selection changes.
```

Step 4, carved version (the official sigil since 19 October 2026): the flat version became
bone with bevelled facets, slate in the recesses and a fine stone texture. We didn't keep
the exact prompt for it. To give another emblem (e.g. a role icon) the same look,
this suggestion works:

```text
Re-carve this emblem in the style of the attached sigil. Keep its shape, proportions and colors.
Make it look carved from old bone: bevelled facets with hard-edged shading in 3 to 4 tones, light
from the top left, grooves and recesses filled with dark slate #2b2e2f to #333b3c like inlays,
a subtle fine stone grain on the surfaces. Blood stays in its three red tones. No glossy shine,
no glow, no 3D render look. Flat dark slate background #0f1317. No text, no frame.
```
