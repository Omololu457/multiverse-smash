# Violet Parr (`violet`) — build report

Violet Parr is a new roster fighter in the **Pixar** universe. She is a Zoner / Trickster at difficulty 3, with the tagline "Now you see me."

Before starting, the roster had no `violet` entry, so this is a new build, not an extension of an earlier one.

**Art.** All art comes from the supplied sheet "Game Boy Advance - The Incredibles - Playable Characters - Violet.png".
- It was ripped by redblueyellow; the on-sheet caption reads "No credit needed", and it is credited anyway.
- The sheet is preserved byte-identical as `assets/sprites/violet.png`.
- No art was invented.

## Phases (one commit each, branch `feat/violet`)

| # | Commit | What |
|---|---|---|
| 1 | `a98713d7` | Sprite sheet, cut, contact sheet, sprite ledger, roster registration |
| 2 | `0adf3a2d` | Base stats and the Force Field energy economy |
| 3 | `3d654395` | VANISH |
| 4 | `953df410` | Full moveset |
| 5 | `eb0dd39e` | Combo routes |
| 6 | `d5eba1a8` | Defense |
| 7 | `43d87456` | Skins |
| 8 | `4ce2f26e` | WebAudio sound |
| 9 | `3d062de2` | Metadata, Move List, balance notes, Pixar universe |
| 10 | this commit | Final audit (below), block ring, `harness/violet_all.mjs`, this report |

### Phase 1 — sheet and registration
- The exact teal (0,128,128) is keyed at zero tolerance, and the caption is excluded.
- The sheet is cut into 106 frames using connected components. Each ring is kept as one component.
- Contact sheet: `docs/violet/contact_sheet.png`. Ledger: `docs/violet/SPRITE_LEDGER.md`.
- Registered in characters, spritesheets, skins, fighters, credits and game. abilities.js was hooked in Phase 2.

### Phase 2 — stats and Force Field
- Health 900, walk 5.4 px/f, run 8.0 px/f, jump, weight 0.8.
- Force Field: maximum 100, recharges 5 per second, +4 when her hit lands, +3 when she takes a hit.

### Phase 3 — VANISH
- Input ↓↓+Special. Cost 15, drains 6 per second, lasts at most 6 s, 8 s cooldown.
- Drawn at 35% alpha on R7, R9 and R11.
- The opponent does not auto-turn toward her while she is invisible.
- Her first hit out of Vanish deals +20%, then the R12 reappear plays.

### Phase 4 — moveset
- Normals: Jab, Heavy, Low, Launcher and Air.
- Specials: Force Push, Bubble Shield, Force Ball, Field Trap and FULL FORCE.
- Motion inputs and cancels.

### Phase 5 — combo routes
- Four routes, all measured through real input.
- Fixes found while testing: the cancel buffer now pauses during hitstop, and the Launcher jump-cancel is a hop.

### Phase 6 — defense
- Bubble Shield has a 6 s cooldown.
- Phase Step has i-frames on frames 3–12 and a 5 s cooldown.
- Protective Instinct: once per round below 20% health, the next hit triggers a free dome.
- Fix: body-less moves no longer get a strike box, so they cannot clash.

### Phase 7 — skins
- Supersuit (default), Incredibles 2 and Midnight.
- Palette swaps are precomputed. The invisible frames and the force-field FX are tinted to match each skin.

### Phase 8 — sound
- Every brief recipe is implemented.
- Pitch varies ±3% using the hash, and noise is seeded from the hash.

### Phase 9 — metadata and balance
- Roster metadata and a Move List kit.
- `BALANCE_NOTES.md` covers vs Spider-Man, vs Homelander and vs Ghostface, and why she is not broken.

## Final checks

### Ledger
Every one of the 106 sheet frames maps to an animation or an FX use. `tools/violet/extract.py` asserts this.
- Block = R6 f1 held, plus the R13 f3 ring.
- The block ring is drawn by `violetFx.js` as of Phase 10. Phase 1 already claimed it in the ledger, but it was not drawn until now.

### No `Math.random` and no `gameRng`
- A grep finds neither in any `violet*.js` file, harness or tool.
- `violet_determinism.mjs` traps `Math.random` calls whose stack contains a violet module, and finds none.
- Simulation variation and sound pitch and noise come only from `vhash(match seed, round tick, player index)`.

### All state lives in GAME_STATE
- `f._violet` holds energy bookkeeping, run, Vanish, cooldowns, payloads (push ring, trap, ultimate), Instinct, cue serials and input edges and tokens. It is plain JSON and is snapshotted. `currentAttack.vi` is snapshotted alongside it.
- Trapped and held foes are moved through their own fighter fields.
- Alpha, flashes, jitter, rings and sound are render-only. They read sim state and never write it. Sound tracks the last cue serial per state object rather than draining the queue.

### Determinism
- `violet_determinism.mjs` passes 5/0. Two fresh loads with the same seed and the same input script give identical state at every checkpoint.
- The script covers every Violet system: Vanish, all five specials through their real motions, and the ultimate.

### Shared regression tests

| Test | Result |
|---|---|
| Determinism (Stage 11A) | 14 / 0 |
| Combo-standard audit | 231 / 9 |
| Roster integrity | Passes |

