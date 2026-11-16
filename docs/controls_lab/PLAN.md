# Controls Lab — Phase 0 study + architecture

Start commit: see `START_COMMIT.txt` (5ea335dc8e78e4f6ec79f055f212e946fad8c0ea).
Built around another session's uncommitted work (79 tracked files incl. `game.js` lines 14 and ~20641):
every commit goes through a private index with explicit paths, and every test runs against a clean
`git archive HEAD` copy plus only Lab changes.

## 1. Where is the control mapping defined?
* **Pad:** `padLayout.js` — `PAD_LAYOUT` (action → standard-gamepad button index → glyph position), `PAD_BUTTON`,
  `PAD_DPAD`, `PAD_AXES`, `PAD_GLYPHS` (PlayStation / Xbox / Switch / generic), `padGlyphFor(action, glyphs)`.
  Added by the input quick-wins (commit 427e90a9f) and the only source the in-game help is generated from.
  Truth: Square=Light, Triangle=Heavy, Cross=Jump, Circle=Block, R1=Special, R2=Ultimate, L1=Grab, L2=Charge.
  `input.js` re-exports it and adds `padGlyphs(getPadType())` (glyph family of the connected pad) and
  `jumpOnUp(pn)` (per-player "Up also jumps" setting).
* **Keyboard:** `game.js` `P1_CONTROLS` / `P2_CONTROLS` (the binds handed to `createFighter`). Rebinds are
  in-memory only (`game.js` KEYBIND UI: "sandbox blocks storage"), so nothing is saved across pages.
  These objects are NOT exported and not reachable from outside `game.js` — see "Game code changes" below.
* NOT used: `kits.js CONTROL_REFERENCE` keyboard rows and `academy.js KB` (hand-written copies).

## 2. Where does each character's move list live?
* `characters.js` — roster (`rosterKey, name, universe, portrait, stats, basic_attacks{light,heavy,…}` with
  `damage/startup/active/recovery/hitstun`, `specials[]`, `ultimate`, `transformations`, `animationData`).
* `kits.js getKit(rosterKey, character)` — the player-facing kit: `basics[] / specials[] / mobility / ultimate /
  passive` with `name, input (notation text), desc, cost`. Hand-authored for many fighters, synthesized for the rest.
* Per-character command layers (`sanjiData.js`, `zoroData.js`, `rangers.js`, …) own their own command tables.
* There is **no shared structured command descriptor**. The closest is `academy.js`: `buildCharacterLessons`
  (kit → lessons with a `cat`), `scriptForInput(input, cat)` (notation → per-frame raw-input script) and
  `detectLesson` (read-only "did the move fire" detector). The Lab reuses these, it does not fork them.

## 3. Can the engine run inside a second page?
Not as a library: `game.js` (30k lines) owns one canvas, module-level fighters, menus and the loop; it cannot
be instantiated twice in one realm. But it already has a menu-less entry: **`index.html?harness=1&p1=X&p2=Y`**
(`setupTestHarness` → `startHarnessMatch()` = `matchConfig.mode = "training"`, `aiDifficulty = "dummy"`,
then `skipToBattle()`). The only behaviour differences under `?harness` are: no session logging, no
first-run tutorial, no default account. Gameplay, frame data, physics and rendering are the real ones.
`window.__harness` exposes fighter snapshots (`p1()/p2()`: health, currentMove, attacking, hitstun,
spriteFrameIndex, …), `setHitstun`, `setInputType`, `hurtbox`, `academy.*`, etc.
Training dummy behaviours: `trainingState.dummyBehavior` = stand / block / jump / combo.

**Decision:** the Lab embeds the REAL game in a same-origin `<iframe src="index.html?harness=1&p1=…&p2=…">`.
No engine refactor, no second copy of anything. Changing fighter = reloading the iframe with a new `p1`.

## 4. Deterministic scripted input
Proven in a prototype: inside the iframe realm, `import('./input.js')` resolves through the page's import map
to the **same module instance** the game uses, so the Lab holds the live `keys` map. The game loop runs at
most one 60 Hz logic tick per `requestAnimationFrame` callback, so the Lab wraps the iframe's rAF, watches
`__harness.state().frame` (globalFrameCount), and writes exactly one raw-input frame into `keys` per logic
tick — the same map `writeRawControls` (replay / LAN / Academy Show-Me) writes. A scripted Light pressed at
frame N started the attack at N+1. Scripts are plain arrays of `REPLAY_INPUT_FIELDS` booleans, so a demo, a
combo verification and a trial check all run through the identical input pipeline. No Math.random anywhere.
Tests use a stubbed `navigator.getGamepads()` for pad input.

## 5. Characters with docs/<char>/COMBOS.md
arlong, buggy, dash, greenarrow, sanji, spd_red, zoro (7).

## Architecture
```
controls.html                 page shell (no build step; ES modules)
controls_lab/lab.js           app: picker, modes, navigation (mouse / keyboard / pad), persistence
controls_lab/engine.js        iframe bridge: load fighter, live state, frame-exact input injection, dummy
controls_lab/controller.js    SVG DualSense / Xbox / Switch + keyboard views, live + GUIDE overlays
controls_lab/moves.js         move list generated from kits.js + characters.js (+ academy.js scripts)
controls_lab/combos.js        combo library: load combos.json, verify in the engine, trial step logic
controls_lab/combos.json      verified combos (date-stamped), user-extendable
controls_lab/lab.css          look & feel
harness/controls_lab*.test.mjs  Phase 5 evidence
```
Data flow: everything shown (roster, portraits, moves, frame data, glyphs) is read at runtime from the game's
own module instances inside the iframe (`characters.js`, `kits.js`, `academy.js`, `padLayout.js`, `input.js`),
so it can never drift. A new character appears automatically once it is in `characters.js` / `kits.js`.

## Game code changes needed (minimal, additive)
1. `game.js` — a read-only harness accessor for the live keyboard binds (`P1_CONTROLS` / `P2_CONTROLS`), needed
   for keyboard labels, the keyboard view and the dummy crouch. Inside `setupTestHarness` only.
2. `ui.js` + `game.js` — a "CONTROLS LAB" main-menu item and an Academy link (navigate to `controls.html`).
These are the only engine-side edits; none touch combat, frame data or input processing.
