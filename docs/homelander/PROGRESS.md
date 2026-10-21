# Homelander Build — Progress

Branch: `feat/homelander-flight` (off `main`). One commit per phase, push the branch after
each phase. Never merge/push to `main`. Universe: **`dc`** (existing key; no new universe).

## Decisions / conservative calls (logged)
- **Universe = `dc`** — found in `characters.js` (Flash, Batman, Superman×5, Green Lantern
  all use `universe:"dc"`). Homelander joins it. No new universe created.
- **Existing Supermen already in roster** (`superman`, `superman_dcuc`, `superman_new52`,
  `superman_classic`, `superman_fighter`). The brief calls Homelander the *prototype for a
  future Superman*. Conservative call: build `flight.js` as a generic, data-driven module
  and do **not** touch any existing Superman. `SUPERMAN_NOTES.md` (Phase 4) documents how a
  future Superman plugs in.
- **Attached sheet** = `homelander_sprites_by_xxultra2006xx_dfad92z.png` (the untracked PNG
  in the repo root). Copied untouched to `assets/source/homelander_original.png`.
- **rosterKey** will be `homelander` (no clash found).

## Phase 1 — Inventory & Ledger ✅ (committed)
- `assets/source/homelander_original.png` (byte-identical copy of the attached sheet).
- `assets/source/homelander_inventory.json` — 79 frames, 11 rows, per-frame bbox + eye anchor.
- `assets/source/homelander_contact_sheet.png` + `homelander_eye_anchors.png` — 3× labelled.
- `docs/homelander/LEDGER.md` — full frame→role map, extraction method, unused-frame audit.
- Pipeline scripts in `homelander_work/` (inventory.py, eye_anchors.py).
- Row map verified against the sheet: 7/7/8/8/9/9/8/6/8/5/4. Silhouette at 3.5, barrage row 6,
  cruise+hover row 10, hurt/fall/knockdown row 11.

## Phase 2 — Flight module (flight.js) ⏳ pending
## Phase 3 — The Kit ⏳ pending
## Phase 4 — HUD, AI, Superman readiness ⏳ pending
