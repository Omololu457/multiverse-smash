#!/usr/bin/env python3
"""Soldier Boy coordinated recolor skins (__<tag>.png) across his _uniform.png STRIPS.

Soldier Boy's sheets are horizontal frame strips (one row) → per-frame recolour with bbox-relative
ybands (recolor_palette.recolor_perframe), same discipline as gen_gojo_creative.py.

REGIONS (measured on soldier_boy_idle_uniform.png — green suit, gold shield, maroon boots, brown hair):
  HAIR   — brown hair+beard: warm (hue 12-45), DARK (max_val .60 keeps it off the pale face), TOP band.
  SUIT   — the dark-GREEN body suit: hue 135-185 (cleanly hue-separable → the main garment).
  SHIELD — the big GOLD shield + gold chest plate: hue 42-62, saturated + bright (min_val .42).
  BOOTS  — maroon belt + boots + gloves: hue 328-358.
  SKIN   — pale face (hue 15-45, bright): PROTECTED except `nuclear`, which irradiates it sickly-green.
  alienx — EVERY opaque pixel crushed to near-black; stars drawn by game.js drawAlienXStarfield.
"""
import sys, os, re, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_perframe, recolor_file
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")

def HAIR(h, sp=1.3):   return dict(from_hue="12-45", min_sat=0.28, min_val=0.16, max_val=0.60, yband="0.0-0.30", to_tone=h, tone_spread=sp)
def SUIT(h, sp=1.9):   return dict(from_hue="135-188", min_sat=0.22, to_tone=h, tone_spread=sp)
def SHIELD(h, sp=1.7): return dict(from_hue="40-64", min_sat=0.40, min_val=0.40, to_tone=h, tone_spread=sp)
def BOOTS(h, sp=1.8):  return dict(from_hue="326-360", min_sat=0.33, to_tone=h, tone_spread=sp)
def SKIN(h, sp=1.2):   return dict(from_hue="12-45", min_sat=0.12, max_sat=0.52, min_val=0.60, yband="0.0-0.40", to_tone=h, tone_spread=sp)

SKINS = {
    # ── requested "basic" trio ──
    # Albedo (Ben 10 negative): GRAY hair, reddish suit, silver shield (red eyes read via the red theme).
    "albedo": dict(name="Albedo", passes=[HAIR("#9A9AA2"), SUIT("#7E2730", 2.1), SHIELD("#9092A0"), BOOTS("#4E1E26")]),
    # Ben 10: BROWN hair, bright Ben-green everywhere (suit + shield + boots), green theme.
    "ben10":  dict(name="Ben 10", passes=[HAIR("#6E4A2C"), SUIT("#49B23E", 1.8), SHIELD("#2F8A30"), BOOTS("#2B6B20")]),
    # Alien X handled by the void path below.
    "alienx": dict(name="Alien X", void=True),

    # ── creative canonical ──
    # NUCLEAR — Soldier Boy's radioactive meltdown blast (his signature power): irradiated toxic-green
    # suit, glowing yellow-green shield, sickly-green skin, ashen hair. The "Cyborg-Superman-cool" one.
    "nuclear": dict(name="Nuclear Meltdown", passes=[SKIN("#A6C47C"), HAIR("#8C9068"), SUIT("#5FD43A", 1.7), SHIELD("#D8F23A"), BOOTS("#2E5E1F")]),
    # PAYBACK — his superhero-team/Vought-era patriotic variant: navy suit, bright gold shield, red boots.
    "payback": dict(name="Payback", passes=[HAIR("#45331F"), SUIT("#27408B", 2.0), SHIELD("#E8C23A"), BOOTS("#8E1F2A")]),
}

def wired_sheets():
    src = open(os.path.join(ROOT, "characters.js")).read()
    i = src.index("soldier_boy"); block = src[i:i+40000]
    w = {}
    for m in re.finditer(r'width:\s*(\d+)[^}]*?sheet:\s*"\./(soldier_boy_[^"]+)"', block):
        w.setdefault(m.group(2), int(m.group(1)))
    return sorted(w.items())

def void_crush_sheet(src, dst):
    im = Image.open(src).convert("RGBA"); px = im.load(); W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a == 0: continue
            v = colorsys.rgb_to_hsv(r/255, g/255, b/255)[2]
            nv = max(0.02, min(0.14, 0.03 + v*0.10)); gg = round(nv*255)
            px[x, y] = (gg, gg, max(gg, round(gg*1.14)), a)
    im.save(dst)

def make_portrait(tag):
    p = os.path.join(ROOT, "soldier_boy_portrait.png")
    if os.path.exists(p):
        recolor_sheet_portrait(tag, p)

def recolor_sheet_portrait(tag, p):
    cfg = SKINS[tag]
    if cfg.get("void"):
        void_crush_sheet(p, os.path.join(ROOT, f"soldier_boy_portrait__{tag}.png")); return
    img = Image.open(p)
    from recolor_palette import apply_recolor, _NS
    for opts in cfg["passes"]:
        img, _ = apply_recolor(img, _NS(**opts))
    img.save(os.path.join(ROOT, f"soldier_boy_portrait__{tag}.png"))

def build(tag, only_sheet=None):
    cfg = SKINS[tag]; total = 0
    for name, cell_w in wired_sheets():
        if only_sheet and only_sheet not in name: continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path): print(f"  SKIP {name}"); continue
        if cfg.get("void"):
            void_crush_sheet(path, os.path.join(ROOT, name.replace(".png", f"__{tag}.png")))
        else:
            n, changed, per = recolor_perframe(path, tag, cell_w, cfg["passes"]); total += changed
    make_portrait(tag)
    print(f"DONE {tag}: {'void' if cfg.get('void') else str(total)+'px'} (+portrait)")

def montage():
    tags = ["__base__"] + list(SKINS.keys())
    crops = []
    for t in tags:
        p = "soldier_boy_idle_uniform.png" if t == "__base__" else f"soldier_boy_idle_uniform__{t}.png"
        im = Image.open(os.path.join(ROOT, p)).convert("RGBA"); W, H = im.size; cw = W // 5
        fr = im.crop((0, 0, cw, H)); bb = fr.getbbox()
        if bb: fr = fr.crop(bb)
        fr = fr.resize((fr.width*3, fr.height*3), Image.NEAREST)
        crops.append((t, fr))
    mh = max(f.height for _, f in crops); pad = 8
    out = Image.new("RGBA", (sum(f.width+pad for _, f in crops)+pad, mh+pad*2), (40, 40, 48, 255))
    x = pad
    for t, f in crops:
        out.paste(f, (x, pad+(mh-f.height)), f); x += f.width+pad
    out.save(os.path.join(ROOT, "soldier_boy_work_montage.png"))
    print("tags:", ", ".join(tags))

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    tags = list(SKINS.keys()) if arg == "all" else [arg]
    for t in tags: build(t)
    montage()
