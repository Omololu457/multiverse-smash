# Genos — Asset Map (STAGE 0 investigation)

rosterKey **`genos`** · universe **one_punch_man** (2nd OPM char, sibling to [`saitama`]) ·
source sheet: **`ddk5eh3-5cfadb89-4c66-4fc4-b56f-bcb3d538c4f8.png`** (DeviantArt file id;
copy in repo root + `/Users/omololu/Downloads/genos /`).
★ ATTRIBUTION UNKNOWN — DeviantArt artist not yet identified. **credits.js entry BLOCKED**
until owner confirms the source author (Saitama sheet was `arzeer`; this may be a different rip).

Sheet geometry (measured, not eyeballed): **884 × 2228 RGB**. Background = **teal `#008080`**
(83% of pixels, keys out with `abs(px-teal).sum < 40`, no antialias residue). Grid/dividers =
**pure green `#00FF00`** (documentation lines only — NOT character content; corners are green).
**24 green divider rows → 23 content bands.** Frame counts below = teal-gap column segmentation
(minpx≥3, merge-gap 4, debris <4px dropped), NOT guesses.

## Band geometry table (measured)

| Band | y-range | h | frames (real / debris) | frame widths (px) | contentH |
|---|---|---|---|---|---|
| 1 | 1–73 | 73 | 20 / 0 | 25..58 (idle5, taunt5, walk6, dash2, +) | 69 |
| 2 | 75–198 | 124 | 15 / 0 | run7 + jump3 + **2 FX props** | 89 |
| 3 | 200–273 | 74 | 13 / 6 | hit→knockdown→getup→stand | 69 |
| 4 | 275–346 | 72 | 14 / 0 | punch string + 3 ring frames | 69 |
| 5 | 348–419 | 72 | 14 / 0 | spin + yellow ring → launcher | 69 |
| 6 | 421–496 | 76 | 10 / 1 | up to 115 — **charge blast (small, thin beam)** | 64 |
| 7 | 498–569 | 72 | 13 / 0 | punch → diagonal streak-burst (rapid) | 69 |
| 8 | 571–642 | 72 | 13 / 0 | dash-punch + **guard** + **counter-burst pose** | 63 |
| 9 | 644–715 | 72 | 11 / 0 | jet-dash straight-arm thrust | 62 |
| 10 | 717–807 | 91 | 10 / 0 | **white-streak rush** (no yellow) + standing | 69 |
| 11 | 809–894 | 86 | 7 / 0 | jet-dash straight-punch (dup of family) | 68 |
| 12 | 896–974 | 79 | 6 / 0 | up to 150 — **charge blast (big round burst)** | 63 |
| 13 | 976–1112 | 137 | 11 / 0 | **flame-aura / overheat power-surge** | 125 |
| 14 | 1114–1184 | 71 | 7 / 0 | jet-dash thrust (DUP of band 9) | 62 |
| 15 | 1186–1257 | 72 | 9 / 1 | charge blast (small — ≈ band 6) | 60 |
| 16 | 1259–1347 | 89 | 7 / 0 | **yellow machine-gun jet-punch spread** | 80 |
| 17 | 1349–1426 | 78 | 5 / 0 | up to 150 — charge blast (big — ≈ band 12) | 63 |
| 18 | 1428–1509 | 82 | 11 / 0 | dash w/ **cyan afterimage flash** → yellow strike | 65 |
| 19 | 1511–1627 | 117 | 10 / 0 | yellow spread (≈ band 16) + aerial knee frames | 89 |
| 20 | 1629–1891 | **263** | 13 / 0 | up to 126 — **GIANT flame column** + standing tail | 250 |
| 21 | 1893–1999 | 107 | 13 / 0 | holds gold note-objects (gag?) | 69 |
| 22 | 2001–2088 | 88 | 5 / 0 | holds gold note-objects → thrust (gag?) | 69 |
| 23 | 2090–2226 | 137 | 9 / 0 | flame frames + **Saitama speech-bubble portrait** | 119 |

## STAGE 0 findings — every open item RESOLVED by direct side-by-side (genos_work/*.png)

