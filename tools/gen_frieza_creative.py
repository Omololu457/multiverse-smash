#!/usr/bin/env python3
"""Frieza (Dragon Ball, base/final form) — 10 palette skins (+ Default = 11).

★Golden Frieza / Black Frieza are NOT skins — they are real gameplay TRANSFORMATIONS (charge-triggered,
threshold-gated, energy-drain tiers). They must NEVER appear in this skins system.

REGIONS (classified ONCE from the ORIGINAL pixels of frieza_*_uniform.png, so recolour is contamination-proof).
Confirmed by pixel-sampling (frieza_idle_uniform.png): the "white body/shell" is actually a WHITE shell
rendered with CYAN-TEAL shading (whites 243,248,242 · mids 152,200,206 · teal 97,144,149 · deep-teal 19,101,126),
NOT neutral grey. The purple ACCENT plates are hue ~270-280 (34,1,56 → 139,71,182). EYES are red (210,6,30).
  * OUTLINE — near-black line-art (v < 0.16 & s < 0.55). PROTECTED (never recoloured).
  * EYE     — the red eyes (hue ≥ 330 or ≤ 12) & s ≥ 0.45 & v ≥ 0.32. Kept red (except Void).
  * ACCENT  — the purple plates (250 ≤ hue ≤ 300 & s ≥ 0.25). The per-skin ACCENT colour.
  * BODY    — everything else opaque = the white shell + its cyan/teal shading. The PRIMARY per-skin colour.
The TAIL is not a separate region — its shell parts fall in BODY and its accent stripe in ACCENT, so the
body/accent split follows automatically (no spatial work).

paint = LUMINANCE RAMP: each region's pixel luminance, normalised within FIXED per-region anchors (kept
constant across ALL sheets so a skin looks identical everywhere), maps linearly between the region's DARK and
LIGHT target hex — preserving the original shading/sculpt. Cosmetic only; zero gameplay.

USAGE: gen_frieza_creative.py [probe|preview|<tag>|all]   (default: all)
  probe   -> frieza_skin_mask_debug.png (regions tinted) + counts — verify classification before batching
  preview -> recolour idle for every skin + frieza_skins_preview.png montage (no full batch)
  <tag>   -> recolour every sheet + portrait for one skin
  all     -> recolour every sheet + portrait for all 10 skins
"""
import os, sys, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
ALPHA = 40

SHEETS = [
    "frieza_idle_uniform.png", "frieza_dash_uniform.png", "frieza_jump_uniform.png",
    "frieza_crouch_uniform.png", "frieza_hurt_uniform.png", "frieza_knockdown_uniform.png",
    "frieza_getup_uniform.png", "frieza_taunt_uniform.png", "frieza_light_uniform.png",
    "frieza_heavy_uniform.png", "frieza_air_uniform.png", "frieza_guard_uniform.png",
    "frieza_rush1_uniform.png", "frieza_rush2_uniform.png", "frieza_rush3_uniform.png",
    "frieza_deathbeam_uniform.png", "frieza_kiblast_uniform.png", "frieza_deathball_uniform.png",
    "frieza_overload_uniform.png", "frieza_win_uniform.png",
]
PORTRAIT = "frieza_portrait.png"

# Fixed per-region luminance anchors (min,max) — the shading spread the ramp maps dark→light across.
BODY_LO, BODY_HI     = 0.34, 1.00     # deep-teal shadow → white highlight
ACCENT_LO, ACCENT_HI = 0.05, 0.72     # dark-purple → light-purple plate

def classify(h, s, v):
    if v < 0.16 and s < 0.55:                        return "OUTLINE"
    if (h >= 330 or h <= 12) and s >= 0.45 and v >= 0.32: return "EYE"
    if 250 <= h <= 300 and s >= 0.25:                return "ACCENT"
    return "BODY"

def hx(x): x = x.lstrip("#"); return tuple(int(x[i:i+2], 16) for i in (0, 2, 4))

def ramp(v, lo, hi, dark, light):
    """Map luminance v∈[lo,hi] → 0..1 → lerp(dark,light)."""
    t = 0.0 if hi <= lo else max(0.0, min(1.0, (v - lo) / (hi - lo)))
    return tuple(round(dark[i] + (light[i] - dark[i]) * t) for i in range(3))

