# IRON MAN 2 — Stage 0 PRELIMINARY (structural only — NOT the pixel audit)

> ⚠️ **THIS IS NOT A COMPLETED STAGE 0.** It is programmatic groundwork gathered by shell
> tools (cv2 connected-components + bg-key) because image-viewing AND OCR were BOTH non-functional
> in the session this was written (cumulative image-API cap blocked all vision; tesseract 5.5.3
> installed but extracted ZERO text from the stylized pixel-art annotations). Every **semantic**
> Stage-0 question below is UNRESOLVED and needs a genuine first-hand VISUAL pass in a fresh session.
> Do not build gameplay from this file. It exists so the visual pass starts with the layout mapped.

## ⚠️ CORRECTION LOG — a wrong guess was made and later caught (recorded on purpose)
**Do not delete this. The trail matters.**
- **WRONG GUESS (made first):** the row at **y~776 / x1313–1593** was initially claimed to be the
  **S/1/2/3/4\*/E\* text CHARGE METER** — a "clean 6-column match." This was **pure geometric inference**
  (6 evenly-spaced small cells → "must be a 6-label meter"), made **without looking at the cell content**.
- **HOW IT WAS CAUGHT:** an **ASCII render-and-look** of those cells (fg pixels → `#`/space in the terminal,
  the only way to "see" with image-viewing blocked) showed a **humanoid figure**, and a pairwise pixel-diff
  showed **cells 0–2 are ~0.9+ identical**. So they are **small CHARACTER SPRITES (three near-identical),
  NOT meter columns.**
