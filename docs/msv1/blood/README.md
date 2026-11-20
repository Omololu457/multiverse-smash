# MSV1-BLOOD — progressive damage blood

Blood is part of normal damage: the more health a fighter has lost **over the whole match** (all rounds added up), the more shows on the body,
and from Tier 3 it drips to the floor. Render-only, deterministic, drawn in sprite pixel space.

| health lost (match total) | tier | what shows |
|---|---|---|
| 0–15 % | — | nothing |
| 15–35 % | T1 | split lip / nose trickle + small scrape |
| 35–60 % | T2 | brow cut running down the face + first torso stain |
| 60–85 % | T3 | arm / torso wounds, steady trickles, drips fall |
| 85 %+ | T4 | heavy continuous drips, pooling when standing still |

Every landed (unblocked) hit also opens or grows a wound where it landed: **slash** = line cut + streak, **blunt**
(and haki / anything else) = nose / mouth / brow bleeding + bruised pixels, **pierce / projectile** = puncture +
trickle, **energy** = scorch, little blood, **grab** = nothing. Heavy hits (≥ roster p75 damage, 88) and ultimates
throw a short capped spray in the hit direction (Full only); light hits never spray.

## Fluids

| fluid | who | look |
|---|---|---|
| blood | humans and most fighters (84 + 6 young) | #8f1a14 / #7a0f0f fresh, #5a0a0a deep, 1 px #a3241c highlight, darkens toward #4a0c08 over ~6 s |
| alien | Vilgax: **green** (Ben 10 canon; documented assumption) — Ben's Goop / Wildvine forms green; unknown aliens dark red | |
| oil + sparks | Genos, Krybot, Cyborg, Ben's Upgrade form | warm dark oil with sheen, sparks shed at T2+ |
| ranger | all 17 Ranger fighters (MMPR, SPD, Samurai, Ninja Storm …) | helmets never bleed, suit tears + short dark stains on torso / arms only, ~half amount, no drips / spray |
| crack:edo | Madara (Edo Tensei), Tobirama's reanimated vessel while Edo Tensei is active, Edo / reanimation skins | dry cracks + pale flaking edges, flakes drift down, no blood |
| crack:crystal / magma | Ben's Diamondhead / Chromastone, Heatblast | cracks only |
| sand | Gaara | crumbling sand grains, settle on the floor |
| none | Ben's Alien X / Megawhatt (pure energy) | nothing |

Young fighters (ben10, albedo, saiki, nezuko, dash_parr, violet — the brutality child rule) are capped at **T2**, with
no spray and no pools.

## Match rules
Round start: floor cleared, but the body keeps **every** wound, and the health lost that round is added to the
match total, so each round starts as bloody as the last one ended and gets worse. Repeat hits on the same spot
deepen that wound. Healing washes away only the current round's part. Transformations keep wounds by region (fluid follows the current form). Blood draws over any skin, under
effects (auras / Susanoo / armour overlays draw after the body). Floor: drips splat, T4 standing still builds a pool,
walking through it leaves faint smeared steps, decals darken then fade after ~20 s, hard cap 64 (oldest goes; a pool
still being fed stays newest), cleared at round start, water stages swallow drops.

## Settings
Settings → **Blood: FULL / LOW / OFF** (default Full, saved as `ms_blood_level`). Low = tiers capped at 2, no pools,
no spray. Gameplay is identical in all three (sim hash test). The old "Battle Damage" box is now **Marks** (scuffs /
scorch / frost); the old brutality-adjacent gore toggle is labelled **Gore FX**.

## Determinism
All blood state lives in battleBlood.js, keyed by player slot — nothing is written to GAME_STATE or the fighters.
Inputs: the sim's hit sparks (frame, position, damage, move → damageType, attacker, victim) and fighter health /
position; hash = match seed + match-relative frame + slot + wound slot. No Math.random. Same seed → same digest
(`__harness.juice.bloodDigest()`), so both LAN screens, the companion screen and replays show the same blood.

## Files / re-running
- `battleBlood.js` (runtime; re-exported by battleDamage.js), hooks in game.js / sprite.js (tagged MSV1-BLOOD).
- `data/bloodmaps/<id>.json` — per character: frames (body-mask-derived eye box, 12 anchors with shade, 12
  precomputed down-running trickle paths), frame index per sheet strip, byAction fallback, `overrides`.
- `node tools/bloodmap/enumerate.mjs` (writes tools/bloodmap/defs.json, not committed) → `python3 tools/bloodmap/build.py
  --jobs 8 [--only a,b]` → `node harness/blood_sheets.mjs [all|a,b]` → `python3 tools/bloodmap/ledger.py tools/bloodmap/fluids.json`.
- Hand fixes: `python3 tools/bloodmap/set_override.py <id> '<json>' [action|sheet|*]` — keys: skip, upright, lying,
  headEnd, noFace, headSkip, drop, move, set, face, headTop, neck, hip, excludeGold.
- Tests: `harness/blood.test.mjs`, `harness/blood_framedata_diff.mjs <base> <head>`, `harness/blood_coverage.mjs`,
  `harness/blood_perf.mjs`, `harness/blood_shots.mjs` + `tools/bloodmap/crop_shots.py`.
