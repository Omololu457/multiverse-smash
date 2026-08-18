# YUTA OKKOTSU — Asset Map & Stage 0 Investigation Report

**Roster key (proposed):** `yuta`  |  **Universe:** Jujutsu Kaisen (JJK)
**Sheet credits (carry forward):**
- Yuta: *Made by Soulfire — Petamynx, Dano, Santoryu*
- Rika: *Made by Soulfire — V2 remodel thanks to shaulmorales*

**Status:** ✅ FULL 6-STAGE BUILD COMPLETE (test:yuta canonical 30/0; per-stage 25/13/15/21/12; regression
deathstroke/aoi-todo/onoki all 0-fail; credits yuta ATTRIBUTED, 2 fails PRE-EXISTING toji/pain/etc).

### STAGE 6 — win/lose + canonical + balance + credits (DONE): win = repurposed row_16 empowered stance
(yuta_win_uniform, no bespoke victory art — FLAGGED); lose = REUSE knockdown lying pose (FLAGGED). NEW
yuta.test.mjs canonical (STATIC sheet+portrait sweep, full-kit, 27-action fallback-box sweep). BALANCE_AUDIT
entry (VERSATILITY schema-exception Deathstroke/GL/Aoi-Todo class; 2 levers: Rika duration/interval + RCT
cost/heal; Cursed Speech 42f stun watch-item; nerf order Rika→RCT→stun→stats→dmg-last). credits.js SOURCED_ART
yuta (Soulfire/Petamynx/Dano/Santoryu + shaulmorales Rika). **CHAR BUILD COMPLETE.** FOLLOW-UPS: deferred
kick/aerial chains; skins; voice (BLOCKED no clips).

### STAGE 5 — Rika's Invocation ULT (DONE): owner decision #8 = AI ASSIST-ALLY. executeYutaUltimate mirrors
executeOnokiUltimate (invocation cast row_16 "yutaUltCast" → focusCameraOnAction cinematic → schedulePendingSpawn
hands off to PERSISTENT summons.js `rikaAssist`). Rika (V2 art: rika_idle/reach/screech/spawn @ common 150×130
cell, scale 1.3) emerges → advances → strikes on 50f interval for ~6s (duration 360, oneHit:false), idle↔reach/
screech pose-swap (updateRikaAssistPose, onokiGolem pattern). ★Per-hit damage 55 ×0.60 = ~33 → 5 strikes = −198
(roster-standard ULT payoff; the Megumi-flagged summon shape stays SCALED). cost 100. ultimate field + triggerUltimate
case + sprite identity map added. Regression onoki-s5 10/0.

### STAGE 2 — normals (DONE): 5 slots, ×0.60 exact. light=Kick1(row_07)/heavy=Attack1(row_06)/up=Up
Attack launcher(row_11)/air=Air Kick(row_11)/down_air=REUSE air. No crouchLight (crouch=idle). 13/0.
### STAGE 3 — sword combo (DONE): Fwd+Heavy 3-stage rekka Attack1→Attack2→Attack3 thrust (cancel-on-hit,
shared rekkaContinue). combo1 REUSES heavy=Attack1 art; combo2/3 new sheets. updateYutaCommandCombat +
game.js dispatch + sprite identity maps + yutaCmd() probe. ★harness driver must use ONE combined probe/
frame (extra awaits drift the tap past the short cancel window). 15/0.
### STAGE 4 — specials (DONE): TRIMMED 5-slot executeYutaSpecial (router case + _specialHeldDir) —
N=Cursed Energy Manip (procedural cyan beam) / F=Strong Attack (advancing sword, folds Cursed Tool:Katana) /
D=Kick 4 (dark cursed-energy wing, LAUNCHER — promoted per decision #2) / U=Cursed Speech (procedural
short-range shout, HEAVY stun 42) / B=Reverse Cursed Technique (self-heal +120, cost60/slow cast = punishable).
Focused Meditation CUT (folded into RCT). All melee ×0.60. 21/0.

STAGE 0 investigation COMPLETE.

### STAGE 1 — registration + movement (DONE 2026-08-18)
- NEW `tools/reslice_yuta.py` (auto-strips purple label band via first empty gap; content-bbox
  repack, centered-X, bottom-aligned anchorY:0). Emits 7 uniform strips.
- Registered: characters.js (`const yuta`, HP1150/EN200/spd94/scale1.9 cursed_energy, movement.crouchIdle,
  export), spritesheets.js gate, skins.js default. energyType label already existed (no ui.js change).
- Movement: idle(row_02 Stand,10f)/crouch(row_02,1f)/walk(row_03 Walk1,7f)/guard(row_05,4f) +
  hurt(row_04,2f)/knockdown(row_04,2f)/getup(row_04,2f) — real KO art. HONEST reuses: run/dash=walk,
  jump/fall=idle (no dedicated run/jump art — confirmed gap). Portrait = carved row_01 header bust.
