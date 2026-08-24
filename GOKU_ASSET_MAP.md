# GOKU — 4-Form Sprite Build — STAGE 0 Asset Map & Investigation Report

**Character:** ONE roster entry (`goku`), FOUR forms — Base / Super Saiyan / Super Saiyan God /
Super Saiyan Blue. NOT four roster entries.

**Source:** Dragon Ball Z: Extreme Butoden (3DS), four sheets, shared animation skeleton with
per-form recolor + a few per-form delta clips.

**Status:** STAGE 0 COMPLETE — investigation + report only. NO gameplay code written.
Verified 2026-08-23 by first-hand pixel pass (montage tool + full-res strips + 4 parallel
visual-audit subagents + owner-facing spot zooms). All six pre-stated audit claims corroborated;
the one soft spot (Base win pose) was resolved by direct zoom — it IS present.

---

## SOURCE SHEETS (teal-keyed, green per-frame cells)

All four are RGBA but fully opaque (alpha=255). Background is teal `(0,128,128)`; every sprite
frame sits in its own green cell `(0,255,80)`. Key BOTH to transparent when slicing.

| Form | File | Size (WxH) | Frames* |
|---|---|---|---|
| Base (black) | `3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Goku.png` | 2072 × 8232 | ~296 |
| Super Saiyan (gold) | `...- Goku (Super Saiyan).png` | 2918 × 8847 | ~302 |
| Super Saiyan God (red) | `...- Goku (Super Saiyan God).png` | 1562 × 8319 | ~285 |
| Super Saiyan Blue (blue) | `...- Goku (Super Saiyan Blue).png` | 1592 × 8772 | ~292 |

\* connected-component count (includes FX fragments/afterimage streaks/flash frames), not the
final animation count.

**Tooling built this stage (Stage-0 only, no engine code):**
- `tools/goku_montage.py <base|ssj|ssg|ssb> [all|idx-list] [out.png]` — teal+green-keyed contact
  sheets (`goku_<form>_montage.png`).
- Full-res strips in `/tmp/goku_strips/<form>_NN_yA-B.png` (8 per sheet) — the audit substrate.

---

## SHARED SKELETON (Stage 1 — applies to all 4 forms via recolor)

Confirmed present and matching across all four sheets:

- **Idle** — ~2 real breathing-loop variants (normal palette).
- **Guard / block** + **guard-hit reaction** — crossed-arm brace + recoil.
- **Crouch.**
- **Jump** — tuck + fall frames.
- **Dash / Run** — real alternating-leg stride. **No separate slow Walk exists on any form** —
  intentional (same as Superman 2 / Iron Man 3 elsewhere in project), not a gap.
- **Hit-reaction → knockdown → lying (prone/back) → sitting-up → rising** — full KO/getup chain,
  complete on all four. Real art; nothing to fake.

Base strip references: movement/state ≈ strips 05–06 (y5750–8050); knockdown/lying + WIN + getup
in the bottom cluster (y7350–8232).

---

## NORMALS LIBRARY (Stage 2 — ~19 shared, per-form recolor)

Identified attack animations on the base sheet (the reference; recolored on SSJ/SSG/SSB):

1. Light jab (short straight)  2. Cross/straight (chain 2)  3. Elbow/hook (close)
4. Long-reach extended thrust punch  5. Multi-punch flurry  6. Low kick / sweep
7. Standing side kick  8. Front snap kick  9. Rising / launcher kick (vertical)
10. Roundhouse / spin kick **w/ white crescent VFX arc**  11. Axe / overhead chop
12. Lunging dash punch (advancing)  13. Lunging dash kick (long reach)  14. Aerial punch
15. Aerial kick  16. Aerial spin / down-air dive  17. Uppercut rising punch
18. Knee strike  19. Back/spin backfist (turning strike)

Several are 1–2 frame poses; launcher/aerial set overlaps. Chain order/cancel points are NOT yet
verified — that's Stage 3's job (the audit confirms the moves exist & match, not the chain graph).

---

## TRANSFORMATION SYSTEM (Stage 5 — the core mechanic)

Chained: **Base → Super Saiyan → Super Saiyan God → Super Saiyan Blue**. Confirmed transition art:

