# Cyborg — shared-file integration

Cyborg's logic lives in owned modules:
- `cyborgData.js` (data and roster entry), `cyborgSprites.js` (animation table)
- `cyborgState.js` (sim: Heat, weapons, thruster, ultimate), `cyborg.js` (command layer)
- `cyborgFx.js` (render only), `cyborgSound.js`, `cyborgKit.js`, `cyborgSkins.js` + `cyborgSkinTable.js`
- `cyborgHarness.js`

Shared files get only small hooks. Each hook is gated on `rosterKey === 'cyborg'`, on `isCyborg(f)`, or on Cyborg-only state (`a.cy`, `f._cyborg`).
- Each hook was inserted after the concurrent S.P.D. Yellow line at the same site.
- No S.P.D. Yellow line was edited.
- On the shared long lines, Cyborg's term is appended at the end.

Line numbers below are from the working tree on 2026-11-14 and will drift.

| File:line | Hook |
|---|---|
| characters.js:14 | `import { cyborg } from './cyborgData.js'` |
| characters.js:11505 | `cyborg,` roster entry |
| combat.js:11 | import `cyborgHitbox, cyborgBlock, cyborgHit, cyborgKnockback, cyborgProjectileHit` |
| combat.js:708 | `if (a?.cy && fighter.rosterKey === 'cyborg') return cyborgHitbox(fighter)`: per-move box, Mega grounded shock band; weapons and vent have no body box |
| combat.js:3425 | `if (!flawless) cyborgBlock(attacker, defender, atk)`: authored blockstun |
| combat.js:3485 | `cyborgHit(attacker, defender, atk, {armored})`: clean flag, Hot Impact, Mega shock FX, ultimate confirm |
| combat.js:3554 | `cyborgKnockback(attacker, defender, atk)`: weight 1.15 when Cyborg is the defender |
| combat.js:4405 | `cyborgProjectileHit(proj, fighter, {armored})`: Resonance mark and missile conversion, plus weight against projectiles |
| credits.js:37-39 | `cyborg` credit entry (Mr. C, panel text quoted verbatim, `assets/cyborg/**`) |
| input.js:530 | `&& !fighter._cyborgRemoteInput` appended to the controller skip list (replay / LAN) |
| input.js:591 | `\|\| fighter.rosterKey === 'cyborg'` appended to the raw pad roster list |
| kits.js:9, :99 | `CYBORG_KIT` import and `cyborg: CYBORG_KIT,` |
| skins.js:23, :145 | `CYBORG_SKINS` import and `cyborg: CYBORG_SKINS,` |
| sound.js:322, :331 | `CYBORG_SOUNDS` import and `...CYBORG_SOUNDS,` (all ids `cyborg_*`) |
| sprite.js:764 | `land` action while `_cyLand > 0` (grounded, idle, not blocking) |
| sprite.js:1141 | `_lastSpriteFrame` recorded for Cyborg (material overlay sync) |
| spritesheets.js:61 | `cyborg: { actions: { idle: './assets/cyborg/idle.png' } },` |
| game.js:31-34 | imports from cyborg.js, cyborgState.js, cyborgFx.js, cyborgHarness.js |
| game.js:84 | `const CYBORG_WORLD = MMPR_BLACK_WORLD` (the same `W.spawn` / `applyDamage` world) |
| game.js:1347 | `\|\| isCyborgUltActive()` appended to the cinematic-active list |
| game.js:1413/1424, 5058/5073, 6134/6149, 10043/10058 | `clearCyborgUlt()` plus a `clearCyborg` loop at the four match / reset sites |
| game.js:10013, 20194 | `clearCyborg(p1/p2)` appended to the long Ranger clear lines (the second one is `_roundOver`) |
| game.js:20055 | per-fighter round clear |
| game.js:4119-4120, 4147 | FFA tick, cues and command layer |
| game.js:11581-11582, 11798-11799 | 1v1 tick, cues and command layer (`'consumed' \| 'grab'`) |
| game.js:5803 | `f._cyborg` added to the GAME_STATE snapshot (replay / LAN desync check) |
| game.js:11333 | `cyborgLocked(fighter)` appended to the movement lock |
| game.js:11422-11423 | **charge gate**: `!isCyborg(fighter)`, so Charge (L2 / P) is the Heat vent and never recharges Power |
| game.js:20560 | `f._cyborgRemoteInput = replay.isPlayback() \|\| netMatch.isActive()` |
| game.js:20729-20731 | BOOYAH freeze block (`updateCyborgUlt()` under the frozen-cinematic contract) |
| game.js:21415 | `drawCyborgFx(c, fighter, getOpponent(fighter))` after `drawMmprWhiteFx` |
| game.js:21766 | mirror rule: Cyborg vs Cyborg in different skins gets no mirror wash |
| game.js:23311 | `drawCyborgHud(ctx, canvas, p1, p2)` after `drawHomelanderGauges` |
| game.js:27087 | `cyborgTest: cyborgHarnessApi(...)` (harness URLs only) |

## Existing code that now also matches Cyborg (left as is)

**Green Arrow's EMP drain.** The tech-fighter regex matches `/…|cyborg/` on rosterKey, so an EMP arrow drains 20 Power from Cyborg. This is intended: Cyborg is a tech fighter.

**Superman's Cyborg-eye overlay.** game.js `drawCyborgSupermanEye` fires on any skinId that contains "cyborg". To avoid it, every Cyborg skin id uses the `cy_` prefix.

**AlienX starfield.** The generic starfield is gated on skinIds that end in "AlienX". `cy_alien_x` does not match, so Cyborg's Alien X material comes from his own precomputed strips instead.

## Frame data of other fighters

Every non-Cyborg line in the shared diffs is either a block closer or a pre-existing line extended with a gated term. No other fighter's authored data is touched.

**Measured.** `node harness/cyborg_framedata_diff.mjs` compares the start commit (`docs/cyborg/START_COMMIT.txt`) with the working tree.
- Roster: 140 before, 142 after (added `spd_yellow` and `cyborg`).
- Result: **frame-data diff zero** across 845 blocks for every other character.
- Blocks compared: basic_attacks, specials, ultimate, stats, moves and combos, plus the Zoro / Luffy / Buggy / Sanji / Arlong tables.

Regression baselines held with Cyborg integrated:

| Check | Result |
|---|---|
| det | 14/0 |
| combo-standard | 231/9 (pre-existing) |
| up-attack-roster | 77/2 (pre-existing) |
| roster integrity | OK |

**The combo-standard audit's `downAir` requirement.** Cyborg declares `downAir` = the Air Hammer, since he has no spike move.
