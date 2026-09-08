#!/usr/bin/env python3
"""
gen_albedo_recolor.py — build Albedo's sprite set as a palette recolor of Ben 10's
existing sheets (Ben-human + the 3 art-backed aliens XLR8 / Diamondhead / Feedback).

Albedo = Ben's clone: his GREEN Omnitrix accents become RED (Ultimatrix), and his
BROWN hair becomes GRAY/white. Everything else (skin, pants, alien bodies) stays.

Outputs <stem>__albedo.png alongside every original (NEVER overwrites Ben's files),
which is exactly the naming fighters.js _retagAlienAnim / skins.recolorSkinAnim expect
(sheet.png -> sheet__albedo.png). Drives the project's tools/recolor_palette.py — no
new recolor engine.

CALIBRATION (sampled from the real sheets, see the audit in updates.TXT):
  GREEN accent  Ben shirt/Omnitrix hue ~80-90 (#406010); Feedback accent hue ~74;
                XLR8 is cyan (~180) so a green pass only hits its tiny Omnitrix dot.
                => green pass = hue 60-155, sat>=0.35  -> RED (hue 0).
  BROWN hair    hue ~20-30, sat>=0.5, val<0.6 (#402000/#804010). SKIN is hue ~34 but
                val 0.88-0.94 & sat<0.57, so the val/sat gates EXCLUDE skin cleanly.
                => hair pass = hue 12-45, sat>=0.5, val<=0.6 -> gray/white.
  DIAMONDHEAD   his crystal BODY is green (hue ~132, #70c080) — a green pass would
                turn his whole body red, which is WRONG (that's his palette, not an
                accent). So Diamondhead is COPIED unchanged to __albedo (renders
                correctly under the retag; a bespoke "Negative Diamondhead" tint is a
                future tuning pass). His green stays green by design.

USAGE: python3 tools/gen_albedo_recolor.py            # build all
       python3 tools/gen_albedo_recolor.py preview    # build + contact-sheet montage
"""
import os, sys, importlib.util, shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TAG = "albedo"

def _load_rp():
    spec = importlib.util.spec_from_file_location("recolor_palette", os.path.join(os.path.dirname(__file__), "recolor_palette.py"))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
RP = _load_rp()

# Green Omnitrix/shirt accent -> Ultimatrix red (value preserved so shading survives).
GREEN_TO_RED = dict(from_hue="60-155", min_sat=0.35, to_hue=0, to_sat=0.8)
# Brown hair -> gray/white (desaturate + lift value); sat/val gates keep skin untouched.
HAIR_TO_GRAY = dict(from_hue="12-45", min_sat=0.5, max_val=0.6, to_hue=0, to_sat=0.04, val_gain=1.5, val_lift=0.3)

# Ben-human unique sheets (from characters.ben10.animationData) — full identity swap.
HUMAN = [
    "ben10_idle_uniform.png", "ben10_run_uniform.png", "ben10_jump_uniform.png",
    "ben10_jab_uniform.png", "ben10_up_uniform.png", "ben10_down_air_uniform.png",
    "ben10_hoverboard_uniform.png", "ben10_transform_uniform.png", "ben10_taunt_uniform.png",
]
# XLR8 (cyan body) — green pass only recolors the small Omnitrix accent; body safe.
XLR8 = [
    "ben10_xlr8_combo_uniform.png", "ben10_xlr8_crouch_uniform.png", "ben10_xlr8_fall_uniform.png",
    "ben10_xlr8_front_uniform.png", "ben10_xlr8_getup_uniform.png", "ben10_xlr8_guard_uniform.png",
    "ben10_xlr8_heavy_uniform.png", "ben10_xlr8_hurt_uniform.png", "ben10_xlr8_idle_uniform.png",
    "ben10_xlr8_jump_uniform.png", "ben10_xlr8_knockdown_uniform.png", "ben10_xlr8_run_uniform.png",
    "ben10_xlr8_up_uniform.png",
]
# Feedback (black/cyan body) — green pass only recolors the small green accent; body safe.
FEEDBACK = [
    "feedback_charge_animation_uniform.png", "feedback_electric_shot_uniform.png",
    "feedback_idle_uniform.png", "feedback_jump_uniform.png", "feedback_run_uniform.png",
    "feedback_ultimate_uniform.png",
]
# Diamondhead (GREEN crystal body) — COPY unchanged; green must NOT go red.
DIAMONDHEAD = [
    "ben10_diamond_head_forward_uniform.png", "ben10_diamond_head_idle_uniform.png",
    "ben10_diamond_head_jump_uniform.png", "ben10_diamond_head_rising_uniform.png",
    "ben10_diamond_head_run_uniform.png", "ben10_diamond_head_shooting_uniform.png",
]

def _out(path): stem, _ = os.path.splitext(path); return f"{stem}__{TAG}.png"

