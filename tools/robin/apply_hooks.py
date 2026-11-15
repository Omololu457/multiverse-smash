#!/usr/bin/env python3
"""Robin: idempotent, narrow registration hooks in shared files.
Each hook = (file, anchor, op, text). anchor must occur EXACTLY once (asserted); op 'after_line' inserts `text` as new
line(s) after the line containing anchor; op 'replace' substitutes anchor -> text within that one occurrence.
A hook whose marker ('robin' text) is already present is skipped, so re-running is a no-op. Other writers' lines are
never touched; the file is re-read immediately before each patch and written only if changed.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  robin: { work: 'Robin — Teen Titans (Game Boy Advance), playable-character sheet', artists: ['Mr. C (ripper)'],\n"
  "    source: 'Supplied sheet \"Game Boy Advance - Teen Titans - Playable Characters - Robin.png\" (SHA-256 ec8561a7…). Visible credit panel in the lower-right corner of the sheet (quoted in docs/robin/SPRITE_MAP.md; excluded from animation). Original pixels; only the exact key colour RGB(77,109,243) removed (black outlines and the black mask kept); nearest-neighbour only. Rects in docs/robin/source_rects.json. Skins: precomputed colour interpretations (tools/robin/build_skins.py).',\n"
  "    files: ['assets/robin/**'] },")
HOOKS = [
  ('characters.js', "import { raven } from './ravenData.js'", 'after_line',
   "import { robin } from './robinData.js'   // Robin (Dick Grayson, DC / Teen Titans GBA art) — robin*.js", "from './robinData.js'"),
  ('characters.js', "  raven,                             // Raven (Rachel Roth, DC)", 'after_line',
   "  robin,                             // Robin (Dick Grayson, DC) — Gadget Tactician (punch chain, bo staff, Smoke Drop / Smoke Step, bombs, Dead Drop + Remote Override); robin*.js", "  robin,  "),
  ('spritesheets.js', "  raven: { actions: { idle: './assets/raven/idle.png' } },", 'after_line',
   "  robin: { actions: { idle: './assets/robin/idle.png' } },", "assets/robin/idle.png"),
  ('kits.js', "import { RAVEN_KIT } from './ravenKit.js'", 'after_line',
   "import { ROBIN_KIT } from './robinKit.js'   // Robin (robin) Move List", "robinKit.js"),
  ('kits.js', "  raven: RAVEN_KIT,", 'after_line', "  robin: ROBIN_KIT,", "robin: ROBIN_KIT"),
  ('skins.js', "import { RAVEN_SKINS } from './ravenSkins.js'", 'after_line',
   "import { ROBIN_SKINS } from './robinSkins.js'   // Robin default + 10 skins (cosmetic, precomputed; cached materials)", "robinSkins.js"),
  ('skins.js', "  raven: RAVEN_SKINS,", 'after_line', "  robin: ROBIN_SKINS,", "robin: ROBIN_SKINS"),
  ('sound.js', "import { RAVEN_SOUNDS } from './ravenSound.js'", 'after_line',
   "import { ROBIN_SOUNDS } from './robinSound.js'   // Robin synth SFX (SFX bus; voice bus untouched; no dialogue)", "robinSound.js"),
  ('sound.js', "  ...RAVEN_SOUNDS, // raven_*", 'after_line',
   "  ...ROBIN_SOUNDS, // robin_* : staff whoosh / hit, bomb throw / blast, smoke, Smoke Step, plant / armed, wrist-computer hack / detonate / convert, outplay, ultimate", "...ROBIN_SOUNDS"),
  ('credits.js', "    files: ['assets/raven/**'] },", 'after_line', CREDIT, "assets/robin/**"),
  ('combat.js', "import { ravenHitbox, ravenBlock, ravenHit, ravenProjectileHit, absorbRaven } from './ravenState.js'", 'after_line',
   "import { robinHitbox, robinBlock, robinHit, robinProjectileHit } from './robinState.js'   // Robin hooks (robin-gated)", "from './robinState.js'"),
  ('combat.js', "  if (a?.rv && fighter.rosterKey === 'raven') return ravenHitbox(fighter)", 'after_line',
   "  if (a?.rb && fighter.rosterKey === 'robin') return robinHitbox(fighter)   // Robin: per-move fist / staff box; gadgets (bombs / smoke / hack / step) have no body box", "return robinHitbox(fighter)"),
  ('combat.js', "    if (!flawless) ravenBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) robinBlock(attacker, defender, atk)   // Robin: authored blockstun; robin-gated", "robinBlock(attacker"),
  ('combat.js', "    ravenHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    robinHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Robin: clean flag (chain / staff / special / ult cancels), OUTPLAY cue; robin-gated", "robinHit(attacker"),
  ('combat.js', "      ravenProjectileHit(proj, fighter, {armored:!!supArmoredProj})", 'after_line',
   "      robinProjectileHit(proj, fighter, {armored:!!supArmoredProj})   // Robin: bomb contact → explosion; blast bookkeeping; robin-gated", "robinProjectileHit(proj"),
  ('sprite.js', "  if (fighter.rosterKey === 'raven' && !fighter.attacking && fighter._rvPose", 'after_line',
   "  if (fighter.rosterKey === 'robin' && !fighter.attacking && (fighter._rbLand || 0) > 0 && !fighter.isBlocking && (fighter.grounded ?? fighter.onGround) && Math.abs(fighter.vx || 0) <= 0.1) return 'land';   // Robin: full supplied Landing sequence after a genuine landing (cosmetic; robinState sets _rbLand)", "rosterKey === 'robin' && !fighter.attacking && (fighter._rbLand"),
  ('sprite.js', "    if (fighter.rosterKey === 'raven') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'robin') fighter._lastSpriteFrame = this.frameIndex;   // Robin: presentation read for skin material overlays / Smoke Step echoes (robinFx)", "rosterKey === 'robin') fighter._lastSpriteFrame"),
  ('input.js', "!fighter._beastBoyRemoteInput && !fighter._ravenRemoteInput) {", 'replace',
   "!fighter._beastBoyRemoteInput && !fighter._ravenRemoteInput && !fighter._robinRemoteInput) {", "!fighter._robinRemoteInput) {"),
  ('input.js', "|| fighter.rosterKey === 'raven') && !fighter._aiControlled", 'replace',
   "|| fighter.rosterKey === 'raven' || fighter.rosterKey === 'robin') && !fighter._aiControlled", "fighter.rosterKey === 'robin') && !fighter._aiControlled"),
  ('input.js', "!fighter._ravenRemoteInput && inputSettings[", 'replace',
   "!fighter._ravenRemoteInput && !fighter._robinRemoteInput && inputSettings[", "!fighter._robinRemoteInput && inputSettings["),
]
GAME = [
  ("import { ravenHarnessApi } from './ravenHarness.js'", 'after_line',
   "import { updateRobinCommandCombat } from './robin.js'   // Robin (Dick Grayson, DC) — robin-gated command layer\nimport { tickRobin, isRobin, clearRobin, robinLocked, robinOwnsCharge, isRobinUltActive, updateRobinUlt, clearRobinUlt } from './robinState.js'\nimport { drawRobinFx, drawRobinHud, drawRobinIntroCard, playRobinCues } from './robinFx.js'\nimport { robinHarnessApi } from './robinHarness.js'", "from './robin.js'"),
  ("const RAVEN_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const ROBIN_WORLD = MMPR_BLACK_WORLD   // Robin: the same self-contained world (stage width, projectiles = bombs / blasts, ultimate damage through W.damage)", "const ROBIN_WORLD"),
  ("isRavenUltActive() || isSamuraiFlameSmasherCinematicActive()", 'replace',
   "isRavenUltActive() || isRobinUltActive() || isSamuraiFlameSmasherCinematicActive()", "isRobinUltActive() || isSamurai"),
  ("  clearRavenUlt()   // Raven AZARATH (freeze contract)", 'after_line',
   "  clearRobinUlt()   // Robin CHECKMATE (freeze contract)", "clearRobinUlt()   // Robin CHECKMATE", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearRaven(_f,RAVEN_WORLD)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearRobin(_f,ROBIN_WORLD)", "if (_f) clearRobin(_f,ROBIN_WORLD)", 4),
  ("  tickRaven(fighter,nearest,readRawControls(fighter)||{},RAVEN_WORLD)\n  playRavenCues(fighter)", 'after_line',
   "  tickRobin(fighter,nearest,readRawControls(fighter)||{},ROBIN_WORLD)\n  playRobinCues(fighter)", "tickRobin(fighter,nearest,"),
  ("  if (isRaven(fighter)) { const mc=updateRavenCommandCombat(fighter,inputState,nearest,RAVEN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isRobin(fighter)) { const mc=updateRobinCommandCombat(fighter,inputState,nearest,ROBIN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateRobinCommandCombat(fighter,inputState,nearest"),
  ("clearRaven(p1,RAVEN_WORLD);clearRaven(p2,RAVEN_WORLD)", 'replace',
   "clearRaven(p1,RAVEN_WORLD);clearRaven(p2,RAVEN_WORLD);clearRobin(p1,ROBIN_WORLD);clearRobin(p2,ROBIN_WORLD)", "clearRobin(p1,ROBIN_WORLD);clearRobin(p2", 2),
  ("  if (isRaven(f)) snap.push(JSON.stringify([f._raven || null, f.currentAttack?.rv || null, f._rvPose || null, f._rvLand || 0]))", 'after_line',
   "  if (isRobin(f)) snap.push(JSON.stringify([f._robin || null, f.currentAttack?.rb || null, f._rbLand || 0]))   // Robin GAME_STATE (smoke, planted bomb, live bombs, remote press, airtime allowances, press edges, move descriptor)", "f._robin || null, f.currentAttack?.rb"),
  ("ravenLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "ravenLocked(fighter, readRawControls(fighter)) || robinLocked(fighter, readRawControls(fighter)) ||", "robinLocked(fighter, readRawControls"),
  ("!isCyborg(fighter) && !isRaven(fighter) && !fighter.attacking", 'replace',
   "!isCyborg(fighter) && !isRaven(fighter) && !robinOwnsCharge(fighter) && !fighter.attacking", "!robinOwnsCharge(fighter) && !fighter.attacking"),
  ("  tickRaven(fighter,getOpponent(fighter),readRawControls(fighter)||{},RAVEN_WORLD)\n  playRavenCues(fighter)", 'after_line',
   "  tickRobin(fighter,getOpponent(fighter),readRawControls(fighter)||{},ROBIN_WORLD)\n  playRobinCues(fighter)", "tickRobin(fighter,getOpponent"),
  ("    const mc=updateRavenCommandCombat(fighter,inputState,getOpponent(fighter),RAVEN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isRobin(fighter)) {   // Robin command layer: 'consumed' | 'grab'\n    const mc=updateRobinCommandCombat(fighter,inputState,getOpponent(fighter),ROBIN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateRobinCommandCombat(fighter,inputState,getOpponent"),
  ("    clearRaven(f,RAVEN_WORLD)", 'after_line', "    clearRobin(f,ROBIN_WORLD)", "    clearRobin(f,ROBIN_WORLD)"),
  ("    if (isRaven(f)) f._ravenRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isRobin(f)) f._robinRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._robinRemoteInput = replay"),
  ("    updateRavenUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // ROBIN \"CHECKMATE: LIGHTS OUT\": the same freeze contract (robinState.js).\n  if (isRobinUltActive()) {\n    updateRobinUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateRobinUlt()"),
  ("    drawRavenFx(c, fighter)", 'after_line',
   "    drawRobinFx(c, fighter, getOpponent(fighter))   // Robin — smoke, planted bomb, blasts, Smoke Step echoes, OUTPLAY, skin material (render-only; robin only)", "drawRobinFx(c, fighter"),
  ("    && !(a.rosterKey === \"raven\" && a.skinId !== b.skinId)", 'after_line',
   "    && !(a.rosterKey === \"robin\" && a.skinId !== b.skinId)   // Robin: same rule", "a.rosterKey === \"robin\""),
  ("  drawRavenHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawRobinHud(ctx, canvas, p1, p2)   // Robin: expression icon + smoke / Dead Drop status under his health; CHECKMATE cut-in (gated)", "drawRobinHud(ctx"),
  ("        _drawActiveModifiers()   // Stage 24A: show this floor's modifiers on the intro\n      }", 'after_line',
   "      drawRobinIntroCard(ctx, canvas, p1, p2)   // Robin: \"ROBIN — THE BOY WONDER\" card while his own intro plays (presentation only; gated)", "drawRobinIntroCard(ctx"),
  ("    ravenTest: ravenHarnessApi(", 'after_line',
   "    robinTest: robinHarnessApi({p1:()=>p1,p2:()=>p2,world:ROBIN_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "robinTest: robinHarnessApi"),
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
