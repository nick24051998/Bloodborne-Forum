#!/usr/bin/env python3
"""Erzeugt die Texturen und die Icon-Dateien für Forum und Website aus media/.

  python3 media/build.py      (braucht numpy und Pillow: pip install numpy pillow)

- media/textures/fog.webp und grain.svg: selbst erzeugt (Zufallsrauschen), keine fremden Rechte
- media/icons/*.svg: CC0-Icons (Quellen in media/CREDITS.md)
- schreibt flarum/icons.less (Forum + Admin) und website/src/lib/icons.js
- kopiert die Texturen nach website/src/assets/ (Astro bündelt sie mit dem CSS)
"""
import pathlib
import shutil
import urllib.parse

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
MEDIA = ROOT / "media"
rng = np.random.default_rng(1868)  # fester Seed: gleiche Dateien bei jedem Lauf


def value_noise(width, height, octaves=6, base=4):
    """Weiches Wolkenrauschen: mehrere hochskalierte Zufallsraster übereinander."""
    total = np.zeros((height, width))
    weight_sum = 0.0
    for octave in range(octaves):
        cells = base * 2 ** octave
        grid = rng.random((max(2, cells * height // width), cells))
        layer = Image.fromarray((grid * 255).astype(np.uint8)).resize((width, height), Image.BICUBIC)
        weight = 0.55 ** octave
        total += np.asarray(layer, dtype=float) / 255 * weight
        weight_sum += weight
    return total / weight_sum


def fog():
    width, height = 1600, 520
    noise = value_noise(width, height)
    noise = np.clip((noise - 0.38) / 0.4, 0, 1) ** 1.6
    # Nebel steigt vom unteren Rand auf und läuft nach oben aus
    rise = np.linspace(0.15, 1.0, height)[:, None] ** 1.4
    alpha = (noise * rise * 0.55 * 255).astype(np.uint8)
    rgb = np.empty((height, width, 3), dtype=np.uint8)
    rgb[...] = (201, 205, 210)  # Mondlicht-Grau
    Image.fromarray(np.dstack([rgb, alpha]), "RGBA").save(
        MEDIA / "textures" / "fog.webp", "WEBP", quality=72, method=6)


GRAIN_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0"/></filter>
<rect width="100%" height="100%" filter="url(#g)"/></svg>
"""


def icons():
    files = sorted((MEDIA / "icons").glob("*.svg"))
    less = ["// Erzeugt von media/build.py aus media/icons/*.svg (CC0, siehe media/CREDITS.md).",
            "// Nutzung: <i class=\"icon bbicon bbicon-NAME\"> (z. B. als Tag-Icon), Farbe = Textfarbe.",
            ".bbicon {",
            "  display: inline-block;",
            "  width: 1em;",
            "  height: 1em;",
            "  vertical-align: -0.125em;",
            "  background-color: currentColor;",
            "  -webkit-mask: var(--bbicon) center / contain no-repeat;",
            "  mask: var(--bbicon) center / contain no-repeat;",
            "}"]
    js = ["// Erzeugt von media/build.py aus media/icons/*.svg (CC0, siehe media/CREDITS.md).",
          "export const icons = {"]
    for f in files:
        svg = " ".join(f.read_text().split())
        # Einfache Anführungszeichen im SVG, damit url("...") in CSS gültig bleibt
        uri = "data:image/svg+xml," + urllib.parse.quote(svg.replace('"', "'"), safe=" /:=',.-")
        less.append(f'.bbicon-{f.stem} {{ --bbicon: url("{uri}"); }}')
        js.append(f"  '{f.stem}': {svg!r},")
    js.append("};")
    (ROOT / "flarum" / "icons.less").write_text("\n".join(less) + "\n")
    (ROOT / "website" / "src" / "lib" / "icons.js").write_text("\n".join(js) + "\n")


def main():
    fog()
    (MEDIA / "textures" / "grain.svg").write_text(GRAIN_SVG)
    icons()
    target = ROOT / "website" / "src" / "assets"
    target.mkdir(parents=True, exist_ok=True)
    for f in (MEDIA / "textures").iterdir():
        shutil.copy(f, target / f.name)


if __name__ == "__main__":
    main()
