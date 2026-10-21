# Homelander Build — Progress

Branch: `feat/homelander-flight` (off `main`). One commit per phase, push the branch after
each phase. Never merge/push to `main`. Universe: **`dc`** (existing key; no new universe).

## Polish — flight stuck-fix + faster speed ✅ (committed)
- **STUCK FIX**: `wantDescend` (set by a charge-tap descend request) was never cleared on takeoff/landing,
  so after toggling down to land the NEXT takeoff immediately re-descended → "flying got stuck". Now cleared
  in `flightTakeoff` and `beginLanding`. New regression test in `homelander_flight_path.mjs` (toggle-land →
  re-takeoff must climb). 1069/0.
- **FASTER FLIGHT** (user request): profile maxH 6.5→9.5, maxV 5.5→8.0, accel 0.55→0.85, dashSpeed 11→16,
  liftoff −4→−5, reverseBrake 0.72→0.70, ceilEaseZone 48→56. Render check: climb now y 373→−14 (vs ~260px).

## Polish — air-dash fix + Ben 10 skin + proper Alien X ✅ (committed)
- **AIR-DASH FIX**: his new speed-tier status made a double-tap-toward trigger the ground dash-TELEPORT
  instead of the flight air-dash ("stuck after dashing"). Gated in `detectDoubleTapDashTeleport`: while the
  flight module is active, a double-tap always routes to the flight air-dash (`_dashTap`).
- **Ben 10 skin**: Omnitrix-green suit / black accents / brown hair (`gen_skins.py` ben10 LUT).
- **Alien X fixed to match the roster convention**: skin id renamed `homelander_alienx` → **`homelanderAlienX`**
  (ends "AlienX") so the engine's `drawAlienXStarfield` auto-overlays the colourful Celestialsapien starfield
  on the matte-black sheets (verified: isAlienX=true, 30 stars / 3 nebulae). alienx recolor regenerated to
  true matte-black. 4 skins now (Rose/Albedo/Ben 10/Alien X). 0 recolor-404s, render 26/0, det 14/0 · combo 225/9.

## Polish — GODSPEED tuning (faster still) ✅ (committed)
- Flight cranked past Flash: maxH 15→**22**, maxV 12→**18**, accel 1.4→**2.2**, dashSpeed 24→**34**, liftoff
  −7→−9, drag 0.86→0.84, reverseBrake 0.68→0.64, ceilEaseZone 64→72. Render climb y 357→−344 (pins near
  the −360 ceiling — screen-crossing fast). Ground dash maxed: `dashSpeed` 26→**30** (hits the 16 cap),
  jumpPower 30→32, dashCooldownMax 24→20 (walk still caps at 9.5 — engine clamp).
- Render-check specials made facing-relative (the fast movement flips facing → Fwd/Back read live) + ult
  walks toward whichever side the foe is on. Flight-path 1021/0, flight-engine 839/0, render 26/0, det
  14/0 · combo 225/9 · roster green.

## Polish — SPEEDSTER tuning ("as fast as the Flash") ✅ (committed)
- **Flight** pushed to Flash tier: maxH 9.5→**15**, maxV 8→**12**, accel 0.85→**1.4**, dashSpeed 16→**24**,
  liftoff −5→−7, ceilEaseZone 56→64, reverseBrake 0.70→0.68. Render check climb now y 362→−235 (~597px).
- **Ground stats** matched to Flash: `speed` 80→**99** (walk caps at the 9.5 top tier), `dashSpeed` 14→**26**
  (dash ≈14, = Flash), `jumpPower` 24→30, `dashDuration` 10→12, `dashCooldownMax` 32→24.
- Flight-path 1066/0 (stuck-regression test updated to simulate engine grounding + energy refill), flight-
  engine 919/0, render 26/0, det 14/0 · combo 225/9 · roster green.

## Polish — sizing fix + 3 skins ✅ (committed)
- **Sizing**: `spriteScale` 1.2 → **1.6**. Measured body (measureSprite contentH) was ~89px at 1.2 (too
  short); now ~115px — above roster median (~108), under tall outliers (Gojo 132). Verified in-game vs Gojo.
- **Skins** (baked HSV region-recolor, `homelander_work/gen_skins.py` → 57 `*__<tag>.png` files, shading
  preserved): **Rose** (darker-pink suit / lighter-pink hair / deep-rose cape), **Albedo** (Ben 10 villain:
  blue suit→red + blonde hair→white), **Alien X** (near-black cosmic body). Registered in `skins.js` via
  `recolorSkinAnim`/`recolorPortrait`. All applied in-game (bootSkin), **0 recolor-sheet 404s**, render
  check 26/0, det 14/0 · combo 225/9 · roster green.

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
### 3c-3 — Supe Durability (passive) + voice lines ✅ (committed)
- `combat.js` `applyScaledDamage`: **Supe Durability** — chip damage (damage while blocking) reduced 40%,
  gated on `rosterKey === "homelander"` (strict no-op for everyone else). Unit check: Homelander chip 36
  vs others 60 (0.60×), non-blocking full 60; determinism 14/0, combo 225/9, roster green.
