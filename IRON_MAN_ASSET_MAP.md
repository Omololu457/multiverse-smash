# IRON MAN 1 — Asset Map / Stage 0 Pixel Audit

Source: `iron_man_jus_sprite_sheet__old__by_danorenovado_ddxdqsr-375w-2x.jpg`
— **596 × 1107, RGB (JPEG, lavender `#c9bfe0`-ish background, NO alpha).**
Artist credit on filename: **danorenovado** (DeviantArt, id `ddxdqsr`). Chibi "JUS"
(Jump Ultimate Stars) fan style. Verified band-by-band at 3× NEAREST (real pixel pass —
looked at every labeled row, not a re-read of the build prompt).

**Fully independent roster character (Iron Man 1).** This sheet is self-contained; nothing
here borrows from or feeds the other two Iron Man sources present in the tree
(`Iron Man.png` 1696×1249, `Game Boy Advance ... Iron Man.png` 1396×2471 — those are
separate Iron Man 2 / 3 sources and are OUT OF SCOPE for this build).

**Format note:** this is a *labeled-band* sheet (each animation has a printed text label to
its left), NOT a uniform grid and NOT numbered rows. Frame *content* is confirmed below;
exact per-frame x-boundaries are produced by the Stage-1 reslice pass (see "Reslice notes").
JPEG source = fringing around sprites; the reslice must chroma-key the lavender bg with a
tolerance band, not an exact-color key.

---

## Per-band confirmed content (top → bottom)

| Band | Label | Frames | Confirmed content (left → right) |
|---|---|---|---|
| 1a | **Stand** | **4** | Neutral idle loop — feet planted, arms/torso shift; 4th frame turns slightly. Real loop. |
| 1b | **Crouch** | **2** | Low guard crouch; 2nd frame lower/more compact. |
| 2 | **Walk** | **8** | Full alternating-leg stride cycle. Real walk (distinct from idle). |
| 3a | **Dash** | **2** | Forward-lean run with cyan speed-line streaks at feet; 2nd frame adds a back thruster flare. |
| 3b | **Jump** | **2** | Rising pose, cyan boot-thruster flame under both feet. |
| 4 | **Intro** | **3** | Hero stance ×2 (helmet ON, arms settle) → **3rd frame = helmet OPEN, Tony Stark face + dark hair visible** (reveal). Real distinct frames. |
| 5 | **Guard** | **2** | Repulsor/forearm block pose (bright vertical guard glow), 2 frames. |
| 6a | **Charge** | **2** | Both fists clenched at sides, chest arc-reactor glowing — energy gather windup. |
| 6b | **Blast** | **4** | (1) arm extends, palm repulsor fires short → (2) beam release w/ cyan tip → (3) deep lunge/recoil firing a large cyan repulsor beam (full release) → (4) both arms thrown up (recoil/recover). |
| 7 | **Hurt** | **~9** | Standing flinch ×3 (recoil/stagger) → airborne fall (horizontal) → mid-tumble (inverted, legs up) → curled roll → lie flat (face up) → prop-up/getup. Full hit→knockdown→wakeup set. |
| 8 | **Melee (row 1)** | **~9** | ready/crouch-in → guard-up → jab windup (repulsor spark at fist) → straight jab extended → straight punches ×2 (very similar, in-betweens) → punch w/ **red** repulsor burst at fist → raised gauntlet w/ **yellow/orange** repulsor flare (rising/hook strike) → neutral recover/turn. |
| 9 | **Melee (row 2)** | **~6** | low lunging dash-punch → uppercut windup (arm across chest, motion arc) → **rising uppercut** w/ white/gold motion arc → uppercut apex → forward low thrust/kick (arm out w/ white glint) → crouch recover. |
| 10a | **SpiderMan (small)** | **3** | Iron-Spider suit (navy+red, big cyan mask-eyes) crouched → **4 golden spider-legs whip out** in curved arcs from the back → legs fully splayed into a jagged strike pose. |
| 10b | **SpiderMan (large)** | **3** | Same 3-beat sequence as 10a at **~2× detail** (crouch → arced legs → jagged full-splay strike). The high-res version of the move. |
| 11 | **Super** | **1** | Single static hero pose — Iron Man standing tall, **helmet OPEN (Tony face + dark hair)**, arms crossed over chest, multi-color chest/repulsor glow. Dramatic; NOT a motion cycle. |
| 12 | *(bottom-left)* MCU render | — | Photorealistic MCU helmet+hand w/ glowing repulsor, on a **white box** (not the sheet bg). Reference art. |
| 13 | *(bottom-center)* stray | 1 | Tiny chibi Iron Man, helmet-open, arms at sides. A scale/reference stray of the standing pose. |

Frame totals are honest content counts from the pixel pass; "~" marks bands where two
near-identical in-between frames could reslice as 8-or-9 / 5-or-6 depending on the final
x-cut. This does **not** change any move boundary below.

---

## The four Stage-0 questions — RESOLVED

**1. MCU-helmet reference render (bottom-left) → EXCLUDE from runtime atlas.** Confirmed: it
sits on its own white background (every other sprite is on the lavender sheet bg), and it's a
photoreal movie still, not a chibi frame. Documentation only. The reslice keys the lavender bg
and must not pick up this white box.

