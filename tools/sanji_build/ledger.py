# tools/sanji_build/ledger.py — writes docs/sanji/SPRITE_LEDGER.md from docs/sanji/frames.json.
#   python3 -I tools/sanji_build/ledger.py <repo-root>
import sys, os, json
ROOT = sys.argv[1]
fj = json.load(open(os.path.join(ROOT, 'docs/sanji/frames.json')))
TRIG = {
 'idle': 'neutral standing (hands in pockets, cigarette)', 'idleLong': 'idle > 10 s: exhales smoke, settles his tie',
 'walk': 'walk forward', 'walk_back': 'walk back', 'run': 'run', 'dash': 'ground dash', 'jump': 'jump (rising)',
 'fall': 'falling', 'crouch': 'hold ↓', 'guard': 'block (leg check)', 'guard_hit': 'blockstun', 'hurt': 'hitstun',
 'hurt_heavy': 'heavy hitstun', 'hurt_air': 'air hitstun', 'knockdown': 'knocked down', 'getup': 'wake-up',
 'grab': 'grab (knee clinch)', 'throw': 'throw (kick-throw)', 'taunt': 'taunt: serves the dish',
 'intro': 'INTRO step 1: walks in, hands in pockets', 'sIntroLight': 'INTRO step 2: lights the cigarette, first drag',
 'win': 'WIN 1: smoking, hands in pockets', 'win2': 'WIN 2: kick flourish → pocket pose', 'winGlass': 'WIN 3: the cocktail-glass prop',
 'lose': 'LOSE: kneels → lies down',
 'sCollier': 'COLLIER (L) — Course 1', 'sEpaule': 'EPAULE (→+L) — Course 2', 'sCotelette': 'COTELETTE (H) — Course 3',
 'sSelle': 'SELLE (→+H) — Course 4', 'sPoitrine': 'POITRINE (←+H) — Course 5, launches', 'sGigot': 'GIGOT (↘+L) — Course 6, low',
 'sCrouchKick': 'crouch kick (↓+L)', 'up': 'anti-air knee (↑+H / Up-Attack)', 'air': 'air kick (air L/H)', 'down_air': 'air ↓ kick',
 'sHandstand': 'handstand spin (↓+H) — swaps facing', 'sReversal': 'wake-up reversal (neutral A)',
 'sIgnite': 'DIABLE JAMBE ignite (A+B, ≥50 Heat)', 'sMouton': 'MOUTON SHOT (↓↘→+A)', 'sAntiManner': 'ANTI-MANNER KICK COURSE (→→+A)',
 'sConcasse': 'CONCASSE (air ↓↓+A)', 'sSkyWalk': 'SKY WALK (air ↓↘→+B)', 'sPlate': 'PLATE KICK (↓↙←+B)',
 'sHachis': 'PREMIER HACHIS (↓↙←+A)', 'sPTKC': 'PARTY TABLE KICK COURSE (super)',
}
def trig(u):
    base = u.split(' ')[0]
    if base in TRIG: return f'`{base}` → {TRIG[base]}'
    return u
