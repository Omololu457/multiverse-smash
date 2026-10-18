# OVERNIGHT POLISH RUN — PROGRESS

Branch: **`feat/overnight-polish`** (off local `main` @ `318fbf1b`, which already contains the
health-bar juice pass — this run EXTENDS the HUD/health-bar work, never duplicates it).
Never push/merge to `main`. Branch is pushed after each completed phase.

Morning merge command (for YOU to run, not me):
```
git checkout main && git merge --ff-only feat/overnight-polish
```

---

## SETUP / PRE-FLIGHT

- **Gate override (logged):** started with **9 tracked changes** (8 regenerated `harness/shots/*.png`
  test screenshots + `updates.TXT` WIP notes, ~83 uncommitted lines — a concurrent session's). The
  hard rule says STOP; user explicitly authorized **"proceed despite the 9"**. These 9 remain
  **unstaged for the whole run** (I stage only by explicit path, never `git add -A`).
- `git checkout main` → OK. `git fetch` → OK. `git merge --ff-only origin/main` → "Already up to date"
  (local main was 2 ahead = the two health-bar juice commits, 0 behind). `git checkout -b feat/overnight-polish` → OK.
- **Baseline gate tests:** determinism **14/0 ✅**, roster-integrity **✅**, combo-standard **225 passed / 9 failed**
  (PRE-EXISTING — my per-phase gate is "no worse than 225/9"). Render check run per phase.

## ORDER GUARD — prior passes already on main (EXTEND, do not duplicate)

- **JUICE / explosions, HIT FEEL, Sparking pack** — shipped earlier (this session + before).
- **Health bar juice** — `158f5940`, `318fbf1b` (mine, on this branch's base): smooth drain, lost-chunk
  ghost, punch/shake/flash, heal sparkles, low-HP color.
- **HUD Phase 1** — `606a2175` themed in-match health bars + character portraits (concurrent).
- **feel-timing-weather Phase 1** — `30ef2169` hitstop scaled by attack power + whiff/block cues
  (concurrent; lives on branch `feat/feel-timing-weather`, also on main's lineage — build AROUND it).
- **Brutality** — ALL 124 brutalities complete (concurrent). **Fatality** system — roster-wide FINISH
  window + chopped-victim sprites (concurrent). Treat both as done; never duplicate.

---

## PHASES

| # | Phase | Status | Commit | Notes |
|---|-------|--------|--------|-------|
| 0 | Audit (read-only → AUDIT.md) | **DONE** | `38fed4e1` | docs/overnight/AUDIT.md — full map + per-phase build pointers |
| 1 | Performance preset + settings | **PARTIAL** | _(latest)_ | preset LOGIC + PERF OVERLAY (F8) done+tested; Options preset-row + auto-suggest chip + Options grouping REMAIN |
| 2 | Accessibility | TODO | — | |
| 3 | Version check + error log + safety net | TODO | — | |
| 4 | Input buffering & leniency (SIM) | TODO | — | may SKIP if combo/det shift |
| 5 | Audio mixer | TODO | — | |
| 6 | Menu foundation + pause menu | TODO | — | |
| 7 | CPU AI difficulty (SIM) | TODO | — | |
| 8 | Training mode upgrades | TODO | — | |
| 9 | Combo trials | TODO | — | |
| 10 | Arcade mode | TODO | — | |
| 11 | Profile, stats, unlocks | TODO | — | |
| 12 | Stage life + stage music | TODO | — | |
| 13 | Replays + photo mode | TODO | — | |
| 14 | Roster review (report) + hide switch | TODO | — | |
| 15 | Perf benchmark + final QA | TODO | — | |

## NEW SETTINGS (running list)

- **Graphics Preset** (`juiceSettings.applyGraphicsPreset` / `detectGraphicsPreset` / `cycleGraphicsPreset`):
  Low / Standard / Full, DERIVED (not stored) → reads "custom" once any effect setting is tweaked, so the
  old per-setting behaviour is fully restorable. Sweeps particles/shake/atmosphere/hitEffects/animFinisher/
  slowMo. No new localStorage key (derived from the existing ones). Default = whatever the current settings
  are (i.e. "custom"/"full" on a fresh install — unchanged from before).
- **Perf Overlay** (`juiceSettings.perfOverlay`, key `ms_perf_overlay`, default **OFF**): toggle with **F8**
  in-game. Shows FPS, frame-time (avg/max over 120f), draw calls, projectiles/summons/fx/dmg#, pool stats,
  and now the juiceFX particle count (`particles N / cap`). Extends the pre-existing `?debug` overlay
  (which still works + forces it on); adds the persisted setting + key toggle + particle line.

## DECISIONS LOG

- Proceeded despite 9 tracked changes (user-authorized). Left them unstaged.
- Branch based off local `main` (includes unpushed health-bar juice) rather than `origin/main`,
  because the ff-only merge confirmed local main = origin/main + my 2 juice commits (no divergence).

## KNOWN ISSUES

- combo-standard 225/9 is pre-existing (not caused by this run).
- **⚠ ACTIVE CONCURRENT SESSIONS on this shared checkout.** During Phase 0, `game.js` and
  `juiceSettings.js` appeared as foreign uncommitted working-tree changes that I did NOT make
  (another autonomous session is editing shared files live). Phase 0 was docs-only so explicit-path
  staging kept them out of my commit — but **Phase 1+ edit game.js / juiceSettings.js / ui.js**, which
  will collide with those live edits. **The resumer MUST:** (1) re-check `git status` before each edit/
  commit; (2) stage ONLY by explicit path; (3) before committing a shared file, verify the staged diff
  contains ONLY this-run's changes (no foreign hunks) — use the mine-only/private-index technique if the
  working tree is dirty with foreign edits; (4) if a shared file is too entangled to separate safely,
  mark the phase PARTIAL/SKIPPED and report, rather than clobbering concurrent work. Ideally resume when
  the other sessions have settled.

## ISOLATED WORKFLOW — REQUIRED while concurrent sessions are active on this checkout

A concurrent autonomous session is live: it switched HEAD mid-run (my Phase-0 commits first landed on
`feat/feel-timing-weather` as `c9fd60a0`/`c181143e` — strays; this branch was rebuilt cleanly via plumbing
to `38fed4e1`), and it keeps FOREIGN uncommitted edits in the shared working tree (`game.js`,
`juiceSettings.js`, `sprite.js`). So: **do NOT edit the working tree, do NOT rely on `git checkout`.** Use:

1. **EDIT on temp copies from the branch tip** (never touch the shared working tree):
   `git show feat/overnight-polish:<file> > /tmp/ovn/<file>`  then edit `/tmp/ovn/<file>`.
2. **COMMIT via private-index plumbing** (immune to branch switches + foreign working-tree):
   ```
   export GIT_INDEX_FILE=/tmp/ovn.index; rm -f $GIT_INDEX_FILE
   git read-tree feat/overnight-polish
   B=$(git hash-object -w /tmp/ovn/<file>); git update-index --add --cacheinfo 100644,$B,<file>   # repeat per file
   TREE=$(git write-tree); C=$(git commit-tree $TREE -p feat/overnight-polish -m "phaseN(overnight): ...")
   git update-ref refs/heads/feat/overnight-polish $C; unset GIT_INDEX_FILE
   ```
3. **TEST via archive** (NOT a worktree — a plain file export; immune to working-tree pollution):
   ```
   rm -rf /tmp/ovn_test && mkdir -p /tmp/ovn_test && git archive feat/overnight-polish | tar -x -C /tmp/ovn_test
   ```
   Run gates + `harness/overnight_render_check.mjs` with ROOT pointed at `/tmp/ovn_test` (copy the harness to
   serve from there, or adapt its ROOT). Phase is DONE only if determinism 14/0, roster ✅, combo ≤9 fail,
   render ✅ — all against the ARCHIVE of the branch, not the dirty working tree.
4. **PUSH**: `git push origin feat/overnight-polish:feat/overnight-polish`

**STRONGLY PREFERRED:** stop the other autonomous session first so this checkout is exclusive — then the
normal fast workflow (edit working tree → `git add <explicit path>` → test → commit → push) works and all
this plumbing is unnecessary. The plumbing path is a fallback for the hostile shared checkout.

### Phase 1 — Performance preset + settings — PARTIAL

- **DONE (this commit):** `GRAPHICS_PRESETS` + `applyGraphicsPreset(name)` + `detectGraphicsPreset()` +
  `cycleGraphicsPreset()` in `juiceSettings.js`. Low=cheapest, Standard=full minus the heavy atmosphere fog,
  Full=everything. Self-contained, additive, derived active-preset (no desync, old behaviour restorable).
  Unit-tested (apply/detect/custom/cycle). Gate on branch archive: determinism 14/0, roster ✅, combo 225/9,
  render ✅.
- **DONE (this commit):** PERF OVERLAY — `F8` toggles the existing FPS/frame-time/counts overlay (was `?debug`
  only); now a persisted `perfOverlay` setting (default OFF) + a juiceFX particle-count line. Render-only.
- **REMAINING (next context — ideally on an EXCLUSIVE checkout so game.js can be edited normally):**
  (1) surface Low/Standard/Full at the TOP of the Options screen (`drawSettingsScreen`, game.js ~21025);
  (3) auto-suggest chip: FPS<50 for 5s in a match → non-blocking "Low graphics?" chip
  (never auto-switch); (4) group Options into Gameplay / Video / Audio / Accessibility / Controls. These all
  touch the 24k-line game.js, which is impractical to edit safely via the isolated temp-copy workflow — do
  them with normal targeted edits once the checkout is exclusive.
- **Decision:** battle-damage/decals are a concurrent feel-session feature NOT on this base → preset omits
  them for now (wire in when they reach main). Logged.

## RESUME: phase 1

Phase 0 is committed + pushed. To continue: `/clear`, then say
**"continue from docs/overnight/PROGRESS.md"**. Phase 1 is PARTIAL — the preset LOGIC is committed; FINISH Phase 1's UI wiring (presets row in
Options, perf overlay, auto-suggest chip, Options grouping — all in game.js) then proceed to Phase 2.
Build pointers are in `docs/overnight/AUDIT.md` §2 (settings) + §1 (screens) + §6/§7 (effect toggles to
bundle into the Low preset). Re-run baseline gates first; heed the concurrency warning above.

---

### Phase 0 — AUDIT — DONE
- **Deliverable:** `docs/overnight/AUDIT.md` (screens/routing, settings store, input pipeline, AI, training,
  audio, stages/music, replays/determinism, saves/unlocks, LAN/companion, tests) + per-phase build pointers.
- **Method:** 4 parallel read-only audit agents; no code touched (docs-only commit).
- **Key findings that change later phases:** replays mostly already exist (`replay.js`, sim deterministic);
  LAN `buildStamp` already exchanged (Phase 3 adds roster-hash + title version); NO companion/second-screen
  feature exists (report, don't invent); `INPUT_BUFFER_FRAMES=10` already present (Phase 4 extends carefully);
  AI has Gojo/Sukuna per-character signature code (Phase 7 stays generic, reports it); ambient+atmosphere
  already exist (Phase 12 extends); audio has no per-category buses yet (Phase 5 adds them).
- **How to test (3 bullets):**
  - `git show --stat HEAD` → only `docs/overnight/AUDIT.md` + `PROGRESS.md` changed.
  - Open `docs/overnight/AUDIT.md` — every section has `file:line` refs; spot-check a few.
  - Gates unchanged from baseline (no code touched): determinism 14/0, roster ✅, combo 225/9.
- **Settings added:** none. **Decisions:** none beyond setup.

---
_Phase detail is appended below as each completes._
