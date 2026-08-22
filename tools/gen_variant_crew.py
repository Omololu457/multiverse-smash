#!/usr/bin/env python3
"""GHOSTFACE-12 VARIANT crew art — per-killer affiliation recolors, NON-DESTRUCTIVE.

Unlike the original tools/gen_companion_crew.py (one `__crew` per companion, tied to that
companion's ORIGINAL 5-killer pool), the 12 variants reassign companions to DIFFERENT killers.
Overwriting the shared `__crew` would corrupt the original Ghostface, so this writes a
PER-KILLER tag:  <companion>__crew_<killer>.png  (skin id <companion>_crew_<killer>).
The original `__crew` files are never touched; Sukuna (Jill AND Amber) gets both.

Accent REGIONS are tint-independent — the same hue/sat/val/yband gate that gen_companion_crew.py
already validated selects the region; only the target `tone=` changes to the new killer's tint.
So the 12 "mismatch" companions reuse their proven regions verbatim with a new tint (low bleed risk).

Run:  python3 tools/gen_variant_crew.py GROUP 1     # one checkpoint group
      python3 tools/gen_variant_crew.py <companion> <killer>
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
from recolor_palette import recolor_multi

ROOT = os.path.join(os.path.dirname(__file__), "..")

# ── The 12 killer tints (== ghostfaceVariantKit.js KILLER_TINT) ──────────────────
TINT = {
    "billy": "#6E1520", "mrs": "#3E2A66", "roman": "#5A4622", "jill": "#701E50", "amber": "#1C5A30",
    "stu": "#B5561E", "mickey": "#2A4E6E", "charlie": "#1E5E55", "richie": "#4A4E56",
    "ethan": "#5C5A2E", "quinn": "#8A6E1C", "wayne": "#1E2A44",
}

def R(hue=None, tol=None, smin=0.0, smax=1.0, vmin=0.0, vmax=1.0, yband=None, samples=None, tone=None, spread=1.0):
    d = dict(mode="region", min_sat=smin, max_sat=smax, min_val=vmin, max_val=vmax, to_tone=tone, tone_spread=spread)
    if hue is not None: d["from_hue"] = hue
    if tol is not None: d["tol"] = tol
    if yband is not None: d["yband"] = yband
    if samples is not None: d["from_"] = samples
    return d

# entry = (companion, killer, accent-desc, [passes], [skip-fx-substrings], group)
# GROUP 1-3 = the 12 "mismatch" companions whose accent regions gen_companion_crew.py already
# validated — verbatim regions, retinted to the variant's killer (goku_black→jill is the one MATCH).
ENTRIES = [
    # ── GROUP 1 ──
    ("sasuke",  "roman",  "sword rope-wrap",   [R(hue="248-292", smin=0.36, vmin=0.14, vmax=0.78, tone=TINT["roman"])],  [], 1),
    ("itachi",  "richie", "Akatsuki cloud trim",[R(hue="335-358", smin=0.55, vmin=0.2, vmax=0.85, tone=TINT["richie"])], [], 1),
    ("chrollo", "mickey", "coat fur-collar",   [R(smin=0.0, smax=0.2, vmin=0.55, vmax=0.99, yband="0.08-0.4", tone=TINT["mickey"])], [], 1),
    ("killua",  "ethan",  "hair highlights",   [R(smax=0.14, vmin=0.88, yband="0.0-0.5", tone=TINT["ethan"])],           [], 1),
    ("beerus",  "mickey", "Egyptian gold jewelry",[R(hue="28-64", smin=0.65, tone=TINT["mickey"])],                      ["ki_ball","blast","outward","push_cast","hakai","intro_4"], 1),
    # ── GROUP 2 ──
    ("maki",     "amber",  "weapon cloth-streamer",[R(hue="345-6", smin=0.7, vmin=0.1, tone=TINT["amber"])],             [], 2),
    ("rick",     "stu",    "collar (shirt at coat-V)",[R(hue="158-190", smin=0.28, smax=0.55, yband="0.26-0.58", tone=TINT["stu"])], ["dodge","taunt","jab_foward_attack_clean"], 2),
    ("tobirama", "richie", "armor (bold)",      [R(hue="200-228", smin=0.5, yband="0.18-0.62", tone=TINT["richie"])],    ["water","darkness","edo"], 2),
    # gojo — the shipped "blindfold" accent is INVALID for this sprite: he is UNBLINDFOLDED (cyan "Six Eyes"
    # visible), so there is no blindfold to tint. Retargeted to the iconic cyan EYES (hue 160-200 high-sat,
    # unique on the sprite — hair neutral, shirt black, pants white) → Quinn gold. A small but iconic marker.
    ("gojo",     "quinn",  "Six Eyes",          [R(hue="160-200", smin=0.35, tone=TINT["quinn"])], [], 2),
    ("hisoka",   "stu",    "outfit (bold)",     [R(hue="135-178", smin=0.12, smax=0.42, tone=TINT["stu"])],              [], 2),
    # ── GROUP 3 ──
    # sukuna — shipped "eye markings" gate (hue 340-358) ALSO swallowed his salmon-PINK HAIR (same hue) → whole
    # hair recolored. His markings are DARKER red than the hair, so add vmax to exclude the bright hair (v>.52).
    ("sukuna",     "jill",  "facial markings",  [R(hue="338-4", smin=0.5, vmax=0.52, tone=TINT["jill"])],                  [], 3),
    ("sukuna",     "amber", "facial markings",  [R(hue="338-4", smin=0.5, vmax=0.52, tone=TINT["amber"])],                 [], 3),
    ("goku_black", "jill",  "sash (energy accent)",[R(hue="352-12", smin=0.7, tone=TINT["jill"])],                        [], 3),
    ("shinobu",    "quinn", "butterfly-wing pattern",[R(hue="245-285", smin=0.4, tone=TINT["quinn"])],                    ["ultimate","flit"], 3),
]

ENTRIES += [
    # ── GROUP 4 — UNCOVERED (fresh accent tuning, palette-inspected). Billy's crew (crimson). ──
    # Light — the DEATH NOTE he holds (purple H255-262 S>=.45, unique on the sprite: hair orange, suit grey) → crimson.
    ("light", "billy", "Death Note", [R(hue="245-270", smin=0.45, tone=TINT["billy"])], [], 4),
    # Naoya — his NAVY top (H240 dark, unique; hair olive H50-60, hakama white, skin warm all excluded). WHITE
    # hakama deliberately PRESERVED (matches the owner's naoya-skins decision). vmax gate keeps it to the dark navy.
    ("naoya", "billy", "navy top", [R(hue="218-252", smin=0.2, vmax=0.45, tone=TINT["billy"])], [], 4),
    # toji — owner chose the DARK SHIRT (subtle). Torso purple H300-330 S.2-.4 V.19-.44 (skin H10-30 + reddish
    # arm H0 excluded by hue; white pants/blade excluded by sat). Subtle marker (shirt already very dark).
    ("toji", "billy", "dark shirt", [R(hue="288-340", smin=0.18, smax=0.55, vmin=0.1, vmax=0.48, tone=TINT["billy"])], [], 4),
    # ── GROUP 5 — UNCOVERED. Mrs.(debbie indigo) + zaraki HELD. ──
    # Orochimaru — his PURPLE snake-collar wrap + hair-end tints (H268-320 S>=.35; pale skin H30 + tan robe low-sat
    # excluded) → indigo. His distinct colour.
    ("orochimaru", "mrs", "purple collar/hair", [R(hue="268-320", smin=0.35, tone=TINT["mrs"])], [], 5),
    # Mayuri — the saturated magenta-PURPLE scarf/collar at the neck (H300-325 S>=.5, unique; white haori + face
    # paint excluded) → indigo.
    ("mayuri", "mrs", "purple scarf", [R(hue="300-325", smin=0.5, tone=TINT["mrs"])], [], 5),
    # zaraki — HELD: near-monochrome (black robe + white haori + skin), and the only large colour (white haori)
    # is inseparable from his PROMINENT white sword (extended in idle → can't skip). No clean accent.
    # ── GROUP 6 — UNCOVERED (groups of 4). ──
    # Isshiki — his RED coat (H348-8 S>=.55; pale grey skin + brown pants excluded) → indigo.
    ("isshiki", "mrs", "red coat", [R(hue="348-8", smin=0.55, vmin=0.15, tone=TINT["mrs"])], [], 6),
    # Deathstroke — his iconic ORANGE half (mask/gloves/boots/belt, H10-32 S>=.7; gold sword-hilt H50 excluded)
    # → steel-blue. BOLD identity shift (his signature orange), but it's the one distinct colour.
    ("deathstroke", "mickey", "orange accents", [R(hue="10-32", smin=0.7, vmin=0.15, tone=TINT["mickey"])], [], 6),
    # Obito — his dark PURPLE cloak. NOTE coarse palette over-reported sat (S.4-.67); actual cloak pixels are
    # mostly S.28-.38, so smin must be .28 (smin=.38 caught only 5px). H252-295 catches the cloak's 3214px while
    # excluding the H240 navy sash/shadow (hue floor) and warm skin (H41).
    ("obito", "roman", "purple cloak", [R(hue="252-295", smin=0.28, tone=TINT["roman"])], [], 6),
    # Madara — his RED Uchiha armor (H350-12 S>=.55; warm skin H30 excluded) → bronze.
    ("madara", "roman", "red armor", [R(hue="350-12", smin=0.55, vmin=0.12, tone=TINT["roman"])], [], 6),
    # ── GROUP 7 — UNCOVERED. Jill(magenta) + Charlie(teal). yuta HELD (visual session). ──
    # Six Paths of Pain — the RED Akatsuki CLOUD trim (H350-12 S>=.75; orange hair H30 excluded) → magenta.
    # HIGH confidence (same known Akatsuki-cloud pattern as itachi). VISUAL-VERIFY in fresh session.
    ("six_paths_pain", "jill", "Akatsuki cloud trim", [R(hue="350-12", smin=0.75, vmin=0.2, tone=TINT["jill"])], [], 7),
    # Kurapika — his pure-blue TABARD/outfit (H216-245 S>=.7; gold hair/chain H38-60 excluded) → teal.
    # MEDIUM-HIGH confidence. VISUAL-VERIFY (is the bright blue outfit vs a Nen-chain FX?).
    ("kurapika", "charlie", "blue tabard", [R(hue="216-245", smin=0.7, tone=TINT["charlie"])], [], 7),
    # Miwa — RE-TARGETED (fresh-session visual pass). The old "blue outfit" gate grabbed her HAIR: her bright
    # blues (#4080c0 H210, #70e0f0 H188 cyan) sit in the TOP band (y<0.3) = hair. Her real OUTFIT is the dark
    # NAVY hakama (#101020 H240, #304060 H220, #405080 H225), distributed across torso AND legs. Target it by
    # hue>=215 (excludes H206-210 bright hair-blue), vmax .6 (excludes bright light-blue hair), and yband .32-1.0
    # (spatially drops the hair band). → teal. Visually verified.
    ("miwa", "charlie", "navy hakama", [R(hue="215-248", smin=0.4, vmax=0.6, yband="0.32-1.0", tone=TINT["charlie"])], [], 7),
    # yuta + zaraki DROPPED (monochrome, no isolable accent) → REASSIGNED (owner) to zenitsu + nezuko.
    # Zenitsu (→Charlie, replaces yuta) — his warm HAORI. TRAP: his iconic yellow HAIR shares the haori's yellow/gold
    # hue (both H45-60), and the hair mass hangs down beside his face into the torso band, so NEITHER a pure warm-hue
    # gate (old H12-58 → recolored the hair) NOR a yband (hair-beside-face can't be cut cleanly) isolates it. The clean
    # discriminator is HUE: the haori's ORANGE-RED FLAMES (H348-34 wrap, S>=.7: orange #e05010/#d05010 + red #b01020/
    # #500000) are a hue the hair (pure yellow/gold H45-60) does NOT have → recolor the flames to teal, hair 100%
    # preserved by hue (matches naoya/sukuna preserve-hair standard). skin H26 S.47 excluded by smin .7. Verified.
    ("zenitsu", "charlie", "flame haori (hair preserved)", [R(hue="348-34", smin=0.7, tone=TINT["charlie"])], [], 7),
    # Nezuko (→Stu, replaces zaraki) — her PINK kimono (H330-350 S>=.5; pale pink skin S.29 excluded) → burnt-orange.
    ("nezuko", "stu", "pink kimono", [R(hue="330-350", smin=0.5, tone=TINT["stu"])], [], 7),
    # ── GROUP 8 — UNCOVERED. Amber(green) + Richie(gunmetal) + Ethan(olive). inosuke/kiba handled/held separately. ──
    # Byakuya (→Richie) — his TEAL shihakusho under the white captain's haori (H150-190 S>=.28: #204040/#002020 H180,
    # #205040 H160, #70a090). White haori (S.07) + black + warm skin (H40) all excluded → gunmetal grey-blue. Verified.
    ("byakuya", "richie", "teal shihakusho", [R(hue="150-190", smin=0.28, tone=TINT["richie"])], [], 8),
    # Boruto (→Ethan) — the RED collar/trim of his black jacket (H338-350 S>=.7: #b00030/#f03060). Distinct from his
    # blonde HAIR (H40-55, excluded by hue) and skin (H10-12) → olive. Verified.
    ("boruto", "ethan", "red jacket trim", [R(hue="338-350", smin=0.7, tone=TINT["ethan"])], [], 8),
    # inosuke (→Amber) — bare torso + grey boar mask + dark pelt, no bright garment. Tested & rejected: PINK SNOUT
    # (H330-342, only ~11px, reads as a glitch). REAL accent = his dark NAVY PANTS (H200-235 S>=.4, ~90px on idle).
    # GOTCHA: the pants share hue H210 with the boar mask's blue EYES → yband .5-1.0 restricts to the lower body so
    # the eyes are preserved. Subtle (dark green on dark pants) but a clean localized garment accent → green. Verified.
    ("inosuke", "amber", "navy pants", [R(hue="200-235", smin=0.4, vmin=0.1, yband="0.5-1.0", tone=TINT["amber"])], [], 8),
    # kiba (→Ethan) — HELD: near-monochrome (dark grey S0 + very dark navy H220-240 V.06-.31, intermixed); red fangs
    # blend with skin (per kiba-skins). No isolable bright accent — same trap as yuta/zaraki. No crew art generated.
    # ── GROUP 9 — final UNCOVERED. Quinn(gold) + Wayne(navy). hiruzen HELD. ──
    # aoi_todo (→Quinn) — shirtless, only garment = his dark NAVY PANTS (H228-250 S>=.3: #202050/#202030). GOTCHA:
    # bare-torso ab-shadows + a chin shadow are faintly blue-ish and got caught → yband .48-1.0 restricts to the
    # lower body (pants), sparing face/torso. Bold navy→gold shift but it's his one garment. Verified.
    ("aoi_todo", "quinn", "navy pants", [R(hue="228-250", smin=0.3, yband="0.48-1.0", tone=TINT["quinn"])], [], 9),
    # pain (→Wayne) — the RED Akatsuki CLOUDS + red cloak zipper-line (H344-358 S>=.8: #c00020/#700010). Distinct from
    # his ORANGE hair (H7-10, excluded by hue floor 344) → navy. Subtle (navy on the black cloak) but correct. Verified.
    ("pain", "wayne", "Akatsuki clouds", [R(hue="344-358", smin=0.8, tone=TINT["wayne"])], [], 9),
    # onoki (→Wayne) — his robe is ALREADY dark navy (H210-240) so recoloring it to Wayne-navy is invisible; instead
    # target his distinct RED Tsuchikage COLLAR (H345-2 wrap, S>=.7: #a02030 H352 + #902020 H0). Skin (H20-36), white
    # beard, navy robe, and the green dust-jutsu FX all excluded → navy. Small (~70px) but his one non-navy mark. Verified.
    ("onoki", "wayne", "red collar", [R(hue="345-2", smin=0.7, tone=TINT["wayne"])], [], 9),
    # hiruzen (→Wayne) — HELD: near-monochrome dark combat robe (black/grey S0 + very dark navy H210-240 V.06-.25,
    # intermixed), and its only colour (dark navy) IS Wayne's tint already → recolor invisible. Same trap as kiba. No art.
]

FORM_PREFIXES = {"vegeta": ["vegeta_ssj_","vegeta_blue_","vegeta_ssj_blue_"], "goku_black": ["goku_black_ssj_rose_"]}

def char_block(key):
    src = open(os.path.join(ROOT, "characters.js")).read()
    m = re.search(r'rosterKey:\s*"%s"' % re.escape(key), src)
    if not m: raise SystemExit("no rosterKey %s" % key)
    start = src.rfind("\nconst ", 0, m.start()); end = src.find("\nconst ", m.end())
    return src[start: end if end > 0 else len(src)]

def wired_targets(key):
    block = char_block(key)
    sheets = set(re.findall(r'sheet:\s*"\./([^"]+\.png)"', block))
    for pref in FORM_PREFIXES.get(key, []):
        for f in os.listdir(ROOT):
            if f.startswith(pref) and f.endswith(".png") and "__" not in f: sheets.add(f)
    port = re.search(r'portrait:\s*"\./([^"]+\.(?:png|jpe?g))"', block)
    return sorted(sheets), (port.group(1) if port else None)

def build(companion, killer, desc, passes, skip):
    from PIL import Image
    tag = f"crew_{killer}"
    sheets, portrait = wired_targets(companion)
    total, nfiles = 0, 0
    for name in sheets:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path): print(f"  SKIP(missing) {name}"); continue
        if any(s in name for s in skip):
            Image.open(path).convert("RGBA").save(os.path.join(ROOT, re.sub(r'\.png$', f'__{tag}.png', name)))
            print(f"    copy   {name} (FX sheet)"); nfiles += 1; continue
        c = recolor_multi(path, tag, passes); total += c; nfiles += 1
        print(f"  {c:6d}px  {name} -> __{tag}")
    if portrait and os.path.exists(os.path.join(ROOT, portrait)):
        Image.open(os.path.join(ROOT, portrait)).convert("RGBA").save(os.path.join(ROOT, re.sub(r'\.(png|jpe?g)$', f'__{tag}.png', portrait)))
        nfiles += 1
    print(f"DONE {companion} → {killer}'s Crew ({desc}): {total}px across {nfiles} files")
    return total

def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "GROUP":
        g = int(sys.argv[2])
        for (comp, killer, desc, passes, skip, grp) in ENTRIES:
            if grp == g: print(f"=== {comp} → {killer} ==="); build(comp, killer, desc, passes, skip)
    elif len(sys.argv) >= 3:
        for (comp, killer, desc, passes, skip, grp) in ENTRIES:
            if comp == sys.argv[1] and killer == sys.argv[2]: build(comp, killer, desc, passes, skip)
    else:
        print("usage: gen_variant_crew.py GROUP <n>  |  <companion> <killer>")

if __name__ == "__main__":
    main()
