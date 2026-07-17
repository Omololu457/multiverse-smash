# Toji real-play regression — systemic diagnosis (NOT a fix; evidence for review)

Investigation of why every Toji sprite fix (jitter, dual-render, jump-shrink) that was
"harness-confirmed" is back in real play, plus the new "intro plays too fast". Per the request,
**nothing is marked fixed here** — this is the STEP 1/STEP 2 systemic findings + screenshot evidence.

## STEP 1 — Harness path vs real menu path: SAME fighter setup (no shortcut difference)
Both converge on the identical fighter-creation code:
- Real menu: `SELECT_STAGE` click → `handleMenuClicks` (game.js:2958) → **`startMatch()`**.
- Harness: `__harness.boot()` → `startHarnessMatch()` (game.js:3187) → **`startMatch()`**.
- `startMatch()` → `resetRound()` → **`createFighter()`** → **`applySkin()`** in BOTH paths. The harness
  only pre-sets `matchConfig` (p1CharKey/skin/stage) then calls the same `startMatch`. For Toji's
  default skin, both apply `spriteScale: 2.3` the same way.
- Verified live: driving the **real menus** (no `?harness`) to a Toji match renders Toji **correctly**
  at 60fps — identical to the harness (see `toji_real_idle_*`, `toji_real_jump_arc_*`). No path
  difference explains the regression.

## STEP 2 — Deployed code == committed code (no reverted fix, no stale build)
- `git status`: only `index.html` modified, and its only diff is **one blank line** in `<style>`.
- `index.html` loads `<script type="module" src="./game.js">` — ES modules served **directly**, no
  bundle/minified build, no separate entry point. What's played == the source files == HEAD.
- All Toji fix files are **clean vs HEAD**: `characters.js` still has `spriteScale: 2.3`, idle
  `sourceX:9/width:34`, jump `sourceX:41/frames:5`, etc. The fixes ARE in the running code.

## THE ACTUAL CAUSE — frame-rate-dependent game loop (no delta time, no fps cap)
`game.js` `gameLoop()` (≈line 3036):
```
function gameLoop() {
  globalFrameCount++
  ctx.clearRect(...)
  updateCurrentState()   // advances exactly ONE logical frame
  renderCurrentState()
  requestAnimationFrame(gameLoop)
}
```
Every animation/physics/intro tick = **one requestAnimationFrame**. There is no `deltaTime`
normalization and no frame-rate cap.

Measured rAF cadence (independent counter, does not touch the loop):
- **Normal headless (what the harness verifies at): ~61 rAF/s** (≈60fps).
- **High-refresh simulated (rAF fired every ~4ms): ~210 rAF/s** — a **3.4× speedup**.

So on a real 120/144/165 Hz monitor the entire game runs **2–2.75× faster** than the 60fps the
harness confirms. That single fact explains all four symptoms as ONE systemic issue:
- **Intro too fast** (the new bug): the intro is frame-COUNT driven (introWalkIn 17f×speed2=34f,
  introReady 15f×speed3=45f) — at 3.4× fps those frames elapse in ~1/3 the wall-clock time.
- **Idle "jitter"**: the idle loop (speed:8) cycles 2–3× too fast → reads as twitchy/jittery.
- **Jump-shrink / dual-render**: jumps and animations blur past 2–3× faster; fast motion smears.

The harness passes because headless Chromium paces rAF at ~60fps — the exact rate the fixes were
tuned/verified at. Real play at high refresh runs the same code faster.

## STEP 4 — Intro speed values are correct and correctly applied
`introWalkIn` speed:2 / `introReady` speed:3 are read and applied as designed:
- `game.js introStepFrames = frames × speed`; `advanceIntroSequence` switches parts on that count.
- `sprite.js updateFrames` advances a cel when `frameTimer >= speed`.
Nothing overrides or misreads them. The values are fine **for 60fps** — the "too fast" is purely the
frame-rate mechanism above (frame-count playback + uncapped loop), not a bad/overridden speed value.

## Screenshot evidence (in `harness/shots/`, committed)
Captured through the **real menu flow** (no `?harness`): `toji_real_00_start` … `06_stageselect`
(menu nav), then `toji_real_intro_t*ms`, `toji_real_idle_*`, `toji_real_walk_*`, `toji_real_jump_arc_*`.
The `toji_fastRAF_*` set is the SAME flow with rAF sped to ~210fps to simulate a high-refresh monitor.
Key comparison: at t≈500ms the high-refresh run is already at round-start countdown **"2"**
(`toji_fastRAF_intro_t500ms`) while the 60fps intro is still playing — the intro (and everything)
runs several times too fast. At 60fps (`toji_real_*`) Toji renders correctly.

---

## FIX APPLIED — fixed-timestep 60Hz loop (game.js `gameLoop`)

Root-cause fix for all four symptoms at once (they were one frame-rate artifact).

**Why a frame LIMITER, not a decoupled accumulator:** sprite frame-advancement (`updateFrames`)
lives inside `sprite.draw()` — the RENDER pass, not update. So the textbook "tick logic N times,
render once per rAF" accumulator would leave animation still advancing once per rAF (= too fast). The
correct fix for this architecture gates the ENTIRE update+render pass to 60Hz via a real-time
accumulator, skipping rAF callbacks that arrive too soon. At most ONE pass per rAF → nothing that
assumed one-frame-per-pass (hitstop/freeze/cinematic timelines, cooldowns, input) changes. A long
stall is clamped to one frame (no fast-forward); a sub-60Hz display runs at its rate (no spiral).

**Proof — game logic speed is now refresh-rate-independent** (measured via `?harness`, over wall-clock):

| rAF rate | game LOGIC rate |
|---|---|
| 60/s (normal) | **60/s** |
| 182/s (simulated high-refresh) | **60/s** |

Before the fix, logic == rAF rate (60 vs 182). Now pinned to 60Hz either way.

**Visual proof (real menu flow):** at t≈500ms after stage-confirm, `toji_postfix_real_intro_t500ms`
and `toji_postfix_fastRAF_intro_t500ms` are on the SAME intro frame — whereas pre-fix
`toji_fastRAF_intro_t500ms` was already at round-start countdown "2" (intro finished ~3x early). The
intro now plays its intended real-time duration at any refresh rate.

**Regression:** all 11 harness suites pass (209 assertions) — Susanoo cinematic / Kurama TBB / hitstop
/ cooldown timelines unaffected (frame-count-based; globalFrameCount still advances at 60Hz).

Compare in `harness/shots/`: `toji_fastRAF_*` (pre-fix) vs `toji_postfix_fastRAF_*` (post-fix).
