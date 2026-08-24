# KAKASHI HATAKE — Asset Map & Stage 0 Report

**Source:** `DS _ DSi - Naruto Shippuden_ Ninja Council 4 - Playable Characters - Kakashi.png`
**Sheet:** 1054 × 5236, RGB, green-screen background `(0,128,0)` (chroma key; keep a tight
tolerance — no green on this character to protect).
**Credit (on-sheet, confirmed):** "Ripped by **Neimad**", "Presented by the **DS Ripping Forum**",
"Give credit if used / Don't claim as own". → credits.js attribution = Neimad (DS Ripping Forum).
**Single file, single form, no transformation states.** Mangekyou Sharingan is an *activated
mode/stance*, not a form-swap.

Every on-sheet label was checked against its actual pixel content by direct visual pass (7
full-width sections @ full res). All labels matched their content. **No content was fabricated
anywhere** — this is the cleanest self-labeled sheet catalogued in the project.

---

## Inventory (top → bottom, as laid out on the sheet)

| # | Label (on-sheet) | Content (verified) | Frames | Facing |
|---|---|---|---|---|
| — | MUGSHOTS | small face + framed bust + octagon icon + masked bust + tiny icon; large busts (full-body render + face close-ups) | — | — |
| 1 | STANCE | idle loop | 6 | R + L |
| 2 | WALK | genuine alternating-leg slow cycle (distinct from Run) | 6 | R + L |
| 3 | RUN | forward-leaning sprint (distinct from Walk) | 6 | R + L |
| 4 | CROUCH | static low pose | 2 | R + L |
| 5 | CROUCH WALK | alternating low stride | 6 | R + L |
| 6 | JUMP | full arc | 5 | R + L |
| 7 | WALL JUMP | horizontal push-off | 4 | R + L |
| 8 | TELEPORT | crouch-vanish pose + black smoke-streak FX (real mobility tool) | — | R + L |
| 9 | DAMAGE | flinch → fall → lying → rise | 5 | R + L |
| 10 | FAST GET UP | quick recovery roll (distinct faster option) | 4 | R + L |
| 11 | Y COMBO | kunai draw-slash → multi-hit punch chain → glowing orange-streaked kick (2 segments) | long | R + L |
| 12 | Y + UP ATTACK | rising overhead kick | 5 | R + L |
| 13 | Y + RUN ATTACK | sliding kunai slash | — | R + L |
| 14 | Y + JUMP ATTACK | diving strike w/ orange trail | — | R + L |
| 15 | Y + CROUCH ATTACK | low sliding kunai strike | 5 | R + L |
| 16 | WEAPON THROW | kunai throw + orange spinning-slash FX | — | R + L |
| 17 | WEAPON THROW (CROUCH) | crouched throw variant (distinct) | — | R + L |
| 18 | WEAPON THROW (AIR) | airborne throw variant (distinct) | — | R + L |
| 19 | SPECIAL MOVE (KUCHIYOSE NO JUTSU: PAKKUN) | seals/slam → Pakkun appears → ~12f bite → **"PRESSING BUTTON"** held/extended variant → summon-out spark | many | R + L |
| 20 | SPECIAL ATTACK 1 (KUCHIYOSE NO JUTSU: NIN-DOGS) | cutscene title card (close-up + kanji **土遁・追牙の術** = *Doton: Tsuiga no Jutsu*, canon fanged-pursuit) → seal/slam → explosive burst → 8-dog pack (named color variants) → dust dissipation | many | (cutscene) |
| 21 | SPECIAL ATTACK 2 (RAIKIRI) | cutscene title card (close-up + kanji **雷切**) → 8f brightening charge → **"REPEAT"** loopable hold → forward dashing lightning thrust → slash-impact FX → mirrored L | many | R + L |
| 22 | RAIKIRI — SUPPORT SPECIAL VERSION | full alternate Raikiri charge→dash sequence (cross-screen), R + L | many | R + L |
| 23 | SPECIAL ATTACK 3 (MANGEKYOU SHARINGAN) | cutscene title cards (close-up + kanji **万華鏡写輪眼** + boxed eye-reveal, headband lifted, red eye) → 14f **"REPEAT"** looping ready stance | 14 | (mode) |
| 24 | WIN | standing → ready-stance | 10 | R + L |
| — | (no distinct LOSE/KO) | — see Item 3 | — | — |

