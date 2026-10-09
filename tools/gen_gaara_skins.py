#!/usr/bin/env python3
# gen_gaara_skins.py — recolor SKINS for Gaara (body sheets + portrait) AND his Shukaku summon sheets, so a
# skin recolours BOTH. Mirrors the project recolor pipeline (tools/gen_omololu_underskin.py): copy base →
# variant, recolour the variant in place, ALPHA PRESERVED byte-for-byte (no keying artifacts). The base
# gaara_*/gaara_shukaku_* sheets are NEVER touched (copy-from only).
#
# GAARA body classifier (his hair+robe are SATURATED RED; skin is TAN/orange; eyes TEAL; outline black):
#   KEEP  black outline (v<0.10), tan skin (hue 0.02..0.17, v>0.35), teal eyes (hue 0.45..0.61)
#   RECOLOUR everything else (red hair + maroon robe + purple shadows) → the theme hue, preserving S/V.
# SHUKAKU classifier (tan body + blue-purple markings):
#   KEEP  black, white (the LOSE burst), bright tan body (optionally tinted)
#   RECOLOUR the blue markings (hue 0.58..0.80) → theme hue; lightly TINT the tan body toward the theme.
#
# alienx = void-crush every opaque pixel to matte near-black (skin incl.); the starfield is drawn at RUNTIME
#          by game.js drawAlienXStarfield, gated on skinId ending "AlienX".  albedo = silver hair + dark red.
#
# Usage: python3 tools/gen_gaara_skins.py [all | <tag> ...] [preview]

import os, sys, colorsys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BODY_SHEETS = ["idle", "walk", "run", "teleport", "jump", "hurt", "knockdown", "getup", "crouch", "win",
               "light", "heavy", "up", "air", "down_air", "crouchLight", "throw", "throwAir", "throwCrouch",
               "guard", "sandcast", "ult_cast", "ult_kneel"]
SHUKAKU_SHEETS = ["shukaku_idle", "shukaku_walk", "shukaku_tail", "shukaku_emerge", "shukaku_swipe",
                  "shukaku_mouthcast", "shukaku_pyramid", "shukaku_lose"]   # sphere/burst kept neutral

# theme HUE (0..1). simple hue-shift skins.
THEMES = {
    "pink":    0.92,
    "emerald": 0.34,
    "azure":   0.58,
    "violet":  0.78,
    "gold":    0.12,
}


def _keep_gaara(h, s, v):
    if v < 0.10: return True                        # black outline
    if 0.02 <= h <= 0.17 and v > 0.35: return True  # tan skin
    if 0.45 <= h <= 0.61: return True               # teal eyes
    return False


def recolor_body(path, tag):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if tag == "alienx":
                nv = max(0.02, min(0.14, 0.03 + v * 0.10)); gg = round(nv * 255)
                px[x, y] = (gg, gg, max(gg, round(gg * 1.14)), a); n += 1; continue
            if _keep_gaara(h, s, v): continue
            if tag == "albedo":
                # Albedo: silver/white hair for the bright pixels, dark crimson for the rest.
                if v > 0.5: nr, ng, nb = colorsys.hsv_to_rgb(0.0, 0.05, min(1.0, v + 0.25))   # silver
                else:       nr, ng, nb = colorsys.hsv_to_rgb(0.99, 0.85, max(0.12, v * 0.9))  # dark red
            else:
                nr, ng, nb = colorsys.hsv_to_rgb(THEMES[tag], max(s, 0.5), v)   # hue shift, keep shading
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a); n += 1
    img.save(path); return n


def recolor_shukaku(path, tag):
    img = Image.open(path).convert("RGBA"); px = img.load(); W, H = img.size
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if tag == "alienx":
                nv = max(0.02, min(0.16, 0.03 + v * 0.12)); gg = round(nv * 255)
                px[x, y] = (gg, gg, max(gg, round(gg * 1.14)), a); n += 1; continue
            if v < 0.08: continue                       # black outline
            if s < 0.12 and v > 0.85: continue          # white (burst/highlight)
            is_marking = 0.55 <= h <= 0.82 and s > 0.18  # blue-purple swirl markings
            hue = 0.0 if tag == "albedo" else THEMES[tag]
            if is_marking:
                nr, ng, nb = colorsys.hsv_to_rgb(hue, max(s, 0.55), v)          # markings → theme hue
            else:
                # tan body: light TINT toward the theme (keep most of its luminance/warmth)
                tr, tg, tb = colorsys.hsv_to_rgb(hue, 0.30, v)
                nr = (r / 255) * 0.62 + tr * 0.38; ng = (g / 255) * 0.62 + tg * 0.38; nb = (b / 255) * 0.62 + tb * 0.38
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a); n += 1
    img.save(path); return n


def build(tag, preview=False):
    total = 0; tiles = []
    for s in BODY_SHEETS + ["portrait"]:
        name = "gaara_portrait" if s == "portrait" else "gaara_%s_uniform" % s
        src = os.path.join(ROOT, name + ".png"); dst = os.path.join(ROOT, "%s__%s.png" % (name, tag))
        if not os.path.exists(src): print("  MISSING", src); continue
        Image.open(src).convert("RGBA").save(dst)
        total += recolor_body(dst, tag)
        if preview and s in ("idle", "ult_kneel", "portrait"): tiles.append(Image.open(dst).convert("RGBA"))
    for s in SHUKAKU_SHEETS:
        name = "gaara_%s_uniform" % s
        src = os.path.join(ROOT, name + ".png"); dst = os.path.join(ROOT, "%s__%s.png" % (name, tag))
        if not os.path.exists(src): print("  MISSING", src); continue
        Image.open(src).convert("RGBA").save(dst)
        total += recolor_shukaku(dst, tag)
        if preview and s in ("shukaku_idle", "shukaku_tail"): tiles.append(Image.open(dst).convert("RGBA"))
    print("  [%s] recoloured px=%d → gaara_*__%s.png + gaara_shukaku_*__%s.png" % (tag, total, tag, tag))
    if preview and tiles:
        pad = 6; th = max(t.height for t in tiles); tw = sum(t.width + pad for t in tiles) + pad
        mont = Image.new("RGBA", (tw, th + 2 * pad), (255, 0, 255, 255)); x = pad
        for t in tiles: mont.alpha_composite(t, (x, pad)); x += t.width + pad
        out = os.path.join(ROOT, "tools", "gaara", "skin_%s_preview.png" % tag)
        mont.convert("RGB").save(out); print("  wrote", out)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "preview"]
    preview = "preview" in sys.argv
    tags = list(THEMES.keys()) + ["albedo", "alienx"] if (not args or args == ["all"]) else args
    for t in tags:
        build(t, preview=preview)
