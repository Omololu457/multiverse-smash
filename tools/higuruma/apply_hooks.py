#!/usr/bin/env python3
"""Higuruma: idempotent, narrow registration hooks in shared files.
Each hook = (file, anchor, op, text). anchor must occur EXACTLY once (asserted); op 'after_line' inserts `text` as new
line(s) after the line containing anchor; op 'replace' substitutes anchor -> text within that one occurrence.
A hook whose marker ('higuruma' text) is already present is skipped, so re-running is a no-op. Other writers' lines are
never touched; the file is re-read immediately before each patch and written only if changed.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  higuruma: { work: 'Hiromi Higuruma (Jujutsu Kaisen) — sprite sheet', artists: ['Mugen Matias (sheet creator)'],\n"
  "    source: 'Supplied sheet \"higuruma_hiromi_sprites_sheet_manga__by_mugengojoplayer_dm448a4.png\" (SHA-256 de7978f4…), captioned on the sheet \"Sprite Sheet By Mugen Matias\" (file name: by mugengojoplayer). Original pixels; only the exact key colour RGB(34,177,76) removed; nearest-neighbour only. Rects in docs/higuruma/source_rects.json. Skins: precomputed colour interpretations (tools/higuruma/build_skins.py).',\n"
  "    files: ['assets/higuruma/**'] },")
HOOKS = [
  ('characters.js', "import { robin } from './robinData.js'", 'after_line',
   "import { higuruma } from './higurumaData.js'   // Hiromi Higuruma (Jujutsu Kaisen, supplied sheet by Mugen Matias) — higuruma*.js", "from './higurumaData.js'"),
  ('characters.js', "  robin,                             // Robin (Dick Grayson, DC)", 'after_line',
   "  higuruma,                          // Hiromi Higuruma (Jujutsu Kaisen) — Technical Midrange / Weapon Scaler (small / extended / giant gavel, Case File → Precedent, Deadly Sentencing); higuruma*.js", "  higuruma,  "),
  ('spritesheets.js', "  robin: { actions: { idle: './assets/robin/idle.png' } },", 'after_line',
   "  higuruma: { actions: { idle: './assets/higuruma/idle.png' } },", "assets/higuruma/idle.png"),
  ('kits.js', "import { ROBIN_KIT } from './robinKit.js'", 'after_line',
   "import { HIGURUMA_KIT } from './higurumaKit.js'   // Higuruma (higuruma) Move List", "higurumaKit.js"),
  ('kits.js', "  robin: ROBIN_KIT,", 'after_line', "  higuruma: HIGURUMA_KIT,", "higuruma: HIGURUMA_KIT"),
  ('skins.js', "import { ROBIN_SKINS } from './robinSkins.js'", 'after_line',
   "import { HIGURUMA_SKINS } from './higurumaSkins.js'   // Higuruma default + 10 skins (cosmetic, precomputed; cached materials)", "higurumaSkins.js"),
  ('skins.js', "  robin: ROBIN_SKINS,", 'after_line', "  higuruma: HIGURUMA_SKINS,", "higuruma: HIGURUMA_SKINS"),
  ('sound.js', "import { ROBIN_SOUNDS } from './robinSound.js'", 'after_line',
   "import { HIGURUMA_SOUNDS } from './higurumaSound.js'   // Higuruma synth SFX (SFX bus; voice bus untouched; no dialogue)", "higurumaSound.js"),
  ('sound.js', "  ...ROBIN_SOUNDS, // robin_*", 'after_line',
   "  ...HIGURUMA_SOUNDS, // higuruma_* : gavel knocks / swings, extension, giant gavel, Objection, Case File marks, Precedent, Deadly Sentencing", "...HIGURUMA_SOUNDS"),
  ('credits.js', "    files: ['assets/robin/**'] },", 'after_line', CREDIT, "assets/higuruma/**"),
  ('combat.js', "import { robinHitbox, robinBlock, robinHit, robinProjectileHit } from './robinState.js'", 'after_line',
   "import { higurumaHitbox, higurumaBlock, higurumaHit, absorbHiguruma } from './higurumaState.js'   // Higuruma hooks (higuruma-gated)", "from './higurumaState.js'"),
  ('combat.js', "  if (a?.rb && fighter.rosterKey === 'robin') return robinHitbox(fighter)", 'after_line',
   "  if (a?.hg && fighter.rosterKey === 'higuruma') return higurumaHitbox(fighter)   // Higuruma: per-move gavel / extension / giant-gavel box from the drawn weapon (body hurtbox unchanged)", "return higurumaHitbox(fighter)"),
  ('combat.js', "  if (absorbRaven(defender, attacker, attacker.currentAttack))", 'after_line',
   "  if (absorbHiguruma(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }   // Higuruma Objection: one frontal strike caught (grabs / projectiles / ultimates / unblockables bypass); higuruma-gated", "absorbHiguruma(defender"),
  ('combat.js', "    if (!flawless) robinBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) higurumaBlock(attacker, defender, atk)   // Higuruma: authored blockstun; no evidence on block; higuruma-gated", "higurumaBlock(attacker"),
  ('combat.js', "    robinHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    higurumaHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Higuruma: clean flag (chain / heavy / special / ult cancels, Precedent), Case File evidence; higuruma-gated", "higurumaHit(attacker"),
  ('sprite.js', "  if (fighter.rosterKey === 'robin' && !fighter.attacking && (fighter._rbLand || 0) > 0", 'after_line',
   "  if (fighter.rosterKey === 'higuruma' && !fighter.attacking && fighter._hgPose && !fighter.isBlocking && (fighter.grounded ?? fighter.onGround) && (fighter._hgPose !== 'land' || Math.abs(fighter.vx || 0) <= 0.1) && (fighter._skinAnim?.[fighter._hgPose] || fighter.animationData?.[fighter._hgPose])) return fighter._hgPose;   // Higuruma: supplied landing frames / front-facing turn cell (sim-set pose, render only)", "rosterKey === 'higuruma' && !fighter.attacking && fighter._hgPose"),
  ('sprite.js', "    if (fighter.rosterKey === 'robin') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'higuruma') fighter._lastSpriteFrame = this.frameIndex;   // Higuruma: presentation read for skin material overlays (higurumaFx)", "rosterKey === 'higuruma') fighter._lastSpriteFrame"),
  ('input.js', "!fighter._starfireRemoteInput && !fighter._robinRemoteInput) {", 'replace',
   "!fighter._starfireRemoteInput && !fighter._robinRemoteInput && !fighter._higurumaRemoteInput) {", "!fighter._higurumaRemoteInput) {"),
  ('input.js', "fighter.rosterKey === 'robin') && !fighter._aiControlled", 'replace',
   "fighter.rosterKey === 'robin' || fighter.rosterKey === 'higuruma') && !fighter._aiControlled", "fighter.rosterKey === 'higuruma') && !fighter._aiControlled"),
  ('input.js', "!fighter._robinRemoteInput && inputSettings[", 'replace',
   "!fighter._robinRemoteInput && !fighter._higurumaRemoteInput && inputSettings[", "!fighter._higurumaRemoteInput && inputSettings["),
]
GAME = [
  ("import { robinHarnessApi } from './robinHarness.js'", 'after_line',
   "import { updateHigurumaCommandCombat } from './higuruma.js'   // Hiromi Higuruma (Jujutsu Kaisen) — higuruma-gated command layer\nimport { tickHiguruma, isHiguruma, clearHiguruma, higurumaLocked, isHigurumaUltActive, updateHigurumaUlt, clearHigurumaUlt } from './higurumaState.js'\nimport { drawHigurumaFx, drawHigurumaHud, drawHigurumaIntroCard, drawHigurumaCourt, drawHigurumaUnder, playHigurumaCues } from './higurumaFx.js'\nimport { higurumaHarnessApi } from './higurumaHarness.js'", "from './higuruma.js'"),
  ("const ROBIN_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const HIGURUMA_WORLD = MMPR_BLACK_WORLD   // Higuruma: the same self-contained world (stage width, fighters, ultimate damage through W.damage)", "const HIGURUMA_WORLD"),
  ("isRobinUltActive() || isSamuraiFlameSmasherCinematicActive()", 'replace',
   "isRobinUltActive() || isHigurumaUltActive() || isSamuraiFlameSmasherCinematicActive()", "isHigurumaUltActive() || isSamurai"),
  ("  clearRobinUlt()   // Robin CHECKMATE (freeze contract)", 'after_line',
   "  clearHigurumaUlt()   // Higuruma DEADLY SENTENCING (freeze contract)", "clearHigurumaUlt()   // Higuruma DEADLY", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearRobin(_f,ROBIN_WORLD)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearHiguruma(_f)", "if (_f) clearHiguruma(_f)", 4),
  ("  tickRobin(fighter,nearest,readRawControls(fighter)||{},ROBIN_WORLD)\n  playRobinCues(fighter)", 'after_line',
   "  tickHiguruma(fighter,nearest,readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", "tickHiguruma(fighter,nearest,"),
  ("  if (isRobin(fighter)) { const mc=updateRobinCommandCombat(fighter,inputState,nearest,ROBIN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isHiguruma(fighter)) { const mc=updateHigurumaCommandCombat(fighter,inputState,nearest,HIGURUMA_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateHigurumaCommandCombat(fighter,inputState,nearest"),
  ("clearRobin(p1,ROBIN_WORLD);clearRobin(p2,ROBIN_WORLD)", 'replace',
   "clearRobin(p1,ROBIN_WORLD);clearRobin(p2,ROBIN_WORLD);clearHiguruma(p1);clearHiguruma(p2)", "clearHiguruma(p1);clearHiguruma(p2)", 2),
  ("  if (isRobin(f)) snap.push(JSON.stringify([f._robin || null, f.currentAttack?.rb || null, f._rbLand || 0]))", 'after_line',
   "  if (isHiguruma(f)) snap.push(JSON.stringify([f._higuruma || null, f.currentAttack?.hg || null, f._hgPose || null, f._hgPoseT || 0]))   // Higuruma GAME_STATE (Case File, Precedent token / combo lock, airtime allowance, press edges, move descriptor incl. Objection phase)", "f._higuruma || null, f.currentAttack?.hg"),
  ("robinLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "robinLocked(fighter, readRawControls(fighter)) || higurumaLocked(fighter, readRawControls(fighter)) ||", "higurumaLocked(fighter, readRawControls"),
  ("  tickRobin(fighter,getOpponent(fighter),readRawControls(fighter)||{},ROBIN_WORLD)\n  playRobinCues(fighter)", 'after_line',
   "  tickHiguruma(fighter,getOpponent(fighter),readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", "tickHiguruma(fighter,getOpponent"),
  ("    const mc=updateRobinCommandCombat(fighter,inputState,getOpponent(fighter),ROBIN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isHiguruma(fighter)) {   // Higuruma command layer: 'consumed' | 'grab'\n    const mc=updateHigurumaCommandCombat(fighter,inputState,getOpponent(fighter),HIGURUMA_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateHigurumaCommandCombat(fighter,inputState,getOpponent"),
  ("    clearRobin(f,ROBIN_WORLD)", 'after_line', "    clearHiguruma(f)", "    clearHiguruma(f)"),
  ("    if (isRobin(f)) f._robinRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isHiguruma(f)) f._higurumaRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._higurumaRemoteInput = replay"),
  ("  if (isRobinUltActive()) {\n    updateRobinUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // HIGURUMA \"DEADLY SENTENCING\": the same freeze contract (higurumaState.js).\n  if (isHigurumaUltActive()) {\n    updateHigurumaUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateHigurumaUlt()"),
  ("    drawRobinFx(c, fighter, getOpponent(fighter))", 'after_line',
   "    drawHigurumaFx(c, fighter)   // Higuruma — Case File marks, PRECEDENT, OBJECTION, Order-in-the-Court dust ring, sword stroke, skin material (render-only; higuruma only)", "drawHigurumaFx(c, fighter"),
  ("    && !(a.rosterKey === \"robin\" && a.skinId !== b.skinId)", 'after_line',
   "    && !(a.rosterKey === \"higuruma\" && a.skinId !== b.skinId)   // Higuruma: same rule", "a.rosterKey === \"higuruma\""),
  ("  drawRobinHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawHigurumaHud(ctx, canvas, p1, p2)   // Higuruma: Case File marks + PRECEDENT under his health; Deadly Sentencing captions / CASE REVIEW / portrait cut-in (gated)", "drawHigurumaHud(ctx"),
  ("      drawRobinIntroCard(ctx, canvas, p1, p2)", 'after_line',
   "      drawHigurumaIntroCard(ctx, canvas, p1, p2)   // Higuruma: portrait + name card while his own intro plays (presentation only; gated)", "drawHigurumaIntroCard(ctx"),
  ("  drawHomelanderSpeedRun(ctx, canvas)     // Homelander ULTIMATE", 'after_line',
   "  drawHigurumaCourt(ctx, canvas)   // Higuruma DEADLY SENTENCING — stage dim + simple courtroom framing, screen space, under the fighters (render-only; gated)", "drawHigurumaCourt(ctx"),
  ("  drawArlongUnder(ctx, p1, globalFrameCount); drawArlongUnder(ctx, p2, globalFrameCount)", 'after_line',
   "  drawHigurumaUnder(ctx, p1, p2)   // Higuruma DEADLY SENTENCING — defendant's box + aisle floor markings under the fighters (render-only; gated)", "drawHigurumaUnder(ctx"),
  ("    robinTest: robinHarnessApi(", 'after_line',
   "    higurumaTest: higurumaHarnessApi({p1:()=>p1,p2:()=>p2,world:HIGURUMA_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "higurumaTest: higurumaHarnessApi"),
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
