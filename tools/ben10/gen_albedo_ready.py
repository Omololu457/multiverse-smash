#!/usr/bin/env python3
"""
gen_albedo_ready.py — Albedo's art for the 3 human variants + the 24 READY Omnitrix aliens.

Albedo = Ben's clone (rosterKey "albedo"). His art is Ben's EXISTING art with the Omnitrix / Ben-green regions turned
Ultimatrix red. Nothing is re-cut: every output has the source's exact size, alpha and frame layout, so hitboxes, anchors,
frame counts and the ledgers' frame→move maps are untouched. Source sheets are never modified.

ENGINE: tools/recolor_palette.py `apply_recolor` (the project's one recolor engine, already used by
tools/gen_albedo_recolor.py). No second recolor mechanism.

ALBEDO_RED (project-wide): the existing GREEN_TO_RED target — hue 0°, saturation 0.80, each pixel's HSV VALUE kept. So
every green shade maps to exactly ONE red shade (a pure function of its brightness), identical on every sheet: Albedo reads
as one consistent character across forms. HAIR_TO_GRAY (human only, owner choice 2026-11-18: keep Albedo's gray hair) is the
existing tool's pass, unchanged.

RUNTIME OUTPUTS (the names the existing retag expects — fighters.js _retagAlienAnim / characters.albedo / skins.js):
  <strip>.png → <strip>__albedo.png beside every body strip (*_uniform.png) of each READY alien (base + alternate tables),
  ben10_<action>_uniform.png → …__albedo.png (Alien Force / Prime human), ben10_<action>_uniform__classic.png →
  …__classic__albedo.png (Classic human), ben10_portrait__albedo.png, ben10_portrait__classic__albedo.png.
  FX sheets (*_fx_*) are NOT recolored (FX colours unchanged by design).
DELIVERABLE OUTPUTS:
  assets/sprites/ben10/albedo/human/{alienforce,classic,prime}.png   the variant source sheets recolored
  assets/sprites/ben10/albedo/aliens/<key>.png                        the alien's idle strip recolored
  docs/ben10/albedo/<key>_PALETTE.md, HUMAN_PALETTE.md, img/*.png    the audit (source colours, remapped / left + why,
                                                                      before/after crops, swatches)
Deterministic: re-runs are byte-identical.   USAGE: python3 tools/ben10/gen_albedo_ready.py
"""
import os, re, sys, json, glob, colorsys, importlib.util, subprocess
from collections import Counter
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TAG = "albedo"
spec = importlib.util.spec_from_file_location("recolor_palette", os.path.join(ROOT, "tools", "recolor_palette.py"))
RP = importlib.util.module_from_spec(spec); spec.loader.exec_module(RP)

ALBEDO_RED = dict(to_hue=0, to_sat=0.8)                     # = tools/gen_albedo_recolor.py GREEN_TO_RED target
HUMAN_GREEN = dict(from_hue="60-155", min_sat=0.35, **ALBEDO_RED)   # = GREEN_TO_RED (unchanged)
HAIR_TO_GRAY = dict(from_hue="12-45", min_sat=0.5, max_val=0.6, to_hue=0, to_sat=0.04, val_gain=1.5, val_lift=0.3)

def exact(*hexes):                                          # exact palette entries (tol 0), any saturation
    return dict(from_=",".join(hexes), tol=0.0, min_sat=0.0, **ALBEDO_RED)
def hue(lo, hi, min_sat, min_val=0.0):                       # a hue window (anti-aliased / resampled sheets)
    return dict(from_hue=f"{lo}-{hi}", min_sat=min_sat, min_val=min_val, **ALBEDO_RED)

