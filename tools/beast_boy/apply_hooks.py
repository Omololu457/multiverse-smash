#!/usr/bin/env python3
"""Beast Boy — apply the minimal shared-file registration hooks (idempotent; narrow string edits only).

Each hook is inserted directly AFTER the concurrent Cyborg line at the same site (no other writer's line is edited,
except appending a gated term at the END of the shared long lines, the same convention Cyborg / S.P.D. Yellow use).
Every anchor must occur exactly the expected number of times or the script aborts without writing anything.
Re-running is a no-op (each hook carries a unique marker).

Usage: python3 tools/beast_boy/apply_hooks.py [--check]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARK = 'beast_boy'


def after(anchor, add, count=1):
    return ('after', anchor, add, count)


def append(anchor_line_part, old, new, count=1):
    return ('replace', anchor_line_part, (old, new), count)


HOOKS = {
    'characters.js': [
        after("import { cyborg } from './cyborgData.js'   // Cyborg (Victor Stone, DC / Teen Titans GBA art) — cyborg*.js\n",
              "import { beast_boy } from './beastBoyData.js'   // Beast Boy (Gar Logan, DC / Teen Titans GBA art) — beastBoy*.js\n"),
        after("  cyborg,                            // Cyborg (Victor Stone, DC) — Thermal Bruiser / Artillery (Heat, sonic cannon, missiles, Mega Punch); cyborg*.js\n",
              "  beast_boy,                         // Beast Boy (Gar Logan, DC) — Shapeshift Rushdown (one-strike animal forms, Wild Chain, Instinct); beastBoy*.js\n"),
    ],
    'combat.js': [
        after("import { cyborgHitbox, cyborgBlock, cyborgHit, cyborgKnockback, cyborgProjectileHit } from './cyborgState.js'   // Cyborg hooks (cyborg-gated)\n",
              "import { beastBoyHitbox, beastBoyHurtbox, beastBoyBlock, beastBoyHit } from './beastBoyState.js'   // Beast Boy hooks (beast_boy-gated)\n"),
        after("  if (a?.cy && fighter.rosterKey === 'cyborg') return cyborgHitbox(fighter)   // Cyborg: per-move box; Mega shockwave = grounded band; weapons / vent / slam hang have none\n",
              "  if (a?.bb && fighter.rosterKey === 'beast_boy') return beastBoyHitbox(fighter)   // Beast Boy: per-move box; animal forms use deliberate geometry (never the art bounds); feint has none\n"),
        after("  if (fighter.rosterKey === 'arlong') return arlongHurtbox(fighter)   // ARLONG — the big sawshark body: a larger hurtbox (designed weakness; arlong-gated)\n",
              "  if (fighter.rosterKey === 'beast_boy') { const hb = beastBoyHurtbox(fighter); if (hb) return hb }   // BEAST BOY — animal-form hurtbox while a transient animal action is live (null → ordinary box); beast_boy-gated\n"),
        after("    if (!flawless) cyborgBlock(attacker, defender, atk)   // Cyborg: authored blockstun; cyborg-gated\n",
              "    if (!flawless) beastBoyBlock(attacker, defender, atk)   // Beast Boy: authored blockstun; a blocked charge / pounce stops; beast_boy-gated\n"),
        after("    cyborgHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Cyborg: clean flag, Hot Impact, Mega shock FX, ultimate confirm\n",
              "    beastBoyHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Beast Boy: clean flag, Wild Chain window, Instinct credit (none when armored), ultimate confirm\n"),
    ],
    'credits.js': [
        after("    files: ['assets/cyborg/**'] },\n",
              "  beast_boy: { work: 'Beast Boy — Teen Titans (Game Boy Advance), playable-character sheet', artists: ['Mr. C (ripper)'],\n"
              "    source: 'Supplied sheet \"Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png\". Visible credit panel: \"Brought to you by… Mr. C — Credit? No / Permission? No\" (quoted verbatim; excluded from animation). Original pixels; only the exact key colour RGB(77,109,243) removed; nearest-neighbour only. SHA-256 + rects in docs/beast_boy/source_rects.json.',\n"
              "    files: ['assets/beast_boy/**'] },\n"),
    ],
    'input.js': [
        append("if (type === \"controller\" && !fighter._aiControlled", "&& !fighter._cyborgRemoteInput) {", "&& !fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput) {"),
        append("readRawControls", "|| fighter.rosterKey === 'cyborg') && ", "|| fighter.rosterKey === 'cyborg' || fighter.rosterKey === 'beast_boy') && "),
        append("readRawControls", "&& !fighter._cyborgRemoteInput && inputSettings", "&& !fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput && inputSettings"),
    ],
    'kits.js': [
        after("import { CYBORG_KIT } from './cyborgKit.js'   // Cyborg (cyborg) Move List\n",
              "import { BEAST_BOY_KIT } from './beastBoyKit.js'   // Beast Boy (beast_boy) Move List\n"),
        after("  cyborg: CYBORG_KIT,\n", "  beast_boy: BEAST_BOY_KIT,\n"),
    ],
    'skins.js': [
        after("import { CYBORG_SKINS } from './cyborgSkins.js'   // Cyborg default + 8 skins (6 inspired palettes + 2 original; cosmetic, precomputed)\n",
              "import { BEAST_BOY_SKINS } from './beastBoySkins.js'   // Beast Boy default + 10 skins (4 crossover palettes + 2 naturalistic + 4 original; cosmetic, precomputed)\n"),
        after("  cyborg: CYBORG_SKINS,\n", "  beast_boy: BEAST_BOY_SKINS,\n"),
    ],
    'sound.js': [
        after("import { CYBORG_SOUNDS } from './cyborgSound.js'   // Cyborg synth SFX (SFX bus; voice bus untouched; no dialogue)\n",
              "import { BEAST_BOY_SOUNDS } from './beastBoySound.js'   // Beast Boy synth SFX (SFX bus; voice bus untouched; no dialogue)\n"),
        after("  ...CYBORG_SOUNDS, // cyborg_* : sonic chirp / cannon pulse, missile hiss + boom, Mega crunch, vent hiss, overheat alarm, thruster, reject buzz\n",
              "  ...BEAST_BOY_SOUNDS, // beastboy_* : morph chirp, gorilla thud, hoof roll + horn hit, wing pass, claw rip, Wild Chain / Instinct chimes\n"),
    ],
    'spritesheets.js': [
        after("  cyborg: { actions: { idle: './assets/cyborg/idle.png' } },\n", "  beast_boy: { actions: { idle: './assets/beast_boy/idle.png' } },\n"),
    ],
    'sprite.js': [
        after("  if (fighter.rosterKey === 'cyborg' && !fighter.attacking && (fighter._cyLand || 0) > 0 && !fighter.isBlocking && (fighter.grounded ?? fighter.onGround) && Math.abs(fighter.vx || 0) <= 0.1) return 'land';   // Cyborg: supplied landing frames after a genuine landing (cosmetic; cyborgState sets _cyLand)\n",
              "  if (fighter.rosterKey === 'beast_boy' && !fighter.attacking && (fighter._bbLand || 0) > 0 && !fighter.isBlocking && (fighter.grounded ?? fighter.onGround) && Math.abs(fighter.vx || 0) <= 0.1) return 'land';   // Beast Boy: full supplied Landing sequence after a genuine landing (cosmetic; beastBoyState sets _bbLand)\n"),
        after("    if (fighter.rosterKey === 'cyborg') fighter._lastSpriteFrame = this.frameIndex;   // Cyborg: presentation read for skin material overlays (cyborgFx)\n",
              "    if (fighter.rosterKey === 'beast_boy') fighter._lastSpriteFrame = this.frameIndex;   // Beast Boy: presentation read for skin material overlays (beastBoyFx)\n"),
    ],
    'game.js': [
        after("import { cyborgHarnessApi } from './cyborgHarness.js'\n",
              "import { updateBeastBoyCommandCombat } from './beastBoy.js'   // Beast Boy (Gar Logan, DC) — beast_boy-gated command layer\n"
              "import { tickBeastBoy, isBeastBoy, clearBeastBoy, beastBoyLocked, isBeastBoyUltActive, updateBeastBoyUlt, clearBeastBoyUlt } from './beastBoyState.js'\n"
              "import { drawBeastBoyFx, drawBeastBoyHud, playBeastBoyCues } from './beastBoyFx.js'\n"
              "import { beastBoyHarnessApi } from './beastBoyHarness.js'\n"),
        after("const CYBORG_WORLD = MMPR_BLACK_WORLD   // Cyborg: the same self-contained world (sonic shots / missiles spawn through W.spawn, ultimate damage through W.damage)\n",
              "const BEAST_BOY_WORLD = MMPR_BLACK_WORLD   // Beast Boy: the same self-contained world (stage width for travel clamps, ultimate damage through W.damage)\n"),
        append("function _rewindUnsafeNow", "|| isCyborgUltActive() ||", "|| isCyborgUltActive() || isBeastBoyUltActive() ||"),
        after("  clearCyborgUlt()   // Cyborg BOOYAH PROTOCOL (freeze contract)\n",
              "  clearBeastBoyUlt()   // Beast Boy ANIMAL INSTINCT (freeze contract)\n", count=4),
        after("  for (const _f of [p1, p2]) if (_f) clearCyborg(_f,CYBORG_WORLD)\n",
              "  for (const _f of [p1, p2]) if (_f) clearBeastBoy(_f)\n", count=4),
        append("clearCyborg(p1,CYBORG_WORLD);clearCyborg(p2,CYBORG_WORLD)", "clearCyborg(p1,CYBORG_WORLD);clearCyborg(p2,CYBORG_WORLD)", "clearCyborg(p1,CYBORG_WORLD);clearCyborg(p2,CYBORG_WORLD);clearBeastBoy(p1);clearBeastBoy(p2)", count=2),
        after("    clearCyborg(f,CYBORG_WORLD)\n", "    clearBeastBoy(f)\n"),
        after("  tickCyborg(fighter,nearest,readRawControls(fighter)||{},CYBORG_WORLD)\n  playCyborgCues(fighter)\n",
              "  tickBeastBoy(fighter,nearest,readRawControls(fighter)||{},BEAST_BOY_WORLD)\n  playBeastBoyCues(fighter)\n"),
        after("  if (isCyborg(fighter)) { const mc=updateCyborgCommandCombat(fighter,inputState,nearest,CYBORG_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }\n",
              "  if (isBeastBoy(fighter)) { const mc=updateBeastBoyCommandCombat(fighter,inputState,nearest,BEAST_BOY_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }\n"),
        after("  if (isCyborg(f)) snap.push(JSON.stringify(f._cyborg || null))   // Cyborg GAME_STATE (Heat, overheat, allowances, marks, live projectiles, press edges); currentAttack.cy pushed above\n",
              "  if (isBeastBoy(f)) snap.push(JSON.stringify([f._beastBoy || null, f.currentAttack?.bb || null]))   // Beast Boy GAME_STATE (Wild Chain, Instinct, airtime allowances, press edges, live animal descriptor)\n"),
        append("function updateMovementInput", "|| cyborgLocked(fighter, readRawControls(fighter)) ||", "|| cyborgLocked(fighter, readRawControls(fighter)) || beastBoyLocked(fighter, readRawControls(fighter)) ||"),
        after("  tickCyborg(fighter,getOpponent(fighter),readRawControls(fighter)||{},CYBORG_WORLD)\n  playCyborgCues(fighter)\n",
              "  tickBeastBoy(fighter,getOpponent(fighter),readRawControls(fighter)||{},BEAST_BOY_WORLD)\n  playBeastBoyCues(fighter)\n"),
        after("  if (isCyborg(fighter)) {   // Cyborg command layer: 'consumed' | 'grab'\n"
              "    const mc=updateCyborgCommandCombat(fighter,inputState,getOpponent(fighter),CYBORG_WORLD)\n"
              "    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }\n",
              "  if (isBeastBoy(fighter)) {   // Beast Boy command layer: 'consumed' | 'grab'\n"
              "    const mc=updateBeastBoyCommandCombat(fighter,inputState,getOpponent(fighter),BEAST_BOY_WORLD)\n"
              "    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }\n"),
        after("    if (isCyborg(f)) f._cyborgRemoteInput = replay.isPlayback() || netMatch.isActive()\n",
              "    if (isBeastBoy(f)) f._beastBoyRemoteInput = replay.isPlayback() || netMatch.isActive()\n"),
        after("  if (isCyborgUltActive()) {\n    updateCyborgUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }\n",
              "  // BEAST BOY \"ANIMAL INSTINCT — FOUR BEAST FINISH\": the same freeze contract (beastBoyState.js).\n"
              "  if (isBeastBoyUltActive()) {\n    updateBeastBoyUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }\n"),
        after("    drawCyborgFx(c, fighter, getOpponent(fighter))   // Cyborg — skin material overlay, explosions, sonic bursts, Mega shock ring, vent steam, Resonance ring, ultimate beam / missiles (render-only; cyborg only)\n",
              "    drawBeastBoyFx(c, fighter)   // Beast Boy — skin material overlay, Wild Chain cue, Instinct escape ring (render-only; beast_boy only)\n"),
        after("    && !(a.rosterKey === \"cyborg\" && a.skinId !== b.skinId)   // Cyborg: same rule\n",
              "    && !(a.rosterKey === \"beast_boy\" && a.skinId !== b.skinId)   // Beast Boy: same rule\n"),
        after("  drawCyborgHud(ctx, canvas, p1, p2)   // Cyborg: Heat bar (text + colour) + expression icon under his health; BOOYAH cut-in (gated)\n",
              "  drawBeastBoyHud(ctx, canvas, p1, p2)   // Beast Boy: expression icon + Instinct token + Wild Chain count under his health; ANIMAL INSTINCT cut-in (gated)\n"),
        after("    cyborgTest: cyborgHarnessApi({p1:()=>p1,p2:()=>p2,world:CYBORG_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),\n",
              "    beastBoyTest: beastBoyHarnessApi({p1:()=>p1,p2:()=>p2,world:BEAST_BOY_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),\n"),
    ],
}


def apply(text, hook, fname):
    kind, anchor, payload, count = hook
    if kind == 'after':
        if payload in text: return text, 'present'
        n = text.count(anchor)
        assert n == count, (fname, 'anchor count', n, 'expected', count, anchor[:90])
        return text.replace(anchor, anchor + payload), 'added'
    old, new = payload
    if new in text: return text, 'present'
    lines = text.split('\n'); hits = [i for i, l in enumerate(lines) if anchor in l and old in l] if anchor not in ('readRawControls', 'function updateMovementInput', 'function _rewindUnsafeNow') else None
    if hits is None:   # the anchor names the enclosing function: the target line is the first line after it containing `old`
        start = text.index(anchor)
        i = text.index(old, start)
        assert text.count(old) >= 1
        return text[:i] + new + text[i + len(old):], 'added'
    assert len(hits) == count, (fname, 'line hits', len(hits), 'expected', count, anchor[:60])
    for i in hits: lines[i] = lines[i].replace(old, new)
    return '\n'.join(lines), 'added'


def main():
    check = '--check' in sys.argv
    out = {}
    for fname, hooks in HOOKS.items():
        p = ROOT / fname; text = p.read_text(); status = []
        for h in hooks:
            text, st = apply(text, h, fname); status.append(st)
        out[fname] = (text, status)
    for fname, (text, status) in out.items():
        print(f'{fname}: {status}')
        if not check and 'added' in status: (ROOT / fname).write_text(text)


if __name__ == '__main__':
    main()
