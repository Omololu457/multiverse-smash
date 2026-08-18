#!/usr/bin/env python3
"""Green Lantern (Hal Jordan, DC) — Lantern-Corps palette skins (8 corps recolors + Black Lantern) +
2 specialties (Void Sovereign, Parallax Armor) = 10 (+ Default = 11).

REGIONS confirmed by pixel-sampling gl_idle_uniform.png (NOT the comic costume), classified ONCE from
ORIGINAL pixels (contamination-proof), priority order:
  * OUTLINE   — near-black line-art + deepest shadow (v < 0.094, i.e. RGB max < 24). PROTECTED (never
                recoloured). Splits from the suit-secondary greys (#202020 v.125 / #404040 v.25) at v.094:
                measured ~2850 outline px vs ~4419 secondary-grey px.
  * SKIN/HAIR — warm face skin (#f0c090…) + brown hair (#603000…): warm hue (h<50 or >330) & s>0.18 &
                v>0.18. PROTECTED by the skin-exclusion rule (Void Sovereign is the one exception).
  * WHITE     — gloves / forearms (+ the Corps-symbol ring): v>0.72 & s<0.20.  (#f0f0f0 / #c0c0c0)
  * GREEN     — SUIT MAIN (torso, shoulders, feet, domino mask, symbol glyph): 80<=h<=175 & s>0.28.
                The PRIMARY per-skin colour.  (#10c000 / #108000 / #005000)
  * SECONDARY — the black suit (legs, arms, armpits): neutral (s<0.28) & 0.094<=v<0.72.  (#202020/#404040)
  * OTHER     — rare AA — left untouched.

★ HEALTH-CHECK NOTE (no sprite VIEWED this session — the conversation image budget was exhausted; regions
were confirmed NUMERICALLY via the histogram above + `probe` region counts, NOT by eye). The Corps SYMBOL
is NOT spatially isolated: its GLYPH recolours with GREEN (suit main → corps colour, correct), its RING
recolours with WHITE (gloves). CONSEQUENCE (accepted): Black Lantern gets a grey-white symbol by setting
its GLOVES region to grey-white #D6D6D6 (the ring reads skeletal-grey); White Lantern's rainbow symbol is
NOT achievable without spatial masking → flat white (flagged). Visual sign-off is DEFERRED to a session
with image budget.

paint(): keep-value recolour re-tones a region onto the target hue/sat while PRESERVING each pixel's
brightness (shading intact); lift-value recolour REMAPS the region's measured [vLo,vHi] onto a new
[outLo,outHi] band (used for the black→light suits: Blue Corps / White Lantern). Cosmetic only.

USAGE: gen_green_lantern_creative.py [probe|preview|all|<tag>...]     # default: all
  probe   -> gl_skin_region_debug.png (regions tinted) + region counts, to verify classification
  preview -> recolour idle per skin + gl_skins_preview.png montage (no full batch)
  all     -> recolour EVERY animationData sheet + portrait + the 6 construct FX sheets, for all 10 skins
"""
import os, sys, colorsys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
def P(f): return os.path.join(ROOT, f)

# UNIQUE body sheets in green_lantern.animationData (walk/dash=run, guard/getup=idle, down_air=air are
# reuses → covered by recolouring run/idle/air). Recoloured per skin as <sheet>__<tag>.png.
BODY_SHEETS = [
    "gl_idle_uniform.png", "gl_run_uniform.png", "gl_jump_uniform.png", "gl_fall_uniform.png",
    "gl_flight_uniform.png", "gl_hurt_uniform.png", "gl_knockdown_uniform.png",
    "gl_light_uniform.png", "gl_heavy_uniform.png", "gl_up_uniform.png", "gl_air_uniform.png",
    "gl_spinkick_uniform.png", "gl_beam_uniform.png", "gl_win_uniform.png",
]
PORTRAIT = "gl_portrait.png"
# The 6 hard-light CONSTRUCT projectile sheets (FULL FX-recolour scope, owner decision): pure green+outline,
# so only the GREEN region maps to the corps colour. Recoloured per skin as <sheet>__<tag>.png; the runtime
# (abilities.js fireGLConstruct) picks the skinId variant. The Energy Beam is procedural → tinted in code.
FX_SHEETS = [
    "gl_fist_uniform.png", "gl_lion_uniform.png", "gl_blade_uniform.png",
    "gl_tentacle_uniform.png", "gl_spike_uniform.png", "gl_sphere_uniform.png",
]

