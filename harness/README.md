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
