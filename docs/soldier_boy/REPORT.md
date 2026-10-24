# Soldier Boy — Build Report

**Character:** Soldier Boy (The Boys' original super-soldier) · rosterKey `soldier_boy` · **Marvel** roster group
**Archetype:** Bruiser / Gunner · difficulty 2 · HP 1080 · *"The original. The loudest. Still standing."*
**Branch:** `feat/superman` (per owner request — built alongside the live Superman work).

A grounded, slow, high-HP bruiser whose whole kit is paid for from one meter — **Nuclear Charge** —
so every special is a choice against the full-meter Nuclear Burst ultimate.

## Phases (one commit each, private-index on the shared branch)
| Phase | Commit | Content |
|---|---|---|
| 1 — Sprites + roster | `03f68f1a` | `tools/reslice_soldier_boy.py` (alpha-cut, row-band + frame-run slicer; 58 rows/265 frames, feet-aligned, no flip), 48 `*_uniform.png` + portrait; `characters.js` entry (stats/animationData/metadata), `spritesheets.js` idle gate, `skins.js` default, `ui.js` label, `comboStandard.js` air-gap exemption; `SPRITE_LEDGER.md`. Render 12/0. |
| 2 — Energy economy | `1b590516` | Nuclear Charge: passive 3/s (`regenEnergy`), +6 landed / +4 taken (`applyScaledDamage`). 8/0. |
| 3 — Armed Mode | `8d49aea3` | Down+Heavy loadout swap (12s, 1.5 Charge/s drain, −10% move, 8s cd, ult-locked); armed Jab→SMG / Heavy→rifle. 22/0. |
| 4 — Moveset | `18096cf5` | 6 specials (Shield Toss / SMG Barrage / Rifle Shot / Gold Rush / Cape Cyclone / Diving Kick) + NUCLEAR BURST ult (280 unscaled radial). kit 28/0, kit-live 9/0 (nuke = 280×0.60 = 168 in-engine). |
| 5 — Combo test | `659659fb` | 5 brief combos asserted under the 85% model (128/118/203/131/105). 11/0. |
| 6 — Defensives | `e0ce2698` | Gold Brace (Block+Heavy, absorb 1, 6s), Back Roll (Block+Light, i-frames, 5s), Second Wind (passive, <20% HP, 25% DR + 20 Charge). 20/0. *(Also repaired a P5 private-index block-duplication — see Tooling.)* |
| 7 — Sound | `546442d8` | Deterministic WebAudio placeholder synth per the brief's recipes; ±3% pitch + seeded (LCG) noise from `hash(seed,frame,idx)`. 13/0. |
| 8–9 — Metadata + balance | (in P1 / P3) | Metadata in the P1 entry; `BALANCE_NOTES.md` (vs Homelander/Superman/Spider-Man + why-not-broken). |

## Input mapping (engine held-direction system — motionInput.js is Naruto-only; same convention as Goku/Homelander)
Neutral+Special = Gold Rush · Fwd = Shield Toss · Back = Rifle Shot · Up = Cape Cyclone ·
Down(ground) = SMG Barrage · Down(air) = Diving Kick · Ultimate button = Nuclear Burst ·
Down+Heavy = Armed Mode · Block+Heavy = Gold Brace · Block+Light = Back Roll.
*(The brief's exact motions are documented; they're mapped to the engine's discrete slots. Two brief
details are engine-constrained: Shield Toss hits once on the OUT trip — the engine boomerang's return is
visual-only; Back Roll uses the block-cancel slot since there's no distinct ←←+Special input.)*

## Final checks (P10)
- ✅ Sprite ledger complete — every one of the 58 rows has a home strip; FX/cosmetic rows documented.
- ✅ Energy economy balanced — one pool (regen + in-combat gains), ult needs full meter + 90f lockout.
- ✅ **No `Math.random` / `gameRng`** anywhere in the kit — all randomness is `hash(seed,frame,playerIndex)` (SMG spread, SFX pitch, SFX noise via seeded LCG).
- ✅ All mechanic state in `GAME_STATE` (`_sbArmed*`, `_sbBrace*`, `_sbRollCd`, `_sbSecondWind*` on the fighter); render-only FX (nuke flash/shake) are OUT of state.
- ✅ `test:determinism` 14/0 · `test:roster-integrity` green · `test:combo-standard` 226/9 (unchanged baseline — gogeta/goku_rose/homelander/… pre-existing, not Soldier Boy).
- ✅ Render check 12/0 (boot → pick → match → both fighters + HUD render, no crash / black screen); kit-live 9/0.
- ✅ Soldier Boy unit suite: energy 8 · armed 22 · kit 28 · combo 11 · defense 20 · sound 13 — all 0-fail.
- ✅ **Frame-data diff ZERO for every other character** — all engine edits are `rosterKey === "soldier_boy"`-gated; my commits never touched any other character's `basic_attacks`; determinism (goku/naruto) is byte-identical.

### Note on `test:up-attack-roster` (77/2)
The two failures are **`superman`** (5/4/10 vs expected 5/4/12) and **`ghostface`** (4/3/6 vs 5/3/8) —
NOT Soldier Boy (he passes). These come from the concurrent **Superman** session's live rebuild and a
stale ghostface expectation; verified that none of the Soldier Boy commits modify superman/ghostface data.

## Tooling (concurrency)
The branch was shared with a LIVE Superman session committing to the same engine files (HEAD moved every
few minutes). Every Soldier Boy commit was built via a **private git index** (`soldier_boy_work/sb_apply.py`):
HEAD tree + only-my-hunks, 0 foreign content, `update-ref` guarded on the old HEAD with retry. Large
blocks are `@@BLOCK@@` inserts keyed on a stable sentinel (guaranteed to appear exactly once — self-healing
dedup), and every generated `.js` is import-validated before commit (node `--check`'s exit code proved
unreliable; a mid-build it let a block-duplication through in P5, caught and repaired in P6).
