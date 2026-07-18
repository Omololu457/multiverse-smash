# SASUKE ASSET MAP

Documentation-only mapping pass (mirrors the Naruto KCM asset reference doc). **No PNGs were
renamed, edited, or re-sliced.** No gameplay logic wired — `abilities.js` / `characters.js` /
`combat.js` are untouched. This exists so a future prompt can wire these moves correctly.

**Method:** every sheet was dimension-measured (PIL) and the flagged/ambiguous ones were
visually inspected (composited previews). `cell width = sheet width ÷ frame count` per the
task's formula. Columns mirror `MANIFEST.csv` conventions (`det_frames` → Frames, `cell_w`,
`cell_h`, `confidence`, `note`).

**Frame-count caveat:** automated alpha-gutter detection is reliable for solid single-figure
CHARACTER frames, but UNRELIABLE for (a) spinning/overlapping poses and (b) sparse FX (bright
disconnected shapes create false gutters). Where automation disagreed with the confirmed
counts, both are shown and flagged — see OPEN QUESTIONS.

---

## Character frames (Sasuke himself)

| File | Dims (WxH) | Frames | Cell W (W÷frames) | Cell H | Move key | Confidence / notes |
|---|---|---|---|---|---|---|
| `saske_stance_2.png` | 112×57 | 4 | **28** (112÷4) | 57 | `stance2` | reliable. Typo "saske" INTENTIONAL — do not rename. ⚠ task line said "24px cell" but 112÷4 = **28** (and Phase-2 idle wiring already uses 28 successfully) — treating 28 as correct. |
| `sasuke_amaterasu_intro_attackpng.png` | 262×72 | 8 | 32.75 | 72 | `amaterasuIntro` | reliable (auto=8 ✓). Cast windup pose, character only, no FX. |
| `sasuke_chidiro_regular_attack.png` | 570×56 | **8?** ⚠ | 71.25 (if 8) / 63.3 (if 9) | 56 | `regularAttack` | ⚠ **FRAME COUNT DISPUTE** — you stated 8; auto-detect (all gutter thresholds) AND my visual recount = **9** distinct poses. Confirm before wiring. Generic melee combo, NOT a Chidori technique (typo'd filename kept as-is). |
| `sasuke_chidori_attack.png` | 192×60 | 3 | 64 | 60 | `chidoriBase` | reliable (auto=3 ✓). Compact lunge/jab, small WHITE (untinted) spark at fist. |
| `sasuke_chidori_attack_3.png` | 200×63 | 4 | 50 | 63 | `chidoriBaseCharged` | reliable (auto=4 ✓). BLUE-tinted. See relationship flag in OPEN QUESTIONS — pose differs from `chidoriBase` (fuller extended-arm thrust + 1 extra frame), so likely a distinct charged animation, NOT a pure recolor. |
| `sasuke_chidori_blade_charge.png` | 160×58 | 2 | 80 | 58 | `chidoriSwordCharge` | reliable (auto=2 ✓). Channeling Chidori into blade — precursor to the Chidori Sword FX. |
| `sasuke_chidori_intro.png` | 105×77 | 3 | 35 | 77 | `chidoriIntroAura` | reliable (auto=3 ✓). Taller cell; wolf/dog-head aura silhouette. **Recommended as the "main" intro** (more elaborate/cinematic) — see OPEN QUESTIONS. |
| `sasuke_chidori_intro_1.png` | 97×43 | 2 | 48.5 | 43 | `chidoriIntroSimple` | reliable (auto=2 ✓). Shorter cell; crouch with a BLUE chakra flare in frame 2, NO distinct aura shape. Simpler/quicker variant. |
| `sasuke_CHIDORI_KOITEN_attack.png` | 284×73 | **~7** | 40.6 | 73 | `chidoriKoiten` | ⚠ auto-detect unreliable (3–9 by threshold, spinning limbs). Visual ≈ **7** poses supports your "~7". Spinning pose. |
| `sasuke_CHIDORI_NAGASHI_attack.png` | 414×60 | 7 | 59.1 | 60 | `chidoriNagashi` | auto=7 ✓ (matches your ~7). Wide arms-out stance. |

### Needs-visual-confirmation pair — RESOLVED by inspection

| File | Dims | Frames | Cell W | Cell H | Proposed key | Finding (please confirm A/B assignment) |
|---|---|---|---|---|---|---|
| `sasuke_chidori_attack_1.png` | 254×67 | 6 | 42.3 | 67 | `chidoriWindupA` | Stand → extend arm → full forward point/thrust. **Clean arm, NO FX/spark.** |
| `sasuke_chidori_attack_2.png` | 238×66 | 6 | 39.7 | 66 | `chidoriWindupB` | **Same stand→point motion**, BUT mid/late frames add an **orange/tan spark-crackle FX on the hand/arm** (Chidori igniting on the palm). |

**Not duplicates** — the distinguishing factor is the baked-on hand FX (ca2 has it, ca1 doesn't).
Suggest A = no-charge windup, B = charged/active windup. Confirm the A/B labels or tell me if you
want them named by the FX distinction instead (e.g. `chidoriWindup` / `chidoriWindupSparking`).

---

## FX-only sheets (pure effects, layered on TOP of character frames — same pattern as `naruto_kcm` `fx_*`)

⚠ Frame counts below are your visually-confirmed pose counts; automated segment counts (shown
in notes) over-count due to sparse/disconnected FX pixels and are NOT authoritative. A future
wiring pass should confirm each FX's real frame boundaries visually before slicing.

| File | Dims (WxH) | Frames (poses) | Cell W (W÷frames) | Cell H | FX key | Notes |
|---|---|---|---|---|---|---|
| `sasuke_amaterasu_attack_2.png` | 973×144 | 8 | 121.6 | 144 | `fxAmaterasuFlames` | 8 black flame-burst poses. Auto seg-count 15 (sparse → unreliable); trust 8. |
| `sasuke_amaterasu_hitpng.png` | 747×89 | ~5 (stages) | ~149.4 | 89 | `fxAmaterasuIgnite` | Ground flame-spread → tall ignition burst, ~5 stages. Auto 22 (very sparse). Confirm exact stage count when wiring. |
| `sasuke_chidori_effect.png` | 561×65 | ⚠ **MIXED — see OPEN QUESTIONS** | n/a | 65 | *(do not assign one key)* | **NOT a single sequential animation.** Contains several visually distinct effects concatenated (see flag). |
| `sasuke_chidori_effects_reapeatable_1.png` | 289×42 | 4 | 72.25 | 42 | `fxChidoriSparkSmall` (loopable) | auto=4 ✓. 4 small spark bursts. |
| `sasuke_chidori_effects_reapeatable_2.png` | 349×111 | 4 | 87.25 | 111 | `fxChidoriSparkLarge` (loopable) | 3 large radial bursts + 1 tiny diamond = 4. Auto seg-count 5 (the tiny diamond may split); confirm 4 vs 5. |
| `sasuke_CHIDORI_KOITEN_effects.png` | 771×118 | ~5 | ~154.2 | 118 | `fxChidoriKoitenShield` | Swirling arc growing into a full circular shield. Auto=5. Confirm exact frame count when wiring. |
| `sasuke_CHIDORI_NAGASHI_effects_repeate.png` | 294×140 | 2 | 147 | 140 | `fxChidoriNagashiBurst` (loopable) | auto=2 ✓. 2 large mirrored radial bursts. |
| `sasuke_chidori_sword_effect_1.png` | 846×100 | ⚠ (unconfirmed) | n/a | 100 | `fxChidoriSwordTrail` | Growing wavy lightning trail → one large spiral loop. Auto seg-count 24 (sparse lightning → unreliable). **Frame count needs visual confirmation** before wiring. |

---

# BATCH 3 (movement / states / sword / summon / more FX)

## Character frames — batch 3

| File | Dims (WxH) | Frames | Cell W (W÷frames) | Cell H | Move key | Confidence / notes |
|---|---|---|---|---|---|---|
| `sasuke_stance_1.png` | 119×59 | 4 | 29.75 | 59 | `stance1` | reliable (auto=4 ✓). FIRST idle variant — idle-loop **pair** with `saske_stance_2.png`/`stance2` (batch 1). |
| `sasuke_jump.png` | 406×78 | 8 | 50.75 | 78 | `jump` | reliable (auto=8 ✓). Pure aerial arc, no attack. |
| `sasuke_jump_attack.png` | 409×83 | **6?** ⚠ | 68.2 (if 6) | 83 | `jumpAttack` | ⚠ auto=**9** vs your 6 (the sweep-trail adds false segments); trusting your visual 6 — confirm. Aerial kick/slash w/ sweep-trail, no sword. |
| `sasuke_jump_and_sword_attack.png` | 303×68 | 7 | 43.3 | 68 | `jumpSwordAttack` | reliable (auto=7 ✓). Jump → sword-drawn landing strike. Distinct from `jumpAttack` — keep both. |
| `sasuke_running.png` | 449×53 | 8 | 56.1 | 53 | `run` | reliable (auto=8 ✓). |
| `sasuke_knocked_down.png` | 812×68 | ~10–11 ⚠ | ~74–81 | 68 | `knockedDown` (+ `getUp`?) | ⚠ **SPLIT QUESTION** (OPEN Q7). Visually confirmed spans BOTH the knockdown/prone phase (impact sparks, lying) AND a full get-up-to-stance phase. auto=11. |
| `sasuke_lose.png` | 335×67 | **8?** ⚠ | 41.9 (if 8) | 67 | `lose` | ⚠ auto=**9** vs your 8 — confirm frame count. |
| `sasuke_pfp.png` | 189×224 | 1 (single image) | n/a | n/a | `portrait` | Portrait headshot, NOT an animation. (Already gameplay-wired as the portrait in Phase 1.) |
| `sasuke_regular_sword_attack.png` | 214×71 | 3 | 71.3 | 71 | `swordAttackSmall` | reliable (auto=3 ✓). Tighter cyan slash arcs, compact upright poses → reads as the **LIGHT** swing (OPEN Q8). |
| `sasuke_regular_sword_attack__1.png` | 281×89 | 3 | 93.7 | 89 | `swordAttackLarge` | reliable (auto=3 ✓). Bigger arcs, a forward LUNGE with more reach, larger cell → reads as the **HEAVY** swing (OPEN Q8). |
| `sasuke_substitusion_justu.png` | 233×71 | 4 | 58.25 | 71 | `substitution` | reliable (auto=4 ✓). 3 smoke-poof clouds + 1 wooden-log frame. Kawarimi-equivalent — reuse Naruto's Kawarimi / `fx_smoke_poof` pattern at wiring. Typo "substitusion" kept as-is. |
| `sasuke_super_chidori.png` | 848×54 | ~14–15 | ~57–61 | 54 | `superChidori` | auto=15 (≈ your ~14). Confirmed: charge-RUN sprint building Chidori → final forward thrust. Ultimate-adjacent / top Chidori tier. |
| `sasuke_intro.png` | 511×63 | **9?** ⚠ | 56.8 (if 9) | 63 | **UNASSIGNED** ⚠ | ⚠ auto=12 vs your 9. FLAGGED (OPEN Q9): contains a cloak-unfurl reveal **AND** a distinct white loop/**wire-weapon** element in the later frames → mixes an intro with a combat action. **Do NOT assign a final key yet.** |

## FX-only sheets — batch 3

⚠ Same caveat as batch-1 FX: automated counts unreliable for sparse effects; frame counts are your confirmed pose counts.

| File | Dims (WxH) | Frames | Cell W | Cell H | FX key | Notes |
|---|---|---|---|---|---|---|
| `sasuke_lighting_attack_1_ repeatable.png` | 263×137 | **4** ⚠ | 65.75 | 137 | `fxLightningPillar` (loopable) | ⚠ **on-disk filename contains a SPACE** — `..._1_ repeatable.png` — NOT the double-underscore you wrote (`1__repeatable`); reference AS-IS. Measured + visual = **4** vertical wavy pillars (your "6" appears to be a miscount). |
| `sasuke_lighting_attack_repeatable.png` | 558×64 | 4 | 139.5 | 64 | `fxLightningBurstSmall` (loopable) | auto=4 ✓. 4 small ground-level spark bursts. |
| `sasuke_lighting_rod_attacks.png` | 698×105 | ~9 | ~77.6 | 105 | `fxLightningRod` | A **set** of spark-burst+beam "rods" at varying lengths AND angles (horizontal + diagonal) → reads as projectile **variants**, not one sequential loop (OPEN Q12). Pairs with `sasuke_foword_lighting_attack_1.png` (uncovered) or a ranged special. auto=7. |
| `sasuke_Lightning_dragon_Jitsu.png` | 857×142 | 7 | 122.4 | 142 | `fxLightningDragon` | auto=7 ✓. Confirmed TWO visual styles: **detailed bright dragon-heads (frames 1–3)** + **darker silhouette dragons (4–7)** → likely manifest/charge (1–3) → strike/dissipate (4–7). Confirm split (OPEN Q10). Typo "Jitsu" kept as-is. |
| `sasuke_shuriken.png` | 156×54 | n/a (FX only) | n/a | 54 | `fxShurikenThrow` | Confirmed: **only cyan motion-trail lines + sparks, NO shuriken silhouette.** It's a throw-motion overlay, NOT a projectile sprite — the actual shuriken likely lives in `sasuke_throwing_shuriken.png` (uncovered). See OPEN Q11. |

## Overlay assets (layered on the character, not standalone moves)

| File | Dims (WxH) | Frames | Cell W | Cell H | Key | Notes |
|---|---|---|---|---|---|---|
| `sasuke_sharingan_repeat_effect.png` | 135×44 | 3 | 45 | 44 | `fxSharinganPulse` (loop overlay) | 3-tomoe Sharingan eye pulses, no character body. Overlay — pairs with `sasuke_eyes.png` below; NOT its own move. |
| `sasuke_eyes.png` | 443×294 | ⚠ (not yet frame-counted) | — | — | *(eyes overlay)* | ⚠ **BATCH-2 DISCREPANCY** — you attributed this to "batch 2," but **no batch-2 content exists in this doc file** (this doc jumps batch 1 → batch 3). Cross-referenced here so it isn't lost. 443×294 dedicated eyes/Sharingan overlay set; its per-frame layout still needs a dedicated measuring pass unless batch 2 lives in a separate doc/session. |

## Summon

| File | Dims (WxH) | Frames | Cell W | Cell H | Key | Notes |
|---|---|---|---|---|---|---|
| `sasuke_summon.png` | 406×145 | 3 | 135.3 | 145 | `hawkSummon` | reliable (auto=3 ✓). 1 hawk wings-spread (flight) + 2 wings-folded (perched/landing). |

---

# BATCH 4 (Susanoo tier · Taka strips · remaining basics)

## Susanoo — MULTI-STAGE TRANSFORM TIER (not a single move)

Architecturally this is a **staged form**, not one move — same shape as `transformations.js`
(`transformationOrder` + per-form `damageMultiplier`/`speedMultiplier`, e.g. Naruto's
base→sageMode→kcmMode→baryonMode) and the stage-gated-unlock precedent in `kurama.js`
(`shroudStage` escalation). Suggested wiring later: a `susanoo` form with an ordered stage list
(`susanooLvl1` → `susanooLvl2`), entered via `susanooIntro`, each stage gating its own attacks
(grab / bow-arrow / sword-FX). **Do not wire yet.**

| File | Dims (WxH) | Frames | Cell W | Cell H | Key | Notes |
|---|---|---|---|---|---|---|
| `sasuke_susanoo_intro.png` | 679×70 | 6 (wired) | 113 | 70 | `absoluteDefenseFx` ⚠ **REPURPOSED** | **WIRED 2026-07-18 → ABSOLUTE DEFENSE barrier FX** (no longer Susanoo's activation). Swirling purple aura/ribcage now manifests around Sasuke when he toggles **Absolute Defense** ON (charge-button toggle → `abilities.spawnAbsoluteDefenseFx`, scale 1.6 / yOff −60 to sit over his BASE body, not the giant). Reads as a protective shell — a better fit for a defensive toggle than for the summon. **Susanoo's activation no longer uses any intro sprite** — it now enters via a spriteless screen-flash (`teleportFlash`) + camera-punch (`shakeCamera 11,14`), option (b), matching lighter transforms. See the Absolute Defense section below. |
| `sasuke_susanoo_lvl_1.png` | 975×277 | 5 | 195 | 277 | `susanooLvl1` | reliable (auto=5 ✓). **Stage 1** — purple skeletal/ribcage humanoid, horned skull, glowing eyes, wielding a **mace/flail** (spiked ball on a chain, extends in frames 3–4). Partial manifestation. |
| `sasuke_susanoo_lvl_2.png` | 945×298 | 4 | 236.25 | 298 | `susanooLvl2` | **Stage 2 (upgrade — confirm, OPEN Q14).** auto=8 (pedestal flames + bow over-count); trust your 4. Visibly BIGGER/fuller/more-armored, **four horns**, wielding a **bow** on a fire/spike pedestal. Reads as the upgrade of lvl_1 — BUT the weapon also changes (flail→bow), so confirm it's a stage upgrade and not a same-stage alt-loadout. |
| `sasuke_susanoo_grab_1.png` | 770×65 | ~11 | ~70 | 65 | `susanooGrab` (variant?) | Extending ribcage-arm grab — grows from a tiny fragment → medium-reach arm+fist. See OPEN Q15. |
| `sasuke_susanoo_grab_2.png` | 884×106 | ~8 | ~110 | 106 | `susanooGrab` (variant?) | Ribcage segments form → arm extends to a fist-grab. ⚠ has an embedded **"AMATERASU ATACK"** text label baked into the sheet (likely a mislabel). See OPEN Q15. |
| `sasuke_susanoo_grab.png` | 794×80 | ~6 | ~132 | 80 | `susanooGrab` (variant?) | Arm forms (motion lines) → **longest fully-extended** reach arm+claw. See OPEN Q15. |
| `sasuke_susanoo_arrow_attack.png` | 553×95 | 5 | 110.6 | 95 | `fxSusanooArrow` | reliable (auto=5 ✓). FX-only: small arrow + 4 growing purple spike-bursts. Charge/release FX for **lvl_2's bow**. |
| `sasuke_susanoo_sword_attack.png` | 1072×282 | ⚠ (see note) | — | 282 | **UNASSIGNED** ⚠ | ⚠ **FX-ONLY confirmed** (color analysis: ~87% yellow/white, **0% purple body**). Yellow/white ethereal blade energy — vertical energy blades (frames 1–5) → a big diagonal **slash arc** (last frame). Meant to layer OVER a Susanoo body. **Pairing unclear:** neither lvl_1 (flail) nor lvl_2 (bow) shows a sword-swing pose, so the matching body frame isn't in those sheets — see OPEN Q16. |

## ABSOLUTE DEFENSE — charge-button toggle (WIRED 2026-07-18)

Sasuke's **Absolute Defense** mirrors Gojo's Infinity architecture (toggle-on-charge-button +
`shouldGojoAutoDodge`-style hook in `combat.js`):

- **Input:** charge-button **TAP** (`P`) toggles it ON/OFF — same tap-vs-hold slot Gojo's Infinity
  uses (`game.handleChargeRelease`). Sasuke has no `transformationOrder`, so this slot was free.
- **Effect:** while ON and energy covers the cost, **every incoming hit is fully negated** — melee
  AND projectiles (`combat.shouldSasukeAbsoluteDefenseNegate`, called in both `resolveAttackHit`
  and `resolveProjectileHitsMulti`). Unconditional negate — stronger than Infinity's per-dodge roll,
  which can still fail.
- **Cost model:** per-block, NOT a continuous drain — energy is deducted **only on a hit it actually
  negates**. **Cost = 12 per block**, priced NOTICEABLY ABOVE Gojo's per-dodge `autoDodgeKiCost`
  (which falls back to **5** for the Infinity toggle). Constant: `combat.SASUKE_ABSOLUTE_DEFENSE_COST`.
- **Additive to normal block:** coexists with Sasuke's Down/S block — the negate is checked before
  the block/damage path, so it works whether or not he's also blocking; when OFF, normal block applies.
- **Visual:** repurposed `sasuke_susanoo_intro.png` barrier FX on toggle-ON + a persistent pulsing
  **purple** ring while active (`game._drawAbsoluteDefenseAura`; distinct from Gojo's cyan ring).
- **DEFERRED / OUT OF SCOPE:** holding the charge button while feeding a motion-gated special can
  create input conflicts — intentionally left unhandled this pass (noted in code comments only).
- **Test:** `harness/absolute_defense.test.mjs` (21/21).

**Susanoo activation (new handling):** because the intro sheet moved to Absolute Defense, Susanoo's
Stage-1 entry (`abilities.executeSasukeUltimate`) no longer plays a dedicated intro sprite — the Lv1
giant appears instantly, punctuated by a **screen-flash** (`teleportFlash`) + a **stronger
camera-punch** (`shakeCamera 11,14` + `focusCameraOnAction`). Chosen **option (b)** — simpler
transition, no sprite-sheet frame-count guesswork, matching how other characters' lighter transforms
enter — over option (a) (no already-loaded Sasuke asset reads as cleanly as a defensive barrier the
way `susanoo_intro` does; a flash is lower-risk than re-purposing a Chidori-specific sheet).

## Taka strips — SEPARATE MOVE ASSETS on base art (NOT a skin)

**Determination:** the character art in both Taka sheets is **visually the base Sasuke** (same dark
navy outfit, black hair, same palette/proportions) — NOT a distinct recolor/outfit. So these do
**not** fit the `skins.js` costume-variant pattern (which needs its own idle/art sheets like
`gojo2`/`sukuna3`); they read as **additional move animations** on the base sprite. Both sheets
also contain embedded text labels baked into the art (see notes).

| File | Dims (WxH) | Frames | Cell W | Cell H | Key | Notes |
|---|---|---|---|---|---|---|
| `sasuke_taka_attack_jump_slash.png` | 1026×100 | ~13 | ~79 | 100 | `takaJumpSlash` | auto=21 (sweep-trails/dust over-count; trust your ~13). Base-Sasuke walk → jump → dual-blade slash (blue blade glow) → ending dust/motion-line frames. |
| `sasuke_taka_effect_chidori_trail.png` | 1043×82 | ~? ⚠ | — | 82 | `takaChidoriTrail` | auto=25 (unreliable). ⚠ contains an embedded **"REPEAT"** label in the sheet. Base-Sasuke sword-draw poses + dust/smoke + a **blue Chidori-glow blade trail** on later frames. Frame count needs a visual pass. |

## Remaining basics

| File | Dims (WxH) | Frames | Cell W | Cell H | Key | Notes |
|---|---|---|---|---|---|---|
| `sasuke_sword_attack.png` | 180×71 | 3 | 60 | 71 | `swordAttack` | reliable (auto=3 ✓). **NOT a duplicate** of `swordAttackSmall`/`Large` (batch 3): those have cyan-glow slash ARCS; this is a plain **no-glow horizontal thrust/stab**. A third, simpler sword variant. |
| `sasuke_up_attack.png` | 527×60 | 9 | 58.6 | 60 | `upAttack` | reliable (auto=9 ✓). Upward launcher slash with a white sweep-trail → the up/launcher basic-attack slot every roster char has. |
| `sasuke_throwing_shuriken.png` | 114×56 | 2 | 57 | 56 | `throwingShuriken` | reliable (auto=2 ✓). Character throw pose + a **visible thrown blade shape** on a motion trail. This is the actual throw ANIMATION; pairs with batch-3's `fxShurikenThrow` (`sasuke_shuriken.png`, the standalone trail FX). Together = complete shuriken projectile. |
| `sasuke_win.png` | 313×97 | 5 (mixed) ⚠ | — | 97 | `win` **+ split FX** ⚠ | ⚠ **CONFIRMED mixed content.** Frames 1–2 = a normal standing WIN pose (has a "WIN" text label). Frames 3–5 = a distinct dark swirling **void/portal** FX (space-time / Kamui-style spiral + 2 small spirals) — NOT part of a win pose. **Recommend splitting** `win` (frames 1–2) from a separate portal/void FX key. See OPEN Q17. |

---

## OPEN QUESTIONS (need your input before wiring)

1. **`sasuke_chidori_attack_1.png` vs `_2.png` (RESOLVED — confirm labels).** Both are 6-frame
   stand→point windups. The real difference: **`_1` has a clean arm (no FX); `_2` adds an
   orange spark-crackle on the hand** in its mid/late frames. Neither is a duplicate. Proposed:
   `_1 = chidoriWindupA` (no charge), `_2 = chidoriWindupB` (charged/sparking). **Confirm these
   labels**, or rename by the FX distinction if you prefer.

2. **`sasuke_chidori_effect.png` (561×65) — one strip or several effects?** Confirmed by
   inspection: this is **several SEPARATE effects exported onto one sheet**, NOT one sequential
   animation. Left→right it contains, in distinct color/shape groups:
   - a small **blue star-burst** spark,
   - a larger **star-burst + downward streak/dash** shape,
   - **white spiral / cupped-"hand" smoke** shapes (a few frames),
   - **blue lightning-bolt / crackle** arcs (a few frames).
   These don't morph into each other (different palettes + shapes), so playing them as one
   ~13-frame loop would look incoherent — same situation as the fused rows on the `naruto_kcm_jus`
   sheet. **Recommendation:** slice into ~4 independent sub-effects (spark-burst / streak /
   spiral-hand / lightning-bolts) and assign a key per sub-effect, rather than one `chidoriEffect`
   strip. Tell me how you want them split/named and I can produce exact x-boundaries.

3. **`sasuke_chidiro_regular_attack.png` frame count (8 vs 9).** You stated 8; automated detection
   (every gutter threshold) and my visual recount both read **9** distinct poses (570÷9 ≈ 63.3px
   vs 570÷8 = 71.25px). Please confirm 8 or 9 before wiring — the cell pitch depends on it.

4. **`chidoriBase` vs `chidoriBaseCharged` relationship (you asked me to flag, not assume).**
   They ARE the same technique family, but NOT a straight recolor: `chidoriBase`
   (`sasuke_chidori_attack.png`, 3f) is a compact lunge/jab with a small **white** spark;
   `chidoriBaseCharged` (`sasuke_chidori_attack_3.png`, 4f) is a fuller **extended-arm thrust with
   prominent blue lightning** and one extra frame. Best read: a **distinct charged/stronger
   variant**, likely the "fully charged" or level-2 version — not merely `chidoriBase` re-tinted.
   Your call on whether to treat them as two tiers of one move or two separate moves.

5. **Intro variant — which is "main"?** `chidoriIntroAura` (`sasuke_chidori_intro.png`, 105×77,
   taller cell, wolf/dog-head aura silhouette) is the more elaborate, cinematic intro →
   **recommended as the primary intro**. `chidoriIntroSimple` (`sasuke_chidori_intro_1.png`,
   97×43, crouch + blue flare, no shape) reads as a quick/minor alt. Confirm which you want as the
   canonical Chidori intro (or keep both for different contexts).

6. **Unconfirmed FX frame counts.** `sasuke_chidori_sword_effect_1.png` and `sasuke_amaterasu_hitpng.png`
   have sparse/disconnected FX where automated frame detection is unreliable. I documented your
   descriptive pose counts, but their exact frame boundaries should be visually confirmed at wiring
   time (I can produce per-frame boundary crops on request).

7. **`sasuke_knocked_down.png` — split into `knockedDown` + `getUp`?** Visually confirmed this ONE
   sheet covers two logical actions: the fall/prone phase (impact sparks, tumbling, lying flat,
   ~first 6–7 frames) THEN a full rise-to-stance get-up (~last 4 frames). **Recommendation: split**
   into `knockedDown` (loops/holds while downed) + `getUp` (plays once on recovery) — most engines
   drive those from different states. Confirm the split + the frame boundary (looks to be around
   frame 7, where he goes from lying flat to propping up), or say to keep it as one sequence.

8. **Sword pair light/heavy (RESOLVED by reach/arc — confirm).** `swordAttackSmall`
   (`sasuke_regular_sword_attack.png`) has tighter arcs + compact upright poses; `swordAttackLarge`
   (`sasuke_regular_sword_attack__1.png`) has bigger arcs + a forward lunge with clearly more reach
   + a bigger cell. So visually **Small = light, Large = heavy** — your reading holds. Caveat: art
   alone can't set startup/active timing (that's a gameplay-tuning decision at wiring), but reach
   supports Large-as-heavy. Confirm the assignment.

9. **`sasuke_intro.png` — mixes intro + a wire/weapon action.** Confirmed: NOT just cloak/hair
   physics — there is a distinct white **loop/wire shape near the hand** in the later frames (reads
   as a kunai-on-wire / shuriken-wire manipulation), on top of the cloak-unfurl reveal earlier in
   the sheet. So this sheet appears to fuse an idle intro WITH a combat action. **Recommendation:
   split** into `introMain` (cloak-unfurl → reveal, ~frames 1–6) + a separate wire/weapon move
   (~later frames). Tell me how you want the wire action named/scoped, and I'll produce the frame
   boundary. (Left UNASSIGNED for now, per your instruction.)

10. **`sasuke_Lightning_dragon_Jitsu.png` — two-stage split?** Confirmed the sheet has two visual
    styles: detailed bright dragon-heads (frames 1–3) and darker silhouette dragons (frames 4–7).
    Best read: manifest/charge (1–3) → strike/dissipate (4–7), same two-stage pattern as other FX
    here. Confirm whether to slice it into `fxLightningDragonCharge` + `fxLightningDragonStrike`, or
    play it as one continuous 7-frame animation.

11. **`sasuke_shuriken.png` is FX-only — where's the actual shuriken?** Confirmed this file contains
    ONLY motion-trail lines + sparks, **no throwable shuriken silhouette**. So it can't be a complete
    projectile asset on its own. The real shuriken sprite is probably `sasuke_throwing_shuriken.png`
    (uncovered — see COVERAGE SUMMARY), or the shuriken is simple enough to draw procedurally.
    Confirm the intended source of the actual projectile before wiring a shuriken move.

12. **`sasuke_lighting_rod_attacks.png` is a variant SET, not a loop.** The "rods" are at different
    lengths and angles (horizontal + several diagonals), so this reads as a set of individual
    projectile sprites (pick-one-per-throw), not a sequential animation. Confirm the intended use
    (ranged lightning-spear projectile) and whether it pairs with `sasuke_foword_lighting_attack_1.png`.

13. **Frame-count / filename flags to confirm:** `sasuke_jump_attack.png` (your 6 vs auto 9),
    `sasuke_lose.png` (your 8 vs auto 9), and `sasuke_lighting_attack_1_ repeatable.png` (your 6 vs
    measured+visual **4** pillars). Also: that lightning file's real name has a **space**
    (`..._1_ repeatable.png`), differing from the `1__repeatable` you wrote — reference as-is. And
    the **batch-2 discrepancy**: `sasuke_eyes.png` + an "overlay section from batch 2" were
    referenced, but no batch-2 content exists in this doc — see the overlay table + COVERAGE SUMMARY.

14. **`susanooLvl2` — upgrade stage or same-stage alt loadout?** Visually it reads as the **upgrade**
    (clearly bigger, fuller, more armored, four-horned, on a fire pedestal vs lvl_1's smaller skeletal
    form). BUT the weapon also swaps **flail (lvl_1) → bow (lvl_2)**, so if the design intends
    same-stage weapon loadouts that's technically possible. My read: stage upgrade. Confirm, and
    confirm the intended stage order (`susanooLvl1` → `susanooLvl2`) for the transform tier.

15. **[RESOLVED 2026-07-16] Susanoo grabs — 3 variants, not stages.** Re-measured: `grab.png` =
    6 frames (form → **fully-extended long reach** → grab; the 212/185px-wide cells are the peak
    extension) · `grab_1.png` = 11 frames (a clean frame-by-frame **growth** 16→106px) · `grab_2.png`
    = 8 frames (ribcage-forms → grab, embedded **"AMATERASU ATACK"** mislabel). Each is a self-contained
    form→grab cycle — NOT concatenatable. **DECISION for wiring: `sasuke_susanoo_grab.png` is the
    canonical Susanoo grab** (cleanest, longest reach) used by BOTH Level 1 and Level 2 (Level 2 just
    deals more damage). `grab_1`/`grab_2` are redundant alternate takes (kept, unused). `grab_2`'s
    "AMATERASU ATACK" text is a mislabel (it's a purple ribcage-arm grab, not Amaterasu).

16. **[RECONCILED 2026-07-16 — ⚠ STILL UNRESOLVED, promised file MISSING] `sasuke_susanoo_sword_attack.png`.**
    The task said a new file was added to resolve this pairing. **Verified NO new file exists** — 8
    `sasuke_susanoo_*` files on disk, identical to this doc; `find -newer SASUKE_ASSET_MAP.md *.png`
    returns empty (nothing added since the doc). So the pairing is unchanged: `sword_attack.png` is
    pure yellow/white blade-energy FX (0% purple body), and NEITHER `susanooLvl1` (flail) nor
    `susanooLvl2` (bow) has a sword-swing body pose to layer it on. For Level 2's "heavier sword"
    attack there is no body frame to pair — options: (a) layer the sword FX over the held lvl_2 body
    (best-effort, arms won't match a swing), (b) skip the sword and make Level 2's melee the heavier
    GRAB + the arrow, (c) wait for the intended sword-body sheet. **Flagged back to user; not guessed.**

17. **`sasuke_win.png` — split the portal FX out.** Confirmed the sheet mixes a normal **win pose**
    (frames 1–2) with a distinct dark swirling **void/portal** effect (frames 3–5, reads as a
    Rinnegan/Kamui space-time spiral). Recommend `win` = frames 1–2, and a **separate FX key** for the
    portal (e.g. `fxVoidPortal` — possibly the visual for a space-time teleport/escape move rather than
    a win flourish). Confirm the split + what the portal is meant to be used for.

18. **Taka = moves, not a skin (confirm).** The character art in both `taka_*` sheets is the base
    Sasuke sprite (same palette/proportions), so they don't fit `skins.js` (which needs dedicated
    per-skin art). I've documented them as separate move assets (`takaJumpSlash` + `takaChidoriTrail`).
    Confirm you agree they wire as moves, not a costume variant. (Both sheets also have embedded
    "REPEAT"/label text baked into the art — note for whoever slices them.)

---

## SCOPE NOTE

Progress across batches: **batch 3** added Substitution, the Lightning Dragon FX, the shuriken
throw-FX, and the Hawk Summon; **batch 4** added the full **Susanoo transform tier**, the **Taka**
strips, the **throwing-shuriken** animation, and the remaining basics (`swordAttack`, `upAttack`,
`win`). Still **NOT covered by any batch**: **Fireball / Fire Dragon Jutsu**, **Genjutsu**, and the
**Kirin ultimate** tiers (6 files), plus 8 undocumented odds-and-ends never given a batch — see the
COVERAGE SUMMARY for the exact 15 remaining files (it is NOT zero).

**Do not wire any of this into `abilities.js` / `characters.js` / `transformations.js` until the
tables above are confirmed.**

---

## COVERAGE SUMMARY (as of batch 4 — final upload batch)

**75** `sasuke_*` / `saske_*` files on disk. **60 accounted for** — batch 1 (20), batch 3 (21, incl.
the `sasuke_eyes` overlay cross-ref), batch 4 (14), and 5 already **gameplay-wired in Phase 1/2** but
not in this map (`sasuke_dash`, `sasuke_damage`, `sasuke_foward_attack`, `sasuke_dash_attack`,
`sasuke_down_attack` — plus `saske_stance_2` idle and `sasuke_pfp` portrait, which ARE in the map).

⚠ **15 files still UNCOVERED — this is NOT "zero/near-zero" as hoped.** The Susanoo tier, Taka strips,
and the four named basics (sword/up/throwing-shuriken/win) are now done, but two groups were never
given a batch. Grouped so nothing slips:

**A. Out-of-scope jutsu tiers (never batched — each needs its own future pass):** — 6 files
- Fireball: `sasuke_fire_ball_justu.png`, `sasuke_fireball_justu_effect_1.png`, `sasuke_fireball_justu_effect_2.png`
- Fire Dragon: `sasuke_fire_dragon_justu.png`
- Genjutsu: `sasuke_genjustu.png`
- Kirin ultimate: `sasuke_GOD_OF_THUNDER_KIRIN.png`

**B. ⚠ Undocumented odds-and-ends — in NO batch or scope note (the actionable leftovers):** — 8 files
- `sasuke_foword_sword_attack_1.png`, `sasuke_foword_sword_attack_2.png` (forward sword attacks)
- `sasuke_foword_lighting_attack_1.png` (probable pair for `fxLightningRod` — see OPEN Q12)
- `sasuke_chidori_sword.png`
- `sasuke_chidori:sword.png` — ⚠ **COLON in filename** (unusual — likely a corrupt/near-duplicate of `sasuke_chidori_sword.png`); verify it's a real intended asset, not a filesystem artifact
- `sasuke_chidori_sword_effect_2.png` (companion to batch-1's `fxChidoriSwordTrail` / `_effect_1`)
- `sasuke_intro_2.png`, `sasuke_intro_3.png` (additional intro variants beyond `sasuke_intro`)

**C. Not an image asset:** — 1 file
- `sasuke_taka_transparent.textClipping` (a macOS text-clipping file, not a PNG — ignore/clean up)

**⚠ ACTION NEEDED:** Group A (6) are the Fireball / Fire Dragon / Genjutsu / Kirin tiers — expected,
but they still need mapping batches to reach full coverage. **Group B (8) is the real gap** — these
aren't in any batch's file list or scope note, so decide whether they get a small 5th batch or fold
into existing entries (e.g. the `chidori_sword` / `foword_sword` files likely belong with the sword
kit; `intro_2`/`intro_3` with the intros). Only Group C is safe to ignore.

**Note:** "covered" = appears in any mapping batch in this doc OR was gameplay-wired in Phase 1/2.
