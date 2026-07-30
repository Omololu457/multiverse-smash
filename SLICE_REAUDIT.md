# Game-Wide Sprite-Slicing Re-Audit (diagnostic only — nothing re-sliced)

**Date:** 2026-07-29 · **Branch:** combo-flow-layer
**Scope:** all 27 sprite characters · 607 wired `animationData` entries · 496 unique sheet files
**Tool:** `harness/slice_reaudit.mjs` (batch) + `tools/slice_probe.mjs` (per-sheet overlays)

## Method

For every wired `animationData` entry (`{sheet, frames, width, height, sourceX, sourceY}`)
a fresh alpha-gutter column scan (ALPHA=16, identical to `tools/slice_probe.mjs`) was run
on the actual PNG and compared to the in-code frame boundaries. The decisive discriminator
turned out to be **sheet-coverage** = `frames × width / sheetWidth`, restricted to the band
the action actually reads:

- **coverage ≈ 100%** → the wired cells tile the sheet exactly. Any excess alpha "islands"
  are debris / detached limbs / transformation-FX sparks *inside* correctly-sized cells,
  **not** a slicing error. (This is the Ben-audit lesson: raw island-count ≠ frame-count
  is expected noise — one pose can split into several islands, two poses can touch.)
- **coverage ≪ 100% with content beyond the wired span** → real: the animation renders only
  part of the sheet. **These are the only genuine findings.**

Off-by-≤6px overhang (`frames×width` a hair over `sheetWidth`) is benign pitch-rounding
(canvas clamps the last cell); the by-design `fall = frames:1` band split (every character
reuses `*_jump_uniform.png` at a `sourceX` offset) is not a slice at all.

## Headline

**25 of 27 characters: CLEAN.** Two entries need a manual look — and, as predicted, both are
on **early-built characters** (Sasuke, and the lone sprited Power Ranger). No late-build
character (HxH / DC / Demon Slayer / Invincible batch) shows any slicing drift.

| Character | Entries | Verdict | Notes |
|---|---|---|---|
| goku | 3 | ✅ clean | 1 atlas/banded (FULLSHEET, by-design even-split) |
| goku_black | 20 | ✅ clean | — |
| vegeta | 31 | ✅ clean | — |
| gojo | 23 | ✅ clean | 1 missing-file → procedural fallback |
| megumi | 21 | ✅ clean | — |
| sukuna | 19 | ✅ clean | 1 missing-file → procedural fallback |
| toji | 40 | ✅ clean | 1 atlas/banded (by-design) |
| naruto | 18 | ✅ clean | — |
| **sasuke** | 17 | ✅ **FIXED 2026-07-29** | **intro** re-sliced to uniform 12×59 cells (see below) |
| itachi | 17 | ✅ clean | — |
| tobirama | 27 | ✅ clean | 1 single-pose guard/hurt |
| minato | 24 | ✅ clean | 1 single-pose guard/hurt |
| zenitsu | 20 | ✅ clean | 2 single-pose guard/hurt |
| rengoku | 31 | ✅ clean | 2 single-pose guard/hurt |
| rick | 18 | ✅ clean | 1 single-pose (meeseeksThrow) |
| beerus | 25 | ✅ clean | — |
| ben10 | 19 | ✅ clean | 1 single-pose guard/hurt |
| omniman | 28 | ✅ clean | — |
| **omega_ranger** | 34 | ⚠ **NEEDS CHECK** | **heavy** covers only 50% of sheet |
| netero | 18 | ✅ clean | — |
| saiki | 21 | ✅ clean | — |
| killua | 23 | ✅ clean | — |
| flash | 18 | ✅ clean | 1 single-pose guard/hurt |
| gon | 21 | ✅ clean | — |
| batman | 21 | ✅ clean | — |
| hisoka | 21 | ✅ clean | — |
| superman | 29 | ✅ clean | — |

## The two real findings (visually confirmed via boundary overlay)

