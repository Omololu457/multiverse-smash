# BAKI HANMA — Asset Map & Content Audit (pre-build)

Baki Hanma — *Baki the Grappler / Baki* (Keisuke Itagaki). `rosterKey: TBD` (suggest `baki`).
Bare-chested young martial artist — spiky brown/auburn hair, tan skin, **maroon fighting
shorts**, barefoot. Pure hand-to-hand grappler/striker in canon.

**This is a CONTENT AUDIT + PROCESSING PASS ONLY — no kit designed, no gameplay code, no
normal/special slot assignments.** Stats / archetype / rosterKey are deferred to the design pass.

---

## SOURCE FORMAT
- Art arrived as **ONE master JUS (Jump Ultimate Stars) style sprite sheet**:
  `baki/baki_hanma_jus_sheet_by_srchimuelo_dfelcrv.png` — **1204×2184, 8-bit RGB, NO alpha channel**.
- Background is a **flat JUS green, sampled from the sheet's own four corners = `(0,128,0)`**
  (81.7% of all pixels; not assumed — measured). Keyed to transparent by
  `tools/reslice_baki.py` (distance-key `tol=60` + green-spill suppression on soft AA edges).
  A **full-height decorative yellow border stripe at x6–14 = `(255,242,0)`** is *not* green and
  survives the key; it is excluded from row slicing (`x_from=16`), not a sprite.
- **Row-only slice** (Step 2): horizontal row bands detected via **measured green gaps** in the
  left sprite column (gap-threshold scan, *not* assumed even spacing). Label-text bands (h≤14px,
  the yellow/white JUS captions) are skipped. Each band is cropped to the **leftmost contiguous
  sprite-frame cluster** (right-hand cut at the first green gap ≥55px) so far-right splash/photo
  islands don't bleed in. **No pixel content altered — crop + green-key only; no repack.**
- Output folder: **`baki_sliced/` — 33 files**: 16 primary `baki_row_NN.png` (rows 01–14, 17, 19)
  + 4 secondary `baki_row_NNb_*.png` (dash/guard/knockdown/lose) + **6 KOMA sub-splits**
  (`row_15a/15b`, `row_16a/16b`, `row_18a/18b`) + 7 carve-outs (portrait, splash, bonus box,
  3 ref-photos, header strip).
  Measurements sidecar: `baki_sliced/_measure.txt`.
- Frame counts below = **measured via alpha-gutter column scans** (≥4px content run; <4px runs
  flagged as debris). Where JUS packs frames edge-to-edge (no gutter) or a REPEAT-bracket / box
  border bridges them, the **measured blob-count is noted separately from the visual frame count**.

### Attribution (on-sheet credits — "Give credits if use")
- Sheet author (from filename): **`srchimuelo`** (DeviantArt; file id `dfelcrv`).
- On-sheet "Creditos" box lists: **Creed, AaronEvies, (Zarti)x, Aagus, Jojolion**.
- Full credits box preserved as `baki_header_photos_credits.png` for provenance.

---

## CONTENT INVENTORY

### Movement / state
| File | y-band | W×H | Frames (meas / visual) | Content | Conf |
|---|---|---|---|---|---|
| `baki_row_01.png` | 252–281 | 180×30 | 1 blob | ⚠ **NOT AN ANIMATION — HUD LIFEBAR** (label "LIFEBAR"): health/energy bar + mugshot icon + name plate | High |
| `baki_row_02.png` | 314–367 | 358×54 | 8 / **8** | **STANCE / idle** breathing loop (two 4-frame groups split by a divider) | High |
| `baki_row_03.png` | 388–448 | 306×61 | 7 / **7** | **WALK** cycle | High |
| `baki_row_03b_dash.png` | 388–448 | 117×61 | 2 / **2** | **DASH** (shares the WALK row-line, right side) — forward lunge | High |
| `baki_row_04.png` | 484–529 | 337×46 | 8 / **8** | **RUN** cycle | High |
| `baki_row_05.png` | 576–635 | 224×60 | 5 / **5** | **JUMP** (crouch → rise → apex → 2× fall/land) | High |
| `baki_row_05b_guard.png` | 576–635 | 120×60 | 3 / **3** | **GUARD/block** (shares JUMP row-line) | High |
| `baki_row_06.png` | 674–730 | 156×57 | 3 / **3** | **TAKING DAMAGE** — grounded hurt/flinch | High |
| `baki_row_06b_knockdown.png` | 674–730 | 338×57 | 6 / **6** | **Knockdown → getup** tumble (fall back → flat → face-down → push-up → rise) | High |
| `baki_row_19.png` | 2119–2181 | 154×63 | 4 / **4** | **WIN** victory pose | High |
| `baki_row_19b_lose.png` | 2119–2181 | 86×63 | 3 / **3** | **LOSE** defeat pose (shares WIN row-line) | High |

