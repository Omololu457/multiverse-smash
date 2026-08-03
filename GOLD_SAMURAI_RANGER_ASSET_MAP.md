# Gold Samurai Ranger (Light) — Asset Map

THIRD Power Rangers sprite character (`rosterKey: gold_samurai_ranger`, universe
`power_rangers`), after Omega Ranger and Samurai Red Ranger. Light-samurai swordsman.
Mirrors Red Ranger's CONFIRMED structure (base/Mega-Mode **tier-swap**, a Transformation
special, a tier-scaling Ultimate) with Gold's OWN art. Staged build, real screenshot
evidence per stage.

## HEADLINE FINDINGS (investigation, this build)
- **Weapon identity = KATANA (Barracuda Blade), NOT bow/arrow.** The alpha-gutter scan +
  visual inspection of BOTH attack masters (`..._attacks.png`, `..._mega_mode_attacks.png`)
  found ONLY sword melee poses with blue **slash-arc FX** (sword swipe trails). There is **no
  bow/arrow content on disk** — the brief's "bow/arrow alongside melee" identity is not
  present in the actual assets. Stage 4 therefore uses the strongest REAL candidate: a **light
  energy slash-wave projectile** built from those blue slash-arc FX frames (a sword-beam), not
  invented bow/arrow art.
- **Transformation = LIGHT SYMBOL (光), not fire.** `..._mega_mode_transformation.png` is a
  glowing yellow/gold kanji-symbol animation (stroke-by-stroke build → bright glow), i.e. the
  Light Symbol Power — distinct from Red's fire-calligraphy. Stage 3's cinematic uses THIS art.

## Untracked originals (discipline)
All `samurai_ranger_gold_*.png` source files are **untracked in git**. `tools/reslice_strip.mjs`
overwrites in place, so every reslice runs on a **COPY** (`*_uniform.png`). Never reslice a raw
original. Frame boundaries below come from an alpha-gutter scan (`ALPHA=16`).

## Tier convention
Base tier = `samurai_ranger_gold_*`. Mega tier = `samurai_ranger_gold_mega_mode_*`. The tier-swap
reuses Red Ranger's proven `_skinAnim` architecture (Stage 3).

---

## STAGE 1 — registration + base movement/state  ✅ BUILT
3-file gate: `characters.js` (goldSamuraiRanger) + `skins.js` (default skin) + `spritesheets.js`
(idle gate). Energy `symbol_power → "Symbol Power"` label already present (shared w/ Red).
spriteScale **2.0** (idle content ~53px → ~106px on-screen, roster median). All sheets RE-SLICED
from copies.

| action | uniform sheet | frames | cell |
|---|---|---|---|
| idle | `samurai_ranger_gold_idle_uniform.png` | 4 | 32×58 |
| walk/run/dash | `samurai_ranger_gold_run_uniform.png` | 8 | 45×54 |
| jump/fall | `samurai_ranger_gold_jump_uniform.png` | 6 | 29×60 |
| hurt | `samurai_ranger_gold_hurt_uniform.png` | 11 (use first 3 = stagger) | 54×69 |
| guard | `samurai_ranger_gold_guard_uniform.png` | 3 | 37×53 |

Source→uniform notes:
- `samurai_ranger_gold_run.png` had non-uniform islands (32–43px) → resliced to even 45px cells.
- `samurai_ranger_gold_hurt.png` is a full **hurt→knockdown→getup** strip (11 poses). `hurt` uses
  the first 3 stagger frames; knockdown/getup (frames 4–10) RESERVED for a later stage.
- `samurai_ranger_gold_block.png` is a **2-row** sheet (guard poses + a **cyan energy-shield** FX).
  A per-island bright-cyan scan isolated the 3 FX-free guard poses (band 0, x279–398) → guard strip.

Base stats (nimble sword striker — faster/lighter than Red): HP **1160** / EN **165** / atk **92** /
def **84** / spd **94** / jumps 2 / jumpPower 32 / dash 19×10 / dashCD 32. Inside the roster band.

Evidence: `harness/gold_samurai_ranger_stage1.mjs` (12/12), shots `harness/shots/gold_stage1_*.png`.

---

## Remaining source inventory (Stages 2–5)

### Base-tier combat — `samurai_ranger_gold_attacks.png` (955×467)
A **5-row** master sheet, all KATANA melee (slashes/stabs/spins/overheads with blue slash-arc FX).
Stage 2 will reslice per-row and pick the 5 cleanest normals (light/heavy/up/air/down_air) + route
overflow into a Toji-Rekka command chain. The rows with the biggest blue crescent slash-arcs are the
Stage-4 sword-beam-projectile source. (Row boundaries measured per-stage.)

### Mega-tier combat — `samurai_ranger_gold_mega_mode_attacks.png` (1009×416)
Gold-armored Mega form, ~3–4 rows, same sword-melee move family with larger FX. Drives the Mega tier
of every base move (Stage 3 tier-swap `_skinAnim`).

