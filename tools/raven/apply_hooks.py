#!/usr/bin/env python3
"""Raven: idempotent, narrow registration hooks in shared files.
Each hook = (file, anchor, op, text). anchor must occur EXACTLY once (asserted); op 'after_line' inserts `text` as new
line(s) after the line containing anchor; op 'replace' substitutes anchor -> text within that one occurrence.
A hook whose marker ('raven' text) is already present is skipped, so re-running is a no-op. Other writers' lines are
never touched; the file is re-read immediately before each patch and written only if changed.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  raven: { work: 'Raven — Teen Titans (Game Boy Advance), playable-character sheet', artists: ['Mr. C (ripper)'],\n"
  "    source: 'Supplied sheet \"Game Boy Advance - Teen Titans - Playable Characters - Raven.png\". Visible credit panel: \"Brought to you by… Mr. C — Credit? No / Permission? No\" (quoted verbatim; excluded from animation). Original pixels; only the exact key colour RGB(77,109,243) removed (the black outlines and the black Soul Shell disc are kept); nearest-neighbour only. SHA-256 + rects in docs/raven/source_rects.json.',\n"
  "    files: ['assets/raven/**'] },")
HOOKS = [
  ('characters.js', "import { beast_boy } from './beastBoyData.js'", 'after_line',
   "import { raven } from './ravenData.js'   // Raven (Rachel Roth, DC / Teen Titans GBA art) — raven*.js", "from './ravenData.js'"),
  ('characters.js', "  beast_boy,                         // Beast Boy (Gar Logan, DC)", 'after_line',
   "  raven,                             // Raven (Rachel Roth, DC) — Mobile Spellweaver / Telekinetic Setup (Dark Pulse, brick piles, infusion, Soul Shell, levitation); raven*.js", "  raven,  "),
  ('spritesheets.js', "  beast_boy: { actions: { idle: './assets/beast_boy/idle.png' } },", 'after_line',
   "  raven: { actions: { idle: './assets/raven/idle.png' } },", "assets/raven/idle.png"),
  ('kits.js', "import { BEAST_BOY_KIT } from './beastBoyKit.js'", 'after_line',
   "import { RAVEN_KIT } from './ravenKit.js'   // Raven (raven) Move List", "ravenKit.js"),
  ('kits.js', "  beast_boy: BEAST_BOY_KIT,", 'after_line', "  raven: RAVEN_KIT,", "raven: RAVEN_KIT"),
  ('skins.js', "import { BEAST_BOY_SKINS } from './beastBoySkins.js'", 'after_line',
   "import { RAVEN_SKINS } from './ravenSkins.js'   // Raven default + 10 skins (cosmetic, precomputed; cached materials)", "ravenSkins.js"),
  ('skins.js', "  beast_boy: BEAST_BOY_SKINS,", 'after_line', "  raven: RAVEN_SKINS,", "raven: RAVEN_SKINS"),
  ('sound.js', "import { BEAST_BOY_SOUNDS } from './beastBoySound.js'", 'after_line',
   "import { RAVEN_SOUNDS } from './ravenSound.js'   // Raven synth SFX (SFX bus; voice bus untouched; no dialogue)", "ravenSound.js"),
  ('sound.js', "  ...BEAST_BOY_SOUNDS, // beastboy_*", 'after_line',
   "  ...RAVEN_SOUNDS, // raven_* : dark pulse hum, brick lift / thud / crumble, infuse chime, verdict warning, shell up / hit / end, reject, ultimate release", "...RAVEN_SOUNDS"),
  ('credits.js', "    files: ['assets/beast_boy/**'] },", 'after_line', CREDIT, "assets/raven/**"),
  ('combat.js', "import { beastBoyHitbox, beastBoyHurtbox, beastBoyBlock, beastBoyHit } from './beastBoyState.js'", 'after_line',
   "import { ravenHitbox, ravenBlock, ravenHit, ravenProjectileHit, absorbRaven } from './ravenState.js'   // Raven hooks (raven-gated)", "from './ravenState.js'"),
  ('combat.js', "  if (a?.bb && fighter.rosterKey === 'beast_boy') return beastBoyHitbox(fighter)", 'after_line',
   "  if (a?.rv && fighter.rosterKey === 'raven') return ravenHitbox(fighter)   // Raven: per-move palm box; spells (orb / piles / bricks / shell) have no body box", "return ravenHitbox(fighter)"),
  ('combat.js', "  if (absorbSpdBlue(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }", 'after_line',
   "  if (absorbRaven(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }   // Raven Soul Shell: frontal contact absorbed (grabs / ultimates / unblockables bypass); raven-gated", "absorbRaven(defender"),
  ('combat.js', "    if (!flawless) beastBoyBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) ravenBlock(attacker, defender, atk)   // Raven: authored blockstun; raven-gated", "ravenBlock(attacker"),
  ('combat.js', "    beastBoyHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    ravenHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Raven: clean flag (chain / special / ult cancels); raven-gated", "ravenHit(attacker"),
  ('combat.js', "      if (absorbSpdBlue(fighter, proj.owner, proj, true)) { projectiles.splice(i, 1); break }", 'after_line',
   "      if (absorbRaven(fighter, proj.owner, proj, true)) { projectiles.splice(i, 1); break }   // Raven Soul Shell: frontal projectile absorbed; raven-gated", "absorbRaven(fighter"),
  ('combat.js', "      cyborgProjectileHit(proj, fighter, {armored:!!supArmoredProj})", 'after_line',
   "      ravenProjectileHit(proj, fighter, {armored:!!supArmoredProj})   // Raven: orb / brick contact bookkeeping (hit flag, impact FX, ultimate confirm); raven-gated", "ravenProjectileHit(proj"),
  ('sprite.js', "  if (fighter.rosterKey === 'beast_boy' && !fighter.attacking && (fighter._bbLand || 0) > 0", 'after_line',
   "  if (fighter.rosterKey === 'raven' && !fighter.attacking && fighter._rvPose && !fighter.isBlocking && (fighter._rvPose !== 'land' || ((fighter.grounded ?? fighter.onGround) && Math.abs(fighter.vx || 0) <= 0.1)) && (fighter._skinAnim?.[fighter._rvPose] || fighter.animationData?.[fighter._rvPose])) return fighter._rvPose;   // Raven: levitation start / loop / exit and the supplied landing frames (sim-set pose, render only)", "fighter._rvPose"),
  ('sprite.js', "    if (fighter.rosterKey === 'beast_boy') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'raven') fighter._lastSpriteFrame = this.frameIndex;   // Raven: presentation read for skin material overlays (ravenFx)", "rosterKey === 'raven') fighter._lastSpriteFrame"),
  ('input.js', "!fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput) {", 'replace',
   "!fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput && !fighter._ravenRemoteInput) {", "!fighter._ravenRemoteInput) {"),
  ('input.js', "|| fighter.rosterKey === 'beast_boy') && !fighter._aiControlled", 'replace',
   "|| fighter.rosterKey === 'beast_boy' || fighter.rosterKey === 'raven') && !fighter._aiControlled", "fighter.rosterKey === 'raven') && !fighter._aiControlled"),
  ('input.js', "!fighter._beastBoyRemoteInput && inputSettings[", 'replace',
   "!fighter._beastBoyRemoteInput && !fighter._ravenRemoteInput && inputSettings[", "!fighter._ravenRemoteInput && inputSettings["),
]
GAME = [
  ("import { beastBoyHarnessApi } from './beastBoyHarness.js'", 'after_line',
   "import { updateRavenCommandCombat } from './raven.js'   // Raven (Rachel Roth, DC) — raven-gated command layer\nimport { tickRaven, isRaven, clearRaven, ravenLocked, isRavenUltActive, updateRavenUlt, clearRavenUlt } from './ravenState.js'\nimport { drawRavenFx, drawRavenHud, playRavenCues } from './ravenFx.js'\nimport { ravenHarnessApi } from './ravenHarness.js'", "from './raven.js'"),
  ("const BEAST_BOY_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const RAVEN_WORLD = MMPR_BLACK_WORLD   // Raven: the same self-contained world (stage width for pile bounds, projectiles, ultimate damage through W.damage)", "const RAVEN_WORLD"),
  ("isBeastBoyUltActive() || isSamuraiFlameSmasherCinematicActive()", 'replace',
   "isBeastBoyUltActive() || isRavenUltActive() || isSamuraiFlameSmasherCinematicActive()", "isRavenUltActive() || isSamurai"),
  ("  clearBeastBoyUlt()   // Beast Boy ANIMAL INSTINCT (freeze contract)", 'after_line',
   "  clearRavenUlt()   // Raven AZARATH (freeze contract)", "clearRavenUlt()   // Raven AZARATH", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearBeastBoy(_f)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearRaven(_f,RAVEN_WORLD)", "if (_f) clearRaven(_f,RAVEN_WORLD)", 4),
  ("  tickBeastBoy(fighter,nearest,readRawControls(fighter)||{},BEAST_BOY_WORLD)\n  playBeastBoyCues(fighter)", 'after_line',
   "  tickRaven(fighter,nearest,readRawControls(fighter)||{},RAVEN_WORLD)\n  playRavenCues(fighter)", "tickRaven(fighter,nearest,"),
  ("  if (isBeastBoy(fighter)) { const mc=updateBeastBoyCommandCombat(fighter,inputState,nearest,BEAST_BOY_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isRaven(fighter)) { const mc=updateRavenCommandCombat(fighter,inputState,nearest,RAVEN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateRavenCommandCombat(fighter,inputState,nearest"),
  ("clearBeastBoy(p1);clearBeastBoy(p2)", 'replace',
   "clearBeastBoy(p1);clearBeastBoy(p2);clearRaven(p1,RAVEN_WORLD);clearRaven(p2,RAVEN_WORLD)", "clearRaven(p1,RAVEN_WORLD);clearRaven(p2", 2),
  ("  if (isBeastBoy(f)) snap.push(JSON.stringify([f._beastBoy || null, f.currentAttack?.bb || null]))", 'after_line',
   "  if (isRaven(f)) snap.push(JSON.stringify([f._raven || null, f.currentAttack?.rv || null, f._rvPose || null, f._rvLand || 0]))   // Raven GAME_STATE (piles, live spells, levitation, shell, airtime allowances, press edges, move descriptor)", "f._raven || null, f.currentAttack?.rv"),
  ("beastBoyLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "beastBoyLocked(fighter, readRawControls(fighter)) || ravenLocked(fighter, readRawControls(fighter)) ||", "ravenLocked(fighter, readRawControls"),
  ("!isTransformDevice(fighter) && !isCyborg(fighter) && !fighter.attacking", 'replace',
   "!isTransformDevice(fighter) && !isCyborg(fighter) && !isRaven(fighter) && !fighter.attacking", "!isRaven(fighter) && !fighter.attacking"),
  ("  tickBeastBoy(fighter,getOpponent(fighter),readRawControls(fighter)||{},BEAST_BOY_WORLD)\n  playBeastBoyCues(fighter)", 'after_line',
   "  tickRaven(fighter,getOpponent(fighter),readRawControls(fighter)||{},RAVEN_WORLD)\n  playRavenCues(fighter)", "tickRaven(fighter,getOpponent"),
  ("    const mc=updateBeastBoyCommandCombat(fighter,inputState,getOpponent(fighter),BEAST_BOY_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isRaven(fighter)) {   // Raven command layer: 'consumed' | 'grab'\n    const mc=updateRavenCommandCombat(fighter,inputState,getOpponent(fighter),RAVEN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateRavenCommandCombat(fighter,inputState,getOpponent"),
  ("    clearCyborg(f,CYBORG_WORLD)\n    clearBeastBoy(f)", 'after_line', "    clearRaven(f,RAVEN_WORLD)", "    clearRaven(f,RAVEN_WORLD)"),
  ("    if (isBeastBoy(f)) f._beastBoyRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isRaven(f)) f._ravenRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._ravenRemoteInput = replay"),
  ("    updateBeastBoyUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // RAVEN \"AZARATH — THE ROOM OBEYS\": the same freeze contract (ravenState.js).\n  if (isRavenUltActive()) {\n    updateRavenUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateRavenUlt()"),
  ("    drawBeastBoyFx(c, fighter)", 'after_line',
   "    drawRavenFx(c, fighter)   // Raven — piles, spell FX, Verdict warning, levitation shadow, double-jump ring, skin material (render-only; raven only)", "drawRavenFx(c, fighter)"),
  ("    && !(a.rosterKey === \"beast_boy\" && a.skinId !== b.skinId)", 'after_line',
   "    && !(a.rosterKey === \"raven\" && a.skinId !== b.skinId)   // Raven: same rule", "a.rosterKey === \"raven\""),
  ("  drawBeastBoyHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawRavenHud(ctx, canvas, p1, p2)   // Raven: pile pips + levitation / shell timers + expression icon under her health; AZARATH cut-in (gated)", "drawRavenHud(ctx"),
  ("    beastBoyTest: beastBoyHarnessApi(", 'after_line',
   "    ravenTest: ravenHarnessApi({p1:()=>p1,p2:()=>p2,world:RAVEN_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "ravenTest: ravenHarnessApi"),
]
HOOKS += [('game.js',) + g for g in GAME]
def main():
  a = sys.argv[1:]; check = '--check' in a
  root = a[a.index('--root') + 1] if '--root' in a else ROOT
  only = set(a[a.index('--only') + 1:]) if '--only' in a else None
  bad = 0
  for fn in sorted({h[0] for h in HOOKS}):
    if only and fn not in only: continue
    p = os.path.join(root, fn); src = open(p, encoding='utf-8').read(); out = src
    for h in HOOKS:
      f, anchor, op, text, marker = h[:5]; want = h[5] if len(h) > 5 else 1
      if f != fn: continue
      if marker in out: print(f'  skip  {fn}: {marker[:50]!r} present'); continue
      n = out.count(anchor)
      if n != want: print(f'  FAIL  {fn}: anchor x{n} (want {want}): {anchor[:70]!r}'); bad += 1; continue
      if op == 'replace': out = out.replace(anchor, text)
      else:
        k = 0
        for _ in range(want):
          i = out.index(anchor, k); j = out.find('\n', i + len(anchor)); j = len(out) if j < 0 else j
          out = out[:j] + '\n' + text + out[j:]; k = j + 1 + len(text)
      print(f'  {"would" if check else "apply"} {fn}: {marker[:50]!r}')
    if out != src and not check:
      if open(p, encoding='utf-8').read() != src: print(f'  FAIL  {fn} changed during patch; not written'); bad += 1; continue
      open(p, 'w', encoding='utf-8').write(out)
  sys.exit(1 if bad else 0)
main()
