# MSV1-MERGE: the Ben 10 transformation swap, as found in the code

All line numbers below were read at start commit `8bdcd4e33`.

## Summary
**The input is NOT "hold Charge, then tap a key".** That was the old Omnitrix chord scheme. On 2026-11-17 it was
replaced (by the owner's request: no two-button chords) with **↓↓ then ONE button**. This is the swap that ships today.

| Step | What you do | Exact numbers |
|---|---|---|
| 1. Arm | Double-tap **↓**: a fresh ↓ edge within **16 frames** of the previous ↓ edge | `OMX_DOUBLE_TAP_WINDOW = 16` (game.js:12237) |
| 2. Pick | Within the next **18 frames**, press **one** button (a fresh edge) | `OMX_ARM_WINDOW = 18` (game.js:12238) |

The pick buttons:

| Key | Pad (padLayout.js) | Ben 10 meaning |
|---|---|---|
| J Light | button 2 (□ / X) | slot 1 |
| K Heavy | button 3 (△ / Y) | slot 2 |
| L Special | button 5 (R1 / RB) | slot 3 |
| **O Grab** | **button 4 (L1 / LB)** | **slot 4** |
| P Charge | button 6 (L2 / LT) | slot 5 |
| ; Block | button 1 (○ / B) | back to human |

↓ is the D-pad (button 13) or the left stick (axis 1). The picking press is consumed: `inputState.<button> = false`
plus `_omxConsume`, so it doesn't also swing or grab.

## Where it lives
| Part | File / line |
|---|---|
| Slot input table `BEN10_SLOT_COMBOS` (labels "↓↓ + Light" … "↓↓ + Charge") | game.js:12223-12229 |
| Windows | game.js:12237-12238 |
| Input handler `handleOmnitrixSwitch(fighter, inputState)`: ↓↓ detector on `omnitrix.simFrame` (sim frames), arm countdown, one-edge pick, revert | game.js:12259-12340 |
| Handler call site, every frame, for `isTransformDevice(fighter)` only | game.js:12121 |
| `ben10TransformOrSwap`: human → `ben10BeginTransform`, alien → `ben10Swap` | fighters.js:1778 |
| `ben10Swap(fighter, slot)`: the alien → alien swap | fighters.js:1757-1774 |
| `ben10BeginTransform`: human → alien | fighters.js:1733-1752 |
| `applyAlien`: moves / stats / art swap | fighters.js:~1580-1665 |
| `TRANSFORM_ENERGY` numbers | fighters.js:1810-1829 |
| `swapLockout` tick (once per sim frame, in `updateTransformDevice`) | fighters.js:1949 |

## The swap itself (`ben10Swap`, alien → alien)

**Cost and cooldown**
* **Cost:** `SWAP_COST = 15` Omnitrix Power (the fighter's energy bar). It is 22 under a Binding Vow.
* **Cooldown:** `SWAP_LOCKOUT = 30` frames between swaps.

**Refused when**
* the fighter is in **hitstun**;
* a swap lockout is active;
* a super/power commit is in progress (`_benPowerCommit`);
* the target is the form already active;
* there is not enough Power.

`ben10Swap` does not check blockstun.

**Animation:** no dedicated swap animation. There is a 6-frame `teleportFlash` (render), a 6-frame `colorFlash`
(set in `applyAlien`) and the `ben_swap` SFX cue.

**Invulnerability:** **none.** (Only the HUMAN → alien transform has a 40-frame window, and that window is
*vulnerable* startup.)

**Input lock:** `_attackInputLock = 6` frames.

**What carries across a swap**
| Carries | Detail |
|---|---|
| Health | Shared pool: clamped into the human's `maxHealth`, never healed or resized |
| Energy | Shared, minus the cost |
| Position | The new form's size is bottom-anchored, so the feet stay put |
| Facing, combo counter | Carry over unchanged |
| Super/ultimate meter | It is the same energy bar |

**What changes:** `basic_attacks` / specials / ultimate, speed, jumps, weight, damage multiplier and the sprite
set (`_skinAnim`).

**What resets:**
* `fighter.vx = 0`: the handler zeroes horizontal velocity on any successful pick (game.js, `if (act) … fighter.vx = 0`).
* The per-form state of the old alien, via `applyAlien`.

## How MSV1-MERGE reuses it
* **Same input shape**, read from the same config. The window numbers come from game.js through
  `MSV1_WORLD.omxWindows()`, which returns `OMX_DOUBLE_TAP_WINDOW` / `OMX_ARM_WINDOW`. Cost and lockout come from
  `TRANSFORM_ENERGY.SWAP_COST` / `SWAP_LOCKOUT`, imported from fighters.js. If Ben's numbers change, the duo's
  follow.
* **Not extracted.** `handleOmnitrixSwitch` is welded to Ben: slots, vow, Omnitrix Power, revert, transform
  startup. Pulling it into a generic helper would rewrite Ben's input path. So, as the brief allows, a small
  separate form-swap lives in ninja.js. Ben's code is byte-identical and his frame-data diff is zero.
* **Which pick button.** Of Ben's slot buttons, the duo uses **↓↓ then Grab (O / L1·LB)**. The others are taken by
  existing ninja moves:
  * ↓↓ + Charge = Ninja Mirror (both forms);
  * ↓↓ + Special = Burrow (Dustin);
  * ↓↓ + Block would delay a crouch-guard after a down-double-tap;
  * ↓↓ + Light / Heavy would eat a quick crouch attack.

  Grab has no ↓↓ meaning for either form, and it is a real Ben slot key (slot 4).
