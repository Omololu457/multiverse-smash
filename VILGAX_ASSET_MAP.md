# VILGAX — STAGE 0 Asset Map & Investigation Report

**Scope:** single character, single form (Vilgax — green squid-faced head/tentacle "beard",
green right arm, dark-blue armored body, gold gauntlet on left arm, blue boots). One depicted
fighter; no alt-palette swatches on the sheet.

**Source sheet:** `vilgax_jus_sprite_sheet_by_regulardor8go_dcdyjb3-fullview.jpeg`
**(1024 × 2474 px, RGB — JPEG, NO alpha).** Fan-made JUS-style sheet. **Credit: regulardor8go.**
NOT an official game rip.

**Template note (flagged, NOT acted on):** identical category/label template as **Superman 2**
(`dcna8ch…`) and franchise-sibling **Gwen Tennyson** — same B / Y / X button naming, same
"Koma Atakes" ult label. Per this project's standing rule this is built **fully standalone**;
no engine/art cross-borrowing from Superman 2 or Gwen despite the shared template.

**Segmenter tool:** `tools/vilgax_stage0_boxes.py` — background is a **flat bright-orange JUS
field `(255,127,38)`, fully opaque** (JPEG → key with `|Δrgb|<50`, which is clean: the five
empty rows measure **exactly 0 sprite px**). Red label bars `(241,26,44)` sit at the far LEFT
of every populated row; frames run to the right. `python3 tools/vilgax_stage0_boxes.py` prints
the per-row content table below; `… montage` writes per-row 2× strips to `/tmp/vilgax_row_*`.

> **This report was produced by directly rendering + reading the sheet** — all 22 label bars
> read at 8× zoom, every populated row viewed at 2× (intro/stance/run/jump/guard, all normals,
> both sword specials, both red blasts, teleport, the Koma Atakes ult band, hurt/win/lose), and
> the four reference images inspected. Row content is **pixel-measured**, not trusted from the
> audit.

---

## 1. Confirmed technical facts (verified directly)

- **Background** = flat orange `(255,127,38)`, **90.2%** of the sheet; all corners exact. The
  reslice must **key orange → transparent**.
- **No alpha** (JPEG, RGB). Keying is by background COLOR + a small tolerance for JPEG ringing.
- **No per-cell grid.** Rows are organized by **left-edge red text labels**; frames float on
  orange to the right of each label, moated by background. Segmentation = row-band + per-frame
  connected components.
- **Whole sheet faces RIGHT** (like most JUS sheets) — reslice `FLIP_H = False`; mirror for the
  P2/left-facing side in-engine.
- **Palette:** green squid head/tentacles + green right arm `~(70,120,40)`; dark-navy body armor
  `~(25,30,70)`; gold gauntlet `~(210,160,40)`; blue boots/greaves `~(90,120,190)`; maroon cape/
  collar accent. Red energy blasts `~(230,40,50)` (Down+Y / X / Koma beams); green energy sword
  + the "Ultimate Action" aura `~(120,220,90)`; dark-blue vanish silhouette for teleport/win-fade.

---

## 2. The 22 labeled rows (full inventory, in sheet order)

Pixel counts from `tools/vilgax_stage0_boxes.py` (frames left of x155 are clipped by the
label-column guard → counts for left-hugging rows are conservative; **EMPTY = truly 0 anywhere**).

