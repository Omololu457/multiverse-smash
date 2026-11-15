# Batman (rebuilt) — Integration

All Batman logic, data, art, sound and tests live in **Batman-owned files**. Shared files receive only narrow,
idempotent registration hooks, applied by `tools/batman/apply_hooks.py`. That script uses the same contract as
`tools/higuruma/apply_hooks.py`:
- Each hook's anchor must occur exactly once.
- A hook whose marker is already present is skipped.
- Each file is re-read just before it is written, so concurrent edits are preserved.

Run `python3 tools/batman/apply_hooks.py --check` to confirm every hook is present.

## Owned files

| file | role |
|---|---|
| `batmanData.js` | data: moves, timelines, costs, fleet schedules, ultimate contract, roster entry (HP 1150) |
| `batmanState.js` | simulation: input edges, L2 ownership and command stance, move start, hit / block / absorb hooks, gadgets, fleet operations, payload ledgers, machine durability, KNIGHTFALL cinematic |
| `batman.js` | command layer `updateBatmanCommandCombat` → `'consumed'` \| `'grab'` |
| `batmanFx.js` | render: fleet, payloads, smoke, tools, events, ult world / sky, HUD chips, intro card, cue → sound |
| `batmanSprites.js`, `batmanSkinTable.js` | generated tables |
| `batmanSkins.js` | Default + 10 skins, per-skin HUD / FX / smoke colours |
| `batmanSound.js` | deterministic WebAudio synth `batman_*` (seeded LCG) |
| `batmanKit.js` | Move List + control rows |
| `batmanHarness.js` | `__harness.batmanTest` (harness URLs only) |
| `assets/batman/**` | extracted / recoloured art |
| `tools/batman/{analyze,extract,build_skins,apply_hooks}.py` | asset pipeline + hook applier |
| `harness/batman_{lib,boot,rebuild.test,determinism,framedata_diff,skins.test,visual,damage_audit}.mjs` | verification |
| `docs/batman/*` | this documentation + evidence |

## Legacy code

The legacy Batman implementation is left in place: `const batman` in `characters.js`, `executeBatmanSpecial`,
the legacy ultimate and `updateBatmanCommandCombat` in `abilities.js` / `game.js`, and `batmanDarkKnightCinematic.js`.
None of it runs for this rebuild, because the new hook returns earlier and the roster entry points at
`batmanRebuild`. The legacy `batmanVoice` lines are kept on the audio bus. Only the `"batman"` wipe entry was
revived; `"dark_knight"` stays wiped.

## Hooks in shared files (46)

