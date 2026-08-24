# "Dark Vegeta" (rosterKey `vegeta_dark`) — STAGE 0 Investigation & Report
### (working title during S0 was "Vegeta Black")

## ★ OWNER DECISIONS LOCKED (2026-08-24, post-Stage-0)
1. **A vs B → (A) STANDALONE** new roster character. Existing blue `vegeta` left untouched.
2. **Name / rosterKey → "Dark Vegeta" / `vegeta_dark`** (matches the DB-Heroes Dark/Villainous
   look the sheet depicts; NOT canon Ultra Ego). Bake `vegeta_dark` into all filenames/ids.
3. **Blade slash-FX → SPECIALS** (alongside the ki-blasts, Stage 4).
4. (Stage 5, still open) transform framing = aura/stat power-up; dark-tendril intro-vs-2nd-stage.

**STATUS: ★★ FULLY COMPLETE S0-S6 (2026-08-24). Canonical `test:vegeta-dark` 51/0.**

## ★ STAGE 6 DONE (2026-08-24, canonical test:vegeta-dark 51/0; regress 10 neighbors all clean)
- **Portrait** = colored-ref bust [12]. **Win** = REAL 5-frame arms-crossed laughing taunt [168-172].
  **Intro** = REAL dark-tendril reveal entrance [173-177] (columns part → reveal; ★owner OPEN: intro vs
  a distinct 2nd transform stage — shipped as intro per S0 read). **Lose** = honest knockdown reuse.
- Canonical `harness/vegeta_dark.test.mjs` — full S1-S6 sweep: gate/stats/portrait/transform-declared,
  25-action fallback-box sweep, light connects, Villain's Rush→launcher, 3 specials dispatch+connect,
  dark-aura enter+×1.35+amplified-blast+auto-revert, win/lose/intro real art. ★rekka canonical needed the
  `!attacking` prep-wait (the shared rekka gotcha) to reach rush3.
- BALANCE_AUDIT.md entry added with the REQUIRED cross-variant comparison: dark-aura ×1.35 sits cleanly
  BETWEEN blue Vegeta's SSJ ×1.20 and Blue ×1.45 — no power discrepancy (blue = 3-rung ladder + ult + 3
  beams; dark = 1 form, lean 3-special kit, NO ult). FAIR, no fix applied. Subagent: win/intro/portrait PASS.
- ★CREDITS still OPEN (not wired): "by akuma animation" + ripper mjdmadgaming → credits.js before ship.
- Regression: vegeta(blue)72/piccolo38/frieza31/goku38/vilgax39/gwen37/gohan30/gotenks47/bardock51/genos28.

Per-stage: test:vegeta-dark-stage1/2/3/4/5 = 21/18/10/22/17. **CHAR FULLY COMPLETE. UNCOMMITTED.**

## ★ POST-BUILD FIX — FACING (2026-08-24) — CORRECTED DIAGNOSIS
- **First attempt was WRONG (recorded honestly):** I initially trusted a subagent read that said idle faced
  correctly, "fixed" only the dive + dash→run, and called it done. The owner confirmed it was STILL broken.
  Lesson: isolated small-sprite facing reads are unreliable; my pixel metrics also conflicted.
- **ACTUAL root cause (confirmed by the reliable method):** rendering vegeta_dark next to **Goku (a known
  right-facer) on the SAME side** — a RELATIVE, same-frame comparison — showed the **WHOLE character faced
  the wrong way**. This sheet's raw frames are already drawn facing RIGHT (the engine's expected default),
  so the original `FLIP_H=True` mirrored the ENTIRE character to face LEFT (backward). Engine flip logic
  (sprite.js) is CORRECT and was NOT touched — this was purely a reslice-flip error.
- **Fix:** `reslice_vegeta_dark.py` **`FLIP_H=True → False`** (re-bake all strips; per-character only, no
  shared/engine code → no other char affected). dash→run kept (owner request; run now faces correctly).
- **Verified BOTH sides against a Goku reference (reliable relative comparison):** P1-left → idle/run/light/
  heavy/up/dive/kicast/win/knife all face RIGHT; P2-right → idle/run/light all face LEFT — all TOWARD the
  opponent. Full suite green (21/18/10/22/17, canonical 51/0); piccolo38 clean.