Portrait candidate: the framed vertical bust in MUGSHOTS (cleanest cowl-jaw headband bust).

---

## 🔖 OPEN ITEMS — TRACKED (need a future decision; do NOT lose as the build moves on)

**OI-1 — ✅ RESOLVED (owner, 2026-08-23): LEAVE RESERVED.** The 4 sheets stay on disk, documented here;
no wiring, no cut. Zero gameplay impact; revisit only if the engine later grows slots for these states.
(Original context below.) Four reserved-but-unwired states (real, content-verified art with no engine home):
These sheets are sliced, clean, and subagent-content-verified, but the engine currently has no action
slot for them so they render nothing in-game:
| State | Sheet | Content verified as | Decision needed |
|---|---|---|---|
| Crouch-walk | `kakashi_crouchwalk_uniform.png` (6f) | low alternating forward stride | add a crouch-locomotion movement hook, or accept static-crouch-only and cut |
| Wall-jump | `kakashi_walljump_uniform.png` (4f) | wall push-off (f1-2 face left — see OI-2) | does the engine support wall-jumps? wire + fix facing, or cut |
| Teleport | `kakashi_teleport_uniform.png` (1f) | crouch-vanish + smoke-streak pose | wire into the shunshin `dashTeleport` visual (earmarked), or leave procedural |
| Fast-get-up | `kakashi_fastgetup_uniform.png` (2f) | quick low→braced recovery | add a knockdown-tech/quick-recovery input, or accept standard get-up only |
Revisit no later than Stage 9 (final wiring/polish); flag again if any gains an engine slot sooner.

**OI-2 — Wall-jump strip facing.** `kakashi_walljump_uniform.png` frames 1-2 face LEFT (rest face
right). Harmless while OI-1 leaves it unwired; MUST fix facing if/when wall-jump is wired.

**OI-3 — Fast-get-up frame count.** Detected 2 clean frames; the Stage-0 prompt described a "4-frame
quick recovery roll." Re-check the source band if fast-get-up is ever wired (OI-1).

**OI-4 — Summon dog-sheet baked facing (non-blocking).** An isolated QA read flagged
`kakashi_pakkun_bite` / `kakashi_nindogs_pack` as facing LEFT. NOT acted on because: (a) `s.facing`
dynamically tracks the target (summons.js) → summons auto-flip to face the foe; (b) both sheets share the
baked-orientation signature of the working `handler_shik_dog` (which renders correctly); (c) Part-B gameplay
shots confirmed correct in-game orientation. Re-verify on a LIVE playtest; only flip if a moonwalk is
actually observed. (Same small-sprite-facing ambiguity class as the resolved standing-throw false alarm.)

---

## ✅ DECISIONS LOCKED (owner, 2026-08-23)
- **Item 1 — Mangekyou Sharingan:** activated **timed mode**, **BOTH** effects — offensive buff
  to Raikiri + Y-combo string **and** an improved dodge/read window (evasion/i-frame) vs incoming
  attacks. Built on Genos-Overdrive timed-mode scaffolding + Vegito evasion machinery.
- **Item 2 — Support Raikiri:** repurposed as the **Sharingan-gated empowered Raikiri** — the
  cross-screen dash variant fires only while Mangekyou Sharingan is active (Items 1 & 2 unified).
- **Item 3 — Lose/KO:** reuse **DAMAGE sequence's final downed frame**.
- **Item 8 — Ultimate:** **RAIKIRI** is the formal Ultimate (−198 EFF). Nin-Dogs stays a
  top-tier special (not the ULT). Note: Raikiri thus serves as signature + Ultimate, with the
  Sharingan-empowered Support variant layered on top.

