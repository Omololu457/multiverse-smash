#!/usr/bin/env python3
"""Madara Stage 0 asset cleanup.

Two flagged files (filenames preserved exactly as uploaded, incl. typos):

1. madara2_fire_ball_justu_projectile_spequance_part_2.png
   Fireball dissipation strip. Export left stray UI artifacts along the
   very bottom: a black crosshair (+), a small blue mark, and a row of
   tiny filename text bottom-left. Real flame content ends at row 129;
   row 130 is fully empty, so everything at y>=130 is artifact.

2. madara2_gunbai_specail_attack_1_specail.png.png
   Gunbai slash-line FX overlay. Contains 4 pure-green [0,255,0] vertical
   separator bars (cols 115/262/384/482) delimiting frames. The real
   content is the gray slash lines. Remove only green-dominant pixels so
   any slash crossing a bar keeps its gray body.

Backs up originals to /tmp/madara_stage0_orig/ then overwrites in place.
"""
import os
import numpy as np
from PIL import Image

BK = "/tmp/madara_stage0_orig"
os.makedirs(BK, exist_ok=True)


def backup(f):
    Image.open(f).save(os.path.join(BK, os.path.basename(f)))


def clean_fireball(f):
    im = Image.open(f).convert("RGBA")
    a = np.array(im)
    before = int((a[:, :, 3] > 0).sum())
    # sanity: row 130 must be empty so the cut is safe
    assert (a[130, :, 3] > 0).sum() == 0, "row 130 not empty; unsafe cut"
    a[130:, :, :] = 0  # clear bottom artifact strip
    after = int((a[:, :, 3] > 0).sum())
    Image.fromarray(a).save(f)
    print(f"  fireball: cleared bottom strip y>=130, opaque {before} -> {after} "
          f"(removed {before-after})")


def clean_gunbai(f):
    im = Image.open(f).convert("RGBA")
    a = np.array(im).astype(int)
    al = a[:, :, 3]
    R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    green = (al > 0) & (G > R + 40) & (G > B + 40) & (G > 120)
    before = int((al > 0).sum())
    a[green] = 0
    after = int((a[:, :, 3] > 0).sum())
    Image.fromarray(a.astype(np.uint8)).save(f)
    print(f"  gunbai: removed {int(green.sum())} green px, opaque {before} -> {after}")


def main():
    fb = "madara2_fire_ball_justu_projectile_spequance_part_2.png"
    gb = "madara2_gunbai_specail_attack_1_specail.png.png"
    for f in (fb, gb):
        backup(f)
    print("cleaning:")
    clean_fireball(fb)
    clean_gunbai(gb)
    print(f"originals backed up to {BK}")


if __name__ == "__main__":
    main()
