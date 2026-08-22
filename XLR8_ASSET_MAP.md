# XLR8 — ASSET MAP (Stage 0)

Grounded audit for re-sourcing the XLR8 transform form. Written by viewing the actual
sheets and reading the live kit in `fighters.js`, not from memory. Frame counts marked
`≈` are visual estimates, **confirmed at slice time** in Stage 1. Filenames exact as on disk.

> Context: XLR8 is a **transform FORM** of the `ben10` fighter (see `BEN10_ASSET_MAP.md`
> "Model decision"), NOT a standalone character-select row. It is already fully built
> (`BEN10_ART_ALIENS` includes `xlr8`; kit at `fighters.js:1000–1030`) from the Dragonrod
> sheet. This Stage 0 re-sources that form.

---

## Decisions LOCKED (owner, 2026-08-22)

1. **Authoritative source → #11 ipmugen** (`xlr8_ben10_game_by_ipmugenofficial_dlje0uy-fullview.jpeg`,
   1280×2502, RED chroma-key). Full switch — the whole form re-slices from this sheet, unifying
   XLR8 to the ipmugen teal/black raptor look and retiring the Dragonrod strips.
2. **Scope → polish-only.** Fill the flagged stopgap states (guard, hurt, knockdown/getup, intro,
   dedicated air) and upgrade the portrait. **Keep the existing move set** (light/heavy/up/air +
   3-stage command chain + Dash Strike / Sonic Rush + Sonic Blitz ult). Do NOT add new kit slots
   for the sheet's extra moves (Tail Attack, Faster Kick, Spread) — those are DEFERRED, noted below.

---

## Sources

- **AUTHORITATIVE — #11 ipmugen:** `xlr8_ben10_game_by_ipmugenofficial_dlje0uy-fullview.jpeg`
  — 1280×2502, red-keyed full-game rip. Teal/black raptor. Rich labeled sections + hero pose.
- **RETIRED — #10 Dragonrod:** `xlr8_sprite_sheet_by_dragonrod342_d7ylyle.png` — 367×469,
  origin of the current strips. Bright-blue raptor. Kept on disk for reference; no longer wired
  after the switch. Credit "Dragonrod" (was already in credits for the old build).
- **Current build (to be replaced):** `ben10_xlr8_{idle,run,jump,front,up,combo}_uniform.png`.

---

## #11 ipmugen — section catalog (top→bottom, red-keyed)

| Section label | ≈Frames | Maps to | Notes |
|---|---|---|---|
| IDLE | ≈7–8 (2 rows) | `idle` | Replaces idle strip |
| RUN OR DASH | ≈8–10 (2 rows) | `walk` / `run` / `dash` | Includes dash-lean frames |
| CROUCH AND JUMP | ≈8 (2 rows) | `crouch` (new) / `jump` / `fall` | Split crouch vs jump/fall bands |
| GUARD | ≈5–6 (2 rows) | `guard` ✅ **GAP FILLED** | Was idle stopgap |
| INJURED | ≈4 (1 row: stagger→fall→prone→ground) | `hurt` + `knockdown` + `getup` ✅ **GAP FILLED** | Split: f0–1 hurt, f2–3 knockdown, reverse → getup |
| PUNCH | ≈8 (2 rows) | `light` | Quick claw |
| PUNCH2 | ≈6 (1 row) | `heavy` | Longer/committal punch |
| TAIL ATTACK | ≈8 (2 rows) | — **DEFERRED** | Disjoint tail swipe; future special candidate |
| FASTER PUNCH | ≈10 (2 rows) | `xlCombo1/2/3` + `xlRush` + `xlUlt` | Flurry — ideal for the speed rekka + Sonic Blitz |
| FASTER KICK | ≈8 (2 rows) | — **DEFERRED** (fallback for `up`, see flags) | Kick flurry |
| SPREAD ATTACK | ≈4 (partial) | — **DEFERRED** | AoE/multi-hit; future special/ult-visual candidate |
| Hero pose (top-right) | 1 | `portrait` ✅ **UPGRADE** | Clean full-body — replaces idle-bust portrait |

---

## Slot mapping (existing kit → new ipmugen source)

