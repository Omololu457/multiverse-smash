# Spider-Man — Build Report

Branch `feat/spiderman` (off `main` @15d2e151). Commits:
- **Phase 1** `71d526e2` — revive + art + inventory/ledger.
- **Phase 2** `637078b2` — web traversal system.
- **Phase 3 (part A)** `df16fda0` — WEBBED + Catch & Return + voice lines.

All three phases pushed to `origin/feat/spiderman`. Merge with
`git checkout main && git merge --ff-only feat/spiderman`.

## 0. The headline decision — this was a REVIVE, not a greenfield build

A near-complete Spider-Man already existed in the repo (`characters.js const spiderman`,
universe `marvel`; full web-swing/specials/Maximum-Web-ult/command-normal/voice code in
`abilities.js`/`game.js`/`combat.js`/`spidermanVoice.js`; harnesses `spiderman_stage1-4`)
— but it was in `_WIPED_FOR_REDO`, **hidden solely because the sprite art had never been
generated**. The attached Alvin-Earthworm CPS2 sheet is the exact one the prior build was
designed against (its `animationData` comments cite the rows). Per the brief's "take the
conservative option, log it, continue", I **revived the canonical `spiderman`** — generated
the missing art from the sheet via the intact project pipeline, un-wiped it, then extended the
kit toward this brief's richer spec. Building a second Spider-Man would have been wasteful and
confusing. See `docs/spiderman/LEDGER.md` for the full record.

## 1. Universe

Used the **existing `marvel` universe** (accent `#e62429`). No new universe created.

## 2. Wall-cling tier — built **TIER 3 (Ceiling-Hang)**, and why

The engine has **no collidable wall or ceiling surfaces**: the floor is the only collision
surface; horizontal stage bounds (`stageLeft 0 … stageWidth 3200`) are *soft camera clamps,
not geometry*, and the ceiling (`-360`) is a soft ease-zone. A Tier-1 (real wall/ceiling
stick) or Tier-2 (stage-edge cling) would require **faking a surface the engine cannot collide
with**, which the brief explicitly forbids. So Spider-Man fires a web **straight up and hangs**
from it above the fight (`AIR + Back + Special`), for a limited time, then drops or acts out of
it — honest, deterministic, no faked surface. If collidable walls are ever added this upgrades
to Tier-2 cleanly (the crawl art is already sliced).

## 3. Traversal profile values (`SPIDERMAN_TRAVERSAL`, abilities.js)

```
swing: cost 8, maxT 120, grav 1.5, fling 1.18, vmax 28, aheadX 250, upY 250, ceil -330,
       ropeMin 90, gripY 0.30, floorRel 0.55, maxSwings 2, seedVel 0.035, drag 0.999,
       speedMax 30, minPoseHold 3
zip:   cost 10, dur 12, windup 3, speed 30, upBias -5.5, vmax 32
hang:  cost 6, maxT 90, upY 120, dropVY 2
fluid: regenGround 0.9, regenStill 1.9, stillVx 0.6, spendDelay 40
WEBBED: max 3, decay 150, slowPerStack 0.12, slowAt3 0.55
CATCH:  range 170, yTol 95, dmgMul 1.3, spdMul 1.3
```

## 4. What was reused from `flight.js`

- **The data-profile pattern** — `flight.js` drives all motion from a pure `FLIGHT_PROFILES`
  object; `SPIDERMAN_TRAVERSAL` mirrors that so there are no magic constants in the per-frame math.
- **The drag / soft-clamp helpers** — `axisStep` (drag) and `softLimit` (overspeed clamp) are
  module-private in `flight.js`, so they're re-expressed inline: the swing's `_swVel *= drag`
  is the drag term; the in-arc `speedMax` clamp + release `vmax` clamp are the `softLimit` idea.
- **The gravity-yield gate** — `flight.js`'s `_flightCtl && isFlying → gravity no-op` pattern;
  the existing `_swinging` gate was extended to `_zipT`/`_hangT` (physics.js).
- **No-RNG determinism** — like `flight.js`, the traversal uses no `Math.random`/`gameRng`.

## 5. Full move list + frame data

### Normals (`basic_attacks`, characters.js)
| Move | dmg | startup | active | recovery | hitstun | notes |
|------|----:|--------:|-------:|---------:|--------:|-------|
| light | 40 | 4 | 3 | 9 | 12 | punch-combo string (5f) |
| heavy | 72 | 8 | 4 | 18 | 20 | rising spin-kick launcher |
| upAttack | 62 | 7 | 4 | 16 | 20 | launcher (launch 11) |
| airAttack | 52 | 6 | 3 | 11 | 14 | curled aerial spin-kick |
| downAir | 66 | 8 | 4 | 13 | 18 | diving spin spike |
| spiderCombo (Fwd+Heavy) | — | — | — | — | — | 9f multi-hit Jump-Attack command normal; cancels into Web Throw on a clean hit |