The combo-standard result is **unchanged versus main's baseline**. The 9 failures are byte-for-byte the same list as on main at the branch point `7a2b638a`, and Violet adds none.

### Frame-data diff
Zero for every other character across 1546 blocks. This includes the zoro, luffy, buggy, sanji, arlong and batman tables.

### Render checks
Each check runs through the real menus: boot → Play → VS → Easy → Pixar → Violet → skin → CPU → stage → match. It confirms:
- both fighters render
- the HUD is drawn
- there is no black screen, page error or missing asset

| Skin | Visible | Invisible |
|---|---|---|
| default | 15 / 0 | 16 / 0 |
| `vi_inc2` | 15 / 0 | 16 / 0 |
| `vi_midnight` | 15 / 0 | 16 / 0 |

Screenshots are in `docs/violet/render_*.png`.

### Violet's own tests

| Test | Result |
|---|---|
| stats | 11 / 0 |
| vanish | 18 / 0 |
| moveset | 42 / 0 |
| combos | 17 / 0 |
| defense | 16 / 0 |
| skins | 13 / 0 |
| sound | 15 / 0 |
| metadata | 11 / 0 |
| determinism | 5 / 0 |

Run them all with `node harness/violet_all.mjs`.

## Measured numbers

### Normals
Startup N means the hit lands on frame N, counting the press frame as frame 1.

| Move | Startup | Damage | On block |
|---|---|---|---|
| Jab | 5f | 18 | 0 |
| Heavy | 13f | 52 | −6 |
| Low | 7f | 24 | −4 |
| Launcher | 11f | 46 | −9 |
| Air | 7f | 30 | +2 |

### Specials

| Move | Cost | Behaviour |
|---|---|---|
| Force Push | 12 | Travels 520 px, deals 50 with push-back |
| Bubble Shield | 20 | Dome for 40f, reflects at 1.2×, 10f recovery |
| Force Ball | 15 | Travels 320 px, two hits (30 + 25 scaled) |
| Field Trap | 22 | Forms 18f after the cast and holds 45f |
| FULL FORCE | 100 | 30 + 40 + 150 = 220, then a 90f lockout |

### Combos (85% scaling per hit)

| Route | Damage | Brief |
|---|---|---|
| Jab, Jab, Launcher, Air | 18 + 15 + 33 + 18 = **84** | ≈ 93 (−10%) |
| Low, Heavy, Force Push | 24 + 44 + 36 = **104** | ≈ 106 |
| Field Trap, Heavy, Launcher, Force Ball | 52 + 39 + 21 + 18 = **130** | ≈ 124 |
| Vanish, Heavy, Force Push | 62 + 42 = **104** | Bonus once, Vanish ends |

## Deviations and notes

### Universe
Violet is in the shared `pixar` group, the same one Elastigirl created on local `main`, and it displays as "Pixar".
- Phase 1 first used `the_incredibles` to match other uncommitted Incredibles work in the worktree. Phase 9 moved her to `pixar` once that group existed in a commit.
- Her `UNIVERSE_ACCENT` line is byte-identical to Elastigirl's, in the same position, so it should merge cleanly.

### Unit mappings

| Brief | Engine | Why |
|---|---|---|
| walk 5.4 | speed stat 81.6 | The physics formula gives exactly 5.4 |
| run 8.0 | 92 | A dash with forward held becomes a run |
| jumpForce 12 | jumpPower 29 | The engine uses a ×2.4 larger jump unit |
| weight 0.8 | knockback she takes ÷ 0.8 | The engine has no weight field |

### Input names
- **P** means Special.
- **Phase Step** is ←← + Light, exactly as the brief says.
- **Special alone** fires Force Push as a fallback.

### Bubble Shield coverage
It stops melee strikes (not grabs) and projectiles in the shared projectile list. It does **not** stop damage that skips those paths, such as Homelander's hitscan Heat Vision. `BALANCE_NOTES.md` states this.

### Protective Instinct
The free dome catches the hit that triggers it. The brief's "triggers on the next hit" was read as the dome popping up in time to catch that hit.

### The PR also contains the Batman rebuild
`feat/violet` branched from local `main` at `7a2b638a`, the Batman rebuild. That commit was not on `origin/main`, so a PR against `origin/main` also shows the Batman commit.

### Elastigirl on local main
Another session committed Elastigirl phases 1–10 onto local `main` after this branch was cut. Local `main` is now `7df874f3`, still unpushed.
- Violet's regression baselines are pinned to the branch point `7a2b638a`.
- Against `origin/main`, this branch has no conflicts; `origin/main` is an ancestor of the branch.
- Against local `main` (with Elastigirl), a `git merge-tree` preview shows textual conflicts in six files: characters.js, combat.js, credits.js, game.js, kits.js and skins.js.
- All six come from the two builds inserting their own registration lines after the same Batman anchor lines. They are adjacent additions with no semantic overlap, so resolve them by keeping both sides.

### Workflow
- The dirty main worktree was never touched.
- Work happened in a clean `git archive` workspace, and every commit was built through a private index from explicit paths only.
- `tools/violet/apply_hooks.py --phase N` reproduces every shared-file hook. It is idempotent, and was verified byte-identical against a fresh `git archive` of the base.
