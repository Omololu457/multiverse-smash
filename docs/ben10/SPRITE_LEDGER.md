# BEN 10 — SPRITE LEDGER (Phase 1)

Authoritative frame→move map for the human-Ben sprite sets. Written from the real
extracted frames (the pipeline's contact sheets), not from memory. Extraction is
reproducible via `ben10_work/extract.py` (chroma-key + connected-component cut) +
`ben10_work/pack.py` (uniform feet-baseline strips). **No art was invented or
recolored on disk** — only sliced from the two source sheets.

Model: Ben 10 is ONE roster fighter (`ben10`) that transforms (Omnitrix). The three
selectable **variants** are the human Ben appearance; they use the `skins.js` variant
mechanism. Alien forms swap the whole sprite set at runtime (`fighter._skinAnim`,
`fighters.js` `BEN10_FORM_ANIM`) and are documented separately (Phase 4 / `aliens.js`).

Source sheets (copied by explicit path, originals untouched):
- `assets/sprites/ben10/ben_alienforce.png` — xmaygrrr JUS sheet, **green-jacket Ben**
  (canon Alien Force, 2008), **blue `(0,64,128)` background**. → **Alien Force** (default).
- `assets/sprites/ben10/ben_classic.png` — goobtubes JUS sheet, **white/black raglan
  shirt + green cargo pants** (canon Classic, 2005), **white `(255,255,255)` background**,
  row-labeled. → **Classic**.

> Variant naming was confirmed with the owner: **green jacket = Alien Force (default)**,
> **white/black shirt + green pants = Classic** (matches the sheet-filename intent + show
> canon; the brief's costume-prose descriptors were internally swapped).

---

## Variant: ALIEN FORCE (default) — `ben_alienforce.png`

Human frames occupy the **top band** (≈ y0–695, x0–820); everything below is aliens
(Heatblast, Wildmutt, Fourarms, Big Chill, Astrodactyl, …) + green/gray transform
silhouettes + FX — all EXCLUDED. Frame indices are `row.col` from
`ben10_work/contact_afh.png` / `geo_afh.json`.

| Output strip (`ben10_<a>_uniform.png`) | Frames used | Pose / source | Triggering move / state |
|---|---|---|---|
| idle      | 1.0, 6.0 | two neutral standing poses | idle / neutral |
| walk      | 1.3,1.4,1.5,1.6 | 4-frame walk cycle | walking |
| run / dash| 2.0–2.6 | 7-frame run cycle | running, dash |
| jump      | 2.7 | rising leap | jump rise |
| fall      | 2.9 | airborne | jump fall |
| crouch    | 3.4 | low stance | crouch / block-low |
| guard     | 7.0 | guard stance | blocking |
| hurt      | 5.5, 5.6 | stagger recoil | hitstun |
| knockdown | 5.0, 5.2 | fall → flat-on-back | knockdown |
| getup     | 5.3 | rising | wake-up |
| light     | 7.1, 7.4 | jab windup → extended straight | **Light (Jab)** |
| heavy     | 7.2, 7.5, 7.6 | wind → extended punch + green FX → lunge | **Heavy** |
| up        | 8.4, 8.6 | high kick | **Launcher (Up)** |
| air       | 8.5 | aerial kick | **Air attack** |
| down_air  | 8.7 | downward kick | **Down-air** |
| grab      | 7.1 | reaching jab (reuse) | grab |
| transform | 6.1, 6.3, 6.4 | Omnitrix raise → green-spark flash | Omnitrix cast / revert FX |
| taunt / win | 1.1 | hand raised (confident arc) | taunt-heal, round win |
| intro     | 1.1, 6.4 | step → Omnitrix flash | round intro |
| lose      | 5.1 | knocked down | round loss |

**Excluded (Alien Force):** rows 0.x & 1.7–1.9 (tiny head mugshots), 9.x (Heatblast
flame FX), and the entire lower sheet (all alien forms + green/gray transform
silhouettes + projectile/FX frames). Reuse: `grab` reuses the jab pose; `down_air`
borrows the kick row (no dedicated dive art).

---

## Variant: CLASSIC — `ben_classic.png` (`__classic` strips)

The goobtubes sheet is **row-labeled**. Human frames are the top 4 labeled rows
(`IDLE/WALK/RUN/ATTACK/HANDWORK`, `CROUCH-SHIELD/TAUNT/JUMP/SHIELD-JUMP/SELECTING`,
`VICTORY/TRANSFORM`, `JAB1/JAB2/METEORSMASH`); everything from `HEATBLAST` down is
aliens — EXCLUDED. White bg chroma-keyed; the white shirt survived (outlines/shading
keep it off pure-255). Indices are `row.col` from `ben10_work/contact_clclean.png` /
`geo_clclean.json` (filtered to real full-body frames; green silhouettes + text labels
auto-dropped).

| Output strip (`ben10_<a>_uniform__classic.png`) | Frames | Pose / source | Move / state |
|---|---|---|---|
| idle      | 0.0, 0.1 | neutral stand | idle |
| walk      | 0.4–0.7 | 4-frame walk | walking |
| run / dash| 0.8–0.13 | 6-frame run | running, dash |
| jump      | 1.2 | leap | jump rise |
| fall      | 1.3 | shield-jump lean | jump fall |
| crouch    | 1.1 | crouch/shield | crouch |
| guard     | 3.0 | neutral stance | blocking |
| light     | 3.1, 3.2 | JAB1 extend | **Light (Jab)** |
| heavy     | 3.4, 3.5 | JAB2 extend | **Heavy** |
| up        | 3.8, 3.9 | METEORSMASH rise → dive | **Launcher (Up)** |
| air / down_air | 3.9 | meteor dive | **Air / Down-air** |
| grab      | 3.1 | reaching jab (reuse) | grab |
| transform | 2.2, 2.3, 2.4 | white flash → Ben+alien overlay | Omnitrix cast FX |
| taunt / win | 2.1 | VICTORY arm-up | taunt-heal, round win |
| intro     | 2.1, 2.2 | victory → flash | round intro |

**Reuse flags (Classic lacks dedicated art for these — documented per the brief's
"reuse the closest frame and say so"):**
- `hurt`, `getup` → reuse the crouch/shield pose (`1.1`).
- `knockdown`, `fall` → reuse the shield-jump lean (`1.3`).
- `lose` → reuse crouch (`1.1`).
- The wide `HANDWORK` frames (0.14–0.17) were **excluded** from Heavy: they carry a
  green console prop at the feet (off-model for a punch).

**Excluded (Classic):** all text-label components, green/white transform silhouettes
(except the 2.2 flash kept as transform FX), and every alien row (Heatblast → Ripjaws
→ …).

---

## Variant: PRIME — PENDING art

No Prime source sheet exists in the repo (owner: *"Prime = NOT in the repo. Do not
search for it."*). Prime is registered as a selectable variant that **falls back to the
Alien Force frames + a render-only green Omnitrix aura overlay** (`skins.js` ben10
entry: `benVariant:"prime"`, `primePending:true`, `auraOverlay:"#39ff14"`). When the
real `ben_prime.png` lands, drop it in and add a `BEN10_PRIME_ANIM` map the same way
Classic was done — no engine edits required. Waiting moves are tracked in
`docs/ben10/PRIME_PENDING.md`.

---

## Coverage check

Every kept human-Ben frame above is wired to at least one animation/move. All excluded
frames are alien forms, transform silhouettes, FX, text labels, or head mugshots — none
are usable human-Ben poses. Cell dims are the packer's measured values and are mirrored
verbatim in `characters.js` (Alien Force base `animationData`) and `skins.js`
(`BEN10_CLASSIC_ANIM`).