### Attacks — JUS button labels (`Y`=rapid, `B`=strong; `+dir` variants)
| File | y-band | W×H | Frames (meas / visual) | Content | Conf |
|---|---|---|---|---|---|
| `baki_row_07.png` | 773–827 | 180×55 | 3 / **3** | **"ULTIMATE ACTION"** — power/charge stance, "REPEAT" loop | Med-High |
| `baki_row_08.png` | 859–906 | 404×48 | 7 / **7** | **B ATTACK** — punch string (jab→cross→lunge) w/ red impact sparks | High |
| `baki_row_09.png` | 953–997 | 272×45 | 6 / **6** | **B+DOWN ATTACK** — low/body blow | High |
| `baki_row_10.png` | 1039–1092 | 193×54 | 4 / **4** | **B+UP ATTACK** — rising uppercut (launcher) | High |
| `baki_row_11.png` | 1125–1177 | 353×53 | 6 / **6** | **B+JUMP ATTACK** — aerial strike (2 groups) | High |
| `baki_row_12.png` | 1218–1270 | 283×53 | 6 / **6** | **Y+DOWN ATTACK** (2 groups) | High |
| `baki_row_13.png` | 1301–1353 | 329×53 | 7 / **7** | **Y+UP ATTACK** — rising strike w/ motion arc | High |
| `baki_row_14.png` | 1379–1436 | 325×58 | 6 / **6** | **Y+JUMP ATTACK** — aerial w/ motion arc | High |

### Specials — "KOMA ATTACK" rows (✅ MANUALLY SPLIT into sub-animations; measured cut lines)
The four KOMA bands were multi-sub-row / mixed (REPEAT-bracket lines, white box-borders, merged
FX+run bridged the gutters). They are now split at **measured green-gap cut lines** (see
`KOMA_SPLITS` in `tools/reslice_baki.py`) — no cut passes through a figure.
| File | region | W×H | Frames (meas / visual) | Content | Conf |
|---|---|---|---|---|---|
| `baki_row_15a_koma_combo.png` | y1500–1548, x19–293 | 275×49 | 6 / **6** | **KOMA** top sub-row — lunging low-kick combo (deep lunge w/ red arc) | High |
| `baki_row_15b_koma_barrage.png` | y1594–1665, x17–449 | 433×72 | 2 blob / **~5** | **KOMA** bottom sub-row — rapid straight-**punch BARRAGE** (big cream/orange fist FX, REPEAT loop). Frames merge (FX overlap) | High |
| `baki_row_16a_koma_rush.png` | y1672–1749, x16–547 | 532×78 | 13 / **~11** | **KOMA** top sub-row — 8-frame walk-in **approach** ("!") → dash-blur → **spin back-kick** (red arc) | High |
| `baki_row_16b_demo_opponent.png` | y1753–1861, x17–432 | 416×109 | 4 cells | ⚠ **KOMA demo** bottom sub-row — 4 white-boxed cells of the spin-kick landing on an **UNNAMED grey/white-haired OPPONENT** (not Baki). Box-frame borders included by design | High |
| `baki_row_17.png` | y1876–1967, x17–377 | 361×92 | 5 / **~7** | **KOMA** rapid-punch flurry (REPEAT loop) — **single clean action, no split needed** (measured island x602–645 = stray red-arrow FX) | High |
| `baki_row_18a_shockwave.png` | y1979–2060, x19–617 | 599×82 | 4 / **4** | **KOMA finisher** — deep-stance punch throwing 4× big **cream/pale-orange shockwave STREAKS** (stylized; see thematic flags) | High |
| `baki_row_18b_run.png` | y1979–2060, x627–1016 | 390×82 | 7 / **7** | **RUN / dash cycle** — was merged on row_18's line right of the shockwave block; now separated | High |

### Non-sprite art (carved out, flagged — NOT animation frames)
| File | Source region | Content | Conf |
|---|---|---|---|
| `baki_portrait_headshot.png` | header top-left | **MUGSHOT** face portrait (detailed illustration; label "MUGSHOT" caught top-left) — usable as select/VS portrait | High |
| `baki_splash_illustration.png` | right, x690–1060 | Big standing splash illustration of Baki — reference/promo art | High |
| `baki_bonus_palette_box.png` | top-right | ⚠ **"PALETTE UNUSED+BONUS"** box — palette recolors + **authored crossover/joke frames** (see thematic flags) | High |
| `baki_ref_photo_01_color.png` | x450–672, y1510–1666 | Embedded **JPEG anime screenshot** (muscular Baki) — was bleeding into row_15 | High |
| `baki_ref_photo_02_manga.png` | x595–705, y1655–1862 | Embedded **grayscale manga panel** — was bleeding into row_16 | High |
| `baki_ref_photo_03_color.png` | x378–585, y1876–1982 | Embedded **JPEG anime screenshot** (red-eyes Baki) — was bleeding into row_17 | High |
| `baki_header_photos_credits.png` | header strip | Anime-screenshot reference photos + "Creditos" box (provenance) | High |

---

## CROSS-FILE / MASTER-SHEET ANALYSIS
- **Master sheet:** this single file *is* the master atlas — all content cross-matched against it
  directly (no separate per-action exports existed to reconcile). No exported-file-without-source
  or source-without-export gaps.