---

## Stage 0 open items — findings & recommendations (superseded by locked decisions above)

### Item 1 — Mangekyou Sharingan mechanical effect (BLOCKS Stage 7)
The mode's *art* is fully present (activation cutscene + 14f looping ready stance). What it *does*
is undefined. Engine support confirmed for all three candidate shapes:
- **(a) buff to specific moves** — the timed-buff-mode pattern exists (`enterGenosOverdrive`,
  `enterHisokaOverdrive` w/ dmg×/spd× and auto-revert). Clean fit for empowering Raikiri + the
  Y-combo string while active.
- **(b) defensive/perception property** — the evasion/i-frame resource machinery exists
  (`_uiMeter`, `evasion`, `invuln`, `iframe`, Vegito's read-window dodge). Clean fit for an
  improved dodge/read window vs incoming attacks (canon Sharingan = movement prediction).
- **(c) both** — combine a timed offensive buff with a perception dodge window.

**Recommendation: (c) both**, as a timed mode (Genos-Overdrive scaffolding) — most faithful to
canon and to the "empowers other actions" framing, and the engine already has both halves.
**This is an owner decision — surfaced below.**

### Item 2 — Support Special Raikiri (BLOCKS part of Stage 6)
**Confirmed: this engine has NO active-fighter / support-fighter (tag-team) distinction.** Grep
for tag/partner/assist-fighter concepts returns nothing; matches are only companion *summons*
(Rika, Yachiru, shikigami), which is a different mechanic. So the source game's active/support
Raikiri split has no native home here and the variant **must be repurposed**. Options:
- **(A) Condition-gated stronger/faster Raikiri** — e.g. the Support variant becomes the version
  that fires *while Mangekyou Sharingan is active* (ties Items 1 & 2 together thematically:
  Sharingan-empowered Raikiri = the cross-screen dash version).
- **(B) A second cheaper/faster Raikiri** on a different input (weaker, less charge).
- **(C) Drop it** — use the main Raikiri art only; shelve the Support frames.

**Recommendation: (A)** — reuses the confirmed distinct art meaningfully and gives Mangekyou a
concrete offensive payoff. **Owner decision — surfaced below.**

### Item 3 — Lose/KO fallback (confirm)
No distinct Lose/KO pose exists. **Decision (stated, not silent):** fall back to the DAMAGE
sequence's final held frame (lying/downed) as the Lose/KO state. Consistent with prior chars
(Piccolo/Genos/Yuta all reuse knockdown). **Needs owner OK — surfaced below.**

### Item 4 — Fabrication
None required. Build directly from confirmed labels with high confidence.

### Item 8 — Ultimate designation (Stage 8, BLOCKS final labeling)
Three top-tier specials exist (Raikiri, Nin-Dogs, and the Mangekyou mode). Two Ultimate
candidates:
- **Raikiri** — signature move, full dual-direction production, has the Support variant.
- **Nin-Dogs** — cutscene-card presentation, full 8-entity summon scale, high-commitment.

The project allows "top-tier specials without a single formal Ultimate," but most built chars
have one designated ULT (−198 EFF convention). **Recommendation: Nin-Dogs as the formal
Ultimate** (its production scale — cutscene card, full pack, dissipation — reads as the big
screen-commitment finisher), keeping Raikiri as the signature special. **Owner decision —
surfaced below.**

---

## ✅ STAGE 1 DONE (2026-08-23) — registration + movement/state + portrait
- **Tools:** `tools/kakashi_boxes.py` (tight green-key `sum|rgb-(0,128,0)|<40` → connected-component
  box indexer + montage; protects the olive vest) + `tools/reslice_kakashi.py` (global-index picks,
  bottom-aligned uniform cells, `FLIP_H=False` — sheet's FACING-RIGHT set already faces right).
- **Facing:** confirmed the on-sheet "FACING RIGHT" cluster (left half of each row) VISUALLY faces
  right (stance box 6, walk box 20) → baked un-flipped; engine flips for left.
- **FACING-RIGHT picks:** IDLE `[6-11]` · WALK `[20,18,19,21,22,23]` · RUN `[30-35]` · CROUCH `[42,43]`
  · CROUCH-WALK `[46-51]` · JUMP `[58,59,60,61,66]` · WALL-JUMP `[68-71]` · TELEPORT `[76]` · HURT
  `[78,79]` · KNOCKDOWN `[80,81,88,82]` (fall→side→flat(=LOSE)→rise) · FAST-GETUP `[90,91]` · portrait
  = box 5 (face bust).
- **Emitted:** 12 `kakashi_*_uniform.png` + `kakashi_portrait.png`. QA: **0 green-halo** across all
  sheets; subagent visual sign-off PASS (11/12 clean + all 10 harness shots real sprites, feet planted).
- **Registered:** characters.js (`kakashi`, HP1150/EN200/atk89/def84/spd92/scale1.75, energyType
  `chakra`, universe `naruto`, `runWhenAdvancing`+`dashTeleport`) + spritesheets.js idle gate +
  skins.js default + credits.js (Neimad / DS Ripping Forum). On-screen idle **108px** (roster mid-band).
- **★GENUINE separate WALK≠RUN** (rare here): both wired independently; run plays on advance, walk on
  retreat (`runWhenAdvancing`). dash reuses run; fall reuses jump apex. crouch-walk/wall-jump/teleport/
  fast-getup emitted but RESERVED (no engine slot this stage).
- **Harness:** `test:kakashi-stage1` **25/0**. Regression: yuta-stage1 25/0, piccolo-stage1 21/0 clean.
- **FOLLOW-UP (banked):** wall-jump strip frames 1-2 face left (reserved sheet, harmless now — fix if
  wall-jump ever gets an engine slot). FAST-GET-UP detected 2f (prompt said 4).

## ✅ STAGE 2 DONE (2026-08-23) — 5 normals + crouchLight (test:kakashi-stage2 16/0)
Sourced from the Y-COMBO string + directional Y+attack rows (the FULL two-segment Y-combo `[94-119]`
is RESERVED for the Stage-3 rekka). ×0.60 via `GLOBAL_DAMAGE_SCALE` (confirmed exact in-harness).
FACING-RIGHT picks + verified content (QA subagent PASS, 0 halo, all face right):
| Normal | Frames | Content | Eff dmg |
|---|---|---|---|
| light | `[94,95]` | kunai DRAW-SLASH (long reach) | −26 |
| heavy | `[103,104,105]` | orange-streaked sweeping KICK (confirmed kick, not punch) | −50 |
| up | `[124,125,126,120,121]` (★x-order) | rising overhead KICK — LAUNCHER (own art) | −39 |
| air | `[142,143,144,145,146]` | diving strike w/ orange trail | −32 |
| down_air | REUSE air | (no dedicated down-aerial art) | −43 |
| crouchLight | `[153,154,155]` | low sliding kunai (auto-swap via `_setCrouchVariant`) | −26 |
- Wired: `basic_attacks.crouchLight` + 6 `animationData` entries (loop:false/lockLastFrame).
- `kakashi_runattack_uniform.png` (Y+Run `[130-135]`, sliding slash) emitted RESERVED — no dash-attack
  slot; Stage-3 poke candidate (see OI-1 sibling note).
- Regression: yuta-stage2 13/0, piccolo-stage2 17/0, kakashi-stage1 25/0. Credits: kakashi attributed
  (NOT in the 2 pre-existing credits-test failures).

## ✅ STAGE 3 DONE (2026-08-23) — "Y-Combo" Fwd+Heavy cancel-on-hit rekka (test:kakashi-stage3 10/0)
★Per the prompt, stage count was derived by **DIRECT FRAME REVIEW** (the two-row "segment" layout is the
raw material; the real cancelable beats are 3 distinct strikes) — NOT assumed from segment count. Mirrors
the shared Goku/Gohan/Piccolo rekka infra (`rekkaContinue`, requireHit:true).
| Stage | Move | Frames | Content | Raw dmg |
|---|---|---|---|---|
| 1 | kakashiCombo1 | `[95,96,97]` | kunai draw-SLASH opener + punches | 42 |
| 2 | kakashiCombo2 | `[99,100,101,102]` | mid PUNCH flurry (slash→orange thrust→punches) | 50 |
| 3 | kakashiCombo3 | `[116,117,118]` | orange-streaked KICK **launcher** finisher (seg2) | 84 (launcher) |
- **Cancel timing:** the window IS the shared rekka mechanic — a fresh Heavy during the current stage's
  RECOVERY, gated on a landed non-blocked hit (cancel-on-hit). Whiff/block ends the string. Ground-only, FREE.
- **Input:** Fwd+Heavy opens combo1; re-tap Heavy to advance. Neutral Heavy stays the normal sweeping kick.
- **Wiring:** abilities.js `KAKASHI_CMD`/`fireKakashiCmd`/`updateKakashiCommandCombat`; game.js import +
  dispatch + `kakashiCmd` harness probe; 3 `animationData` entries (sprite.js identity fallback renders them —
  no MOVE_TO_ACTION edit). In-harness: opened→cancelled→launcher, 101 cumulative dmg, P2 launched vy −7.9.
- Regression: goku-stage3 10/0, gohan-stage3 10/0, kakashi-stage2 16/0. QA subagent visual PASS (0 halo,
  all face right, combo1=slash/combo2=punch/combo3=kick confirmed).

## ✅ STAGE 4 DONE (2026-08-23) — "Weapon Throw" special, 3 stance contexts (test:kakashi-stage4 14/0)
A kunai (orange spinning-slash) thrown in 3 DISTINCT stance contexts, built SEPARATELY (not one anim
reused), per the prompt. STANCE-based routing (not directional), matching the source's variants.
| Context | Trigger | Cast pose | Frames | Eff dmg |
|---|---|---|---|---|
| Standing | neutral ground (N/F/B/U) | kakashiThrow `[164,162,165]` | 3 | −27 |
| Crouch | Down held | kakashiThrowCrouch `[168-171]` (low traj) | 4 | −26 |
| Air | airborne | kakashiThrowAir `[176-180]` (diagonal-down) | 5 | −27 |
- **Projectile:** PROCEDURAL — NEW ui.js `drawKind: "kunai"` = spinning steel kunai (blade+ring) wrapped in
  an orange spinning-slash streak (self-contained; no borrowed asset). speed 18, cost 20 chakra each.
- **Wiring:** abilities.js `KAKASHI_THROW`/`fireKakashiKunai`/`executeKakashiSpecial` + dispatch `case "kakashi"`;
  characters.js `specials.weaponThrow` (HUD) + 3 cast-pose animationData (sprite identity fallback). In-harness:
  each context casts its DISTINCT pose, spawns a kakashiKunai projectile, connects, spends 20 chakra.
- Regression: piccolo-stage4 23/0, vegito-stage4 26/0, kakashi-stage3 10/0. QA subagent: 3 poses distinct
  ✓, projectile reads as kunai+orange-slash ✓.
- ★FACING FALSE-ALARM (resolved): first QA read flagged the STANDING throw as facing-left; a REFERENCE-ANCHORED
  A/B vs the known-right idle + an objective orange-throw-direction metric both confirmed all 3 face RIGHT
  (windup arm cocked back-left fooled the isolated read). NO flip applied. [Reaffirms the project's
  "objective/reference beats isolated small-sprite facing read" lesson.]

## ✅ STAGE 5 DONE (2026-08-23) — TWO structurally-different Kuchiyose summons (test:kakashi-stage5 16/0)
Built DIFFERENTLY per the prompt (persistent companion vs one-shot burst), on the shared summons.js
`summonTemplates`/`spawnSummon` infra.
| Summon | Input | Type | Template | Frames | Behavior |
|---|---|---|---|---|---|
| **Pakkun** | Back+Special | LINGERING companion pug | `kakashiPakkun` (dur 300, multi-hit, two-phase spawn→bite) | ready `[186-241 rects]` + bite `[423-559 rects]` | rush, oneHit:false, 30 chakra |
| **Nin-Dogs** | Fwd+Special | one-shot BURST 8-dog pack | `kakashiNinDogs` (dur 66, short) | pack `[254,255,256,257]` | rush, 40 chakra |
- Cast poses (shared seal→slam motion, distinct sheets): kakashiPakkunCast `[186,195,196]` / kakashiNinDogsCast
  `[234,243,246]`. Pug is UNINDEXED (frames ~20px < detector min_h) → NEW `reslice_rects()` explicit-pixel helper.
- **Wiring:** summons.js 2 templates; abilities.js `fireKakashiSummon` + routing (`executeKakashiSpecial`: F→Nin-Dogs,
  B→Pakkun, N/U→standing throw, D→crouch throw, air→air throw); characters.js `specials.ninDogs`/`.pakkun` +
  2 cast-pose animData. In-harness: STRUCTURAL DIFFERENCE proven — Nin-Dogs despawns <100f (life 65), Pakkun
  persists (life 298), both connect + spend chakra.
- Regression: handler-stage4 28/0, yuta 30/0, kakashi-stage4 14/0. QA subagent: pakkun=small pug ✓,
  nindogs=multi-dog pack ✓, both render grounded as real sprites in gameplay ✓. (Facing flag → OI-4, non-blocking.)
- DEFERRED cosmetics: the Nin-Dogs cutscene title card (boxes 232/233, kanji 土遁・追牙の術) is NOT rendered
  (big-commitment conveyed via cost+damage instead); Pakkun summon-out spark FX not wired.

## ✅ STAGE 6 DONE (2026-08-23) — Raikiri = the ULTIMATE (test:kakashi-stage6 17/0)
Raikiri is the owner-designated ULT → built on the ultimate button (100 chakra) as an inline freeze-cinematic
dash-thrust (Superman-New52 pattern, LIVE fighter, no dup): charge lightning blade → ROCKET forward → one
guaranteed lightning THRUST = **EXACTLY 198 EFF** (330 raw × 0.60 `applyScaledDamage`), knockdown, both dirs.
| Pose | Frames | Content |
|---|---|---|
| kakashiRaikiriCharge | `[286,288,290]` | brightening blue lightning charge (290=peak) |
| kakashiRaikiriDash | `[302,306,309,312]` | dashing lightning thrust (base) |
| kakashiRaikiriSupport | `[329,332,335]` | cross-screen dash (Sharingan-empowered variant) |
- **★SHARINGAN-GATED SUPPORT variant (Items 1+2):** while `_mangekyouActive` (Stage-7 mode), Raikiri EMPOWERS
  → swaps to the SUPPORT cross-screen dash art + i-frames through the blitz + longer reach; damage stays in
  the ULT band (198 EFF). `_mangekyouActive` is an EXISTING engine flag (Itachi's Mangekyou) → Stage 7 mirrors it.
- **Wiring:** abilities.js `KAKASHI_RAIKIRI_ULT`/`executeKakashiUltimate` + ult-dispatch `case "kakashi"`;
  characters.js `ultimate:{name:"Raikiri"}` + 3 cast-pose animData; NEW harness helper `setMangekyou()` (game.js).
- In-harness: base casts charge pose → spends 100 → peak |vx| 22 → **198 EFF** from out of range → knockdown;
  empowered uses support pose + i-frames + 198 EFF; left-facing lands 198. QA subagent: all 3 sheets have strong
  BLUE lightning, distinct charge/dash/support, face right; ★fixed screenshot timing → in-engine dash shot
  confirms blue-lightning thrust reads (base + empowered).
- Regression: vegito 46/0, iron-man-2 38/0, superman-new52 35/0, naruto 21/0, kakashi-stage5 16/0.
- DEFERRED cosmetics: bespoke lightning-bolt impact FX (baked art + colorFlash + shake used instead); the
  Raikiri 雷切 cutscene title card (boxes 280/281) not rendered as a freeze card (cinematic uses the live fighter).

## ✅ STAGE 7 DONE (2026-08-23) — Mangekyou Sharingan activated timed MODE (test:kakashi-stage7 15/0)
Per Item-1 "both": an activated timed buff-mode with BOTH an offensive buff AND a Sharingan read/dodge window.
GENERALIZED the existing Itachi Mangekyou system (`isMangekyouUser` = itachi||kakashi) — reuses all its
tested drain/reset plumbing; Itachi unaffected (itachi_mangekyou 12/0).
- **Activation:** Charge (P) hold-release at threshold (energy ≥ 150), NEW `kakashi` branch in
  `handleChargeRelease` (teleportFlash ignite; NO Itachi eye-cinematic — those are Itachi's eyes). Quick TAP
  reverts; HOLD-release sustains. Timed drain 0.28/f → auto-revert at 0 (~9s).
- **BUFF (half 1):** `MANGEKYOU_MULT` dmg1.20/spd1.12/def1.06 → buffs normals + Y-combo (light 26→31 in-harness).
  ★Mults live IN `currentFormData` (updateTransformationState re-applies it EVERY frame — omitting them wiped the
  buff to 1). Raikiri ULT stays 198 (applyScaledDamage ignores the mult).
- **DODGE/READ WINDOW (half 2):** `currentFormData.autoDodge` → combat.shouldGojoAutoDodge auto-dodges incoming
  MELEE at 10 ki/read (in-harness: base takes 36, Mangekyou dodges + spends ki). Balanced vs the mode drain (playtest lever).
- **Empowered Raikiri (S6):** keyed on `_mangekyouActive` → works automatically (kakashi-stage6 still 17/0).
- **Visual:** idle-swaps to the headband-lifted "REPEAT" ready stance (`_skinAnim` idle-only override, Vegeta-SSJ
  idiom). Frames `[373-378,380-386]` = 13f (★box 379 DROPPED — QA found it's an attack-thrust, not a stance frame).
- **Harness helpers (game.js):** `mangekyouEnter()` (real enter) + `mangekyouRevert()`.
- Regression: itachi_mangekyou 12/0, itachi_susanoo 19/0, goku 38/0, vegito 46/0, kakashi-stage6 17/0. (sharingan.test
  2 fails = PRE-EXISTING, unrelated: eye-state count + Susanoo giant sizing.) QA: Part B in-game stance PASS
  (right-facing, orange Sharingan eye); stance-strip raw facing = same non-blocking OI-4-class ambiguity, in-game correct.
- DEFERRED cosmetics: Kakashi-specific eye-reveal cutscene (万華鏡写輪眼 cards 370/371 + eye bust 372) not rendered
  as a fullscreen cinematic; a bespoke Sharingan aura overlay (Itachi's is Itachi-gated).

## ✅ STAGE 8 DONE (2026-08-23) — Ultimate designation VERIFIED (test:kakashi-stage8 14/0)
Owner decision (Stage 0 Item 8): **RAIKIRI is the formal Ultimate**; **Nin-Dogs stays a top-tier SPECIAL**
(not a second ult). No new art — this stage proves the designation is COHERENT:
- **Raikiri = the Ultimate:** on the ultimate button, 100 chakra, a GUARANTEED ~198 EFF sure-hit from out of
  range (the big-commitment finisher). Built in Stage 6.
- **Nin-Dogs = a special:** `specials.ninDogs` (Fwd+Special), 40 chakra, a rushing pack that must travel —
  NOT an instant range-independent nuke (immediate far-range dmg 0). Built in Stage 5. Pakkun + Weapon Throw
  also remain specials.
- Verified: ult button → `kakashiRaikiriCharge` (NOT Nin-Dogs, no pack summon); Fwd+Special → `kakashiNinDogsCast`
  (NOT the ult pose); costs 100 vs 40; Raikiri lands 198 from far range while Nin-Dogs does not.
- Harness change: added `specials` to the shared `charDef` accessor (additive; kakashi-s1 25/0, yuta 30/0 clean).
- Full BALANCE_AUDIT (dense-kit outlier check) + regression is Stage 9.

## ✅ STAGE 9 DONE (2026-08-23) — win/lose + canonical + BALANCE_AUDIT + regression → **CHAR COMPLETE**
- **WIN:** REAL 10-frame standing→ready-stance victory sequence `[393-402]` (resolves into Kakashi's
  book-reading pose — on-sheet, no borrow). **LOSE:** reuse of the DAMAGE sequence's final downed frame
  `[88]` (owner Item-3 decision). Both wired in animationData; QA subagent PASS (coherent, face right).
- **Portrait:** kakashi_portrait.png (box-5 face bust, from Stage 1) — kept.
- **Canonical `test:kakashi` = 55/0** — gate/stats/portrait/ult+specials meta, full 27-action sheet-wiring
  sweep + honest reuses, normal connect, Y-Combo rekka→launcher, kunai+connect, BOTH summons (Nin-Dogs burst
  + Pakkun lifetime 299), Raikiri 198, Mangekyou mode (buff+stance-swap), win/lose, 16-action fallback-box sweep.
- **BALANCE_AUDIT.md** entry added — FAIR VERSATILITY outlier (Madara/Handler/Yuta/Pain class), ZERO bypass,
  no stat record, Mangekyou mode flagged as the marquee playtest lever. Credits RESOLVED (Neimad; NOT a blocker).
- **Regression ALL GREEN:** kakashi-stage1..8 = 25/16/10/14/16/17/15/14; canonical 55/0. Neighbors:
  itachi-mangekyou 12/0, goku 38/0, vegito 46/0, handler-stage4 28/0, iron-man-2 38/0, piccolo 38/0, gohan 30/0.
  credits.js: kakashi attributed (2 test fails = PRE-EXISTING/unrelated).

## ★ CHAR FULLY COMPLETE (S0–S9), 2026-08-23. UNCOMMITTED (WIP branch).
**Follow-ups / open (non-blocking):** OI-1 (4 reserved-unwired states — owner keep/cut/wire decision) · OI-2/3
(walljump facing / fastgetup count, only if OI-1 wires them) · OI-4 (summon dog facing, live-playtest re-check) ·
deferred cosmetics (eye-reveal cutscene, bespoke Raikiri lightning-bolt FX, Nin-Dogs title card) · skins · voice(blocked).
1. reslice_kakashi.py (tight green key) + registration (characters/spritesheets/skins/credits),
   HP/EN/scale TBD at S1 (idle height measured).
2. Movement: STANCE/WALK/RUN/CROUCH/CROUCH-WALK/JUMP/WALL-JUMP/TELEPORT/DAMAGE/FAST-GET-UP —
   **first project char with a genuine separate Walk** (do not collapse Walk into Run).
3. Normals: Y-combo (2 seg) + up/run/jump/crouch variants (×0.60).
4. Command chain: Y-combo two-segment cancelable rekka (confirm cancel timing by frame review).
5. Specials (ranged): Weapon Throw standing/crouch/air — build all three distinctly.
6. Summons: Pakkun = lingering companion assist (rikaAssist/yachiru pattern, hold-to-sustain);
   Nin-Dogs = one-shot big-commitment burst (NOT a companion).
7. Raikiri: charge-hold(REPEAT)-release dash thrust, both dirs + repurposed Support variant.
8. Mangekyou Sharingan: activated timed mode per Item 1 decision.
9. Ultimate designation per Item 8; Win/Lose; portrait; harness (`test:kakashi`); BALANCE_AUDIT
   + regression. Dense kit — flag if it reads as an outlier once real numbers exist.

**STOP — Stage 0 investigation complete. No gameplay code written. Awaiting owner decisions on
Items 1, 2, 3, 8 before Stage 1.**
