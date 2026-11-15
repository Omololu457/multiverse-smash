# Megumi Fushiguro: sprite map and coverage ledger

| | |
|---|---|
| **Source** | `assets/megumi_fushiguro/source/megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg` (1920 × 4230, SHA-256 `aee09880…`, byte-identical copy of the supplied file). |
| **Extraction** | `tools/megumi/extract.py` (rectangles: `tools/megumi/frames.py`, cleaning: `tools/megumi/clean.py`). |
| **Every rectangle** | `docs/megumi/source_rects.json` (`frames` = rect + anchor + anchoring method per cell, `actions` = cell order per strip, `unusedFrames`). |
| **Contact sheets** | `contact_megumi.png` (every Megumi cell at its anchor), `contact_summons.png`, `contact_large.png` (Elephant / Mahoraga / domain). Contact sheets are review aids only; the ledger below is about **gameplay integration**. |

## Rules

- **Exact rectangles only.** Every cell is a hand-checked rectangle on the sheet.
  - Two rows where figures touch are split at a ≤ 3 px gap (`S('split')`; asserted by the extractor).
  - No two rectangles share a pixel (asserted).
  - Labels, captions, the MISS/HIT tags, white "/" separators, the snowflake logo and the signature are outside every rectangle. Totality `konMiss` cell 6 starts at y = 2212 to exclude the MISS tag.
- **Stable root anchors.**
  - **Megumi cells:** x from a head-template match against `stance0` (score < 40, else the bbox centre); y = the floor of that sheet row. Airborne groups (`airToadM`, `airNueM`, `jump` 3–6, `damage` 3–4) use their own bottom, so jumps and knockdowns keep their real vertical motion.
  - **Summons:** their own bounds and core-bottom-centre anchors; electricity and grass are excluded from the anchor.
  - **Elephant:** anchored at rump + 50 px, so the water extends forward without moving the body.
- **No invented art.** Nothing is redrawn, generated or interpolated. Scaling is nearest-neighbour at integer factors only. Megumi is drawn ×3; most summons ×2 (Toad, Rabbit and Mahoraga ×3), so the larger shikigami stay on screen.

## Coverage ledger (gameplay integration)

"Used" means the cell is drawn in actual play, intro, ultimate or HUD by the shipped code.