| # | Label | y-band | Content | Frames (approx) |
|---|---|---|---|---|
| 1 | **INTRO** | 41–79 | walk-in → 2 red-silhouette flash frames → ready pose | 4 + 2 flash + 1 |
| 2 | **STANCE** (idle) | 79–152 | real breathing loop | 4 |
| 3 | **RUN** | 152–238 | alternating stride into a lunge dash | 8 (no separate Walk) |
| 4 | **JUMP** | 238–331 | ascent arc | 4 |
| 5 | **GUARD** | 331–412 | block; **mid-sequence yellow energy-barrier** payoff | 7 |
| 6 | **ULTIMATE_ACTION** | 412–499 | ⚠️ **NOT in the build prompt** — green-energy charge / power-up stance (fist raised, green aura builds) | 3 |
| 7 | **B** (normal) | 499–577 | claw swipe (+ small speck) → **green tentacle-whip arc** | ~3 + whip |
| 8 | **FORWARD+B** | 577–661 | draw **green energy sword** → horizontal slash arc → ends holding sword extended | 5 |
| 9 | **UP+B** | 661–823 | **teleport/vanish** — shrinks to a small dark silhouette | 3 |
| 10 | **DOWN+B** | 823–888 | — | **EMPTY (0 px)** |
| 11 | **AERIAL_B** | 888–968 | diving attack with tentacle-swipe trail | 4 |
| 12 | **Y** | 968–1101 | — | **EMPTY (0 px)** |
| 13 | **FORWARD+Y** | 1101–1190 | draw sword overhead → **throw** → 4 spinning-blade projectile frames | ~4 + 4 proj |
| 14 | **UP+Y** | 1190–1283 | — | **EMPTY (0 px)** |
| 15 | **DOWN+Y** | 1283–1368 | 5-stage growing **red** spiky charge → fired forward as a red blast | ~7 |
| 16 | **AERIAL_Y** | 1368–1454 | aerial tumbling attack | 7 |
| 17 | **X** | 1454–1534 | red charge → **bigger, jagged/explosive** burst → fired as a sharp red lance | ~7 |
| 18 | **X+UP** | 1534–1678 | — | **EMPTY (0 px)** |
| 19 | **KOMA_ATAKES** (ULT) | 1678–2058 | multi-beam red eye-laser barrage: 2 spiky charge-bursts narrowing into 2 fired beams; **+2 embedded show screenshots** on the left | ~8 (+ 2 screenshots) |
| 20 | **HURT_FALL_GETUP** | 2058–2146 | flinch → fall → lying flat → rise | 5 |
| 21 | **WIN** | 2146–2237 | 3-frame triumphant fist-raise (+tentacle flourish) → **2 shrinking-silhouette fade** frames (reuses UP+B / vanish language) | 3 + 2 |
| 22 | **LOSE** | 2237–2474 | — | **EMPTY (0 px)** |

---

## 3. STAGE 0 investigation items — RESOLVED

### Item 1 — the five empty inputs are genuinely empty ✅ (re-verified, not trusted)
Fresh pixel measurement (`vilgax_stage0_boxes.py`): **Down+B, Y, Up+Y, X+Up, and Lose each
contain 0 sprite pixels anywhere in their row band.** Confirmed empty independent of the audit.
→ Do **not** silently break these; do **not** fill with borrowed content (incl. Superman 2 /
Gwen). Report as **open art/design dependencies** (see §6).

### Item 2 — Forward+B vs Forward+Y share a sword? → **INDEPENDENT, each draws its own**
Direct frame reading: **both moves materialize the energy sword from scratch within their own
animation** — Forward+B draws it at frame 3 then slashes (ending holding it as a follow-through
pose); Forward+Y draws it overhead then **throws** it. The blade is a **materialized green
ENERGY sword**, not a persistent physical weapon carried between moves; idle (Stance) shows no
sword. **Reading: two fully independent specials — no shared-weapon depletion, no state where
Forward+B leaves Vilgax "sword-less" for Forward+Y.** Recommend building them separately with
**no cross-move weapon resource/interaction.** *(High confidence — but see §5 for owner sign-off.)*

### Item 3 — Down+Y vs X: same power or separate? → **SAME red-blast family, X = heavier tier**
Both are the **same red-energy charge-and-fire** attack (identical red palette, same
charge→grow→fire structure, both fired forward). Differences: **Down+Y** grows a smooth spiky
pinecone/leaf burst → rounded red blast, from a low braced stance; **X** grows a **larger,
jagged/explosive star-burst** → a sharper red **lance**, from a taller stance. Reading: **X is
the heavier/explosive tier of the Down+Y power**, not an unrelated attack. Two viable builds:
(a) **one special with a charged/heavy tier** (Iron Man 3 / Genos tiered-charge precedent), or
(b) two separate-but-related specials on their own buttons. **Owner decision (§5)** — do not
build X as a fully unrelated third power.

