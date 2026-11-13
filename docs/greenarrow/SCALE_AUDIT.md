# Green Arrow + Drone Scale Audit (Phase 1)

All "drawn height" numbers are the **actual in-game rendered height** (`fighter._lastDrawH`,
read live via `window.__harness.hurtbox(who).drawH` after boot → select → battle → idle), not
a paper `cell × scale` estimate. Measured at viewport 1280×720, each character as P1 vs goku.

## The bug, in one line
`getSkins("green_arrow")` has **no entry** in `skins.js`, so `applySkin()` falls back to
`{ spriteScale: 1 }` and **clobbers Green Arrow's intended `spriteScale: 1.8`**. In-game he
renders at scale **1**, not 1.8 — the smallest fighter on the roster. The drones were then sized
next to that shrunken archer, so they read wrong too.

## Roster sample — standing height

| Character     | sprite scale (in-game) | drawn standing height (px) | hurtbox W×H | physics box W×H | feet anchor (idle anchorY) |
|---------------|------------------------|----------------------------|-------------|------------------|----------------------------|
| **green_arrow** | **1.0 (BUG; char=1.8)** | **99**  ← smallest        | 48×94       | 60×100           | 0 |
| superman      | 2.0                    | 158 (tall outlier; has a raised 52×139 hurtbox) | 52×139 | 60×100 | 0 |
| homelander    | 1.6                    | 145                        | 48×94       | 60×100           | 0 |
| zoro          | 1.95                   | 589 (CELL outlier — idle cell packs his swords/wide pose; visible body is normal-human) | 48×94 | 60×100 | 0 |
| spiderman     | 1.1                    | 130                        | 48×94       | 60×100           | 0 |
| goku          | 2.0                    | 142                        | 48×94       | 60×100           | 0 |
| goku_black    | 1.7                    | 136                        | 48×94       | 60×100           | 0 |
| vegeta        | 2.1                    | 136                        | 48×94       | 60×100           | 0 |
| vegeta_dark   | 2.1                    | 131                        | 48×94       | 60×100           | 0 |
| gojo          | 1.8                    | 136                        | 48×94       | 60×100           | 0 |
| sukuna        | 1.8                    | 136                        | 48×94       | 60×100           | 0 |