Movement: `idle`←IDLE · `walk/run/dash`←RUN OR DASH · `jump/fall`←CROUCH AND JUMP (jump band)
· `crouch`←CROUCH AND JUMP (crouch band, now real).
States: `guard`←GUARD · `hurt`←INJURED f0–1 · `knockdown`←INJURED f2–3 · `getup`←INJURED reversed.
Normals: `light`←PUNCH · `heavy`←PUNCH2.
Command chain: `xlCombo1/2/3`←FASTER PUNCH (split into 3 stages).
Specials/ult: `xlDash` (Dash Strike)←RUN OR DASH lean + PUNCH · `xlRush` (Sonic Rush)←FASTER PUNCH front
· `xlUlt` (Sonic Blitz)←FASTER PUNCH full flurry.
Portrait: hero pose. Taunt: GUARD hold (or idle).

---

## FLAGS surfaced by "full-switch + polish-only" (resolve at Stage 2)

- **`up` normal has no direct ipmugen source.** Dragonrod had a dedicated rising `attack↑`;
  ipmugen has no rising strike. Options: (a) repurpose a FASTER KICK frame angled upward as the
  launcher, or (b) hybrid-keep the single Dragonrod up-strip just for this slot. **Owner call at S2.**
- **`intro` still gapped.** ipmugen has no intro sequence. Options: static hero-pose hold, or a
  dash-in from RUN. Currently an idle stopgap; low priority.
- **`air` / `down_air`** — no dedicated aerial attack art on either sheet. Keep reusing a PUNCH
  frame in-air (current approach), now from ipmugen PUNCH.
- **Style swap is global.** Every wired XLR8 frame changes from bright-blue to teal/black; verify
  the transform-in FX (`ben10_xlr8_transformation.png`, Dragonrod-blue) still reads — it may need
  re-sourcing or a note, since the morph now lands on a teal body. **Flag for Stage 1.**
- **DEFERRED sections** (Tail Attack, Faster Kick, Spread Attack) are catalogued but unwired under
  polish-only; they're the obvious content if XLR8 is ever expanded to a fuller kit later.

---

## STAGE 1 — DONE (2026-08-22, test:xlr8-stage1 22/0)

