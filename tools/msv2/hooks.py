#!/usr/bin/env python3
"""MSv2 NINJA STORM RANGERS engine hooks — idempotent, anchor-based insertions into SHARED engine files
(rosterKey 'ninja_storm_rangers'-gated, a no-op for everyone else). Same machinery as tools/msv1/hooks.py.

  python3 tools/msv2/hooks.py blobs <rev>     apply to <rev>'s clean blobs → `git hash-object -w`, print "path blob" lines
  python3 tools/msv2/hooks.py export <dir>    write the hooked HEAD-of-branch versions into <dir> (test tree)
  python3 tools/msv2/hooks.py check           report which hooks are present in the worktree (never writes it)

The worktree's shared files are NEVER written (other sessions' dirty edits live there): commits go through a private
index (tools/msv2/build_tree.sh) and tests run on an exported tree.
"""
import subprocess, sys, os
ROOT = os.environ.get('MSV2_ROOT') or os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = '   // MSv2'
K = "'ninja_storm_rangers'"
HOOKS = [
  # ── rangers.js: GENERALIZED BLINK parameters (Ninja Vanish = the Blink; a per-fighter override for Lightning Mode's
  #    −1 f startup). No override = the profile's own frozen object → every S.P.D. Ranger is byte-identical in behaviour.
  ('rangers.js', "export const blinkTotal = p => p.blink.startup + p.blink.travel + p.blink.recovery",
   "// GENERALIZED BLINK PARAMETERS (MSv2 Ninja Academy): a fighter may carry a temporary per-fighter override on its own\n"
   "// Ranger state (`f._ranger.blinkMod`, plain JSON → GAME_STATE), e.g. Lightning Mode's −1 f Vanish startup. No override\n"
   "// (every S.P.D. Ranger) → the profile's own frozen object, so their numbers are untouched.\n"
   "export function blinkParams(f, p = getRangerProfile(f)) {\n  const m = f?._ranger?.blinkMod\n  return m ? { ...p.blink, ...m } : p.blink\n}", 'after'),
  ('rangers.js', "  const b = r.blink, B = p.blink, t = b.t", "  const b = r.blink, B = blinkParams(f, p), t = b.t", 'inline'),
  ('rangers.js', "  const B = getRangerProfile(f).blink\n  if (b.phase === 'travel') return 0", "  const B = blinkParams(f)\n  if (b.phase === 'travel') return 0", 'inline'),
  # ── game.js ──
  ('game.js', "import { rangerFacingFix } from './rangers.js'",
   "import { tickNinjaStorm, isNinjaStorm, clearNinjaStorm, ninjaStormSnapshot } from './ninjaStormState.js'" + M + " NINJA STORM RANGERS (one fighter, Red / Yellow stance; ninjaAcademy.js)\n"
   "import { updateNinjaStormCommandCombat } from './ninjaStorm.js'" + M + " command layer\n"
   "import { drawNinjaStormFx, drawNinjaStormUnder, ninjaStormBodyAlpha, takeNinjaStormCues } from './ninjaStormFx.js'" + M + " render-only FX + cues\n"
   "import { ninjaStormHarnessApi } from './ninjaStormHarness.js'" + M + " test accessor", 'after'),
  ('game.js', "const ARLONG_WORLD = {",
   "const MSV2_WORLD = { ...SPD_RED_WORLD, frame: () => _replayFrame, projectileList: () => activeProjectiles }" + M + " Ninja Storm Rangers world (S.P.D. Red's + the LOCKSTEP sim frame + the projectile list)", 'before'),
  ('game.js', "  tickNinja(fighter, nearest", "  tickNinjaStorm(fighter, nearest, readRawControls(fighter) || {}, MSV2_WORLD); for (const _c of takeNinjaStormCues(fighter)) sound.play(_c)" + M + " (FFA step)", 'after'),
  ('game.js', "  tickNinja(fighter, getOpponent(fighter)", "  tickNinjaStorm(fighter, getOpponent(fighter), readRawControls(fighter) || {}, MSV2_WORLD); for (const _c of takeNinjaStormCues(fighter)) sound.play(_c)" + M + " (1v1 step)", 'after'),
  # KAWARIMI out of hit / block stun: read AHEAD of the stun early-return (like Sasuke's Rinnegan counter swap)
  ('game.js', "  tickNinjaStorm(fighter, nearest, readRawControls(fighter)", "  if (isNinjaStorm(fighter) && (fighter.hitstun > 0 || fighter.blockstun > 0) && updateNinjaStormCommandCombat(fighter, getFighterInput(fighter), nearest)) { updateCombat(fighter, nearest, {}, opts); return }" + M + " Kawarimi out of stun (FFA)", 'after'),
  ('game.js', "  // CRITICAL: updateCombat() is the ONLY place hitstun/hitstop/blockstun and the", "  if (isNinjaStorm(fighter) && (fighter.hitstun > 0 || fighter.blockstun > 0) && updateNinjaStormCommandCombat(fighter, getFighterInput(fighter), getOpponent(fighter))) { updateCombat(fighter, getOpponent(fighter), {}, opts); return }" + M + " Kawarimi out of stun (1v1)", 'before'),
  ('game.js', "  if (isNinja(fighter)) { const nc=updateNinjaCommand", "  if (isNinjaStorm(fighter)) { const nc=updateNinjaStormCommandCombat(fighter,inputState,nearest);if(nc)ctrlState=nc==='grab'?{grab:!!inputState.grab}:{} }" + M + " command layer (FFA)", 'after'),
  ('game.js', "  if (isNinja(fighter)) {   // MSV1 ninja command layer",
   "  if (isNinjaStorm(fighter)) {" + M + " command layer: 'consumed' | 'grab' | false\n"
   "    const nc = updateNinjaStormCommandCombat(fighter, inputState, getOpponent(fighter))\n"
   "    if (nc) { updateCombat(fighter, getOpponent(fighter), nc === 'grab' ? { grab: !!inputState.grab } : {}, opts); return }\n  }", 'before'),
  ('game.js', "  if (isNinja(f)) snap.push(JSON.stringify(ninjaSnapshot(f)))", "  if (isNinjaStorm(f)) snap.push(JSON.stringify(ninjaStormSnapshot(f)))" + M + " GAME_STATE (stance, Focus lockout, clone, echoes, Mode, lock-on, Ultimate)", 'after'),
  ('game.js', "  for (const _f of [p1, p2]) if (_f) ninjaRoundReset(_f)", "  for (const _f of [p1, p2]) if (_f) clearNinjaStorm(_f, MSV2_WORLD)" + M + " every round opens in Red stance", 'after', 'all'),
  ('game.js', "    clearNinja(f)   // MSV1", "    clearNinjaStorm(f, MSV2_WORLD)" + M, 'after'),
  ('game.js', "    if (isNinja(f)) f._msv1RemoteInput = replay.isPlayback() || netMatch.isActive()", "    if (isNinjaStorm(f)) f._nsrRemoteInput = replay.isPlayback() || netMatch.isActive()" + M, 'after'),
  ('game.js', "    drawNinjaUnder(c, fighter)", "    drawNinjaStormUnder(c, fighter)" + M + " Vanish streak / Kawarimi streaks, BEHIND the body (render-only)", 'after'),
  ('game.js', "* ninjaBodyAlpha(fighter) *", "* ninjaBodyAlpha(fighter) * ninjaStormBodyAlpha(fighter) *", 'inline'),
  ('game.js', "    drawNinjaFx(c, fighter)", "    drawNinjaStormFx(c, fighter)" + M + " clone ghost / stance ring / Mode aura / lock-on / Ultimate burst (render-only)", 'after'),
  ('game.js', "    ninjaTest: ninjaHarnessApi(", "    nsrTest: ninjaStormHarnessApi({p1:()=>p1,p2:()=>p2,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", 'after'),
  # ── combat.js ──
  ('combat.js', "import { ninjaHitbox, ninjaEvades, ninjaKnockback, ninjaComboScale, isNinja } from './ninja.js'",
   "import { ninjaStormHitbox, ninjaStormBlock, ninjaStormHit, ninjaStormKnockback, nsComboScale, ninjaStormDamageMods, isNinjaStorm } from './ninjaStormState.js'" + M + " Ninja Storm Rangers hooks (no-ops for everyone else)", 'after'),
  ('combat.js', "  rawDamage = spdRedDamageMods(target, rawDamage, opts)", "  rawDamage = ninjaStormDamageMods(target, rawDamage, opts)" + M + " Lightning +15% / Quake −10% taken / post-dodge +15%", 'after'),
  ('combat.js', "  if (curve === COMBO_DAMAGE_CURVE && isNinja(fighter)) return ninjaComboScale(fighter)", "  if (curve === COMBO_DAMAGE_CURVE && isNinjaStorm(fighter)) return nsComboScale(fighter)" + M + " 85% per hit", 'after'),
  ('combat.js', "  if (a?.nj && isNinja(fighter)) return ninjaHitbox(fighter)", "  if (a?.nsr && isNinjaStorm(fighter)) return ninjaStormHitbox(fighter)" + M, 'after'),
  ('combat.js', "    if (!flawless) spdRedBlockstun(attacker, defender, atk)", "    if (!flawless) ninjaStormBlock(attacker, defender, atk)" + M + " per-move block stun + Focus on a blocked hit", 'after'),
  ('combat.js', "    spdRedHit(attacker, defender, atk)", "    ninjaStormHit(attacker, defender, atk)" + M + " Focus, clone echo, string knockdown", 'after'),
  ('combat.js', "    ninjaKnockback(attacker, defender)   // MSV1 weight", "    ninjaStormKnockback(attacker, defender)" + M + " stance weight (0.8 Red / 0.85 Yellow)", 'after'),
  # ── abilities.js ──
  ('abilities.js', "import { spdRedRegen } from './spdRedState.js'", "import { ninjaStormRegen } from './ninjaStormState.js'" + M + " Focus passive (+1 / 40 f) replaces the shared regen", 'after'),
  ('abilities.js', "  if (spdRedRegen(fighter)) return", "  if (ninjaStormRegen(fighter)) return" + M, 'after'),
  ('abilities.js', "  if (fighter?._ninja) return   // MSV1", "  if (fighter?.rosterKey === " + K + ") return" + M + ": Focus only comes from hits, blocks, the passive and Vanish dodges", 'after'),
  # ── input.js (raw pad snapshot for the command layer; replay / LAN feed the injected raw) ──
  ('input.js', "&& !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput) {", "&& !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput && !fighter._nsrRemoteInput) {", 'inline'),
  ('input.js', "|| fighter.rosterKey === 'ns_yellow'", "|| fighter.rosterKey === 'ns_yellow' || fighter.rosterKey === " + K, 'inline'),   # gamepad raw snapshot (anchor = the ns_yellow term only, so other keys added after it don't break it)
  ('input.js', "&& !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput && inputSettings[", "&& !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput && !fighter._nsrRemoteInput && inputSettings[", 'inline'),
  # ── roster / metadata (ONE entry) ──
  ('characters.js', "import { windrangers } from './nsDuo.js'", "import { ninjaStormRangers } from './ninjaStormData.js'" + M + " NINJA STORM RANGERS: ONE fighter, Red (Shane) / Yellow (Dustin) stance", 'after'),
  ('characters.js', "  windrangers,  ", "  ninja_storm_rangers: ninjaStormRangers,   // MSv2 Ninja Storm Rangers — Teleport Rushdown / Mixup Ninja, dual-stance (ninjaAcademy.js)", 'after'),
  ('spritesheets.js', "  windrangers: { actions:", "  ninja_storm_rangers: { actions: { idle: './assets/ninja_storm/red/idle.png' } }," + M + " (strips: ninjaStormSprites.js)", 'after'),
  ('skins.js', "  windrangers: [{ id: 'default',", "  ninja_storm_rangers: [{ id: 'default', name: 'Default', unlockLevel: 0, portrait: characters.ninja_storm_rangers.portrait, spriteScale: characters.ninja_storm_rangers.spriteScale, animationData: null }]," + M, 'before'),
  ('kits.js', "import { NS_DUO_KIT } from './nsKit.js'", "import { NINJA_STORM_KIT } from './ninjaStormKit.js'" + M + " Ninja Storm Rangers move list", 'after'),
  ('kits.js', "  windrangers: NS_DUO_KIT,", "  ninja_storm_rangers: NINJA_STORM_KIT," + M, 'after'),
  ('credits.js', "  windrangers: { work:", "  ninja_storm_rangers: { work: 'Ninja Storm Red + Yellow Rangers — Power Rangers Super Legends (DS)', artists: ['Grim (ripper, spritedatabase.net)'],\n"
   "    source: 'Ninja Storm Red/Yellow Ranger from \\'Power Rangers Super Legends\\' (DS), ripped by Grim, spritedatabase.net. Supplied sheets (MSv2); the credit block is excluded from every frame; original pixels, nearest-neighbour, no art invented (docs/ninja_storm_rangers/SPRITE_LEDGER.md).',\n"
   "    files: ['assets/ninja_storm/red/*.png', 'assets/ninja_storm/yellow/*.png'] }," + M, 'before'),
  ('sound.js', "import { NS_SOUNDS } from './nsSound.js'", "import { NINJA_STORM_SOUNDS } from './ninjaStormSound.js'" + M + " Ninja Storm Rangers synth SFX (SFX bus)", 'after'),
  ('sound.js', "  ...NS_SOUNDS,", "  ...NINJA_STORM_SOUNDS," + M + " msv2r_* (Red stance) / msv2y_* (Yellow stance)", 'after'),
  ('rosterParity.js', "  windrangers: 1.6,", "  ninja_storm_rangers: 1.6," + M + " Ninja Storm Rangers: S.P.D. Red's tier (same authoring scale as his frame data)", 'after'),
  ('ui.js', "import { drawNinjaHud } from './nsFx.js'", "import { drawNinjaStormHud } from './ninjaStormFx.js'" + M + " Vanish pips / stance tag / clone + Mode bars", 'after'),
  ('ui.js', "    drawNinjaHud(ctx, fighter, { x, enY, pbw, flip, hpY, barH })", "    drawNinjaStormHud(ctx, fighter, { x, enY, pbw, flip })" + M, 'after'),
]

