#!/usr/bin/env python3
"""Killua coordinated HAIR + CLOTHES + LIGHTNING recolor skins (__<tag>.png).

Killua's art is a SINGLE packed atlas (killua_atlas.png, 2D rows via sourceY) → a global
y-band can't separate head from body, so every region here is COLOUR-separated (HSV gates),
applied whole-sheet via recolor_palette.recolor_multi. The same passes recolour the portrait.

REGIONS (measured on killua_atlas.png):
  HAIR   — silver/white spiky mass: near-gray (max_sat .18), bright (min_val .42), COOL
           (max_warm 10 rejects the warm peach skin that would otherwise bleed in).
  CLOTHES— the dark blue shirt/shorts: hue 195-255, sat>=.28, and DARK (max_val .72) so the
           bright-cyan lightning FX (val~1) is NOT grabbed by this pass.
  BOLT   — Killua's electric cyan (hue 160-200, bright+saturated): optional themed recolor so
           the lightning reads in the skin's colour family. Skipped on the subtle skins.
  SKIN   — warm peach (hue 12-45): PROTECTED on every skin except `deepblack`, which deliberately
           shifts it to a tan tone.
  alienx — Celestialsapien: EVERY opaque pixel crushed to near-black (void), the colourful stars
           are drawn at runtime by game.js drawAlienXStarfield (skinId endsWith "AlienX").
"""
import sys, os, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi, recolor_file
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
ATLAS = os.path.join(ROOT, "killua_atlas.png")
PORTRAIT = os.path.join(ROOT, "killua_portrait.png")

def HAIR(h, sp=1.12):  return dict(min_sat=0.0, max_sat=0.18, min_val=0.42, max_val=1.0, max_warm=10, to_tone=h, tone_spread=sp)
def CLOTHES(h, sp=1.9): return dict(from_hue="195-255", min_sat=0.28, min_val=0.0, max_val=0.72, to_tone=h, tone_spread=sp)
def BOLT(h, sp=1.0):   return dict(from_hue="160-205", min_sat=0.45, min_val=0.62, to_tone=h, tone_spread=sp)
def SKIN(h, sp=1.2):   return dict(from_hue="12-45", min_sat=0.18, max_sat=0.95, min_val=0.40, to_tone=h, tone_spread=sp)

# tag -> (display, list-of-passes). Order matters: HAIR/SKIN before CLOTHES/BOLT is fine (disjoint gates).
SKINS = {
    # ── requested "basic" trio (shared concept across Gojo/Killua/Soldier Boy) ──
    # Albedo (Ben 10 negative): GRAY hair, RED eyes/accent, reddish clothes.
    "albedo":  dict(name="Albedo",  passes=[HAIR("#9A9AA2"), CLOTHES("#6E242A", 2.1), BOLT("#E23A32")]),
    # Ben 10: BROWN hair like Ben, GREEN eyes/accent, greenish clothes.
    "ben10":   dict(name="Ben 10",  passes=[HAIR("#6E4A2C"), CLOTHES("#2E7D37", 2.0), BOLT("#42C24A")]),
    # Alien X handled by VOID path below (no passes).
    "alienx":  dict(name="Alien X", void=True),

    # ── Killua extras ──
    # Lavender (shared with Gojo): very light lavender-pink hair + soft lavender clothes, low emphasis
    # (bolt kept its natural cyan so it isn't heavy-handed).
    "lavender":  dict(name="Lavender", passes=[HAIR("#E6C8E8"), CLOTHES("#B892C6", 1.7)]),
    # Deep Black (requested): deep-black hair + TAN skin + dark high-collar "turtleneck" top.
    "deepblack": dict(name="Nightfall", passes=[SKIN("#B0703C", 1.35), HAIR("#17171C"), CLOTHES("#222228", 1.5)]),
    # Gon (best friend tribute): dark green-black hair + Gon's green outfit + green bolt.
    "gon":       dict(name="Best Friends", passes=[HAIR("#1C3A24"), CLOTHES("#2F7D34", 2.0), BOLT("#49C256")]),
    # Godspeed (his lightning transformation): electric white-blue hair + deep-blue suit + bright bolt.
    "godspeed":  dict(name="Godspeed", passes=[HAIR("#CFE6FF"), CLOTHES("#1E3A8A", 2.1), BOLT("#6FE9FF")]),
}

def void_crush(src, dst):
    im = Image.open(src).convert("RGBA"); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0: continue
            v = colorsys.rgb_to_hsv(r/255, g/255, b/255)[2]
            nv = max(0.02, min(0.14, 0.03 + v*0.10)); gg = round(nv*255)
            px[x, y] = (gg, gg, max(gg, round(gg*1.14)), a)
    im.save(dst)

def build(tag):
    cfg = SKINS[tag]
    if cfg.get("void"):
        void_crush(ATLAS, os.path.join(ROOT, f"killua_atlas__{tag}.png"))
        void_crush(PORTRAIT, os.path.join(ROOT, f"killua_portrait__{tag}.png"))
        print(f"  {tag}: VOID crush (atlas+portrait)")
        return
    c = recolor_multi(ATLAS, tag, cfg["passes"])
    cp = recolor_multi(PORTRAIT, tag, cfg["passes"])
    print(f"  {tag}: atlas {c}px, portrait {cp}px changed")

def montage():
    """Idle-crop (0,0,54,53) strip across default + every tag, 4x, for eyeballing."""
    tags = ["__default__"] + list(SKINS.keys())
    crops = []
    for t in tags:
        p = ATLAS if t == "__default__" else os.path.join(ROOT, f"killua_atlas__{t}.png")
        im = Image.open(p).convert("RGBA").crop((0, 0, 54, 53))
        im = im.resize((54*4, 53*4), Image.NEAREST)
        crops.append((t, im))
    pad = 8; cw, ch = 54*4, 53*4
    out = Image.new("RGBA", (len(crops)*(cw+pad)+pad, ch+pad*2), (40, 40, 48, 255))
    for i, (t, im) in enumerate(crops):
        out.paste(im, (pad + i*(cw+pad), pad), im)
    out.save(os.path.join(ROOT, "killua_work_montage.png"))
    print("  montage -> killua_work_montage.png :", ", ".join(t for t, _ in crops))

if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "killua_work"), exist_ok=True)
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = list(SKINS.keys()) if arg == "all" else [arg]
    for t in tags: build(t)
    montage()