Stats: HP 1080, maxEnergy 180 ("Web Fluid"), atk 88, def 80, **speed 96**, jump 32,
double-jump YES, dash 18/12/40, spriteScale 1.1. A fast, frail acrobat.

### Specials
| Input | Move | Effect |
|-------|------|--------|
| neutral Special | **Web Impact** / **Catch & Return** | 50-dmg web puff (applies WEBBED). If an enemy NORMAL projectile is incoming in front → **catches it** and hurls it back at 1.3× (ownership transferred). |
| Fwd + Special | **Web Throw** | 78-dmg full-range spinning web-ball (applies WEBBED) |
| Back + Special (ground) | **Dash Attack** | spin-punch rushdown gap-closer |
| Up + Special (ground) | **Handstand Flip Kick** | anti-air launcher |
| Down + Special (ground) | **Ground Crawl** | low-profile i-frame evade → kick-up exit |
| Up + Special (air) | **Web Swing** | pendulum swing; re-web for ≤2 swings; release = tangent fling |
| Fwd + Special (air) | **Web Zip** | fast straight reposition pull |
| Back + Special (air) | **Ceiling Hang** | fire web up, hang, drop (Tier-3 cling) |
| Ultimate (100) | **Maximum Web** | full-screen web-net cinematic that engulfs + pins the opponent |

### Passive / status
- **WEBBED** (new) — stacks from web hits; 3 stacks → 45% slow + dash disabled; decays (~2.5s).
- **Web Fluid gauge** — swing/zip/hang/specials spend it; refills on the ground, faster when
  still; a spend pauses regen briefly; running dry blocks the web kit until it recovers.

## 6. Test results (all green)

| Harness | Result |
|---------|--------|
| `spiderman_stage1` (render check: registration + all movement/state) | 26/0 |
| `spiderman_stage2` (normals + command + crawl + kick-up) | 22/0 |
| `spiderman_stage3` (5 specials) | 22/0 |
| `spiderman_stage4` (Maximum Web ultimate) | 13/0 |
| `spiderman_webswing` (pendulum arc + fling + auto-release) | 12/0 |
| `spiderman_traversal` (smoothness + determinism) | 6/0 |
| `spiderman_kit` (Catch & Return + WEBBED) | 12/0 |
| `determinism` | 14/0 · `roster-integrity` ✅ · `combo-standard` 225/9 (pre-existing baseline) |

**Traversal smoothness/determinism output:** per-frame maxStep swing 21.6 / zip 26.8 / hang
3.0 px (all ≤ 38 = max traversal speed, no teleport/snap); every traversal pose holds ≥ 3
frames; swing trace bit-identical across 3 runs; same end position on 3 identical runs.

**Frame-data diff ZERO for every other character:** across all three commits, `combat.js` is
untouched; `characters.js` changes are confined to the Spider-Man entry (un-wipe + swing dims +
voiceLines); no other character's `basic_attacks`/`specials` were modified.

## 7. Render-check confirmation

`spiderman_stage1` boots the real game headless, picks Spider-Man, starts a match, exercises
idle/intro/walk/run/dash/jump/fall/win/rolls, confirms both fighters + HUD render, the sprite
gate is satisfied (no fallback box), and there are **0 JS errors**. `spiderman_webswing` /
`spiderman_traversal` drive a real web-swing, re-web, zip, hang, release and land end-to-end.

## 8. Every creative decision (logged)

- Revive the canonical `spiderman` rather than build a duplicate (§0).
- Source background is **#008000**, not the brief's ~#00A000 — keyed on the detected value.
- Reused the existing project slice pipeline (`spiderman_sliced/` + `tools/reslice_spiderman.py`)
  — it already did strip-green + connected-component frame-detect + feet-aligned repack on this
  exact sheet; added the one missing job (`spiderSwing` from row-25).