### Item 4 — reference renders/screenshots are non-gameplay ✅ → EXCLUDE all 4
- **Render A:** top-right full-body **3D model render** (green arms, standing), x≈560–870,
  y≈0–330.
- **Render B:** mid-right **3D/stylized render** of Vilgax **holding a sword raised overhead**,
  x≈630–900, y≈480–720.
- **Screenshot A:** inside the Koma Atakes band (top-left) — Vilgax firing **red converging
  lasers** (the direct Stage-5 reference).
- **Screenshot B:** inside the Koma Atakes band (lower-left) — Vilgax in a city, flying/fire.
All four are **reference/HUD material only — excluded from the runtime atlas** (same treatment
as Gwen's credit art / Piccolo's portrait band). Usable as design + portrait reference.

---

## 4. Stage-by-stage forward map (previews only — no code yet)

- **S1 (registration + movement):** intro [4+2 flash+1] · stance [4] · run [8] (no walk — reuse
  stance/idle or run for walk per project norm) · jump [4] (fall = apex reuse) · guard [7]
  (barrier payoff mid-sequence) · hurt→fall→getup [5]. Orange-key reslice, FLIP_H=False.
- **S2 (normals):** **B** claw→tentacle-whip; **Aerial B** diving tentacle-swipe. ×0.60. *(Only
  two catalogued normals — this sheet is special-heavy; light/heavy/up/crouch normals will lean
  on B + reuse, flagged at S2.)*
- **S3 (chains):** **NONE** — no chain/combo-tree notation on the sheet. Do not invent.
- **S4 (specials):** Energy-sword slash (Fwd+B) · Thrown spinning sword (Fwd+Y) · Teleport (Up+B)
  · Red charge-blast (Down+Y) · Heavier red blast (X — **pending item-3 decision**) · Aerial
  tumbling attack (Aerial Y). **Plus ULTIMATE_ACTION (§5) — undocumented green-energy pose,
  role TBD.**
- **S5 (ULT):** **Koma Atakes** multi-beam red eye-laser barrage — freeze/camera-focus cinematic
  (project ult convention). Screenshot A is the direct source match.
- **S6 (portrait/win/lose/harness/balance):** portrait = idle/stance bust; **win** = fist-raise
  + vanish-fade (real art, ties to Up+B teleport intentionally); **lose = EMPTY → open art dep**
  (§6). Harness + BALANCE_AUDIT last; five empty input slots → viability call (§5.6).

---

## 5. Open decision items (STOP — owner input needed before Stage 4)

1. **Forward+B ↔ Forward+Y sword (item 2):** recommend **two independent specials, no shared
   weapon**. Confirm (or specify a draw-once/throw-consumes state machine if desired).
2. **Down+Y ↔ X (item 3):** recommend **one red-blast power, X = charged/heavy tier** (or two
   related specials). Confirm which. Not a third unrelated power by default.
3. **⚠️ ULTIMATE_ACTION row (NEW — not in the prompt):** 3-frame green-energy charge/power-up
   pose. Candidate roles: (a) the **ult activation/trigger pose** that pairs with Koma Atakes
   (Iron Man "Super pose" precedent), (b) a **self-buff/charge** special, or (c) a taunt.
   **Needs an owner call** — do not assign a role just to close it.
4. **Empty inputs (Down+B, Y, Up+Y, X+Up):** ship with these slots **unused**, or **design new
   moves/art** to fill them? (See §6 — genuine gaps.)
5. **Lose pose:** genuinely empty. **Source real art** vs **S6 stopgap** (reuse the fall/lying
   knockdown frame). Recommend stopgap-with-flag, real art as follow-up.