- In-game body height 101px (scale 1.9), no fallback box, no clip. Clips: harness/shots/yuta_stage1_*.png.

 First-hand visual pass done on all 16 Yuta rows,
all Rika V1 (4 rows + 4 UNRESOLVED) and V2 (11 rows + 1 UNRESOLVED) sheets. No gameplay code
written. Blocked on owner decisions below (esp. Rika architecture).

Registration check: no `yuta`/`rika` symbols exist anywhere in characters.js / spritesheets.js /
abilities.js / summons.js — clean slate, key is free.

---

## A. YUTA — verified frame-by-frame (all 16 rows confirmed against audit labels)

Every audit label matched the actual pixels. Corrections/notes flagged with ★.

| Row (file) | Left set | Right set | Notes |
|---|---|---|---|
| 01 header | Portrait bust (clean, upper-body, uniform) | — | ★ Usable PORTRAIT source — see §D. |
| 02 | **Stand** (idle, sword held loosely across body) | **Crouch** | Confirmed. |
| 03 | **Walk 1** (~7f, sword drawn low) | **Walk 2** (4f, different cadence, arms in) | ★ Walk 2 = distinct slower/relaxed walk, NOT a jump/advance. Usable as walk-variety or backward-walk. |
| 04 | **Hurt** (knockback→fall→lie→getup) | ★ **Walk/advance set** (3f, sword low) | ★ row_04 second set reads as a walk/advance cycle, NOT jump. Redundant with row_03 walks → hold as backup. |
| 05 | **Guard** (4f defensive) | **Meditation/Channel** (1 held frame, purple energy) | Single channel frame — see Focused Meditation decision. |
| 06 | **Attack 1** (5f, ends lunge thrust) | **Attack 2** (5f, sword swings) | Sword combo string part 1–2. |
| 07 | **Attack 3** (6f thrust/follow-through) | **Kick 1** (4f basic kick) | Combo finisher + basic kick. |
| 08 | **Kick 2** (6f spinning) | **Kick 3** (5f aerial flip) | Kick chain 2–3. |
| 09 | **Kick 4** (dark cursed-energy WING/trail sweep) | — | ★★ Clearly SPECIAL-tier: huge black/purple energy blade arc, not a basic kick. |
| 10 | **Strong Attack** (heavy charged swing, green arc) | — | Special-tier. |
| 11 | **Up Attack** (anti-air sword, white slash) | **Air Kick** | Confirmed. |
| 12 | **Air Attack 1** (aerial sword) | **Air Attack 2** (dash thrust fwd) | Aerial chain 1–2. |
| 13 | **Air Attack 3** (rising slash) | **Air Attack 4** (descending slash to ground) | Aerial chain 3–4. |
| 14 | **Cursed Speech** (incantation, glowing-hand-to-mouth windup) | **Cursed Tool: Katana** (draw + swing) | Two specials share this row. |
| 15 | **Reverse Cursed Technique** (self-heal channel, greenish) | **Cursed Energy Manipulation** (energy thrust/beam, 8f) | Canonical RCT self-heal + energy thrust. |
| 16 | **Rika's Invocation** (draw sword → kneel/channel → empowered stance) | — | ULT trigger sequence. ★ ~frame 2–3 shows an orange kneeling manifestation (Rika beginning to emerge). |

**Yuta content gaps (confirmed, none invented):** no dedicated jump/fall art (reuse idle/air),
no dedicated run art (reuse Walk 1 sped up), no win-pose, no lose-pose, no intro art.

---

## B. RIKA — confidence pass (Stage 0 items 1–4 RESOLVED)

Two versions on disk. **V2 "remodel" is the primary** — higher fidelity, near-complete moveset,
same design (white/grey curse, blue chest crystal, dark serpentine tail, fanged maw, red eye).

### V2 (primary) — 11 rows + 1 UNRESOLVED
| Row | Content |
|---|---|
| 01 header | Portrait (open fanged maw, red eye) |
| 02 | Idle/hunched (5f, blue crystal) **+ loose screech-head & limb parts** |
| 03 | Reach (2f claws, blue eye glow) + loose parts |
| 04 | Reach/lunge attack (5f, claws extended) + loose parts |
| 05 | Rising attack (7f, incl. blue-energy horizontal sweep) |
| 06 | Crawl/advance (6f) + one floating pose |
| 07 | **Screech/roar attack** (6f, head-back, arms out) |
| 08 | Windup/recoil (2f) |
| 09 | **Death/dissolve** (7f → disintegrates into blue+white particles) |
| 10 | **Spawn/emerge** (5f, head rises from coiled tail) |
| 11 | **Spawn/emerge** (5f) — ★★ near-identical to row_10, confirmed WIP DUPLICATE → build ONE, drop the other |
| UNRESOLVED_01 | Composited crawl/reach/claw-swipe (orange trail) — already covered by clean rows — + loose arm/claw/tail parts for optional custom compositing |

