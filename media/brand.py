#!/usr/bin/env python3
"""Leitet Discord-Icon, Favicons, Website-Emblem und den Logo-Baustein aus dem Siegel ab.

  python3 media/brand.py         (braucht Pillow; danach: node media/render-logo.cjs)

Quelle: media/brand/sigil.png, das Siegel der Community auf dunklem Grund
(für dieses Projekt mit ChatGPT erzeugt, siehe media/CREDITS.md und media/BRAND.md).
"""
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = ROOT / "media" / "brand"
PUBLIC = ROOT / "website" / "public"
THEME = ROOT / "theme"
PLATE = (15, 19, 23)  # #0f1317, Grund des Siegels


def cutout():
    """Siegel freigestellt und knapp beschnitten (Alpha aus dem Abstand zur Hintergrundfarbe)."""
    a = np.asarray(Image.open(BRAND / "sigil.png").convert("RGB")).astype(float)
    corners = np.concatenate([a[:40, :40], a[:40, -40:], a[-40:, :40], a[-40:, -40:]]).reshape(-1, 3)
    bg = np.median(corners, 0)
    alpha = np.clip((np.sqrt(((a - bg) ** 2).sum(2)) - 10) / 45, 0, 1)
    color = (a - bg * (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3)
    rgba = Image.fromarray(np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8), "RGBA")
    ys, xs = np.nonzero(alpha > 0.5)
    return rgba.crop((xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3))


def split_blood(sigil):
    """Teilt das Siegel in Knochen und Blut, damit sich der Kelch auf der Startseite füllen kann.

    Blut = deutlich röter als grün und blau. Nur im Bereich des Bluts im Kelch, sonst färben rötliche
    Kantenpixel am Umriss mit. Die Blut-Ebene reicht 2 px unter die Knochen-Ebene: übereinander gelegt
    ergeben beide wieder das Original, ohne Lücken an den Übergängen.
    """
    a = np.asarray(sigil).astype(float)
    rgb, cover = a[..., :3], a[..., 3] / 255
    red = np.clip((rgb[..., 0] - np.maximum(rgb[..., 1], rgb[..., 2]) - 45) / 30, 0, 1)
    ys, xs = np.nonzero((red > 0.5) & (cover > 0.5))
    m = 4
    area = np.zeros_like(red)
    area[ys.min() - m:ys.max() + m, xs.min() - m:xs.max() + m] = 1
    red *= area
    grown = np.asarray(Image.fromarray((red * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) / 255
    bone = np.dstack([rgb, cover * (1 - red) * 255]).astype(np.uint8)
    blood = np.dstack([rgb, cover * grown * 255]).astype(np.uint8)
    return Image.fromarray(bone, "RGBA"), Image.fromarray(blood, "RGBA")


def icon(sigil, size, height, round_plate):
    """Siegel mittig auf der dunklen Platte; height = Anteil der Siegelhöhe an der Kantenlänge."""
    big = size * 4  # 4-fach zeichnen für glatte Kanten
    if round_plate:
        canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        ImageDraw.Draw(canvas).ellipse((0, 0, big - 1, big - 1), fill=PLATE + (255,))
    else:
        canvas = Image.new("RGBA", (big, big), PLATE + (255,))
    h = round(big * height)
    w = round(sigil.width * h / sigil.height)
    canvas.alpha_composite(sigil.resize((w, h), Image.LANCZOS), ((big - w) // 2, (big - h) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def main():
    sigil = cutout()
    sigil.save(BRAND / "sigil-cutout.png", optimize=True)  # für media/logo.html und media/og.html

    # Discord schneidet das Icon rund zu: 0.66 hält die Hornspitzen sicher im Kreis
    icon(sigil, 1024, 0.66, False).convert("RGB").save(BRAND / "discord-icon.png", optimize=True)
    for target in (THEME / "favicon.png", PUBLIC / "favicon.png"):
        icon(sigil, 128, 0.66, True).save(target, optimize=True)
    icon(sigil, 180, 0.70, False).convert("RGB").save(PUBLIC / "apple-touch-icon.png", optimize=True)

    # Emblem der Website-Startseite in zwei Ebenen, Knochen und Blut (wird mit 380 px Breite gezeigt,
    # hier doppelt für scharfe Displays)
    w = 760
    size = (w, round(sigil.height * w / sigil.width))
    for layer, name in zip(split_blood(sigil), ("emblem-bone.webp", "emblem-blood.webp")):
        layer.resize(size, Image.LANCZOS).save(PUBLIC / name, "WEBP", quality=90, method=6)


if __name__ == "__main__":
    main()