6. **Ship viability with 5 empty slots:** is the currently-populated kit (2 normals + ~5–6
   specials + ult + full movement) **viable to ship as-is** with the empty slots simply unused,
   or must the gaps be filled first? Recommend **viable to ship** (rich special kit; empties are
   non-blocking), with empties tracked as open follow-ups — pending owner agreement.

---

## 6. Missing content (real gaps — not inferred, not to be borrowed)

- **Down+B, Y, Up+Y, X+Up** — 4 empty input slots (0 px). New design/art required if filled.
- **Lose** — no defeat pose (0 px); only art is the HURT fall/lying frame. Open art dependency.
- **Credit / attribution:** spritework credited **regulardor8go**; the underlying character is
  Ben 10 IP (Cartoon Network). Rip/edit authorship beyond regulardor8go is **UNKNOWN** — treat
  as a **credits BLOCKER** to resolve before ship (project standing rule).

**STOP per prompt — Stage 0 is report-only. Awaiting owner decisions on §5 items 1–6 before any
Stage 1 registration / gameplay code.**

---

## 7. OWNER DECISIONS — LOCKED (2026-08-23)

1. **Sword (Fwd+B / Fwd+Y) = INDEPENDENT** — each draws its own energy sword, no shared weapon /
   no depletion state.
2. **Down+Y ↔ X = ONE red-blast power, X = HEAVY/CHARGED TIER** (single special w/ a charged
   tier — Iron Man 3 / Genos precedent). NOT two unrelated powers.
3. **ULTIMATE_ACTION row = ULT ACTIVATION / TRIGGER POSE** — the windup that pairs with Koma
   Atakes (Iron Man "Super pose" precedent). Not a standalone buff/taunt.
4. **Empty slots (Down+B, Y, Up+Y, X+Up) = SHIP UNUSED**; **Lose = S6 stopgap** (fall/lying
   knockdown frame). Real fills tracked as follow-ups; kit ships without them blocking.

Cleared to proceed to **Stage 1 (registration + movement)**.

---

## 8. STAGE 1 — DONE (2026-08-23, `test:vilgax-stage1` 28/0)

`tools/reslice_vilgax.py` (orange key-by-COLOR tol 64 + per-cell despeckle; per-row label-banded
connected components; FLIP_H=False — whole sheet faces right) + **5-file registration**
(characters / spritesheets / skins / credits / package). **HP1200 / EN200 / Atk90 Def88 Spd82 /
scale 2.5 → idle 105px on-screen (roster mid-band) / energyType "plasma" / universe "ben10" /
scaling "power" / mobility "medium".** Movement picks (row → frame indices):
- **intro [0-6] REAL own art** (rare): 4 walk-in dark-silhouette → 2 red-flash → ready pose ·
  idle=STANCE [0-3] · guard=[2,3,4] holds the **full yellow energy barrier** (lockLastFrame) ·
  walk=RUN [0-7] borrow (no walk on sheet; slower speed) · run=[0-8] own 9f stride ·
  dash=run's lunge pose (idx 8, sourceX 368; no dedicated dash) · crouch=idle[0] stopgap
  (no crouch on sheet) · jump=[0-3] (fall=apex reuse, sourceX 93) · hurt=[0] flinch ·
  knockdown=HURT[2,3,4] (fall→flat→rise; flat idx1 = LOSE-pose stopgap).
- **JPEG orange-halo speckle** cleaned via tol 64 + despeckle(<14px opaque floaters); gold
  gauntlet (Δ80) / red flash (Δ121) / green all stay clear of the key.
- Portrait = squid-face + shoulders bust from idle (NEAREST-scaled to 288px).
- **In-engine verified** (harness/shots/vilgax_stage1_*): feet planted, correct palette, guard
  barrier renders live. Regress **gwen-stage1 27/0** clean; roster integrity 97 chars, no dupes.
- **Stopgaps flagged (S6 follow-ups):** crouch (idle reuse), dash (run-lunge reuse), walk
  (run-stride borrow) have no dedicated sheet art. Lose = knockdown flat frame (owner-locked).

---

## 9. STAGE 2 — Normals DONE (2026-08-23, `test:vilgax-stage2` 19/0)

