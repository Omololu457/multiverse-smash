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

## Phase 3 — The Kit ⏳ in progress
### 3a — Flight wired into the engine physics ✅ (committed)
- `physics.js`: gated branches in `moveFighter` (flight.js owns x+y while airborne → early return)
  and `applyGravity` (skip gravity while flying). Both gated on `fighter._flightCtl && isFlying` →
  strict no-op for every other fighter (incl. the separate `_flightActive` Omni-Man/Superman system).
- `flight.js`: added `flightToggleInput` (charge-edge takeoff / descend-to-land request).
- `harness/homelander_flight_engine.mjs`: drives the REAL `physics.js` with a synthetic flyer —
  **1047 passed / 0 failed** (takeoff→airborne, climb, cruise, air-dash Δx 7.78>maxH, lands feet-on-
  floor, bounds respected, and a non-flyer is provably untouched: no state leak, walks normally).
- Regression: determinism 14/0 · combo-standard 225/9 (pre-existing) · roster-integrity green · the
  standalone flight-path harness 1031/0 — all unchanged from baseline.
- NEXT (3b): game.js wiring (charge-edge toggle @10203, driver @18873, reset lists, opponentX for
  auto-face) + sprite.js flight-pose resolution + character registration (characters.js / spritesheets.js
  / skins.js + sliced frames) → then the kit + a browser render check.

### 3b — Character registration + full flight wiring + RENDER CHECK ✅ (committed)
- Sprites: 18 per-action strips sliced from the sheet (`homelander_work/slice.py`) → `homelander_*_uniform.png`
  (84×77 cells, foot-anchored, consistent scale) + `homelander_portrait.png`.
- `characters.js`: full `homelander` entry (dc universe, HP 1050, `traits.flightProfile:"homelander"`,
  basic normals + kit DATA + 23-action animationData incl. all flight poses) + collection key.
- `spritesheets.js` idle gate, `skins.js` default entry (spriteScale gate).
- `sprite.js`: gated flight-pose branch maps `_flightCtl.poseKey` → fly animation (hover/cruise/rise/
  dive/turn/dash/takeoff/land). `game.js`: flight.js import; charge-tap takeoff (@10203); per-frame
  `tickFlightDriver` + opponentX auto-face (@18877); `resetFlight` in all 4 round-reset lists; read-only
  `flightProbe` harness hook. `flight.js`: `resetFlight` only touches real flyers.
- **RENDER CHECK (Playwright, real game boot) — `harness/homelander_render_check.mjs`: 16/0.** Picks
  Homelander vs Batman, starts the match, takes off (→flying), climbs (y 378→113), cruises (rendering
  `homelander_flyCruise_uniform.png`), lands (→grounded). Both fighters + HUD render; **0 JS exceptions,
  0 homelander-asset 404s** (pre-existing batman/etc. 404s ignored). Screenshots in `homelander_work/`.
- Regression unchanged: determinism 14/0 · combo-standard 225/9 · roster-integrity green · flight-path
  1031/0 · flight-engine 1047/0.
### 3c-1 — HEAT VISION (signature laser) ✅ (committed)
- `abilities.js`: `executeHomelanderSpecial` (dispatch case added to `triggerSpecial`) → Heat Vision on
  neutral / Up (anti-air) / AIR (down-strafe). `applyHomelanderHeatVision` per-frame driver — code-drawn
  hitscan beam from an eye-anchored origin, tap=burst / hold=sustained, up/down **sweep** at a capped
  1.5°/frame, **LASER-HEAT gauge** (`_laserHeat`, sim state, 72f≈1.2s) → **overheat lockout** (dim eyes)
  when empty, idle refill. Damage via `applyScaledDamage` on tick frames; block chips. `resetHomelanderKit`
  clears it each round. All deterministic (no Math.random).
- `game.js`: import + per-frame driver call (reads `readRawControls` held state) + `drawHomelanderHeatVision`
  (white core + red glow + impact burst, world-space, render-only) in the FX pass + reset lists + laser
  fields added to the `flightProbe` harness hook.
- **Render check extended — `harness/homelander_render_check.mjs`: 20/0.** Fires Heat Vision: heat drains
  72→52, **hits the opponent**, beam renders (screenshot `_render_5_heat_vision.png`), stops cleanly on
  release, heat recovers 52→67. Regression unchanged (det 14/0 · combo 225/9 · roster green · flight
  harnesses 1031/0 & 1047/0).
### 3c-2 — Directional specials (Supersonic · Sonic Clap · Super-Speed Barrage) ✅ (committed)
- `abilities.js` `executeHomelanderSpecial` dispatch: **F** = Supersonic (sonic-boom dash, 22px burst +
  Mach-Ram dive in flight, 8f i-frames = passes through projectiles at the boom, unsafe on block), **D** =
  Sonic Clap (instant get-off-me: shove + 40 dmg in range + destroys weak opponent projectiles via
  `activeProjectiles`), **B** = Super-Speed Barrage (advancing flurry → launcher). All `spendEnergy` +
  `createAttackFromMove`/`setAttackState`; FX timers (`_hlBoomFx/_hlClapFx/_hlBarrageFx`) tick in the
  driver + clear in `resetHomelanderKit`.
- `sprite.js` `MOVE_TO_ACTION`: `hlSupersonic→flyDash`, `hlBarrage→light`, `hlClap→heavy`.
- `game.js` `drawHomelanderHeatVision` extended with code-drawn shockwave rings (clap), boom cracks
  (supersonic), fist streaks (barrage).
- **Render check 23/0**: fires all three (`hlSupersonic` / `hlClap` cast / `hlBarrage`) via real keyboard
  dir+special; clap shockwave ring renders (screenshot). det 14/0 · combo 225/9 · roster green · flight 1047/0.
- NEXT (3c-3…): Take A Ride (command grab), X-Ray (mark), Super Hearing (passive), Supe Durability
  (−40% chip), Flex (parry), Ultimate FLIGHT 37, brutalities, intro/win/lose, voice, sound, air normals.
  Then Phase 4 (HUD bars + AI + SUPERMAN_NOTES + REPORT).

## Phase 4 — HUD, AI, Superman readiness ⏳ pending
