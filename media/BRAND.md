# Brand guide

How the community looks to the outside: name, sigil, colors, type, images, tone. New images
with ChatGPT: [`PROMPTS.md`](PROMPTS.md). Where all media come from: [`CREDITS.md`](CREDITS.md).

## Name

- Full: **Bloodborne PC Port Community**, short **BBPP**.
- Only use "Bloodborne" descriptively (what the community is for), never as our own logo or in the
  game's lettering.
- Where it fits, add the note: *Not affiliated with or endorsed by Sony Interactive Entertainment or
  FromSoftware.*

## Sigil

Chalice and blade in one shape, with a crescent moon floating in blood inside. The chalice stands for
the community, the blade for the hunt, moon and blood for the night in the old city. The
sigil is an original work and not a symbol from the game. Since 19 October 2026 the carved
version is the official one: bone with bevelled facets, slate in the recesses, fine stone texture.

Used as: Discord server icon, favicon, forum and website logo, link preview.

Files: `media/brand/sigil.png` (original, also the style reference for ChatGPT),
`media/brand/sigil-cutout.png` (cut out), `media/brand/discord-icon.png` (for uploading to
Discord). To regenerate after a change to the original: `python3 media/brand.py`, then
`node media/render-logo.cjs` (logo and preview image).

- Always on a dark background (#0f1317 or darker). On light areas or busy images, only
  on a dark round plate.
- Keep clear space around it: at least a quarter of the sigil's width.
- Minimum size: 24 px tall. Below that (favicon 16 px), use the round version with the plate.
- Don't recolor, distort, rotate or crop it; no effects (glow, shadow, gradient).
  Only exception: the entrance on the home page (empty chalice that fills up, short red pulse;
  see Motion). After that the sigil stays unchanged.
- Don't combine it with symbols from the game (Hunter's Mark, runes, weapons).

## Colors

Surfaces (website and forum; the values are in `website/src/styles/global.css` and
`theme/custom.less`):

| Role | Value | Used for |
|---|---|---|
| Background deep | `#08090a` | Header and footer |
| Background | `#0d0e10` | Page |
| Card | `#16171a` | Boxes, posts |
| Border | `#25272b` | Lines, edges |
| Text | `#d9d4ca` | Body text |
| Text emphasized | `#ece7dd` | Headings |
| Text muted | `#8a8c90` | Secondary info |
| Brass light | `#c2a878` | Links, focus |
| Brass | `#9c8458` | Lines, ornaments |
| Blood | `#8a1118` | Buttons, highlights |
| Blood hover | `#a3161e` | Buttons on hover |

Blood red is a fill color, not a text color: as text on a dark background the contrast is too
low (2:1). Light text on blood red reads well (7.8:1).

Images and emblems (palette from `PROMPTS.md`):

| Role | Values |
|---|---|
| Night and stone | `#0a0d12` `#0f1317` `#14191d` `#181e22` `#1e272a` `#242c2e` `#2b2e2f` `#333b3c` |
| Fog | `#828275` |
| Bone and moonlight | `#e4d9bd`, light `#f3ecd9`, shadow `#a99d80` |
| Blood | `#8a1118`, light `#c22a30`, shadow `#5a0a10` |
| Lamp light and brass | `#bc9570` `#9c8458` `#c2a878` |

Scenes are about 85 % dark; red is only an accent there.

## Type

- **Cinzel** for headings and wordmarks, ideally in capitals with a little letter spacing.
- **Inter** for body text and UI.
- Both under the SIL Open Font License, self-hosted (`website/public/fonts/`).

## Images

Illustrations in the style of the sigil: shapes that look carved from old bone and stone, with
calligraphic curves, bevelled facets and hard shading in three to four tones,
slate in grooves and recesses, fine stone texture without grunge effects. Depth comes from
silhouette layers and fog. Subjects from an original, nameless Victorian city at
night. No photos, no shine, no visible brush strokes, no 3D render look, no
pixel art, no material from the game. Small icons and emojis are simplified (two facet tones,
no texture); the forum category icons stay flat and single-color. Prompts and final sizes:
`PROMPTS.md`.

## Motion

Slow and heavy like the world of the game, few effects, each with a clear purpose.

- At most one looping animation per view (exception: the small lantern as a status indicator).
- Timing: interaction 150 to 250 ms, entrances 600 to 900 ms, atmosphere 30 to 110 seconds.
  Exception: the sigil's entrance on the home page, a good 5 seconds with an even curve, so that
  people notice it at all. Two banks of fog lie over the sigil; it appears behind them and comes into
  focus, and the banks drift apart. Then blood rises into the empty chalice with a sloshing surface,
  and the sigil beats twice like a heart (briefly larger, glowing red).
- One curve for everything: `cubic-bezier(0.2, 0.7, 0.1, 1)`, fast start, long ease-out. No springs,
  no bouncing.
- Only animate position and opacity, no blur on large areas.
- The system setting "reduce motion" turns off everything except the loading indicator.
- Nothing faster than 3 changes per second; don't recreate anything from the game.

In use:

| Motion | Website | Forum |
|---|---|---|
| Drifting fog (`media/textures/fog.svg`) | Header images | Welcome banner |
| Depth on scroll | Home page header image | – |
| Lantern flickers | Live section (when turned on) | Hunter's Dream box |
| Blood fills the button | Primary and outline buttons | Primary buttons |
| Brass line | Menu and footer | Website links in the header |
| Card lifts | Cards | Topic list |
| Page change fades to dark | All pages | – (the forum doesn't reload) |
| Sigil rises from the fog, chalice fills, heartbeat | Home page, on load | – |
| Sections appear | Home page sections | – |
| Numbers count up | – | Hunter's Dream box |
| Blood drop as loading indicator | – | Everywhere |
| New post pulses | – | After replying |
| Best answer lights up | – | Marked post |

There is a demo page to try it out (motion study, shared as an Artifact).

## Icons

Single-color, flat, same stroke weight within a set. Today: CC0 icons (`media/icons/`, sources in
`CREDITS.md`); custom sets follow the "Category icons" template in `PROMPTS.md`.

## Tone

- Public texts in English, short and friendly, no jargon.
- Honest about bugs and known issues.
- No help with piracy: you have to own the game yourself.

## Legal

- Don't take anything from the game: no logo, no runes, no item or weapon icons, no
  characters, no screenshots or artwork without permission.
- Only use the name descriptively ("for Bloodborne").
- Avoid rune shapes and crosses (German law: § 86a StGB, § 125 OWiG).
- AI-generated images are usually not protected by copyright; rework important images
  yourself.