1. **Charge-blast: TIERS + DUPLICATES, not 5 specials.** Side-by-side proves:
   - band **6 ≈ band 15** (small, thin forward beam) — near-dup pair → SMALL tier.
   - band **12 ≈ band 17** (big round fireball burst then shove, both 150–151px) — near-dup
     pair → MID tier.
   - band **20** = unique GIANT vertical flame column (263px, largest on sheet) + a tail of
     ~7 small standing/recovery frames → MAX tier.
   → **ONE special "Incineration Cannon" with 3 hold-tiers** using 6→12→20 as the
     representative frames; **dedup bands 15 & 17.** (This is Genos's canonical signature.)
2. **Flurry ×3: one dup-pair + one distinct.** band **16 ≈ band 19** (yellow machine-gun
   jet-punch fan) — dup pair; band 19 appends real **aerial knee-up frames** (usable for an
   air version). band **10** = a *distinct* white-streak rush (no yellow FX) → either its own
   move or folds into the dash-rush family. → build the yellow spread once (band 16 canon,
   band 19 → air variant).
3. **"Blade/drill" ×2 = misread.** bands **9 & 14** are a **jet-dash straight-arm thrust**
   (14 is a shorter dup of 9), NOT a drill/blade. Same motif also in band 8-left and band 11.
   The whole **dash-punch family (8L / 9 / 11 / 14) is heavily redundant** → pick 1–2.
4. **Blue frames (band 18) = intentional afterimage, not palette error.** A forward dash whose
   middle 2 frames render full **cyan** (boost/afterimage flash), ending in a yellow-fist
   strike. Real move: **afterimage blitz dash-attack.**
5. **Detachable-limb FX (band 2 far-right) = 2 real FX props** (a tan wire/ribbon shape + a
   dark curved disc) but **NO accompanying throwing pose** — can't build a full move from them
   confidently. Options: exclude, or repurpose as VFX on another special. → **owner decision.**
6. **Held-object (bands 21–22) + speech-bubble (band 23) = a JOKE/reference gag.** Genos
   presenting small gold "note" objects, thematically tied to band 23's **Saitama portrait
   bubble** ("重要な教え" = *important teaching/lesson*). → **exclude bands 21–23 from the combat
   atlas** (same treatment as other joke/credit inserts in this project). The Saitama bubble is
   definitely non-gameplay.
7. **Band 23 speech-bubble** = large 128px Saitama bald-head portrait w/ JP text → EXCLUDE.
8. **Debris**: bands 3 (6 frags), 6/15 (1 each) contain <4px antialias fragments → dropped by
   the segmenter, excluded from the atlas.
9. **Band 4's 3 trailing rings** = yellow ring/impact frames (not combat frames) → exclude
   from the punch-string clip.
10. **Flame-aura (band 13) = real "overheat power-surge"** — rises with leg-flame, tall flame
    column erupts, engulfed/stagger, recovers upright. Canonical Genos overheating trait →
    strong **Overdrive-ult** candidate (see Stage 5).

## Portrait / win / lose — partial art EXISTS (revises prompt's "none")
- **Portrait**: band 1 idle bust, or band 20's fist-raised tail frame.
- **Win-pose candidate**: band 20's standing tail ends **fist-raised** (~7 frames) — usable.
- **Taunt**: band 1 beckoning gesture (real).
- **Lose/intro**: none identified. Knockdown (band 3) can seed a lose pose (flagged reuse).

## Kit shape implied (draft, pending owner decisions)
Movement (b1/b2/b3) · 5 normals (b4 punch string, b5 launcher, b7 rapid finisher, b8 dash-punch,
guard b8) · command chains (b5 spin launcher, b7 rapid burst) · specials: **Incineration Cannon**
(3-tier charge, b6/12/20) · **Machine Gun Blows** (b16 spread, b19 air) · **Jet Dash** attack
(b9/11/14) · **Afterimage Dash** (b18) · optional detach-limb VFX (b2) · ULT = Incinerate max
(b20) **or** Overdrive mode (b13). Energy type candidate: **"core"** (Genos's power core).

## OWNER DECISIONS — LOCKED (2026-08-22)
1. **ULTIMATE = Overdrive mode (Option B).** Band 13 flame-aura → timed power-up state
   (bigger blasts / faster flurries) with a REAL drawback (self-damage or vulnerability on
   expiry), reusing the Susanoo-Lv2 / Zaraki-Shikai cost pattern.
2. **Incineration Cannon = 3 hold-tiers** (tap b6 → hold b12 → full-charge b20). **Dedup
   bands 15 & 17.**
3. **Detachable-limb FX (band 2 props) = EXCLUDE** (no throwing pose → any move would be
   fabricated).
4. **Joke bands 21–23 = EXCLUDE** from the combat atlas (non-combat reference gag).

★ STAGE 0 COMPLETE. Decisions locked → Stage 1 unblocked (credits.js line still BLOCKED
pending source-artist attribution).

## STAGE 1 — registration + movement/state  ✅ (test:genos-stage1 18/0)
NEW tools/reslice_genos.py (single-sheet: key teal+green→transparent, crop measured band, col-segment
SAME as Stage-0 analysis so pick-indices match numbered_b*.png, per-frame bbox → feet-aligned uniform,
anchorY 0). Registered genos in characters.js (+`genos` in the characters object), spritesheets.js,
skins.js (Default), credits.js (★placeholder), ui.js energyType "core"="Core". Stats HP1080/EN200/atk92/
def78/spd96 (glass rushdown/zoner — Def below average), spriteScale 1.5 → idle body 104px (measureSprite).
10 anims: idle[b1:6-9]/taunt[b1:0-5]/walk[b1:10-17]/dash[b1:18-19]/run[b2:0-9]/jump[b2:10-12]/fall(held
last jump)/hurt[b3:0-2]/knockdown[b3:3-6]/getup[b3:8-12]. FX props b2:13-14 excluded; b3:7 debris auto-
dropped. No intro art (introPool idle). Clips: genos_work/clips_stage1.png.

## STAGE 2 — normals + guard  ✅ (test:genos-stage2 16/0)
Sheet is punch/blast-only (zero upward/kick/aerial art) → honest reuse. light[b4:0-2] jab / heavy[b4:0-5]
palm-cannon (short disjoint fire) / air[b8:0-3] jet-dash punch / **up REUSES heavy** (launcher-typed) /
**down_air REUSES air** / guard[b8:5-6] crossed-arms (fills S1 gap). basic_attacks: L44/H82/up62/air54/
dA60 (raw; ×0.60 verified in-harness → 26/49/37). b4:11-13 ring projectiles RESERVED for a Stage-4
projectile; b8:7 counter-burst pose = guard-break/parry VISUAL (no counter-hit follow-through art) →
RESERVED for a possible Stage-4 parry special, NOT a normal. Clips: genos_work/clips_stage2.png.

## STAGE 3 — command chain  ✅ (test:genos-stage3 11/0)
Fwd+Heavy 3-stage RUSH rekka (cancel-on-hit, shared rekkaContinue; mirrors updateAoiTodoCommandCombat +
Saitama's multi-hit re-latch). NEW GENOS_CMD + fireGenosCmd + updateGenosCommandCombat (abilities.js);
game.js import + dispatch + genosCmd harness probe. genosRush1[b7:1-5] punch opener → genosRush2[b7:6-12]
rapid streak-burst (MULTI-HIT: _genosRushActive re-arms hasHit every GENOS_RUSH_REHIT=3 active frames →
verified 3 hits) → genosRush3[b5:1-8] spinning charge LAUNCHER (verified P2 vy=-23). Data L44/rush2 30×N/
L92; full confirmed chain ~179 cumulative (★balance watch-item for S6 — high, but requires landing all 3
cancel-on-hit stages = real execution). Neutral Heavy stays palm-cannon (chain gated behind Fwd+Heavy).
Regression: test:saitama-stage2 25/0 (shared dispatch clean). Clips: genos_work/clips_stage3.png.

## STAGE 4 — specials  ✅ (test:genos-stage4 29/0)
NEW in abilities.js: GENOS_INCINERATION (tier table) + fireGenosIncineration + GENOS_SPECIALS +
fireGenosMachineGun/JetDash/Afterimage + executeGenosSpecial; MG multi-hit re-latch added to
updateGenosCommandCombat. game.js: imports, `case "genos"` in executeSpecialMove dispatch, neutral-special
ARMING branch (_genosCannonArmed, mirrors Saitama), handleGenosSpecialDown/Release (3-tier by hold: <180ms
tier1 / <450ms tier2 / ≥450ms tier3) + registration, genosIncinerate(tier) harness hook. characters.js:
6 special anims + specials stub.
- **Incineration Cannon** (NEUTRAL tap/hold 3-tier): cast poses genosIncinerate1/2/3 [b6/b12/b20] +
  PROCEDURAL scaled fireball (ui fallback orb, color #ffb020). tier1 cost25→w40→36eff / tier2 cost40→w64→
  57eff / tier3 cost70→w100(GIANT column pose)→84eff. Verified poses+proj-scale+cost+connect.
- **Machine Gun Blows** (Fwd/U/Air): genosMachinegun [b16] rehit multi-hit (GENOS_MG_REHIT=3), dmg12/hit →
  ~36 total over 6 ticks, cost35. Air = airborne neutral.
- **Jet Dash** (Down): genosJetdash [b9] lunges forward (Δx42) + connects, cost25.
- **Afterimage Dash** (Back): genosAfterimage [b18] i-frames (invulnTimer) + strike, cost30.
RESERVED still deferred: parry (b8:7 counter pose), ring projectile (b4:11-13 — Incineration uses procedural).
Regression: saitama-stage2 25/0, deathstroke-stage4 18/0 (shared arming+dispatch clean). Clips:
genos_work/clips_stage4.png. ★S6 balance watch: MG multi-hit total + tier-3 cost/reward.

## STAGE 5 — Overdrive ULTIMATE  ✅ (test:genos-stage5 18/0)
Owner decision B = timed power-up MODE (Kurapika Emperor-Time / Baki Demon-Back architecture; NOT a freeze
cinematic). NEW abilities.js: GENOS_OVERDRIVE + enter/revert/update/isGenosOverdrive + executeGenosUltimate;
triggerUltimate `case "genos"`. combat.js: `_genosOverheatVuln` ×1.30 damage-taken amp (parallel to Emperor's
_emperorRevertVuln). game.js: imports, updateGenosOverdrive tick in updateMiscTimers, revertGenosOverdrive in
all 3 round-reset cleanup lines, NEW drawGenosOverdriveOverlay (rising flame aura + OVERDRIVE duration HUD) +
draw-dispatch call, harness state (genosOverdrive/Timer/Vuln + damageMult/speedMult) + p1GenosOverdriveExpire.
characters.js: ultimate stub + genosOverdrive ignite anim [b13:0-5 flame column].
- ENTER (100 Core): _genosOverdriveActive + 420f (~7s) timer + dmg/atk ×1.35 + speed ×1.15 + ignite cast pose.
- BUFF: melee auto-scales via combat offenseMult; ★Incineration PROJECTILE pre-scales damage+size by offense
  at spawn (fixed spawn-dmg wouldn't otherwise buff) → blast 57→78 verified.
- DRAWBACK on EXPIRY only (flagged _genosOverdriveExpire; KO/reset pay none): 8% self-dmg (1080→994 verified)
  + ~2s overheat vuln (×1.30 dmg taken, verified window opens+counts down) + 20f recovery beat.
Regression: genos s1-4 (18/16/11/29), kurapika-s5 13/0, zaraki-shikai 10/0 — shared timer/dispatch/combat
clean. NO unique ult body art (ignite reuses b13 flame pose — flagged, honest). Clips genos_work/clips_stage5.png.

## STAGE 6 — portrait/win/lose + canonical harness + balance  ✅ = FULL 6-STAGE BUILD COMPLETE (test:genos 28/0)
WIN = REAL art (b20 fist-raised tail [8-12]) → genos_win_uniform. LOSE = REUSE knockdown sheet (no dedicated
lose art — flagged). Auto-wired via animationData win/lose (game.js match-end _forceAction). Portrait stays
idle bust (acceptable; could upgrade). NEW harness/genos.test.mjs canonical (S1 gate/stats/9 movement · S2
normals connect · S3 rush chain opens · S4 all specials incl 3-tier Incineration fireball · S5 Overdrive
enter+expiry drawback · S6 win/lose wiring · 28-action fallback-box sweep · no JS errors). NEW BALANCE_AUDIT.md
entry (FAIR glass jet-rushdown/zoner; HP1080/Def78 among frailest, no stat record, honest ×0.60; 3 watch-items:
rush ~179 free-confirm / MG multi-hit / Overdrive window — drawback is the counterweight). ★genos.test.mjs
GOTCHA: prep() MUST wait `!attacking && !currentMove` or a stale _cmdPrevHeavy latch eats the rush-chain edge.
Regression sweep CLEAN: genos 28/0 + saitama 33/0 + deathstroke 30/0 + brainiac 30/0 + kurapika 25/0 + yuta
30/0 + zaraki-shikai 10/0 + aoi-todo-stage3 15/0 (shared command-combat/dispatch/updateMiscTimers/combat all
clean). zaraki 81/1 = PRE-EXISTING 404 resource (unrelated to genos). **CHAR BUILD COMPLETE.**

## POST-BUILD — scale fix + SKINS

**SCALE FIX (owner feedback "too small"):** spriteScale 1.5 → **1.62** → idle body **104px → 111px** (ties
naruto/gojo/handler, the roster "full-size human" mark). Not clipped. Harness assertions updated (stage1 +
canonical). test:genos-stage1 18/0, test:genos 28/0.

**SKINS DONE (test:genos-skins 16/0):** Default + 8 recolors + Void Sovereign + Exposed Core = **11 skins**
via NEW tools/gen_genos_creative.py (mask-from-original multi-pass). FOUR regions from measured histogram:
SHIRT(black)/ARMS(silver-grey)/PANTS(navy)/HAIR(blond).
- ★HEALTH-CHECK finding: the black shirt bulk sits at pure-black V≈0 = SAME as the outline + eye-sclera (not
  cleanly separable). **OWNER DECISION: "aggressively recolor the whole black shirt"** → the SHIRT pass targets
  all dark-neutral (max_sat 0.22, max_val 0.42), so the outline+eyes take the shirt colour too (accepted).
- ★FX PROTECTION: yellow blast-FX (hair-hue) + white beam-FX (silver-arm-neutral) collide with recolor regions
  → protected by HAIR max_sat 0.60 + ARMS max_val 0.92. **Verified 0.0% FX px changed** on incinerate/machinegun.
- Groups: G1 Crimson Chassis/Verdant Circuit/Golden Alloy/Obsidian Frame · G2 Azure Cybernetic/Violet Prototype/
  Ember Unit/Frostbound Chassis (each = shirt+arms+pants[+hair] recolor; Golden/Obsidian keep black shirt).
- Void Sovereign = whole-form near-black incl. SKIN + NEW game.js drawGenosVoidAuraOverlay (CYBERNETIC circuit/
  data-line field + glowing yellow eyes, seeded-stable). Exposed Core = near-default copies + NEW game.js
  drawGenosExposedCoreOverlay (glowing #FFE070 chest energy-core homage — the "small new masked region", done
  as a procedural overlay not a baked recolor).
- Numeric region-color verification PASSED (every region shifted to target: crimson shirt (139,42,45), golden
  hair (202,152,58), etc.). ★VISUAL PIXEL SIGN-OFF PENDING — image QA hard-capped this session (green-lantern-
  skins precedent); programmatic verification only. 250 PNGs generated. skins.js append-only.

## FOLLOW-UPS (not started)
- ★ credits.js ATTRIBUTION (BLOCKED — DeviantArt artist unknown; MANDATORY before ship).
- SKINS visual pixel sign-off (image-cap; fresh session). Voice (BLOCKED — no clips). Portrait upgrade. Intro art.