### V1 (superseded, but has UNIQUE content — item 2)
| Row | Content |
|---|---|
| 01 header | Portrait (feral head, teeth) — "By Soulfire" |
| 02 | Crawl/reach (motion-trail lunge) |
| 03 | Single hunched claw-forward pose |
| 04 | Reach/emerge (ends mouth-open elongated) |
| UNRESOLVED 01–04 | Full composited anims (idle/crawl/screech/reach/death) + ★ **unique "melt into shadow" despawn** (blue-ring/portal frame, no V2 equivalent) + ★ a large detailed FULL-BODY hero render (portrait/cinematic quality) + loose limb parts |

**Item 1 (Rika confidence pass): DONE.** **Item 2 (V1 vs V2): V2 supersedes; V1's only
unique keepers = the shadow-portal despawn + the full-body hero render.** **Item 3 (v2 10/11
dup): CONFIRMED duplicate.** **Item 4 (UNRESOLVED slicing): the clean rows already cover every
distinct animation; UNRESOLVED sheets add only loose composite parts + V1's unique despawn/render.**

Rika has a full independent moveset (idle, crawl, reach-attack, screech, windup, death-dissolve,
spawn) — enough to support any of the three architectures below.

---

## C. OWNER DECISIONS — LOCKED (2026-08-18)

1. **Rika architecture = (a) AI ASSIST-ALLY.** Build on the Pain "Six Paths Summon" /
   Mayuri-Nemu / Zaraki-Yachiru assist engine. ⚠ MUST be ×0.60-scaled and balance-scrutinized
   the same way Megumi's removed summons were (independent-attacking summon = known outlier shape).
2. **Kick 4 = PROMOTED to a dedicated cursed-energy special** (not a normal chain finisher).
3. **Cursed Tool: Katana = a plain draw-and-cut attack special** (no disarm state, no stance-swap).
4. **Kit = TRIMMED fixed 5-slot directional special set.** Working set to reconcile at Stage 4:
   Strong Attack, Kick 4, Cursed Speech, RCT self-heal, Cursed Energy Manipulation beam. Cursed
   Tool: Katana + Strong Attack + Cursed Energy Manip overlap (all heavy sword-energy) → merge/pick
   during Stage 4 design. **Focused Meditation** (1 held frame) → fold into RCT or cut (not its own slot).
5. Portrait = header bust (row_01). Rika ult splash = V1 full-body render (optional).

### Original open questions (now resolved above)

1. **★ RIKA ARCHITECTURE (item 8) — the blocker for Stage 5.**
   - (a) **AI assist-ally** — Rika summoned as an AI-controlled temporary ally with her own
     attacks (reuse Pain `updatePainAssistCombo` / Mayuri `updateMayuriNemuAssist` / Zaraki
     Yachiru). ⚠ Balance-flagged shape (independent-attacking summon — the Megumi problem);
     must be ×0.60-scaled and scrutinized.
   - (b) **Player companion-swap** — swap control to Rika for a window, live-caster-only
     (reuse Ghostface `triggerGhostfaceSwap` / Aoi Todo Boogie-Woogie). Highest skill ceiling.
   - (c) **Visual/buff overlay** — Rika sprites as flavor + a Yuta self-buff, no independent
     hitbox. Safest, simplest, lowest balance risk.
2. **Kick 4 (item 9)** — reclassify. My finding: clearly special-tier (dark energy wing). Normal
   chain finisher vs promote to a special.
3. **Cursed Tool: Katana (item 7)** — relationship to the (already-armed) default idle:
   stance-swap unarmed↔armed / re-summon after disarm / just a draw-and-cut attack special.
4. **Focused Meditation** — resource/energy-build self-buff utility vs cut (only 1 held frame).
5. **Cursed Speech** — standalone attack-cast (projectile/debuff) vs cast-time modifier.
6. **Special-roster breadth** — 6 special candidates (Strong Attack, Kick 4, Cursed Speech,
   Cursed Tool Katana, RCT heal, Cursed Energy Manip) + meditation. Breadth is a recurring
   balance flag in this roster — may trim to a fixed 5-slot dir-special set.

---

## D. ART GAPS (item 10 — deferred, none invented)

- **Portrait:** ★ header bust (row_01) is clean and usable — recommend using it (not a true gap).
- **Win / lose / intro:** none exists. Deferred as open art dependencies.
- **Rika full-body render** (V1 UNRESOLVED_03) is available for an ult splash / Rika portrait.

---

## E. TOOLING PLAN (Stage 1, once decisions lock)

- New `tools/reslice_yuta.py` (pattern of reslice_aoi_todo / reslice_mayuri): the rows are
  already split into per-row PNGs; the reslicer will index individual frames per action and
  strip the purple label headers (precedent: boruto strip_blue_labels).
- Rika frames resliced only for the architecture actually chosen (assist body / swap fighter /
  overlay flavor).
