# Goku Build — PROGRESS

Branch: `feat/goku` (off `origin/main`). Never merged/pushed to main by me.
One commit per phase; branch pushed after each phase.

## Baseline (origin/main @ 2bcc11b7, verified on feat/goku with 0 tracked changes)
- `test:determinism` — **14 passed, 0 failed**
- `test:roster-integrity` — **green**
- `test:combo-standard` — **225 passed, 9 failed** — the 9 are PRE-EXISTING and
  NOT mine: gogeta & goku_rose missing upAttack/air normals + classification
  count mismatches (roster = 124). `goku` is NOT in the current roster (the old
  Goku was deleted on purpose) and is NOT among the failures.
- Roster size: **124**. Shared working dir with concurrent sessions
  (ghostface on origin/main, homelander on `feat/homelander-flight`) — commit
  per phase, stage by explicit path only.

---

## Phase 1 — INVENTORY ✅ (this commit)
Read-only w.r.t. game code; writes assets/docs only.

**Decisions**
- Source copied **byte-identical** to `assets/source/goku_original.png`
  (md5 `fa937fec…`, 1400×1823, exact teal `#008080`).
- Segmentation = connected-components after masking teal + 42 white divider
  runs; tiny fragments merged into parent sprite; 1–2px slivers dropped.
  **395 frames / 26 row-groups.**
- **SSJ3 donor frames do NOT exist** on this sheet (verified). SSJ3 → full
  fallback in Phase 2. Logged in LEDGER.
- Kamehameha cupped-hands / Spirit-Bomb arms-raised / IT finger-pose not
  cleanly isolated → code-drawn FX + substitute poses, finalized Phase 4.

**Artifacts**
- `assets/source/goku_original.png` — untouched source.
- `assets/source/goku_inventory.json` — per-frame bbox + colour stats + row
  labels + `key_frames` (verified donor/effect coords) + `ssj3` finding.
- `assets/source/goku_contact_sheet.png` — labelled 3× contact sheet (R#, idx).
- `docs/goku/LEDGER.md` — every row/item → use; zero orphan frames.
- `goku_work/inventory.py`, `goku_work/annotate.py` — reproducible tooling.

**How to test Phase 1**
- `python3 goku_work/inventory.py` regenerates inventory.json + contact sheet.
- `python3 goku_work/annotate.py` re-attaches key_frames + labels.
- Open `assets/source/goku_contact_sheet.png` to eyeball cuts.
- Guards unchanged (0 tracked code delta): `npm run test:determinism`,
  `test:roster-integrity`, `test:combo-standard` match baseline above.

**Render check (Phase 1):** no Goku in roster yet, so the full
boot→pick→transform check begins at Phase 4/5. Boot is provably identical to
origin/main because **0 tracked code files changed** (`git diff HEAD` empty).

Commit: _(filled on commit)_

---

## Phase 2 — PER-FORM SHEETS ⏳ pending
## Phase 3 — POWER LADDER ⏳ pending
## Phase 4 — THE KIT ⏳ pending
## Phase 5 — HUD / AI / POLISH ⏳ pending
