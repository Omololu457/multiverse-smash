# IRON MAN 3 — Stage 0 Asset Map & Investigation Report

**Source:** `Game Boy Advance - The Invincible Iron Man - Playable Characters - Iron Man.png`
**Dimensions:** 1396 × 2471, RGB (no alpha)
**Background key:** solid blue `(77, 109, 243)` — chroma-key on this.
**Ripper credit (on-sheet box, top-right):** **"Mr. L"**, hosted on The Spriters Resource (TSR mascot present). Box states "Credit? No / Permission? No" — ripper waives it, but **we attribute anyway** per project standing rule → credits.js entry "Mr. L (TSR), The Invincible Iron Man (GBA)".
**Proposed roster key:** `iron_man_3` (display "Iron Man", GBA). Fully **independent** — no sharing with `iron_man` (JUS chibi) or `iron_man_2` (Data East 1991). Nothing built here backfills those two.
**Frame geometry:** small GBA sprites, ~30–33px pitch, height ~40–48px. Expect a large spriteScale (Iron Man 2 used 2.0; tune in Stage 1 to match roster ~110px idle height).

> Stage 0 = investigation only. **No gameplay code written.** This is a real first-hand
> pixel + label pass — nearly every row is self-labeled on-sheet; all labels below were
> read directly from the sheet, not inferred.

---

## Full row inventory (top → bottom)

Vertical order confirmed by direct crops. Frame counts are best-estimate from column
detection; Stage 1 reslice will detect precisely.

### Movement / state (top block, y≈0–700)
| Row | Label (on-sheet) | ~Frames | Role | Notes |
|---|---|---|---|---|
| 1 | **Idle** | 6 | Idle loop (PRIMARY) | short loop, ~32px pitch. **RESOLVED item 1** |
| 2 | **Idle** (2nd, longer) | ~16 | Idle-variant / blink cycle | the "second Idle" — longer sequence. Use as optional idle-variety, NOT the base loop |
| 3 | **Running** | 8 | walk + run | **No separate Walk** (item 2) — Running fills both, like Superman 2 / Iron Man 2 |
| 4 | **Turning Around** | ~2–3 | flip/turn | standing variant |
| 5 | **Looking Up** | ~1–2 | aim-up pose | aim-repositioning |
| 6 | **Crouching / Looking Down** | ~1–2 | crouch / aim-down | |
| 7 | **Turning Around (Crouching)** | ~2 | crouch turn | |
| 8 | **Jumping** | 9 | jump rise/apex/fall | full arc |
| 9 | **Double Jump** | distinct | double-jump | GENUINELY distinct — own **thruster-burst cloud** mid-sequence (item, confirmed) |
| — | **Dashing** | own row + FX | dash | separate effect row (mid-block, y≈1090) |

### Normals — Shooting contexts (y≈545–730)
| Label | Role | Notes |
|---|---|---|
| **Shooting** (standing) | base ranged normal | arm-extended repulsor pose |
| **Shooting (Running)** | contextual normal | keep individually |
| **Shooting (Crouching)** | contextual normal | keep individually |
| **Shooting (Jumping)** | contextual normal (air) | keep individually |
| **Shooting (Double Jump)** | contextual normal (air) | keep individually |

→ 5 explicitly-labeled shooting-context variants; **do not collapse** (item, sheet-labeled).

### 3-Tier Charge System (y≈760–1010) — CONFIRMED on-sheet
| Label (on-sheet) | Tier | Content |
|---|---|---|
| **Basic Shot** | T1 | small energy-bolt projectile — travel + impact frames |
| **Charging Shot** *(label: "Put over Iron Man's Fist")* | windup FX | fist-composite charge graphic — **composite onto fist during windup** (follow ripper note) |
| **Charged Shot** | T2 | larger **cyan-white** burst projectile |
| **Supercharging** *(label: "Starts after a while of Charging")* | windup FX | tier-3 charge frames (cyan) |
| **Supercharged Shot** | T3 | brightest **yellow-white** burst — top tier |

→ Build as ONE real 3-tier charge (Basic → Charged → Supercharged), windup FX composited over fist. (item 5)

