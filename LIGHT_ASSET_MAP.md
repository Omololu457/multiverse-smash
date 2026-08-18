# LIGHT YAGAMI — SPRITE SHEET AUDIT (measurement + identification only)

**Scope:** measurement and identification pass. No gameplay code, no wiring, no engine integration.
All frame counts are from an **alpha-gutter column scan** (contiguous non-transparent columns separated by
fully-transparent gutter columns), never from `width ÷ frame-count`. Confidence ratings (high/medium/low)
are used throughout; anything inferred is labelled as such.

> ⚠️ **SOURCE DISCREPANCY — flagged, not corrected.** The request states the source is **Jump Force**. The
> master sheet on disk is named `light_yagami_jus_sprite_by_prodijiu_d6j521b.png` — **JUS = Jump Ultimate
> Stars** (a **Nintendo DS** game), authored/adapted by **prodijiu** (a DeviantArt handle, per the `_by_prodijiu`
> token and the "make by prodijiu" credit balloon baked into `row_01`). Jump Force is a PS4/console title; the
> filename evidence points to JUS/DS, not Jump Force. This is exactly the DS-rip context referenced in the
> compression-damage brief. **The audit treats the art as JUS-sourced (high confidence, filename + credit
> balloon) and flags "Jump Force" as unverified (the two are different games).** The **voice** side is separate
> (see §0) and may have its own, different provenance.

---

## 0. Non-sprite context (voice pack — noted, not audited here)
236 audio clips `light_yagami_line_001_0000.0s.mp3 … light_yagami_line_236_0466.1s.mp3` exist on disk — a
single ~466-second recording sliced into timestamped lines (the `_NNNN.Ns` suffix is a start-time stamp). This
confirms the request's "matching voice file already sourced" claim. **Provenance of the voice is NOT
verifiable from filenames** (could be an anime/game rip; the timestamps only prove it was one long track split
into 236 pieces). Out of scope for a sprite audit — logged for completeness only.

---

## 1. FILENAMES (verbatim, typos/inconsistencies flagged, NOT corrected)
21 sprite PNGs (the only Light Yagami sprite art on disk; all `light_*_uniform.png` / `light_*__<tag>.png` /
`light_portrait*.png` / `light_kira_panel.png` / `light_asplanned_panel.png` / `light_skin_*` files are
DERIVED project outputs, not source uploads, and are excluded):

```
light_yagami_b.png
light_yagami_b_down.png
light_yagami_b_forward.png
light_yagami_b_up.png
light_yagami_damage.png
light_yagami_jump.png
light_yagami_jump_b.png
light_yagami_jump_y.png
light_yagami_jus_sprite_by_prodijiu_d6j521b.png     ← MASTER (see §2)
light_yagami_koma.png
light_yagami_koma_special_attacks.png
light_yagami_row_01.png
light_yagami_row_33.png
light_yagami_run_dash.png
light_yagami_stand_defense.png
light_yagami_ultimate_action.png
light_yagami_win_lose.png
light_yagami_y.png
light_yagami_y_down.png
light_yagami_y_forward.png
light_yagami_y_up.png
```
**Naming notes (flagged, not corrected):**
- Inconsistent scheme: most files are `light_yagami_<action>.png`, but two use a numeric `row_NN` scheme
  (`row_01`, `row_33`) that references the master's row layout rather than an action — a different naming
  convention mixed into the same set.
- `light_yagami_jus_sprite_by_prodijiu_d6j521b.png` carries the source-dump token `d6j521b` (a DeviantArt
  asset id) and the game tag `jus` — verbatim, not normalised.
- No typos in the strict sense; the `b`/`y` prefixes are JUS button names (see §9), not descriptive action
  names, which reads as opaque without the master for cross-reference.

---

## 2. MASTER REFERENCE SHEET — **FOUND**
`light_yagami_jus_sprite_by_prodijiu_d6j521b.png` — **976 × 2055**, 159,411 opaque px, 176 unique colours.
This IS a single large labelled-row master (JUS-style layout). Authoritative cross-check for the individual
files. Horizontal-band scan → **36 content bands = 21 pose-rows (height > 14 px) interleaved with 15 thin
blue-label strips (height ≈ 10–13 px)** — the strips are the burned-in move-name labels between rows. The 19
action files + `row_01`/`row_33` are exports of subsets of these rows (see §7 duplicates, §8 gaps). **All
"unseen content" statements below are grounded in this master's measured band structure — nothing is guessed.**

---

