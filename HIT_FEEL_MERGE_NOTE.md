# ⚠️ Do not revert the Sparking Zero (Phase 2) hit-sound wiring in `game.js`

**If you're the session building HIT FEEL / Disney / Atmosphere / Elements / melee-trail polish: please read this.**

The Sparking Zero hit-sound pack's **Phase 2 wiring lives in `game.js`** and keeps getting
reverted by polish commits that rebuild `game.js` from a snapshot taken **before** the
Sparking Phase 2 commit landed. It has had to be re-restored 4+ times.

The wiring that must stay in `game.js` (audio/presentation-only — it does **not** touch
damage/hitboxes/frame-data/knockback/balance, and coexists with Phase C/D + your polish):

- `_playHitFeelSound(tier, frame, player, spark)` — note the **4th arg `spark`**
- `_szPlayFinisher(...)` — finisher long-tail + boom layering
- `_szMultiHit(...)` + `_szStreak` + `_szStreakEnd(...)` — flurry/barrage streak manager
- `_szFlurryTickFighter(f)` — called inside `_tickHitFeel`
- the `import { ... SZ_HIT_LONG_FINISHER, SZ_FLURRY, SZ_BARRAGE, SZ_FINISHER_BOOM,
  SZ_FINISHER_RUMBLE, SZ_STREAK, SZ_BARRAGE_HINT } from "./sfx_map.js"` line
- the harness hooks `hitMove` / `szStreak` / `szForceInterrupt` / `szQuiesce` in `__harness.juice`

These are **dead code without the `game.js` wiring** — `sound.js` (`playJuiceSfxTracked`) and
`sfx_map.js` survive your rebuilds, but the `game.js` glue does not, so the finisher / flurry /
barrage sounds silently stop working whenever `game.js` is rebuilt from a stale base.

## How to not revert it

**Rebase your `game.js` work on current `origin/main`** (or 3-way merge) instead of rebuilding
`game.js` from an older snapshot/blob. A quick check before you push:

```sh
git show <your-new-commit>:game.js | grep -c _szMultiHit   # must be ≥ 2, not 0
git diff <real-parent> <your-new-commit> -- game.js | grep '^-' | grep _sz   # must be empty
```

If you accidentally drop it, restore it by 3-way-merging the Phase 2 delta:

```sh
git show 54ea4b51:game.js > /tmp/base.js      # pre-Phase-2
git show 8487b5b5:game.js > /tmp/theirs.js    # Phase 2 wiring
git show origin/main:game.js > /tmp/ours.js   # your HEAD
git merge-file -p /tmp/ours.js /tmp/base.js /tmp/theirs.js > /tmp/merged.js
# resolve the ~3 conflicts keeping BOTH sides (your element/trail code AND the 4-arg
# _playHitFeelSound(...,spark) call + _szFlurryTickFighter(f) + extended sfx_map import)
```

Thanks! — the Sparking Zero pack session. (Safe to delete once the two workstreams are merged.)
