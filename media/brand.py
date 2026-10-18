#!/usr/bin/env python3
"""Leitet Logo, Favicons, Emblem und Vorschaubild aus den Pixel-Art-Originalen ab.

  python3 media/brand.py         (braucht Pillow; danach: node media/render-logo.cjs)

Quellen (vom Admin des Discord-Servers selbst gestaltet, siehe media/CREDITS.md):
  media/brand/server-icon.png     Server-Icon (BBPP), 512 x 512
  media/brand/invite-splash.webp  Einladungs-Hintergrund mit gerahmtem Emblem, 1920 x 1080
"""
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = ROOT / "media" / "brand"
PUBLIC = ROOT / "website" / "public"
THEME = ROOT / "theme"
FRAME_BOX = (637, 218, 1286, 868)  # gerahmtes Emblem im Einladungs-Hintergrund


def round_icon(size):
    """Server-Icon kreisrund freigestellt (das Original hat dunkle Ecken)."""
    icon = Image.open(BRAND / "server-icon.png").convert("RGBA")
    big = icon.width * 4
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((10, 10, big - 10, big - 10), fill=255)  # 4x für glatte Kanten
    icon.putalpha(mask.resize(icon.size, Image.LANCZOS))
    return icon.resize((size, size), Image.LANCZOS)


def main():
    round_icon(512).save(BRAND / "server-icon-round.png")  # für media/logo.html
    for target in (THEME / "favicon.png", PUBLIC / "favicon.png"):
        round_icon(128).save(target)
    Image.open(BRAND / "server-icon.png").convert("RGB").resize((180, 180), Image.LANCZOS).save(
        PUBLIC / "apple-touch-icon.png")

    splash = Image.open(BRAND / "invite-splash.webp").convert("RGB")
    splash.crop(FRAME_BOX).save(PUBLIC / "emblem-frame.webp", "WEBP", quality=88, method=6)
    # Vorschaubild 1200 x 630: Einladungs-Hintergrund, mittig zugeschnitten
    og = splash.resize((1200, 675), Image.LANCZOS).crop((0, 22, 1200, 652))
    og.save(PUBLIC / "og-image.jpg", quality=86, optimize=True)


if __name__ == "__main__":
    main()
