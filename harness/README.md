# Test harness

Live in-game verification driven by a real Chromium instance (Playwright).

## Run

```bash
npm install           # once — installs playwright
npx playwright install chromium   # once — downloads the browser
npm run test:susanoo  # or: node harness/susanoo.test.mjs
HEADED=1 npm run test:susanoo     # watch it run in a visible window
```

Exit code is non-zero if any assertion fails. Screenshots land in `harness/shots/`.

## How it works

- A tiny built-in static server serves the repo over HTTP (ES-module imports are
  unreliable over `file://` in Chromium).
- The game is loaded with `?harness=1&p1=sasuke`, which activates the **harness
  hook** in `game.js` (`window.__harness`). The hook is **inert** without the URL
  param — normal play is completely unaffected.
- Keyboard input goes through Playwright's real `page.keyboard.*` events, which
  reach `document` — exactly where `input.js` listens. The harness never fabricates
  a `KeyboardEvent`. `__harness.keys()` reads `input.js`'s `keys` state back out so
  delivery is *proven*, not assumed.
- Because the input buffer is **polled** once per frame (`getFighterInput`), the
  ultimate key is held down across ≥1 frame (`tapUltimate`) rather than a fast
  `press()` that a single-frame poll would miss.

## `window.__harness` API (only when `?harness` is present)

| method | purpose |
|---|---|
| `boot()` | start a Sasuke training match and skip straight into BATTLE with full energy |
| `start()` / `skipToBattle()` | the two steps of `boot()` separately |
| `state()` | `{ gameState, countdown, frame }` (`frame` = `globalFrameCount`, ground truth for frame-accurate waits) |
| `arena()` | `{ left, width, mid }` physics bounds |
| `keys()` | snapshot of `input.js` `keys` (proves key delivery) |
| `p1()` / `p2()` | fighter snapshot — stage, energy, `_skinAnim`, `_canvasHeightFrac`, `frameIndex`, `_lastDrawY`, `_lastBobUp`, `_arenaHalfLock`, hitbox `w/h`, … |
| `fillEnergy()` / `setEnergy(v)` | set P1 energy |

## What `susanoo.test.mjs` covers

- **TEST 0** — key delivery to `input.js` (`keydown`/`keyup` → `keys[...]`).
- **TEST 1** — Susanoo double-press: press → Stage 1 (giant body-swap, 0.95 sizing,
  ~50% energy, half-arena lock latched); press again → Stage 2 (drain-to-0, 1.20
  sizing, same lock).
- **TEST 2** — temporal smoothness: samples the giant's drawn Y / bob / frame index
  over 150 animation frames and asserts the bob is continuous (rise-only, small
  per-frame steps), the idle uses exactly the 2-pose calm window, and the cadence
  is slow (~40-frame holds, not the old speed-8 flail).
- **TEST 3** — the half-arena movement lock still confines the giant.

## What `susanoo_refinements.test.mjs` covers

Run: `node harness/susanoo_refinements.test.mjs`.

- **TEST 1** — the round timer PAUSES while Susanoo is active (`__harness.roundTimer()`
  frozen) while the Susanoo DURATION timer (`p1().susanooTimer`) keeps counting down.
- **TEST 3** — attack FX (grab / arrow / sword) spawn at the giant's ARM height:
  compares each spawned projectile's `y` against the expected arm-fraction position
  derived from the giant's rendered top (`lastDrawY`) and feet.

## What `round4.test.mjs` covers

Run: `node harness/round4.test.mjs`.

- **ITEM 1** — Susanoo can't jump (`canJump=false`; jump input leaves the giant grounded).
- **ITEM 2** — Susanoo attacks auto-aim DOWN at the opponent (grab FX / arrow velocity has vy>0
  and vx toward the opponent; arrow |v| preserved at 15).
- **ITEM 3** — the two-strike lightning special: **down,forward + special (qcf+`l`)** triggers it,
  plain `l` still does the dash-strike; handseal → strike1 (pillar) → strike2 (ground burst), two
  separate blockable hits, and a hit during handseals cancels the cast.
- **ITEM 4** — Naruto's Tailed Beast Bomb arms a 4800f/80s recast cooldown (4× the universal 1200).

## What `sharingan.test.mjs` covers

Run: `node harness/sharingan.test.mjs`.

The Sharingan-awakening cinematic on Susanoo Lv1→Lv2 (the 2nd ultimate press): (a) combat
FREEZES while it plays (holding right doesn't move Sasuke — same freeze contract as Kurama),
(b) the eye rows step 0→1→2→3 top-to-bottom, (c) the Lv2 escalation lands only when the
cinematic resolves, then combat resumes. Note: because the escalation now plays a ~134-frame
cinematic (combat frozen throughout, incl. the RESOLVE tail), tests that escalate to Lv2 must
wait for `!sasukeCine().active && p1().susanooStage === 2` before pressing further inputs, not
just `susanooStage === 2` (which flips at the resolve beat while combat is still frozen).

## P1 control keys (from game.js `P1_CONTROLS`)

`a/d` move, `w` jump, `s` down, `j` light, `k` heavy, `i` up-attack, **`l` special**,
`u` ultimate, **`o` grab**, `p` charge. (Note: special is **`l`**, not `o`.) The input
buffer is frame-polled, so hold each key ≥1 frame (`tapKey` / `tapUltimate`), and wait
out `attackCooldown` between successive specials/ultimates.

**Sasuke's two specials share the `l` button via a motion split:** plain `l` → dash-strike
(gap-closer); **down, forward, then `l`** (quarter-circle-forward) → two-strike lightning. Feed
the motion by pressing the movement keys (`s` then `d`) before `l` so `recordDirectionInput`
logs the D,F sequence.

## Known flaky tests (pre-existing — do not re-investigate from scratch)

These assertions fail **intermittently on a clean checkout** because they depend on frame-tight
positioning/RNG in the live Chromium harness (dummy drift, DoT-tick timing). A single red run is
not a real regression — re-run 2–3×; a true break fails *deterministically*.

- **`test:isshiki`** — two assertions flake: **"ground/air string multi-hit damage (≥N)"** (the
  string sometimes lands only its first hit → e.g. `dmg=14`) and **"Daikokuten cubes (Down): trap
  auto-ticks damage"** (the DoT tick sometimes reads `0`/`6`). Observed on `main` at `c15f5b13`
  fluctuating between **52/0, 51/1, and 50/2** across back-to-back runs with **no code change**.
  Explicitly **NOT** caused by the input-buffer 7→10 fix (that commit): a *more-lenient* buffer
  cannot make a multi-hit string land *fewer* hits nor zero a damage-over-time trap, and the real
  combo-system suites (`cancel_window`, `combo_stage_b/c/d`, `combo_decay`) pass green. If you touch
  Isshiki's kit and see a *consistent* fail on these, that's new — otherwise it's this flake.
