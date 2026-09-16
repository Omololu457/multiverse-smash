# TODO / Come-Back-To Handoff

_Created 2026-09-14 (Claude session). Mirrors the "UNFINISHED WORK" section appended to `updates.TXT`, kept here as a standalone file because `updates.TXT` is actively rewritten by a concurrent process._

> ⚠️ **Verify before starting any item.** A concurrent process is actively editing this repo (branches switch on their own; ~650 uncommitted files at last check), so some items below may have progressed or been committed since these notes were written. Do a `git log` / `git status` pass first.

---

## ✅ Done this session (already committed + pushed to `origin/main`)

- **Fullscreen/windowed resize desync fix** — commit `eaec957e`
  - Bitmap backdrops ground-anchored (`ui.js`).
  - Fighters re-ground on resize + per-fighter `groundY` cache refresh.
  - `test:stage-resize` 41/0.
- **In-match combo-break prompt + How-To/Training explainer** — commit `b7de262a`
  - Flashing "BREAK!" HUD prompt, DEFENSE tutorial rows, F4 "combo" training drill.
  - `test:combo-break-prompt` 10/0.
- Temporary branches (`fix/…`, `feat/…`) were merged to `main` and deleted.

---

## 🎨 Stage art (found during the desync task — NOT fixed, needs new art)

- [ ] **Undersized backdrops:** `jujutsu_high_courtyard.png` & `shibuya_incident_bg.png` are 1408×768 but drawn across the 3200-wide world (~2.27× horizontal stretch → blurry/soft at fullscreen). Need higher-res source art. (`valley_of_the_end_bg.png` / `test_map_bg.png` at 2752×1536 are fine.)
- [ ] **`mugen_train_bg.png` is a known PLACEHOLDER** — replace with real art.

---

## ⚙️ Mechanics built-but-not-fully-wired / deferred

- [ ] **Up Block:** overhead attribute shipped but DORMANT (no reward). Still to do: Up Block reward wiring, flawless/up-block precedence, special/command overhead tags, onboarding.
- [ ] **Samurai Rangers:** Mega Mode is wired, but still unwired — `updateSamuraiRangerCommandCombat` (rekka + up-attack) and the ultimate (`samuraiUltCine` hook missing).
- [ ] **Spider-Man variants:** `spiderman_ssf2` and `spiderman_mci` are normals-only — specials + ultimate not built (`spiderman_raimi` is complete).
- [ ] **Brutality (per-move finishers):** only ~12 chars have real finishers; ~72 chars + per-move LIVE-INPUT stamping still deferred.
- [ ] **Frame advantage / blockstun:** no true frame-advantage math yet (HITSTUN_SCALE padding is a stopgap). Held for its own pass.
- [ ] **Anim transition after-image** (combo-flow fix #2): built but was UNCOMMITTED awaiting go-ahead — confirm whether it ever landed.

---

## 🖥️ UI / systems without front-ends

- [ ] **Personality:** TIPI questionnaire UI never built (inference works; RPG-mapping trait rows are dormant).
- [ ] **Challenges:** `challenges.js` exists but there is NO challenge UI yet.
- [ ] **Colorblind:** control REMAPPING is flagged but not built (HUD toggle shipped).

---

## 🔊 Voice coverage

- [ ] ~29 playable chars have genuinely NO audio (netero is a permanent loss). Light Yagami is wired but still needs a transcript.

---

## 🧑‍🎨 Skins (see the audit section in `updates.TXT` for the full list)

- [ ] 33 playable chars have <10 skins; `ghostface_billy` has ZERO (SKINS registry fallback only). A concurrent process is actively adding skin waves (Albedo/Valkyrie/Alien X) — check what's landed.
- [ ] `ghostface_exe`: Stu / Roman / Mrs. Loomis / Amber skins marked (WIP).

---

## 🧹 Housekeeping

- [ ] Many older working-note items are marked "UNCOMMITTED" but a lot has since been committed/merged by concurrent work — reconcile with `git log` / `git status` before trusting them.
- [ ] Local checkout is shared with an active concurrent process (branches switch on their own, ~650 uncommitted files). Landing on `main` cleanly requires doing it when that process is idle/committed.
