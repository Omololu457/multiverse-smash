#!/usr/bin/env python3
# STAGE 4 — THE HANDLER's shikigami cameo art. Crops each Ten-Shadows shikigami from the CLEAN shibuya
# rows + boundary-crops the two tangled files (owner decision C: crops now, re-export only the domain).
# Each becomes a uniform sprite strip drawn by summons.js drawSummons (center-anchored; the summon's
# offsetY places it). The caster's summon hand-sign pose renders on the fighter (bottom-aligned normal).
# Sources: shibuya rows have NO label band (creature-only art, 4px sheet border skipped via band start 2);
# gama/datto_nue carry inline labels handled by the pinned bands. See HANDLER_ASSET_MAP.md.
import sys
from PIL import Image
ALPHA = 16

def load(src): return Image.open(src).convert("RGBA")

def frame_bbox(px, x0, x1, y0, y1):
    miny, maxy, minx, maxx = y1, y0 - 1, x1, x0 - 1
    for y in range(y0, y1):
        for x in range(x0, x1):
            if px[x, y][3] > ALPHA:
                miny = min(miny, y); maxy = max(maxy, y); minx = min(minx, x); maxx = max(maxx, x)
    return None if maxy < miny else (minx, miny, maxx + 1, maxy + 1)

def build(src, spans, out, band, pad=2):
    im = load(src); px = im.load(); y0, y1 = band
    cells = []
    for (x0, x1) in spans:
        bb = frame_bbox(px, x0, x1, y0, y1)
        if bb is None: print(f"  !! empty {x0}-{x1} in {src}", file=sys.stderr); continue
        cells.append(im.crop(bb))
    uW = max(c.width for c in cells) + pad; uH = max(c.height for c in cells) + pad
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        strip.paste(c, (i * uW + (uW - c.width) // 2, uH - c.height - 1), c)   # bottom-align
    strip.save(out); print(f"{out}: {len(cells)} frames, cell {uW}x{uH}")
    return uW, uH

def main():
    # ── SHIKIGAMI (drawn by summons.js — center-anchored) ──
    # Divine Dogs (N): black dog claw-swipe rush (shibuya row_04, 4 frames)
    build("megumi_shibuya_row_04.png", [(14,97),(112,208),(219,315),(332,429)], "handler_shik_dog.png", (2,65))
    # Orochi snake (F): striking-neck coil poses (shibuya bird_snake head/coil gallery, 2 frames)
    build("megumi_shibuya_UNSEPARATED_bird_snake.png", [(242,313),(327,392)], "handler_shik_snake.png", (55,120))
    # Datto rabbits (B): the whole rabbit swarm as ONE sprite (megumi_UNSEPARATED_datto_nue, top-right)
    build("megumi_UNSEPARATED_datto_nue.png", [(250,425)], "handler_shik_rabbit.png", (28,72))
    # Max Elephant / Banshō (D): heavy elephant (shibuya row_07 idle, 1 frame)
    build("megumi_shibuya_row_07.png", [(16,182)], "handler_shik_elephant.png", (2,109))
    # Nue red bird (U): full flapping-flight bird (shibuya row_05 late frames, 3 frames)
    build("megumi_shibuya_row_05.png", [(471,525),(537,590),(600,644)], "handler_shik_nue.png", (2,73))
    # Toad / Gama (Air): green toad (megumi_tokusa_no_kage_bojutsu_gama, bottom-right, 1 frame)
    build("megumi_tokusa_no_kage_bojutsu_gama.png", [(222,258)], "handler_shik_toad.png", (48,87))
    # ── CASTER summon hand-sign pose (drawn on the fighter — bottom-aligned like a normal) ──
    build("megumi_tokusa_no_kage_bojutsu_gama.png", [(100,145),(150,195)], "handler_summon_uniform.png", (25,87))

if __name__ == "__main__":
    main()