# earlier versions of a hook line (an older commit carries them): dropped before the table is applied, so the result
# is the same whether the base is the pre-MSV1 commit or a commit that already had the old line
SUPERSEDED = []

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
        if cmd == 'export':
            out = sys.argv[2]
            src = open(os.path.join(ROOT, f)).read() if False else subprocess.run(['git', 'show', f'{os.environ.get("MSV2_BASE", "feat/msv2-ninja-storm-wind-rangers")}:{f}'], cwd=ROOT, capture_output=True, check=True).stdout.decode()
            new, notes = apply(f, src); bad += notes
            open(os.path.join(out, f), 'w').write(new); print('exported', f)
        elif cmd == 'blobs':
            rev = sys.argv[2]
            src = subprocess.run(['git', 'show', f'{rev}:{f}'], cwd=ROOT, capture_output=True, check=True).stdout.decode()
            new, notes = apply(f, src); bad += notes
            blob = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=ROOT, input=new.encode(), capture_output=True, check=True).stdout.decode().strip()
            print(f, blob)
        else:
            p = os.path.join(ROOT, f); src = open(p).read()
            new, notes = apply(f, src); bad += notes
            if cmd == 'check': print(f, 'changes pending' if new != src else 'ok')
    for b in bad: print(b, file=sys.stderr)
    sys.exit(1 if bad else 0)
