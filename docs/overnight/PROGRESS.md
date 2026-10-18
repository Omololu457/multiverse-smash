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
| 0 | Audit (read-only → AUDIT.md) | **DONE** | `c9fd60a0` | docs/overnight/AUDIT.md — full map + per-phase build pointers |
| 1 | Performance preset + settings | TODO | — | |
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

_(none yet)_

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

## RESUME: phase 1

Phase 0 is committed + pushed. To continue: `/clear`, then say
**"continue from docs/overnight/PROGRESS.md"**. Start at **Phase 1 (Performance preset + settings)**.
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