- Speech bubbles cut as transparent sprites → `spiderman_quips/` (taunt, HEY!, DO YOUR JOB!,
  C'MON PAL!, and the reclaimed "Oh yeah?…dad" bubble). Dinosaur + Venom figure excluded.
- Swing: added an in-arc `speedMax` clamp so the bottom of the arc is smooth, not a blur.
- Wall-cling = Tier-3 ceiling-hang (no faked surface) — reported, with the reasoning (§2).
- WEBBED held in the universal loop (not Spider-Man's own driver) so the victim's per-frame
  logic can't overwrite the slow.
- Catch & Return folded into the neutral Web Impact (context-sensitive, no new input needed).

## 9. What to play-test first

1. **Web Swing feel** — jump, `Up+Special` to swing, release at the bottom (fast/flat) vs late
   (high); chain a second swing to cross the screen; does it feel good, not floaty or teleporty?
2. **Catch & Return** — against a projectile character, throw a `neutral Special` into an
   incoming shot and confirm it flies back and can punish the thrower.
3. **WEBBED pressure** — land 3 web hits and confirm the opponent visibly slows and can't dash.
4. **Web Fluid economy** — spam swings/zips and confirm running dry is a real, recoverable state.

## 10. Status / remaining work (honest)

**Done (Phases 1–3 part A):** art + revive, inventory/ledger/contact sheet/credits, the full
web-traversal system (swing/zip/ceiling-hang/fluid), WEBBED, Catch & Return, voice lines — all
tested and pushed. The existing kit (5 directional specials, Maximum Web ultimate, command
normal, audio quips) is now live.

**Deferred (Phase 4 / beyond), with reconciliation notes:**
- **Spider-Sense** white-flash passive + dodge-evade — ✅ DONE (Phase 4): an incoming attack
  (melee in range, or an incoming projectile; grabs/unblockables excluded) opens a warning
  window with a white-flash + 3 code-drawn head rings (render-only, Reduce-Flashing-aware).
  Tapping the dodge input (buffered) inside it = a true evade — brief invulnerability + the
  next attack within ~20f is a counter hit (×1.3). Harness `spiderman_sense.mjs` 9/0.
- **Web Cocoon** capture state — ✅ DONE (Phase 4): air Down+Special fires a slow web that
  WRAPS the opponent on hit (held ~1.3s, mash-shortened via grabInputBuffer, unravels on its
  own; long cooldown) with a code-drawn web-wrap visual. His setup/mix-up tool, not a combo
  starter. Harness `spiderman_kit2.mjs` 8/0.
- **Quip bubble system** — ✅ DONE (Phase 4): the 5 cut sprites pop above him on events (small
  balloons on catch/counter/evade, big "Does this outfit make me look fat?" on taunt),
  render-only, camera-clamped, fade-on-overlap, with a **"Quip bubbles" ON/OFF setting**
  (`ms_quip_bubbles`, default ON) + Reduce Flashing respected. Harness `spiderman_quips.mjs` 7/0.
  Still open: exposing the toggle in the Settings MENU (the flag + default are wired).
- **HUD Webbed-stacks indicator** — ✅ DONE (Phase 4): web-pips (1 per stack, red at 3) ride
  above the webbed fighter's head so the debuff is readable at a glance. Fighter-anchored rather
  than health-bar-integrated (a deliberate low-risk choice — avoids touching the shared HUD
  layout). The web-fluid bar already renders via the `web_fluid` energyConfig.
- **CPU AI** — ✅ DONE (Phase 4): a Spider-Man signature layer (`decideSpidermanSignatureMove`,
  mirroring Homelander's) makes the CPU use his web kit — web pokes at range (which apply
  WEBBED) and Maximum Web at full meter. Gated to `rosterKey === "spiderman"`, routed through
  the seeded AI RNG (deterministic). Verified via AI-vs-AI (`spiderman_ai.mjs` 6/0): web
  projectiles appear, the opponent gets WEBBED, same seed → identical, different seed → differs.
  Fuller behaviors (swing-to-approach, zip-escape-corner) are a future refinement.
- Dedicated **Web Swing Kick** / **Spider Sting** — ✅ DONE (Phase 4): Web Swing Kick =
  attacking out of a swing releases it into a committed kick that keeps the arc's momentum;
  Spider Sting = Up+Special (Handstand) now grants brief reversal i-frames (10f) + higher
  recovery. Harness `spiderman_kit2.mjs` 8/0.
- **Training** toggles — ✅ DONE (Phase 4): **infinite web fluid** is the existing F3
  infinite-resources toggle (web_fluid *is* his energy, so it's pinned to max); **dummy
  projectile spammer** = a new `"projectiles"` dummy behavior (F4) that fires bolts at the
  player to drill Catch & Return / Spider-Sense; **spider-sense display** — the warning flash +
  head rings already render whenever the passive detects a threat (visible in training). Harness
  `spiderman_training.mjs` 4/0.
- **"Quip bubbles" setting** — ✅ the setting itself is done (persisted `ms_quip_bubbles`,
  default ON, respected by the render). The only remaining gap is surfacing a toggle on the
  on-screen Settings *menu* page (hand-drawn UI; deferred as cosmetic).

## ⚠️ Concurrency note (important for the merge)

Throughout Phases 2–3 a **concurrent "Homelander audio" session** shared this checkout and was
editing `abilities.js`/`game.js`/`sound.js`/`combat.js`, created a `feat/homelander-audio`
branch off my Phase-1 commit, and at one point reset `feat/spiderman`. Every Spider-Man commit
was therefore built via a **private git index** (base = the branch tip + only my hunks), so
**none of the Homelander-audio changes are in any Spider-Man commit** (verified: 0 foreign
markers in the committed `abilities.js`/`game.js`). `feat/spiderman` was re-secured and pushed
after each phase. The dirty `naruto_seventh_kcm_jump_uniform.png` (the user's pre-existing
exception) was never staged or modified — confirmed MD5 `a676b507a8ac5f01aee1d86376fde26b`.