**2. "SpiderMan" special → CONFIRMED unique self-contained SUIT special (not an assist).**
Exactly as the prompt describes: a 3-frame sequence where *Iron Man's own suit* transforms
into the Iron-Spider (navy+red, cyan eyes) and deploys **four golden spider-legs** — whip-out
arcs → jagged full-splay strike. This is one character's suit doing something extra; there is
**no second character** on the sheet. It is NOT a cameo/assist like Aoi Todo's Boogie Woogie or
Pain's assist-select. **Bonus finding:** the sequence exists at TWO scales — a small 3f version
(band 10a) and a large hi-detail 3f version (band 10b). Recommend building from the **large**
frames (more pixels, cleaner legs) and keeping the small set as a fallback / lower-scale variant.

**3. Two Melee rows → real slicing pass done; they are distinct, chainable content.**
Row 1 ≈ **9 frames** (jab/straight-punch string ending in repulsor-flared strikes), Row 2 ≈ **6
frames** (lunge → rising uppercut w/ motion arc → forward low thrust). ~15 melee frames total.
These read as move-to-move combo content — a horizontal punch string (row 1) plus a rising
**uppercut launcher** and a lunging/low finisher (row 2). Exact cancel/cut x-boundaries come out
of the Stage-1 reslice (they are NOT guessed here). No frame-count was invented; the prompt's
"don't guess" is satisfied.

**4. Single-frame "Super" pose → it is a PORTRAIT / ultimate-TRIGGER pose, NOT a standalone
animation and NOT a windup.** Evidence: it is a *closed* static stance (arms crossed over the
chest) — nothing flows out of it into a following frame, so it is not option (b) a windup. A lone
frame cannot be a full animation, so it is not a self-sufficient ult cycle either. Best-supported
role = **(a)+(c) combined**: use it as the **character portrait / HUD bust** (helmet-open face is
ideal for a portrait) AND as the **dramatic freeze pose that triggers the ultimate**, with the
ult's actual *damage payoff* delivered by the **Blast repulsor (band 6b) played at larger scale**.
Recommendation: **do not fabricate** a bespoke ult animation this sheet doesn't contain — promote
the Super pose as trigger + scaled Blast as payoff (Deathstroke/Naoya "no-unique-ult-art"
precedent, flagged honestly).

---

## Reslice notes (for Stage 1 — not executed yet)
- **Key the lavender background** (`~#c9bfe0`) with a JPEG tolerance band; do NOT exact-match
  (fringing). White-box MCU render (band 12) must be excluded by region, not by color.
- Bands are label-prefixed: crop off the printed text label (left of each row) before framing,
  the way `reslice_handler.py` handled inline labels.
- **Blast band (6b)** and **Charge (6a)** share the same y-strip as separate labeled groups —
  cut by the "Blast" label gap.
- **Melee** is two stacked y-bands (rows 1 & 2) — slice each independently.
- **SpiderMan** large frames (10b) are taller than the base sprite (legs extend well above the
  head) — the frame box must be tall enough to keep the golden legs; expect a non-uniform box
  height for this move.
- **Super** (11) and the **stray tiny figure** (13) are single frames — carve individually.

## Excluded from runtime atlas
- Band 12 MCU photoreal render (documentation).
- Band 13 stray tiny figure (scale reference; not an animation — at most a secondary portrait
  candidate, but the Super pose is the stronger portrait).
- Any printed text labels.

---

## Recommendations for owner (NOT locked — pending sign-off before Stage 1 code)
These are proposals derived from the art; the prompt reserves the real decisions:

1. **Identity / stats:** fresh independent char, `rosterKey: iron_man` (universe `marvel`).
   Suggested `energyType` bespoke **"repulsor"** (arc-reactor charge economy). Archetype reads as
   a **balanced ranged-zoner/rushdown hybrid** (repulsor Blast zoning + a real melee string +
   uppercut launcher + the Spider-legs disjoint). Stats TBD at Stage 1 vs `BALANCE_AUDIT.md`.
2. **Normals (Stage 2):** light/heavy from Melee row 1 punch string; **up = rising uppercut
   (row 2) as launcher**; air + down_air candidates from the lunge/thrust frames. Exact split
   after reslice.
3. **Command chain (Stage 3):** the two Melee rows chain naturally (horizontal string → uppercut
   launcher / low finisher) — a Fwd+Heavy rekka is well-supported. Confirm cancel points at reslice.
4. **Specials (Stage 4):** Charge→Blast repulsor (core ranged, dual tap/hold candidate); **Spider-legs
   strike** (self-contained suit-transform disjoint, from the large 10b frames).
5. **Ultimate (Stage 5):** Super pose = trigger/freeze + scaled Blast payoff. Flag "no unique ult art."
6. **Portrait (Stage 6):** Super pose (helmet-open face bust).
7. **Attribution BLOCKER:** credit **danorenovado** (DeviantArt `ddxdqsr`) in `credits.js` before ship
   — mandatory per project rule.

## Open / deferred items
- Exact melee x-cut / cancel points → Stage-1 reslice (blocks Stage 2–3 final boundaries).
- SpiderMan: build from large (10b) or small (10a) frames — recommend large; owner confirm.
- No bespoke **win** pose and no bespoke **ult** animation exist on the sheet (honest gaps —
  win candidate = Intro helmet-open or Super pose; ult = trigger+scaled-Blast).
- Intro's 3 frames verified real here (2 helmet-on + 1 face-reveal).

---

**STAGE 0 COMPLETE — STOPPING before any gameplay code, per the build prompt.**
Next: on owner sign-off of the recommendations above, proceed to Stage 1 (reslice + registration
+ movement) and clip idle/crouch/walk/dash/jump/guard/hit-reaction before continuing.
