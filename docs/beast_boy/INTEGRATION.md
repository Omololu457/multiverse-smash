# Beast Boy — shared-file integration

Every shared-file change is a narrow, gated insertion made by `tools/beast_boy/apply_hooks.py` (idempotent; aborts unless every anchor matches the expected count; re-running is a no-op). Each hook sits directly AFTER the matching concurrent Cyborg line; the only edits to existing lines append a `beast_boy` term to the shared skip / roster / lock lists, exactly as Cyborg and S.P.D. Yellow do. No other writer's line is changed or reformatted.

Gates: `rosterKey === 'beast_boy'` / `isBeastBoy(f)` / `a.bb` (the per-attack descriptor only Beast Boy creates). Every Beast Boy export is a no-op for any other fighter. Frame data of every other character: ZERO diff (`harness/beast_boy_framedata_diff.mjs`).

## characters.js (2 hooks)

- after `import { cyborg } from './cyborgData.js'   // Cyborg (Victor Stone, DC / Teen Titans GBA art) — cyborg*.js`:
  ```js
  import { beast_boy } from './beastBoyData.js'   // Beast Boy (Gar Logan, DC / Teen Titans GBA art) — beastBoy*.js
  ```
- after `cyborg,                            // Cyborg (Victor Stone, DC) — Thermal Bruiser / Artillery (Heat, sonic can`:
  ```js
    beast_boy,                         // Beast Boy (Gar Logan, DC) — Shapeshift Rushdown (one-strike animal forms, Wild Chain, Instinct); beastBoy*.js
  ```

## combat.js (5 hooks)

- after `import { cyborgHitbox, cyborgBlock, cyborgHit, cyborgKnockback, cyborgProjectileHit } from './cyborgState.js' `:
  ```js
  import { beastBoyHitbox, beastBoyHurtbox, beastBoyBlock, beastBoyHit } from './beastBoyState.js'   // Beast Boy hooks (beast_boy-gated)
  ```
- after `if (a?.cy && fighter.rosterKey === 'cyborg') return cyborgHitbox(fighter)   // Cyborg: per-move box; Mega shoc`:
  ```js
    if (a?.bb && fighter.rosterKey === 'beast_boy') return beastBoyHitbox(fighter)   // Beast Boy: per-move box; animal forms use deliberate geometry (never the art bounds); feint has none
  ```
- after `if (fighter.rosterKey === 'arlong') return arlongHurtbox(fighter)   // ARLONG — the big sawshark body: a large`:
  ```js
    if (fighter.rosterKey === 'beast_boy') { const hb = beastBoyHurtbox(fighter); if (hb) return hb }   // BEAST BOY — animal-form hurtbox while a transient animal action is live (null → ordinary box); beast_boy-gated
  ```
- after `if (!flawless) cyborgBlock(attacker, defender, atk)   // Cyborg: authored blockstun; cyborg-gated`:
  ```js
      if (!flawless) beastBoyBlock(attacker, defender, atk)   // Beast Boy: authored blockstun; a blocked charge / pounce stops; beast_boy-gated
  ```
- after `cyborgHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Cyborg: clean `:
  ```js
      beastBoyHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Beast Boy: clean flag, Wild Chain window, Instinct credit (none when armored), ultimate confirm
  ```

## credits.js (1 hook)

- after `files: ['assets/cyborg/**'] },`:
  ```js
    beast_boy: { work: 'Beast Boy — Teen Titans (Game Boy Advance), playable-character sheet', artists: ['Mr. C (ripper)'],
      source: 'Supplied sheet "Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png". Visible credit panel: "Brought to you by… Mr. C — Credit? No / Permission? No" (quoted verbatim; excluded from animation). Original pixels; only the exact key colour RGB(77,109,243) removed; nearest-neighbour only. SHA-256 + rects in docs/beast_boy/source_rects.json.',
      files: ['assets/beast_boy/**'] },
  ```

## input.js (3 hooks)

- in the line containing `if (type === "controller" && !fighter._aiControlled`: `&& !fighter._cyborgRemoteInput) {` → `&& !fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput) {`
- in the line containing `readRawControls`: `|| fighter.rosterKey === 'cyborg') && ` → `|| fighter.rosterKey === 'cyborg' || fighter.rosterKey === 'beast_boy') && `
- in the line containing `readRawControls`: `&& !fighter._cyborgRemoteInput && inputSettings` → `&& !fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput && inputSettings`

## kits.js (2 hooks)

- after `import { CYBORG_KIT } from './cyborgKit.js'   // Cyborg (cyborg) Move List`:
  ```js
  import { BEAST_BOY_KIT } from './beastBoyKit.js'   // Beast Boy (beast_boy) Move List
  ```
