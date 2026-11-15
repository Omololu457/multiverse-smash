# Elastigirl — build report

**Elastigirl (Helen Parr)** · `elastigirl` · universe The Incredibles (with Syndrome, Frozone, Mr. Incredible) · double jump · Footsies / Grappler · difficulty 3 / 5

## Phases (one commit each, branch `feat/elastigirl`)

| Phase | Commit | Scope |
|---|---|---|
| P1 | `90c76a0f0` | Sprite-sheet extraction (exact teal key), ledger, contact sheet, roster entry |
| P2 | `a08b6c69b` | Base stats and Elasticity energy |
| P3 | `ccad30011` | Slingshot (pendulum), Rubber Body, simulation module, engine hooks, GAME_STATE snapshot |
| P4 | `53435bba9` | Normals, motion-input specials, Family Raft ultimate |
| P5 | `ffa38a889` | Four combo routes verified with real key inputs |
| P6 | `c4d672ae4` | Stretch Guard parry, Bounce Back i-frames, guarded-string guard hold |
| P7 | `4d1e785a8` | Precomputed skins: Supersuit, Elastigirl 2, Retro |
| P8 | `265b3b5e6` | Synthesized WebAudio sounds with ±3 % hash-varied pitch |
| P9 | `d2a9d7515` | Metadata, tagline, bio, `BALANCE_NOTES.md` |
| P10 | this commit | Final audit, render screenshots, this report |

## Final checks

| Gate | Result |
|---|---|
| `harness/elastigirl.test.mjs` (P2–P9) | **106 passed, 0 failed** |
| Determinism | 14 / 0 |
| Combo-standard | **231 / 9, same as main**: the same 9 checks fail; only the roster count text changes (140 → 141) |
| Roster integrity | ✅ |
| Frame-data diff, every other character | **zero** (1546 blocks) |
| Render check, skins 0 / 1 / 2 | 10 / 0 each (`render/final_skin{0,1,2}_*.png`) |
| Render check, during the ultimate | 12 / 0 (`render/final_06_ult_raft.png`, `final_07_ult_after.png`) |
| `Math.random` / `gameRng` in Elastigirl code | none |
| Sprite ledger | every frame mapped; reused poses listed under "Inventory vs real sheet" |

### Randomness and state

- **Simulation randomness:** `hash(match seed, frame, player index)`.
- **GAME_STATE:** all simulation state lives in `f._elastigirl` and the Spider-Man pendulum fields, and `elastigirlTest.snapshot()` captures it (P3 test).
- **Render and audio only:** cues, particles, screen shake and sfx seeds are kept out of the snapshot.

### Shared-file changes

- Every hook is gated on `rosterKey === 'elastigirl'` and is inserted by `tools/elastigirl/apply_hooks.py`.
- The only removed lines in shared files are list expressions (`clear…`, `…Locked`, `…RemoteInput`, rosterKey lists). Each was re-emitted with an Elastigirl term appended, so no foreign code was dropped.

## Notes

- **Base commit.** The branch is based on local `main` `7a2b638af` (the Batman rebuild), which is 1 commit ahead of `origin/main`. That Batman commit will appear in the PR diff until main is pushed.
- **`fighters.js`.** The brief names `fighters.js`, but this repo has no such file. The roster lives in `characters.js`, the kits in `kits.js`, sprites in `spritesheets.js` and skins in `skins.js`, and those are the files that were wired.
- **Violet.** Violet is not a roster character. She appears only as a sprite-only passenger in the Family Raft (see `BALANCE_NOTES.md`).