L = ['# Sanji — Sprite Ledger', '',
     f"Source: `{fj['source']}` (GBA *One Piece*, ripped by Paddy) · SHA-256 `{fj['sha256']}`", '',
     'Cut: alpha chroma key (background already alpha-0) → 8-connected component masks (`tools/sanji_build/frames.py`) → '
     '1:1 pixel copy, nearest-neighbour only, NO invented art. Cells 320×256, feet at y=150, pivot x=160 (Luffy/Zoro convention, '
     'same ripper and scale). Regenerate: `python3 -I tools/sanji_build/extract.py .` then `python3 -I tools/sanji_build/ledger.py .`', '',
     '## Real frame counts per row', '',
     '| Row | Brief said | Real | Content |', '|---|---|---|---|',
     '| R1 | 6 | **6** | stance/idle set (F1–F4) + two high kicks; F5 carries a BLUE motion arc |',
     '| R2 | 3 | **3** | knee/front kick, BIG blue crescent kick, long low front kick |',
     '| R3 | 5 | **5** | tuck, HANDSTAND kick (blue arc), handstand split, one-hand low sweep, handstand rising kick — *the handstand frames are here, not R4* |',
     '| R4 | ~10 | **11** | somersault, crouch-turn, high kick (blue arc), raised axe kick, knee chamber, spin kick (swirl), front kick, knee, rising knee, bent high back-kick, low lunge |',
     '| R5 | ~8 | **11** (+4 steam specks) | serving a PLATE of roast meat (F1–F7), crouches (F8–F9), leap (F10), the plate alone (F11) |',
     '| R6 | 4 | **6** | hands-in-pockets standing poses with the CIGARETTE |',
     '| R7 | 4+2 | **6** | 3 smoking poses (smoke puff), hunched, kneeling (+sweat specks), lying knockdown |',
     '| R8 | 2 | **2** | "love mode" serving a COCKTAIL GLASS on a tray |',
     '| R9 | 2 | **4** + Merry + credit | rising front-kick series low→high; Going Merry figurehead; ripper credit |',
     '', '**54 frames, every one used.** The only exclusion is the credit text.', '',
     '## The two objects', '',
     '* **R5 yellow object = a PLATE (a dish of roast meat on a white/red plate).** → R5F11 (the plate alone) is the **PLATE KICK projectile** (`assets/sanji/fx_plate.png`, derived copy: crop + mirror). R5F1–F7 are his serving taunt; R5F5 is the Plate Kick flick.',
     '* **R8 red/white object = a COCKTAIL GLASS** (red drink, lemon slice, straw) on a tray. → **win-pose prop** (WIN 3 `winGlass`) and the **Heat-bar badge** (`fx_glass.png`, derived copy: crop of R8F1 rows 0–15). '
     'The CIGARETTE is in the R6/R7 standing frames (white stick at the mouth); the Heat-reactive glowing tip is a render-only glow drawn at that mouth point.',
     '', '## Special entries', '',
     '| Entry | Treatment |', '|---|---|',
     '| Going Merry figurehead (R9) | **reused existing One Piece emblem** `assets/zoro/merry.png` (added by Zoro). Not duplicated. |',
     '| Credit text "Ripped by Paddy / No credit needed" (R9) | **excluded, credit** → `docs/sanji/CREDITS.md` |',
     '| Blue motion arcs R1F5, R2F2, R3F2, R4F3 | base kick trails; **tint** copies (`*_dj.png`: arc pixels blue→orange-white, `tools/sanji_build/arcs.py`) for Diable Jambe |',
     '| Every body frame | **derived copy (mirror)**: the sheet faces left; stored right-facing, the engine flips at runtime |',
     '| R6F1 bust | **derived copy (crop)** → `portrait.png` |',
     '| Afterimages (Mouton / Sky Walk / PTKC) | render-only re-draws of the live frame at an offset, translucent (**derived copy**, no new pixels) |',
     '', '## HANDS RULE audit', '',
     'Every striking animation uses a kick, knee or shin frame. Frames with hands forward (R1F2 lighting the cigarette, R1F4 reeling, '
     'R5 serving, R8 serving) are only ever used as poses (intro, hurt, taunt, win). Intro, idle, WIN 1/2 and the walk all use '
     'hands-in-pockets frames (R6/R7) or the kick flourish (R9). No fist is raised in any intro, idle or win pose.', '',
     '## Frame → animation → trigger', '',
     '| # | Frame | Rect (sheet, incl.) | Animations → trigger |', '|---|---|---|---|']
for n, (fid, d) in enumerate(fj['frames'].items(), 1):
    L.append(f"| {n} | {fid} | {tuple(d['rect'])} | " + '<br>'.join(trig(u) for u in d['uses']) + ' |')
L += ['', '## Animation → frames', '', 'See `tools/sanji_build/extract.py` `ANIMS` (source of truth) and `sanjiSprites.js` (generated).', '']
open(os.path.join(ROOT, 'docs/sanji/SPRITE_LEDGER.md'), 'w').write('\n'.join(L))
print('ledger rows', len(fj['frames']))
