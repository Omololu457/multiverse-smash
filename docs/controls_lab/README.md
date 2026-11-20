# Controls Lab

`controls.html` is a standalone page for learning the controls. It runs the **real game** with real sprites,
frame data and input pipeline inside a same-origin iframe (`index.html?harness=1&p1=KEY&p2=KEY`, the training
match with a dummy). Everything it shows is read at runtime from the game's own module instances, so it cannot
drift from the game.

Open it from the main menu (**CONTROLS LAB**), from the Academy grid (**CONTROLS LAB ▸**, bottom right), or
directly at `/controls.html` (`?char=KEY` opens a fighter).

## How it is built
| file | job |
|---|---|
| `controls.html`, `controls_lab/lab.css` | page shell and look (accent colour comes from the fighter) |
| `controls_lab/engine.js` | iframe bridge. Loads a fighter, injects one inline module into the game page so the Lab holds the **same** `input / kits / characters / academy / padLayout / theme / sound / padStick` instances. Wraps the iframe's `requestAnimationFrame` so every 60 Hz logic tick is observed (`__harness.state().frame`), and feeds scripted input as real `KeyboardEvent`s between ticks (the path touch controls use), so it is frame-exact. Also handles the dummy (stand / crouch / jump / block), the F2 training reset, 0.5× slow-mo (skips every other rAF) and turbo (combo discovery only). |
| `controls_lab/notation.js` | the kits' free-text notation (`↓↘→ + Special`, `Hold Charge (≥ 18 f)`, `Double-tap toward`…) turned into steps and a per-frame raw-input script. Pure, no randomness. |
| `controls_lab/moves.js` | the Move List: `academy.buildCharacterLessons` (from `kits.getKit`) plus frame data from `characters.js` (`basic_attacks`, `specials`, `ultimate`) and costs from the kit. |
| `controls_lab/controller.js` | SVG DualSense (glyphs switch to Xbox or Switch from `input.padGlyphs`) and a keyboard view built from the live binds. Has LIVE (pressed, stick position, analog trigger depth) and GUIDE (pulse, arrows, quarter-circle arcs, double-tap double pulse, hold ring, "let go") layers. Labels come from `padLayout.PAD_LAYOUT` and the live keyboard binds. |
| `controls_lab/combos.js` | combo script builder and **verifier**: from a reset, run the scripted inputs; every step must land its own hit, the dummy must never get a free frame between hits (hitstun / stun / knockdown / launched / hit-stop / airborne), and the game's combo counter must equal `hits`. |
| `controls_lab/combos.json` | the Combo Library. **Verified entries only**, each date-stamped. |
| `controls_lab/lab.js` | the app: picker, the four modes, the trial judge, history strip, pad / keyboard / mouse navigation, localStorage (`ms_controls_lab`, `ms_controls_lab_mastered`, wrapped in try/catch). |
| `tools/controls_lab/build_combos.mjs` | discovers and verifies combos for the whole roster (`npm run build:controls-lab-combos`). |
| `tools/controls_lab/combo_candidates.json` | routes taken from `docs/<char>/COMBOS.md`. |
| `tools/controls_lab/apply_game_links.py` | the only game-code edits (see below), anchor-based and idempotent. |

### Game-code changes (all additive, nothing in combat, frame data or input processing)
* `game.js`: `getAcademyLabButton` import; the main-menu `controlsLab` item navigates to `controls.html`; the Academy grid button (click and pad-nav rect); a read-only `__harness.controls()` that returns a copy of `P1_CONTROLS` / `P2_CONTROLS`.
* `ui.js`: the main-menu item, `getAcademyLabButton()` and its draw call on the Academy grid.

## Adding a new character
Nothing to do in the Lab. When a fighter exists in `characters.js` (playable, not wiped) and has a kit in
`kits.js` (hand-written or synthesised), it shows up in the picker under its universe, with its move list,
frame data, costs and demos. To give it combos:
1. Optional: add its documented routes to `tools/controls_lab/combo_candidates.json` (same notation as `kits.js`; `"Jump"` is a jump).
2. `node tools/controls_lab/build_combos.mjs . --only <key>` searches the timing, verifies every candidate twice at real speed, and **merges** the survivors into `controls_lab/combos.json`. Rejections and their reasons go to `docs/controls_lab/combo_build_report.json`.
3. `node harness/controls_lab_combos.test.mjs --only <key>` re-verifies them.

Hand-written combos use the same shape: `{ id, char, name, steps:[…], gaps:[0, framesSincePreviousPress…], hits, damage, difficulty, note, verified:"YYYY-MM-DD", status:"verified" }`.
The page only shows entries with `status: "verified"`, so run the combos test before setting it.

## Tests
`npm run test:controls-lab` (console/requests, trial judge, controller view, pad navigation, screenshots, real play),
`test:controls-lab-roster` (every fighter loads and animates, every move demos), `test:controls-lab-combos`
(every combo re-verifies), `test:controls-lab-links` (main menu / Academy links plus a main-game render check).
Screenshots: `docs/controls_lab/screenshots/`.

## Watching the CPU (2026-11-20)
`node tools/controls_lab/ai_combo_mine.mjs . [--only key,key] [--frames 5400]` plays each fighter as the IMPOSSIBLE CPU against an
EASY mirror in a real AI-vs-AI match, logs every attack it starts and its combo counter, and maps each run of hits back to Lab
notation (each move's engine attack name is learned from the Lab's own move demos). The most common routes go to
`tools/controls_lab/combo_candidates_ai.json`; `build_combos.mjs` tries them (after the documented routes, before the generic
chains) and keeps only the ones that verify. Library entries from it have `source: "generated (watched the CPU play)"`.

**Combo strings.** `build_combos.mjs --allow-gap N` also keeps routes where every step lands and the game's combo counter counts
every hit, but the dummy gets up to N free frames between two hits (a gap a real opponent could block in). These entries carry
`kind: "string"`, `freeFrames` and `gapAllowed`; the card shows **STRING · gap Nf** (true combos show **TRUE COMBO**), the
verifier and the trial judge accept up to `gapAllowed` free frames. Used (N = 12) only for fighters with no true combo.
Fighters still without a combo after that have no route under a 12-frame gap (see combo_build_report.json for the reasons).