HOUSE = "b5e61d"   # the roster's Omnitrix lime (MS-Paint lime): the mark on most Dragonrod sheets
# Per alien: the passes (what is remapped), what was deliberately LEFT and why, and the verdict.
RULES = {
  "swampfire":      dict(module="swampfire", passes=[hue(60, 100, 0.30)], verdict="recolored (green body)",
                         remap="his olive-green Methanosian body (6 olive shades h69–72 + the dark green-grey outline #384828) — a "
                               "green-bodied form, recolored like Ben's own green per the brief",
                         left="#f8f030 (h58) the yellow seed/spots — yellow, not green; red/orange flame accents"),
  "heatblast":      dict(module="heatblast", passes=[exact(HOUSE)], verdict="recolored (Omnitrix mark only)",
                         remap="#b5e61d the Omnitrix mark (base and Blue-flame tables)",
                         left="#ffff18 / #ffffbd / #f8f860 (h60) — flame yellows, his body fire, not green"),
  "megawhatt":      dict(module="megawhatt", passes=[exact(HOUSE)], verdict="recolored (Omnitrix lime: eyes + mark)",
                         remap="#b5e61d — his eyes and chest mark are drawn in the exact Omnitrix lime (Albedo's forms read with red eyes)",
                         left="#fff200 / #fff871 (h57) — his yellow electricity body, not green"),
  "goop":           dict(module="goop", passes=[hue(75, 120, 0.30)], verdict="recolored (green body)",
                         remap="his whole green goo body (10 shades h83–112 + #384828 / #408028 shading) — a green-bodied form per the brief",
                         left="the anti-gravity projector (grey / purple) and every non-green colour"),
  "xlr8":           dict(module="xlr8", passes=[exact(HOUSE, "84ce2c")], verdict="recolored (Omnitrix mark + green visor/eye)",
                         remap="#b5e61d mark, #84ce2c green eye/visor highlight",
                         left="blue stripes, black body, white — all non-green"),
  "eyeguy":         dict(module="eyeguy", passes=[exact(HOUSE)], verdict="recolored (Omnitrix lime eyes); shorts AMBIGUOUS-left",
                         remap="#b5e61d — every eye on his body + the in-strip Gaze orb are the exact Omnitrix lime",
                         left="AMBIGUOUS — #177d36 / #1d9441 / #14692e / #0d481f (h138): his dark-green SHORTS. Same hue family as "
                              "#22b14c but a clothing role, not the Omnitrix; left green rather than guessed. Separate eye-beam FX sheets "
                              "(*_fx_*) keep their colours, so a live beam stays green while the in-strip orb is red"),
  "ghostfreak":     dict(module="ghostfreak", passes=[exact("66ff00")], verdict="recolored (Omnitrix timeout flash)",
                         remap="#66ff00 — the whole-body Omnitrix green flash of his timeout strip (Omnitrix energy → Ultimatrix red)",
                         left="#18201f (h172, v0.13) near-black outline; the grey ghost body; the red eye"),
  "alienx":         dict(module="alienx", passes=[exact(HOUSE, "89c041")], verdict="recolored (Omnitrix mark only)",
                         remap="#b5e61d / #89c041 — the small chest mark",
                         left="black body, white starfield / outline"),
  "brainstorm":     dict(module="brainstorm", passes=[hue(90, 150, 0.35, 0.12)], verdict="recolored (green stripes / collar / eyes)",
                         remap="every green h90–150 (resampled sheet: ~7.4k anti-aliased shades centred on #299428): head stripes, Omnitrix "
                               "collar band, green eyes — a green-accented form named in the brief",
                         left="#efe45c (h56) yellow; the orange-brown carapace; teeth / white"),
  "terraspin":      dict(module="terraspin", passes=[hue(50, 110, 0.30)], verdict="recolored (green-olive shell body)",
                         remap="the olive-green shell and body (h57–77, ~14k anti-aliased shades) — a green-bodied form named in the brief",
                         left="greys, blacks, the low-saturation (< 0.30) browns / greys"),
  "wildvine":       dict(module="wildvine", passes=[hue(130, 145, 0.50), exact(HOUSE)], verdict="recolored (green body + mark)",
                         remap="#22b14c / #167232 / #0f4a21 (h138) his plant body + #b5e61d mark",
                         left="the blue eye-pods, yellow flower dots, black"),
  "jetray":         dict(module="jetray", passes=[hue(80, 135, 0.50, 0.30)], verdict="recolored (Omnitrix mark + green eyes)",
                         remap="greens h80–135 (resampled): the chest Omnitrix + green eye highlights",
                         left="#b3b34c (h60) and the yellow wing membrane, the crimson body — not green"),
  "diamondhead_ov": dict(module="diamondhead", passes=[hue(85, 140, 0.50)], verdict="recolored (green shirt + mark); crystal left",
                         remap="greens h85–140 (sat ≥ 0.5): his GREEN SHIRT panel (#002000…#002900 shadows, mid greens) and the Omnitrix — "
                               "Ben's clothing green",
                         left="the TEAL CRYSTAL body h150–172 (#79cead, #40988c, #b4f0d6 …) — a different hue and role (his crystal), kept "
                              "as the brief requires; the alt-palette strips follow the same rule"),
  "upgrade_ov":     dict(module="upgrade", passes=[exact(HOUSE)], verdict="recolored (Omnitrix mark); body AMBIGUOUS-left",
                         remap="#b5e61d — the Omnitrix mark",
                         left="AMBIGUOUS — #58c837 / #398226 (h106) and their ~50 shades: his green circuit-body. Not one of the brief's "
                              "named green-bodied forms and a different hue (h106 vs the lime h75); left green rather than guessed"),
  "humongousaur":   dict(module="humongousaur", passes=[hue(85, 130, 0.50, 0.20)], verdict="recolored (Omnitrix mark only)",
                         remap="#447a2a and its anti-aliased shades — the chest Omnitrix",
                         left="the olive-grey body shading #393b2d … #868c60 (h57–88, sat 0.21–0.31) — brown skin shading, not green"),
  "feedback_ov":    dict(module="feedback", passes=[exact(HOUSE, "bee975")], verdict="recolored (Omnitrix eye/mark)",
                         remap="#b5e61d + its highlight #bee975 — his eye / mark",
                         left="black body, white, the orange plugs"),
  "arcticguana":    dict(module="arcticguana", passes=[exact(HOUSE)], verdict="recolored (Omnitrix mark); one tint AMBIGUOUS-left",
                         remap="#b5e61d — the Omnitrix mark",
                         left="AMBIGUOUS — #dff49d (h74, 0.016 %): a pale lime tint inside the ice-beam strip; ice-FX highlight or mark "
                              "glow, unclear — left. Ice blues / whites unchanged"),
  "benwolf":        dict(module="benwolf", passes=[exact(HOUSE, "22b14c")], verdict="recolored (Omnitrix eyes + mark)",
                         remap="#b5e61d eyes and #22b14c chest mark",
                         left="the grey fur, white, black"),
  "bigchill":       dict(module="bigchill", passes=[exact("209800")], verdict="recolored (Omnitrix mark only)",
                         remap="#209800 — the small Omnitrix mark",
                         left="every blue / blue-green ice tone — a different hue and role, per the brief"),
  "ripjaws":        dict(module="ripjaws", passes=[exact(HOUSE)], verdict="recolored (Omnitrix mark); lure AMBIGUOUS-left",
                         remap="#b5e61d — the Omnitrix mark",
                         left="AMBIGUOUS — #84ce2c (the lure-tip glow), #3b441a (the lure stalk), #818741 (the fin-swipe motion arc), "
                              "#d8eea5 / #ffffbd (lure light): anatomy / motion FX, not the Omnitrix — left"),
  "rath":           dict(module="rath", passes=[exact(HOUSE, "22b14c", "009300", "006200", "003500")], verdict="recolored (Omnitrix chest mark)",
                         remap="#009300 / #006200 / #003500 + #b5e61d / #22b14c — the chest Omnitrix cross and its shading",
                         left="the orange / white tiger body, black stripes"),
  "waterhazard":    dict(module="waterhazard", passes=[hue(80, 130, 0.35)], verdict="recolored (Omnitrix + green eye/port lenses)",
                         remap="greens h80–130 (resampled, centred on #88c139): the eye slits, the green port lenses and the chest Omnitrix",
                         left="#00e666 (h147) — the Hydro Burst water-core inside its strip (FX); the crimson armour, greys"),
  "highbreed":      dict(module="highbreed", passes=[], verdict="NO GREEN FOUND (identical art, registered)",
                         remap="none — the sheet has no green-family colour at all (15 colours, checked)",
                         left="everything (white / grey / black / pink) — the Albedo strips are byte-identical copies, registered "
                              "explicitly so nothing falls back to Ben's file"),
  "wildmutt_ov":    dict(module="wildmutt", passes=[exact(HOUSE, "d0df50", "408000")], verdict="recolored (flank Omnitrix dot)",
                         remap="#d0df50 / #b5e61d / #408000 — the flank Omnitrix dot (its grey ring stays grey)",
                         left="#fdffc0 the pale highlight (not the dot); the orange fur, red mouth, blue sniff puff"),
}
ORDER = ["swampfire", "heatblast", "megawhatt", "goop", "xlr8", "eyeguy", "ghostfreak", "alienx", "brainstorm", "terraspin",
         "wildvine", "jetray", "diamondhead_ov", "upgrade_ov", "humongousaur", "feedback_ov", "arcticguana", "benwolf", "bigchill",
         "ripjaws", "rath", "waterhazard", "highbreed", "wildmutt_ov"]