Special-heavy sheet → only **2 ground + 1 aerial** pose exist. The **B row is a claw→tentacle-whip
sequence** → SPLIT into two REAL distinct poses (not invention); the rest are HONEST reuse. ×0.60
via GLOBAL_DAMAGE_SCALE.
- **light** = B claw swipe [0,1,2] (quick reach) — 44→26.
- **heavy** = B green **TENTACLE-WHIP arc** [4,5,6] (long reach, big sweep) — 84→50.
- **up/launcher** = REUSE heavy (upward tentacle arc = anti-air) — 66→39.
- **air** = REAL **Aerial-B dive** [0,1,2,3] w/ tentacle-swipe trail — 54→32.
- **down_air** = REUSE air dive — 72→43. **crouchLight** = REUSE light claw — 40→26.
- ★B row's 8th detected box (w132) = the mid-right sword-raised RENDER bleeding in → excluded via
  ROW_XLIM `B/FORWARD_B/UP_B = (0,600)`. B = 7 real frames.
- All 6 normals connect in-engine (dmg numbers verified); poses read correctly (green tentacle in
  heavy/up, dive in air). **S3 command chains = NONE** (no chain notation on the sheet — per prompt).
- Regress gwen-stage2 17/0 clean.

---

## 10. STAGE 4 — Specials DONE (2026-08-23, `test:vilgax-stage4` 28/0)

Fixed-slot sword/blast bruiser — `executeVilgaxSpecial` + `VILGAX_SPECIALS` (abilities.js), mirrors
executeGwenSpecial (slots) + fireYamamotoShunpo (blink) + Iron Man 3 charge-tier infra. Owner
decisions honored. ×0.60 EFF at hit.
- **N = Plasma Blast (TIERED tap/hold)** — armed in game.js (`_vilgaxBlastArmed`), resolved on
  Special RELEASE (`handleVilgaxSpecialRelease` → `fireVilgaxBlast`; threshold 260ms). **Tap = base**
  (procedural red spiky burst, cast `vilgaxBlastCast`, 90→54, r22). **Hold = heavy** (`vilgaxBlastXCast`,
  bigger w78/r40, **piercing**, cost 55, 138→82). ★Honors owner decision #2 (one power, X = heavy tier).
- **F = Energy-Sword Slash** — melee disjoint (`createAttackFromMove`, rangeX 122), real sword art
  `vilgaxSlash`, 100→60.
- **B = Thrown Spinning Sword** — REAL 4-frame spinning-blade sprite projectile `vilgax_sword_uniform`
  (animates + flips to travel), cast `vilgaxThrow`, 96→57. ★INDEPENDENT of Fwd+B (own energy sword).
- **U = Teleport** — blink to the far side of the foe (`fireVilgaxTeleport`, mirrors Shunpo), i-frames
  (invulnTimer 22) + clone-puff FX, cast `vilgaxVanish`, cost 20, no dmg (utility).
- **air = Aerial Tumble** — spinning aerial disjoint `vilgaxTumble` (7f), 78→46.
- **D = unused** (owner: extra slots ship empty).
- ★Art slicing gotchas: FORWARD_Y spinning blades <120px → `min_sz=100`; UP_B teleport silhouettes
  bridged by the JPEG ground-line → `drop_white` + narrow window `(0,75)` (stance + 1 vanish frame).
  Sword projectile `center_align` (rotates around center, not feet).
- game.js wiring: arming block + `handleVilgaxSpecialDown/Release` + keydown/keyup dispatch (P1+P2) +
  `fireVilgaxBlast` import + `vilgaxBlast(tier)` harness hook. `specials` HUD meta on the char def.
- All 6 specials render + connect in-engine (heavy blast visibly a large red burst). Regress
  gwen-stage4 27/0 + **iron-man-3 37/0** (shared charge-tier input infra) clean.

---

## 11. STAGE 5 — Ultimate "Koma Atakes" DONE (2026-08-23, `test:vilgax-stage5` 9/0)

