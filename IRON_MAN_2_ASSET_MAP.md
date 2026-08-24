# IRON MAN 2 — Stage 0 Asset Map (REAL visual pass — COMPLETE)

> Source: `Iron Man.png` — **1696 × 1249**, RGBA (bg 100% opaque khaki `[169,173,153]`).
> Data East "Captain America and The Avengers" (1991) arcade rip. Independent roster character
> (borrows nothing from Iron Man 1 / Iron Man 3, and nothing here is to be reused to patch them).
>
> This file SUPERSEDES `IRON_MAN_2_STAGE0_PRELIM.md` for the semantic findings. The prelim's
> programmatic layout/geometry still stands; every item the prelim marked "UNRESOLVED / needs eyes"
> is now resolved by a genuine first-hand visual pass (done 2026-08-22, fresh session, image cap reset).
>
> **STOP POINT: no gameplay code yet. Awaiting owner sign-off on the open decisions at the bottom.**

---

## CREDITS — RESOLVED (was the pre-ship BLOCKER)
On-sheet teal boxes, read directly:
- **"RIPPED BY FLÁVIO ARRUDA — PLEASE GIVE CREDIT IF USED — flavio_arruda_pe@hotmail.com"**
- **"EDITED BY FLÁVIO ARRUDA — PLEASE GIVE CREDIT IF USED — flavio_arruda_pe@hotmail.com"**
- Header box: **"Captain America and The Avengers — 1991 Data East Corporation"**, title **IRONMAN**.
→ `credits.js` SOURCED_ART: rip + edit by **Flávio Arruda**; original art © 1991 Data East. Blocker cleared.

---

## STAGE 0 ITEMS — all six resolved

### Item 1 — edited-vs-original fork on the walking-punch combo → **RESOLVED: cleaned re-selection, NOT a redraw. Safe to prefer "edited".**
- The top-row punch combo (y~135–235) exists as an **"edited"** group (labeled, ~4–5 frames) and an
  adjacent **original** group (~4–6 frames). Read order left→right: walk cycle → **edited** punch combo → original punch combo.
- **Visual verdict:** both depict the *same* move — wind-up → forward straight → overhead raise/swing → recovery stance.
  The "edited" version is a **frame-reduced / cleaned re-selection of the same art**, not a pose or content alteration.
- Corroborated by last session's pixel math (3 of 4 "edited" frames were IoU 1.00 / NCC 1.00 exact copies of original frames).
- ★ NOTE: a **SECOND "edited" label** exists on the band-D jump/aerial group (y~540) — same conclusion (cleaned reselection of the same aerial move). So "edited" is Flávio's cleanup convention across the sheet, never a redraw.
- **Decision:** use the **edited** punch frames for Stage 2. Exact frame split is a Stage-2 task (poses overlap; auto-splitter merges wide frames — count by eye at slice time).

### Item 2 — ripper's combo arrow/bracket notation → **REAL, readable, will be followed (not re-derived).**
- Groups sit under **brackets** (`⊔`/`⊓`) and link to follow-ups via **white arrows** (`→`, and one `←`).
- Documented links seen:
  - Run group (bracket) **→** Run-to-Crouch group (own bracket).  [item 3]
  - A grounded base group (bracket) **→** branches into TWO aerial follow-ups: an **"edited" jump/jet branch** (upper arrow) and a **flame-dive branch** (lower arrow).
  - Grounded normal groups bracket up into **overhead follow-ups** (the arms-overhead frames).
- Stage 3 command-chains will mirror this documented structure.

### Item 3 — Run vs Run-to-Crouch → **CONFIRMED separate bracketed groups; keep distinct.**
- **Run:** 6 frames, leaning sprint (y~245–335, x~38–560), own bracket.
- **Run-to-Crouch:** ~6 frames, descending transition into crouch (right of the `→`), own bracket. Do NOT merge.