| file | op | inserted / replacement (first line) |
|---|---|---|
| `characters.js` | after_line | `import { batman as batmanRebuild } from './batmanData.js'   // Batman (DC) REBUILT 2026-11-14 on the supplied SNES sheet` |
| `characters.js` | replace | `batman: batmanRebuild,             // Batman (DC) REBUILT — Tactical Brawler / Fleet Commander (gadgets, automated suppo` |
| `characters.js` | replace | `/* "batman" REVIVED 2026-11-14 (rebuild, batman*.js) */ "dark_knight", "brainiac",` |
| `spritesheets.js` | replace | `actions: { idle: "./assets/batman/body.png" }   /* Batman REBUILT: the body atlas (batman*.js) */` |
| `kits.js` | after_line | `import { BATMAN_KIT } from './batmanKit.js'   // Batman (batman, rebuilt) Move List` |
| `kits.js` | after_line | `batman: BATMAN_KIT,` |
| `skins.js` | after_line | `import { BATMAN_SKINS } from './batmanSkins.js'   // Batman (rebuilt) default + 10 arsenal-wide skins (cosmetic, precomp` |
| `skins.js` | replace | `for (const rs of recolorSkins(key)) if (!have.has(rs.id)) SKINS[key].push(rs)` |
| `sound.js` | after_line | `import { BATMAN_SOUNDS } from './batmanSound.js'   // Batman (rebuilt) synth SFX (SFX bus; voice bus untouched)` |
| `sound.js` | after_line | `...BATMAN_SOUNDS, // batman_* : strikes, gadgets, grapnel, smoke, fleet orders / payloads / machines, KNIGHTFALL` |
| `credits.js` | after_line | `batman: { work: 'Batman (DC) — SNES "Batman Returns" sprite sheet + generic drone / vehicle / robot packs', artists: ['D` |
| `credits.js` | replace | `"flash", "hisoka", "superman",   /* batman → SOURCED_ART (rebuild) */` |
| `combat.js` | after_line | `import { batmanHitbox, batmanBlock, batmanHit, absorbBatman } from './batmanState.js'   // Batman (rebuilt) hooks (batma` |
| `combat.js` | after_line | `if (a?.bm && fighter.rosterKey === 'batman') return batmanHitbox(fighter)   // Batman: per-move box from the drawn limb ` |
| `combat.js` | after_line | `if (absorbBatman(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }   // Batm` |
| `combat.js` | after_line | `if (!flawless) batmanBlock(attacker, defender, atk)   // Batman: authored blockstun; batman-gated` |
| `combat.js` | after_line | `batmanHit(attacker, defender, atk, {armored:!!(bossArmored \|\| castArmored \|\| supArmored)})   // Batman: clean flag (canc` |
| `sprite.js` | after_line | `if (fighter.rosterKey === 'batman' && !fighter.attacking && fighter._bmPose && !fighter.isBlocking && (fighter.grounded ` |
| `sprite.js` | after_line | `if (fighter.rosterKey === 'batman') fighter._lastSpriteFrame = this.frameIndex;   // Batman: presentation read for grapn` |
| `input.js` | replace | `!fighter._higurumaRemoteInput && !fighter._batmanRemoteInput) {` |
| `input.js` | replace | `fighter.rosterKey === 'higuruma' \|\| fighter.rosterKey === 'batman') && !fighter._aiControlled` |
| `input.js` | replace | `!fighter._higurumaRemoteInput && !fighter._batmanRemoteInput && inputSettings[` |
| `game.js` | after_line | `import { updateBatmanCommandCombat as updateBatmanRebuildCombat } from './batman.js'   // Batman (DC) REBUILT — batman-g` |
| `game.js` | after_line | `const BATMAN_WORLD = MMPR_BLACK_WORLD   // Batman: the same self-contained world (stage width, fighters, attack / projec` |
| `game.js` | replace | `isHigurumaUltActive() \|\| isBatmanUltActive() \|\| isSamuraiFlameSmasherCinematicActive()` |
| `game.js` | after_line | `clearBatmanUlt()   // Batman KNIGHTFALL (freeze contract)` |
| `game.js` | after_line | `for (const _f of [p1, p2]) if (_f) clearBatman(_f)` |
| `game.js` | after_line | `tickBatman(fighter,nearest,readRawControls(fighter)\|\|{},BATMAN_WORLD)` |
| `game.js` | after_line | `if (isBatman(fighter)) { const mc=updateBatmanRebuildCombat(fighter,inputState,nearest,BATMAN_WORLD);ctrlState=mc==='gra` |
| `game.js` | replace | `clearHiguruma(p1);clearHiguruma(p2);clearBatman(p1);clearBatman(p2)` |
| `game.js` | after_line | `if (isBatman(f)) snap.push(JSON.stringify([f._batman \|\| null, f.currentAttack?.bm \|\| null, f._bmPose \|\| null, f._bmPoseT` |
| `game.js` | replace | `higurumaLocked(fighter, readRawControls(fighter)) \|\| batmanLocked(fighter, readRawControls(fighter)) \|\|` |
| `game.js` | after_line | `tickBatman(fighter,getOpponent(fighter),readRawControls(fighter)\|\|{},BATMAN_WORLD)` |
| `game.js` | after_line | `if (isBatman(fighter)) {   // Batman (rebuilt) command layer: 'consumed' \| 'grab' (the legacy batman paths below are nev` |
| `game.js` | after_line | `clearBatman(f)` |
| `game.js` | after_line | `if (isBatman(f)) f._batmanRemoteInput = replay.isPlayback() \|\| netMatch.isActive()` |
| `game.js` | after_line | `// BATMAN "KNIGHTFALL: ORBITAL IMPACT": the same freeze contract (batmanState.js) + a camera hint that follows the aircr` |
| `game.js` | after_line | `drawBatmanFx(c, fighter)   // Batman — support fleet, payloads, batarang / grapnel lines, smoke, bracket, explosions, KN` |
| `game.js` | after_line | `&& !(a.rosterKey === "batman" && a.skinId !== b.skinId)   // Batman: same rule` |
| `game.js` | after_line | `drawBatmanHud(ctx, canvas, p1, p2)   // Batman: support-operation status + cooldown chips under his health; KNIGHTFALL c` |
| `game.js` | after_line | `drawBatmanIntroCard(ctx, canvas, p1, p2)   // Batman: portrait + name + support crew card while his own intro plays (pre` |
| `game.js` | before_line | `drawBatmanSky(ctx, canvas)   // Batman KNIGHTFALL — high-altitude sky gradient + cloud streaks under the space backdrop ` |
| `game.js` | replace | `const sm = [p1, p2].find(f => f && (f._supMoonBg \|\| 0) > 0 && ((f.rosterKey \|\| "").toLowerCase() === "superman" \|\| f.ros` |
| `game.js` | after_line | `drawBatmanUnder(ctx, p1, p2)   // Batman — low smoke + far-side orbiting bombers under the fighters (render-only; gated)` |
| `game.js` | after_line | `batmanTest: batmanHarnessApi({p1:()=>p1,p2:()=>p2,world:BATMAN_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2` |
| `game.js` | replace | `!robinOwnsCharge(fighter) && !megumiOwnsCharge(fighter) && !batmanOwnsCharge(fighter)` |