def strips_of(module):
    files = {os.path.join(ROOT, f"{module}.js")} | set(glob.glob(os.path.join(ROOT, f"{module}*Assets*.js")))
    out = set()
    for f in files:
        out |= set(re.findall(r"(ben10_[A-Za-z0-9_]+_uniform\.png)", open(f).read()))
    return sorted(s for s in out if "__" not in s and os.path.exists(os.path.join(ROOT, s)))

def out_name(p): stem, _ = os.path.splitext(p); return f"{stem}__{TAG}.png"

def recolor(img, passes):
    img = img.convert("RGBA")
    for o in passes: img, _ = RP.apply_recolor(img, RP._NS(**o))
    return img

def save(img, path):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    img.save(path, optimize=False)

def palette_diff(src_files, passes):
    """{source colour: (pixels, mapped colour)} for every colour the passes change, over all the given strips."""
    changed = Counter(); mapto = {}; total = 0
    for f in src_files:
        a = Image.open(f).convert("RGBA"); b = recolor(a, passes)
        for (pa, pb) in zip(a.getdata(), b.getdata()):
            if pa[3] == 0: continue
            total += 1
            if pa[:3] != pb[:3]: changed[pa[:3]] += 1; mapto[pa[:3]] = pb[:3]
    return changed, mapto, total