- **CURRENT STATUS:** the y776 row = character sprites. **The real charge meter's LOCATION is STILL
  UNRESOLVED** (not found programmatically; it's small UI text → needs the visual pass). Item 5 stays open.
- **LESSON for the next session:** geometric "this-looks-like-X" guesses about UI/text on this sheet are
  unreliable — confirm by looking (render-and-look or real vision) before recording any identity.

## Source (confirmed by shell)
- File: `Iron Man.png` — **1696 × 1249**, RGB, **no alpha** (100% opaque). The prompt's `1787437771880_Iron_Man.png` is the same asset (download name).
- Background: solid khaki **`[169,173,153]`** (89.5% of pixels) → the reslicer will color-key this (same approach as Iron Man 1's lavender bg; use a tolerance band, it's a clean flat fill).
- Data East "Captain America and the Avengers" (1991) arcade rip; ripper/editor Flávio Arruda (per prompt — **credit text NOT yet verified on-sheet**, OCR failed; confirm visually → `credits.js` SOURCED_ART, MANDATORY before ship).

## Programmatic layout — cv2 connected-components (bg-keyed, area>120px)
224 blobs across ~18 rough y-rows. Blobs conflate sprites + text + arrows, so these are LOCATIONS to
inspect, NOT confirmed frame counts. Approx rows (y-range : blob-count : notes):
- y12–94   : ~35 small blobs — likely HEADER/title + labels (textual; wide blob w≈240 = title text?).
- y136–341 : ~16 tall blobs (h up to 176) — large character poses / a big render.
- y268–369 : ~18 blobs (one w≈561 = a long text/bracket line?).
- y377–451 : ~16 blobs (h32–70) — a frame row (walk/run/combo candidate).
- y510–893 : tall mixed block (h up to 353) — big sprites + effect columns.
- y599–681 : ~18 blobs (h33–64) — frame row.
- y712–794 : ~13 blobs — frame row.
- **y776–840 : 6-7 small cells @ x≈1313..1593** — ★CORRECTED (was mis-guessed as the meter): ASCII-render
  shows these are small CHARACTER SPRITES (cells 0-2 ~0.9 identical). NOT the S/1/2/3/4\*/E\* meter. The real
  text meter was NOT located programmatically — needs the visual pass.
- y830–909 : ~18 blobs — frame row.
- y943–1037: ~15 blobs — bottom block (portraits/labels).
- y928–1249: includes a **w≈1696 full-width band** + an **h≈321 tall blob** (= the full-body SELECT-SCREEN
  render) + face-icon-sized blobs — the portrait/select region (Stage-0 item 6: exclude from anim set).

## REFINED objective frame geometry (cv2, character-sized components h28-95, bg-keyed + h-close)
Measured per-row frame boxes (x-lefts). These are OBJECTIVE counts/positions (upgrades item-4 "approx"),
but MOVE IDENTITY per row is NOT determinable without vision (poses unread) — do NOT assume the mapping.
- y~31 : 22 frames (top strip; header-adjacent — mix of poses + possibly icons) xs 26,59,140,182,228,266,308,363,409,450,554,659,709,759,809,859,909,959,1009,1153,1196,1243
- y~136: 12 frames (h up to 71 — larger poses) 179,216,261,311 | 467,554,597,653 | 798,862,932,995
- y~268: 17 frames (small h39-58 — a long cycle? walk candidate) 52,97,151,197,260,303 | 423,470,529,579,625,691 | 1151,1206,1246,1298,1348
- y~377: 5 + 10 frames — LEFT group 45,86,152,207,281 | RIGHT group 833..1341 (10)
- y~510: 8 + 4 frames — 34,94,137,255,326,395,454,555 | 1135,1187,1248,1294
- y~599: 4+4+4+5 groups — 243,303,369,448 | 702,752,803,857 | 981,1087,1140,1205 | 1385,1455,1495,1573,1630
- y~712: 3 + **6** + 2 — 242,286,343 | **701,740,787,842,900,972** | 1165,1211  (★the 6-group is a combo candidate)
- **y~776: 6-7 small cells x1313..1593** — ★CORRECTED: NOT the charge meter. ASCII-render shows these are
  small CHARACTER SPRITES (humanoid figures); cells 0-2 are ~0.9+ pixel-identical (repeated). The actual
  S/1/2/3/4\*/E\* text meter was NOT reliably located programmatically (it's small UI TEXT — needs the visual
  pass / a working OCR). Do NOT treat y776 as the meter.
- y~830: 7 + 3 + 2 — 246,286,345,395,448,492,546 | 713,780,863 | 1382,1438
- y~952..1192: bottom block — scattered larger blobs = portraits/face-icons + the full-body select render
  (h up to 321 in the raw pass) + credit text. EXCLUDE from runtime atlas (item 6).
> ★NOTE: an ASCII-render of the y772-842 / x1300-1640 area showed 3 REPEATED identical glyphs on its left
> third — which turned out to be small CHARACTER SPRITES (3 near-identical), NOT meter columns. Lesson: the
> y776 row is sprites; the real charge meter was not programmatically locatable (needs the visual pass).

## ★ITEM 1 (edited-vs-original) — PARTLY resolved. READ THE METHOD NOTE: two different confidence levels here.

### HOW this was determined vs how the meter guess was determined (stated plainly, per the handoff ask)
- **This was NOT a render-and-look pass.** I never rendered the combo frames and looked at what they DEPICT.
- **It was PIXEL-COMPARISON MATH:** for every detected frame box I computed silhouette IoU + grayscale NCC
  against other frame boxes (`cv2` components → 44×56 fg-silhouette IoU + gray NCC). Numbers, not eyes.
- **Contrast with the meter guess:** the meter guess was *geometric* inference ("6 cells → a meter") that I
  later caught by ASCII render-and-look. Item 1 uses a *different* kind of reasoning — but note carefully:

### SOLID (objective pixel math — does NOT depend on looking at content):
- Three of the four "edited" frames are **PIXEL-IDENTICAL** to three "original" frames — IoU **1.00** AND
  grayscale-NCC **1.00**: edited@1135 ≡ orig@255, edited@1187 ≡ orig@326, edited@1248 ≡ orig@555. A 1.00/1.00
  match means the same pixels, whatever they depict. edited@1294 = NO exact original (best 0.54). Two original
  frames (@395,@454) are unused by the edited version.
- **Content conclusion (safe):** the edited version REUSES the same art (3/4 frames are exact copies) + has
  FEWER frames — so "edited" is NOT a pose redraw. It's a frame-reduced re-selection of identical frames,
  plus one frame (@1294) that has no exact original (a tweak, or a frame my box-splitter didn't pair).

### NOT VERIFIED (same category of un-looked-at inference that the meter guess used — treat with equal caution):
- **That this row IS the "walking-punch combo" at all.** That identity rests on: strongest cross-group match
  on the sheet (0.88 vs 0.75 next) + side-by-side placement matching the prompt's "6f original / 4f edited"
  wording + character-punch frame sizes. **That is geometry + prompt-matching, NOT a render-and-look** — i.e.
  the SAME flavor of reasoning that produced the WRONG meter guess above. It could be a different move.
- Frame boxes: LEFT original run x255,326,395,454,555 (leading x34,94,137 read as a SEPARATE small move);
  RIGHT edited x1135,1187,1248,1294; all on row y~510–521.

### Bottom line for Stage 2
The "edited = reuses the same art, shorter" finding is trustworthy (pixel-identity). But **which move this is
must be confirmed by real eyes** (it is a move-identity-per-row item — see TODO). Don't wire Stage 2 off this
row's identity until the visual pass confirms it's the walking-punch combo and looks at frame @1294.

## ✅ FRESH-SESSION TODO — these ALL need REAL EYES on the actual sprite content
**Directive: do NOT make further pixel-inference / geometric guesses about the items below in the meantime.**
The meter guess above shows why: geometric inference about identity/semantics on this sheet is unreliable and
already produced one wrong record. Wait for real vision (fresh session → image cap resets) or working OCR.

- **[VISION] Move-identity-per-row mapping** — which detected frame-row is walk / run / run-to-crouch / the
  walking-punch combo / each special / each effect. The geometry (boxes, counts) is measured above, but NONE
  of the row→move labels are confirmed. **This includes confirming that the y~510 row is actually the
  walking-punch combo** (item 1's un-verified half).
- **[VISION] Item 2 — combo arrow/bracket notation.** Visual-spatial; OCR can't read arrows. Follow the
  sheet's own documented links; do not re-derive or guess.
- **[VISION] Item 3 — Run vs Run-to-Crouch.** Keep as separate bracketed groups (per prompt); which rows are
  which is UNCONFIRMED.
- **[VISION] Item 4 — effect-row frame counts** (repulsor beam / icon FX / explosion-knockdown / star-burst
  target-lock). Candidate locations mapped; exact counts + identity need eyes.
- **[VISION] Item 5 — charge meter S/1/2/3/4\*/E\*.** LOCATION unresolved (y776 was NOT it — see Correction
  Log). Find the real meter, read the tier labels, and confirm per-tier BEHAVIOR before any Stage-5 design.
- **[VISION] Item 6 — portraits / select render.** In the y928–1249 bottom block; confirm which are face
  icons vs the full-body select render; exclude all from the runtime animation atlas (HUD/select only).
- **[VISION] Item 1 leftover** — look at edited frame @1294 (the one non-matching edited frame) to see if it
  is a real tweak or an unpaired original. (The "edited = same art, shorter" pixel finding itself is solid.)
- **[shell, allowed] Credit text** — "Flávio Arruda" not yet verified on-sheet (OCR failed). Confirm visually
  → `credits.js` SOURCED_ART (MANDATORY before ship).

## Recommendation
Resume in a FRESH session (image cap resets) → do the real visual audit per the TODO, THEN write the true
`IRON_MAN_2_ASSET_MAP.md` and STOP for owner sign-off. No gameplay code until then.