| group | cells | used | where it plays | unused cells |
|---|---|---|---|---|
| `stance` | 4 | 4 | idle / stance → `idle`, `introSettle` | — |
| `move` | 8 | 8 | walk / run → `dash`, `run`, `walk`, `walk_back` | — |
| `jump` | 12 | 10 | jump / fall / land → `doubleJump`, `fall`, `jump`, `land` | jump0, jump1 |
| `guardA` | 7 | 2 | crouch / guard → `crouch`, `guard` | guardA0, guardA1, guardA2, guardA5, guardA6 |
| `guardB` | 11 | 11 | taunt → `taunt` | — |
| `guardC` | 11 | 11 | low staff check → `mLow` | — |
| `special` | 13 | 13 | intro + Shadow Step → `intro`, `mStep` | — |
| `weakA` | 9 | 9 | light (jab chain 1) → `light` | — |
| `weakB` | 15 | 13 | heavy (sword arc) → `heavy` | weakB0, weakB1 |
| `weakC` | 13 | 13 | mL3 (staff, chain 3) → `mL3` | — |
| `wfwdA` | 6 | 6 | mL2 (kick, chain 2) → `mL2` | — |
| `wfwdB` | 11 | 11 | advancing sword → `mAdv` | — |
| `wfwdC` | 12 | 0 | — third forward weapon set | wfwdC0, wfwdC1, wfwdC2, wfwdC3, wfwdC4, wfwdC5, wfwdC6, wfwdC7, wfwdC8, wfwdC9, wfwdC10, wfwdC11 |
| `wupA` | 6 | 6 | uppercut → `up` | — |
| `wupB` | 12 | 0 | — second up weapon set | wupB0, wupB1, wupB2, wupB3, wupB4, wupB5, wupB6, wupB7, wupB8, wupB9, wupB10, wupB11 |
| `wupC` | 12 | 12 | rising staff launcher → `mLaunch` | — |
| `toadM` | 6 | 6 | Toad gesture → `mToad` | — |
| `toad` | 14 | 14 | Toad (Fwd+R1) — megumiFx | — |
| `airToadM` | 6 | 6 | aerial ender (winged Toad lash) → `mAirEnd` | — |
| `airToad` | 14 | 0 | not used in play (winged-Toad summon variant; the aerial ender uses Megumi's own airToadM gesture) | airToad0, airToad1, airToad2, airToad3, airToad4, airToad5, airToad6, airToad7, airToad8, airToad9, airToad10, airToad11, airToad12, airToad13 |
| `nueM` | 6 | 6 | Nue gesture → `mNue` | — |
| `nue` | 9 | 9 | Nue (Up+R1) + ultimate Nue beat | — |
| `dogM` | 6 | 6 | Divine Dog gesture → `mDog` | — |
| `dogBlack` | 5 | 5 | Divine Dog (alternating) + HUD stock icon + sink | — |
| `dogWhite` | 5 | 5 | Divine Dog (alternating) | — |
| `serpentM` | 6 | 6 | Great Serpent gesture → `mSerpent` | — |
| `serpent` | 7 | 7 | Great Serpent (Back+R1) | — |
| `rabbitM` | 6 | 6 | Rabbit Escape gesture → `mRabbit` | — |
| `rabbit` | 8 | 8 | Rabbit Escape (Down+R1) | — |
| `airNueM` | 6 | 6 | air normal + Air Nue gesture → `air`, `mAirNue` | — |
| `airNue` | 10 | 10 | Air Nue (air R1) | — |
| `signKon` | 14 | 14 | ultimate opener (hand sign → Totality) → `ultOpen` | — |
| `konMiss` | 7 | 7 | ultimate opener lunge (whiff branch) + final shadow strike (cell 0) | — |
| `konHit` | 10 | 10 | ultimate Totality claw beat | — |
| `signElephant` | 15 | 15 | Max Elephant gesture → `mElephant` | — |
| `elephant` | 16 | 16 | Max Elephant (Down+△) + ultimate water beat | — |
| `signMahoraga` | 9 | 9 | Mahoraga intro sign → `introMahoraga` | — |
| `mahoraga` | 29 | 29 | Mahoraga intro showcase (presentation only) | — |
| `signDomain` | 9 | 9 | ultimate domain sign + cut-in → `ultSign` | — |
| `domain` | 15 | 15 | ultimate domain spread / recession → `ultDomain` | — |
| `damage` | 10 | 10 | hurt / air hurt / knockdown / getup → `getup`, `hurt`, `hurt_air`, `knockdown` | — |
| `win` | 11 | 11 | win → `win` | — |
| `lose` | 5 | 5 | lose → `lose` | — |

**Totals: 426 cells extracted, 379 used in gameplay / presentation, 47 unused.**

## Unused cells and why

| cells | reason |
|---|---|
| `guardA` 0, 1, 2, 5, 6 | Crouch-transition and alternate guard poses. The guard / crouch actions use cells 3–4, which hold cleanly. |
| `jump` 0, 1 | Crouch-anticipation cells. The shared jump leaves the ground on the press frame, so a wind-up would read as input lag. |
| `weakB` 0, 1 | Sword draw from the shadow. Skipped so the 12 f heavy shows the arc on time. |
| `wfwdC` 0–11 | A third forward weapon string (sword combo). The kit already has a forward kick (mL2) and the advancing sword (mAdv); a third forward normal would duplicate a role. |
| `wupB` 0–11 | A second upward weapon set. Up-Attack uses `wupA` (uppercut) and Up + Heavy uses `wupC` (rising staff). |
| `airToad` 0–13 (summon strip) | The winged-Toad summon on its own. The aerial ender plays Megumi's own `airToadM` gesture strip, which already contains the Toad lash. The name of this Toad + Nue fusion is inconsistent across sources (MOVESET.md, canon), so it is not presented as a separate summon. |

## Action → strip summary

`megumiSprites.js` (generated) maps every action to its strip.

| | |
|---|---|
| **Player strips** | `assets/megumi_fushiguro/<action>.png` (42 strips; per-action cell size). |
| **Summon strips** | `assets/megumi_fushiguro/summons/<group>.png` (12 strips). |
| **Skins** | `assets/megumi_fushiguro/skins/<tag>/` (same layout as the player strips). |
| **Shared timelines** | Per-move frame timelines live in `megumiData.js` `TIMELINE`. Animation loops never create hits; hit windows are explicit (MOVESET.md). |
