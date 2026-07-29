# BEN 10 — ASSET MAP (Stage 0)

Grounded inventory of the on-disk Ben 10 sprite art and how each sheet maps onto
moves/states. Written by measuring the actual PNGs (`sips` dimensions + visual
frame counts), not from memory. Frame counts marked `≈` are visual estimates to
be **confirmed at slice time** in Stage 1.

> This file did not exist when the Ben 10 build brief was written (the brief cited
> it ~15×). It is authored now as Stage 0 so the rest of the build has a real
> reference. Where the brief's assumptions conflicted with the code, the
> resolution is recorded below under **Model decision**.

---

## Model decision (CONFIRMED with user, 2026-07-28)

**Ben 10 stays ONE selectable fighter that TRANSFORMS between aliens (Omnitrix).**
NOT three separate character-select entries.

Why this is the correct model (evidence in code, overriding the brief's
"three separate entries" phrasing):

- `characters.js` exposes exactly two Ben-universe entries: `ben10` and `albedo`
  (the clone). Both are single fighters.
- The Omnitrix system is fully wired and live: `fighters.js` holds the real
  `BEN10_ALIEN_POOL` (33 aliens) + `setupBen10/applyAlien/switchAlien/drawBen10`;
  `physics.js` auto-runs `setupBen10` on frame 1; `game.js` binds the transform
  keys (`switchAlien`) and builds the alien-loadout sub-screen
  (`getAlienPoolList` ← `BEN10_ALIEN_POOL`); `player.js` looks the pool up.
- `roster.js` `ben10` entry: `isBen10: true`, "transforms between 5 aliens in-match".

So the 33 aliens are an **in-match transform loadout pool**, NOT character-select
roster rows. There was never anything to "prune" from character-select / AI-fill /
Tower Mode — those iterate the `characters` object (only `ben10` + `albedo`).

> NOTE: `ben10.js` (repo root) is an **orphaned duplicate** of the pool — imported
> by nothing. The LIVE copy is in `fighters.js`. Do not edit `ben10.js` expecting
> in-game effect. (Cleanup of the orphan is tracked under Open questions.)

### What "the 3 with real art" means under this model

| Real art set        | Maps to                                             |
|---------------------|-----------------------------------------------------|
| Ben (human)         | The **untransformed** fighter (base appearance, pre/post-transform). `drawBen10` already branches on `fighter.transformed`. |
| XLR8                | The existing pool alien **`xlr8`** (transformed form). |
| Diamondhead         | The existing pool alien **`diamondhead`** (transformed form). |

The other ~30 aliens have no art and render via `drawBen10`'s procedural fallback.
See **Step 5** for the loadout-pool reconciliation (default loadout + hiding the
art-less aliens WITHOUT breaking `DEFAULT_OMNITRIX` / `createOmnitrixState`).

---

## Source master sheet

- `the_ben_10_classic_jus_sprite_sheet_project_by_goobtubes_dff7tes.png` — 2352×3032, the JUS master sheet (all forms).
- `ben10_transparent.png` / `ben10_transparent copy.png` — 2352×3032, transparent-bg copies of the master.

The individual strips below were already extracted from the master and are the
files we wire. Filenames preserved EXACTLY as on disk.

---

## FORM 1 — Ben Tennyson (human / untransformed)

Slim teen brawler, no powers. This is the fighter's default look and the weakest
form (baseline stats).

| File (exact) | Dims | ≈Frames | Content → proposed action |
|---|---|---|---|
| `ben10_idle.png` | 253×52 | ≈8 | Stepping idle cycle → **idle** |
| `ben10_run.png` | 254×51 | ≈6 | Run cycle → **run / walk / dash** |
| `ben10_jump.png` | 39×54 | 1 | Single jump pose → **jump / fall** |
| `ben10_jab.png` | 109×53 | ≈3 | Punch string → **light** (+ chain candidate) |
| `ben10_up_attack.png` | 118×65 | ≈3 | Rising strike → **up** |
| `ben10_down_air_attack.png` | 129×65 | ≈3 | Falling kick/dive → **down_air** |
| `ben10_taunt.png` | 224×58 | ≈3–6 (needs slice) | Left = taunt poses; right = overlapping cluster (victory?/multi). FLAG: hand-slice; candidate **taunt** + maybe **win**. |
| `ben10_hoverboard.png` | 225×71 | ≈4 | Ben riding hoverboard → mobility option (dash/air-mobility special candidate) |
| `ben10_tranformatin_to_alien.png` | 931×60 | ≈15–16 | Omnitrix raise → green flash → alien silhouette (ends green). **Transform cinematic / Ultimate visual** (see Step 3). |