### Mega movement/state
`..._mega_mode_idle.png` (163×60, 4f) · `..._mega_mode_run.png` (555×79, 8f) ·
`..._mega_mode_bjump.png` (312×84) · `..._mega_mode_block.png` (419×175, 2-row+FX) ·
`..._mega_mode_hurt.png` (731×105).

### Transformation cinematic — `samurai_ranger_gold_mega_mode_transformation.png` (1255×840)
Light-symbol (光) glow animation across ~4 rows. Stage 3 cinematic art (light/illumination theme).

### Intro ✅ WIRED (2026-08-01)
`samurai_ranger_gold_intro.png` (570×265) = Antonio's pre-morph **Samuraizer flourish** (3 rows,
11+11+5 = **27 frames**) — the ONE genuine intro-quality sequence. Resliced to a single uniform strip
`samurai_ranger_gold_intro_uniform.png` (44×69 cells, `tools/build_gold_intro_strip.py`) and wired as
`animationData.intro` + `introPool:["intro"]` (SINGLE fixed intro — not a random pool). The armored-ranger
idle takes over at round start (morph-reveal read). `samurai_ranger_gold_intro_2.png` (1270×663) is a
超 "Super" kanji **CALLIGRAPHY FX**, NOT a character pose → not wired as an intro (available as transform FX).

### Portrait ✅ REAL MUGSHOT (2026-08-01)
Replaced the placeholder (idle-crop) with the **real "Gold Ranger [Light]" bust** cropped from the master
sheet `samurai_ranger_gold.png` header (alpha-bbox 923,428–1050,600; gold helmet + blue/gold torso +
Barracuda Blade). Overwrites `samurai_ranger_gold_portrait.png` (same `portrait:` field — no wiring change).
The 12 alt-skin recolor portraits are untouched (separate `__<tag>` files).

---

## STAGES 2–6 — ✅ BUILT (summary)

**Stage 2 — normals + command chain.** 5 katana normals sliced per-row from the attacks master:
light=`gold_slash` · heavy=`gold_lunge` · up=`gold_rising` (SINGLE launcher, not Red's merged tap/hold) ·
air=`gold_aerial` (fr 0-6) · down_air=`gold_aerial` (fr 4-8, sourceX 312). Toji-Rekka chain
samRekka1(slash)→samRekka2(lunge)→samRekkaFin(`gold_launcher` big V-arc), cancel-on-hit. Reuses Red's
shared `updateSamuraiRangerCommandCombat`+`SAMURAI_RANGER_CMD` (generalized to both rangers; merged-up +
Red-VA gated Red-only). test:gold-samurai-stage2 21/21.

**Stage 3 — Mega Mode.** Reuses Red's tier-swap machinery made CHAR-AWARE: `GOLD_MEGA_ANIM` (gold-armored
Super Samurai sheets sliced from the mega attacks master), `SAMURAI_MEGA_ANIM_BY_KEY` picks it,
`isSamuraiRanger` generalized. Transformation cinematic = Gold's OWN 光 LIGHT-SYMBOL (`gold_lightsymbol`
strip from the transformation sheet) over a rising GOLDEN glow (drawSamuraiMegaTransform branches on
rosterKey — NOT Red's fire calligraphy). 1.35×/1.05×/1.08× tier. test:gold-samurai-stage3 14/14 (incl.
dual-render ≤1).

**Stage 4 — Light Slash special.** NO bow/arrow art exists (confirmed) → a light energy slash-wave
PROJECTILE (`gold_slashwave` — the blue slash-arc FX chroma-key-extracted from the launcher sheet), own
collision. BOTH tiers, tier-scaling (base 43/Mega 57 wave dmg + Mega cast art). test:gold-samurai-stage4 9/9.

**Stage 5 — Ultimate "Barracuda Blade: Light Finale".** REUSES Red's freeze-cinematic
(`activateSamuraiFlameSmasherCinematic`) with a LIGHT (gold) FX palette (draw branches on rosterKey) +
Gold's launcher barrage art. TIER-SCALING: base `gold_launcher`+340 / Mega `gold_mega_launcher`+460
(RAW manual-subtract, same model as Red). test:gold-samurai-stage5 12/12.

**Stage 6 — canonical + balance.** `harness/gold_samurai_ranger.test.mjs` 22/22 (all moves both tiers,
transform, dual-render guard, ult tier-scaling). Balance: HP1160/EN165/atk92/def84/spd94 all INSIDE the
roster band, no outliers (nimble sword duelist; spd below Toji's 98 ceiling). Ult 340/460 is RAW (matches
Red — the flagged manual-ult class, balanced vs its sibling). Edo Tensei reanim coverage generated (10/10
base sheets via gen_alt_skins.mjs --reanim; mega-tier reanim absent — SAME as Red, shared limitation).

### Deferred / not present
- **No bow/arrow content** (brief's assumption) — does not exist on disk; Light Slash sword-beam used instead.
- Hurt-sheet **knockdown/getup** frames (4-10) + **intro** sheets (intro/intro_2) reserved (idle intro pose used).
- **Voice**: none (Red's VA is gated Red-only; Gold voice deferred).
- **Mega air/down_air** reuse the one mega aerial row; **ultimate** reuses launcher art (no dedicated ult sheet).