| Transition | Source sheet / location | Verified content |
|---|---|---|
| Base → SSJ (charge-up) | **Base sheet** (strips 03–04, y3450–5750 charge/power-up band) | 6-frame charge loop → color-shift flash to gold. **Only on the base sheet** — the SSJ sheet has NO base→gold charge-up. |
| SSJ → Base (revert) | SSJ sheet, strip 07 (y≈8050+) | blonde (~2f) → **WHITE flash** → black-hair base (~4f) → re-blonde (~4f). (Re-blonde tail likely loop-continuity — confirm at Stage 5 before treating as part of the revert.) |
| SSJ ↔ SSG | SSG sheet, strip 04 (y≈4600–4900) | blonde (~2f) ↔ red (~2f), both directions represented. |
| SSG → Base (revert) | SSG sheet, strip 06 (y≈7600–8050) | red fades **directly** to black (~6f). No SSJ step-down. |
| SSB → Base (revert) | SSB sheet, strip 07 (y≈8050+) | blue (~2f) → **WHITE flash** → black (~6f). Direct, no step-down. |
| **Full Base→SSJ→SSB cutscene** | SSB sheet, strip 07 (y8050–8772) | ONE continuous ~9-frame chain black→gold→blue. Distinct from the single-step transitions — a dedicated dramatic power-up cinematic. **Trigger context (cinematic vs. in-combat path) NOT yet decided — confirm at Stage 5 before wiring.** |
| **SSJ3 flourish (cosmetic)** | SSJ sheet, strip 04 (y≈5000–5400) | ~5–6f hair EXTENDS long then immediately reverts to normal SSJ. **DEMOTED to cosmetic** per locked decision — fold into the SSJ charge/idle loop as an occasional power-surge beat, NOT a playable 5th mode. |

**Detransformation rule (treated as confirmed):** every transformed state reverts DIRECTLY to Base,
never stepping down through intermediate forms — consistent across SSJ/SSG/SSB sheets.

---

## PER-FORM DELTAS (Stage 6 — do NOT copy across forms)

- **Ready-stance palette tiers:**
  - **Base = 4:** normal / Kaioken red / deeper maroon / pale lavender flash.
  - **SSJ / SSG / SSB = 3 each:** normal / one color-shifted tint / lavender flash. **No
    deep-maroon Kaioken tier on any transformed form.** → Build **Kaioken stacking as a
    Base-form-only mechanic** (confirm before assuming it layers on top of a transformation).
- **SSG-only teleport-dash:** distinct motion-blur / afterimage streak (SSG strips 02–03,
  y≈3100–4200), separate from the normal run stride. Build as an **SSG-exclusive mobility special.**
  - ⚠ Minor caveat: the **base sheet also contains one afterimage/blur frame** (bottom cluster,
    y≈7700). So "teleport-blur" isn't 100% SSG-unique, but SSG has a full dedicated dash-streak
    set the others lack. Doesn't change the SSG-exclusive-mobility decision.
- **Lavender single-tone flash frame:** present in the identical stance/tier slot on ALL FOUR forms
  → confirmed intentional effect frame (afterimage/flash), not a rip gap.

---

## PORTRAITS / WIN / LOSE (Stage 7)

- **Portraits (top of each sheet):** 1 chibi/emote cell + 5 rectangular photo-style busts
  (differing intensity: calm / determined / shout / side-glance). Per-form recolored.
- **WIN — CONFIRMED on base (resolved by zoom):** bottom cluster (y≈7500–7900) —
  **~6-frame cheer/celebration jump (arms raised)** + **4-frame scratch-head-laugh (hand behind
  head, grinning)**. Matches the Stage-7 spec exactly. **No win pose exists on SSJ/SSG/SSB** →
  victory always resolves to Base's win sequence (STATED ASSUMPTION: victory renders in base form
  regardless of fight-ending form — inference, not confirmed fact; comment as such).
- **Lose:** reuse the knockdown/lying frames (KO chain is real on all forms).

---

## LOCKED CUTS (per prompt, corroborated by audit)

1. **Kamehameha CUT from active kit.** Windup pose exists on Base + SSJ ONLY; absent on SSG + SSB.
   **NO beam/projectile graphic on ANY of the four sheets** (confirmed full-scan, 4 independent
   audits). A windup with no payoff isn't a usable move → leave out entirely for now; preserve the
   windup animation data for future use once real beam art exists.
2. **SSJ3 = cosmetic flourish only**, not a 5th playable mode (see transform table).
3. **No Ultimate / screen-clear cinematic exists on any sheet** — do not invent one. The
   transformation ladder itself is the power ceiling (same as Vegeta / Frieza / Goku Black).
4. **No confirmed ranged/energy special** in the kit after the Kamehameha cut → Goku is
   **melee/normals-heavy** until real beam art justifies reintroducing Kamehameha. FLAG to owner
   (Stage 4) rather than inventing a substitute.

---

## CLAIM VERIFICATION SUMMARY (all corroborated)