The sheet's ULT band, built as the ULT. `executeVilgaxUltimate` + `VILGAX_ULT` (abilities.js) — INLINE
freeze-cinematic on the LIVE fighter (Gwen/Green-Lantern pattern, NO duplicate instance).
- **Trigger pose = `vilgaxUltAction`** — the undocumented **ULT_ACTION green-energy charge** row
  [0,1,2] (owner decision #3: that row = the ult activation pose). Live fighter holds it across the
  70f cinematic; camera focuses + foe frozen (hitstop).
- **Multi-beam FX = `vilgax_komabeam`** — the KOMA fired-beam sprites [7,8,9,10] (2 spiky red bursts →
  2 fired lances), **caster stripped** via `keep_red` (bright-red-only mask + autocrop → drops the
  baked-in Vilgax figure). Each damage beat manifests **TWO converging beams** (upper/lower Y-offset)
  at the foe at growing scale; the payoff adds a giant 2.1× finish beam. visualOnly (damage is the
  guaranteed beat).
- **5 beats**: green charge telegraph (0) → beam volley ×3 (60+60+70) → CONVERGING finish (140,
  knockdown). **330 raw → EXACTLY 198 EFF** (×0.60, top-ult band). Guaranteed range-independent
  (`applyScaledDamage`), verified sure-hit from 150px out.
- Dispatch: `case "vilgax"` in triggerUltimate. ult name "Koma Atakes" cost 100.
- In-engine verified: Vilgax holds green pose, converging red beams strike the frozen foe (101 FX
  sightings). Regress gwen-stage5 9/0 (mirrored path) + vilgax-stage4 28/0 clean.

---

## 12. STAGE 6 — Portrait / win / lose / canonical / balance — CHAR COMPLETE (2026-08-23, `test:vilgax` 39/0)

- **Win (REAL art):** `vilgax_win_uniform` = WIN row [0-4] — 3-frame triumphant fist-raise (green
  tentacle flourish) → 2 shrinking-silhouette **vanish-fade** frames (reuses the Up+B / teleport vanish
  language, by design). Wired `animationData.win`, play-once + lockLastFrame.
- **Lose (STOPGAP):** reuses `vilgax_knockdown_uniform` holding the flat downed frame (frames:2 +
  lockLastFrame). The Lose slot is genuinely empty on the sheet (owner decision #4) — flagged open dep.
- **Intro (REAL art):** already wired S1 (`vilgax_intro_uniform`, walk-in + red-flash + ready). Vilgax
  is one of the few chars with real intro AND win art.
- **Portrait:** `vilgax_portrait.png` — squid-face + shoulders bust from the idle stance (recognizable;
  minor JPEG halo — refine banked).
- **Canonical harness:** NEW `harness/vilgax.test.mjs` (`test:vilgax` **39/0**) — S1 gate/stats +
  movement (incl. intro), S2 normals connect, S4 all 5 specials (tiered blast / slash / thrown sword /
  teleport reposition / tumble), S5 ULT ~198 EFF + Koma FX, S6 win/lose wiring, full fallback-box sweep,
  no JS errors.
- **BALANCE_AUDIT.md:** full entry added — fair sword/blast bruiser (HP1200/Def88 tanky, Spd82 below-avg;
  heavy blast 83 EFF gated behind full charge; ult pinned to the ~198 top-ult band; no outlier).
- Regression: full vilgax suite green (s1 28 / s2 19 / s4 28 / s5 9 / canonical 39); **gwen 37/0 +
  iron-man-3 37/0** clean. Credits test's 2 failures are PRE-EXISTING (7 unrelated chars) — Vilgax IS
  attributed (`vilgax: {...}` → regulardor8go).

**★CHAR FULLY COMPLETE S0-S6.** Follow-ups (banked): deeper rip-author attribution (ship BLOCKER),
bespoke Lose art + the 5 empty input slots (Down+B/Y/Up+Y/X+Up — owner: ship unused), portrait polish,
skins, voice (blocked), Koma beam-FX bespoke art. UNCOMMITTED.
