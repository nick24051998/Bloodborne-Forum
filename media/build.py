#!/usr/bin/env python3
"""Erzeugt die Körnungs-Textur und die Icon-Dateien für Forum und Website aus media/.

  python3 media/build.py

- media/textures/grain.svg: selbst erzeugt (SVG-Rauschfilter), keine fremden Rechte
- media/textures/fog.svg: ziehender Nebel über den Kopfbildern, ebenfalls selbst erzeugt; nahtlos in
  der Breite (600 px), damit er endlos durchs Bild wandern kann. Der Filterbereich muss genau die
  Kachel sein, sonst rechnet stitchTiles mit 720 px und an den Kachelrändern entstehen Kanten
- media/icons/*.svg: CC0-Icons (Quellen in media/CREDITS.md)
- schreibt flarum/icons.less (Forum + Admin) und website/src/lib/icons.js
- kopiert die Texturen und die Website-Bilder aus media/images/ nach website/src/assets/
  (Astro bündelt sie mit dem CSS)
"""
import pathlib
import shutil
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
MEDIA = ROOT / "media"
# Bilder aus media/images/, die die Website nutzt (das Forum bekommt alle per setup-forum.sh)
WEBSITE_IMAGES = ["website-hero.webp", "page-header.webp", "not-found.webp"]


GRAIN_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0"/></filter>
<rect width="100%" height="100%" filter="url(#g)"/></svg>
"""

FOG_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300">
<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.014" numOctaves="3" seed="7" stitchTiles="stitch"/>
<feColorMatrix values="0 0 0 0 0.78  0 0 0 0 0.79  0 0 0 0 0.8  0 0 0 1.2 -0.5"/></filter>
<rect width="100%" height="100%" filter="url(#f)"/></svg>
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
    (MEDIA / "textures" / "grain.svg").write_text(GRAIN_SVG)
    (MEDIA / "textures" / "fog.svg").write_text(FOG_SVG)
    icons()
    target = ROOT / "website" / "src" / "assets"
    target.mkdir(parents=True, exist_ok=True)
    for f in (MEDIA / "textures").iterdir():
        shutil.copy(f, target / f.name)
    for name in WEBSITE_IMAGES:
        shutil.copy(MEDIA / "images" / name, target / name)


if __name__ == "__main__":
    main()