hx = lambda c: "#%02x%02x%02x" % c
def swatch(changed, mapto, path, top=24):
    items = changed.most_common(top)
    if not items: return False
    W = 360; H = 18 * len(items) + 6
    im = Image.new("RGB", (W, H), (36, 36, 44)); d = ImageDraw.Draw(im)
    for i, (c, n) in enumerate(items):
        y = 4 + i * 18; d.rectangle([4, y, 40, y + 14], fill=c); d.rectangle([60, y, 96, y + 14], fill=mapto[c])
        d.text((44, y + 2), "->", fill=(220, 220, 220)); d.text((104, y + 2), f"{hx(c)} -> {hx(mapto[c])}  {n} px", fill=(230, 230, 230))
    save(im, path); return True

def before_after(src, passes, path, maxw=900):
    a = Image.open(src).convert("RGBA"); W, H = a.size
    if W > maxw: a = a.crop((0, 0, maxw, H)); W = maxw
    b = recolor(a, passes); sc = max(1, min(4, 160 // max(1, H)))
    out = Image.new("RGBA", (W * sc, H * sc * 2 + 8), (36, 36, 44, 255))
    out.paste(a.resize((W * sc, H * sc), Image.NEAREST), (0, 0), a.resize((W * sc, H * sc), Image.NEAREST))
    bb = b.resize((W * sc, H * sc), Image.NEAREST); out.paste(bb, (0, H * sc + 8), bb)
    save(out, path)

def write_alien(key):
    R = RULES[key]; strips = strips_of(R["module"])
    assert strips, key
    for s in strips:
        save(recolor(Image.open(os.path.join(ROOT, s)), R["passes"]), os.path.join(ROOT, out_name(s)))
    idle = [s for s in strips if s.endswith("_idle_uniform.png") and "_blue_" not in s and "_drained_" not in s and "_oc_" not in s and "_w_" not in s and "_alt" not in s]
    idle = idle[0] if idle else strips[0]
    save(recolor(Image.open(os.path.join(ROOT, idle)), R["passes"]), os.path.join(ROOT, "assets/sprites/ben10/albedo/aliens", f"{key}.png"))
    changed, mapto, total = palette_diff([os.path.join(ROOT, s) for s in strips], R["passes"])
    src_pal = Counter()
    for s in strips:
        for c, n in Counter(p[:3] for p in Image.open(os.path.join(ROOT, s)).convert("RGBA").getdata() if p[3] > 0).items(): src_pal[c] += n
    img = "docs/ben10/albedo/img"
    has_sw = swatch(changed, mapto, os.path.join(ROOT, img, f"{key}_swatches.png"))
    before_after(os.path.join(ROOT, idle), R["passes"], os.path.join(ROOT, img, f"{key}_before_after.png"))
    pct = 100 * sum(changed.values()) / max(1, total)
    L = [f"# {key} — Albedo palette", "",
         f"Verdict: **{R['verdict']}**  ·  generated by `tools/ben10/gen_albedo_ready.py` (deterministic)", "",
         f"Strips: {len(strips)} body strips (`*_uniform.png`, base + alternate tables) → `<strip>__albedo.png`; reference sheet "
         f"`assets/sprites/ben10/albedo/aliens/{key}.png` (= `{idle}` recolored). FX sheets (`*_fx_*`) unchanged.", "",
         f"Source palette: {len(src_pal)} distinct opaque colours. Remapped: {len(changed)} colours = {pct:.2f} % of opaque pixels.", "",
         "Rule (passes, `tools/recolor_palette.py`): `" + json.dumps(R["passes"]) + "`", "",
         "## Remapped", "", R["remap"], "",
         "## Deliberately left alone", "", R["left"], "",
         "## Source → ALBEDO_RED (top shades by pixel count)", ""]
    if changed:
        L += ["| source | albedo | pixels |", "|---|---|---|"] + [f"| `{hx(c)}` | `{hx(mapto[c])}` | {n} |" for c, n in changed.most_common(24)]
        if len(changed) > 24: L += ["", f"…and {len(changed) - 24} more anti-aliased shades (same rule)."]
        L += ["", f"![swatches](img/{key}_swatches.png)"]
    else:
        L += ["None (no green found — identical art)."]
    L += ["", "## Before / after (idle strip; top = Ben, bottom = Albedo)", "", f"![before / after](img/{key}_before_after.png)", ""]
    save_text(os.path.join(ROOT, "docs/ben10/albedo", f"{key}_PALETTE.md"), "\n".join(L))
    return dict(key=key, strips=len(strips), colours=len(changed), pct=round(pct, 3), verdict=R["verdict"])

def save_text(path, s):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f: f.write(s)

def human_lists():
    js = "import('./characters.js').then(m=>{const a=m.characters.ben10.animationData;console.log(JSON.stringify([...new Set(Object.values(a).map(d=>d.sheet))]))})"
    af = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=ROOT, stderr=subprocess.DEVNULL).decode().strip().splitlines()[-1])
    af = sorted(s.lstrip("./") for s in af)
    classic = sorted(set(re.findall(r"(ben10_[a-z_]+_uniform__classic\.png)", open(os.path.join(ROOT, "skins.js")).read())))
    return af, classic