### Item 4 — effect rows → **identities confirmed; frame counts still APPROX (exact split at Stage 4).**
- **Repulsor beam projectile:** **blue energy dart / arrowhead**, directional (`→` and mirrored `←`), ~3–4 anim frames, travels across screen. (Far-right panel, y~960–1060.)
- **Repulsor charge FX:** yellow flame bursts arranged **under the S/1/2/3/4*/E\* columns** (see item 5) — the muzzle/beam effect escalating by charge tier.
- **Impact / explosion:** yellow radial bursts (far-right, y~1080–1180).
- **Lock-on / homing-missile target:** yellow **circle-reticle + cross-sparkle + orbiting dot** (same far-right cluster) — the target-lock graphic.
- **Landing / thruster:** white ground dust-cloud under a diving figure (~4 frames, left of center y~1000–1120) + a small blue thruster wisp.
- **Repulsor firing poses:** many horizontal/prone firing poses w/ muzzle-flash at the hand, grouped by **red brackets** (bottom band) — the character mid-repulsor-fire, tied to the beam FX.

### Item 5 — charge meter S / 1 / 2 / 3 / 4* / E\* → **FOUND (was UNRESOLVED); tier BEHAVIOR is a design decision, not sourced.**
- Located y~1043, x~760–900: six column headers **`S  1  2  3  4*  E*`**, each above a repulsor-beam FX that **escalates** S→E\*.
- `S` = start/uncharged, `1`/`2`/`3` = ascending charge, **`4*` and `E*` = special/enhanced tiers** (the `*` marks the "special" steps; `E*` is the top/max tier).
- **The sheet shows only the VISUAL per tier — no damage/range/behavior numbers are annotated.** So *what each tier does* (damage, size, pierce, move-access) is an **open design choice**, grounded in this character's own art but not dictated by it. → see Open Decisions.

### Item 6 — portraits / select render → **CONFIRMED; exclude from anim atlas, use for HUD/select.**
- **Face-icon grid** (top-right, ~5×2): Iron Man helmet close-ups, **including damaged / hit-state variants** (cracked/impact overlay) — usable for a dynamic damage-reactive HUD portrait.
- **Full-body select render** on cyan background (top-right): clean standing hero pose — best portrait / select-screen art.

---

## RUNTIME ANIMATION INVENTORY (for Stages 1–5)
| Role | Location (approx) | Frames | Notes |
|---|---|---|---|
| Idle | top-left header | 2 | fighting-stance bounce, fists up |
| Walk | y135–235, x0–560 | 7 | alternating stride, fists up |
| Run | y245–335, x38–560 | 6 | leaning sprint, bracketed |
| Run-to-Crouch | y245–335, right of run | ~6 | separate bracket, `→`-linked |
| Walking-punch combo (edited) | y135–235, mid | ~4–5 | **use this** — wind-up→straight→overhead→recover |
| Walking-punch combo (original) | y135–235, right of edited | ~4–6 | reference only |
| Jump/jet + rising flame launcher | band D/E left branches | mixed | thruster flame at feet |
| Flying dive (flame trail) | band D/E lower branch | ~4 | repulsor flame streaming |
| Hurt → knockdown → getup | band E right | ~10 ×2 variants | tumble to back, rise |
| **WHHT!** dash/lunge | band C mid (y~500) + band D far-right white trail | — | named special, motion-line trail |
| Repulsor fire poses | bottom band, red brackets | many | horizontal firing w/ muzzle flash |
| FX: blue projectile / lock-on / impact / dust | far-right + center bottom | approx | see item 4 |
| Portraits + select render | top-right | — | HUD/select only |

---

## DECISIONS — LOCKED by owner (2026-08-22)
1. **Charge-tier behavior (item 5 / Stage 5):** **damage/size ramp.** S→1→2→3 scale beam damage + size smoothly; **`4*` adds pierce/knockback**; **`E*` (max, full meter) fires a big multi-hit beam.** Grounded in the escalating art.
2. **Ultimate designation:** **promote the `E*` max-charge repulsor into the super** (screen-scale repulsor beam). Ult is tied to the charge mechanic — NOT the WHHT! dash or flame-dive.
3. **Edited punch combo:** **ship the edited (cleaned) frames** for the normals.

## STILL DEFERRED to build stages (not blockers)
- Exact frame splits for the punch combo, effect rows, and knockdown variants (done at Stage 2/4 slice time).
- WHHT! dash exact frame extent (Stage 4).
