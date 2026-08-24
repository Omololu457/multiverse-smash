# BARDOCK — STAGE 0 Asset Map & Investigation Report

**Character:** ONE roster entry (`bardock`), **standalone single-form kit** — the uploaded sheet
depicts base Bardock only. There is a brief **Super Saiyan hair-flash burst** on the sheet but **no
sustained SSJ combat kit** (no gold normals/specials), so — per the prompt's Stage-0 item 1, matching
the demotion already applied to [[goku-4form-build]]'s SSJ3 clip — it is treated as a **cosmetic
flourish, NOT a playable second state**. If a full base+transformed sheet pair is supplied later,
restructure into a genuine two-form build then (same rule as Gotenks' base-sheet caveat).

**Source:** Dragon Ball Z: Extreme Butoden (3DS), **single sheet**, base Bardock. Same rip family /
teal+green keying convention as the project's EB Goku, Teen Gohan, Gotenks, Piccolo, Frieza builds.

**Status:** STAGE 0 COMPLETE — investigation + report only. **NO gameplay code written.** Verified
2026-08-23 by a first-hand pixel pass over **all 298 connected-component boxes** (new
`tools/bardock_montage.py` + 13 twenty-four-box montage chunks read directly + 3 fine-detail strips),
**plus a programmatic sub-threshold blob scan** hunting for a hidden projectile shard. All four
Stage-0 items resolved against real sprite evidence; **one earlier misread was self-corrected**
(#203/#204 is a golden ki-orb, NOT a scouter — see item 3). Nothing rubber-stamped.

**Roster reconciliation:** No existing `bardock` in `characters.js` / `spritesheets.js` / `skins.js` /
`credits.js` — clean NEW character. Nothing to reconcile.

---

## SOURCE SHEET

RGBA but fully opaque. Background teal `(0,128,128)`; every frame sits in its own green cell
`(0,255,80)`. Key BOTH to transparent when slicing (identical to EB Goku/Gohan/Gotenks).

| File | Size (WxH) | Boxes* |
|---|---|---|
| `3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Bardock.png` | 1550 × 8030 | 298 |

\* connected-component count at the ≥500px / ≥18px montage threshold (includes FX arc/flash frames),
not the final animation count. A separate scan for 40–500px blobs found only **3 VFX-streak fragments**
(29×19, 35×17, 22×4) — **no dedicated projectile-shard/orb cell** flying free of the body (see item 4).

**Design read:** Bardock — **red headband**, black Goku-spiky hair, **green Saiyan battle armor**
(green chest padding + shoulder pads), sleeveless **dark navy undersuit**, **crimson/magenta
wristbands**, crimson boots/leg-warmers with green trim, brown belt. Faces **LEFT** on the sheet →
reslice with `FLIP_H=True` to face RIGHT (same as every EB rip). Idle/stance silhouette ~130px tall
pre-scale (adult Saiyan, comparable to EB Goku) → scale to be set at Stage 1 (~1.1, in line with Goku).

**Tooling built this stage (Stage-0 only, no engine code):**
- `tools/bardock_montage.py [all|idx-list] [out.png]` — teal+green-keyed contact sheet
  (`bardock_montage.png`, 298/298). Byte-for-byte mirror of `tools/gotenks_montage.py`; **montage
  indices = future reslice indices** (same box sort: row-band ÷60 then left-to-right).

---

## FRAME INVENTORY (montage indices)

| Range | Content |
|---|---|
| `[0]` | Full-body standing emote (arm extended forward) — portrait/emote alt |
| `[1-6]` | **6 rectangular face busts** (portraits) — calm → determined → intense/angry (red streaks) → shouting |
| `[7,8]` `[10,11]` | **Idle / breathing-stance loop** (arms-low ready stance) |
| `[9]` | **Flat pale LAVENDER single-tone FLASH frame** (cross-character lavender-flash convention — cosmetic, wire at Stage 6) |
| `[12-23]` | Ready-stance / combat-stance transitions |
| `[24,25]` | **Dash** (deep forward lunge) · `[42,43]` dash-dive / horizontal diving frame |
| `[27,28]` | **Guard / block** (crossed-arm brace) · `[29]` tall standing block · `[32,33]` guard-hit brace |
| `[30,31]` `[40,41]` | **Crouch — SWORD-DRAWN variant** (green blade, low crouch) |
| `[34]` `[155-159]` `[167]` | Fighting stance **holding the green blade** (sheathed/ready sword stances) |
| `[36,37]` `[144,145]` `[185,186]` | **Double-bicep FLEX** poses (recurring — taunt/victory-flex family) |
| `[44-51]` | **Jump / leap** ascent frames (~7f leap arc) |
| `[48-95]` | **Normals band A:** jab/straight/lunge punches, flying kicks w/ white-crescent VFX (`[84,85],[105,106]`), spinning backhand (`[89]` red arc), elbow, aerial punches/spin-kicks; **SWORD diving punch** `[49],[65],[66],[79],[96],[102,103]` |
| `[96-143]` | **Normals band B:** overhead double-fist smash (`[97,98],[124]` w/ red arc), dash-punch `[100,101]`, sweep/rising kicks, **backflip/somersault kick** `[110,111]`, rising spin attack w/ **RED arc trail** `[113],[129]` (LAUNCHER candidate), **sword rising attack** `[130,131]` |
| `[144-191]` | **Normals band C:** flying kicks w/ red trails `[149,150]`, **big OVERHEAD SWORD SLASH w/ red trail** `[154],[163],[174]`, sword sweep `[181-183]`, backflip kick `[160-162]`, **standing open-palm PUSH windup** `[176,177]` (see item 4 — CUT) |
| `[192-215]` | Crouch-sword `[192,193]`; **SUPER SAIYAN gold-hair FLASH cluster** `[195],[198],[199],[200],[201]`; **compact GOLDEN KI-ORB gather** `[203,204]` (see item 3); early hurt frames |
| `[216-255]` | **Hurt-stagger / recoil / knockback** (fingers-splayed blast-back `[230,231],[238,239]`), heavy-hit absorb frames |
| `[256-274]` | **Knockdown chain:** fall `[256,257]` → **KO tumble** (upside-down) `[264-267]` → **lying prone** `[272-274]` → **getup/rising** `[258-263],[268-271]` |
| `[276-283]` | **WIN pose — standing ARMS-CROSSED** (6f loop + entry) — REAL victory stance |
| `[284-297]` | **INTRO — standing / adjusting-stance** sequence → double-bicep flex `[290-293]` → settle into fighting stance `[294-297]` |

---

## STAGE-0 CLAIM VERIFICATION

| # | Claim (from prompt) | Result |
|---|---|---|
| S0-1 | SSJ hair-flash unresolved; demote to cosmetic flourish unless a real base/transformed sheet pair is provided | ✅ **CONFIRMED cosmetic.** Only **5 gold-hair frames** `[195,198,199,200,201]` — a power-up FLASH burst (kneel-charge → arms-up → arms-spread → stance), **NO SSJ combat kit** (zero gold normals/specials/movement). Treat as brief visual beat. Revisit as a 2-form build ONLY if a full transformed sheet arrives |
| S0-2 | Sword/blade variants are real & unique to this char (crouch, jump-in punch, overhead windup) — build as genuine weapon-armed variants | ✅ **CONFIRMED — extensive.** Green blade wielded across crouch `[30,31,40,41,158,159,192,193]`, diving/jump-in punch `[49,65,66,102,103]`, **dedicated overhead sword slash w/ red trail** `[154,163,174]`, sword rising `[130,131]`, sword stance `[34,155-157,167]`, sword sweep `[181-183]`. A genuine, substantial sword sub-kit — the real differentiator |
| S0-3 | Compact energy-orb pose (2f, near head/hand) — role decision (scouter-sense vs ki-charge tell); don't default to taunt | ✅ **CONFIRMED PRESENT `[203,204]`** — a **compact GOLDEN ki-orb gathered low near the hands** (fine-read; it is **NOT a scouter** as first suspected, **NOT a generic taunt**). Reads as a **ki-charge / energy-gather TELL**. **ROLE STILL OPEN:** standalone resource-build charge vs windup to a *procedural* energy payoff (no sprite payoff exists — see item 4). **Confirm before assigning** |
| S0-4 | No beam/projectile, no full charge-and-release, no Ultimate/Nova cinematic on the sheet | ✅ **CONFIRMED ABSENT** — full 298-box pass + sub-threshold blob scan (only 3 VFX-streak fragments, **no detached shard/orb/beam graphic**). Consistent with the EB batch. **The standing open-palm PUSH windup `[176,177]` exists but has NO release/beam art → CUT per prompt, preserve as unused data** |
| — | Idle 2 variants ×4f, guard 3f + guard-hit 3f, crouch (incl sword variant), jump 7f, dash 3f, hit→knockdown→lying→rising | ✅ CONFIRMED (`[7-23]`, `[24-33]`, `[30,31/40,41]` sword-crouch, `[44-51]`, `[256-274]`) |
| — | Win = 6f standing arms-crossed; Intro = standing/adjusting-stance | ✅ **CONFIRMED — both REAL & present** `[276-283]` (arms-crossed win) + `[284-297]` (adjusting-stance intro). ★Unlike Goku/Gotenks (who LACK win/intro art), **Bardock has genuine win AND intro** — no borrowing needed |

---

## STAGE-BY-STAGE NOTES

### Stage 1 — Registration + movement
Idle `[7,8,10,11]`, lavender flash `[9]`, ready-stance `[12-23]`, guard `[27,28]`, guard-hit `[32,33]`,
**crouch (unarmed) + crouch-SWORD variant `[30,31]/[40,41]`**, jump/leap `[44-51]`, dash `[24,25,42]`,
hurt `[216-219]`, knockdown/tumble `[256,257,264-267]`, lying `[272-274]`, getup `[268-271]`. New char
`bardock` — clean add (HP/EN/scale set at S1 in line with EB adults, ~scale 1.1). **Rip-author UNKNOWN
→ credits attribution PENDING** (same EB-family blocker as Frieza/Piccolo/Gohan/Gotenks — MUST resolve
before ship).

### Stage 2 — Normals (~19-move physical library)
Rich melee library across `[48-191]`: jab/straight/lunge punches, overhead double-fist smash
`[97,98,124]`, flying kicks w/ crescent VFX (`[84,85,105,106]`), sweep kicks, rising/spin kicks, aerial
punches & spin-kicks, backflip/somersault kick (`[110,111,160-162]`), rising spin attack w/ RED arc
trail (`[113,129]` — LAUNCHER candidate). **★Build the SWORD variants as genuine weapon-armed moves**
(item 2): sword jump-in/diving `[49,65,66,102,103]`, overhead sword slash `[154,163,174]`, sword rising
`[130,131]`, sword sweep `[181-183]`.

### Stage 3 — Command chains
Confirm real chain order / cancel points by direct frame review across `[48-191]`. **★Open item (from
the prompt): whether the sword-drawn variants can chain into/out of unarmed moves** — resolve at Stage 3
via frame adjacency, do not assume.

### Stage 4 — Specials
- **No confirmed ranged/energy special on the sheet** (item 4). Flag explicitly — do NOT invent a
  substitute (same treatment as Goku/Gotenks).
- **Compact golden ki-orb gather `[203,204]`** is the closest special candidate. If it becomes a
  special, its payoff must be **procedural** (project precedent: Piccolo/Goku/Gotenks procedural
  energy) — the orb-gather POSE is real, any beam/blast art is not. **Role OPEN** (item 3).
- **Open-palm push windup `[176,177]`** — CUT, preserved as data pending future beam art.

### Stage 5 — Transformation (cosmetic flourish, per item 1)
Build the Super Saiyan gold-hair frames `[195,198-201]` as a **brief visual beat only** (a
transient palette/hair flash), **not a playable alt-state** — same demotion as Goku's SSJ3 clip.
Revisit as a real two-form build only if a full transformed-state sheet is provided later.

### Stage 6 — Portrait, win/lose, intro, harness, balance
- **Portrait:** face busts `[1-6]` (pick the determined/calm bust); full-figure `[0]` alt.
- **Win:** ✅ REAL — standing arms-crossed `[276-283]` (no borrowing needed).
- **Intro:** ✅ REAL — standing/adjusting-stance `[284-297]`.
- **Lose:** reuse knockdown/lying `[272-274]` (no dedicated lose art — flag).
- **No beam** — expected absence, note only.
- **Balance watch (per prompt):** melee-only, no-ranged-special (like Goku/Gotenks) **but with a
  genuine weapon differentiator** (the sword sub-kit) the others lack. At Stage 6, flag whether the
  sword variants alone are sufficient compensation, or whether Bardock needs the same "no ranged
  special" review already flagged for Goku/Gotenks. Regress vs `BALANCE_AUDIT.md`.

---

## LOCKED CUTS / DECISIONS (per prompt, corroborated by audit)

1. **SSJ gold-hair = cosmetic flash only** `[195,198-201]` — NOT a playable alt-state. Restructure into
   a two-form build later only if a full transformed sheet arrives.
2. **Sword variants = genuine weapon-armed move variants** (the real differentiator) — build faithfully,
   not as cosmetic alternates.
3. **Golden ki-orb gather `[203,204]` = ki-charge tell** (NOT scouter, NOT taunt) — role OPEN (resource
   charge vs procedural-payoff windup); confirm before assigning at Stage 2/4.
4. **Open-palm push windup `[176,177]` = CUT** (no release/beam art) — preserve as unused data.
5. **No ranged special / no beam / no ult cinematic** — genuine, expected absence for the EB batch.
6. **Win `[276-283]` + Intro `[284-297]` are REAL and present** — do NOT borrow (unlike Goku/Gotenks).

---

## DEFERRED / OPEN (confirm before wiring the relevant stage)

- **SSJ flash true function** (item 1) — cosmetic by default; revisit if a transformed sheet is provided.
- **Golden ki-orb role** (item 3) — resource-build charge vs procedural-payoff windup (Stage 2/4).
- **Sword ↔ unarmed chainability** — resolve at Stage 3 via direct frame review.
- **Credits rip-author** — UNKNOWN (EB-family blocker; MANDATORY before ship).
- **Balance** — melee-only + sword differentiator; decide at S6 whether that's enough compensation vs
  the shared "no ranged special" review (Goku/Gotenks).

---

## STAGE 1 — REGISTRATION + MOVEMENT (DONE — `test:bardock-stage1` 23/0)

**Scope:** movement/state skeleton + anime-face portrait. New char `bardock` — clean add.

- **Tool:** `tools/reslice_bardock.py` — standard EB green+teal key (no green-skin hazard), box
  ordering IDENTICAL to `bardock_montage.py` (montage indices = reslice indices), `FLIP_H=True`
  (EB rip faces LEFT → mirror to face RIGHT), feet-aligned uniform cells, anchorY 0.
- **Registered:** `characters.js` (full `bardock` object + export list), `spritesheets.js` (idle gate),
  `skins.js` (default only), `credits.js` (SOURCED_ART; rip-author UNKNOWN — attribution TODO before
  ship, mirrors the EB family). **HP 1200 / EN 200 / Atk 90 / Def 84 / Spd 90 / scale 1.0 /
  energyType "ki" / melee-only + sword differentiator.** Idle renders **118px** (measureSprite) — a
  rugged full-size adult warrior.
- **Frame picks (montage indices):** idle `[9-14]` (calm 6f breathing loop) · **crouch `[27,28]`
  (★SWORD-DRAWN low crouch — the sheet's crouch carries the blade, item 2)** · **walk/run BORROW idle**
  (no ground stride on the sheet — Frieza/Piccolo/Gotenks pattern) · dash `[42]` (deep lunge lean) ·
  jump `[47,48]` (leap→ascent) · fall `[48]` · guard `[24,25]` · guardHit `[218,219]` · hurt `[256]`
  · knockdown `[271-273]` (collapse→lying flat) · getup `[268-270]` · **win `[276-281]` (★REAL
  arms-crossed victory pose — on-sheet, NO borrowing unlike Goku/Gotenks)** · lose = reuse knockdown
  · portrait = face bust #1 (red-headband, scarred).
- **Tier row `[6]/[7]` + LAVENDER flash `[8]`** — cosmetic effect frames, NOT sliced this stage
  (Stage-6). **2nd combat-ready idle variant `[17-23]`** — reserved.
- **Verification:** `test:bardock-stage1` 23/0 (sprite gate, scale 1.0, HP/EN, Ki label, 118px height
  band, walk/run borrow-idle, every action resolves a real `bardock_` sheet with no fallback box, real
  win art, no JS errors) + in-engine screenshot sign-off (idle faces RIGHT/feet planted; knockdown lies
  flat on the ground line; win = arms-crossed; no teal/green box, correct scale). Regression:
  `gotenks-stage1` 23/0, `gohan-stage1` 21/0 clean.
- **Open Stage-1 flags carried forward:** walk = borrow-idle (no stride art); golden ki-orb role OPEN
  (item 3); sword↔unarmed chaining OPEN (S3); SSJ flash = cosmetic (S5); intro real but deferred (S6);
  credits rip-author UNKNOWN.

**NEXT = Stage 2 (normals + sword-variant moves).** Two role calls still pending for later stages
(golden ki-orb function → S4; sword↔unarmed chaining → S3).

## STAGE 2 — NORMALS (DONE — `test:bardock-stage2` 20/0)

5 normals + crouchLight, all CONFIRMED distinct art with a visibly extended limb/weapon (Gohan lesson),
all dmg ×0.60 GLOBAL_DAMAGE_SCALE (verified EXACT: heavy 80→48, up 58→34). ★**The SWORD differentiator
is baked into exactly the three slots the sheet depicts armed** — mapping 1:1 to the prompt's three
sword locations (overhead windup / diving jump-in / crouch): **heavy = overhead sword slash, down_air =
diving sword strike, crouchLight = low sword thrust**. light/up/air stay unarmed. down_air has its OWN
diving-sword art (NOT a reuse of air — better than the Gotenks/Goku pattern).

- **Picks (montage indices → sheet):** light `[74]` (jab, lead arm forward) · **heavy `[154]` (★SWORD
  overhead slash w/ red trail, long reach)** · up `[134]` (rising AXE-KICK launcher, own art) · air
  `[85]` (airborne flying kick) · **down_air `[65]` (★SWORD diving strike w/ arc trail, own art)** ·
  **crouchLight `[66]` (★SWORD low thrust)**. Emitted by `tools/reslice_bardock.py`.
- **basic_attacks (raw → ×0.60 eff):** light 42→25 · heavy 80→48 · up 58→35 (launcher) · air 54→32 ·
  downAir 68→41 · crouchLight 40→24. (Set at Stage 1; scale confirmed on connect.)
- **★FACING (Gohan lesson) — signed off IN-ENGINE, not just on-strip:** all six reach toward the foe
  (RIGHT) after FLIP_H. The two dynamic sword frames (heavy/down_air) read ambiguous on the flat strip
  → verified via harness screenshots: heavy sword-arc + red slash-FX lands rightward (2-hit combo),
  crouchlight low sword reaches right, down_air diving-sword renders airborne and connects.
- **Reserved for S3:** rising spin-slash w/ arc trail `[113,129]` (launcher/finisher candidate),
  jab-combo string `[74,75,76]`, overhead double-fist smash `[97,124]`, spinning backhand `[89,143]`,
  sword stance/sweep `[30,31,34,155-159,163,167,183]`.
- **Verification:** `test:bardock-stage2` 20/0 (wiring: every normal → real bardock_ sheet, no box;
  up≠heavy, down_air≠air; light/heavy/up connect + render; air/down_air airborne; crouch+light
  auto-swap; guard) + in-engine facing/sword-reach screenshots. Regression: `bardock-stage1` 23/0,
  `gotenks-stage2` 19/0, `gohan-stage2` 17/0 clean.

**NEXT = Stage 3 (command chain).** ★OPEN owner call resurfaces here: can the sword-drawn variants
chain into/out of unarmed moves? (S0 deferred item — resolve via frame adjacency at S3.)

## STAGE 3 — COMMAND CHAIN "Blade Rush" (DONE — `test:bardock-stage3` 11/0)

A **pure-SWORD 3-stage Fwd+Heavy rekka** — the cleanest showcase of Bardock's differentiator. Mirrors
`updateVegitoCommandCombat` (the sibling sword rekka): cancel-on-HIT via shared `rekkaContinue`
(`requireHit:true`); ground-only, FREE (commits via recovery). Neutral Heavy stays the normal sword
slash `[154]`; Up/Down/Air auto-route.

- **Stages (art / dmg→×0.60):** bardockRush1 `[79]` forward sword thrust opener (40→24) → bardockRush2
  `[163]` big overhead sword slash, long reach (50→30) → bardockRush3 `[129]` rising spin-slash
  **LAUNCHER** w/ red arc trail (84→50), string ends. Cumulative ~104 raw eff (measured 100 on connect
  — on par with Gohan's 101; NOT an outlier). None reuses the neutral heavy `[154]`.
- **★The prompt's OPEN chain question (S0 item / sword↔unarmed), ANSWERED:** direct frame review shows
  the sheet depicts moves as **individual poses with NO baked armed↔unarmed transition frames** — so
  armed/unarmed chaining is a **design decision, not sheet-mandated**. Default implemented: the Blade
  Rush is a **self-contained sword rekka** (sword→sword→sword-launcher), consistent with every sibling
  rekka (they all start from neutral, not as a cancel from a normal). If explicit unarmed-normal→sword-
  rush cancels are wanted, that's a follow-up tuning — flagged, not blocking.
- **Wiring:** `abilities.js` BARDOCK_CMD + `fireBardockCmd` + `updateBardockCommandCombat`; `game.js`
  import + dispatch (`rosterKey==="bardock"`) + `bardockCmd` probe; `characters.js` bardockRush1/2/3
  animationData.
- **★FACING signed off IN-ENGINE:** the rush3 launcher screenshot shows the rising slash + red arc
  reaching RIGHT and P2 launched airborne (3-hit combo) — the two dynamic slash frames read correctly
  after flip.
- **Verification:** `test:bardock-stage3` 11/0 (wiring, none reuse heavy; chain opens→cancels→launcher
  finisher; cumulative dmg 100; finisher displaces P2 Δx≈124; neutral Heavy unaffected) + in-engine
  launcher screenshot. Regression: `bardock-stage1` 23/0, `bardock-stage2` 20/0, `gotenks-stage3` 10/0,
  `gohan-stage3` 10/0 (shared rekka path) clean; game.js/abilities.js/characters.js all parse.

**NEXT = Stage 4 (specials).** ★OPEN owner call: the golden ki-orb `[203,204]` role — resource-build
charge vs procedural-payoff windup (no beam/nova sprite exists to connect it to). No confirmed ranged
special on the sheet (S0 item 4) — flag, don't invent.

## STAGE 4 — SPECIALS (DONE — `test:bardock-stage4` 13/0)

★A small **MELEE** kit — **NO ranged/energy special exists on the sheet (item 4), so none is invented**
(same honest treatment as Goku's melee-only Dragon Fist / Gotenks' cut ki-blast art). Two moves via
`executeBardockSpecial` (mirrors `executeGotenksSpecial`), dispatched in `triggerSpecial` (`case "bardock"`).

- **Rebellion Rush** (neutral / Fwd / AIR) — `abilities.js` BARDOCK_REBELLION: cost 18, a committed
  **dashing SWORD lunge** (`createAttackFromMove` "bardockRebellion", forward `vx` lunge + camera
  focus/shake), single strong hit 100→**60 EFF** (×0.60), hard knockback. **MELEE** — leans into the
  sword differentiator; art = reslice `[49]` (horizontal diving-sword). ★NO projectile (harness-verified).
- **Ki Charge** (Down, ground) — BARDOCK_KICHARGE: no cost, cast pose `bardockKiCharge` `[203,204]`
  (golden ki-orb gather), a **resource-build** granting ~60 Ki in 6 steps over the gather window, **no
  hit**. ★**ANSWERS the S0 open ki-orb role: RESOURCE BUILD** — the faithful reading (no beam/nova payoff
  exists to connect it to; exactly Gotenks' Ki Charge precedent). It fuels Rebellion Rush.
- **★If the owner instead wants the ki-orb as a procedural thrown ki-blast** (Gotenks-style), that's a
  small swap — flagged, NOT inventing sheet art. Open-palm push `[176,177]` stays CUT/preserved.
- **Wiring:** `abilities.js` BARDOCK_REBELLION/KICHARGE + fireBardockRebellion/fireBardockKiCharge +
  executeBardockSpecial + `triggerSpecial` case; `game.js` — (dispatch lives in abilities.js triggerSpecial);
  `characters.js` `specials:` HUD descriptor + bardockRebellion/bardockKiCharge animationData.
- **★FACING signed off IN-ENGINE:** Rebellion Rush screenshot shows the blade reaching RIGHT into the
  foe (−60 connect); Ki Charge shows the golden ki-orb gathered at the hands.
- **Verification:** `test:bardock-stage4` 13/0 (wiring; Rebellion casts move bardockRebellion + renders
  its sheet + connects 60 + lunges Δx≈14 + costs Ki + **spawns NO projectile**; air Rebellion; Ki Charge
  refills +63 Ki with zero P2 damage) + in-engine cast shots. Regression: `bardock-stage1` 23/0,
  `bardock-stage2` 20/0, `bardock-stage3` 11/0, `gotenks-stage4` 12/0 clean; JS all parse.

**NEXT = Stage 5 (transformation — SSJ cosmetic flash, per item 1: a brief visual beat, NOT a playable
alt-state).**

## STAGE 5 — SUPER SAIYAN COSMETIC FLASH (DONE — `test:bardock-stage5` 10/0)

★Built **DEMOTED to a cosmetic visual beat, NOT a playable alt-state** (item 1; same treatment as Goku's
SSJ3 clip). The sheet has only **5 gold-hair frames and NO SSJ combat kit** (no gold idle/walk/normals),
so there is no form to sustain. Wired to the **TAUNT slot** — it plays gold, then reverts to base.

- **Art (montage → sheet):** `bardock_ssjflash_uniform.png` = `[201,199,198,195,200]` — a power-up
  flourish: kneel-charge → rise/arm-up → peak → arms-spread flare → settle. 5f, `loop:false`
  `lockLastFrame:false` (plays once, drops back to base idle).
- **★NOT a form (structurally proven, not just asserted):** no `transformations` system on the char;
  spriteScale/maxHealth unchanged by the flash; the combat kit stays BASE (heavy still resolves the base
  sword sheet, not a gold variant); and the ONLY gold sheet in the entire kit is this cosmetic taunt —
  every other action points at a base `bardock_` sheet. So the gold hair is a transient flash, never a
  sustained state.
- **Revisit clause:** if a full transformed-state sheet is supplied later, restructure into a genuine
  two-form build then (same rule as the S0 caveat) — it is NOT already a transform.
- **Verification:** `test:bardock-stage5` 10/0 (taunt wired to the flash sheet, 5f non-looping; forcing
  it renders the gold sheet; afterwards idle reverts to base `bardock_idle`; heavy stays base sword;
  scale/HP unchanged; no `transformations`; no other gold sheets) + in-engine shot (P1 gold-hair flare
  vs P2 base black-hair). Regression: `bardock-stage1..4` 23/20/11/13, all clean.

**NEXT = Stage 6 (portrait / win / lose / intro / harness / balance — the last stage).** Bardock has
REAL win (arms-crossed, wired S1) AND a REAL adjust-stance intro `[284-297]` (deferred from S1) to
finalize, plus the canonical test + BALANCE_AUDIT (melee-only + sword differentiator — is that enough
compensation vs the shared "no ranged special" review?).

## STAGE 6 — PORTRAIT / WIN / LOSE / INTRO + CANONICAL HARNESS + BALANCE (DONE — `test:bardock` 51/0)

- **Portrait:** real anime face bust #1 (`bardock_portrait.png`, red-headband/scarred — Stage 1).
- **Win:** ✅ **REAL** standing arms-crossed victory pose `[276-281]` (`bardock_win_uniform`, wired S1) —
  on-sheet, **NO borrowing** (unlike Goku/Gotenks who lacked win art).
- **Intro:** ✅ **REAL** adjust-stance entrance `bardockIntro` = `[285,289,294,296,297]` (stand → adjust →
  lean → settle into combat-ready stance, holds last frame); `introPool: ["bardockIntro"]` (replaced the
  S1 idle placeholder). On-sheet, no borrow. Facing signed off (flipped-strip composite → settles
  facing RIGHT).
- **Lose:** reuses knockdown/lying `[271-273]` (no dedicated lose art — flagged).
- **Canonical harness:** `harness/bardock.test.mjs` (`test:bardock` **51/0**) — sprite gate/stats/portrait,
  no-ranged-ult + no-transformations identity, all 25 action sheets resolve (no box), walk borrows idle,
  heavy=SWORD + down_air≠air, a normal connects, the Blade Rush SWORD chain reaches its launcher, Rebellion
  Rush (MELEE, **no projectile**) + Ki Charge (resource build), the SSJ **cosmetic** flash (gold→reverts,
  no form/stat change), win/lose/REAL-intro render, full fallback-box sweep, no JS errors.
- **Balance:** `BALANCE_AUDIT.md` entry added. **★Answers the prompt's Stage-6 question:** melee-only +
  the SWORD differentiator = **FAIR**; the compensation for no-ranged is **extended melee reach** (heavy 48
  EFF long-reach slash + diving/lunging sword approach), the analogue of Gohan's mobility/transform. **He
  does NOT need a bolt-on ranged move.** If anything he sits on the LEAN side — unlike his DBZ siblings he
  has NEITHER a transform ceiling (Gohan) NOR an ult (Gotenks); the SSJ is cosmetic only. So NOT a strong
  outlier. Watch-items: Blade Rush ~100 EFF (in-band), Rebellion 60 EFF/18 Ki (knob: cost/recovery), heavy
  48 EFF reach (single-hit, the identity). First BUFF knob if under-tuned = Rebellion cost 18→14 / small
  Def bump, NOT a ranged bolt-on.
- **Regression:** `test:gotenks` 47/0, `test:gohan` 30/0, `test:piccolo` 38/0, `test:goku` 38/0,
  `test:vegito` 46/0 all clean (shared `rekkaContinue`/`triggerSpecial` + game.js dispatch insertions).
  `test:credits` 12/2 = PRE-EXISTING 7-key debt (Bardock properly attributed, NOT among the 7). All JS parse.

## BUILD COMPLETE — S0–S6 (UNCOMMITTED)

Bardock is a **fully built melee-only bruiser with a real sword differentiator**: movement (S1) · 5
normals + crouchLight w/ sword baked into heavy/down_air/crouchLight (S2) · "Blade Rush" Fwd+Heavy sword
rekka (S3) · Rebellion Rush + Ki Charge melee specials (S4) · SSJ cosmetic flash (S5) · portrait/win/lose/
REAL-intro + canonical harness + balance (S6). Canonical `test:bardock` **51/0**; per-stage 23/20/11/13/10.

**FOLLOW-UPS / OPEN (flagged, not blocking a WIP snapshot):**
- **★CREDITS BLOCKER** — EB sprite-rip author UNKNOWN (flagged placeholder in `credits.js`; MANDATORY
  before ship, same as Goku/Gohan/Gotenks/Piccolo/Frieza).
- Ki-orb as a procedural thrown ki-blast instead of resource-build — owner swap, one-function change (flagged).
- Explicit unarmed-normal → sword-rush cancels (S3 chain-question follow-up tuning).
- Skins; voice (blocked, no clips); dedicated lose art (reuses knockdown); the unused sword-stance/sweep,
  backflip, overhead double-fist, and 2nd combat-idle-variant reserves.
