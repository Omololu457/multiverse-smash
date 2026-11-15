#!/usr/bin/env python3
"""Starfire: idempotent, narrow registration hooks in shared files (same tool contract as tools/raven/apply_hooks.py).
Each hook = (file, anchor, op, text, marker[, count]). anchor must occur EXACTLY `count` times (asserted); op 'after_line'
inserts `text` as new line(s) after the line containing anchor; op 'replace' substitutes anchor -> text. A hook whose
marker is already present is skipped, so re-running is a no-op. Anchors are Raven's own lines (inserted by this
session), so Starfire lands next to Raven and never depends on other writers' text; other writers' lines are never
touched. The file is re-read immediately before each write and written only if unchanged since the read.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...]
       apply_hooks.py --revert --root DIR   (removes Starfire's hooks from the copies under DIR — never the live tree;
                                             used to build the frame-data-diff baseline = this tree without Starfire)"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  starfire: { work: 'Starfire — Teen Titans (Game Boy Advance), playable-character sheet', artists: ['Mr. C (ripper)'],\n"
  "    source: 'Supplied sheet \"Game Boy Advance - Teen Titans - Playable Characters - Starfire.png\" (SHA-256 89fbcd74…). Visible credit panel: \"Brought to you by… Mr. C — Credit? No / Permission? No\" (quoted verbatim; excluded from animation). Original pixels; only the exact key colour RGB(84,109,142) removed (black outlines kept); nearest-neighbour only. Rects + eye anchors in docs/starfire/source_rects.json and docs/starfire/eye_anchors.json. Skins: precomputed colour interpretations (tools/starfire/build_skins.py).',\n"
  "    files: ['assets/starfire/**'] },")
HOOKS = [
  ('characters.js', "import { raven } from './ravenData.js'", 'after_line',
   "import { starfire } from './starfireData.js'   // Starfire (Koriand'r, DC / Teen Titans GBA art) — starfire*.js", "from './starfireData.js'"),
  ('characters.js', "  raven,                             // Raven (Rachel Roth, DC)", 'after_line',
   "  starfire,                          // Starfire (Koriand'r, DC) — Aerial Blaster / Eye-Beam Zoner (starbolts, Comet Shot, Solar Rush, Skybreak, Orbital Star, Star Sight twin eye beams, Prism Break, levitation); starfire*.js", "  starfire,  "),
  ('spritesheets.js', "  raven: { actions: { idle: './assets/raven/idle.png' } },", 'after_line',
   "  starfire: { actions: { idle: './assets/starfire/idle.png' } },", "assets/starfire/idle.png"),
  ('kits.js', "import { RAVEN_KIT } from './ravenKit.js'", 'after_line',
   "import { STARFIRE_KIT } from './starfireKit.js'   // Starfire (starfire) Move List", "starfireKit.js"),
  ('kits.js', "  raven: RAVEN_KIT,", 'after_line', "  starfire: STARFIRE_KIT,", "starfire: STARFIRE_KIT"),
  ('skins.js', "import { RAVEN_SKINS } from './ravenSkins.js'", 'after_line',
   "import { STARFIRE_SKINS } from './starfireSkins.js'   // Starfire default + 10 skins (cosmetic, precomputed; cached materials)", "starfireSkins.js"),
  ('skins.js', "  raven: RAVEN_SKINS,", 'after_line', "  starfire: STARFIRE_SKINS,", "starfire: STARFIRE_SKINS"),
  ('sound.js', "import { RAVEN_SOUNDS } from './ravenSound.js'", 'after_line',
   "import { STARFIRE_SOUNDS } from './starfireSound.js'   // Starfire synth SFX (SFX bus; voice bus untouched; no dialogue)", "starfireSound.js"),
  ('sound.js', "  ...RAVEN_SOUNDS, // raven_*", 'after_line',
   "  ...STARFIRE_SOUNDS, // starfire_* : starbolt / comet / orbital star, eye-laser charge / fire / hit, Prism Break, levitation, ultimate", "...STARFIRE_SOUNDS"),
  ('credits.js', "    files: ['assets/raven/**'] },", 'after_line', CREDIT, "assets/starfire/**"),
  ('combat.js', "import { ravenHitbox, ravenBlock, ravenHit, ravenProjectileHit, absorbRaven } from './ravenState.js'", 'after_line',
   "import { starfireHitbox, starfireBlock, starfireHit, starfireProjectileHit } from './starfireState.js'   // Starfire hooks (starfire-gated)", "from './starfireState.js'"),
  ('combat.js', "  if (a?.rv && fighter.rosterKey === 'raven') return ravenHitbox(fighter)", 'after_line',
   "  if (a?.sf && fighter.rosterKey === 'starfire') return starfireHitbox(fighter)   // Starfire: per-move fist box; Star Sight = the eye-beam entry point (both beams one contract); projectiles have no body box", "return starfireHitbox(fighter)"),
  ('combat.js', "    if (!flawless) ravenBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) starfireBlock(attacker, defender, atk)   // Starfire: authored blockstun; starfire-gated", "starfireBlock(attacker"),
  ('combat.js', "    ravenHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    starfireHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Starfire: clean flag (chain / special / ult cancels), laser hit FX; starfire-gated", "starfireHit(attacker"),
  ('combat.js', "      ravenProjectileHit(proj, fighter, {armored:!!supArmoredProj})", 'after_line',
   "      starfireProjectileHit(proj, fighter, {armored:!!supArmoredProj})   // Starfire: bolt / orb / burst contact → explosion, ultimate confirm; starfire-gated", "starfireProjectileHit(proj"),
  ('sprite.js', "  if (fighter.rosterKey === 'raven' && !fighter.attacking && fighter._rvPose", 'after_line',
   "  if (fighter.rosterKey === 'starfire' && !fighter.attacking && fighter._sfPose && !fighter.isBlocking && (fighter._sfPose !== 'land' || ((fighter.grounded ?? fighter.onGround) && Math.abs(fighter.vx || 0) <= 0.1)) && (fighter._skinAnim?.[fighter._sfPose] || fighter.animationData?.[fighter._sfPose])) return fighter._sfPose;   // Starfire: levitation start / loop / exit and the supplied landing frames (sim-set pose, render only)", "fighter._sfPose"),
  ('sprite.js', "    if (fighter.rosterKey === 'raven') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'starfire') fighter._lastSpriteFrame = this.frameIndex;   // Starfire: presentation read for skin materials + the eye debug view (starfireFx)", "rosterKey === 'starfire') fighter._lastSpriteFrame"),
  ('input.js', "!fighter._ravenRemoteInput", 'replace', "!fighter._ravenRemoteInput && !fighter._starfireRemoteInput", "!fighter._starfireRemoteInput", 2),
  ('input.js', "|| fighter.rosterKey === 'raven'", 'replace', "|| fighter.rosterKey === 'raven' || fighter.rosterKey === 'starfire'", "fighter.rosterKey === 'starfire'"),
]
GAME = [
  ("import { ravenHarnessApi } from './ravenHarness.js'", 'after_line',
   "import { updateStarfireCommandCombat } from './starfire.js'   // Starfire (Koriand'r, DC) — starfire-gated command layer\nimport { tickStarfire, isStarfire, clearStarfire, starfireLocked, isStarfireUltActive, updateStarfireUlt, clearStarfireUlt } from './starfireState.js'\nimport { drawStarfireFx, drawStarfireHud, playStarfireCues } from './starfireFx.js'\nimport { starfireHarnessApi } from './starfireHarness.js'", "from './starfire.js'"),
  ("const RAVEN_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const STARFIRE_WORLD = MMPR_BLACK_WORLD   // Starfire: the same self-contained world (stage width for beam clipping, projectiles, ultimate damage through W.damage)", "const STARFIRE_WORLD"),
  ("isRavenUltActive() ||", 'replace', "isRavenUltActive() || isStarfireUltActive() ||", "isStarfireUltActive() ||"),
  ("  clearRavenUlt()   // Raven AZARATH (freeze contract)", 'after_line',
   "  clearStarfireUlt()   // Starfire SUPERNOVA (freeze contract)", "clearStarfireUlt()   // Starfire SUPERNOVA", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearRaven(_f,RAVEN_WORLD)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearStarfire(_f,STARFIRE_WORLD)", "if (_f) clearStarfire(_f,STARFIRE_WORLD)", 4),
  ("  tickRaven(fighter,nearest,readRawControls(fighter)||{},RAVEN_WORLD)\n  playRavenCues(fighter)", 'after_line',
   "  tickStarfire(fighter,nearest,readRawControls(fighter)||{},STARFIRE_WORLD)\n  playStarfireCues(fighter)", "tickStarfire(fighter,nearest,"),
  ("  if (isRaven(fighter)) { const mc=updateRavenCommandCombat(fighter,inputState,nearest,RAVEN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isStarfire(fighter)) { const mc=updateStarfireCommandCombat(fighter,inputState,nearest,STARFIRE_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateStarfireCommandCombat(fighter,inputState,nearest"),
  ("clearRaven(p1,RAVEN_WORLD);clearRaven(p2,RAVEN_WORLD)", 'replace',
   "clearRaven(p1,RAVEN_WORLD);clearRaven(p2,RAVEN_WORLD);clearStarfire(p1,STARFIRE_WORLD);clearStarfire(p2,STARFIRE_WORLD)", "clearStarfire(p1,STARFIRE_WORLD);clearStarfire(p2", 2),
  ("  if (isRaven(f)) snap.push(JSON.stringify([f._raven || null, f.currentAttack?.rv || null, f._rvPose || null, f._rvLand || 0]))", 'after_line',
   "  if (isStarfire(f)) snap.push(JSON.stringify([f._starfire || null, f.currentAttack?.sf || null, f._sfPose || null, f._sfLand || 0]))   // Starfire GAME_STATE (live projectiles, levitation, airtime allowances, laser aim / prism, press edges, move descriptor)", "f._starfire || null, f.currentAttack?.sf"),
  ("ravenLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "ravenLocked(fighter, readRawControls(fighter)) || starfireLocked(fighter, readRawControls(fighter)) ||", "starfireLocked(fighter, readRawControls"),
  ("!isRaven(fighter) &&", 'replace', "!isRaven(fighter) && !isStarfire(fighter) &&", "!isStarfire(fighter) &&"),
  ("  tickRaven(fighter,getOpponent(fighter),readRawControls(fighter)||{},RAVEN_WORLD)\n  playRavenCues(fighter)", 'after_line',
   "  tickStarfire(fighter,getOpponent(fighter),readRawControls(fighter)||{},STARFIRE_WORLD)\n  playStarfireCues(fighter)", "tickStarfire(fighter,getOpponent"),
  ("    const mc=updateRavenCommandCombat(fighter,inputState,getOpponent(fighter),RAVEN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isStarfire(fighter)) {   // Starfire command layer: 'consumed' | 'grab'\n    const mc=updateStarfireCommandCombat(fighter,inputState,getOpponent(fighter),STARFIRE_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateStarfireCommandCombat(fighter,inputState,getOpponent"),
  ("    clearRaven(f,RAVEN_WORLD)", 'after_line', "    clearStarfire(f,STARFIRE_WORLD)", "    clearStarfire(f,STARFIRE_WORLD)"),
  ("    if (isRaven(f)) f._ravenRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isStarfire(f)) f._starfireRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._starfireRemoteInput = replay"),
  ("    updateRavenUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // STARFIRE \"SUPERNOVA — EYES OF TAMARAN\": the same freeze contract (starfireState.js).\n  if (isStarfireUltActive()) {\n    updateStarfireUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateStarfireUlt()"),
  ("    drawRavenFx(c, fighter)", 'after_line',
   "    drawStarfireFx(c, fighter)   // Starfire — eye beams (supplied Laser pieces), bolts / orb glow, explosions, levitation shadow, skin material, opt-in eye debug (render-only; starfire only)", "drawStarfireFx(c, fighter)"),
  ("    && !(a.rosterKey === \"raven\" && a.skinId !== b.skinId)", 'after_line',
   "    && !(a.rosterKey === \"starfire\" && a.skinId !== b.skinId)   // Starfire: same rule", "a.rosterKey === \"starfire\""),
  ("  drawRavenHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawStarfireHud(ctx, canvas, p1, p2)   // Starfire: Orbital Star pip + levitation / air allowances + expression icon under her health; SUPERNOVA cut-in (gated)", "drawStarfireHud(ctx"),
  ("    ravenTest: ravenHarnessApi(", 'after_line',
   "    starfireTest: starfireHarnessApi({p1:()=>p1,p2:()=>p2,world:STARFIRE_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "starfireTest: starfireHarnessApi"),
]
HOOKS += [('game.js',) + g for g in GAME]
def revert(root):
  assert os.path.realpath(root) != os.path.realpath(ROOT), 'revert only works on a copy'
  for fn in sorted({h[0] for h in HOOKS}):
    p = os.path.join(root, fn); out = open(p, encoding='utf-8').read()
    for h in reversed(HOOKS):
      f, anchor, op, text, marker = h[:5]
      if f != fn or marker not in out: continue
      out = out.replace(text, anchor) if op == 'replace' else out.replace('\n' + text, '')
    open(p, 'w', encoding='utf-8').write(out)
def main():
  a = sys.argv[1:]; check = '--check' in a
  if '--revert' in a: return revert(a[a.index('--root') + 1])
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
