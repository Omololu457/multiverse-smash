# Goku Build — PROGRESS

Branch: `feat/goku` (off `origin/main`). Never merged/pushed to main by me.
One commit per phase; branch pushed after each phase.

## Baseline (origin/main @ 2bcc11b7, verified on feat/goku with 0 tracked changes)
- `test:determinism` — **14 passed, 0 failed**
- `test:roster-integrity` — **green**
- `test:combo-standard` — **225 passed, 9 failed** — the 9 are PRE-EXISTING and
  NOT mine: gogeta & goku_rose missing upAttack/air normals + classification
  count mismatches (roster = 124). `goku` is NOT in the current roster (the old
  Goku was deleted on purpose) and is NOT among the failures.
- Roster size: **124**. Shared working dir with concurrent sessions
  (ghostface on origin/main, homelander on `feat/homelander-flight`) — commit
  per phase, stage by explicit path only.

---

## Phase 1 — INVENTORY ✅ (this commit)
Read-only w.r.t. game code; writes assets/docs only.

**Decisions**
- Source copied **byte-identical** to `assets/source/goku_original.png`
  (md5 `fa937fec…`, 1400×1823, exact teal `#008080`).
- Segmentation = connected-components after masking teal + 42 white divider
  runs; tiny fragments merged into parent sprite; 1–2px slivers dropped.
  **395 frames / 26 row-groups.**
- **SSJ3 donor frames do NOT exist** on this sheet (verified). SSJ3 → full
  fallback in Phase 2. Logged in LEDGER.
- Kamehameha cupped-hands / Spirit-Bomb arms-raised / IT finger-pose not
  cleanly isolated → code-drawn FX + substitute poses, finalized Phase 4.

**Artifacts**
- `assets/source/goku_original.png` — untouched source.
- `assets/source/goku_inventory.json` — per-frame bbox + colour stats + row
  labels + `key_frames` (verified donor/effect coords) + `ssj3` finding.
- `assets/source/goku_contact_sheet.png` — labelled 3× contact sheet (R#, idx).
- `docs/goku/LEDGER.md` — every row/item → use; zero orphan frames.
- `goku_work/inventory.py`, `goku_work/annotate.py` — reproducible tooling.

**How to test Phase 1**
- `python3 goku_work/inventory.py` regenerates inventory.json + contact sheet.
- `python3 goku_work/annotate.py` re-attaches key_frames + labels.
- Open `assets/source/goku_contact_sheet.png` to eyeball cuts.
- Guards unchanged (0 tracked code delta): `npm run test:determinism`,
  `test:roster-integrity`, `test:combo-standard` match baseline above.

**Render check (Phase 1):** no Goku in roster yet, so the full
boot→pick→transform check begins at Phase 4/5. Boot is provably identical to
origin/main because **0 tracked code files changed** (`git diff HEAD` empty).

Commit: _(filled on commit)_

---

## Phase 2 — PER-FORM SHEETS ✅
Writes assets only (no game code). Source only READ (md5 `fa937fec…` intact).

**Method (decision, logged):** primary = **localized hair-region recolour**,
pose-preserving — not frozen-head transplant. Per inventory frame: build a dark
mask (hair+outlines+dark gi), erode 1px so thin outlines drop and the chunky
hair blob survives, take the blob at the hair crown, dilate back, then remap its
luminance along the form ramp. This keeps every frame's head pose exact (no
floating heads / neck seams — the failure mode the transplant spec warns about).
Donor loose-heads were used to **sample** the authentic gold/red/silver ramps;
Blue uses the brief's exact hex ramp.