## 3. PER-FILE MEASUREMENTS
Frame count = alpha-gutter column runs. `dims`, `runs` (per-run pixel widths), row-grid = horizontal-band count.
All individual files are **single-row** (1 horizontal band) unless noted. Debris = runs ≤ 10 px flagged as
likely fringe/label noise (recommend manual re-crop, not a raw-count trust).

| File | Dims | Frame runs (widths, px) | Rows | Debris / strays | Content type |
|---|---|---|---|---|---|
| `stand_defense` | 298×55 | 6: `22,22,22,25,25,25` | 1 | none | Character only (STAND ×3 + DEFENSE ×3) |
| `run_dash` | 714×57 | 16: `21,21,21,21,`**`1`**`,21,28,25,50,46,36,40,50,46,36,40` | 1 | **1 px stray @ x=145** (discard) → 15 real | Character only (RUN + DASH) |
| `jump` | 221×57 | 6: `33,25,36,22,22,24` | 1 | none | Character only |
| `damage` | 158×48 | 4: `36,35,33,22` | 1 | none | Character only |
| `b` | 545×66 | 16: `22,22,22,24,24,24,24,29,27,23,`\|`16,24,15,43,24,50` | 1 | none | **MIXED** (10 body + 6 gold-FX) |
| `b_forward` | 612×56 | 17: `22,22,22,24,24,24,24,29,27,23,`\|`31,52,26,13,16,16,15` | 1 | none | **MIXED** (10 body + 7 blue-FX) |
| `b_down` | 189×56 | 6: `25,25,27,25,25,23` | 1 | none | Character only |
| `b_up` | 431×58 | 8: `22,22,11,`\|`64,64,62,64,64` | 1 | none | **MIXED** (2 body + laugh + 5 Ryuk) |
| `y` | 510×90 | 7: `22,22,11,`\|`78,83,80,80` | 1 | none | **MIXED** (2 body + laugh + 4 vortex-FX) |
| `y_up` | 343×61 | 10: `33,25,36,`\|`16,24,33,`\|`21,21,21,21` | 1 | none | **MIXED** (3 body + rings/spark + 4 L) |
| `y_forward` | 367×64 | 7: `22,22,11,`\|`59,58,56,58` | 1 | none | **MIXED** (2 body + laugh + 4 L divekick+arc) |
| `y_down` | 266×70 | 6: `22,22,22,`\|`28,68,35` | 1 | none | **MIXED** (3 body + 3 violet-FX) |
| `jump_b` | 614×62 | 11: `33,25,36,`\|`35,52,70,97,94,41,39,20` | 1 | none | **MIXED** (3 body + 8 gunman/rocket) |
| `jump_y` | 462×80 | 8: `81,66,83,25,48,`\|`22,22,11` | 1 | none | **MIXED** (5 figure/FX + 2 body + laugh) |
| `koma` | 525×92 | 14: `94,`\|`22,22,22,24,24,24,24,29,27,23,`\|`22,22,11` | 1 | none | **MIXED** (panel + 10 body + laugh) |
| `koma_special_attacks` | 660×88 | 11: `94,`\|`25,25,27,`\|`50,63,62,76,62,`**`1`**`,62` | 1 | **1 px stray @ x=578** (discard) → 6 real scythe | **MIXED** (panel + 3 body + 6 scythe) |
| `ultimate_action` | 304×70 | 7: `22,22,22,`**`124`**`,29,27,23` | 1 | see row-grid note | **MIXED** (3 body + 124 px block + 3 body) |
| `win_lose` | 426×57 | 13: `22,22,22,24,24,24,24,29,27,23,`\|`22,22,11` | 1 | none | Character only (WIN 10 + LOSE 3) |
| `row_01` | 395×105 | 6: `177,46,24,15,12,15` | 1 | **`15,12,15` = ring frags** (see §6) | **MIXED metadata** (title balloon + face + body + rings) |
| `row_33` | 286×48 | 8: `41,46,`**`9,8`**`,19,`**`2`**`,17,54` | 1 | **`9,8,2` px = label-text frags** (discard) | Metadata only (section-label strip) |

**Row-grid checks (files whose height looked disproportionate to per-frame width):**
- `y` (90 px tall) & `jump_y` (80 px), `koma`/`koma_special` (88–92 px): the extra height is FX reach / the
  cut-in panel, NOT a stacked second row — **single row confirmed** (1 horizontal band each).
