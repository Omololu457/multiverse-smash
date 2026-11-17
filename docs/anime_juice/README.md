# Anime Juice — the game-wide pass (2026-11-17)

`animeJuice.js` is one presentation-only layer every fighter gets. It reads sparks and fighters, never writes them:
no damage, frame-data, hitbox or GAME_STATE change, and it's deterministic (integer hash, no `Math.random`).
- **Hit Effects = Off** turns it off completely.
- **Reduce Flashing** softens the flashes.
- **Particles Low** draws fewer particles.
- The **Screen Shake** setting scales its shakes.

Hooks in `game.js`:
- `animeJuiceOnSpark`: the fresh-spark loop.
- `animeJuiceTick`: the end of `updateEffectsAndDomains`.
- `drawAnimeJuiceFloor`: under the fighters.
- `drawAnimeJuiceWorld`: over the sparks.
- `drawAnimeJuiceHud`: after the health and energy bars.
- `animeJuiceReset`: on round reset.

Other hooks:
- `ui.js` reads `animeMeterRatio` for the displayed meter fill and draws the three-tone fallback orb.
- `sound.js` has the synth recipes `aj_whoosh`, `aj_chime`, `aj_ting` and `aj_clang`.

Test: `harness/anime_juice.test.mjs`. Screenshots are in this folder.

## The twelve breakdowns → what the game got

| Breakdown | Game-wide version |
|---|---|
| **Level-up bar** | **Ultimate meter:** the displayed fill races, then crawls the last 15 % (about half a second), with a rising **whoosh**. When it lands: flash + light burst, a **pillar of light**, three **rings rippling over the floor**, a warm **chime**, and **ULTIMATE READY** slammed above the bar. "Ready" = energy reaches the ultimate's cost, or the full bar for cooldown-gated ultimates. |
| **Parry** | **True parry** (`checkParry`) and **flawless block:** contact flash, a burst of sparks, a ring of light where they meet, and a bright **ting** over a heavy **clang**. A true parry also **pushes the camera in** (it eases back by itself) with a short shake. |
| **Spirit bomb / beam / orb / fire breath:** "gather / charge" | **Every special starting:** energy pours in on a spiral to the hand, in the move's element colour. **Ultimates:** the core grows in **stages** (pop, pop, pop), with a ring and a small screen shake at each jump. |
| **Gatling punches** | Any move landing again within 14 frames: **every hit pops a shock ring**, bigger and shakier as the string ramps. The string's end adds a **big final ring** and a shake. |
| **Iai slash / moon slash** | Sword / slash hits (by move name) get a **thin glowing cut line** across the target. Heavy ones leave a **glowing scar in the floor that slowly cools**. |
| **Beam / spirit bomb / dragon / rock / fire:** "aftermath" | Ultimates and heavy specials (≥ 60 damage) **mark the floor under the target by element**, and most of the effect is the fade: <ul><li>energy / light / dark / lightning: a glowing crater with smoke and sparks raining down slowly</li><li>fire: burned floor with embers drifting up</li><li>water: a puddle that slowly dries</li><li>ice: frost spikes</li><li>wind / earth: cracks and dust puffs</li></ul> Max 6 marks, one per attacker per half second. |
| **Moon slash / beam / orb:** "three tones, rings" | The game's **generic projectile orb** (every projectile without custom art) is now a dark edge, colour body, pale mid band and white-hot core, with **two thin broken rings orbiting it, each tilted a different way**. |

Enoch's **Frost Floor / Flame Floor** got the full eight-step eruption (`enochFx.drawErupt`) from the earlier ice-attack breakdown.

## Left out on purpose

Each of these would change gameplay or frame data for the whole roster:
- **Parry gameplay:** a bigger window, knocking the attacker back, a counter damage bonus, and slow-time. The slow-mo system is sim-visible and LAN-gated.
- **Level-up "count the new stats up":** the game has no levels or stats.

Some steps are specific to one character's art: the water dragon's ribbon body, the rubber arm's wobble, the teleport afterimages, the dummy splitting in half, the fire breath's 12-fps redraw. Those stay with each character's own kit. The generic layers above (gather, impact, slash cut, aftermath) cover their shared beats.

## Phase 1–2 additions (2026-11-17)

- **Parry gameplay** (Phase 1). See CHANGES.md.
- **Signature moves** (Phase 2): `animeSignatures.js` gives about 120 real roster moves the owner's full per-family breakdown:
  - spirit bomb
  - beam
  - spiral orb
  - gatling
  - stretch
  - water dragon
  - fire breath
  - rock line
  - iai
  - moon slash
  - ice

  Matching uses the move's runtime identifiers. The table is `docs/anime_juice/SIGNATURES.md`; screenshots are in `signatures/`.
  - Impact frames go through game.js's existing `_fireJuiceImpactFrame`.
  - Colour flips turn into a soft dim under Reduce Flashing.
  - `juiceSettings.animeFx` (`off` / `low` / `full`) scales the layer.
  - Test: `harness/anime_signatures.test.mjs`.
- **LEVEL UP = transformations** (Phase 3, presentation only): `animeForms.js`. Any **form change** triggers the owner's level-up breakdown (B):
  - What counts: a new `fighter.currentForm` (transformations.js, the Goku ladder, Naruto KCM, Zoro Santoryu …) or one of the curated form flags (Sharingan, Susanoo, Potential Unleashed, Golden Frieza, Sage frog mode, Demon Back …).
  - The treatment: the gauge races then crawls, then the flash, the light pillar with floor rings, whoosh + chime, and the **form name** slammed under that player's health bar.
  - The **real stat deltas** (DMG / SPD / DEF / HP, read off the fighter before vs after) are counted up tick by tick.
  - Reverts to base don't trigger it, and Ben 10's Omnitrix is skipped.
  - Test: `harness/anime_forms.test.mjs`; screenshots are in `forms/`.