**Per-form counts (of 395 frames):**
| form | recoloured (confident) | fallback | eyes px | brow px |
|------|-----|-----|-----|-----|
| SSJ  | 358 | 37 | 739 | — |
| SSJ2 | 358 | 37 | 660 | — (brighter/whiter gold ramp) |
| SSJ3 | 358 | 37 | 739 | 480 (eyebrows→skin) |
| God  | 358 | 37 | 758 | — |
| Blue | 358 | 37 | 741 | — (exact #0b3887→#c9f6ff ramp) |
| UI   | 358 | 37 | 660 | — |

- **direct** (donor frames used as-is) = 0; **transplanted** = 0 — the sheet has
  no distinct form-hair bodies except the gold SSJ cluster, which my recolour
  leaves gold (correct for SSJ; harmless for others — those reference positions
  aren't sampled by the animation frame-map). All identity comes from recolour.
- **fallback 37** = knockdown / face-down / extreme-tilt frames where the hair
  crown blob can't be confidently found → recolour all dark pixels in the upper
  55% of the frame (per brief's fallback rule). Visually acceptable; logged.
- **SSJ3** has no donor (Phase-1 finding) → SSJ gold ramp + eyebrow removal
  (brow specks → local skin). Transplanted SSJ3 = 0 (honest).
- **Eyes** tinted to form colour via a tight face-embedded detector (teal-green
  SSJ/SSJ2/SSJ3, red God, blue Blue, silver UI). The naive "whiteish in upper
  half" rule wrongly caught the white gi-collar → replaced with skin-embedded
  eye-band detection. ~2 px/frame.
- **Battle-damage** (2 shirtless frames) recolour per form → they are the
  <25%-HP idle + LOSE pose for Base and every form.

**Artifacts:** `assets/goku_forms/goku_{ssj,ssj2,ssj3,god,blue,ui}.png` (same
layout as base), `assets/goku_forms/goku_<form>_contact.png` (base|result),
`goku_work/forms.py`, `goku_work/gen_all.py`.

**How to test:** `python3 goku_work/gen_all.py` regenerates all six + contacts;
open `assets/goku_forms/goku_<form>_contact.png`. No game code touched → guards
unchanged (determinism 14/0, roster-integrity green, combo-standard 225/9).

Commit: _(this phase)_

---

## Phase 3 — POWER LADDER ⏳ IN PROGRESS (groundwork committed; code surgery pending)

**★ MAJOR DISCOVERY (verified, not from recon agent):** the "deleted" old Goku is
NOT gone — it is a fully-wired STUB still present on origin/main:
- `characters.js:20-123` — full `goku` object (4-form base/ssj/ssg/ssblue ladder,
  specials dragonFist/kamehameha, animationData pointing to ~20 per-action strips
  `goku_base_<action>_uniform.png` that **no longer exist** → currently can't render).
- `abilities.js` — `GOKU_SPECIALS` (665), `fireGokuKamehameha` (669), `GOKU_FORM_ANIM`
  (1913), `GOKU_LADDER` (1918), `enterGokuNextForm` (1923), `revertGoku` (1947),
  `applyGokuFormSystem` (1959), `GOKU_KAIOKEN`/`applyGokuKaiokenLevel`/`toggleGokuKaioken`
  (1975-2010), `GOKU_CMD`/`fireGokuCmd`/`updateGokuCommandCombat` (8144-8160).
- `game.js` imports/uses those (80,111,155-168) + cleanup `revertGoku` (1276/4830/5869)
  + intro voice (5037) + win voice (9379).
- `skins.js:285-293` — goku default skin (+3 recolor skins albedo/valkyrie/alienx).
- `combat.js:2410/2418` goku voice hooks; `combat.js:2960` render pick
  (`fighter._skinAnim || fighter.animationData`). `spritesheets.js:163` manifest.
- `comboStandard.js:157` classifies goku as a STANDARD_STRING built-in.

**Engine fact:** sprites are **per-action uniform strips** (one PNG per action, N
frames × fixed W×H, feet-aligned, anchorY 0), swapped per form via `fighter._skinAnim
= GOKU_FORM_ANIM[form]`. My Phase-2 full-sheet recolors are the **slice source**, not
the final art.

**Decision (conservative, logged — "no clarifying questions"):** REBUILD the `goku`
slot in place. Keep the rosterKey/skins/combo-standard registration (roster-integrity
stays green; the task says add/keep Goku's own entry, never touch others' entries).
Rewrite the object + replace the abilities.js ladder functions with **fresh** 7-form
code (reuse none of the old logic), keeping export names stable so game.js imports
don't break. The obsolete `harness/goku.test.mjs` (tests the deleted old sheets) will
be rewritten to test the NEW goku — not to "make it pass" but because its subject was
replaced (logged).

**Reshaped Phase-3 work units:**
- 3a — slice per-action uniform strips (idle/walk/run/jump/fall/crouch/guard/hurt/
  knockdown/getup/ki-charge) from base + 6 form sheets → `goku_<form>_<action>_uniform.png`.
- 3b — rewrite `goku` object (hp 1000, walk 5.0/run 7.5/jump 11/weight 1.0 mapped to
  engine stats; 7-form transformations; new animationData; spriteScale for ~115-120px).
- 3c — replace abilities.js ladder funcs with the 7-level sim (transform/powerdown/
  charge inputs, ki drain, drop-on-zero gasp, UI timer, exhaustion, zenkai, transform
  burst, GAME_STATE sync, deterministic hash).
- 3d — transform cinematics (crossfade/flash/shake by level; reduce-flash/motion).
- 3e — guards + render check (boot, pick Goku, transform once), commit.

Groundwork committed now: `docs/goku/LADDER_DESIGN.md` (level table + sim-state +
input plan) and this discovery log. Code surgery resumes next.

Commit (groundwork): _(this commit)_

### Phase 3 — remainder ✅ DONE

**Rebuilt in place** (reused none of the old kit logic):
- **3a** (`98b3f345`) 70 per-action strips. **Re-cut TRANSPARENT** this commit (the
  first cut had opaque teal cells → a teal box behind the sprite; slice.py now keys
  teal→alpha).
- **3b** `characters.js` `goku`: HP 1000 / KI 100 (`maxEnergy` 100) / speed 84
  (walk ≈6.0, scaled per form) / jumpPower 32 / weight 1.0; spriteScale 2.0
  (→ ~115px); 7-form `transformations` (base dmg EXACTLY 1.00); `animationData` → new
  strips (normals are a PLACEHOLDER reusing the guard pose until Phase 4). **Removed
  `"goku"` from `_WIPED_FOR_REDO`** — THAT is how the old Goku was "deleted"
  (hasSprites/hidden/isPlayable forced off); un-wiping makes it render + be playable.
- **3c** `abilities.js` fresh ladder: `GOKU_FORMS` table + `GOKU_FORM_ANIM` (7 forms) +
  `enterGokuNextForm` (climb one, flat Ki cost, UI only from Blue at full Ki, burst
  = 10f invuln + opponent pushback), `revertGoku` (power down), `dropGokuOneLevel`
  (Ki-empty, 20f gasp), `endGokuUI` (→ base + 6s exhaustion), `applyGokuFormSystem`
  (per-frame drain/timer/exhaust + speed scale via `baseSpeed`), `toggleGokuKaioken`
  + `tickGokuKaioken` (Base ×2 / Blue ×10 feel, HP drain, never < 10% HP). Cut Goku's
  passive Ki regen in `regenEnergy` (Charge-hold is the source — "no free meter").
  Old `executeGokuSpecial` / `updateGokuCommandCombat` stubbed to no-ops (kit = P4).
- **3d** cinematic: transform burst = white flash (`teleportFlash`) + camera
  focus + screenshake scaled by level + DB transform SFX + aura-pushback. (Per-form
  slow-mo / flames / long SSJ3 scream = Phase-5 polish.)
- **INPUTS chosen** (collision-checked — all on Goku's dedicated **Charge** button, so
  no clash with normals/specials/ultimate/jump): hold **Charge** = build Ki (vulnerable,
  powering-up pose); **Charge+Up** release = climb one level; **Charge+Down** = power
  down to base; **Charge+Back** = Kaioken toggle; neutral release = just bank Ki.
  Direction captured each frame in `updateMovementInput`, read in `handleChargeRelease`.

**Deferred to later phases (logged):** zenkai boost + UI/exhaustion HUD bars + the
slow-mo UI cinematic → Phase 5; GAME_STATE/LAN sync of the new `_goku*` fields →
verified in the Phase-5 LAN test; real normals + specials + per-form ultimates +
Spirit Bomb → Phase 4. `harness/goku.test.mjs` (+ old `goku_stage*`/`goku_walk`) test
the DELETED kit/sheets and were ALREADY failing on baseline — to be rewritten in
Phase 4; superseded for now by `harness/goku_ladder_live.mjs`.

**Tests:** `goku_ladder_live.mjs` **27/0** (renders as sprites, HUD renders, all 7
forms climb w/ correct multipliers, UI gate, power-down, Ki-empty level-drop,
Kaioken on/off, zero JS errors). Guards: determinism **14/0**, roster-integrity
**green**, combo-standard **225/9** (pre-existing; Goku unregressed — still classified
+ core normals). **RENDER CHECK: PASS** (booted goku vs naruto, both fighters + HUD
render, base→SSJ transform with burst flash — screenshot-verified).

Frame-data for every other character is unchanged — all edits are Goku-gated
(`regenEnergy` still gives naruto its +0.02; the direction capture / charge handler
only act when `rosterKey==="goku"`).
## Phase 4 — THE KIT ⏳ IN PROGRESS

### 4a — real normals ✅
Sliced real attack strips (light jab / heavy advancing-lunge / up uppercut-AA / air
aerial / down_air dive / crouchLight low-kick) for base + all 6 forms (42 strips), wired
into `animationData` (replacing the Phase-3 guard placeholder) + `gokuFormAnim` (so a
transformed Goku's normals are recoloured). grab reuses the heavy lunge. Test: all 6
resolve to real strips, light connects (27 dmg) / heavy (51 dmg), zero JS errors;
guards determinism 14/0 · combo-standard 225/9 · roster green. Minor polish flagged:
heavy's windup frame + the low-kick read.

### 4b — specials ✅
Un-stubbed `executeGokuSpecial`; routed by held direction (Special button):
- **neutral / Down / air → KAMEHAMEHA** — code-drawn beam via `spawnProjectile`, **form-
  coloured** (`GOKU_BEAM` table: base blue-white → ssj/ssj2/ssj3 gold → god red → blue
  cyan → ui silver); Down/air angles it down; damage folds in the form offense mult.
- **Fwd → RAPID FIST BARRAGE** — 6 staggered guaranteed hits (`applyScaledDamage`) + a
  knockback finisher; cooldown-gated.
- **Back → AFTERIMAGE (zanzoken)** — short i-frame back-slip + ghost window
  (`_gokuGhost`) + flash; small Ki cost, cooldown.
- **Up → INSTANT TRANSMISSION** — vanish → reappear BEHIND the opponent (i-frames); from
  SSJ+ it chains a point-blank **Instant Kamehameha** (`fireGokuKamehameha{chain}`).
New per-frame cooldown decrements (`_gokuAfterCd`/`_gokuBarrageCd`/`_gokuGhost`) in
`applyGokuFormSystem`. Deterministic (no RNG). Test `goku_specials_live.mjs` **6/0**
(Kamehameha spends 25 Ki + beam spawns, SSJ beam, barrage 46 dmg, IT teleports behind,
afterimage i-frames, zero errors). Guards unchanged; ladder 27/0 intact.
3-level Kamehameha charge + the 3-direction IT reappear + the authentic fist-barrage /
crescent-arc sprites are flagged refinements.
### 4c — the 7 ultimates ✅  (UI auto-dodge + form passives ⏳ next)
Wired the free Ultimate button → `executeGokuUltimate` (dispatch by form); REMOVED the
stale `triggerUltimate` goku→Kaioken intercept (Kaioken is Charge+Back now). Reused the
gogeta beam-nuke pattern + `runDbzMeleeUlt` beat tables:
- BASE **Spirit Bomb** (full Ki; arms-raised gather → huge sphere hurled down),
- SSJ **Super Kamehameha** (big gold beam), SSJ2 **Meteor Smash** (barrage→up-kick→aerial
  →double-fist hammer), SSJ3 **Dragon Fist** (charge→corkscrew→flare), GOD **God
  Kamehameha** (red beam), BLUE **Kaioken×10 Kamehameha** (forces Kaioken on + cyan beam),
  UI **Autonomous Assault** (4 afterimage strikes → palm blast).
Test `goku_ultimates_live.mjs` **15/0** — all 7 cast AND connect (216/198/204/192/269/
281/216 dmg), zero errors. Guards unchanged; ladder 27/0 + specials 6/0 intact.
Still pending in 4c: **UI auto-dodge** (per-frame hit-intercept, 8 Ki, counter-hit
window) + form passives (SSJ rage stacks, SSJ2 chip, SSJ3 light-armor, God regen/
light-stagger-immune/absorb-proof). Spirit-Bomb 3-size charge + Dragon-Fist code spiral
= render refinements.
### 4d — intro / win / lose + sound mapping ⏳ pending
## Phase 5 — HUD / AI / POLISH ⏳ pending