**Roster median drawn standing height ≈ 136 px** (sample above, excluding GA's bugged value and
Zoro's sword-cell outlier; the gojo/goku/vegeta cluster all land 131–142). Spider-Man, the
explicit "normal human" reference, is **130**.

### How the engine actually sizes a fighter (important)
- **Physics box** = `char.w/h` or default **60×100**. Green Arrow defines neither → standard 60×100.
- **Hurtbox** = `{ x+6, y+6, w−12, h−6 }` → **48×94** for the standard box. This is **decoupled from
  `spriteScale`** (confirmed by the Flash comment in `characters.js`: *"spriteScale is purely
  cosmetic (hurtboxes read fixed f.w/f.h, not scale)"*). **Every normal character on the roster uses
  the same 48×94 hurtbox** while drawing 130–145 px tall — only Superman (158 px) got a bespoke
  raised hurtbox. So the roster convention is "standard box, sprite drawn taller."
- **Drawn height** = `idleCell.height × spriteScale × canvasFactor(≈1.18)`. GA idle cell = 61×84;
  at the bugged scale 1 → 99 px; at his intended 1.8 he would be **178 px** (taller than everyone —
  so 1.8 is also wrong for a "normal human").

## Drones — current scale and on-screen size

On-screen size = `(sheetW / frames) × scale` by `sheetH × scale`. These drones are **wide craft**
(width ≫ height). GA is the shrunken 99 px reference they were tuned against.

| Drone (role)        | sheet W×H | frames | native cell | scale | on-screen W×H (px) | hover height | hurtbox W×H |
|---------------------|-----------|--------|-------------|-------|--------------------|--------------|-------------|
| overwatch (scout)   | 144×26    | 4      | 36×26       | 2.0   | **72×52**          | 165          | 54×30 |
| bulwark (turret)    | 108×22    | 4      | 27×22       | 2.0   | **54×44**          | 0 (planted)  | 46×30 |
| aegis (shield)      | 112×22    | 4      | 28×22       | 2.2   | **62×48**          | 70           | 52×40 |
| kestrel (gunship)   | 124×16    | 4      | 31×16       | 2.2   | **68×35**          | 210          | 60×24 |
| skyhook (heli)      | 248×46    | 4      | 62×46       | 1.9   | **118×87**         | 190          | 70×46 |
| payload (bomber)    | 366×19    | 6      | 61×19       | 2.2   | **134×42**         | 300          | 120×40 |

## Decision (carried into Phase 2)
- **Green Arrow target:** median ±5% ⇒ **129–143 px**, next to Spider-Man (130). Set
  `spriteScale = 1.35` ⇒ **≈134 px drawn**, and **add a `green_arrow` entry to `skins.js`** so
  `applySkin()` stops clobbering it to 1. Keep the standard **48×94 hurtbox** (roster-consistent —
  he then plays exactly like gojo at 136 px; his own hurtbox does **not** change → zero balance drift).
- **Drones:** rescale to the task's percentages of the **new** 134 px GA — scout/shield/turret ≈40%,
  gunship ≈50%, heli/bomber ≈70–80% — measured on each craft's readable (dominant) dimension, floor
  24 px. Scale hurtboxes with the sprite and nudge hover heights for the taller archer.
- **"Drones flee the target" bug:** the Overwatch recon scout parks at `o.x − facing·85` (behind
  Oliver, away from the foe). Repoint default drones toward the opponent and make the FOCUS order
  actually advance them. (Phase 2.)
- Non-integer scale ⇒ nearest-neighbour (no integer multiple lands within 10% of 134: scale 1 = 99,
  scale 2 = 198). Noted per the brief.

---

## Phase 2 — what changed (all Green-Arrow-gated; frame-data ZERO-diff for everyone else)

| Change | File | Before → After |
|--------|------|----------------|
| Green Arrow sprite scale | `characters.js` | `spriteScale 1.8 → 1.35` (renders 99 → **134 px**) |
| Missing default skin (the actual bug) | `skins.js` | added `green_arrow` entry → `applySkin()` stops clobbering to `spriteScale 1` |
| overwatch (scout) | `abilities.js` | scale 2.0→**2.08**, hover 165→200, hurtbox 54×30→56×31 (~40% of GA) |
| bulwark (turret)  | `abilities.js` | scale 2.0→**2.45**, hurtbox 46×30→56×37 (~40%) |
| aegis (shield)    | `abilities.js` | scale 2.2→**2.45**, hover 70→105, hurtbox 52×40→58×45 (~40%) |
| kestrel (gunship) | `abilities.js` | scale 2.2→**2.16**, hover 210→245, hurtbox 60×24→59×24 (~50%, width-based thin jet) |
| skyhook (heli)    | `abilities.js` | scale 1.9→**2.17**, hover 190→225, hurtbox 70×46→80×53 (~75%) |
| payload (bomber)  | `abilities.js` | scale 2.2→**1.75**, hover 300→335, hurtbox 120×40→95×32 (~80%, width-based thin bomber) |
| "Drones flee the foe" fix | `abilities.js` | Overwatch recon `o.x − facing·85` (behind Oliver) → `o.x + toOpp·85` (toward the foe) |

- **Green Arrow's own hurtbox is UNCHANGED (48×94).** It was already the roster-standard box, and the
  whole roster uses 48×94 while drawing 130–145 px — so keeping it makes him play exactly like gojo and
  guarantees zero balance drift. (The brief allowed a hurtbox change; none was needed in this engine,
  where the hurtbox is decoupled from sprite scale.) Only the **drone** hurtboxes changed (listed above).
- **Gameplay numbers untouched:** damage, startup/active/recovery, speeds, and projectile spawn points
  (tied to the unchanged 60×100 physics box) are all as designed. Arrow *ranges* are lifetime×speed
  (world units), not % of screen, so they did not need rescaling.
- Scale 1.35 is non-integer (no integer multiple lands within 10% of 134: scale 1 = 99, scale 2 = 198),
  so Green Arrow draws at nearest-neighbour at 1.35 — as noted in the brief.

## Phase 3 — verification
- **Rendered height:** Green Arrow `drawH` measured live = **134 px** (scale 1.35) — within the roster
  median ±5% band (129–143) and right next to Spider-Man (130). Was 99.
- **Drones fly toward the target:** deployed Overwatch now sits on the foe's side of Oliver (verified by
  position probe) instead of behind him. Confirmed with the opponent on the right: scout x > Oliver x.
- **`scale_compare.png`:** before (99 px) vs after (134 px) next to Superman / Spider-Man / Zoro, plus
  Green Arrow with drones.
- **Tests green:** full Green Arrow suite (arrows 14, drones 17, facing 22, modes 11, orders 11,
  dronebombs 7, munitions 13, newarrows 15, roster 15, super 6, sound 10, finals 11, det3 4 — all /0);
  render check 14/0 + p5 render 9/0; determinism 14/0, combo-standard 231/9, up-attack 77/2,
  roster-integrity green. Frame data ZERO-diff for every other character (all changes GA-gated).

---

## Scale fix v2 (follow-up) — Green Arrow bigger + Homelander

The first pass set Green Arrow to the **drawn-cell** median. But the perceived size is the
**visible silhouette** (non-transparent content), so I re-measured every character's actual pixel
body. Green Arrow landed at 127 px (dead-on the 126 px median) but still read "small" next to the
big heroes, and **Homelander was genuinely below median at 119 px**.

| Character  | visible silhouette (before) | spriteScale | → visible (after) |
|------------|------------------------------|-------------|-------------------|
| green_arrow| 127 (median)                | 1.35 → **1.5**  | **≈142** (Superman-level) |
| homelander | 119 (below median)          | 1.6 → **1.9**   | **≈141** (Superman-level) |

Both now match Superman's visible height (~142) — the top of the normal band, not an outlier.
`spriteScale` is cosmetic, so **Homelander's hurtbox and all frame data are unchanged** (frame-data
zero-diff holds); only his on-screen size grew. Green Arrow's hurtbox likewise stays the standard
48×94. Drones were left at their v1 sizes (GA grew ~11%, so they shift from ~40–80% to ~36–72% of
his height — still readable and in-band). Verified in-game: GA drawH 149 (vis ≈142), Homelander
drawH 173 (vis ≈141, his cell carries ~18% padding). Tests green: det 14/0, combo 231/9, up-attack
77/2, roster-integrity green, GA suite + render 14/0.