Missing for Ben-human: dedicated guard/hurt/knockdown. **Fallback plan:** reuse
idle frame for guard, and route hurt/knockdown through the engine's generic
procedural path (Beerus/Omega precedent) until dedicated art is sourced. FLAG.

Heavy normal: no dedicated `ben10_heavy` strip. Candidate: reuse `ben10_up_attack`
or a later frame of `ben10_jab`, OR leave heavy on the jab sheet with a longer
window. FLAG for Stage 2.

---

## FORM 2 — XLR8 (speed rushdown)

Blue Kineceleran velociraptor. Extreme-speed archetype (comparable to Killua /
Flash). Existing pool stats: `hp 900, spd 10, jumps 3, dmg 0.75`.

| File (exact) | Dims | ≈Frames | Content → proposed action |
|---|---|---|---|
| `ben10_xlr8_idle.png` | 273×43 | ≈5 | Idle → **idle** |
| `ben10_xlr8_run.png` | 221×43 | ≈4 + blur | Run poses + trailing motion-blur cell → **run / dash** (blur cell = dash) |
| `ben10_xlr8_jump.png` | 203×55 | ≈4 | Jump arc → **jump / fall** |
| `ben10_xlr8_front_attack.png` | 227×39 | ≈5 | Forward claw slash → **light / heavy** |
| `ben10_xlr8_up_attack.png` | 307×50 | ≈5 + blur | Rising slash + dash-blur cell → **up** (blur = launcher travel) |
| `ben10_xlr8_combo.png` | 497×48 | ≈11 | Multi-hit spinning slash string → **combo special** (the mandated combo-extension tool) |
| `ben10_xlr8_transformation.png` | 224×53 | ≈4–5 | Ben→XLR8 morph-in → plays on transform INTO XLR8 |

Missing for XLR8: guard/hurt/down_air. Fallback: idle-for-guard + procedural
hurt. FLAG.

**Special priorities (Step 4):** speed-blur dash-strike (Dash Strike, already in
pool data) + the `xlr8_combo` sheet as a genuine combo string.

---

## FORM 3 — Diamondhead (tanky zoner / crystal ranged)

Green Petrosapien crystalline humanoid. Durable + ranged crystal options.
Existing pool stats: `hp 1100, spd 6, dmg 1.0, weight heavy`.

| File (exact) | Dims | ≈Frames | Content → proposed action |
|---|---|---|---|
| `ben10_diamond_head_idle.png` | 201×72 | ≈4 | Idle → **idle** |
| `ben10_diamond_head_run.png` | 267×73 | ≈5 | Run cycle → **run / walk / dash** |
| `ben10_diamond_head_jump.png` | 206×75 | ≈4 | Jump arc → **jump / fall** |
| `ben10_diamond_head_foward_attack.png` | 343×77 | ≈5 | Crystal-blade forward swing → **light / heavy / chain** |
| `ben10_diamond_head_shooting.png` | 189×68 | ≈3 | Fires crystal shards forward → **Shard Barrage special** (projectile, cast pose) |
| `ben10_diamond_head_rising_diamonds_part_1.png` | 222×73 | ≈3 | Windup / arm-plant for the ground-spike move → cast setup |
| `ben10_diamond_head_rising_diamonds.png` | 144×84 | ≈3 | Crystal spikes ERUPT from ground → **Rising Diamonds special** (independent-collision spikes) |

Missing for Diamondhead: guard/hurt/down_air/up-normal. Fallback: idle-for-guard
+ procedural hurt; up-normal can reuse the forward-attack sheet. FLAG.

---

## STEP 2 — Projectiles / independent collision

Diamondhead is the projectile form. Two distinct independent-collision effects:

1. **Shard Barrage** — `ben10_diamond_head_shooting.png` is the CAST pose; the
   shards are a separate travelling projectile (`projectileId: "diamond_shard"`,
   already declared in pool data). Needs a projectile entry + shard sprite/proc
   draw. This is a straight ranged poke/zoning tool.
2. **Rising Diamonds** — `rising_diamonds_part_1` (windup) → `rising_diamonds`
   (eruption). Ground-anchored crystal spikes with their OWN hitbox at a forward
   offset (not a body hitbox). Reads as a combo-extender / anti-approach. Model
   on the existing ground-spike/independent-hitbox precedent (e.g. Minato/Netero
   spawned-FX hitboxes), NOT a travelling projectile.