| # | Claim | Result |
|---|---|---|
| 1 | No Kamehameha beam graphic on any sheet | ✅ TRUE (4/4 sheets) |
| 2 | Win pose only on Base (SSJ/SSG/SSB have none) | ✅ TRUE — Base win **confirmed by zoom**; absent on the other 3 |
| 3 | No Ultimate/screen-clear cinematic on any sheet | ✅ TRUE |
| 4 | Transformed states revert DIRECTLY to Base | ✅ TRUE (SSG red→black 6f, SSB blue→black 6f) |
| 5 | Pale lavender single-tone flash frame in same slot, all 4 | ✅ TRUE |
| 6 | Kamehameha windup absent on SSG & SSB (present Base/SSJ) | ✅ TRUE |
| + | Base has ~19 normals + full movement/KO skeleton | ✅ TRUE |
| + | SSG-exclusive teleport-blur dash | ✅ TRUE (base has 1 stray blur frame — noted) |
| + | Base→SSJ→SSB full cutscene chain on SSB sheet | ✅ TRUE (~9f continuous) |

---

## ⚠ RECONCILIATION WITH THE EXISTING `goku` (owner decision needed)

A `goku` roster entry ALREADY EXISTS and is wired + tested — but it is a **procedural BOX**
placeholder awaiting exactly this art, with a DIFFERENT form set. This build re-scopes it.

**What exists today (`test:goku-transform` green):**
- `characters.js` goku: `hasSprites:false` (procedural box), base idle/walk sprites only.
- **6-tier numeric ladder** `base→ssj1→ssj2→ssj3→ssblue→ultraInstinct` (CHARGE hold-release steps
  up, tap reverts, per-frame Ki drain, auto-revert at 0). Logic: `abilities.js`
  `enterGokuNextForm`/`revertGoku`/`applyGokuFormSystem`, `GOKU_LADDER` (5 entries).
- **2 specials** via `executeGokuSpecial`: Kamehameha (QCF, procedural `#60d0ff` orb — NOT real
  beam art) + Dragon Fist (default melee rush).
- Transformed state shown by `drawGokuFormAura` (box aura + label). `spritesheets.js` goku manifest
  entry COMMENTED OUT. `skins.js` goku = default only.

**What this prompt builds instead:**
- **Real sprite art** (flip `hasSprites:true`, restore manifest, slice all 4 sheets).
- **4-form ladder** `base→SSJ→SSG→SSB` — **ADDS Super Saiyan God (red)**, **DROPS ssj2, ssj3-as-mode
  (→cosmetic), and ultraInstinct**.
- **CUTS Kamehameha** (no beam art) and does not carry Dragon Fist as a listed special (Stage 4 =
  melee-only, flagged).

**→ DECISIONS — LOCKED by owner 2026-08-23:**
1. **REPLACE the 6-tier ladder with the 4 sprite forms** `base→SSJ→SSG→SSB`. The tested
   ssj1/ssj2/ssj3/ultraInstinct tiers are removed; **Super Saiyan God (red) is added**.
2. **KEEP the transform MECHANIC** — CHARGE hold-release step-up / tap-revert / continuous Ki-drain
   / auto-revert-at-0 (aligned to Vegeta/Frieza/Goku Black). Re-point `GOKU_LADDER` to the 3
   transformed forms `["ssj","ssg","ssblue"]`; swap per-form SPRITE via `_skinAnim` (Vegeta-SSJ /
   Handler-Mahoraga pattern) instead of `drawGokuFormAura`'s box aura.
3. **KEEP Dragon Fist** as the one melee special (needs no beam art). Kamehameha stays CUT.
4. **Kamehameha windup data preserved** as dormant (per the cut); the `kamehameha` special entry
   becomes dormant metadata (not fired), `dragonFist` stays live.

---

## DEFERRED / OPEN (confirm before wiring the relevant stage)

- Kamehameha — cut; windup data preserved pending future beam art.
- SSJ3 — cosmetic flourish, not a mode.
- Win-always-Base — stated as inference, not confirmed.
- Full Base→SSJ→SSB cutscene trigger context (cinematic vs in-combat) — Stage 5.
- SSJ-revert "re-blonde tail" — loop-continuity vs part of revert — Stage 5.
- "Standing-to-stance transitions" role (intro vs taunt) — Stage 2 placement.
- Kaioken-on-top-of-transformation — confirm Base-only reading before Stage 6.
- Balance: 4-tier chain with NO ranged special is an unusual shape — flag whether melee-only needs
  compensation once real numbers exist (Stage 7).
