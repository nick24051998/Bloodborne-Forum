#!/usr/bin/env python3
"""Derives the Discord icon, favicons, website emblem and the logo building block from the sigil.

  python3 media/brand.py         (needs Pillow; afterwards: node media/render-logo.cjs)

Source: media/brand/sigil.png, the community's sigil on a dark background
(generated for this project with ChatGPT, see media/CREDITS.md and media/BRAND.md).
"""
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = ROOT / "media" / "brand"
PUBLIC = ROOT / "website" / "public"
THEME = ROOT / "theme"
PLATE = (15, 19, 23)  # #0f1317, background of the sigil


def cutout():
    """Sigil cut out and tightly cropped (alpha from the distance to the background color)."""
    a = np.asarray(Image.open(BRAND / "sigil.png").convert("RGB")).astype(float)
    corners = np.concatenate([a[:40, :40], a[:40, -40:], a[-40:, :40], a[-40:, -40:]]).reshape(-1, 3)
    bg = np.median(corners, 0)
    alpha = np.clip((np.sqrt(((a - bg) ** 2).sum(2)) - 10) / 45, 0, 1)
    color = (a - bg * (1 - alpha[..., None])) / np.maximum(alpha[..., None], 1e-3)
    rgba = Image.fromarray(np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8), "RGBA")
    ys, xs = np.nonzero(alpha > 0.5)
    return rgba.crop((xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3))


def split_blood(sigil):
    """Splits the sigil into bone and blood so that the chalice on the home page can fill up.

    Blood = red at least twice as strong as green and blue (a ratio, not a distance, so that dark blood in the
    shadows counts too; bone and stone sit at about 1.1). Only within the area of the blood in the chalice,
    otherwise reddish edge pixels along the outline get picked up. The blood layer extends 2 px under the
    bone layer: stacked on top of each other, the two give back the original, with no gaps at the transitions.
    """
    a = np.asarray(sigil).astype(float)
    rgb, cover = a[..., :3], a[..., 3] / 255
    ratio = rgb[..., 0] / (np.maximum(rgb[..., 1], rgb[..., 2]) + 8)
    red = np.clip((ratio - 1.5) / 0.6, 0, 1) * np.clip((rgb[..., 0] - 30) / 20, 0, 1)
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
    """Sigil centered on the dark plate; height = share of the sigil height in the edge length."""
    big = size * 4  # draw at 4x for smooth edges
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
    sigil.save(BRAND / "sigil-cutout.png", optimize=True)  # for media/logo.html and media/og.html

    # Discord crops the icon to a circle: 0.66 keeps the horn tips safely inside the circle
    icon(sigil, 1024, 0.66, False).convert("RGB").save(BRAND / "discord-icon.png", optimize=True)
    for target in (THEME / "favicon.png", PUBLIC / "favicon.png"):
        icon(sigil, 128, 0.66, True).save(target, optimize=True)
    icon(sigil, 180, 0.70, False).convert("RGB").save(PUBLIC / "apple-touch-icon.png", optimize=True)

    # Emblem of the website home page in two layers, bone and blood (shown at 380 px width,
    # here doubled for sharp displays)
    w = 760
    size = (w, round(sigil.height * w / sigil.width))
    for layer, name in zip(split_blood(sigil), ("emblem-bone.webp", "emblem-blood.webp")):
        layer.resize(size, Image.LANCZOS).save(PUBLIC / name, "WEBP", quality=90, method=6)


if __name__ == "__main__":
    main()