- **Two-actions-per-row-line packing:** the sheet packs a **secondary action on the right of
  several row-lines**, sharing the same y-band as the primary. Detected + carved separately:
  WALK│**DASH** (row_03/03b), JUMP│**GUARD** (row_05/05b), TAKING-DAMAGE│**knockdown**
  (row_06/06b), WIN│**LOSE** (row_19/19b). These were auto-flagged as in-grid right-islands
  (x<680) and are **real animations, not debris**.
- **Splash-art bleed:** rows 01–11 also flag far-right islands at **x≥680** — these are the big
  standing splash illustration bleeding into the same y-lines; correctly **excluded** from the row
  crops (not exported as frames).
- **Embedded reference photos** (3) sit *inside* the KOMA bands (rows 15–17) and were bridged to
  the frames by red trajectory-dot FX. Detected via **unique-color block density** and removed
  before slicing; exported separately as `baki_ref_photo_*`.
- **Compression-damage check (unique-colors : opaque-pixels ratio):** all **sprite** rows read
  **0.001–0.008** (clean limited-palette pixel art — no JPEG damage). The 3 embedded photos read
  **0.28–0.51** *before* removal (the expected JPEG-damage signature) — confirming they are
  screenshots, not sprite art, and validating their separation. **No compression corruption in any
  sprite frame** (unlike the prior-character rip flagged elsewhere).
- **Debris islands:** only 1px slivers on rows 02/11/12/13/14 (dropped by the ≥4px filter) — no
  false frames admitted.
- **Duplicate/subset:** no whole-file duplicates. Internal frame reuse (idle ping-pong, run cycle
  loops) is normal animation looping, not misfiled duplication.

### Color sampling (measured mean / most-saturated — FX & accent)
| Element | Mean RGB | Most-saturated | Family |
|---|---|---|---|
| Maroon fighting shorts | (135,82,73) | (183,47,61) | dark red ✓ expected |
| Red impact spark (B attack) | (155,104,87) | (229,145,100) | warm red-orange (impact) |
| Cream shockwave streak (row_18) | (208,138,108) | (229,145,100) | pale warm cream-orange (motion-blur) |

**No FX reads in a blue / green / purple energy family** in the moveset — all warm
impact/speed-line tones. (The lone energy-colored element is the bonus-box green sword, below.)

---

## THEMATIC FLAGS — pure martial artist vs. stylized reinterpretation
Baki Hanma is a **pure hand-to-hand fighter** (no chakra / ki-blasts / supernatural techniques in
canon). Per the same convention applied to Light Yagami / L Ryuuzaki source material, the following
sheet content is **authored fighting-game reinterpretation, flagged rather than assumed literal:**
- **Motion-arc / speed-line FX** on Y+UP, Y+JUMP and the KOMA rows (red crescents) — read as
  **stylized motion-blur/impact**, grounded in warm tones; a plausible martial-arts embellishment,
  but not literal canon FX.
- **`baki_row_18` cream shockwave streaks** — large enough to read as an **air-pressure/energy
  wave**; the most "power-beyond-realism" element of the core moveset. Flag before using as a
  literal projectile.
- **`baki_bonus_palette_box.png`** — explicitly labeled "UNUSED+BONUS": contains a **blue-hair /
  orange-gi Goku homage** and a **green energy-SWORD pose** — overt crossover/joke content with a
  **supernatural energy weapon**. **Non-canonical; exclude from any grounded Baki kit.**
- **`baki_row_16` boxed demo** includes an **unnamed opponent character** (grey/white-haired) —
  not Baki; do not treat those cells as Baki animation frames.

---

## SUMMARY
- **Source:** 1 master JUS sheet (1204×2184, flat green `(0,128,0)`, no alpha) → **33 processed
  files** in `baki_sliced/` (green-keyed, row-only crop, no repack).
- **16 primary rows + 4 secondary actions + 6 KOMA sub-splits = 26 animation files.**
- **High-confidence IDs: 26** (stance, walk, dash, run, jump, guard, take-damage, knockdown, win,
  lose, 8 attack rows *(row_07 ULTIMATE at Med-High)*, 6 KOMA sub-animations, + 6 non-sprite
  carve-outs identified).
- **KOMA specials RESOLVED:** rows 15/16/18 manually split into 6 sub-animations at measured
  green-gap cut lines; `row_17` confirmed a single clean action. `row_16b` flagged (opponent).
- **Non-animation flagged: 6** — LIFEBAR HUD (`row_01`), portrait, splash, bonus/crossover box, 3
  embedded ref-photos, header/credits strip.
- **Gaps:** no dedicated **throw/grab** row isolated (only shown inside the `row_16` boxed demo);
  the "ULTIMATE ACTION" row is a **stance/charge loop**, not a full finisher sequence — the finisher
  payoff (if any) is folded into the KOMA rows.
- **Processing quality:** no compression damage in any sprite frame; embedded photos & splash bleed
  cleanly separated; only 1px debris (dropped). **No row was force-cut through a real figure.**