- `ultimate_action` **124 px run**: NOT a stacked row and NOT a single 124-px-wide pose. It is a **gapless
  composite of ~4 near-identical "writing in the notebook" sub-poses** (~31 px each) with no transparent
  gutter between them, so the column scan cannot split it. **Recommend manual re-crop into 4 sub-frames**
  before any use — a raw single-frame read here would render 4 overlapping figures. (MEDIUM-HIGH confidence
  on the "4 writing poses" read — visually inspected; the exact sub-frame boundaries are an even-quarter
  estimate, not gutter-measured.)

---

## 4. COLOUR SAMPLING (measured mean + most-saturated pixel per FX/accent element)
| Element (file, FX runs) | Mean | Most-saturated px | Family read |
|---|---|---|---|
| B gold spark (`b` 10–15) | `#F8E072` | `#FFDF00` (h52 s1.00 v1.00) | **Gold/yellow** ✓ |
| B+Fwd crescent (`b_forward` 10–16) | `#D2E8FC` | `#9CD0FE` (h208 s0.39 v1.00) | **Blue** ✓ |
| Y vortex (`y` 3–6) | `#B7D0DF` | `#008AFF` (h208 s1.00 v1.00) | **Blue** (pure) ✓ |
| Y+Fwd L divekick arc (`y_forward` 3–6) | `#2A1E36` | `#180052` (h258 s1.00 v0.32) | **Violet/purple** ✓ (arc drawn in a Shinigami-violet palette, not L's own tone) |
| B+Up Ryuk (`b_up` 3–7) | `#2D1F3B` | `#180052` (h258 s1.00 v0.32) | **Violet/purple** ✓ (dark Shinigami) |
| jump+B gunman (`jump_b` 3–10) | `#7A5747` | `#F72100` (h8 s1.00 v0.97) | **Red** ✓ (rocket/muzzle flash — the red attack-class) |
| notebook→scythe (`koma_special` 4–10) | `#54474C` (grey-violet) | `#582800` (warm, = body hair) | Violet scythe over a warm-body segment (mean pulled by body px) |
| Y+Down violet burst (`y_down` 3–5) | `#64546B` (violet-grey) | `#903800` (h23 warm outlier) | Mean reads **violet** ✓; a lone warm-saturated pixel appears — **LOW-confidence flag** (possible fringe or a warm FX core; re-crop the FX layer to confirm) |

**Family verdict:** every FX colour matches its expected attack-class family (gold / blue / violet / red). **No
colour reads as a foreign-character family** — no evidence of misfiled art. The violet Ryuk/L tones and the
red gunman flash are internally consistent as this set's "read-the-attack-by-colour" coding.

---

## 5. COMPRESSION-DAMAGE CHECK — **CLEAN (no damage)**
Ratio = unique colours ÷ opaque pixels. A lossy/JPEG-damaged sprite trends toward ~1:1; clean flat-colour
pixel art is far below that. **Every file measures 0.001–0.015** (unique colours 14–47 per action file; master
176 over 159k px = 0.001). This is **clean, flat-colour, binary-alpha pixel art** — the near-1:1 blow-up seen
on the prior Nintendo-DS-rip character does **NOT** recur here. No JPEG artefacting, no colour-count explosion.
`row_33` is the highest at 0.015 — expected, it is anti-aliased label TEXT, not character art (still nowhere
near damage territory).

---

## 6. MOVE ID + CONFIDENCE
| File / segment | Description | Confidence | Reasoning |
|---|---|---|---|
| `stand_defense` STAND (3) | Standing idle stance (breathe) | **High** | Clean 3+3 split; body-only, matches idle silhouette |
| `stand_defense` DEFENSE (3) | Guard/block (raise → hold → recoil), notebook visible | **High** | Distinct wider cells (25 vs 22 px); guard read is unambiguous |
| `run_dash` RUN (7) / DASH (8) | Run cycle + faster dash burst (wide dash cells) | **High** | Two clear width families (21 vs 36–50 px); 1 px stray excluded |
| `jump` (6) | Jump/rise→fall arc | **High** | Airborne poses; first 3 cells are the shared aerial base (§7) |
| `damage` (4) | Hit reaction → knockdown; **notebook drops on final frame** | **High** | Progressive recoil; the dropped-notebook detail is legible |
| `b` (10 body + 6 FX) | Neutral attack string + **gold** spark hit-FX | **High** | Body chain + separable gold-FX tail |
| `b_forward` (10 body + 7 FX) | Forward attack; body reuses `b`, **blue** crescent FX | **High** | Body is byte-shared with `b` (§7); FX family differs |
| `b_down` (6) | Crouching low swipe | **High** | Low, compact poses; no FX |
| `b_up` (2 body + laugh + 5) | Anti-air call-in of **Ryuk** (Shinigami), preceded by a laugh sprite | **High** | The 5 wide (62–64 px) cells are a recognisable winged Shinigami; violet palette |
| `y` (2 body + laugh + 4) | Neutral special: blue-white **vortex** hitbox (widest cells) | **High** | 78–83 px pure-blue vortex; clear |
| `y_up` (3 body + rings/spark + 4) | Rising special; golden rings → spark → **L Lawliet** follow-up | **Medium-High** | L figure legible; the rings/spark sub-frames are small and could be sub-split differently |
| `y_forward` (2 body + laugh + 4) | **L** diving kick trailed by a violet arc | **Medium-High** | Diving figure + violet arc clear; arc palette is Ryuk-violet not L's own (intentional per family read) |
| `y_down` (3 body + 3) | Downward violet burst (grow→strike→dissipate) | **Medium** | 3-frame violet FX read is plausible; small, and the colour sample had a warm outlier (§4) |
| `jump_b` (3 body + 8) | Aerial: an **unidentified lavender gunman** fires a rocket launcher (**red** flash) | **Medium** | Action (rocket) is clear; **the gunman character is NOT identifiable** — do not name him |
| `jump_y` (5 + 2 body + laugh) | Aerial: an **unidentified lavender figure** punch/thrust with speed-lines, then Light's recovery | **Medium** | Punch action clear; the figure's identity is unconfirmed |
| `koma` (panel + 10 body + laugh) | JUS support-panel cut-in ("JUST AS PLANNED") + notebook-writing body | **High** | Panel text legible; body reuses the `b` chain (§7) |
| `koma_special_attacks` (panel + 3 + 6) | Cut-in ("THAT'S RIGHT. I'M KIRA.") + **notebook→scythe** transform | **High** | Panel text legible; scythe morph is clear (1 px stray excluded) |
| `ultimate_action` (3 + 124 + 3) | Startup → **Death-Note writing composite (4 sub-poses)** → recovery | **Medium-High** | Writing read is confident; the 124 px block is a gapless composite needing manual 4-way re-crop (§3) |
| `win_lose` WIN (10) / LOSE (3) | Victory (reuses `b` body — reads as "writing another name") / defeat (2 body + laugh) | **High** | WIN body is byte-shared with `b`; LOSE ends on the laugh sprite |
| `row_01` seg 1 (177) | Title/credit balloon — **"make by prodijiu"** | **High** | Author-credit metadata, not gameplay content |
| `row_01` seg 2 (46) | Face portrait (mugshot) | **High** | Isolated head shot, HUD/select-usable |
| `row_01` seg 3 (24) | Single standing body pose (select preview) | **High** | Small full-body still |
| `row_01` segs 4–6 (15,12,15) | **Diamond-ring fragments** — the JUS charge/summon spin indicator | **Medium** | Reads as the JUS orbiting-ring UI element; only partially exported (see §8) |
| `row_33` (8 runs, 3 debris) | Section-label strip (blue move-name text) | **High** | All-metadata; the 2–9 px runs are letterforms, not frames |

---

## 7. DUPLICATE / SHARED ART (measured, byte-level where noted)
- **The 10-frame "B body" chain** `22,22,22,24,24,24,24,29,27,23` is **reused across 4 files**: `b`, `b_forward`
  (body only), `koma` (body only), `win_lose` (WIN segment). Widths are identical run-for-run; **store once,
  reference 4×** — do not treat as 4 distinct animations. (High confidence — exact width match; a byte-level
  crop compare is recommended to confirm pixel-identity vs. merely same-dimension.)
- **The `jump` first-3 cells** `33,25,36` reappear as the leading cells of `jump_b` and `y_up` (the shared
  aerial base). Reuse 3×. (High confidence — exact width match.)
- **`ultimate_action` recovery tail** `29,27,23` == the last 3 cells of the B body chain (the recovery tail is
  lifted from `b`). (High confidence.)
- **The 94 px cut-in panel** leads BOTH `koma` and `koma_special_attacks` (two different panels — "JUST AS
  PLANNED" vs "I'M KIRA" — same 94 px slot width, DIFFERENT art). Same slot, not duplicate content.
- **The 11 px "laugh" sprite** (クックック…) recurs as a trailing cell in `b_up`, `y`, `y_forward`, `jump_y`,
  `koma`, `win_lose` (LOSE). Same small laugh cell reused as a punctuation frame across specials/koma/lose.
- **Master band 0** (y16–120, h105) matches `row_01`'s content region (title + portrait + body + rings).

---

## 8. GAPS (master content vs. exported individual files — flagged, not invented)
Master pose-rows: **21** (h > 14). Exported action files: **18** (excluding `row_01`/`row_33`, which are
themselves master-row fragments). The mapping is **NOT 1:1** — several files MERGE what may be 1–2 master rows
(e.g. `stand_defense` = STAND+DEFENSE; `run_dash` = RUN+DASH), so a raw 21 − 18 subtraction is not a valid gap
count. **Measured, defensible gap statements:**
- The 15 thin blue-label strips on the master are **not** individually exported (nor should they be — they are
  burned-in move-name labels). Not a content gap.
- The **diamond-ring / charge-indicator** element is only **partially** exported (`row_01` segs 4–6 = 3 small
  frags); if it is a rotation set, the full cell sequence is not present as a dedicated file. **Real partial
  gap.** (Medium confidence.)
- Whether every one of the 21 master pose-rows has a dedicated export **cannot be confirmed without reading the
  blue row-labels to map row→file** — that mapping is **not attempted here** (would require per-row visual
  identification). **Estimate: 0–3 master pose-rows may lack a clean dedicated export** beyond what the merged
  files cover — flagged as **Medium-Low confidence**, not asserted. Recommend a labelled row→file cross-map as
  a follow-up if completeness matters.

---

## 9. THEMATIC NOTES
- **JUS ≠ literal Death Note combat.** In **Jump Ultimate Stars** (the actual source per the filename), Light
  Yagami is a **support ("koma"/panel) character, not a playable brawler** — Death Note has no physical combat
  powers, so his canon "ability" is writing names. This is *why* the `koma.png` / `koma_special_attacks.png`
  files exist: **`koma` is the JUS deck-support panel format**, and the "JUST AS PLANNED" / "I'M KIRA" cut-ins
  are panel art, not fighting moves.
- **The `b_*` / `y_*` attack files are a fighting-moveset REINTERPRETATION** — a stylised, theatrical fighting
  kit (Ryuk anti-air, L call-ins, an unidentified gunman, a notebook→scythe transform, gold/blue/violet/red
  hit-FX) that is **authored on top of the source**, not a literal adaptation of any Death Note mechanic. The
  Shinigami-scythe and summoned-detective moves are creative-license fighting-game flavour. **Explicitly:
  there is no literal "Death Note kill" mechanic in the art — it reads as a chibi-fighter reinterpretation**,
  consistent with the request's own caveat.
- **The "Jump Force" attribution in the request is contradicted by the sprite provenance** (JUS/DS + prodijiu).
  Light Yagami is not a playable roster fighter in Jump Force; if a Jump Force connection exists it would be on
  the *voice* side (unverified, §0), not these sprites.

---

## SUMMARY
- **Total sprite files:** 21 (+ 1 of those is the master; + 236 out-of-scope voice clips noted in §0).
- **High-confidence move IDs:** **~17** file/segment groups (all movement + normals + Ryuk/vortex/scythe/koma
  panels/win-lose/portrait + the two label/metadata files).
- **Ambiguous / Medium-or-lower:** **~7** — `y_up` sub-frame split, `y_forward` arc palette, `y_down` FX
  (warm-outlier), `jump_b` gunman (UNIDENTIFIED character), `jump_y` figure (UNIDENTIFIED character),
  `ultimate_action` 124 px composite (needs 4-way re-crop), `row_01` ring frags.
- **Likely gaps:** **1 confirmed partial** (diamond-ring/charge indicator only partly exported) + **0–3
  unconfirmed** master pose-rows pending a label→file cross-map (Medium-Low). No invented content.
- **Data-quality flags:** clean art (no compression damage, §5); **2 one-pixel strays** to discard
  (`run_dash` x=145, `koma_special_attacks` x=578); **`row_33` sub-10 px label-text runs** to discard; **12
  MIXED character+FX files** needing character/FX-layer separation before any wiring; **1 gapless composite**
  (`ultimate_action`) needing manual sub-frame re-crop.
- **Provenance flag:** source is **JUS (Jump Ultimate Stars, Nintendo DS) / prodijiu (DeviantArt)** per the
  master filename + baked credit balloon — **"Jump Force" (request) is unverified and likely incorrect for the
  sprites.**