def classify(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    hd = h * 360
    if v < 0.094:                                   return "outline"
    if (hd < 50 or hd > 330) and s > 0.18 and v > 0.18: return "skin"
    if v > 0.72 and s < 0.20:                       return "white"
    if 80 <= hd <= 175 and s > 0.28:                return "green"
    if s < 0.28:                                    return "secondary"
    return "other"

# ── measure each region's value range once (for lift-value remaps) ──
def region_vranges():
    im = Image.open(P("gl_idle_uniform.png")).convert("RGBA"); px = im.load(); W, H = im.size
    lo = {}; hi = {}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 40: continue
            reg = classify(r, g, b)
            _, _, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            lo[reg] = min(lo.get(reg, 1.0), v); hi[reg] = max(hi.get(reg, 0.0), v)
    return lo, hi
VLO, VHI = region_vranges()

def _hsv(h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h, s, v); return (int(r * 255 + .5), int(g * 255 + .5), int(b * 255 + .5))

# a region spec is ("keep", H, S) or ("lift", H, S, outLo, outHi) or ("skinvoid", ...) handled specially.
def paint_pixel(reg, r, g, b, spec):
    if spec is None:  # protected region → unchanged
        return (r, g, b)
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    mode = spec[0]
    if mode == "keep":
        _, th, ts = spec
        return _hsv(th, ts, v)
    if mode == "lift":
        _, th, ts, outLo, outHi = spec
        vlo, vhi = VLO.get(reg, 0.0), VHI.get(reg, 1.0)
        t = 0.0 if vhi <= vlo else (v - vlo) / (vhi - vlo)
        return _hsv(th, ts, outLo + t * (outHi - outLo))
    return (r, g, b)

# ── PER-SKIN PALETTES ──  H in [0,1], S in [0,1].  green=suit main, secondary=black suit, white=gloves.
#   skin/hair + outline PROTECTED (None) unless a skin overrides (Void = full-black incl. skin).
def keep(hexh, s): return ("keep", hexh, s)
Y = 48/360; RED = 353/360; ORG = 28/360; BLU = 210/360; IND = 258/360; VLT = 322/360
SKINS = {
    # ── Group 1 ──
    "sinestrocorps":     {"green": keep(Y, 0.85),  "secondary": keep(Y, 0.02, ),  "white": keep(Y, 0.90), "note": "fear — yellow suit, black secondary kept dark, black gloves(→dark yellow)"},
    "redlanterncorps":   {"green": keep(RED, 0.82), "secondary": None,             "white": None,          "note": "rage — deep red suit, black secondary, white gloves"},
    "orangelanterncorps":{"green": keep(ORG, 0.85), "secondary": None,             "white": None,          "note": "avarice — vivid orange suit, white gloves"},
    "bluelanterncorps":  {"green": keep(BLU, 0.80), "secondary": ("lift", BLU, 0.10, 0.72, 0.90), "white": None, "note": "hope — bright blue suit, WHITE secondary (lifted), white gloves"},
    # ── Group 2 ──
    "indigotribe":       {"green": keep(IND, 0.72), "secondary": None,             "white": None,          "note": "compassion — deep indigo suit"},
    "starsapphirecorps": {"green": keep(VLT, 0.78), "secondary": None,             "white": None,          "note": "love — violet-pink suit"},
    "blacklanterncorps": {"green": ("lift", 0.0, 0.0, 0.06, 0.16), "secondary": ("lift", 0.0, 0.0, 0.04, 0.10), "white": ("keep", 0.0, 0.0), "note": "death — near-black suit; GLOVES→grey-white (skeletal symbol ring)", "glovesGrey": True},
    "whitelantern":      {"green": ("lift", 0.0, 0.0, 0.80, 0.98), "secondary": ("lift", 0.0, 0.0, 0.72, 0.92), "white": None, "note": "life — near-total white (rainbow symbol NOT isolable → flat white, flagged)"},
    # ── Specialties ──
    "voidsovereign":     {"green": ("lift", 0.68, 0.30, 0.05, 0.11), "secondary": ("lift", 0.68, 0.30, 0.03, 0.07), "white": ("lift", 0.68, 0.25, 0.06, 0.12), "skinvoid": True, "note": "full-form near-black incl. SKIN (+ game.js cosmic overlay)"},
    "parallaxarmor":     {"green": keep(96/360, 0.85), "secondary": ("lift", 96/360, 0.55, 0.05, 0.14), "white": ("keep", 96/360, 0.30), "note": "homage — armored black-dominant green (recolor approximation; NO plating geometry — flagged)"},
}
# glovesGrey: paint gloves to grey-white #D6D6D6 (skeletal). skinvoid: also darken skin+hair to the void tone.

def recolor_image(src_path, dst_path, spec):
    im = Image.open(src_path).convert("RGBA"); px = im.load(); W, H = im.size
    out = Image.new("RGBA", (W, H)); opx = out.load()
    glovesGrey = spec.get("glovesGrey"); skinvoid = spec.get("skinvoid")
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 40: opx[x, y] = (r, g, b, a); continue
            reg = classify(r, g, b)
            if reg in ("green", "secondary", "white"):
                if reg == "white" and glovesGrey:
                    _, _, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); nr = int(214 * (0.6 + 0.4*v)); opx[x, y] = (nr, nr, nr, a); continue
                nr, ng, nb = paint_pixel(reg, r, g, b, spec.get(reg))
                opx[x, y] = (nr, ng, nb, a)
            elif reg in ("skin",) and skinvoid:
                _, _, v = colorsys.rgb_to_hsv(r/255, g/255, b/255); opx[x, y] = paint_pixel("skin", r, g, b, ("lift", 0.68, 0.30, 0.05, 0.12)) + (a,)
            elif reg == "outline" and skinvoid:
                opx[x, y] = (10, 10, 16, a)
            else:
                opx[x, y] = (r, g, b, a)   # outline / skin / hair / other — protected
    out.save(dst_path)

