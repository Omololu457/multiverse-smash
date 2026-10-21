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

## Phase 2 — Flight module (flight.js) ✅ (committed)
- `docs/homelander/FLIGHT_DESIGN.md` — research (MK/Injustice/MvC/DBFZ + the engine's existing
  Omni-Man/Superman flight), full design, SIM-vs-render split, integration plan, and the
  **takeoff-input collision report** (chosen: **charge / L2 edge**, toggle; mid-jump allowed).
- `flight.js` — reusable, data-driven module. `FLIGHT_PROFILES` (homelander + commented
  superman stub); velocity model (accel 0.55 / drag 0.86 / reverse-brake / overspeed-carry /
  diagonal-ellipse-normalize / ceiling-ease); air dash (2× / 14f / 8-way / momentum carry);
  energy (240f ≈ 4s drain 1/f, ground refill 2/f, dash 30); takeoff/landing/grounded-lock;
  pose selection from velocity with 4-frame min hold; render-only polish (bob/tilt/speed-lines/
  cape-wind) strictly separated from sim; `hashRandom(seed,frame,idx)` — no Math.random.
- `harness/homelander_flight_path.mjs` — flies takeoff→8-dir→2 dashes→brake→land.
  **Result: 1031 passed / 0 failed.** maxΔx 7.78 (cap 17.5) / maxΔy 7.78 (cap 16.5), 10 poses,
  air-dash observed, energy monotonic, determinism (same seed → identical trace) holds.
- **Zero engine files touched** → every other character byte-identical; determinism/combo/
  roster suites unchanged from the Phase-1 baseline (14/0 · 225/9 · pass). The in-engine wiring
  (physics/combat/game gated hooks per §7) + render check land in Phase 3, when the character
  exists to pick, fly, and render.

### Decision (logged): why wiring is deferred to Phase 3
A render check ("pick Homelander, take off, fly, land") requires a registered, pickable,
rendered character. Registration (characters.js + sprite manifest + sliced frames + animation
data) is Phase-3 work and the natural place to wire the proven module in. Phase 2 ships the
**verified reusable module** with its own headless proof, keeping the branch clean and every
other character provably untouched.

## Phase 3 — The Kit ⏳ pending (includes the flight in-engine wiring + render check)
## Phase 4 — HUD, AI, Superman readiness ⏳ pending