- **★METHOD LESSON:** to judge sprite facing reliably, render the char beside a KNOWN-correct char on the
  same side and compare relatively — do NOT trust absolute isolated reads or skin/hair pixel heuristics on
  small dark sprites (both gave conflicting/ wrong answers here).

## ★ RUN-ANIMATION FIX (owner 2026-08-24)
- The sheet's "run" band [19-25] is NOT a valid run cycle — subagent audit: only 2 of 7 frames are real
  strides; the rest are duplicate wide stances, a leap, and a crouch → janky, won't loop.
- Per owner ("fix run; if there is none use the dash animation"): **walk/run/dash all now BORROW the DIVE**
  (the sheet's one coherent forward-lunge, `loop:true` → continuous forward charge; also correctly right-facing).
  The janky `vegeta_dark_run_uniform.png` is now UNUSED. jump/fall also use the dive. Suite green (21/0, canonical 51/0).

## ★ FULL CHARACTER AUDIT (owner-requested, 2026-08-24) — canonical test:vegeta-dark 52/0
- **FACING: fully clean.** Verified EVERY action strip (idle/run/light/heavy/up/air/down_air/crouchLight/
  dive/kicast/knife/sickle/aura/rush1/rush2/win + guard/crouch/idleCross) against a Goku reference on both
  sides — ALL face the opponent. No reversed sprites remain.
- **FIXED — crouch:** was reusing the arms-crossed STANDING pose (character didn't duck) → now the real low
  ducked pose (crouchlight art).
- **FIXED — guardHit:** was MISSING (only absent standard action) → added, reuses the hurt flinch.
- **Flagged, NOT bugs (accepted gaps, no sheet art to fix):** down_air reuses air (no downward-dive angle);
  jump/fall reuse the dive (no vertical-jump art); guard = arms-crossed (acceptable block); NO ultimate
  (intentional — the dark-aura transform is the "super", Gohan/Bardock precedent); canonical Vegeta beams
  (Galick Gun/Final Flash) are on the BLUE vegeta, not this sheet — dark uses its own Ki Blast/Knife/Sickle kit.
- ★Still open before ship: CREDITS ("by akuma animation" + ripper mjdmadgaming → credits.js).

## ★ SUPER SAIYAN ROSE — 3rd tier (owner-requested creative addition, 2026-08-24) — test:vegeta-dark-rose 18/0
- ★CREATIVE / NON-CANON (Rose is Goku Black's transform, not Vegeta's — flagged original choice). Owner locked:
  ADD as a 3rd tier (base → dark-aura → ROSE) via PALETTE-SWAP recolor.
- **Art:** `tools/gen_vegeta_dark_rose.py` recolors ALL 18 action sheets → `vegeta_dark_rose_*.png` — dark hair
  → SOFT SALMON-ROSE (colour-matched to goku_black_ssj_rose: ramp #a85854→#f3b3ae, sampled from GB's #ca807e/
  #edaba9), costume/skin kept, aura → pink. Hair isolated by a face-anchored HEAD BAND (hair+costume share
  near-black, split by LOCATION not colour) with skin-halo exclusion (no face bleed). ★Subagent: "good match to
  the GB Rose reference, ship-ready" (2 iterations: first too neon/saturated → re-sampled GB's actual salmon).
- **Mechanic:** abilities.js VEGETA_DARK_ROSE_ANIM (full pink art-swap via `_skinAnim`, Goku Black SSJ Rose
  architecture) + enterVegetaDarkRose/revertVegetaDarkRose. Chains off dark-aura (requiresForm), Ki≥150,
  drain 0.28, ×1.50/1.22/1.10, tap-revert, auto-revert@0, KO/reset revert. Rose also fires the amplified ki
  blast. game.js: 3-tier charge-release ladder + pink "ROSE" aura overlay + hooks. characters.js:
  transformationOrder base→darkAura→rose + transformations.rose.
- **★TASK 2 (general charging):** added `charge` action → the aura-buildup art, so ANY isCharging state (hold P
  to build Ki, not just the transform trigger) shows the real aura; form-aware (pink in Rose via _skinAnim).
  Verified via real hold-P: base→vegeta_dark_aura, Rose→vegeta_dark_rose_aura.
- Regress clean: goku-black-ssjrose14/piccolo38/goku38/vegeta72. Full vegeta_dark suite 21/18/10/22/17/18 +
  canonical 52/0. Clips: vd_rose_final2.png (color vs GB), in-engine vd_rose_live.png.
FOLLOW-UPS (banked): credits.js entry (do before ship), bespoke special/aura FX art (procedural now),
purple ringed-disc HUD [132-135], skins, voice, intro-vs-2nd-stage owner call on the tendril effect.

## ★ STAGE 5 DONE (2026-08-24, test:vegeta-dark-stage5 17/0; regress piccolo38/frieza31/goku38/vegeta72/goku-black-ssjrose14 clean)
- **Dark-Aura transformation "Villainous Mode"** — the DB charge-transform mechanic (Frieza/Vegeta/Goku
  Black/Piccolo), SINGLE tier: hold-CHARGE→release enters at Ki≥100 (NO up-front cost), per-frame drain
  (~12/s), tap-revert, auto-revert at 0. ★NOT an art re-skin (item-1): costume/hair stay; enter plays the
  REAL aura-buildup morph [45-48] + a PROCEDURAL purple aura overlay + "DARK" HUD tag persist while active.
- ★Flips `_darkAuraActive` → AMPLIFIES the Ki Blast to its purple tier (item-2 payoff PROVEN end-to-end:
  transformed blast w92 vs base 48, 106 dmg vs 52 — the form's 1.35 mult compounds with the amped tier).
- Stat buff dmg1.35/spd1.15/def1.05. Wired: abilities.js enterVegetaDark/revertVegetaDark/applyVegetaDark
  FormSystem (+ DARK_AURA_* consts, tickSustainedFormDrain); characters.js transformationOrder+transformations
  .darkAura + vdAura anim; game.js imports + handleChargeRelease branch + form-tick + drawVegetaDarkAuraOverlay
  (purple aura) + p1VegetaDarkEnter/Revert/SetEnergy test hooks.
- Subagent sign-off: transformed state PASS (purple aura + DARK label render); amped blast harness-proven
  (fast projectile → single-frame timing). Clip: `vd_s5_ingame.png`.
- OPEN for S6: dark-tendril effect [173-177] = INTRO (S0 read) vs a distinct 2nd transform stage — owner call.
  Resource UI = the existing Ki bar drain (item-3 purple ringed-disc art [132-135] = bespoke-HUD follow-up).

## ★ STAGE 4 DONE (2026-08-24, test:vegeta-dark-stage4 22/0; regress vilgax39/goku38/piccolo38/vegeta72 clean)
- Fixed-slot special kit (executeVegetaDarkSpecial, mirrors executeVilgaxSpecial), Special button (L) + dir:
  - **N / air = Ki Blast** — procedural sphere, ★TIERED BY TRANSFORM STATE (item 2): base WHITE/blue
    (`#6fc4ff`) / amplified PURPLE (`#9b30c9`, bigger w76 vs 48, piercing, +dmg) when `_darkAuraActive`
    (Stage 5 flips this). Same attack, powered up. Harness proves amp is bigger+costlier+harder (79 vs 52).
  - **F = Knife Slash** — melee disjoint, real straight-slash art [86]. **B = Sickle Throw** — procedural
    red crescent, real curved-throw cast pose [85]. U/D ship unused (owner).
- Ki-cast pose [112-113], knife [86], sickle [85] resliced. Wired: abilities.js VEGETA_DARK_SPECIALS +
  fire*/execute* (+ triggerSpecial case); characters.js specials{} metadata + vdKiCast/vdKnife/vdSickle
  anim; game.js `vegetaDarkSetAura` test hook (toggles the aura flag pre-Stage-5). Damage folds offense, ×0.60.
- ★Subagent visual sign-off: knife (red slash) / sickle (red crescent) / purple blast PASS; white blast
  RE-COLORED `#e6e6ff`→`#6fc4ff` after it vanished on the light stage (now visible blue-cyan). air-blast +
  purple-blast render confirmed across captures (fast spheres → single-frame timing, harness-verified).
  Clip: `vd_s4_ingame.png`.
- NOTE: procedural projectiles (ki sphere / sickle crescent) per project pattern; the sheet's blast art is
  illustrative. Bespoke FX art = banked follow-up.

## ★ STAGE 3 DONE (2026-08-24, test:vegeta-dark-stage3 10/0; regress goku38/piccolo38/vegeta72 clean)
- Command chain **"Villain's Rush"** — Fwd+Heavy 3-stage rekka, cancel-on-HIT, mirrors updateGoku/Piccolo
  CommandCombat. Chain order CONFIRMED via direct subagent frame review (not row position):
  **rush1** deep lunge→two-handed thrust [55-57] → **rush2** rapid flurry [91-93] (mid) → **rush3** rising
  uppercut LAUNCHER. ★rush3 REUSES the clean up-normal uppercut art [69-71] — standalone [94-95] read as
  swing-and-recover (subagent), so the launcher borrows the confirmed-clean up-normal (documented reuse).
- Wired: abilities.js VEGETA_DARK_CMD + fireVegetaDarkCmd + updateVegetaDarkCommandCombat (export);
  game.js import + dispatch (after goku) + __harness.vegetaDarkCmd probe; characters.js rush1/2/3 anim.
  Damage 42/50/84 (matches Goku), cumulative ~101 eff, rush3 launches (vy≈-18). Neutral Heavy stays side-kick.
- Subagent strip sign-off: rush1/rush2 PASS (face right, feet aligned, clean); rush3 = signed-off up art.
  Clips: `vd_s3_ingame` shot (harness/shots/vegeta_dark_stage3_rush3.png).

## ★ STAGE 2 DONE (2026-08-24, test:vegeta-dark-stage2 18/0; regress vegeta72/goku38/bardock51 clean)
- 5 normals + crouchLight, direct-frame-review map: **light**=jab[50-52] / **heavy**=side-kick[80-82]
  long horizontal reach / **up**=uppercut[69-71] LAUNCHER own art / **air**=jump-kick[67-68] /
  **crouchLight**=clean low ducked poke[78] / **down_air** REUSES air (no dedicated down-aerial — FLAG).
  Blade-FX[65,72,85,86] + ki-blasts[96-98] EXCLUDED → Stage-4 specials. Reserved for S3 chain: lunging
  straight[55-58] + rapid flurry[89-95].
- Damage ×0.60 confirmed in-engine: light 45→27, heavy 85→51, up 70→42. crouchLight auto-swaps via
  _setCrouchVariant. Registered: basic_attacks.crouchLight + 6 animationData keys.
- ★Two visual sign-offs via SUBAGENTS (my image-API capped): (1) resliced strips — light/heavy/up/air
  PASS facing-right/feet-aligned, crouchLight RE-PICKED [64]→[78] after [64] showed motion-streak
  artifacts + [79]/[84] carry blade trails; (2) in-engine — light/heavy/up/crouchlight render real
  sprites facing right, air harness-confirmed (airborne, above crop). Clips: `vd_s2_preview.png` +
  `vd_s2_ingame.png`.

## ★ STAGE 1 DONE (2026-08-24, test:vegeta-dark-stage1 21/0; regress bardock51/goku38/piccolo38 clean)
- `tools/reslice_vegeta_dark.py` — green-key `(0,128,0)` slicer, SAME detect-order as stage0 (indices
  line up with the montage), **FLIP_H=True** (sheet faces LEFT → baked right-facing for the engine).
- 7 movement/state strips + portrait resliced (feet-aligned, anchorY 0): idle[0-3] relaxed loop /
  idlecross[4-7] arms-crossed alt / dive[13-16] / run[19-25] 7f crouch-to-run / hurt[28-30] standing
  flinch / knockdown[31-38] / getup[39-44]. Portrait = colored-ref bust (idx 12).
- Registered STANDALONE `vegeta_dark`: characters.js (def + `characters` object), spritesheets.js
  (idle gate), skins.js (default skin — REQUIRED: without it applySkin's fallback `spriteScale:1`
  clobbers the char's 2.1 → half-size sprite), package.json (test script). Blue `vegeta` untouched.
- HP1200/EN200/Atk92/Def86/Spd90, spriteScale 2.1 (idle ≈103px on-screen, DBZ band), energy=Ki.
- ★BORROWS (no dedicated art on sheet, all flagged): walk→run(slower), dash/jump/fall→dive,
  guard/crouch→idlecross. Clips: `vd_s1_preview.png` (every frame) + `vd_s1_ingame.png` (in-engine,
  faces right, real sprite not a box).

Stage-0 artifacts: this document + `tools/vegeta_black_stage0.py` + `vegeta_black_stage0_montage.png`.
Stage-1 artifacts: `tools/reslice_vegeta_dark.py` + `vegeta_dark_*_uniform.png` + registration edits.

## Source sheet
- **File:** `dcxehsy_e41e5990_33a8_46c3_8741_ef27b60e45cc_by_mjdmadgaming_ddk5ebw.png`
- **Size:** 1852×2421, RGB, **fully opaque** (alpha unused).
- **Background:** solid GREEN key `(0,128,0)`. Keys cleanly — the costume is black/red/white,
  none of which collides with green. (Reslice will use `g∈[80,180] & r<70 & b<70 & g>r+40 & g>b+40`.)
- **Layout:** 185 detected content islands across 23 rows (see montage). Sprites drawn directly
  on the green field (no box outlines), staggered — use RAW connected-components + tiny (3px)
  dilation, size-filter ≥500px. Same family of tool as Frieza/Piccolo green-key sheets.

## Credit (resolves Stage-0 item 7 sub-question)
- **In-sheet text reads "by akuma animation"** (montage idx 9–11) — CONFIRMS the prompt's stated
  credit. Same animator credited on Aoi Todo / Naoya sheets in this project.
- **Filename** `..._by_mjdmadgaming_..._ddk5ebw` = the DeviantArt uploader/ripper (id `ddk5ebw`),
  a separate person from the animator. Carry BOTH forward: **"Sprite by akuma animation; sheet
  ripped/edited & uploaded by mjdmadgaming (DeviantArt)."** Not a ship BLOCKER (unlike chars
  where the ripper was unknown), but confirm before credits screen.

## Costume / identity
Colored full-body reference (idx 12) + settled poses: **black bodysuit, grey/black chest armor
plate with a RED emblem/vents, white gloves, white boots with red toes, black spiky (classic
Vegeta) hair, confident smirk.** This is NOT the standard blue/white Saiyan armor of the existing
`vegeta` roster entry.

⚠️ **Identity caveat (feeds item 7):** the black armor + red chest + a DARK/red-glint corruption
aura + **UNCHANGED dark hair** in the powered-up frames reads far more like **Dragon Ball Heroes
"Villainous Mode / Dark Vegeta"** than canonical **Ultra Ego** — canon Ultra Ego Vegeta has
distinctive navy/grey spiky hair and purple gi, neither of which appears here. The purple in this
sheet is confined to FX (aura rim, ki-blast, UI), not the character. Treat "Vegeta Black" AND
"Ultra Ego" as unverified labels. **Do not bake either into filenames/rosterKey/UI yet.**

---

## Stage-0 item-by-item findings

### Item 1 — "Ultra-Ego-style transformation" → REAL power-up sequence, with a correction
- **Aura buildup (idx 45–48):** black radiating spike-aura + a **purple body-rim glow**, ~4 frames
  escalating (speed-lines intensify). This is the transformation charge tell.
- **Purple ki-gauge UI disc (idx 132–135):** character rendered INSIDE a purple ringed disc that
  fills/empties — a real resource-meter graphic (see item 3).
- **Purple charge-and-blast (idx 96–98 and 115–119):** orb → sphere/spiky-burst → fired beam.
- ★ **CORRECTION to the prompt's "settled costume state with purple trim replacing default
  accents":** NOT supported. The powered/settled poses (idx 143–153) **keep the RED costume
  accents and the DARK hair unchanged.** Purple appears only in the AURA RIM, the ki-blast, and
  the UI — never as costume trim or hair. So the "transformation" here is a **power-up AURA state**
  (buff), NOT a costume/hair remodel. Whoever read "purple trim" likely saw the purple aura-rim
  bleeding over the body outline. Build the transform as an aura/stat power-up, not a re-skin.

### Item 2 — white/grey blast = normal-form of the same attack → CONFIRMED
- **White/grey ki-blast:** small orb → lens/eye tiers (idx 154), then full sphere + three
  ring-burst tiers (idx 155–166). Structurally identical staging to the purple version.
- **Reading confirmed:** white = normal-form, purple = amplified/transformed counterpart of the
  SAME attack. Build them as one attack with a normal vs amplified visual/damage tier — do NOT
  build them as two unrelated specials.

### Item 3 — designed resource-meter art → CONFIRMED
- Purple ringed ki-gauge discs (idx 132–135, character-in-disc) + glyph row: arrow/triangle
  (idx 138, 139), vertical segmented capsule (idx 140), horizontal segmented bar (idx 141),
  cancel/other shape (idx 142). Intentional UI kit — use these to skin the transform resource
  meter rather than a generic bar, IF/when the transform is wired (Stage 5).

### Item 4 — dark tendril/corruption effect → CONFIRMED DISTINCT (color verified)
- **idx 173–177:** tall **dark GREEN/BLACK wavy vertical columns with small RED glint points**;
  the columns part to reveal Vegeta standing inside (idx 176–177).
- ★ **Color is DEFINITIVELY different** from the purple transformation aura (idx 45–48). This is a
  separate effect. Its "columns opening to reveal the character" staging reads as a **dramatic
  ENTRANCE / reveal → strong INTRO candidate** (or a distinct darker "corruption/rage" precursor).
  It is NOT part of the purple power-up sequence. Keep them separate.

### Item 5 — bladed moves → present, but they read as SLASH-FX, not a held weapon
- Straight white slash (idx 65), curved RED crescent slash (idx 85–86), curved sickle-like arc
  (idx 72). These are **energy slash-TRAILS on melee swings**, distinct from each other and from
  the punch/kick combos. No frame shows a physically-held knife or a thrown sickle *projectile
  sprite* — they're swing FX. **Normal-vs-special tier = owner decision** (item stays OPEN).

### Item 6 — duplicate idle / arms-crossed poses → RESOLVED (distinct roles)
- **idx 0–3:** relaxed standing idle (recommended PRIMARY loop).
- **idx 4–7:** static arms-crossed (alt idle / neutral taunt stance).
- **idx 168–172:** arms-crossed with a **laughing/shouting animation** (mouth opens progressively)
  → a victory TAUNT, NOT a resting loop. Distinct from idx 4–7.
- Conclusion: these are **different states, not duplicates.** idx 168–172 is a strong WIN-pose.

### Item 7 — naming → UNCONFIRMED (see Costume/identity caveat above)
Working title only. Recommend a neutral placeholder rosterKey pending owner naming; the identity
evidence leans "Dragon Ball Heroes Dark/Villainous Vegeta," not canon Ultra Ego.

### Win / lose / intro (Stage-6 open item) → candidates now exist
- **INTRO candidate:** dark tendril reveal (idx 173–177).
- **WIN candidate:** arms-crossed laughing taunt (idx 168–172).
- **LOSE:** reuse knockdown sprawl (idx 28–44), as other roster chars do.
- No explicit "victory banner" frame; the above are the real candidates. Partially resolved.

---

## Full content map (185 islands, montage indices)
| Idx | Content |
|---|---|
| 0–3 | Relaxed idle (primary loop candidate) |
| 4–7 | Arms-crossed idle / stance (alt) |
| 8, 13–19 | Dive / lunge (flying-forward, ~5f) |
| 9–11 | Credit text "by akuma animation" (EXCLUDE) |
| 12 | Colored full-body reference → PORTRAIT source |
| 20–25 | Run (crouch→run cycle) |
| 26–27 | Hit reaction (crouched flinch) |
| 28–44 | Knockdown → sprawl → face-down/twisted → getup (lose candidate) |
| 45–48 | ★ Transformation aura buildup (black spikes + purple rim) |
| 49–95 | Normals: jab/straight combos, kicks, spinning, jump-kicks |
| 65, 72, 85–86 | Blade slash-FX (white straight / sickle arc / red crescent) |
| 96–98 | Purple ki-blast (orb→sphere→beam) |
| 99–114 | Cast/charge poses + more normals |
| 115–119 | Purple tiered charge-blast (orb→spiky burst→bigger→beam) |
| 120–131 | Movement/dash-attack poses |
| 132–135 | ★ Purple ringed ki-gauge UI disc (character inside) |
| 136–142 | UI glyph icons (arrows, segmented capsule/bar, cancel) |
| 143–153 | Powered/cast poses (RED accents kept; idx 146–147 = dark-aura charge) |
| 154 | White/grey ki-blast orb→lens tiers |
| 155–166 | White/grey sphere + ring-burst tiers |
| 168–172 | ★ Arms-crossed laughing taunt → WIN candidate |
| 173–177 | ★ Dark green/black tendril columns w/ red glints → INTRO candidate |
| 178–184 | Misc powered poses / stances |

---

## TOP-LEVEL STRUCTURAL QUESTION (A vs B) — evidence + recommendation

Prompt's pivotal gate: is this **(A)** a new standalone roster character, or **(B)** extra art to
extend the EXISTING `vegeta` with an Ultra-Ego tier?

**Existing `vegeta` (characters.js:128–237):** blue/white Saiyan armor; SSJ + SSJ-Blue transforms
IMPERATIVELY wired in abilities.js (`enterVegetaSSJ`/`enterVegetaBlue`, Frieza/Goku-Black-aligned
charge-transform). Its `transformationOrder` DECLARES `ultraEgo` (characters.js:154, 171) but that
entry is a **bare stat stub** — no `skinAnim`, no sheet, NOT wired into the imperative form system.

**Evidence this new sheet is (A) standalone:**
1. It is a **complete self-contained kit** — idle×2, run, dive, knockdown/getup, full normals +
   kicks + command strings, 2 blade-FX, TWO full ki-blast systems, transformation aura, a UI meter,
   AND its own colored portrait. Extending an existing character with a transform tier needs only
   the *transformed-state* art — you would NOT need a whole base movement/normals/knockdown kit.
   The presence of a full base kit ⇒ standalone character.
2. **Costume is entirely different** (black armor) from blue Vegeta. A form-swap on the existing
   Vegeta would read as a different character, and the existing forms are all blue-family recolors.
3. The existing `ultraEgo` is a **stat stub with no art hooks**; wiring this art into it would mean
   touching the working SSJ/Blue imperative system — the exact "don't disturb what works" risk (B)
   warns about.
4. Matches this project's established **multi-variant independent-roster pattern** (Ghostface /
   Superman / Iron Man each have separate roster entries rather than form-extensions).

**RECOMMENDATION: (A) — build as a NEW standalone roster character** with its OWN internal
`base → dark-aura amplified` transformation, reusing the project's existing Frieza/Goku-Black
charge-transform architecture (threshold-gated, per-frame Ki drain, revert-on-empty). Leave the
existing `vegeta` entry completely untouched. This is a recommendation — the A/B call is the
owner's and gates Stage 5.

---

## DECISIONS NEEDED FROM OWNER before Stage 1 (all block later stages)
1. **A vs B** — confirm standalone (recommended) vs extend existing `vegeta`.
2. **Name / rosterKey** — "Vegeta Black" is unverified and likely inaccurate (leans DB Heroes
   Dark/Villainous Vegeta, not Ultra Ego). Pick a rosterKey before it's baked into ~50 filenames.
3. **Blade-FX tier** — normal(s) vs special(s) for the slash moves (item 5).
4. (Later, Stage 5) **Transform framing** — confirm the aura state is a stat/aura buff (per the
   item-1 correction), and whether the dark-tendril effect is INTRO vs a second transform stage.

## Stage plan (unchanged from prompt; each gated by a STOP + clip)
- S1 registration + movement (idle×2, dive, run, hit, knockdown/getup).
- S2 normals; S3 command chains; S4 specials (blades + both ki-blast tiers).
- S5 transformation (gated on A/B) — aura power-up, purple UI meter from item-3 glyphs.
- S6 portrait (idx 12) / win (168–172) / intro (173–177) / lose (knockdown) / harness / balance.
