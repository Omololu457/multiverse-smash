# FEEDBACK — ASSET MAP (Stage 0)

Grounded inventory of the on-disk **Feedback** (Conductoid) sprite art and how each
sheet maps onto moves/states. Measured from the actual PNGs (`file` dims + reslice
frame counts + visual inspection), not from memory.

Feedback is an **Omnitrix transform FORM** within the existing Ben 10 fighter
(alongside XLR8 / Diamondhead), NOT a new roster entry. Same architecture:
`BEN10_ALIEN_POOL` entry + `BEN10_FORM_ANIM` sprite set + `_skinAnim` swap on
transform. See `BEN10_ASSET_MAP.md` for the transform-model rationale.

Archetype (confirmed via design brief): **energy absorption / redirection
specialist.** Canonically accurate — Feedback (a Conductoid) absorbs energy and
discharges it back. Kit built LEAN to fit the small art batch; unused files are
flagged/reserved rather than force-fit.

---

## Source batch (filenames preserved EXACTLY as uploaded)

Raw uploads live at repo root as `feedback_*.png`. Each was copied to a
`feedback_*_uniform.png` twin and re-sliced (feet-aligned uniform cells via
`tools/reslice_strip.mjs`) — the twin is the sheet wired into `BEN10_FORM_ANIM`;
the original upload is preserved untouched.

| Raw upload (preserved) | Raw dims | Uniform sheet (wired) | Frames · cell | Content → action |
|---|---|---|---|---|
| `feedback_idle.png` | 199×51 | `feedback_idle_uniform.png` | 4 · 44×51 | Standing idle cycle → **idle** (+ guard/hurt/intro STOPGAP) |
| `feedback_run.png` | 254×57 | `feedback_run_uniform.png` | 4 · 57×49 | Run cycle → **walk / run / dash** |
| `feedback_jump.png` | 142×74 | `feedback_jump_uniform.png` | 3 · 37×75 | Crouch → apex → land → **jump / fall** |
| `feedback_charge_animation.png` | 123×89 | `feedback_charge_animation_uniform.png` | 2 · 52×90 | **ABSORB STANCE** — blue electric spikes radiating from head/antennae → the reactive-counter windup pose (Stage 3) |
| `feedback_electric_shot.png` | 138×59 | `feedback_electric_shot_uniform.png` | 2 · 60×52 | Hand-plug electric DISCHARGE → **special cast pose** + **normals** (reused, Stage 2) |
| `feedback_electric_shot_projectile.png` | 165×50 | (reserved) | — | Blue electric orb + spark lines. Reslice split on the pink spark lines (→9 islands) → NOT a clean strip. Projectile drawn **procedurally** (cyan), matching diamond_shard precedent. RESERVED. |
| `feedback_ultimate.png` | 301×58 | `feedback_ultimate_uniform.png` | 5 · 61×51 | Two-hand energy beam / big discharge → **Ultimate cast** (Stage 4) |
| `feedback_ultimate_projectile.png` | 170×48 | (reserved) | — | Bigger electric burst. Same spark-split issue → procedural. RESERVED. |
| `feedback_dash.png` | 332×65 | (reserved) | 4 · 123×56 | 2 run poses + a wide motion-blur cell + landing. The blur cell blows the uniform cell to 123px wide (not a clean loop). Movement dash uses the run strip instead. RESERVED (candidate for a future dash-special). |

Master reference sheet: `feedback_transparent.png` (900×742) — the full source
composite (all poses).

---

## STAGE 1 — Movement / state (BUILT)

`BEN10_FORM_ANIM.feedback` defines: idle, walk, run, dash, jump, fall, guard,
hurt, intro.

- **dash** reuses the run strip (dash sheet reserved, see above).
- **guard** reuses the idle strip so blocking stays **in-form** (without a `guard`
  key, `_skinAnim`'s base-fallback would draw HUMAN Ben while blocking — verified
  and fixed; XLR8/Diamondhead share this latent gap but never tested guard).
- **hurt / intro** reuse the idle strip (no dedicated hit/entrance art). STOPGAP.

Missing (flagged): dedicated guard/hurt/intro art. Falls back cleanly.

---

## STAGE 2 — Normals (small batch → honest reuse)

There is **NO dedicated melee art** for Feedback (no jab/heavy/kick strips). The
only combat-capable poses are the electric-shot discharge (2f) and the charge
stance (2f). Per the design brief's explicit allowance ("it's fine for some
normals to reuse/mirror each other's frame data with different hitbox tuning …
flag this explicitly"):

- **light / heavy / up / air / down_air** all reuse `feedback_electric_shot_uniform.png`
  (the short-range hand-plug discharge) with **per-move hitbox/damage/timing tuning**.
  This reads as Feedback jabbing with short electric bursts — thematically clean for
  a Conductoid. **FLAGGED: shared underlying frames, distinct move data.**
- No genuine animation overflow exists → **no command chain** (skipped honestly,
  per the "skip this substage if there's no overflow" instruction).

---

## STAGE 3 — Absorb / Redirect special (REACTIVE COUNTER)

The art **supports the reactive-counter reading**: `charge_animation` is a clear
absorb STANCE (energy visibly gathering as electric spikes), and `electric_shot`
is the discharge. This is the absorb-stance-into-discharge sequence the brief asks
for → built as a **REACTIVE COUNTER**, the canonically accurate Feedback:

- Enter the absorb stance (charge pose). If the opponent's attack CONNECTS during
  the counter window → the hit is **absorbed (no damage taken)** and Feedback
  immediately **discharges an amplified electric blast** back (the electric-shot
  pose + a procedural cyan projectile). Whiff = normal recovery, no discharge.

Down-variant (if built): a proactive plain electric-shot projectile (no counter),
using the same discharge pose. See Stage 3 report.

---

## STAGE 4 — Ultimate: OVERLOAD (amplified discharge)

`feedback_ultimate.png` (5f two-hand beam) is the largest/most elaborate sequence
in the batch → the Ultimate. Thematically the **amplified redirect** (bigger
discharge, more damage) — the Batman "Ultimate-candidate fallback" precedent, here
backed by genuinely distinct 5-frame art. Reuses the proven freeze-cinematic
architecture (per `ben10OmnitrixCinematic.js` / Beerus / Minato precedent) or the
per-form ultimate dispatch — see Stage 4 report.

---

## Base stats (from BEN10_ALIEN_POOL.feedback — pre-existing)

`hp 980, spd 8, dmg 0.95, role zoner, color #0891b2 (cyan)`. Moderate offense,
reasonable durability — fits an absorption specialist whose defensive counter is
its identity. Special: "Energy Discharge" (cost 22). Ultimate: "Overload".

---

## Open questions / reserved / deferred

- **Projectile sprites** (`*_projectile.png`) — reserved; procedural cyan used
  (matches diamond_shard). Re-sliceable later if hand-authored gutters are added.
- **`feedback_dash.png`** — reserved; candidate for a future dash-special.
- **Dedicated melee / guard / hurt / intro art** — absent; reuse/STOPGAP as above.
- **Voice / taunt / win-lose** — out of scope for this build (deferred).