XLR8: no projectiles — all melee/dash. Ben-human: no projectiles.

---

## STEP 3 — Ultimate candidates

Per-form ultimate already exists as HUD/kit data in the pool
(`xlr8 → Sonic Blitz`, `diamondhead → Crystal Storm`). Under the transform model
the fighter's ultimate resolves to the ACTIVE alien's ultimate (see
`ben10` char entry: "Omnitrix Overload → active alien's ultimate").

- **Ben-human Ultimate → OMNITRIX TRANSFORM.** `ben10_tranformatin_to_alien.png`
  (931×60, ends on a glowing green alien) is tailor-made for a dramatic
  full-power Omnitrix-activation freeze-cinematic — reuse the proven
  freeze-cinematic architecture (minatoKurama / beerusKiBall / gonAdultForm
  precedent). This doubles as the visual when Ben transforms into an alien.
- **XLR8 Ultimate → Sonic Blitz.** Reuse `ben10_xlr8_combo.png` (11-frame flurry)
  as a rush-barrage ultimate, or a full-screen dash. Combo sheet supports it.
- **Diamondhead Ultimate → Crystal Storm.** Escalated Rising Diamonds — multiple
  eruptions / a crystal field. Reuse `rising_diamonds` scaled up + `shooting`.

---

## STEP 4 — Specials / combo content (equal-treatment mandate)

Each form gets ≥2 specials incl. one genuine combo tool. Existing pool data
already names one special per alien; art dictates the rest.

- **Ben (human):** weakest form. Candidates: a hoverboard dash (`hoverboard`
  sheet) as a mobility/approach special; a jab-string extension as a combo poke.
  (Ben has the least combat art — flag as the most likely to need a reserved/
  procedural special.)
- **XLR8:** (1) Dash Strike — speed-blur dash-strike (pool data + run-blur cell).
  (2) **XLR8 Combo** — the `xlr8_combo` 11-frame string as a cancelable combo
  special (the mandated combo-extension tool).
- **Diamondhead:** (1) Shard Barrage (projectile, Step 2). (2) Rising Diamonds
  (independent-collision spikes, Step 2 — reads as a combo-extender/juggle).

---

## STEP 5 — Roster reconciliation & loadout-pool prune

Under the transform model there is nothing to remove from character-select. The
"prune the art-less aliens" intent maps to the **Omnitrix loadout sub-screen**
(`getAlienPoolList`). Plan (Stage 1+, pending confirmation):

- **Default loadout** (`DEFAULT_OMNITRIX`) should lead with the 3 art-backed
  forms so a fresh player sees real sprites. Current default is
  `["fourarms","xlr8","heatblast","diamondhead","cannonbolt"]` — of these only
  `xlr8`/`diamondhead` have art. Proposed: keep `xlr8`, `diamondhead` up front.
- **Hiding vs deleting the ~30 art-less aliens:** DO NOT delete pool keys —
  `createOmnitrixState` fills to 5 from `DEFAULT_OMNITRIX`, and deleting
  `fourarms`/`heatblast`/`cannonbolt` would break the default fill and any saved
  loadouts. Instead add a `hasArt`/`hidden` flag on pool entries and filter the
  **loadout picker** to art-backed aliens, keeping the rest as valid procedural
  fallback data. This is reversible as art is added later.
- This preserves the brief's real intent ("clean up what has no art yet, not a
  permanent roster decision") without the breakage the literal delete would cause.

FLAG: confirm this loadout approach before implementing (it's a design choice,
not a pure art task).

---

## Open questions / gaps / deferred

- **`ben10.js` orphan** — root-level duplicate of the pool, imported by nothing.
  Recommend deletion (or a one-line "moved to fighters.js" stub) so it can't
  mislead future edits. Confirm before removing.
- **Ben-human is combat-light** — no dedicated heavy/guard/hurt/down_air. Will
  lean on fallbacks; flagged as the form most at risk of under-building vs the
  equal-treatment mandate.
- **`ben10_taunt.png` right cluster** — unclear if taunt-only or taunt+win;
  resolve by slicing.
- **Albedo** — shares the Omnitrix pool; inherits the same art automatically via
  `drawBen10`. No separate art on disk. Out of scope for this build.
- **Guard/hurt/knockdown art** — absent for all 3; procedural/idle fallback until
  sourced.
- **Precise frame counts** — every `≈` above is confirmed at Stage-1 slice time
  (alpha-gutter / uniform-reslice tooling), not trusted blind.