# Each skin: BODY (darkHex, lightHex), ACCENT (darkHex, lightHex), keep_eyes.
# Single-colour accents from the prompt are given a small dark→light pair to preserve plate sculpt.
SKINS = {
    # ── GROUP 1 ──
    "crimsontyrant":  {"name": "Crimson Tyrant",     "body": ("#5C0F14", "#8C2A2E"), "accent": ("#050505", "#242424"), "eyes": "keep"},
    "verdantoverlord":{"name": "Verdant Overlord",   "body": ("#0F3D2E", "#2E7B5C"), "accent": ("#0D2A1D", "#2A6B49"), "eyes": "keep"},
    "azureconqueror": {"name": "Azure Conqueror",    "body": ("#0F2E5C", "#2E5C8C"), "accent": ("#0A1626", "#2A4E7A"), "eyes": "keep"},
    "obsidianemperor":{"name": "Obsidian Emperor",   "body": ("#0A0A0A", "#242424"), "accent": ("#1F1F1F", "#5C5C5C"), "eyes": "keep"},
    # ── GROUP 2 ──
    "violetreborn":   {"name": "Violet Reborn",      "body": ("#B8A8CC", "#ECE4F5"), "accent": ("#3A1C5C", "#7A4AB0"), "eyes": "keep"},
    "embertyrant":    {"name": "Ember Tyrant",       "body": ("#8C3D1A", "#C9691A"), "accent": ("#241609", "#52381F"), "eyes": "keep"},
    "frostboundoverlord":{"name":"Frostbound Overlord","body": ("#D6E8F0", "#F0F7FA"), "accent": ("#3E6478", "#7AAAC2"), "eyes": "keep"},
    "ashentyrant":    {"name": "Ashen Tyrant",       "body": ("#8C8C8C", "#B5B5B5"), "accent": ("#242424", "#565656"), "eyes": "keep"},
    # ── SPECIALTY ──
    "void":           {"name": "Void Sovereign",     "body": ("#0A0A0C", "#1A1A20"), "accent": ("#08080A", "#141418"), "eyes": "void"},   # near-black EVERYTHING incl. eyes/face (deliberate exception)
    "mecha":          {"name": "Mecha Frieza",       "body": ("#B0B4B8", "#D6D8DA"), "accent": ("#181B1F", "#3A3E44"), "eyes": "keep"},   # metallic silver shell + dark mechanical joints
}

def recolor(im, spec):
    src = im.convert("RGBA"); px = src.load(); W, H = src.size
    bd, bl = hx(spec["body"][0]),   hx(spec["body"][1])
    ad, al = hx(spec["accent"][0]), hx(spec["accent"][1])
    vd, vl = hx("#08080A"), hx("#16161C")   # Void eye/face target
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= ALPHA: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            reg = classify(h, s, v)
            if reg == "OUTLINE":
                continue
            if reg == "EYE":
                if spec["eyes"] == "void":
                    nr, ng, nb = ramp(v, ACCENT_LO, ACCENT_HI, vd, vl)
                else:
                    continue   # keep red
            elif reg == "ACCENT":
                nr, ng, nb = ramp(v, ACCENT_LO, ACCENT_HI, ad, al)
            else:   # BODY
                nr, ng, nb = ramp(v, BODY_LO, BODY_HI, bd, bl)
            px[x, y] = (nr, ng, nb, a)
    return src

def probe():
    im = Image.open(os.path.join(ROOT, "frieza_idle_uniform.png")).convert("RGBA")
    px = im.load(); W, H = im.size
    TINT = {"OUTLINE": (0, 0, 0), "EYE": (255, 0, 0), "ACCENT": (255, 0, 255), "BODY": (0, 200, 255)}
    counts = {k: 0 for k in TINT}
    out = Image.new("RGBA", (W, H), (30, 30, 30, 255)); op = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= ALPHA: continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); h *= 360
            reg = classify(h, s, v); counts[reg] += 1
            op[x, y] = TINT[reg] + (255,)
    out.resize((W*3, H*3), Image.NEAREST).save(os.path.join(ROOT, "frieza_skin_mask_debug.png"))
    print("regions:", counts, "-> frieza_skin_mask_debug.png (BODY=cyan ACCENT=magenta EYE=red OUTLINE=black)")

def do_sheet(name, tag, spec):
    p = os.path.join(ROOT, name)
    if not os.path.exists(p): print("  MISSING", name); return
    out = recolor(Image.open(p), spec)
    out.save(os.path.join(ROOT, name.replace(".png", f"__{tag}.png")))

def do_skin(tag, sheets=SHEETS, with_portrait=True):
    spec = SKINS[tag]
    for s in sheets: do_sheet(s, tag, spec)
    if with_portrait and os.path.exists(os.path.join(ROOT, PORTRAIT)):
        do_sheet(PORTRAIT, tag, spec)
    print(f"  OK {tag} ({spec['name']}): {len(sheets)} sheets + portrait")

def preview():
    ims = []
    for tag in SKINS:
        out = recolor(Image.open(os.path.join(ROOT, "frieza_idle_uniform.png")), SKINS[tag])
        ims.append((tag, out))
    cw = max(i.width for _, i in ims) + 6; ch = ims[0][1].height + 4
    strip = Image.new("RGBA", (cw*len(ims), ch), (40, 40, 46, 255))
    for k, (_, im) in enumerate(ims): strip.alpha_composite(im, (k*cw+3, 2))
    strip.resize((strip.width*2, strip.height*2), Image.NEAREST).save(os.path.join(ROOT, "frieza_skins_preview.png"))
    print(f"preview -> frieza_skins_preview.png ({len(ims)} skins)")

if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg == "probe": probe()
    elif arg == "preview": preview()
    elif arg in SKINS: do_skin(arg)
    elif arg == "all":
        for tag in SKINS: do_skin(tag)
        print(f"DONE — {len(SKINS)} skins × {len(SHEETS)} sheets + portraits")
    else: print("usage: probe | preview | <tag> | all"); sys.exit(1)