# Portrait = same 2-pass as Ben-human (headshot cropped from the idle strip, like Ben's).
PORTRAIT = "ben10_portrait.png"

# PASS 2 (Stage 4) — the newly-wired aliens (Wildmutt + Stage-3 nine). glob each alien's *_uniform
# sheets and apply green->red, EXCEPT green-bodied aliens (copy unchanged, Diamondhead exception) so a
# green pass doesn't wrongly redden the whole body. prefix -> green_bodied.
import glob as _glob
PASS2 = {
    "ben10_wildmutt_":   False,
    "ben10_heatblast_":  False,
    "ben10_fourarms_":   False,
    "ben10_upgrade_":    True,    # Galvanic Mechomorph — GREEN body -> copy
    "ben10_eyeguy_":     False,
    "ben10_alienx_":     False,
    "ben10_cannonbolt_": False,
    "ben10_clockwork_":  False,
    "ben10_chromastone_": False,
    "ben10_brainstorm_": False,
}

def build():
    n = 0
    for f in HUMAN + [PORTRAIT]:                      # green->red + hair->gray
        RP.recolor_multi(os.path.join(ROOT, f), TAG, [GREEN_TO_RED, HAIR_TO_GRAY]); n += 1
    for f in XLR8 + FEEDBACK:                          # green->red only
        RP.recolor_file(os.path.join(ROOT, f), TAG, **GREEN_TO_RED); n += 1
    for f in DIAMONDHEAD:                              # copy (green body preserved)
        shutil.copyfile(os.path.join(ROOT, f), os.path.join(ROOT, _out(f))); n += 1
    # ── PASS 2: the pass-2 aliens (glob each prefix's uniform sheets, skip existing __variants) ──
    for prefix, green_bodied in PASS2.items():
        sheets = [os.path.basename(p) for p in _glob.glob(os.path.join(ROOT, prefix + "*_uniform.png"))
                  if "__" not in os.path.basename(p)]
        for f in sorted(sheets):
            if green_bodied:
                shutil.copyfile(os.path.join(ROOT, f), os.path.join(ROOT, _out(f)))
            else:
                RP.recolor_file(os.path.join(ROOT, f), TAG, **GREEN_TO_RED)
            n += 1
        tag = "COPY (green body)" if green_bodied else "green->red"
        print(f"  {prefix}*: {len(sheets)} sheets ({tag})")
    print(f"OK — wrote {n} __{TAG} sheets (Ben-human {len(HUMAN)} 2-pass, "
          f"XLR8 {len(XLR8)}+Feedback {len(FEEDBACK)} green-only, Diamondhead {len(DIAMONDHEAD)} copied)")

def _frame0(path):
    im = Image.open(os.path.join(ROOT, path)).convert("RGBA"); W, H = im.size; px = im.load()
    col = [sum(1 for y in range(H) if px[x, y][3] > 16) for x in range(W)]
    x0 = next((x for x in range(W) if col[x] > 0), 0)
    x1 = next((x for x in range(x0, W) if col[x] == 0), W) - 1
    ys = [y for y in range(H) for x in range(x0, x1 + 1) if px[x, y][3] > 16]
    return im.crop((x0, min(ys), x1 + 1, max(ys) + 1)) if ys else im

def preview():
    build()
    pairs = [("Ben idle", "ben10_idle_uniform.png"), ("XLR8", "ben10_xlr8_idle_uniform.png"),
             ("Diamondhd", "ben10_diamond_head_idle_uniform.png"), ("Feedback", "feedback_idle_uniform.png")]
    cw, ch, lbl = 130, 150, 16
    mont = Image.new("RGBA", (len(pairs) * cw, ch * 2 + lbl * 2 + 8), (28, 28, 34, 255))
    d = ImageDraw.Draw(mont)
    try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 12)
    except Exception: font = ImageFont.load_default()
    for i, (name, base) in enumerate(pairs):
        for row, (rl, path) in enumerate([("Ben", base), ("Albedo", _out(base))]):
            cell = _frame0(path); sc = min((cw - 12) / cell.width, (ch - 12) / cell.height, 2.4)
            rs = cell.resize((max(1, round(cell.width * sc)), max(1, round(cell.height * sc))), Image.NEAREST)
            cy = row * (ch + lbl)
            mont.alpha_composite(rs, (i * cw + (cw - rs.width) // 2, cy + lbl + (ch - rs.height)))
            d.text((i * cw + 4, cy + 2), f"{rl}: {name}", fill=(230, 230, 235, 255), font=font)
    out = os.path.join(ROOT, "albedo_recolor_preview.png"); mont.convert("RGB").save(out)
    print(f"-> albedo_recolor_preview.png (top=Ben, bottom=Albedo)")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "preview": preview()
    else: build()
