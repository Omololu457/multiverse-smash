#!/usr/bin/env python3
"""Generate the 20 "joined the killer" COMPANION AFFILIATION skins as __<tag>.png sheets.

Each companion gets a SUBTLE affiliation marker: ONE small accent element (a garment trim,
weapon-wrap, eye/highlight, headband...) recoloured to its killer's Part-1 robe tint, with the
rest of the character UNCHANGED. Not a redesign — "this character, now marked as part of that crew".

Same infra as every skin batch: tools/recolor_palette.py targeted region passes (hue+sat+val, optional
spatial yband). Black outlines are excluded by the val floor (line-art-boundary guard) so strokes never
bleed; to_tone preserves each pixel's shading spread (multi-tone). Cosmetic only — ZERO gameplay.

KILLER TINTS (the real Part-1 robe colours — confirmed with the user):
  billy  crimson/blood-red #6E1520 | debbie indigo-violet #3E2A66 | roman bronze/sepia #5A4622
  jill   magenta #701E50           | amber  toxic-green   #1C5A30

Run:  python3 tools/gen_companion_crew.py <tag>        # one companion
      python3 tools/gen_companion_crew.py GROUP billy  # all of one killer's crew
      python3 tools/gen_companion_crew.py ALL          # everyone
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")
BILLY, DEBBIE, ROMAN, JILL, AMBER = "#6E1520", "#3E2A66", "#5A4622", "#701E50", "#1C5A30"

def R(hue=None, tol=None, smin=0.0, smax=1.0, vmin=0.0, vmax=1.0, yband=None, samples=None, tone=None, spread=1.0):
    """One region pass. hue='lo-hi' degrees; samples='#hex,#hex' exact-match; yband='lo-hi' (frac of H)."""
    d = dict(mode="region", min_sat=smin, max_sat=smax, min_val=vmin, max_val=vmax, to_tone=tone, tone_spread=spread)
    if hue is not None: d["from_hue"] = hue
    if tol is not None: d["tol"] = tol
    if yband is not None: d["yband"] = yband
    if samples is not None: d["from_"] = samples
    return d

TAG = "crew"   # uniform filename tag: <char>__crew.png ; skin id <rosterKey>_crew ; name "<Killer>'s Crew"

# rosterKey -> (killer, accent-desc, [passes]).  Each accent measured from the sprite (inspect_accent.py).
CONFIG = {}

# ── GROUP 5 — AMBER'S CREW (toxic-green #1C5A30) ─────────────────────────────
# Shinobu — her butterfly-haori WING pattern (purple, hue 245-285 sat>=.4) → toxic-green.
CONFIG["shinobu"] = ("amber", "butterfly-wing pattern", [R(hue="245-285", smin=0.4, tone=AMBER)],
                     ["ultimate", "flit"])   # her Insect-Breathing poison FX shares the wing's purple hue
# Gon — he is ALREADY green (outfit+hair), so the toxic-green marker goes on the only distinct non-green
# accent: his brown BOOTS (hue 30-46 sat>=.7 val .15-.5; skin H24 excluded) → toxic-green. (No wristband exists.)
CONFIG["gon"] = ("amber", "boots", [R(hue="30-46", smin=0.7, vmin=0.15, vmax=0.5, tone=AMBER)])
# Naruto — his wired idle is KCM (all-gold form) so the blue HEADBAND isn't visible; tint a thin forehead
# BAND (yband .13-.2, the headband's position) of the gold → toxic-green so a green headband reads.
CONFIG["naruto"] = ("amber", "headband band", [R(hue="8-60", smin=0.5, yband="0.12-0.2", tone=AMBER)])
# Zenitsu — the RED haori-LINING/inner garment (hue 346-6 wrap sat>=.5) → toxic-green.
CONFIG["zenitsu"] = ("amber", "haori lining", [R(hue="346-6", smin=0.5, vmin=0.15, tone=AMBER)],
                     ["intro"])   # the intro has a red FX flash in the lining's hue

# ── GROUP 4 — JILL'S CREW (magenta #701E50) ──────────────────────────────────
# Sukuna — his red EYE/face MARKINGS (hue 340-358 sat>=.5; skin H12-20 excluded) → magenta.
CONFIG["sukuna"] = ("jill", "eye markings", [R(hue="340-358", smin=0.5, tone=JILL)])
# Vegeta — the GOLD Saiyan-armor SHOULDER pads/trim (hue 42-54 sat>=.6; skin H24-30 excluded) → magenta.
# Vegeta — the GOLD Saiyan-armor trim (hue 42-54 sat>=.6). MUST yband to the torso (.3-.88): on the SSJ/Blue
# FORM sheets the spiky blonde/gold HAIR shares the armor's hue, so the head-band is excluded spatially.
# Vegeta — the GOLD Saiyan-armor trim (hue 42-54 sat>=.6, torso yband). The SSJ/Blue FORM sheets have gold
# HAIR + a gold AURA (same hue, can't isolate) so they're COPIED unchanged (accent shows in BASE form; the
# transformed body renders normally — the copy exists so retagFormAnim doesn't hit a missing sheet).
CONFIG["vegeta"] = ("jill", "armor trim", [R(hue="42-54", smin=0.6, yband="0.3-0.88", tone=JILL)],
                    ["vegeta_ssj", "vegeta_blue"])
# Goku Black — his aura is a transient FX (not on the static sprite), so tint his one distinct static element:
# the RED SASH/belt (hue 352-12 wrap sat>=.7; skin H20-30 excluded) → magenta.
CONFIG["goku_black"] = ("jill", "sash (energy accent)", [R(hue="352-12", smin=0.7, tone=JILL)])
# Gold Samurai Ranger — he IS "Gold", so keep the plates gold and tint only the DARK armor-SEAM lines
# (hue 30-48 sat>=.65 val .3-.64 = the shadowed grooves between plates) → magenta.
CONFIG["gold_samurai_ranger"] = ("jill", "armor seams", [R(hue="30-48", smin=0.65, vmin=0.3, vmax=0.64, tone=JILL)])

# ── GROUP 3 — ROMAN'S CREW (bronze/sepia #5A4622) ────────────────────────────
# Rick — the teal SHIRT-COLLAR showing at the lab-coat's V (hue 158-190, distinct from his H204 blue hair)
# → bronze. Lab coat / pants / hair untouched. (Closest distinct trim element; the white coat has no trim.)
CONFIG["rick"] = ("roman", "collar (shirt at coat-V)", [R(hue="158-190", smin=0.28, smax=0.55, yband="0.26-0.58", tone=ROMAN)],
                  ["dodge", "taunt", "jab_foward_attack_clean"])   # portal/dash FX share the shirt's teal hue
# Tobirama — the tan leather ARMOR-STRAP/collar (hue 36-52 sat .18-.5; his H20-30 skin excluded by hue) → bronze.
# Tobirama — the tan armor-STRAP/collar shares his skin's warm hue (H26-30), so isolate it SPATIALLY: a
# neck-band (y .2-.34, below the face, above the hands) + warm gate → bronze. Face/hands excluded by yband.
CONFIG["tobirama"] = ("roman", "armor strap/collar", [R(hue="16-42", smin=0.2, smax=0.46, vmin=0.5, vmax=0.86, yband="0.2-0.34", tone=ROMAN)])
# Gojo — the black BLINDFOLD band: eye-level yband (.12-.24) + dark/near-neutral (val .03-.32) → bronze.
CONFIG["gojo"] = ("roman", "blindfold", [R(hue="224-256", smin=0.06, smax=0.22, vmin=0.32, vmax=0.78, yband="0.12-0.25", tone=ROMAN, spread=0.9)])
# Hisoka — the pink playing-card EMBLEM on his chest (hue 315-345 sat .4-.75) → bronze. Hair/outfit/skin untouched.
CONFIG["hisoka"] = ("roman", "card emblem", [R(hue="315-345", smin=0.4, smax=0.78, yband="0.26-0.6", tone=ROMAN)],
                    ["intro"])   # the intro has a large pink Nen/card FX in the same magenta hue

# ── GROUP 2 — DEBBIE'S CREW (indigo-violet #3E2A66) ──────────────────────────
# Beerus — the gold Egyptian JEWELRY/collar (hue 28-64 sat>=.65) → indigo. Purple skin + blue robe untouched.
CONFIG["beerus"] = ("debbie", "Egyptian gold jewelry", [R(hue="28-64", smin=0.65, tone=DEBBIE)])
# Netero — the orange waist SASH/belt (hue 10-34 sat>=.7; skin is same hue but low-sat → excluded) → indigo.
CONFIG["netero"] = ("debbie", "robe sash", [R(hue="10-34", smin=0.7, tone=DEBBIE)])
# Maki — the flowing RED cloth-streamer tied at her weapon/head (hue 345-6 wrap, sat>=.7) → indigo.
CONFIG["maki"] = ("debbie", "weapon cloth-streamer", [R(hue="345-6", smin=0.7, vmin=0.1, tone=DEBBIE)])
# Omni-Man — his cape is the SAME red as the suit (inseparable), so tint only the cape's DEEPEST-SHADOW
# folds / underside "lining" (red, val .08-.32) → indigo — his iconic bright red suit+cape stays red.
CONFIG["omniman"] = ("debbie", "cape-lining (deep folds)", [R(hue="345-18", smin=0.85, vmin=0.08, vmax=0.32, tone=DEBBIE)])

# ── GROUP 1 — BILLY'S CREW (crimson #6E1520) ─────────────────────────────────
# Sasuke — the purple rope-wrap that holds Kusanagi on his back (H255-275, distinct from the H240
# navy outfit by hue AND from the gray blade by saturation) → crimson. Blade/outfit/skin untouched.
CONFIG["sasuke"] = ("billy", "sword rope-wrap", [R(hue="248-292", smin=0.36, vmin=0.14, vmax=0.78, tone=BILLY)])
# Itachi — the Akatsuki cloak's RED CLOUD trim → Billy's specific crimson (a deepening; subtle by nature
# since the clouds are already red). H335-358 sat>=.55 catches the bright clouds; skin (H15-20) + the black
# cloak (S=0) + navy shading (H240) are excluded. The literal "Akatsuki-cloak trim" the brief named.
CONFIG["itachi"] = ("billy", "Akatsuki cloud trim", [R(hue="335-358", smin=0.55, vmin=0.2, vmax=0.85, tone=BILLY)])
# Chrollo — the light shearling COAT FUR-COLLAR (top yband, near-neutral + bright) → crimson. Dark coat
# (val floor), face skin (sat ceiling), black outline all excluded; multi-tone keeps the fur's shading.
CONFIG["chrollo"] = ("billy", "coat fur-collar", [R(smin=0.0, smax=0.2, vmin=0.55, vmax=0.99, yband="0.08-0.4", tone=BILLY)])
# Killua — crimson HAIR-HIGHLIGHTS: only the brightest silver strands (top yband, neutral, high val) →
# crimson, so the bulk of the hair stays silver (subtle streak marker, not a full recolor).
CONFIG["killua"] = ("billy", "hair highlights", [R(smax=0.14, vmin=0.88, yband="0.0-0.5", tone=BILLY)])

def char_block(key):
    src = open(os.path.join(ROOT, "characters.js")).read()
    m = re.search(r'rosterKey:\s*"%s"' % re.escape(key), src)
    if not m: raise SystemExit("no rosterKey %s in characters.js" % key)
    start = src.rfind("\nconst ", 0, m.start())
    end = src.find("\nconst ", m.end())
    return src[start: end if end > 0 else len(src)]

# Transform-form sheets live on disk by PREFIX (NOT in characters.js animationData). retagFormAnim
# (abilities.js) swaps a transformed fighter's sheets to __<tag> with NO existence check — so a recolorTag
# skin on Vegeta/Goku Black MUST also produce the form sheets or the transformed body renders as a box.
FORM_PREFIXES = {
    "vegeta":     ["vegeta_ssj_", "vegeta_blue_", "vegeta_ssj_blue_"],
    "goku_black": ["goku_black_ssj_rose_"],
}

def wired_targets(key):
    block = char_block(key)
    sheets = set(re.findall(r'sheet:\s*"\./([^"]+\.png)"', block))
    for pref in FORM_PREFIXES.get(key, []):
        for f in os.listdir(ROOT):
            if f.startswith(pref) and f.endswith(".png") and "__" not in f:
                sheets.add(f)
    port = re.search(r'portrait:\s*"\./([^"]+\.(?:png|jpe?g))"', block)
    return sorted(sheets), (port.group(1) if port else None)

def build(key, only=None):
    from PIL import Image
    cfg = CONFIG[key]
    killer, desc, passes = cfg[0], cfg[1], cfg[2]
    skip = cfg[3] if len(cfg) > 3 else []   # sheet substrings to COPY unchanged (FX sheets where the accent
    sheets, portrait = wired_targets(key)   # gate would bleed onto same-hued effects — portal/intro/Nen)
    total = 0
    for name in sheets:
        if only and only not in name: continue
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            print(f"  SKIP (missing) {name}"); continue
        if any(s in name for s in skip):
            out = re.sub(r'\.png$', f'__{TAG}.png', name)
            Image.open(path).convert("RGBA").save(os.path.join(ROOT, out))
            print(f"    copy   {name} (FX sheet — accent skipped)"); continue
        c = recolor_multi(path, TAG, passes)
        total += c
        print(f"  {c:6d}px  {name}")
    # PORTRAIT: the affiliation marker is a BODY accent; the face-crop thumbnail is copied UNCHANGED (a
    # full-body yband/neutral gate maps to background/hair on a bust crop → over-selection). Must exist so
    # skins.js recolorPortrait → <portrait>__crew.png resolves.
    if portrait and not only:
        p = os.path.join(ROOT, portrait)
        if os.path.exists(p):
            out = re.sub(r'\.(png|jpe?g)$', f'__{TAG}.png', portrait)
            Image.open(p).convert("RGBA").save(os.path.join(ROOT, out))
            print(f"    copy   {portrait} -> {out} (thumbnail, unmarked)")
    print(f"DONE {key} ({killer} crew · {desc}): {total}px")

def main():
    if len(sys.argv) < 2:
        print("chars:", ", ".join(CONFIG) or "(none configured yet)"); return
    a = sys.argv[1]
    if a == "ALL":
        for k in CONFIG: print(f"=== {k} ==="); build(k)
    elif a == "GROUP":
        g = sys.argv[2]
        for k, (killer, *_ ) in CONFIG.items():
            if killer == g: print(f"=== {k} ==="); build(k)
    else:
        build(a, sys.argv[2] if len(sys.argv) > 2 else None)

if __name__ == "__main__":
    main()
