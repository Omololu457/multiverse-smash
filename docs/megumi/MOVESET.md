# Megumi Fushiguro: moveset and frame data

| | |
|---|---|
| **rosterKey** | `megumi_fushiguro` |
| **Universe** | `jujutsu_kaisen` |
| **Archetype** | Tactical Summoner / Close-range |
| **HP** | 1000 |
| **Cursed Energy** | 100 |
| **Speed** | 92 (an ordinary double-tap dash; below the 98 teleport tier) |
| **Jumps** | 2: the shared double jump, never refunded by any move |

Code:
- data: `megumiData.js`
- sim: `megumiState.js`
- commands: `megumi.js`
- render: `megumiFx.js`

Controls: `CONTROLS.md`. Measured results: `VERIFICATION.md` and `mechanics_results.json`.

## Canon, adaptation and crossover

### Verified canon (sources below)

- Megumi Fushiguro uses the **Ten Shadows Technique**, inherited from the Zen'in clan. He summons shikigami from shadows using hand signs.
- The shikigami used here are canon:
  - Divine Dogs (white and black)
  - Nue
  - Toad
  - Great Serpent
  - Rabbit Escape
  - Max Elephant
- **Divine Dog: Totality** is canon. It is the merged form after the black dog was destroyed.
- He stores weapons in his shadow.
- **Chimera Shadow Garden** is his canon (incomplete) Domain Expansion.
- **Mahoraga** (Eight-Handled Sword Divergent Sila Divine General) is a canon shikigami. Megumi summoned it in the Shibuya arc as an untamed, suicidal last resort ("With this treasure, I summon…"), not as a controllable attack. Sukuna later defeated it.

### Game adaptations (not canon)

- Each shikigami performs **one** brief action and leaves.
- The **Shadow Routes** stock system.
- **Shadow Step** as a capped dash through his shadow.
- The ultimate's exact beat order and damage.
- Divine Dog: Totality as the ultimate's **opener**.
- Mahoraga appears only as a **non-combat intro showcase**. It is never a move and never a second ultimate, because canon Mahoraga is not something Megumi controls.

### Unverified

- The sheet's winged Toad matches a Toad + Nue fusion. Sources name it inconsistently, so the game never names it and does not present it as a separate summon. The aerial ender is described only as a "winged Toad lash".

### Cosmetic crossover inspirations

These are skin colour schemes only (see SKINS.md):
- Infinity Frost: Gojo
- Ten Constellations: Alien X
- Shadow Circuit: Upgrade
- Pale Procession: Ghostfreak

### Sources