- after `cyborg: CYBORG_KIT,`:
  ```js
    beast_boy: BEAST_BOY_KIT,
  ```

## skins.js (2 hooks)

- after `import { CYBORG_SKINS } from './cyborgSkins.js'   // Cyborg default + 8 skins (6 inspired palettes + 2 origina`:
  ```js
  import { BEAST_BOY_SKINS } from './beastBoySkins.js'   // Beast Boy default + 10 skins (4 crossover palettes + 2 naturalistic + 4 original; cosmetic, precomputed)
  ```
- after `cyborg: CYBORG_SKINS,`:
  ```js
    beast_boy: BEAST_BOY_SKINS,
  ```

## sound.js (2 hooks)

- after `import { CYBORG_SOUNDS } from './cyborgSound.js'   // Cyborg synth SFX (SFX bus; voice bus untouched; no dialo`:
  ```js
  import { BEAST_BOY_SOUNDS } from './beastBoySound.js'   // Beast Boy synth SFX (SFX bus; voice bus untouched; no dialogue)
  ```
- after `...CYBORG_SOUNDS, // cyborg_* : sonic chirp / cannon pulse, missile hiss + boom, Mega crunch, vent hiss, overh`:
  ```js
    ...BEAST_BOY_SOUNDS, // beastboy_* : morph chirp, gorilla thud, hoof roll + horn hit, wing pass, claw rip, Wild Chain / Instinct chimes
  ```

## spritesheets.js (1 hook)

- after `cyborg: { actions: { idle: './assets/cyborg/idle.png' } },`:
  ```js
    beast_boy: { actions: { idle: './assets/beast_boy/idle.png' } },
  ```

## sprite.js (2 hooks)

- after `if (fighter.rosterKey === 'cyborg' && !fighter.attacking && (fighter._cyLand || 0) > 0 && !fighter.isBlocking `:
  ```js
    if (fighter.rosterKey === 'beast_boy' && !fighter.attacking && (fighter._bbLand || 0) > 0 && !fighter.isBlocking && (fighter.grounded ?? fighter.onGround) && Math.abs(fighter.vx || 0) <= 0.1) return 'land';   // Beast Boy: full supplied Landing sequence after a genuine landing (cosmetic; beastBoyState sets _bbLand)
  ```
- after `if (fighter.rosterKey === 'cyborg') fighter._lastSpriteFrame = this.frameIndex;   // Cyborg: presentation read`:
  ```js
      if (fighter.rosterKey === 'beast_boy') fighter._lastSpriteFrame = this.frameIndex;   // Beast Boy: presentation read for skin material overlays (beastBoyFx)
  ```

## game.js (19 hooks)

- after `import { cyborgHarnessApi } from './cyborgHarness.js'`:
  ```js
  import { updateBeastBoyCommandCombat } from './beastBoy.js'   // Beast Boy (Gar Logan, DC) — beast_boy-gated command layer
  import { tickBeastBoy, isBeastBoy, clearBeastBoy, beastBoyLocked, isBeastBoyUltActive, updateBeastBoyUlt, clearBeastBoyUlt } from './beastBoyState.js'
  import { drawBeastBoyFx, drawBeastBoyHud, playBeastBoyCues } from './beastBoyFx.js'
  import { beastBoyHarnessApi } from './beastBoyHarness.js'
  ```
- after `const CYBORG_WORLD = MMPR_BLACK_WORLD   // Cyborg: the same self-contained world (sonic shots / missiles spawn`:
  ```js
  const BEAST_BOY_WORLD = MMPR_BLACK_WORLD   // Beast Boy: the same self-contained world (stage width for travel clamps, ultimate damage through W.damage)
  ```
- in the line containing `function _rewindUnsafeNow`: `|| isCyborgUltActive() ||` → `|| isCyborgUltActive() || isBeastBoyUltActive() ||`
- after `clearCyborgUlt()   // Cyborg BOOYAH PROTOCOL (freeze contract)` (×4):
  ```js
    clearBeastBoyUlt()   // Beast Boy ANIMAL INSTINCT (freeze contract)
  ```
- after `for (const _f of [p1, p2]) if (_f) clearCyborg(_f,CYBORG_WORLD)` (×4):
  ```js
    for (const _f of [p1, p2]) if (_f) clearBeastBoy(_f)
  ```
- in the line containing `clearCyborg(p1,CYBORG_WORLD);clearCyborg(p2,CYBORG_WORLD)` (×2): `clearCyborg(p1,CYBORG_WORLD);clearCyborg(p2,CYBORG_WORLD)` → `clearCyborg(p1,CYBORG_WORLD);clearCyborg(p2,CYBORG_WORLD);clearBeastBoy(p1);clearBeastBoy(p2)`
- after `clearCyborg(f,CYBORG_WORLD)`:
  ```js
      clearBeastBoy(f)
  ```