def write_human():
    af, classic = human_lists()
    passes = [HUMAN_GREEN, HAIR_TO_GRAY]
    for s in af + ["ben10_portrait.png"] + classic + ["ben10_portrait__classic.png"]:
        save(recolor(Image.open(os.path.join(ROOT, s)), passes), os.path.join(ROOT, out_name(s)))
    hd = "assets/sprites/ben10/albedo/human"
    src = {"alienforce": "assets/sprites/ben10/ben_alienforce.png", "classic": "assets/sprites/ben10/ben_classic.png",
           "prime": "assets/sprites/ben10/ben_alienforce.png"}   # Prime has no art of its own: it renders the Alien Force frames
    rows = []
    for v, p in src.items():
        save(recolor(Image.open(os.path.join(ROOT, p)), passes), os.path.join(ROOT, hd, f"{v}.png"))
    img = "docs/ben10/albedo/img"
    for v, files in (("alienforce", af), ("classic", classic)):
        g = Counter(); gm = {}; h = Counter(); hm = {}; tot = 0
        for s in files:
            a = Image.open(os.path.join(ROOT, s)).convert("RGBA")
            b1 = recolor(a, [HUMAN_GREEN]); b2 = recolor(a, [HAIR_TO_GRAY])
            for pa, p1, p2 in zip(a.getdata(), b1.getdata(), b2.getdata()):
                if pa[3] == 0: continue
                tot += 1
                if pa[:3] != p1[:3]: g[pa[:3]] += 1; gm[pa[:3]] = p1[:3]
                if pa[:3] != p2[:3]: h[pa[:3]] += 1; hm[pa[:3]] = p2[:3]
        swatch(g, gm, os.path.join(ROOT, img, f"human_{v}_green_swatches.png"))
        swatch(h, hm, os.path.join(ROOT, img, f"human_{v}_hair_swatches.png"))
        idle = [s for s in files if "_idle_" in s][0]
        before_after(os.path.join(ROOT, idle), passes, os.path.join(ROOT, img, f"human_{v}_before_after.png"))
        rows.append((v, files, g, gm, h, hm, tot))
    L = ["# Albedo — human variants palette", "",
         "Generated by `tools/ben10/gen_albedo_ready.py` (deterministic). Engine: `tools/recolor_palette.py` (the same passes "
         "`tools/gen_albedo_recolor.py` always used for Albedo's human art).", "",
         "- **GREEN → ALBEDO_RED**: hue 60–155°, saturation ≥ 0.35 → hue 0°, saturation 0.80, VALUE kept (one red per green shade, "
         "project-wide: the same function recolors every alien's Omnitrix green).",
         "- **BROWN HAIR → GRAY** (owner choice 2026-11-18: keep Albedo's established gray hair): hue 12–45°, sat ≥ 0.5, value ≤ 0.6 "
         "→ sat 0.04, value × 1.5 + 0.3. Skin (value 0.88–0.94, sat < 0.57) is excluded by the gates.",
         "- Everything else (skin, black, white, denim / grey trousers, shoes) is untouched. Sizes / alpha / frame layout identical.", "",
         "| variant | skin id (Albedo) | source sheet | runtime strips | reference |", "|---|---|---|---|---|",
         "| Alien Force | `default` | `assets/sprites/ben10/ben_alienforce.png` | `ben10_<action>_uniform__albedo.png` (characters.albedo) | `assets/sprites/ben10/albedo/human/alienforce.png` |",
         "| Classic | `ben10Classic` | `assets/sprites/ben10/ben_classic.png` | `ben10_<action>_uniform__classic__albedo.png` | `assets/sprites/ben10/albedo/human/classic.png` |",
         "| Prime (experimental) | `ben10Prime` | none — Prime renders the Alien Force frames | the Alien Force `__albedo` strips | `assets/sprites/ben10/albedo/human/prime.png` (= Alien Force recolored) |", ""]
    for v, files, g, gm, h, hm, tot in rows:
        L += [f"## {v} ({len(files)} strips + portrait)", "",
              f"Green regions found: {len(g)} shades, {100*sum(g.values())/max(1,tot):.2f} % of opaque pixels "
              + ("(the green jacket, its trim, the Omnitrix watch)." if v == "alienforce" else "(the green cargo pants, the Omnitrix watch)."),
              "", "| source green | ALBEDO_RED | pixels |", "|---|---|---|"] + [f"| `{hx(c)}` | `{hx(gm[c])}` | {n} |" for c, n in g.most_common(16)]
        L += ["", f"![green swatches](img/human_{v}_green_swatches.png)", "",
              f"Hair: {len(h)} brown shades → gray.", "", "| source | gray | pixels |", "|---|---|---|"] + \
             [f"| `{hx(c)}` | `{hx(hm[c])}` | {n} |" for c, n in h.most_common(10)]
        L += ["", f"![hair swatches](img/human_{v}_hair_swatches.png)", "", f"![before / after](img/human_{v}_before_after.png)", ""]
    save_text(os.path.join(ROOT, "docs/ben10/albedo/HUMAN_PALETTE.md"), "\n".join(L))
    return len(af), len(classic)

if __name__ == "__main__":
    if sys.argv[1:2] == ["human"] or not sys.argv[1:]:
        print("human:", write_human())
    if sys.argv[1:2] == ["aliens"] or not sys.argv[1:]:
        res = [write_alien(k) for k in ORDER]
        for r in res: print(f"{r['key']:15} strips {r['strips']:3}  colours {r['colours']:5}  {r['pct']:6.2f}%  {r['verdict']}")
        save_text(os.path.join(ROOT, "docs/ben10/albedo/_audit.json"), json.dumps(res, indent=1))
