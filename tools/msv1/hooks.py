#!/usr/bin/env python3
"""MSV1 engine hooks — idempotent, anchor-based insertions into SHARED engine files (ninja-gated, no-op for everyone else).

  python3 tools/msv1/hooks.py worktree        apply to the working tree (keeps every other session's dirty edits)
  python3 tools/msv1/hooks.py blobs <rev>     apply to <rev>'s clean blobs → `git hash-object -w`, print "path blob" lines
  python3 tools/msv1/hooks.py check           report which hooks are present in the worktree

Every hook is (file, anchor, text, mode). mode: 'after' (insert text on new line(s) after the anchor's line),
'inline' (replace anchor substring with text — text must contain the anchor's meaning), all occurrences when 'all' is set.
A hook is skipped when its marker (the text) is already present → re-running never duplicates.
"""
import subprocess, sys, os
ROOT = os.environ.get('MSV1_ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = '   // MSV1'
MM = '   // MSV1-MERGE'
HOOKS = [
  # ── game.js ──
  ('game.js', "import { rangerFacingFix } from './rangers.js'", "import { tickNinja, isNinja, clearNinja, ninjaRoundReset, ninjaBodyAlpha, ninjaSnapshot } from './ninja.js'" + M + " Ninja Storm framework (ns_red / ns_yellow; ninja-gated)\nimport { updateNinjaCommand } from './ninjaCommand.js'" + M + " generic ninja command layer\nimport { drawNinjaFx, drawNinjaUnder, playNinjaCues } from './nsFx.js'" + M + " render-only ninja FX + cues\nimport { ninjaHarnessApi } from './nsHarness.js'" + M + " test accessor", 'after'),
  ('game.js', "const ARLONG_WORLD = {", "const MSV1_WORLD = { ...SPD_RED_WORLD, frame: () => _replayFrame, attackBoxRaw: o => (o && o.attacking && getAttackPhase(o) === 'active') ? getAttackHitbox(o) : null, projectileList: () => activeProjectiles, removeProjectile: p => { const i = activeProjectiles.indexOf(p); if (i >= 0) activeProjectiles.splice(i, 1) } }" + M + " ninja world (S.P.D. Red's + the LOCKSTEP sim frame for the hash — globalFrameCount counts render/menu frames and differs across LAN peers / replay — + own box / projectile list)", 'before'),
  ('game.js', "  tickSpdRed(fighter, nearest, readRawControls(fighter) || {}, SPD_RED_WORLD)", "  tickNinja(fighter, nearest, readRawControls(fighter) || {}, MSV1_WORLD); playNinjaCues(fighter)" + M + " ninjas (FFA step)", 'after'),
  ('game.js', "  tickSpdRed(fighter, getOpponent(fighter), readRawControls(fighter) || {}, SPD_RED_WORLD)", "  tickNinja(fighter, getOpponent(fighter), readRawControls(fighter) || {}, MSV1_WORLD); playNinjaCues(fighter)" + M + " ninjas (1v1 step)", 'after'),
  ('game.js', "  if (isElastigirl(fighter)) { const mc=updateElastigirlCommandCombat(fighter,inputState,nearest,ELASTIGIRL_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "  if (isNinja(fighter)) { const nc=updateNinjaCommand(fighter,inputState,nearest,MSV1_WORLD);if(nc)ctrlState=nc==='grab'?{grab:!!inputState.grab}:{} }" + M + " ninja command layer (FFA)", 'after'),
  ('game.js', "  if (isSpdRed(fighter)) {   // S.P.D. Red command layer: 'consumed' | 'grab' | false\n    const rc = updateSpdRedCommandCombat(fighter, inputState, getOpponent(fighter)", "  if (isNinja(fighter)) {" + M + " ninja command layer: 'consumed' | 'grab' | false\n    const nc = updateNinjaCommand(fighter, inputState, getOpponent(fighter), MSV1_WORLD)\n    if (nc) { updateCombat(fighter, getOpponent(fighter), nc === 'grab' ? { grab: !!inputState.grab } : {}, opts); return }\n  }", 'before'),
  ('game.js', "  if (isSpdRed(f) || f._ranger) snap.push(", "  if (isNinja(f)) snap.push(JSON.stringify(ninjaSnapshot(f)))" + M + " ninja GAME_STATE (streak, NP, clones, mirror identity, burrow, traps)", 'after'),
  ('game.js', "  for (const _f of [p1, p2]) if (_f) clearElastigirl(_f)", "  for (const _f of [p1, p2]) if (_f) ninjaRoundReset(_f)" + M, 'after', 'all'),
  ('game.js', "    clearSpdRed(f)\n", "    clearNinja(f)" + M + "\n", 'after'),
  ('game.js', "!isEnoch(fighter) && !batmanOwnsCharge(fighter)", "!isEnoch(fighter) && !batmanOwnsCharge(fighter) && !isNinja(fighter)", 'inline'),
  ('game.js', "    if (isElastigirl(f)) f._elastigirlRemoteInput = replay.isPlayback() || netMatch.isActive()", "    if (isNinja(f)) f._msv1RemoteInput = replay.isPlayback() || netMatch.isActive()" + M, 'after'),
  ('game.js', "    drawSpdRedUnder(c, fighter, globalFrameCount)", "    drawNinjaUnder(c, fighter)" + M + " streak tail / mirror shadow / traps / burrow ripple, BEHIND the body (render-only)", 'after'),
  ('game.js', "* spdRedBodyAlpha(fighter) * dashParrBodyAlpha(fighter)", "* spdRedBodyAlpha(fighter) * ninjaBodyAlpha(fighter) * dashParrBodyAlpha(fighter)", 'inline'),
  ('game.js', "if (_ssA === 0 && dashParrBodyAlpha(fighter) === 0)", "if (_ssA === 0 && (dashParrBodyAlpha(fighter) === 0 || ninjaBodyAlpha(fighter) === 0))", 'inline'),
  ('game.js', "    drawElastigirlFx(c, fighter)", "    drawNinjaFx(c, fighter)" + M + " illusion / clones / smoke / bubbles (render-only; ninjas only)", 'after'),
  ('game.js', "    elastigirlTest: elastigirlHarnessApi(", "    ninjaTest: ninjaHarnessApi({p1:()=>p1,p2:()=>p2,world:MSV1_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", 'after'),
  # ── combat.js ──
  ('combat.js', "import { spdRedBlockstun, spdRedHit, spdRedKnockback, spdRedComboScale, spdRedDamageMods } from './spdRedState.js'", "import { ninjaHitbox, ninjaEvades, ninjaKnockback, ninjaComboScale, isNinja } from './ninja.js'" + M + " Ninja Storm hooks (ninja-gated no-ops for everyone else)", 'after'),
  ('combat.js', "  if (a?.sr && fighter.rosterKey === 'spd_red') return spdRedHitbox(fighter)", "  if (a?.nj && isNinja(fighter)) return ninjaHitbox(fighter)" + M, 'after'),
  ('combat.js', "  if (fighter?.rosterKey === 'spd_red' && curve === COMBO_DAMAGE_CURVE) return spdRedComboScale(fighter)", "  if (curve === COMBO_DAMAGE_CURVE && isNinja(fighter)) return ninjaComboScale(fighter)" + M + " 85% per hit", 'after'),
  ('combat.js', "benAlienEvades(defender, { move: attacker.currentAttack, attacker }))", "benAlienEvades(defender, { move: attacker.currentAttack, attacker }) || ninjaEvades(defender, { move: attacker.currentAttack, attacker }))", 'inline'),
  ('combat.js', "benAlienEvades(fighter, { proj }))", "benAlienEvades(fighter, { proj }) || ninjaEvades(fighter, { proj }))", 'inline'),
  ('combat.js', "    spdRedKnockback(attacker, defender, atk)", "    ninjaKnockback(attacker, defender)" + M + " weight", 'after'),
  # ── physics.js ──
  ('physics.js', "import { dashParrWalkMul, dashParrPhasing } from './dashParrState.js'", "import { ninjaPhasing } from './ninja.js'" + M + " streak / burrow / vanish pass-through (false for everyone else)", 'after'),
  ('physics.js', "    if (dashParrPhasing(p1, p2)) return", "    if (ninjaPhasing(p1, p2)) return" + M, 'after'),
  # ── abilities.js ──
  ('abilities.js', "  if (fighter?.rosterKey === 'spd_red') return // Delta only comes from hits", "  if (fighter?._ninja) return" + M + ": Charge is the ninjas' \"Teleport\" button, never a meter charge", 'after'),
  # ── sprite.js ──
  ('sprite.js', "    if (fighter.rosterKey === 'spd_yellow') fighter._lastSpriteFrame = this.frameIndex;", "    if (fighter._ninja) fighter._lastSpriteFrame = this.frameIndex;" + M + ": presentation read for the Wind Mirage echo pose (nsFx)", 'after'),
  # ── input.js ──
  ('input.js', "&& !fighter._elastigirlRemoteInput) {", "&& !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput) {", 'inline'),
  ("input.js", "fighter.rosterKey === 'elastigirl') && !fighter._aiControlled", "fighter.rosterKey === 'elastigirl' || fighter.rosterKey === 'ns_red' || fighter.rosterKey === 'ns_yellow') && !fighter._aiControlled", 'inline'),
  ("input.js", "&& !fighter._elastigirlRemoteInput && inputSettings[", "&& !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput && inputSettings[", 'inline'),
  # ── ai.js ──
  ('ai.js', 'import { aiPickDroneTarget } from "./drones.js"', "import { ninjaAiPerceive } from './ninja.js'" + M + " CPU vs the Ninja Mirror: guesses by the visible tell (difficulty-rated) else hash — never reads the identity", 'after'),
  ('ai.js', "export function getAIInput(controller, fighter, opponent, world = {}) {", "  opponent = ninjaAiPerceive(fighter, opponent, controller?.difficulty)" + M + " (the opponent itself unless it is a ninja with the Mirror up)", 'after'),
  # ── roster / metadata ──
  ('characters.js', "import { spdRed } from './spdRedData.js'", "import { ns_red, ns_yellow } from './nsData.js'" + M + " Ninja Storm: Shane (Red Wind) + Dustin (Yellow Wind) — ninja.js / ns*.js on rangers.js", 'after'),
  ('characters.js', "  spd_red: spdRed,", "  ns_red, ns_yellow,                 // MSV1 Ninja Storm — Shane Clarke (Air Ninja / Aerial Rushdown) + Dustin Brooks (Earth Ninja / Trap & Burrow); ninja.js", 'after'),
  ('spritesheets.js', "  spd_red: { actions: { idle: './assets/spd_red/idle.png' } },", "  ns_red: { actions: { idle: './assets/ns_red/idle.png' } },   // MSV1 Shane (msv1Sprites.js strips)\n  ns_yellow: { actions: { idle: './assets/ns_yellow/idle.png' } },   // MSV1 Dustin", 'after'),
  ('skins.js', "  spd_red: [{ id: 'default',", "  ns_red: [{ id: 'default', name: 'Default', unlockLevel: 0, portrait: characters.ns_red.portrait, spriteScale: characters.ns_red.spriteScale, animationData: null }]," + M + "\n  ns_yellow: [{ id: 'default', name: 'Default', unlockLevel: 0, portrait: characters.ns_yellow.portrait, spriteScale: characters.ns_yellow.spriteScale, animationData: null }],", 'before'),
  ('kits.js', "import { SPD_YELLOW_KIT } from './spdYellowKit.js'", "import { NS_RED_KIT, NS_YELLOW_KIT } from './nsKit.js'" + M + " Ninja Storm move lists", 'after'),
  ('kits.js', "  spd_yellow: SPD_YELLOW_KIT,", "  ns_red: NS_RED_KIT, ns_yellow: NS_YELLOW_KIT," + M, 'after'),
  ('credits.js', "  spd_red: { work:", "  ns_red: { work: 'Ninja Storm Red Ranger — Power Rangers Super Legends (DS)', artists: ['Grim (ripper, spritedatabase.net)'],\n    source: 'Supplied sheet (MSV1). Credit text block excluded from the game (docs/msv1/CREDITS.md); flat sea-green background keyed; original pixels, nearest-neighbour, no art invented.',\n    files: ['assets/ns_red/*.png'] },\n  ns_yellow: { work: 'Ninja Storm Yellow Ranger — Power Rangers Super Legends (DS)', artists: ['Grim (ripper, spritedatabase.net)'],\n    source: 'Supplied sheet (MSV1), a palette swap of the Red sheet (docs/msv1/SPRITE_MAP.md). Credit text block excluded; original pixels, no art invented.',\n    files: ['assets/ns_yellow/*.png'] },", 'before'),
  ('sound.js', "import { SPD_RED_SOUNDS } from './spdRedSound.js'", "import { NS_SOUNDS } from './nsSound.js'" + M + " Ninja Storm synth SFX (SFX bus)", 'after'),
  ('sound.js', "  ...SPD_RED_SOUNDS,", "  ...NS_SOUNDS," + M + " nsr_* (Shane) / nsy_* (Dustin)", 'before'),
  ('rosterParity.js', "  spd_red: 1.6,", "  ns_red: 1.6, ns_yellow: 1.6," + M + " Ninja Storm: S.P.D. Red's tier (same authoring scale as his frame data)", 'before'),
  ('ui.js', "import { drawSpdRedHud } from './spdRedFx.js'", "import { drawNinjaHud } from './nsFx.js'" + M + " Ninja Power bar", 'after'),
  ('ui.js', "    drawSpdRedHud(ctx, fighter, { x, enY, pbw, flip })", "    drawNinjaHud(ctx, fighter, { x, enY, pbw, flip, hpY, barH })" + M + " Ninja Power bar under health (ninjas only)", 'after'),
  # ── MSV1-MERGE: Shane & Dustin (windrangers) = one character, two forms (nsDuo.js) ──
  ('characters.js', "import { ns_red, ns_yellow } from './nsData.js'", "import { windrangers } from './nsDuo.js'" + MM + " Shane & Dustin: ONE character, the two Ninja Storm forms (ns_red / ns_yellow stay as hidden form profiles)", 'after'),
  ('characters.js', "  ns_red, ns_yellow,", "  windrangers,                       // MSV1-MERGE Shane & Dustin — Wind Rangers (Ninja Duo / Form Swapper); swaps ns_red ⇄ ns_yellow", 'after'),
  ('spritesheets.js', "  ns_red: { actions: { idle: './assets/ns_red/idle.png' } },", "  windrangers: { actions: { idle: './assets/ns_red/idle.png' } }," + MM + " Shane & Dustin (starts on the form's own sheets)", 'before'),
  ('skins.js', "  ns_red: [{ id: 'default',", "  windrangers: [{ id: 'default', name: 'Start as: Red (Shane)', unlockLevel: 0, portrait: characters.ns_red.portrait, spriteScale: characters.ns_red.spriteScale, animationData: null }, { id: 'start_yellow', name: 'Start as: Yellow (Dustin)', unlockLevel: 0, portrait: characters.ns_yellow.portrait, spriteScale: characters.ns_yellow.spriteScale, animationData: null }]," + MM + " start form = skin", 'before'),
  ('kits.js', "import { NS_RED_KIT, NS_YELLOW_KIT } from './nsKit.js'", "import { NS_DUO_KIT } from './nsKit.js'" + MM + " Shane & Dustin move list (active form + TAB toggle)", 'after'),
  ('kits.js', "  ns_red: NS_RED_KIT, ns_yellow: NS_YELLOW_KIT,", "  windrangers: NS_DUO_KIT," + MM, 'after'),
  ('credits.js', "  ns_red: { work:", "  windrangers: { work: 'Ninja Storm Red + Yellow Rangers — Power Rangers Super Legends (DS)', artists: ['Grim (ripper, spritedatabase.net)'],\n    source: 'Shane & Dustin plays the two MSV1 sheets (assets/ns_red, assets/ns_yellow); the select portrait is a composite of the two supplied portraits, no art invented.',\n    files: ['assets/windrangers/*.png', 'assets/ns_red/*.png', 'assets/ns_yellow/*.png'] }," + MM, 'before'),
  ('rosterParity.js', "  ns_red: 1.6, ns_yellow: 1.6,", "  windrangers: 1.6," + MM + " (its live rosterKey is always a form id)", 'after'),
  ('ai.js', "import { ninjaAiPerceive } from './ninja.js'", "import { duoAiInput } from './nsDuo.js'" + MM + " CPU form swap through the real ↓↓ + Grab input (visible state only)", 'after'),
  ('ai.js', "  return aiHuntDrones(controller, fighter, updateAIController(controller, fighter, opponent, world))", "  return duoAiInput(controller, fighter, opponent, aiHuntDrones(controller, fighter, updateAIController(controller, fighter, opponent, world)))", 'inline'),
  ('game.js', "import { tickNinja, isNinja, clearNinja, ninjaRoundReset, ninjaBodyAlpha, ninjaSnapshot } from './ninja.js'", "import { duoResolveSaved, duoPreloadKeys } from './nsDuo.js'; import { duoKitView, duoKitToggle } from './nsKit.js'; import { TRANSFORM_ENERGY as MSV1_TE } from './fighters.js'" + MM + " Shane & Dustin", 'after'),
  ('game.js', "const MSV1_WORLD = { ...SPD_RED_WORLD, frame:", "MSV1_WORLD.benSwap = () => ({ dbl: OMX_DOUBLE_TAP_WINDOW, arm: OMX_ARM_WINDOW, cost: MSV1_TE.SWAP_COST, lockout: MSV1_TE.SWAP_LOCKOUT })" + MM + ": the duo's form swap reads Ben 10's live swap numbers", 'after'),
  ('game.js', '  if (typeof m.p2Skin === "string") matchConfig.p2Skin = m.p2Skin', "  for (const _sd of ['p1', 'p2']) { const _r = duoResolveSaved(matchConfig[_sd + 'CharKey'], matchConfig[_sd + 'Skin']); if (_r.key !== matchConfig[_sd + 'CharKey']) { matchConfig[_sd + 'CharKey'] = _r.key; matchConfig[_sd + 'Char'] = characters[_r.key]; matchConfig[_sd + 'Skin'] = _r.skin } }" + MM + ": a saved ns_red / ns_yellow pick → Shane & Dustin starting as that ranger", 'after'),
  ('game.js', "  if (matchConfig.p2CharKey) { preloadCharacterSprites?.(matchConfig.p2CharKey); loadSpriteSheets(matchConfig.p2CharKey) }", "  for (const _k of duoPreloadKeys(matchConfig)) { preloadCharacterSprites?.(_k); loadSpriteSheets(_k) }" + MM + ": both forms' sheets", 'after'),
  ('game.js', "fl.findIndex(f => f.key === p1?.rosterKey)", "fl.findIndex(f => f.key === (p1?._duo ? (duoKitView(p1._duo.form), p1._duo.id) : p1?.rosterKey))", 'inline'),
  ('game.js', 'window.addEventListener("keydown", e => {\n  const key = String(e.key || "").toLowerCase()\n', '  if (gameState === GAME_STATES.MOVE_LIST && key === "tab" && getMoveListFighters()[moveListIndex]?.key === "windrangers") { e.preventDefault(); duoKitToggle(); moveListPanelScroll = 0; return }' + MM + ': Shane ⇄ Dustin list\n', 'after'),
]

# earlier versions of a hook line (an older commit carries them): dropped before the table is applied, so the result
# is the same whether the base is the pre-MSV1 commit or a commit that already had the old line
SUPERSEDED = [('game.js', "const MSV1_WORLD = { ...SPD_RED_WORLD, attackBoxRaw:")]

def apply(path, text):
    out, notes = text, []
    for f, prefix in SUPERSEDED:
        if f == path: out = ''.join(l for l in out.splitlines(True) if not l.startswith(prefix))
    for h in HOOKS:
        f, anchor, ins, mode = h[0], h[1], h[2], h[3]
        allocc = len(h) > 4 and h[4] == 'all'
        if f != path: continue
        if mode == 'inline':
            if ins in out: continue
            n = out.count(anchor)
            if n == 0: notes.append(f'MISSING anchor in {f}: {anchor[:70]!r}'); continue
            if n > 1 and not allocc: notes.append(f'AMBIGUOUS ({n}) anchor in {f}: {anchor[:70]!r}'); continue
            out = out.replace(anchor, ins)
            continue
        first_line = ins.split('\n')[0]
        n = out.count(anchor)
        if n == 0: notes.append(f'MISSING anchor in {f}: {anchor[:70]!r}'); continue
        if n > 1 and not allocc: notes.append(f'AMBIGUOUS ({n}) anchor in {f}: {anchor[:70]!r}'); continue
        if out.count(first_line) >= (n if allocc else 1): continue
        pos, res = 0, []
        while True:
            i = out.find(anchor, pos)
            if i < 0: res.append(out[pos:]); break
            if mode == 'after':
                if anchor.endswith('\n'): end = i + len(anchor); res.append(out[pos:end] + ins); pos = end
                else:
                    end = out.find('\n', i + len(anchor)); end = len(out) if end < 0 else end + 1
                    res.append(out[pos:end] + ins + '\n'); pos = end
            else:   # before: insert on its own line(s) before the anchor's line
                ls = out.rfind('\n', 0, i) + 1
                res.append(out[pos:ls] + ins + '\n' + out[ls:i + len(anchor)]); pos = i + len(anchor)
            if not allocc: res.append(out[pos:]); break
        out = ''.join(res)
    return out, notes

FILES = sorted({h[0] for h in HOOKS})
if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    bad = []
    for f in FILES:
        if cmd == 'blobs':
            rev = sys.argv[2]
            src = subprocess.run(['git', 'show', f'{rev}:{f}'], cwd=ROOT, capture_output=True, check=True).stdout.decode()
            new, notes = apply(f, src); bad += notes
            blob = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=ROOT, input=new.encode(), capture_output=True, check=True).stdout.decode().strip()
            print(f, blob)
        else:
            p = os.path.join(ROOT, f); src = open(p).read()
            new, notes = apply(f, src); bad += notes
            if cmd == 'worktree' and new != src: open(p, 'w').write(new); print('hooked', f)
            elif cmd == 'check': print(f, 'changes pending' if new != src else 'ok')
    for b in bad: print(b, file=sys.stderr)
    sys.exit(1 if bad else 0)
