#!/usr/bin/env python3
"""Lädt gemeinfreie Radierungen aus der Open-Access-Sammlung des Art Institute of Chicago
(CC0, siehe media/CREDITS.md) und macht daraus Hintergründe für Forum und Website.

  python3 media/artworks.py      (braucht numpy und Pillow; Netzwerk zu api.artic.edu und
                                  www.artic.edu)

Aus den dunklen Strichen auf hellem Papier werden helle, mondgraue Linien auf transparentem
Grund, mit weich ausgeblendeten Rändern. Ergebnis: media/artworks/*.webp, kopiert nach
website/src/assets/ (Website) und von scripts/setup-forum.sh nach /assets/media/bb (Forum).
"""
import io
import json
import pathlib
import shutil
import urllib.request

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "media" / "artworks"
# Das Museum bittet API-Nutzer, sich mit diesem Header zu erkennen zu geben
HEADERS = {
    "AIC-User-Agent": "BloodbornePortCommunity (fan site, public-domain images)",
    "User-Agent": "BloodbornePortCommunity-media/1.0",
}

# Werk-ID, Datei, Ausschnitt (links, oben, rechts, unten) im 1686-px-Bild, Ausgabebreite,
# Deckkraft der Linien, Ausblendung der Ränder (links, rechts, oben, unten) als Bildanteil
ARTWORKS = [
    # Forum: Willkommens-Banner
    (28755, "notre-dame-apse", (204, 180, 1490, 836), 1600, 0.40, (0.12, 0.12, 0.04, 0.30)),
    # Website: Kopf der Unterseiten (Install, FAQ, …)
    (7377, "gothic-arch", (255, 180, 1411, 1059), 1000, 0.24, (0.15, 0.15, 0.05, 0.35)),
    # Website: Startseite hinter dem Blutmond, zur Textseite (links) weit ausgeblendet
    (7380, "pier-with-lamp", (244, 174, 1422, 1061), 1200, 0.30, (0.55, 0.08, 0.05, 0.30)),
    # Website: 404-Seite
    (148401, "graveyard-moonlight", (30, 40, 1660, 1900), 760, 0.38, (0.12, 0.12, 0.05, 0.25)),
]
WEBSITE = {"gothic-arch", "pier-with-lamp", "graveyard-moonlight"}  # werden nach website/src/assets kopiert
MOON = (201, 205, 210)


def fetch(artwork_id):
    url = f"https://api.artic.edu/api/v1/artworks/{artwork_id}?fields=id,title,is_public_domain,image_id"
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS)) as r:
        data = json.load(r)["data"]
    if not data["is_public_domain"]:
        raise SystemExit(f"{artwork_id} ist nicht gemeinfrei – abgebrochen")
    image = f"https://www.artic.edu/iiif/2/{data['image_id']}/full/1686,/0/default.jpg"
    with urllib.request.urlopen(urllib.request.Request(image, headers=HEADERS)) as r:
        return Image.open(io.BytesIO(r.read())).convert("L")


def feather(height, width, left, right, top, bottom):
    """Maske, die zu den Rändern weich auf 0 ausläuft."""
    def ramp(n, start, end):
        x = np.linspace(0, 1, n)
        a = np.clip(x / start, 0, 1) if start else np.ones(n)
        b = np.clip((1 - x) / end, 0, 1) if end else np.ones(n)
        v = a * b
        return v * v * (3 - 2 * v)  # smoothstep
    return ramp(height, top, bottom)[:, None] * ramp(width, left, right)[None, :]


def line_art(gray, opacity, edges):
    a = np.asarray(gray, dtype=float)
    paper, ink = np.percentile(a, 88), np.percentile(a, 2)
    # Der leichte Grundton der Druckplatte zählt zum Hintergrund, sonst entsteht ein heller Rahmen
    darkness = np.clip(((paper - a) / (paper - ink) - 0.18) / 0.82, 0, 1) ** 1.15
    alpha = darkness * opacity * feather(*a.shape, *edges)
    rgb = np.empty(a.shape + (3,), dtype=np.uint8)
    rgb[...] = MOON
    return Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)]), "RGBA")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    assets = ROOT / "website" / "src" / "assets"
    for artwork_id, name, box, width, opacity, edges in ARTWORKS:
        gray = fetch(artwork_id).crop(box)
        gray = gray.resize((width, round(gray.height * width / gray.width)), Image.LANCZOS)
        target = OUT / f"{name}.webp"
        # Die Linien stecken im Alphakanal; verlustbehaftet gespeichert bleiben die Dateien klein
        line_art(gray, opacity, edges).save(target, "WEBP", quality=60, alpha_quality=45, method=6)
        if name in WEBSITE:
            shutil.copy(target, assets / target.name)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
