# Saitama — Asset Map

rosterKey **`saitama`** · universe **one_punch_man** (FIRST OPM char) · source: **arzeer** (DeviantArt),
JUS-style fan sheet (`saitama_jus__by_arzeer_de00xcg.png`). Attribution MANDATORY (credits.js).

SCHEMA-EXCEPTION character (Madara / Isshiki tier): 5 normals + grab + command-normal chain + tiered
tap/hold punch-combo + 7 specials + Death Punch ultimate. Canon gimmick: ALREADY max power at baseline
(no transform) → base normals kept ~roster-average, the **Serious Punch / Death Punch payoff numbers**
carry the power fantasy. Filename typos (`pucnh/puch/haded/meateor/bargin/specail/backround/wards`)
preserved on **source** files only; code + UI use corrected technique names.

Reslicing: **`tools/reslice_saitama.py`** (mirrors reslice_isshiki.py — alpha-gutter frame detect →
per-frame bbox → repack feet-aligned into one uniform cell: centered-X, BOTTOM-aligned; single
`anchorY: 0` plants feet everywhere). Adds a `stitch()` helper that concatenates several resliced
uniform strips into ONE ordered strip (used for the 3-part intro).

## Stage 1 — registration + movement/state + 3-part intro  ✅ (harness/saitama_stage1.mjs — 18/0)