- after `tickCyborg(fighter,nearest,readRawControls(fighter)||{},CYBORG_WORLD)`:
  ```js
    tickBeastBoy(fighter,nearest,readRawControls(fighter)||{},BEAST_BOY_WORLD)
    playBeastBoyCues(fighter)
  ```
- after `if (isCyborg(fighter)) { const mc=updateCyborgCommandCombat(fighter,inputState,nearest,CYBORG_WORLD);ctrlState`:
  ```js
    if (isBeastBoy(fighter)) { const mc=updateBeastBoyCommandCombat(fighter,inputState,nearest,BEAST_BOY_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }
  ```
- after `if (isCyborg(f)) snap.push(JSON.stringify(f._cyborg || null))   // Cyborg GAME_STATE (Heat, overheat, allowanc`:
  ```js
    if (isBeastBoy(f)) snap.push(JSON.stringify([f._beastBoy || null, f.currentAttack?.bb || null]))   // Beast Boy GAME_STATE (Wild Chain, Instinct, airtime allowances, press edges, live animal descriptor)
  ```
- in the line containing `function updateMovementInput`: `|| cyborgLocked(fighter, readRawControls(fighter)) ||` → `|| cyborgLocked(fighter, readRawControls(fighter)) || beastBoyLocked(fighter, readRawControls(fighter)) ||`
- after `tickCyborg(fighter,getOpponent(fighter),readRawControls(fighter)||{},CYBORG_WORLD)`:
  ```js
    tickBeastBoy(fighter,getOpponent(fighter),readRawControls(fighter)||{},BEAST_BOY_WORLD)
    playBeastBoyCues(fighter)
  ```
- after `if (isCyborg(fighter)) {   // Cyborg command layer: 'consumed' | 'grab'`:
  ```js
    if (isBeastBoy(fighter)) {   // Beast Boy command layer: 'consumed' | 'grab'
      const mc=updateBeastBoyCommandCombat(fighter,inputState,getOpponent(fighter),BEAST_BOY_WORLD)
      updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return
    }
  ```
- after `if (isCyborg(f)) f._cyborgRemoteInput = replay.isPlayback() || netMatch.isActive()`:
  ```js
      if (isBeastBoy(f)) f._beastBoyRemoteInput = replay.isPlayback() || netMatch.isActive()
  ```
- after `if (isCyborgUltActive()) {`:
  ```js
    // BEAST BOY "ANIMAL INSTINCT — FOUR BEAST FINISH": the same freeze contract (beastBoyState.js).
    if (isBeastBoyUltActive()) {
      updateBeastBoyUlt()
      if (typeof camera.advance === "function") camera.advance(canvas)
      return
    }
  ```
- after `drawCyborgFx(c, fighter, getOpponent(fighter))   // Cyborg — skin material overlay, explosions, sonic bursts, `:
  ```js
      drawBeastBoyFx(c, fighter)   // Beast Boy — skin material overlay, Wild Chain cue, Instinct escape ring (render-only; beast_boy only)
  ```
- after `&& !(a.rosterKey === "cyborg" && a.skinId !== b.skinId)   // Cyborg: same rule`:
  ```js
      && !(a.rosterKey === "beast_boy" && a.skinId !== b.skinId)   // Beast Boy: same rule
  ```
- after `drawCyborgHud(ctx, canvas, p1, p2)   // Cyborg: Heat bar (text + colour) + expression icon under his health; B`:
  ```js
    drawBeastBoyHud(ctx, canvas, p1, p2)   // Beast Boy: expression icon + Instinct token + Wild Chain count under his health; ANIMAL INSTINCT cut-in (gated)
  ```
- after `cyborgTest: cyborgHarnessApi({p1:()=>p1,p2:()=>p2,world:CYBORG_WORLD,reset:()=>{resetTraining();clearInputBuff`:
  ```js
      beastBoyTest: beastBoyHarnessApi({p1:()=>p1,p2:()=>p2,world:BEAST_BOY_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),
  ```

## Lifecycle sites (game.js)

`clearBeastBoyUlt()` + `clearBeastBoy(f)` run at the four round / match reset sites, the rematch line, the `_roundOver` line and `resetTraining`; `tickBeastBoy` additionally clears any leftover state when a slot's identity changes. Verified: harness/beast_boy_determinism.mjs (training reset mid-animal / mid-ultimate, identity change, KO → next round, rematch).

## Charge

Not gated: L2 / Charge stays the engine's ordinary shared energy charge.