- [Wikipedia: Megumi Fushiguro](https://en.wikipedia.org/wiki/Megumi_Fushiguro)
- [CBR: Megumi's shikigami ranked](https://www.cbr.com/jujutsu-kaisen-megumi-fushiguro-shikigami-ranked-by-strength/)
- [Epicstream: shikigami of Megumi (Season 1)](https://epicstream.com/article/jujutsu-kaisen-shikigami-of-megumi-fushiguro-in-season-1-explained)
- [JJK Wiki: Mahoraga](https://jujutsu-kaisen.fandom.com/wiki/Eight-Handled_Sword_Divergent_Sila_Divine_General_Mahoraga)
- [Sportskeeda: why Megumi summoned Mahoraga in Shibuya](https://www.sportskeeda.com/anime/jujutsu-kaisen-why-megumi-summon-mahoraga-shibuya-explained)
- [JJK Wiki: Sukuna vs. Mahoraga](https://jujutsu-kaisen.fandom.com/wiki/Sukuna_vs._Mahoraga)

## Damage convention

Same lever as Robin, Cyborg, Raven and the Rangers:

- stored = round(raw × 1.95)
- a measured clean hit = round(stored × 0.6) before combo scaling, e.g. raw 16 → 31 stored → 18 on screen

Shared combo scaling, guard, chip, juggle and hitstun-decay rules all apply. Megumi changes none of them.

## Normals

"Startup" counts the frames before the first active frame (60 sim frames per second). Animation loops never create hits: two-hit moves have **explicit hit windows** `[from, to]` in elapsed frames, and each window connects **at most once per target**.

| move | input | startup / active / recovery | raw (stored) | notes |
|---|---|---|---|---|
| Jab `light` | □ | 5 / 2 / 10 | 16 (31) | chain 1 |
| Kick `mL2` | fresh □ after a clean jab | 6 / 2 / 12 | 20 (39) | chain 2; steps forward 3 px/f for frames 2–8 |
| Staff `mL3` | fresh □ after a clean kick | windows a = 9–10, b = 15–16 | 16 + 22 | chain 3 (max); pale-blue double slash |
| Low staff `mLow` | Down + □ | 8 / 2 / 14 | 22 (43) | **hits low** |
| Sword Arc `heavy` | △ | 12 / 4 / 20 | 46 (90) | 96 px reach |
| Advancing Sword `mAdv` | Forward + △ | windows a = 13–14, b = 18–19 | 20 + 30 | travels 4 px/f for frames 3–16, never through the opponent |
| Uppercut `up` | Up + □ / Up-Attack | 7 / 3 / 14 | 30 (59) | launcher; jump-cancel on hit |
| Rising Staff `mLaunch` | Up + △ | 12 / 4 / 20 | 40 (78) | launcher (stronger lift) |
| Air Palm `air` | air □ | 6 / 4 / 12 | 24 (47) | |
| Winged Toad Lash `mAirEnd` | air △ | 14 / 4 / 18 | 34 (66) | **aerial ender**: knocks down, **once per airtime** (reset only by a genuine landing), 10 f landing lag |

### Cancels

Each cancel requires a **clean** (unguarded) hit and a **fresh** press inside the shared cancel window:

- jab → kick → staff (three stages maximum)
- jab / kick / low → Heavy, Forward + Heavy or Up + Heavy
- any ground normal except the launchers → a summon
- Heavy, Staff or Advancing Sword → the Ultimate

A whiffed or blocked move is never cancelled.

## Summons (R1 family)

### Ownership and lifetime

- **Max one offensive summon per Megumi.** A second summon while one is acting is **refused before any cost is spent**, with a reject cue. The only exception is a Shadow Route (below).
- **Rabbit Escape** is capped separately: one swarm.
- Every hit volume is an ordinary engine projectile owned by Megumi and tagged `_mg`. Guard, blockstun, chip, combo scaling and the juggle rules are therefore the shared ones.
- Cleanup is deterministic. A KO, round reset, rematch, training reset or scene / identity change removes the summon, the rabbits, the pull and every `_mg` volume.
- Being hit before a Great Serpent's or Max Elephant's first contact dismisses it.

### Summon frame data

| summon | input | cost | gesture (release / total) | action |
|---|---|---|---|---|
| **Divine Dog** | R1 | 12 | 10 / 26 | Black and white dogs alternate. The dog runs straight at 10 px/f in the direction **captured at release** (no homing). It has **one hit** (raw 34, 96 × 50 volume) and dissolves on contact, after 340 px, at the stage edge, or after 44 f. |
| **Toad** | Forward + R1 | 14 | 9 / 28 | Lands 56 px ahead and telegraphs for 12 f. Its tongue lane runs 10–150 px ahead of the Toad for 6 f (raw 30). **Clean hit only:** an 8 f pull toward Megumi that stops 58 px in front of him. Never through guard; once per Toad. A target pulled in the last 120 f is not pulled again, so there is no capture loop. |
| **Nue** | Up + R1 | 16 | 10 / 30 | Flies a fixed route from behind / above Megumi to a point 70 px ahead and 150 px up, bursts **once** there (r 46, raw 36, anti-air), then climbs away. The point never moves; nothing is off-screen; no jump is restored. |
| **Air Nue** | air R1 (any direction) | 16 | 8 / 24 | Fixed forward-down lightning pass (96 px ahead, raw 32). Once per airtime. |
| **Rabbit Escape** | Down + R1 | 10 | 8 / 20 | Six rabbits cover Megumi for 54 f. **No damage, no invulnerability, no lock.** Within 40 f, a fresh left / right press performs **one** 120 px hop over 10 f: stage-clamped, never through the opponent, no jump reset. |
| **Great Serpent** | Back + R1 | 18 | 12 / 44 | The emergence point is captured **once** at release: the nearest foe's x, clamped to 40–260 px ahead and to the stage. A 20 f warning (growing shadow pool + emergence cells), then **one** rising strike (54 × 170, raw 42, launches). No homing. 31 f recovery: punishable. |
| **Max Elephant** | Down + △ | 30 | 26 / 70 | Committed. A silhouette warning, then a **fixed water lane** 120–420 px ahead (stage-clamped), with contacts at frames 40 / 56 / 72 (raw 22 each, **≤ 3 hits**, pushback capped by the lane). No permanent collision, no entity flood. |

## Shadow Routes

- **Stocks:** up to 2.
- **Earning progress:** the families are normal, dog, toad, nue (incl. Air Nue), serpent and elephant. Each **clean** hit adds its family once. **Two distinct families = one stock.**
- **What never counts:** a miss, a blocked hit, armor-absorbed contact, a second contact from the same attack instance, or the same family twice.
- **Spending:** after an offensive summon's **clean** hit, a 22 f confirm window opens (the HUD shows "ROUTE — R1!"). A **fresh** R1 + direction inside it spends one stock and sends the next shikigami (Up = Nue, Forward = Toad, Back = Serpent, Neutral / Down = Dog). The current summon is dismissed first.
- **Normal rules still apply:** the route pays the normal cost and plays the normal startup.
- **Limits:**
  - **Max one route per combo.** The flag clears when no foe is in hitstun or knockdown.
  - No route without a stock, through guard, or from the ultimate.
  - A route-sent summon **never earns route progress**, so a route cannot refund itself.
- **HUD:** each stock is the supplied Divine Dog shadow-silhouette cell; family progress shows as two pips.

## Shadow Step

L2 + left / right (keyboard: P + A / D).

| | |
|---|---|
| Startup | 6 f |
| Travel | 10 f × 11 px = 110 px, a real move of Megumi's body |
| Cooldown | 70 f |

- Stage-clamped, and it **stops at the opponent's body** (never passes through).
- **No invulnerability, no tracking, no jump reset.**
- Trail: up to 4 darkened echoes of Megumi's actual current frame (supplied art).
- L2 + a horizontal direction never charges energy and never walks or dashes. L2 alone stays the shared Charge. No binding is taken from anyone else.

## Ultimate: CHIMERA SHADOW GARDEN (R2, 100 energy)

**Opener (`ultOpen`, 18 f).** The supplied Totality hand sign, then Divine Dog: Totality lunges. It is a summon-owned volume of 140 × 80, active frames 4–18 of the lunge, raw 30. Usable from neutral, or from Heavy / Staff / Advancing Sword recovery. Grounded only.

**Whiff or block.** The supplied MISS branch plays out. Megumi has 44 f of real recovery and the full cost is spent. No cinematic.

**Clean hit.** The existing frozen-cinematic contract runs (combat, physics and input frozen; one resource transaction). Frames below are counted from the confirm:

| frames | beat | contacts |
|---|---|---|
| 0–29 | supplied domain hand sign + cut-in ("DOMAIN EXPANSION / CHIMERA SHADOW GARDEN") | — |
| 30–74 | supplied shadow-spreading domain cells | — |
| 75–112 | Totality HIT branch at the target | claws @82 / 94 / 106 (raw 20 each) |
| 104–128 | Nue over the target | @116 (raw 30) |
| 128–165 | Max Elephant's water from the shadow | @140 / 152 (raw 25 each) |
| 166–189 | Totality's supplied shadow silhouette lunges through | @174 (raw 90) |
| 190–229 | supplied domain recession → stance | — |

The **fixed budget** is 30 + 60 + 30 + 50 + 90 = **260 raw** before shared scaling (the same as Robin and the Rangers). The combo scale is captured at confirm. No entity is spawned during the scene. The target ends in a knockdown.

A reset mid-cinematic (training reset, rematch, KO) restores both fighters with no stuck pose or hitstun.

## Mahoraga (presentation only)

`introSequencePool` holds two intro sequences: the hand-sign intro and the **Mahoraga showcase**. The engine's existing pool picks one per match (so it appears about one match in two).

In the showcase, Megumi plays his supplied Makora hand sign (9 cells, then held). From intro frame 54 the supplied 29-cell Mahoraga emergence and slash sequence plays 150 px ahead of him, then fades. The intro card reads **"INTRO SHOWCASE — MAHORAGA (presentation only)"**.

It has no hitbox and no state, and it is skippable like every intro.

## Measured routes

These were measured through real keyboard input in `harness/megumi.test.mjs` (dummy standing, full HP 1000). Numbers are on-screen damage after shared scaling.

<!-- ROUTES -->