Stats (durable powerhouse, NO new roster records): **HP 1280 · Serious 150 · Atk 90 · Def 92 · Spd 84.**
spriteScale **2.0** → idle body **106px** (measureSprite; normal-height human band). Energy = "Serious"
meter (`energyConfig`, gold #f2b705) — the limiter-break resource that gates his huge special list.

| action | source file | reslice → uniform | frames | cell | note |
|---|---|---|---|---|---|
| idle | saitama_idle.png | saitama_idle_uniform.png | 5 | 28×55 | breathing loop |
| walk/run | saitama_walk.png | saitama_walk_uniform.png | 6 | 46×54 | **4th source run (119px) = 3 FUSED frames** (no alpha seam) → hand-split via `xrects` → master sheet's 6 |
| dash | saitama_dash.png | saitama_dash_uniform.png | 2 | 32×55 | |
| jump (+fall=last cell) | saitama_jump.png | saitama_jump_uniform.png | 8 | 35×63 | fall = jump cell held (sourceX 245) |
| guard | saitama_block.png | saitama_block_uniform.png | 3 | 33×55 | |
| hurt | saitama_hit.png | saitama_hit_uniform.png | 5 | 24×56 | |
| intro | (3 parts stitched) | saitama_intro_full_uniform.png | 17 | 53×65 | getup(4) → run-backwards(5) → settle(8) → hands off to idle |

**3-part intro** = `saitama_intro.png` (4f, getup-from-lying) → `saitama_intro_2_run_back_wards.png`
(5f) → `saitama_intro_3.png` (settle). intro_3 raw = 11 runs = **[1px debris, 14px FX streak, 15px FX
streak, then 8 real character poses]** → dropped the debris AND the 2 tall vertical FX streaks (NOT
poses, 119px-tall) → kept the 8 character frames. All three stitched into one feet-aligned strip.

Registration files touched: `characters.js` (saitama const + roster map), `spritesheets.js` (idle-strip
gate), `credits.js` (arzeer attribution), `skins.js` (Default-only entry — sprite scale gate),
`game.js` (UNIVERSE_ACCENT `one_punch_man` = #f2b705). Universe system is fully dynamic → "One Punch Man"
auto-appears on the select screen; stage routing falls to the neutral fallback (dedicated stage = out of scope).

## Stage 2 — 5 normals + grab + command-normal chain  ✅ (harness/saitama_stage2.mjs — 25/0)

Normals render by move name (basic_attacks data in characters.js drives damage; animationData drives sprite):

| slot | source file | reslice → uniform | frames | cell | connects |
|---|---|---|---|---|---|
| light | saitama_basic_kick.png | saitama_light_uniform.png | 7 | 41×55 | ✓ dmg |
| heavy | saitama_punches.png (canonical over punch_1 subset) | saitama_heavy_uniform.png | 8 | 70×55 | ✓ dmg |
| up (launcher) | saitama_up_attack.png | saitama_up_uniform.png | 6 | 44×62 | ✓ dmg |
| air | saitama_air_punch_part_1.png | saitama_air_uniform.png | 6 | 34×55 | ✓ (airborne J) |
| down_air (spike) | saitama_air_punch_part_2.png | saitama_downair_uniform.png | 3 | 35×55 | ✓ (airborne S+J) |
| grab | saitama_grab.png | saitama_grab_uniform.png | 7 | 52×60 | ✓ (dedicated O throw) |

**Grab render:** the generic O-grab (combat.js) clears the attacker's attack state → would render idle.
Added a grab-pose watcher in `updateSaitamaCommandCombat` (mirrors RR's `_rrGrabbing`): while `opp.isGrabbed`
& we aren't grabbed, drive `_spriteCastMove="grab"` (short refreshing timer → last frames play as release).

**Command-normal chain — "Spin-Punch" (Fwd+Heavy), cancelable 3-stage rekka** (mirrors Red Ranger
`rrRekka1/2/3`, shared `rekkaContinue` cancel-on-HIT). Source `turn_puch.png` (14 poses): its RAW first
run (x3-103) is **3 FUSED poses** (stand→turn→cape) with 1px seams → hand-split via `xrects`. Split into:

| stage | reslice | frames | cell | move data | note |
|---|---|---|---|---|---|
| saitamaTurn1 | saitama_turn1_uniform.png | 5 | 42×65 | dmg 40, opener | spin windup |
| saitamaTurn2 | saitama_turn2_uniform.png | 5 | 54×49 | dmg 46, mid | forward punches |
| saitamaTurn3 | saitama_turn3_uniform.png | 4 | 52×55 | dmg 82, **launcher** | cape-throw finisher (string ends) |

Wiring: `abilities.js` SAITAMA_CMD + fireSaitamaCmd + `updateSaitamaCommandCombat` (exported) · `game.js`
import + rosterKey-gated dispatch + NEW `saitamaCmd` harness probe · `sprite.js` MOVE_TO_ACTION identity
maps (saitamaTurn1/2/3). FREE (no Serious energy) — commits via recovery. Neutral heavy stays `punches`.

## Stage 3 — tiered tap/hold punch-combo special  ✅ (harness/saitama_stage3.mjs — 11/0)

Neutral **Special (L)**, resolved on RELEASE (tap/hold split — the wired Madara-Ultimate pattern, NOT the
re-tap-escalation Vegeta up-tier): **TAP → 10× / HOLD (≥200ms) → 20×.** A directional Special stays free
for the Stage-4 specials (fired on press).

| tier | input | source file | reslice → uniform | frames | cell | move data |
|---|---|---|---|---|---|---|
| saitamaCombo10 | tap L | saitama_normal_punches.png | saitama_combo10_uniform.png | 11 | 96×71 | dmg 13/hit, 18 active, cost 20 |
| saitamaCombo20 | hold L | saitama_super_punches.png | saitama_combo20_uniform.png | 12 | 133×86 | dmg 20/hit, 33 active, cost 35 |

`consecutive_pucnhes` / `super_pucnh` are redundant subsets (design doc) → NOT imported. super_punches'
13th run (11px end-fragment) dropped; its baked-in **"BD" label** (top-left of frame 0, y7-16; char starts
y41) scrubbed via a NEW `scrub` rect param in reslice_saitama.py.

**Multi-hit flurry:** one committed attack per tier whose `hasHit` latch is re-armed every
`SAITAMA_COMBO_REHIT` (3) ACTIVE frames → a rapid string of punches (drives the combo counter). knockbackX=1
(a pin) keeps the foe in range; the flurry is bounded by the active window (→ recovery releases them, can't
combo-lock) and **combo-decay naturally caps total damage** (healthy for the big kit). HOLD out-damages TAP
via a bigger per-hit + longer window. Costs Serious energy (the meter that gates his kit).

Wiring: `abilities.js` SAITAMA_COMBO + `fireSaitamaPunchCombo` (exported) + re-hit maintenance in
`updateSaitamaCommandCombat` · `game.js` `handleSaitamaSpecialDown`/`Release` (keydown/keyup) + neutral-
Special ARM in the special press-path (consumes press, defers to release) · `sprite.js` MOVE_TO_ACTION
identity maps (saitamaCombo10/20) · `characters.js` animationData.

## Stage 4 — the 6 specials (+ Side Hop)  ✅ (harness/saitama_stage4.mjs — 29/0)

`executeSaitamaSpecial` branches by `_specialHeldDir` + `grounded` (Isshiki precedent). A schema-exception
char has more specials than ground directions (N=combo), so the 3 situational moves live on AIR inputs.

| input | special | source → uniform | frames | move data |
|---|---|---|---|---|
| GROUND Fwd+L | **Serious Punch** (marquee) | meateor_punch.png (drop 8px debris) → saitama_serious_uniform.png | 24 | dmg130 + superArmor + **traveling shockwave** |
| GROUND Back+L | Two-Handed Punches | two_haded_punches.png (part1, FX-complete) → saitama_twohand_uniform.png | 11 | dmg96 |
| GROUND Up+L | Today Is Bargain Sale | the_bargin_specail_up_attack.png → saitama_bargain_uniform.png | 12 | dmg92 |
| GROUND Down+L | Serious Table Flip | table_flip.png → saitama_tableflip_uniform.png | 10 | dmg78, **launcher** (launchVy -30) |
| AIR neutral/Up+L | Headbutt | head_butt.png (char runs 0-5; runs 6-12 = FX dropped) → saitama_headbutt_uniform.png | 6 | dmg72 |
| AIR Fwd+L | Up→Down Combo | super_up_attack_to_down_attack_combo.png (cull four 1px debris) → saitama_updown_uniform.png | 7 | dmg100, **spike** (knockbackY +11) |
| AIR Back/Down+L | Side Hop (evasive) | side_hops.png → saitama_sidehop_uniform.png | 7 | 0 dmg, i-frames (invulnTimer) + back-hop (Hiruzen SPIN pattern) |

**Serious Punch = marquee payoff:** the 24f windup→impact melee (dmg 130, superArmor to shrug a hit through
the windup) PLUS a **traveling shockwave** — `serious_punch_projectile.png` (4f) spawned via
`schedulePendingSpawn` at the impact frame, flying forward as a SEPARATE ranged hitbox (verified: spawns,
travels x1380→1510, hits P2 at range for 37 independent of the melee). `serious_punch.png` (shorter) unused;
`air_punch_projectile` == `serious_punch_projectile` (identical) not double-imported.

Wiring: `abilities.js` SAITAMA_SPECIALS + fire fns + `executeSaitamaSpecial` (dispatched from triggerSpecial's
`case "saitama"`) · `sprite.js` MOVE_TO_ACTION (7 identity maps) · `characters.js` animationData · reslice_saitama.py.
All effect fields (superArmor/launcher/launchVy/spike) propagate via `createAttackFromMove` moveData.

## Stage 5 — Death Punch ULTIMATE (freeze/camera-focus cinematic)  ✅ (harness/saitama_stage5.mjs — 12/0)

**Ultimate button (U) at 100 Serious.** An INLINE live-fighter freeze cinematic (Isshiki pattern → NO
duplicate-fighter instance): the real fighter holds the CHARGE pose (`saitamaDeathCharge`,
death_punch_ultimate_part_1 7f) while the camera zooms + the opponent is frozen, then swaps to the IMPACT
pose (`saitamaDeathImpact`, part_2 8f) as a GUARANTEED, range-independent payoff lands (dmg 340 raw → ~204
EFF; held block chips to 25% — Miwa sure-hit contract, top-ult band, NOT an outlier).

`_saitamaDeathTimer` = a PUBLIC countdown (decremented in game.js) that drives BOTH the pose swap
(`schedulePendingSpawn(impactAt)`) and the backdrop overlay envelope.

**Hi-res backdrop = fullscreen screen-space overlay, NOT sprite-sliced** (`death_punch_backround_effect.png`,
663×196 — a different, hi-res art pipeline). `game.js drawSaitamaDeathPunchCinematic(ctx, canvas)` (mirrors
`drawHiruzenReaperCinematic`) reads the LIVE caster's timer and, in SCREEN space, builds a dark vignette
through the wind-up → cover-fits the giant fist/face backdrop in on the impact beat (t≈0.38–0.72, slight
punch-in) → an additive white flash at the punch. Backdrop loaded via the standard `new Image()` + `.complete`
guard. Verified: live fighter performs it (no dup), overlay runs (renders>0), image loads, envelope peaks
(maxEnv 1.0), payoff 204.

Wiring: `abilities.js` `executeSaitamaUltimate` + `applySaitamaUltimateDamage` (dispatched from
triggerUltimate's `case "saitama"`) · `game.js` timer decrement + `drawSaitamaDeathPunchCinematic` + render-loop
hook + NEW `saitamaDeathCine` harness probe · `sprite.js` MOVE_TO_ACTION · `characters.js` animationData ·
reslice_saitama.py (poses only; backdrop stays raw). GOTCHA: harness ult needs an explicit key HOLD
(down/wait/up), not `page.keyboard.press` (too fast to register).

## Stage 6 — portrait + canonical harness + balance pass  ✅ (harness/saitama.test.mjs)

**Portrait** (no dedicated mugshot art) → `saitama_portrait.png`, a bald-head + yellow-suit bust cropped from
idle frame 0 (top ~62%) and upscaled ×NEAREST to 189×288 (jason/isshiki/zenitsu precedent). Wired in
characters.js + skins.js default (already referenced since Stage 1).

**Canonical suite** `test:saitama` — STATIC sweep (all animationData sheets + portrait + shockwave FX +
backdrop exist on disk) · runtime gate (key/handler/idle/scale 2.0/HP1280/EN150/portrait/"Serious" label) ·
movement/state + intro · light+heavy connect + grab · Spin-Punch chain opener · both combo tiers (multi-hit)
· all 6 specials + Side Hop + the Serious Punch shockwave (travels, separate hitbox) · Death Punch ult
(live-fighter charge→impact + hi-res backdrop overlay + guaranteed 204 payoff) · **29-action fallback-box
sweep** (every animationData action renders a real saitama_ sheet — no 128² box) · no JS errors.

**Balance pass** (BALANCE_AUDIT.md entry added): **FAIR versatility outlier (Madara/Isshiki/Pain class).**
The sheer NUMBER of moves is NOT a power concern — every per-hit EFF is in-band, the ENTIRE kit is honestly
×0.60 scaled (ult via `applyScaledDamage` → 204 EFF, NOT manual-subtract), and the breadth is throttled by
the 150 "Serious" pool (specials 15–45 each). NO stat record (Def 92 ties the non-giant ceiling; HP 1280
near-top). Two minor watch-items: HP1280×Def92 tankiness (knob: HP→~1220) and Serious Punch superArmor
(counterweight: 45 cost + long punishable windup).

## BUILD COMPLETE — all 6 stages done (test:saitama-stage1..5 + test:saitama).
Stage 6 = portrait + full harness + balance pass. See design doc file-handling notes for duplicate/subset
files (punch_1 ⊂ punches, consecutive_pucnhes ⊂ normal_punches, the two identical projectile PNGs, shared
super_pucnh tail) and the hi-res `death_punch_backround_effect.png` (fullscreen overlay, NOT sprite-sliced).