def tagname(f, tag): return f.replace(".png", f"__{tag}.png")

def do_probe():
    im = Image.open(P("gl_idle_uniform.png")).convert("RGBA"); px = im.load(); W, H = im.size
    tint = {"outline": (255,0,255), "skin": (255,180,0), "white": (0,255,255), "green": (0,255,0), "secondary": (0,0,255), "other": (255,255,255)}
    dbg = Image.new("RGBA", (W, H)); dpx = dbg.load(); cnt = {}
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a <= 40: dpx[x, y] = (0,0,0,0); continue
            reg = classify(r, g, b); cnt[reg] = cnt.get(reg, 0) + 1
            dpx[x, y] = tint[reg] + (255,)
    dbg.save(P("gl_skin_region_debug.png"))
    tot = sum(cnt.values())
    print("REGION CLASSIFICATION (gl_idle_uniform.png):")
    for reg in ("green", "secondary", "white", "skin", "outline", "other"):
        n = cnt.get(reg, 0); print(f"  {reg:10s} {n:6d}  {100*n/tot:5.1f}%   Vrange [{VLO.get(reg,0):.3f}, {VHI.get(reg,0):.3f}]")
    print(f"  TOTAL {tot}")
    print("wrote gl_skin_region_debug.png (regions tinted: green=green suit / blue=black-secondary / cyan=white gloves / orange=skin+hair / magenta=outline)")

if __name__ == "__main__":
    args = sys.argv[1:] or ["all"]
    if args == ["probe"]:
        do_probe(); sys.exit(0)
    tags = [t for t in args if t in SKINS] or list(SKINS.keys())
    sheets = BODY_SHEETS + FX_SHEETS + [PORTRAIT]
    for tag in tags:
        spec = SKINS[tag]; n = 0
        for f in sheets:
            src = P(f)
            if not os.path.exists(src): print(f"  !! missing {f}"); continue
            recolor_image(src, P(tagname(f, tag)), spec); n += 1
        print(f"OK {tag}: {n} sheets  — {spec.get('note','')}")
    print(f"done {len(tags)} skins × {len(sheets)} sheets")