### Super tier (y≈1140–1780)
| Label (on-sheet) | Notes |
|---|---|
| **Super Move** (standing) | ~12f windup (arms-raised, spinning ring over head) → burst pose |
| **Super Move (Midair)** | midair variant with thruster clouds |
| **Super Laser** | long horizontal cyan beam, multi-frame |
| **Super Nova** *(label: "Kills all onscreen Enemies")* | expanding concentric rings — screen-clear |

### Hit reactions / state (y≈1800–2145)
| Label | Notes |
|---|---|
| **Start of Level** | non-combat intro pose sequence |
| **End of Level** | 6-frame victory arm-pump — clean **win-pose** candidate |
| **Hurt** | hit reaction |
| **Hurt (Crouching)** | |
| **Hurt (Jumping)** | |
| **Falling (Killed in Midair)** | air-knockdown |
| **Dead** *(label: "First four sprites loop a few times as Iron Man rolls")* | **preserve looped sub-sequence** — first 4 frames loop, then settle (item 7) |

### Non-gameplay / UI (EXCLUDE from moveset)
- **Extra Life** icon (bottom-left) — EXCLUDE.
- **End of Level Flag** (white flags) — EXCLUDE.
- **Box-art / comic renders** (bottom strip) — EXCLUDE from animations.
- **Boxed helmet portrait** (bottom-center, black box, Iron Man mask bust) — **EXCLUDE from moveset but USE as the character PORTRAIT source** (clean framed bust).

---

## Open-item resolutions

**RESOLVED (no owner input needed):**
1. **Idle primary vs variant** → Top 6-frame row = **primary loop**; 2nd longer row = blink/idle-variant. Base idle uses the 6-frame row; variant is optional idle-variety.
2. **No Walk** → confirmed source structure; Running serves walk+run.
3. **Exclude UI/box-art** → Extra Life, End-of-Level Flag, comic renders excluded. Boxed helmet render repurposed as portrait.
5. **3-tier charge** → build faithfully as Basic → Charged → Supercharged with composited fist windup.
7. **Dead loop** → first 4 frames loop then settle; don't flatten.

**OWNER DECISIONS — LOCKED (2026-08-22):**

- **DECISION A (item 4) — Start/End of Level inclusion: LOCKED = INCLUDE BOTH.**
  Start of Level → intro pose; End of Level (6f arm-pump) → win pose.

- **DECISION B (item 6) — Super tier mapping: LOCKED = Nova=ULT, other two=specials.**
  - **Super Nova = Ultimate** (screen-clear, on-sheet "Kills all onscreen Enemies").
  - **Super Move** (standing + midair) and **Super Laser** = two **separate Stage-4 specials**.

---

## Proposed build outline (for reference — not yet built)

- **Stage 1** movement: idle(6f)/idle-variant/running(=walk+run)/turn/turn-crouch/lookUp/crouch-lookDown/jump(9f)/doubleJump(FX)/dash(FX) + hurt set + Dead(loop-4). Portrait = boxed helmet render.
- **Stage 2** normals: 5 Shooting contexts (standing/running/crouch/jump/doubleJump) as light/heavy/air-normals mapping (×0.60 project rule).
- **Stage 3** command chains: **NONE** — no chain notation on sheet (item, do not invent).
- **Stage 4** specials: **3-tier charge** (Basic/Charged/Supercharged, composited fist FX) + [pending DECISION B] Super Move (standing/midair) + Super Laser as specials.
- **Stage 5** ultimate: [pending DECISION B] **Super Nova** screen-clear.
- **Stage 6** portrait/harness/balance: watch — 3-tier charge + screen-clear ult = high ranged-power density; flag as potential outlier in BALANCE_AUDIT once real numbers exist.

## Deferred / open
- DECISION A (Start/End of Level inclusion) — owner.
- DECISION B (Super Move/Laser/Nova → 2 specials + Nova ult) — owner, inferred not confirmed.
- Exact frame counts for turn/lookUp/crouch/hurt rows → Stage 1 reslice precision pass.