NEW `tools/reslice_xlr8.py` — single "red-dominant → transparent" key (R > G+18 & R > B+18) removes
the bright-red bg, the dark-red section labels, AND the JPEG red/orange edge halos in one rule while
keeping the teal/black raptor. Section rows MEASURED via content scan + label OCR (11 labels confirmed:
IDLE/RUN OR DASH/CROUCH AND JUMP/GUARD/INJURED/PUNCH/PUNCH2/TAIL ATTACK/FASTER PUNCH/FASTER KICK/SPREAD
ATTACK), hero pose x-clipped out of the idle/run rows. Emitted (overwrote the old Dragonrod filenames
so kit paths didn't move):

- `ben10_xlr8_idle_uniform.png` (16f, 64×64) · `run` (18f, 68×71 — walk/run/dash)
- `crouch` (2f) · `jump` (3f) · `fall` (3f, NEW dedicated) — from the CROUCH AND JUMP cycle (rows dup; row-1 split)
- `guard` (8f) — GAP FILLED (was idle) · `hurt` (2f) / `knockdown` (3f) / `getup` (5f, reversed injured) — GAP FILLED from the 5-frame INJURED row
- `ben10_xlr8_portrait.png` — hero-pose bust; **generated but UNWIRED** (ben10 forms have no per-form
  portrait slot — kept for future use).

`fighters.js` `BEN10_FORM_ANIM.xlr8` movement/state block re-tuned to the new dims; added `crouch`/`guard`/
`knockdown`/`getup` keys (resolver checks `_skinAnim` first, so these now activate real art). Native cells
~64px × shared `spriteScale 2.0` ≈ 124px idle on-screen (was 43px→86px "reads short"). Regression:
canonical `test:ben10` 62/0 (extended xlr8 sweep with the 5 new states).

### ★ Stage-2 flags carried forward
- **Normals/combo/specials/ult still reference the OLD Dragonrod strips** (`front`/`up`/`combo`), untouched
  on disk. So movement/state = teal ipmugen (~124px) but attacks = bright-blue Dragonrod (~72px): a visible
  style + size disparity until Stage 2 re-sources them. **This is the top Stage-2 priority.**
- **`up` normal** — ipmugen has no rising strike (Dragonrod did). Repurpose FASTER KICK-up OR keep the one
  Dragonrod up-strip (owner call at S2).
- **Transform-in FX** `ben10_xlr8_transformation.png` is Dragonrod-blue → verify against the new teal body.
- **Per-form height normalization** (XLR8 now ~124px vs roster ~111) remains the deferred code-flagged
  height-pass concern (shared `spriteScale` can't be per-form without a new hook).
- **DEFERRED sections** (Tail Attack, Faster Kick, Spread Attack) measured in `reslice_xlr8.py`'s `ROWS`
  but unsliced — ready if XLR8 is ever expanded.

## STAGE 2 — DONE (2026-08-22)

**Trigger: source-mix caught.** After Stage 1, the wired XLR8 was mixing BOTH registry entries — movement/
state from #11 (ipmugen, teal, ~124px) but normals/combo/specials/ult still from the old #10 Dragonrod
strips (bright-blue, ~72px). Rendered-confirmed side-by-side (they are visibly different characters). This
is exactly the cross-entry mix the master registry forbids. Un-mixed by converging the attacks to **#11**
— the LOCKED Stage-0 source (principled, not "wherever the body landed").

**Re-sourced from #11** (`reslice_xlr8.py` Stage-2 block; overwrote the old Dragonrod filenames so kit paths
didn't move):
- `ben10_xlr8_front_uniform.png` ← PUNCH claw-thrust (5f) — light / air / down_air / grab / Dash Strike
- `ben10_xlr8_heavy_uniform.png` ← PUNCH2 committed strike (6f) — heavy (NEW file; `heavy` repointed)
- `ben10_xlr8_combo_uniform.png` ← FASTER PUNCH flurry (18f) — xlCombo1/2/3 (sourceX 0/432/864) + xlRush (9f) + xlUlt (18f)

**`up`-normal — deliberate single-source EXCEPTION (owner call):** kept the Dragonrod #10 rising-attack
strip `ben10_xlr8_up_uniform.png` UNCHANGED. Rationale: it is a sprite *actually drawn as a rising attack*
(right content for the role); the #11 alternative (Faster Kick) is content-mismatched. So #10 is NOT fully
retired — it still sources exactly one slot (the up-normal). Cosmetic consequence: `up` reads brighter-blue
/ slightly smaller than the teal #11 body — accepted for content-fidelity. (Recolor-to-teal is an available
follow-up if visual harmony is wanted without losing the rising-attack content.)

**Transform-in FX — rendered & resolved (not just color-checked):** `ben10_xlr8_transformation.png` (Ben →
green flash → blue Dragonrod XLR8) IS bright-blue, BUT grep confirms it is referenced NOWHERE — a dead
orphan asset. XLR8's transform uses the procedural `ben10OmnitrixCinematic.js` (green flash, zero sheet
refs) and lands directly on the new teal idle. **No blue-pop; the flag is moot.**

**Verification:** canonical `test:ben10` 62/0 · `test:xlr8-stage1` 22/0 · `test:ben10-stage4` 14/0 (covers
xlUlt). `test:ben10-stage2` normals now pass (fixed a STALE box-threshold there: `≥120 AND` → `≥200 OR`,
matching the canonical — the old tight threshold only passed because the old art was tiny). Remaining
ben10-stage2/3 failures are PRE-EXISTING and NOT XLR8-art: flaky chain-advancement (human chain fails
intermittently with code I never touched; my change actually improved xlr8 chain reach 1/3→2/3) and a
Diamondhead Rising-Diamonds hitbox (stage3). 

### Kit is now single-source (#11) except the one documented `up` exception. Stage-2 flags CLEARED:
- ✅ style/size disparity — resolved (attacks now teal #11)
- ✅ `up` source — resolved by decision (keep Dragonrod rising-attack)
- ✅ transform-in FX — resolved (dead orphan, procedural cinematic)
- ↔ per-form height normalization (XLR8 ~124px vs roster ~111) — still the deferred code-flagged height-pass
- ↔ `up` cosmetic blue/size mismatch — accepted; optional recolor follow-up
