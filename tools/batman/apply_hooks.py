#!/usr/bin/env python3
"""Batman rebuild: idempotent, narrow registration hooks in shared files (same contract as tools/higuruma/apply_hooks.py).
Each hook = (file, anchor, op, text, marker[, count]). anchor must occur EXACTLY `count` times (asserted); op
'after_line' inserts `text` after the line containing anchor, 'before_line' before it, 'replace' substitutes anchor ->
text. A hook whose marker is already present is skipped (re-running is a no-op). Other writers' lines are never
touched; each file is re-read immediately before writing and written only if unchanged meanwhile.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  batman: { work: 'Batman (DC) — SNES \"Batman Returns\" sprite sheet + generic drone / vehicle / robot packs', artists: ['DAD34853 (sheet upgrade, per the on-sheet caption)'],\n"
  "    source: 'Supplied \"SNES - Batman Returns - Playable Characters - Batman.png\" (SHA-256 12f83f42…; on-sheet caption credits the upgrade to DAD34853 — caption and HUD icon excluded from extraction); supplied generic packs \"Free-Drones-Pack-Pixel-Art2/3/4/6.webp\", \"drones_test002.webp\" and \"Robots-Pixel-Art-Sprite-Sheet-Pack6-1536x1024.webp\" (publisher not named on the sheets). Machine names are custom game adaptations, not official Batman vehicle designs. Ground explosion reuses the committed Krybot strip (assets/krybot/explosion.png). Original pixels; promo sheets matted + 32-colour quantized. Rects in docs/batman/source_rects.json; skins precomputed (tools/batman/build_skins.py).',\n"
  "    files: ['assets/batman/**'] },")
HOOKS = [
  ('characters.js', "import { higuruma } from './higurumaData.js'", 'after_line',
   "import { batman as batmanRebuild } from './batmanData.js'   // Batman (DC) REBUILT 2026-11-14 on the supplied SNES sheet + support fleet — batman*.js", "from './batmanData.js'"),
  ('characters.js', "  batman,\n  hisoka,\n", 'replace',
   "  batman: batmanRebuild,             // Batman (DC) REBUILT — Tactical Brawler / Fleet Commander (gadgets, automated support fleet, KNIGHTFALL); batman*.js. Legacy const kept for reference only.\n  hisoka,\n", "batman: batmanRebuild,"),
  ('characters.js', '  "batman", "dark_knight", "brainiac",', 'replace',
   '  /* "batman" REVIVED 2026-11-14 (rebuild, batman*.js) */ "dark_knight", "brainiac",', '"batman" REVIVED'),
  ('spritesheets.js', 'actions: { idle: "./batman_idle_uniform.png" }', 'replace',
   'actions: { idle: "./assets/batman/body.png" }   /* Batman REBUILT: the body atlas (batman*.js) */', './assets/batman/body.png'),
  ('kits.js', "import { HIGURUMA_KIT } from './higurumaKit.js'", 'after_line',
   "import { BATMAN_KIT } from './batmanKit.js'   // Batman (batman, rebuilt) Move List", "batmanKit.js"),
  ('kits.js', "  higuruma: HIGURUMA_KIT,", 'after_line', "  batman: BATMAN_KIT,", "batman: BATMAN_KIT"),
  ('skins.js', "import { HIGURUMA_SKINS } from './higurumaSkins.js'", 'after_line',
   "import { BATMAN_SKINS } from './batmanSkins.js'   // Batman (rebuilt) default + 10 arsenal-wide skins (cosmetic, precomputed)", "batmanSkins.js"),
  ('skins.js', "  for (const rs of recolorSkins(key)) if (!have.has(rs.id)) SKINS[key].push(rs)\n}\n", 'replace',
   "  for (const rs of recolorSkins(key)) if (!have.has(rs.id)) SKINS[key].push(rs)\n}\nSKINS.batman = BATMAN_SKINS   // Batman REBUILT: replaces the legacy batman list (its sheets belong to the old art set)\n", "SKINS.batman = BATMAN_SKINS"),
  ('sound.js', "import { HIGURUMA_SOUNDS } from './higurumaSound.js'", 'after_line',
   "import { BATMAN_SOUNDS } from './batmanSound.js'   // Batman (rebuilt) synth SFX (SFX bus; voice bus untouched)", "batmanSound.js"),
  ('sound.js', "  ...HIGURUMA_SOUNDS, // higuruma_*", 'after_line',
   "  ...BATMAN_SOUNDS, // batman_* : strikes, gadgets, grapnel, smoke, fleet orders / payloads / machines, KNIGHTFALL", "...BATMAN_SOUNDS"),
  ('credits.js', "    files: ['assets/higuruma/**'] },", 'after_line', CREDIT, "assets/batman/**"),
  ('credits.js', '"flash", "batman", "hisoka", "superman",', 'replace', '"flash", "hisoka", "superman",   /* batman → SOURCED_ART (rebuild) */', 'batman → SOURCED_ART'),
  ('combat.js', "import { higurumaHitbox, higurumaBlock, higurumaHit, absorbHiguruma } from './higurumaState.js'", 'after_line',
   "import { batmanHitbox, batmanBlock, batmanHit, absorbBatman } from './batmanState.js'   // Batman (rebuilt) hooks (batman-gated)", "from './batmanState.js'"),
  ('combat.js', "  if (a?.hg && fighter.rosterKey === 'higuruma') return higurumaHitbox(fighter)", 'after_line',
   "  if (a?.bm && fighter.rosterKey === 'batman') return batmanHitbox(fighter)   // Batman: per-move box from the drawn limb (body hurtbox unchanged)", "return batmanHitbox(fighter)"),
  ('combat.js', "  if (absorbHiguruma(defender, attacker, attacker.currentAttack))", 'after_line',
   "  if (absorbBatman(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }   // Batman cape counter: one frontal strike caught; batman-gated", "absorbBatman(defender"),
  ('combat.js', "    if (!flawless) higurumaBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) batmanBlock(attacker, defender, atk)   // Batman: authored blockstun; batman-gated", "batmanBlock(attacker"),
  ('combat.js', "    higurumaHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    batmanHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Batman: clean flag (cancels, KNIGHTFALL confirm); batman-gated", "batmanHit(attacker"),
  ('sprite.js', "  if (fighter.rosterKey === 'higuruma' && !fighter.attacking && fighter._hgPose", 'after_line',
   "  if (fighter.rosterKey === 'batman' && !fighter.attacking && fighter._bmPose && !fighter.isBlocking && (fighter.grounded ?? fighter.onGround) && Math.abs(fighter.vx || 0) <= 0.1 && (fighter._skinAnim?.[fighter._bmPose] || fighter.animationData?.[fighter._bmPose])) return fighter._bmPose;   // Batman: supplied landing frames (sim-set pose, render only)", "rosterKey === 'batman' && !fighter.attacking && fighter._bmPose"),
  ('sprite.js', "    if (fighter.rosterKey === 'higuruma') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'batman') fighter._lastSpriteFrame = this.frameIndex;   // Batman: presentation read for grapnel / rope anchors (batmanFx)", "rosterKey === 'batman') fighter._lastSpriteFrame"),
  ('input.js', "!fighter._higurumaRemoteInput) {", 'replace',
   "!fighter._higurumaRemoteInput && !fighter._batmanRemoteInput) {", "!fighter._batmanRemoteInput) {"),
  ('input.js', "fighter.rosterKey === 'higuruma') && !fighter._aiControlled", 'replace',
   "fighter.rosterKey === 'higuruma' || fighter.rosterKey === 'batman') && !fighter._aiControlled", "fighter.rosterKey === 'batman') && !fighter._aiControlled"),
  ('input.js', "!fighter._higurumaRemoteInput && inputSettings[", 'replace',
   "!fighter._higurumaRemoteInput && !fighter._batmanRemoteInput && inputSettings[", "!fighter._batmanRemoteInput && inputSettings["),
]
GAME = [
  ("import { higurumaHarnessApi } from './higurumaHarness.js'", 'after_line',
   "import { updateBatmanCommandCombat as updateBatmanRebuildCombat } from './batman.js'   // Batman (DC) REBUILT — batman-gated command layer\nimport { tickBatman, isBatman, clearBatman, batmanLocked, batmanOwnsCharge, isBatmanUltActive, updateBatmanUlt, clearBatmanUlt, batmanUltCamera } from './batmanState.js'\nimport { drawBatmanFx, drawBatmanUnder, drawBatmanHud, drawBatmanIntroCard, drawBatmanSky, playBatmanCues } from './batmanFx.js'\nimport { batmanHarnessApi } from './batmanHarness.js'", "from './batman.js'"),
  ("const HIGURUMA_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const BATMAN_WORLD = MMPR_BLACK_WORLD   // Batman: the same self-contained world (stage width, fighters, attack / projectile rects for machine damage, W.damage)", "const BATMAN_WORLD"),
  ("isHigurumaUltActive() || isSamuraiFlameSmasherCinematicActive()", 'replace',
   "isHigurumaUltActive() || isBatmanUltActive() || isSamuraiFlameSmasherCinematicActive()", "isBatmanUltActive() || isSamurai"),
  ("  clearHigurumaUlt()   // Higuruma DEADLY SENTENCING (freeze contract)", 'after_line',
   "  clearBatmanUlt()   // Batman KNIGHTFALL (freeze contract)", "clearBatmanUlt()   // Batman KNIGHTFALL", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearHiguruma(_f)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearBatman(_f)", "if (_f) clearBatman(_f)", 4),
  ("  tickHiguruma(fighter,nearest,readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", 'after_line',
   "  tickBatman(fighter,nearest,readRawControls(fighter)||{},BATMAN_WORLD)\n  playBatmanCues(fighter)", "tickBatman(fighter,nearest,"),
  ("  if (isHiguruma(fighter)) { const mc=updateHigurumaCommandCombat(fighter,inputState,nearest,HIGURUMA_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isBatman(fighter)) { const mc=updateBatmanRebuildCombat(fighter,inputState,nearest,BATMAN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateBatmanRebuildCombat(fighter,inputState,nearest"),
  ("clearHiguruma(p1);clearHiguruma(p2)", 'replace',
   "clearHiguruma(p1);clearHiguruma(p2);clearBatman(p1);clearBatman(p2)", "clearBatman(p1);clearBatman(p2)", 2),
  ("  if (isHiguruma(f)) snap.push(JSON.stringify([f._higuruma || null, f.currentAttack?.hg || null, f._hgPose || null, f._hgPoseT || 0]))", 'after_line',
   "  if (isBatman(f)) snap.push(JSON.stringify([f._batman || null, f.currentAttack?.bm || null, f._bmPose || null, f._bmPoseT || 0]))   // Batman GAME_STATE (fleet ops + machines + payloads + ledgers, gadgets, smoke, edges, cooldowns)", "f._batman || null, f.currentAttack?.bm"),
  ("higurumaLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "higurumaLocked(fighter, readRawControls(fighter)) || batmanLocked(fighter, readRawControls(fighter)) ||", "batmanLocked(fighter, readRawControls"),
  ("  tickHiguruma(fighter,getOpponent(fighter),readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", 'after_line',
   "  tickBatman(fighter,getOpponent(fighter),readRawControls(fighter)||{},BATMAN_WORLD)\n  playBatmanCues(fighter)", "tickBatman(fighter,getOpponent"),
  ("    const mc=updateHigurumaCommandCombat(fighter,inputState,getOpponent(fighter),HIGURUMA_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isBatman(fighter)) {   // Batman (rebuilt) command layer: 'consumed' | 'grab' (the legacy batman paths below are never reached)\n    const mc=updateBatmanRebuildCombat(fighter,inputState,getOpponent(fighter),BATMAN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateBatmanRebuildCombat(fighter,inputState,getOpponent"),
  ("    clearHiguruma(f)", 'after_line', "    clearBatman(f)", "    clearBatman(f)"),
  ("    if (isHiguruma(f)) f._higurumaRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isBatman(f)) f._batmanRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._batmanRemoteInput = replay"),
  ("  if (isHigurumaUltActive()) {\n    updateHigurumaUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // BATMAN \"KNIGHTFALL: ORBITAL IMPACT\": the same freeze contract (batmanState.js) + a camera hint that follows the aircraft.\n  if (isBatmanUltActive()) {\n    updateBatmanUlt()\n    const _bmc = batmanUltCamera()\n    if (_bmc) { camera.targetX = _bmc.x; camera.targetY = _bmc.y; camera.targetZoom = _bmc.zoom; if (_bmc.shake && typeof camera.shake === \"function\") camera.shake(_bmc.shake, 14) }\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateBatmanUlt()"),
  ("    drawHigurumaFx(c, fighter)", 'after_line',
   "    drawBatmanFx(c, fighter)   // Batman — support fleet, payloads, batarang / grapnel lines, smoke, bracket, explosions, KNIGHTFALL aircraft (render-only; batman only)", "drawBatmanFx(c, fighter"),
  ("    && !(a.rosterKey === \"higuruma\" && a.skinId !== b.skinId)", 'after_line',
   "    && !(a.rosterKey === \"batman\" && a.skinId !== b.skinId)   // Batman: same rule", "a.rosterKey === \"batman\" && a.skinId"),
  ("  drawHigurumaHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawBatmanHud(ctx, canvas, p1, p2)   // Batman: support-operation status + cooldown chips under his health; KNIGHTFALL captions / cut-in (gated)", "drawBatmanHud(ctx"),
  ("      drawHigurumaIntroCard(ctx, canvas, p1, p2)", 'after_line',
   "      drawBatmanIntroCard(ctx, canvas, p1, p2)   // Batman: portrait + name + support crew card while his own intro plays (presentation only; gated)", "drawBatmanIntroCard(ctx"),
  ("  drawSupermanMoonBackdrop(ctx, canvas)   // Superman ULTIMATE", 'before_line',
   "  drawBatmanSky(ctx, canvas)   // Batman KNIGHTFALL — high-altitude sky gradient + cloud streaks under the space backdrop (render-only; gated)", "drawBatmanSky(ctx"),
  ("  const sm = [p1, p2].find(f => f && (f._supMoonBg || 0) > 0 && (f.rosterKey || \"\").toLowerCase() === \"superman\")", 'replace',
   "  const sm = [p1, p2].find(f => f && (f._supMoonBg || 0) > 0 && ((f.rosterKey || \"\").toLowerCase() === \"superman\" || f.rosterKey === \"batman\"))   // + Batman KNIGHTFALL (reuses this space layer; Superman unchanged)", "f.rosterKey === \"batman\"))   // + Batman KNIGHTFALL"),
  ("  drawHigurumaUnder(ctx, p1, p2)", 'after_line',
   "  drawBatmanUnder(ctx, p1, p2)   // Batman — low smoke + far-side orbiting bombers under the fighters (render-only; gated)", "drawBatmanUnder(ctx"),
  ("    higurumaTest: higurumaHarnessApi(", 'after_line',
   "    batmanTest: batmanHarnessApi({p1:()=>p1,p2:()=>p2,world:BATMAN_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "batmanTest: batmanHarnessApi"),
  ("!robinOwnsCharge(fighter) && !megumiOwnsCharge(fighter)", 'replace',
   "!robinOwnsCharge(fighter) && !megumiOwnsCharge(fighter) && !batmanOwnsCharge(fighter)", "!batmanOwnsCharge(fighter)"),
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
      elif op == 'before_line':
        i = out.index(anchor); j = out.rfind('\n', 0, i) + 1; out = out[:j] + text + '\n' + out[j:]
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
