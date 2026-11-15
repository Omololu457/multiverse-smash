# Megumi Fushiguro: asset quality report

Verdict: **adequate**. The supplied JPG produces clean, readable game frames for every group the build uses. The limits recorded below are real and remain in the shipped art. Enlarging the frames does not restore detail the sheet never had.

## The supplied file

| property | value |
|---|---|
| file | `megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg` (supplied in `~/Downloads/untitled folder/`) |
| preserved copy | `assets/megumi_fushiguro/source/` (byte-identical) |
| SHA-256 | `aee098808b8af0988e91f17f17416cba985841e7dd1838345b43799749b63940` |
| dimensions | 1920 × 4230, RGB |
| JPEG | progressive, quality tables all 1 (≈ quality 100), chroma 4:4:4 (no subsampling) |
| key colour | RGB(0,128,1), per-channel noise std ≈ 1.5–2.5 |

A second copy, `… (1).jpg`, is a ~q75 recompression of the same image, with quality-table means of 23 and 35. It was not used.

The other Megumi images already in the repo are different, smaller sheets: the 800×1155 brown "finhj" sheet and the "shibuya" PNG. They were not used.

## Has it been resized? Yes, downscaled

- **Edges are blended, not hard.** The black outlines fade into the green through intermediate dark-green pixels. Hand-placed pixel art would have hard edges, so this is resampling onto the key.
- **No integer pixel grid.** Neighbour-difference periodicity is flat at periods 2, 3 and 4, so the sheet is not an integer upscale either.
- **Conclusion.** The sheet was resampled to its 1920-px "fullview" width (a DeviantArt fullview). Some original pixel detail is permanently lost.

## Ringing and colour contamination

- **JPEG ringing:** negligible. The q100, 4:4:4 encoding means no 8×8 block artefacts or chroma bleed were measurable.
- **Contamination:** all of it comes from the downscale blending sprite pixels with the green.
  - Outer edges were un-mixed (114,522 px). That assumes the sprite colour has no green excess.
  - 24,056 edge pixels that were mostly key became transparent.

## Smallest usable frames

- **Megumi** is about 23–27 × 42–43 px. At the game's ×3 integer scale he is about 129 px tall, matching the roster's ~112–134 px norm.
- **Eyes:** 1–2 px on the sheet. They stay readable as dark marks at ×3, but no iris detail exists.
- **Smallest summons:**
  - the Rabbit, 20 × 14 px
  - the Toad, 20 × 19 px
  - the Serpent's first emergence frames, 11–16 px wide

  All are readable at ×3 (60 px rabbits, 60 px toad), with outlines, eyes and tongue intact.

## Summon and effect readability at gameplay scale (×3)

| asset | result |
|---|---|
| Divine Dogs, black / white (55–62 px) | clear silhouettes, legs and tails readable |
| Nue (40–65 px + lightning) | wings, face mask and lightning all readable; the lightning stays crisp |
| Toad (lime) / winged Toad | the lime body is real art. It was **protected**: 213 pixels whose un-mix would leave the colour gamut were left untouched. The tongue arcs are intact. |
| Great Serpent (up to 174 px tall) | intact |
| Max Elephant + water (up to 283 px wide) | intact; the water stream is a separate piece inside each frame and is never cropped |
| Divine Dog: Totality (up to 120 px wide) | intact, including the cyan claw arcs |
| Mahoraga + sword sweep (up to 305 × 162 px) | intact |
| hand-sign aura (1-px blue strokes) | **residual:** the strokes were fully blended into the green by the downscale and keep a **teal cast** that cannot be recovered. Cosmetic only. |
| domain shadow spread | intact. 88 enclosed black-key holes (1–2 px gaps inside black shadow shapes, blended to (0,40–140,0)) were resolved to the outline black by a local neighbourhood rule. |

## Cleaning method

The code is in `tools/megumi/clean.py`.

1. **Background segmentation.** Background is the key-coloured region (distance < 34 from the key) **connected to the border**.
2. **Enclosed pockets.** A pocket is treated as background only when it is pure key colour. This is a local mask, not a global green threshold.
3. **Sheet annotations.** The pale grey-green box and bracket strokes (straight runs, 90,216 px) and their anti-alias were removed. Isolated bracket ticks, at most 3 × 14 px and all pale, were removed too (34 components).
4. **Edge decontamination.** Applied only within 2 px of the background:
   - the key share is s = (G − max(R,B)) / 127
   - s ≥ 0.62 → transparent
   - otherwise un-mix, but only when the result is in gamut
5. **Labels and separators.** The black label boxes, white `/` separators, captions, MISS/HIT tags, the snowflake logo and the signature mark are excluded by the explicit frame rectangles (`tools/megumi/frames.py`).

Nothing is blurred, smoothed, palette-reduced, redrawn or generated. Scaling is nearest-neighbour at integer factors only.

## Comparison

`docs/megumi/asset_comparison.png` shows six samples. For each: the original crop, the cleaned 1× crop, and the cleaned crop enlarged with nearest-neighbour (×3, or ×1 for the wide domain frame).

| sample | frame |
|---|---|
| idle | `stance0` |
| attack | `weakB7`, sword arc |
| Divine Dog | `dogWhite2` |
| Nue | `nue5`, lightning |
| large summon | `elephant7`, water |
| shadow effect | `domain6` |

These were inspected before batch processing.

## Remaining artifacts (honest list)

- Soft, slightly irregular outlines from the original downscale.
- Teal cast in the 1-px blue hand-sign aura.
- A one-pixel darker rim where outer edge pixels were un-mixed toward black.
- No missing art had to be substituted.

The sheet contains far more than the brief listed: three weapon families per direction, Totality miss/hit branches, a 31-frame Elephant with water, and Mahoraga emergence and slash. 47 of 426 cells are left unused in play: 33 Megumi cells, plus the 14-cell standalone winged-Toad strip. The reasons are in `SPRITE_MAP.md`.