### 1. `sasuke.intro` — non-uniform strip wired as uniform ✅ FIXED (2026-07-29)
**Resolved:** `sasuke_intro.png` repacked via `tools/reslice_strip.mjs` into 12 clean uniform
`59×57` feet-registered cells (0-2 cloaked · 3 flare · 4 swirl · 5 reveal · 6-8 arrival ·
9 point · 10 sword+wire · 11 rest). `animationData.intro` re-wired to `9×59` (plays cells 0-8,
the cloak-reveal ending on a clean standing pose, stopping before the sword+wire *combat* cells —
which stay in the file for a future "wire kunai" move). Still not pooled (redundant with
introCloakAlt) but now renders cleanly if re-pooled. `test:intros` 16/16. Original below:

`sasuke_intro.png` was **511px** wide but wired `6 × 57 = 342px` → **only 67% covered**.
Content runs to x=504. The overlay (`harness/shots/SLICE_sasuke_intro.png`) shows ~11 poses:
narrow standing frames, then a **wide cloak-swirl transform frame (~85px)**, then combat-ready
poses. Because the sheet is *non-uniform* (that wide frame) but is sliced at a fixed 57px pitch,
the uniform split drifts and the intro renders only the first ~6 poses — the sword-draw / final
stance at the right edge never play. This is the same *class* as Ben's original mis-slice and
sits on one of the earliest-built characters.
→ Fix path (if chosen): re-pack to a uniform strip (`tools/reslice_strip.mjs`) or re-wire with
per-frame `sourceX`, then bump `frames`.

### 2. `omega_ranger.heavy` (downward_smash) — half the sheet unused (MEDIUM confidence)
`omega_ranger_downward_smash_uniform.png` is **1780px** but wired `10 × 89 = 890px` → **50%**.
The **89px pitch is correct** (poses tile cleanly at ~89px), so this is *not* a boundary error —
it's a **frame-count** question: the sheet holds ~20 poses (windup→smash→impact→recovery) and only
the first 10 are wired. That may be an intentional trim (heavy attack ends at impact, recovery
dropped), so it needs a design decision, not necessarily a re-slice.
→ Verify intent; if the recovery frames are wanted, bump `frames` to ~20 (no re-slice needed).

## Secondary observations (not slicing errors — noted for completeness)

- **Single-pose guard/hurt (9 entries):** `frames:1` drawn from a multi-frame `*_uniform.png`
  strip (e.g. `zenitsu.guard` draws 41px of a 205px sheet; `flash.guard` 80/560; also
  tobirama/minato/rengoku hurt, ben10 hurt, rick meeseeksThrow). The slice is correct — these
  deliberately hold a single frame. Only worth a look if you *want* animated guards/flinches
  (the extra frames exist on-disk, ready to wire).
- **Missing files → procedural fallback (2):** `gojo.hollow_purple_cast` →
  `./gojo_hollowpurple_release_sheet.png` and `sukuna.hurt` → `./sukuna_hurt_sheet.png` are
  wired but not on disk, so those actions silently fall back to procedural drawing. Not a
  slicing issue; a missing-asset one.
- **Atlas / banded (goku FULLSHEET idle, toji wideArc):** shared master sheets with `sourceX/Y`
  offsets and no gutters — the alpha scan can't verify them, but they're documented even-split
  atlases and render correctly in-game.
- **10 "island-count mismatch" candidates cleared:** toji introWalkIn/introReady/risingSpiral/
  aimedShot, rick selfDestruct, beerus outward, ben10 up/transform, omega intro2/omDownSpecial —
  all tile their sheet at ≈100% coverage; the extra islands are FX sparks, detached limbs, or a
  1px arm-gap seam. No action.

## Recommendation

Per the task, **nothing was re-sliced.** Only **`sasuke.intro`** is a clear re-slice candidate;
**`omega_ranger.heavy`** is a frame-count/design call rather than a mis-slice. Everything else
across the roster is correctly sliced. Re-running this audit any time: `node harness/slice_reaudit.mjs`
(after regenerating `/tmp/audit_rows.json` from `characters.js`).