- `characters.js`: original **voice lines** (text, for later VO) — intro "Smile for the cameras." / win
  "I can do whatever I want." / lose "This isn't... how this goes." / super "You're gonna love this." +
  `passiveTraits` data (supeDurability chipReduction 0.4; superHearing leadFrames 10, wiring later).
- Render check 23/0 (Playwright harness is timing-sensitive — occasional flaky miss, re-run is clean).
- NEXT (3c-4…): Take A Ride (command grab), X-Ray (mark), Super Hearing (passive wiring), Flex (parry),
  Ultimate FLIGHT 37 (cinematic), brutalities, intro/win/lose choreography, sound mapping, air normals.
  Then Phase 4 (HUD bars + AI + SUPERMAN_NOTES + REPORT).

## Phase 4 — HUD, AI, Superman readiness ⏳ in progress
### 4a — HUD gauges ✅ (committed)
- `game.js` `drawHomelanderGauges` (called from `drawBattleHud`, gated on rosterKey): two thin bars under
  his health — **FLIGHT ENERGY** (cyan, `_flightCtl.energy`/profile max) and **LASER HEAT** (amber→red,
  `_laserHeat`/`HV_HEAT_MAX`, dim-red "OVERHEAT" label while locked out). Styled like the HUD theme;
  reads sim state only. Render check 23/0 — gauges visible in `_render_5_heat_vision.png` (cyan full,
  amber draining while firing). det 14/0 · combo 225/9 · roster green.
## Phase 3c-4 — ULTIMATE "FLIGHT 37" ✅ (committed)
- `abilities.js` `executeHomelanderUltimate` (dispatch case in `triggerUltimate`) + `applyHomelanderFlight37`
  per-frame state machine: dark **SILHOUETTE** startup (INVULN, `ultSilhouette` sprite, screen wash) →
  **SUPERSONIC GRAB** lunge → on connect LAUNCH victim up + full **HEAT VISION** beam SLAMS them down →
  impact ring + dust + camera shake + knockdown (320 raw). Whiff → overshoot + long recovery. Invuln only
  during startup; victim arc uses normal physics (no two-actor gating). Cleared in `resetHomelanderKit`.
- `game.js`: import + driver call; `drawHomelanderUltOverlay` screen-space dark wash during startup (behind
  HUD); FLIGHT-37 impact ring in `drawHomelanderHeatVision`.
- **Render check 25/0**: casts, grab connects, slam deals **192** (320×scale) to p2; dark-startup silhouette
  renders (`_render_9_ult_startup.png`). det 14/0 · combo 225/9 · roster green.

## Phase 4b — Training-mode toggles ✅ (committed)
- `game.js` infinite-resources block: when F3 infinite is on, Homelander's flight energy + laser heat are
  pinned to full and overheat cleared (gated on rosterKey) so flight + Heat Vision can be practiced freely.
- Render check 26/0 (fire a sustained beam with infinite on → heat stays pinned ≥70). det 14/0 · combo 225/9.

## Phase 4c — CPU AI (signature zoning layer) ✅ (committed)
- `ai.js`: `SIGNATURE_MOTIONS` gains homelander specials (heatVision [] / supersonic F / sonicClap D /
  barrage B); new `decideHomelanderSignatureMove` (same shape as Gojo/Sukuna, called ONLY for homelander
  in `choosePlan`) — an aerial zoner: **Heat Vision at range** (iq×0.6), **FLIGHT 37 at full meter**
  (iq×0.3, mid-range so the grab connects), **Sonic Clap point-blank** (iq×0.5). Gated on rosterKey → no
  other character affected.
- Verified with a new deterministic AI harness `harness/homelander_ai.mjs` (aiVsAi.step clock): CPU-
  Homelander vs Batman — **4/0**, the CPU fires Heat Vision + casts hlSupersonic, 0 JS exceptions.
- Regression: det 14/0 · combo 225/9 · roster green · flight-engine 1047/0 · render check 26/0.
- NOTE: this is ground-laser zoning + his specials + ult. Active FLIGHT takeoff/land AI (press the charge
  edge, land on low flight-energy, dodge anti-airs) needs charge-input synthesis in the AI controller —
  a refinement, documented. (Remaining kit: Take A Ride, X-Ray, Super Hearing, Flex, brutalities,
  intro/win/lose, sound, dedicated air normals.)
