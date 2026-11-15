#!/usr/bin/env python3
"""Syndrome: idempotent, narrow registration hooks in shared files (anchored AFTER the Higuruma lines).
Each hook = (file, anchor, op, text, marker[, count]). anchor must occur EXACTLY `count` times (asserted); op
'after_line' inserts `text` as new line(s) after the line containing anchor; op 'replace' substitutes anchor -> text.
A hook whose marker is already present is skipped, so re-running is a no-op. Other writers' lines are never touched;
the file is re-read immediately before writing and written only if changed.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  syndrome: { work: 'Syndrome + his machines (Drone, Spinner, Turrets, Velocipod, Omnidroid 10) — Game Boy Advance \"The Incredibles\" sprite sheets', artists: ['Original GBA game art (THQ / Heavy Iron); sheet ripper not named on the supplied sheets'],\n"
  "    source: 'Supplied sheets in syndrome/: \"Game Boy Advance - The Incredibles - Non-Playable Characters - Syndrome.png\" and \"… - Enemies & Bosses - Drone / Spinner / Turrets / Velocipod / Omnidroid 10.png\" (hashes in docs/syndrome/SPRITE_MAP.md; preserved byte-identical in assets/syndrome/source/). Each background colour removed independently by exact key; UI portraits, health bars and digit glyphs excluded; exact rects in docs/syndrome/source_rects.json; nearest-neighbour integer scaling only. Skins: precomputed exact-palette role recolours of the whole arsenal (tools/syndrome/build_skins.py).',\n"
  "    files: ['assets/syndrome/**'] },")
HOOKS = [
  ('characters.js', "import { higuruma } from './higurumaData.js'", 'after_line',
   "import { syndrome } from './syndromeData.js'   // Syndrome (The Incredibles, GBA sheets) — syndrome*.js", "from './syndromeData.js'"),
  ('characters.js', "  higuruma,                          // Hiromi Higuruma (Jujutsu Kaisen)", 'after_line',
   "  syndrome,                          // Syndrome (The Incredibles) — Arsenal Conductor (commands Drones / Spinner / Turrets / Velocipod / composite Omnidroid; Operation Kronos); syndrome*.js", "  syndrome,   "),
  ('spritesheets.js', "  higuruma: { actions: { idle: './assets/higuruma/idle.png' } },", 'after_line',
   "  syndrome: { actions: { idle: './assets/syndrome/idle.png' } },", "assets/syndrome/idle.png"),
  ('kits.js', "import { HIGURUMA_KIT } from './higurumaKit.js'", 'after_line',
   "import { SYNDROME_KIT } from './syndromeKit.js'   // Syndrome (syndrome) Move List", "syndromeKit.js"),
  ('kits.js', "  higuruma: HIGURUMA_KIT,", 'after_line', "  syndrome: SYNDROME_KIT,", "syndrome: SYNDROME_KIT"),
  ('skins.js', "import { HIGURUMA_SKINS } from './higurumaSkins.js'", 'after_line',
   "import { SYNDROME_SKINS } from './syndromeSkins.js'   // Syndrome default + 12 whole-arsenal skins (cosmetic, precomputed)", "syndromeSkins.js"),
  ('skins.js', "  higuruma: HIGURUMA_SKINS,", 'after_line', "  syndrome: SYNDROME_SKINS,", "syndrome: SYNDROME_SKINS"),
  ('sound.js', "import { HIGURUMA_SOUNDS } from './higurumaSound.js'", 'after_line',
   "import { SYNDROME_SOUNDS } from './syndromeSound.js'   // Syndrome synth SFX (SFX bus; voice bus untouched; no dialogue)", "syndromeSound.js"),
  ('sound.js', "  ...HIGURUMA_SOUNDS, // higuruma_*", 'after_line',
   "  ...SYNDROME_SOUNDS, // syndrome_* : remote clicks, drone / spinner / turret / velocipod / Omnidroid servos, impacts, Zero-Point, Operation Kronos", "...SYNDROME_SOUNDS"),
  ('credits.js', "    files: ['assets/higuruma/**'] },", 'after_line', CREDIT, "assets/syndrome/**"),
  ('combat.js', "import { higurumaHitbox, higurumaBlock, higurumaHit, absorbHiguruma } from './higurumaState.js'", 'after_line',
   "import { syndromeHitbox, syndromeBlock, syndromeHit, syndromeProjectileHit } from './syndromeState.js'   // Syndrome hooks (syndrome-gated)", "from './syndromeState.js'"),
  ('combat.js', "  if (a?.hg && fighter.rosterKey === 'higuruma') return higurumaHitbox(fighter)", 'after_line',
   "  if (a?.sy && fighter.rosterKey === 'syndrome') return syndromeHitbox(fighter)   // Syndrome: the commanded machine's box (Spinner / Drone / claw / leg); body-less gestures have none (machine volumes are projectiles)", "return syndromeHitbox(fighter)"),
  ('combat.js', "    if (!flawless) higurumaBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) syndromeBlock(attacker, defender, atk)   // Syndrome: authored blockstun; syndrome-gated", "syndromeBlock(attacker"),
  ('combat.js', "    higurumaHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    syndromeHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Syndrome: clean flag (chain / cancels), Zero-Point capture, Convergence; syndrome-gated", "syndromeHit(attacker"),
  ('combat.js', "      robinProjectileHit(proj, fighter, {armored:!!supArmoredProj})", 'after_line',
   "      syndromeProjectileHit(proj, fighter, {armored:!!supArmoredProj})   // Syndrome: machine contact bookkeeping (Convergence, turret / Omnidroid confirms); syndrome-gated", "syndromeProjectileHit(proj"),
  ('sprite.js', "    if (fighter.rosterKey === 'higuruma') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'syndrome') fighter._lastSpriteFrame = this.frameIndex;   // Syndrome: presentation read for gesture-synced machine art (syndromeFx)", "rosterKey === 'syndrome') fighter._lastSpriteFrame"),
  ('input.js', "!fighter._higurumaRemoteInput && ", 'replace',
   "!fighter._higurumaRemoteInput && !fighter._syndromeRemoteInput && ", "!fighter._syndromeRemoteInput && ", 2),
  ('input.js', "fighter.rosterKey === 'higuruma' || ", 'replace',
   "fighter.rosterKey === 'higuruma' || fighter.rosterKey === 'syndrome' || ", "fighter.rosterKey === 'syndrome' || "),
]
GAME = [
  ("import { higurumaHarnessApi } from './higurumaHarness.js'", 'after_line',
   "import { updateSyndromeCommandCombat } from './syndrome.js'   // Syndrome (The Incredibles) — syndrome-gated command layer\nimport { tickSyndrome, isSyndrome, clearSyndrome, syndromeLocked, syndromeOwnsCharge, isSyndromeUltActive, updateSyndromeUlt, clearSyndromeUlt } from './syndromeState.js'\nimport { drawSyndromeUnder, drawSyndromeOver, drawSyndromeHud, drawSyndromeIntroCard, playSyndromeCues } from './syndromeFx.js'\nimport { syndromeHarnessApi } from './syndromeHarness.js'", "from './syndrome.js'"),
  ("const HIGURUMA_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const SYNDROME_WORLD = MMPR_BLACK_WORLD   // Syndrome: the same self-contained world (stage width, fighters, projectiles = machine hit volumes, attackBox / projectileRects for turret damage, ultimate damage through W.damage)", "const SYNDROME_WORLD"),
  ("isHigurumaUltActive() || ", 'replace', "isHigurumaUltActive() || isSyndromeUltActive() || ", "isSyndromeUltActive() || "),
  ("  clearHigurumaUlt()   // Higuruma DEADLY SENTENCING (freeze contract)", 'after_line',
   "  clearSyndromeUlt()   // Syndrome OPERATION KRONOS (freeze contract)", "clearSyndromeUlt()   // Syndrome OPERATION", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearHiguruma(_f)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearSyndrome(_f,SYNDROME_WORLD)", "if (_f) clearSyndrome(_f,SYNDROME_WORLD)", 4),
  ("  tickHiguruma(fighter,nearest,readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", 'after_line',
   "  tickSyndrome(fighter,nearest,readRawControls(fighter)||{},SYNDROME_WORLD)\n  playSyndromeCues(fighter)", "tickSyndrome(fighter,nearest,"),
  ("  if (isHiguruma(fighter)) { const mc=updateHigurumaCommandCombat(fighter,inputState,nearest,HIGURUMA_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isSyndrome(fighter)) { const mc=updateSyndromeCommandCombat(fighter,inputState,nearest,SYNDROME_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateSyndromeCommandCombat(fighter,inputState,nearest"),
  ("clearHiguruma(p1);clearHiguruma(p2)", 'replace',
   "clearHiguruma(p1);clearHiguruma(p2);clearSyndrome(p1,SYNDROME_WORLD);clearSyndrome(p2,SYNDROME_WORLD)", "clearSyndrome(p1,SYNDROME_WORLD);clearSyndrome(p2", 2),
  ("  if (isHiguruma(f)) snap.push(JSON.stringify([f._higuruma || null, f.currentAttack?.hg || null, f._hgPose || null, f._hgPoseT || 0]))", 'after_line',
   "  if (isSyndrome(f)) snap.push(JSON.stringify([f._syndrome ? { ...f._syndrome, cues: undefined } : null, f.currentAttack?.sy || null]))   // Syndrome GAME_STATE (machine slots / squads / turret / Omnidroid action / Zero-Point hold / press edges / move descriptor; render cue queue excluded)", "f.currentAttack?.sy || null"),
  ("higurumaLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "higurumaLocked(fighter, readRawControls(fighter)) || syndromeLocked(fighter, readRawControls(fighter)) ||", "syndromeLocked(fighter, readRawControls"),
  ("!megumiOwnsCharge(fighter) && ", 'replace', "!megumiOwnsCharge(fighter) && !syndromeOwnsCharge(fighter) && ", "!syndromeOwnsCharge(fighter) && "),
  ("  tickHiguruma(fighter,getOpponent(fighter),readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", 'after_line',
   "  tickSyndrome(fighter,getOpponent(fighter),readRawControls(fighter)||{},SYNDROME_WORLD)\n  playSyndromeCues(fighter)", "tickSyndrome(fighter,getOpponent"),
  ("    const mc=updateHigurumaCommandCombat(fighter,inputState,getOpponent(fighter),HIGURUMA_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isSyndrome(fighter)) {   // Syndrome command layer: 'consumed' | 'grab'\n    const mc=updateSyndromeCommandCombat(fighter,inputState,getOpponent(fighter),SYNDROME_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateSyndromeCommandCombat(fighter,inputState,getOpponent"),
  ("    clearHiguruma(f)", 'after_line', "    clearSyndrome(f,SYNDROME_WORLD)", "    clearSyndrome(f,SYNDROME_WORLD)"),
  ("    if (isHiguruma(f)) f._higurumaRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isSyndrome(f)) f._syndromeRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._syndromeRemoteInput = replay"),
  ("    updateHigurumaUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // SYNDROME \"OPERATION KRONOS: FINAL DEMONSTRATION\": the same freeze contract (syndromeState.js).\n  if (isSyndromeUltActive()) {\n    updateSyndromeUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateSyndromeUlt()"),
  ("  drawHigurumaUnder(ctx, p1, p2)", 'after_line',
   "  drawSyndromeUnder(ctx, p1, p2, SYNDROME_WORLD)   // Syndrome — Omnidroid shell / legs / warnings, turrets, ultimate stage (world-space, under the fighters; render-only; gated)", "drawSyndromeUnder(ctx"),
  ("  drawMunitions(ctx, globalFrameCount); drawMunitionDebug(ctx)", 'after_line',
   "  drawSyndromeOver(ctx, p1, p2, SYNDROME_WORLD)   // Syndrome — commanded machines in front (claws, Spinner, Drones, Velocipod, shots, Zero-Point field; render-only; gated)", "drawSyndromeOver(ctx"),
  ("    && !(a.rosterKey === \"higuruma\" && a.skinId !== b.skinId)", 'after_line',
   "    && !(a.rosterKey === \"syndrome\" && a.skinId !== b.skinId)   // Syndrome: same rule", "a.rosterKey === \"syndrome\""),
  ("  drawHigurumaHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawSyndromeHud(ctx, canvas, p1, p2)   // Syndrome: machine slot readout under his health; Operation Kronos cut-in / captions (gated)", "drawSyndromeHud(ctx"),
  ("      drawHigurumaIntroCard(ctx, canvas, p1, p2)", 'after_line',
   "      drawSyndromeIntroCard(ctx, canvas, p1, p2)   // Syndrome: portrait + name card while his own intro plays (presentation only; gated)", "drawSyndromeIntroCard(ctx"),
  ("  marvel:          \"#e62429\",   // Spider-Man red", 'after_line',
   "  the_incredibles: \"#e8402a\",   // Incredibles red-orange", "the_incredibles:"),
  ("    higurumaTest: higurumaHarnessApi(", 'after_line',
   "    syndromeTest: syndromeHarnessApi({p1:()=>p1,p2:()=>p2,world:SYNDROME_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "syndromeTest: syndromeHarnessApi"),
]
HOOKS += [('game.js',) + g for g in GAME]
# --head: anchors for the COMMITTED base (HEAD). The worktree anchors above follow the Higuruma lines, which other live
# sessions have not committed yet; a commit must carry ONLY Syndrome's hooks, so the private-index blob is built from
# HEAD:<file> with these anchors (the latest committed character, White Ranger). marker -> (anchor, op, count).
HEAD_ANCHORS = {
  "from './syndromeData.js'": ("import { mmpr_white } from './mmprWhiteData.js'", 'after_line', 1),
  "  syndrome,   ": ("  mmpr_white,                        // White Ranger (Tommy Oliver, MMPR)", 'after_line', 1),
  "assets/syndrome/idle.png": ("  mmpr_white: { actions: { idle: './assets/mmpr_white/idle.png' } },", 'after_line', 1),
  "syndromeKit.js": ("import { MMPR_WHITE_KIT } from './mmprWhiteKit.js'", 'after_line', 1),
  "syndrome: SYNDROME_KIT": ("  mmpr_white: MMPR_WHITE_KIT,", 'after_line', 1),
  "syndromeSkins.js": ("import { MMPR_WHITE_SKINS } from './mmprWhiteSkins.js'", 'after_line', 1),
  "syndrome: SYNDROME_SKINS": ("  mmpr_white: MMPR_WHITE_SKINS,", 'after_line', 1),
  "syndromeSound.js": ("import { MMPR_WHITE_SOUNDS } from './mmprWhiteSound.js'", 'after_line', 1),
  "...SYNDROME_SOUNDS": ("  ...MMPR_WHITE_SOUNDS, // mmprwhite_*", 'after_line', 1),
  "assets/syndrome/**": ("    files: ['assets/mmpr_white/**', 'assets/power_rangers/ninja_megazord/**'] },", 'after_line', 1),
  "from './syndromeState.js'": ("import { mmprWhiteHitbox, mmprWhiteBlock, mmprWhiteHit } from './mmprWhiteState.js'", 'after_line', 1),
  "return syndromeHitbox(fighter)": ("  if (a?.mw && fighter.rosterKey === 'mmpr_white') return mmprWhiteHitbox(fighter)", 'after_line', 1),
  "syndromeBlock(attacker": ("    if (!flawless) mmprWhiteBlock(attacker, defender, atk)", 'after_line', 1),
  "syndromeHit(attacker": ("    mmprWhiteHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line', 1),
  "syndromeProjectileHit(proj": ("      mmprBlackProjectileHit(proj, fighter)", 'after_line', 1),
  "rosterKey === 'syndrome') fighter._lastSpriteFrame": ("      while (this.frameIndex > 0 && profileAction.groundClearance[this.frameIndex] * scale > clearance) this.frameIndex--;\n    }", 'after_line', 1),
  "!fighter._syndromeRemoteInput && ": ("!fighter._mmprWhiteRemoteInput && ", 'replace', 2),
  "fighter.rosterKey === 'syndrome' || ": ("fighter.rosterKey === 'mmpr_white' || ", 'replace', 1),
  "from './syndrome.js'": ("import { mmprWhiteHarnessApi } from './mmprWhiteHarness.js'", 'after_line', 1),
  "const SYNDROME_WORLD": ("const MMPR_WHITE_WORLD = MMPR_BLACK_WORLD", 'after_line', 1),
  "isSyndromeUltActive() || ": ("isMmprWhiteUltActive() || ", 'replace', 1),
  "clearSyndromeUlt()   // Syndrome OPERATION": ("  clearMmprWhiteUlt()   // White Ranger Ninja Grand Formation (freeze contract)", 'after_line', 4),
  "if (_f) clearSyndrome(_f,SYNDROME_WORLD)": ("  for (const _f of [p1, p2]) if (_f) clearMmprWhite(_f,MMPR_WHITE_WORLD)", 'after_line', 4),
  "tickSyndrome(fighter,nearest,": ("  tickMmprWhite(fighter,nearest,readRawControls(fighter)||{},MMPR_WHITE_WORLD)\n  playMmprWhiteCues(fighter)", 'after_line', 1),
  "updateSyndromeCommandCombat(fighter,inputState,nearest": ("  if (isMmprWhite(fighter)) { const mc=updateMmprWhiteCommandCombat(fighter,inputState,nearest,MMPR_WHITE_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line', 1),
  "clearSyndrome(p1,SYNDROME_WORLD);clearSyndrome(p2": ("clearMmprWhite(p1,MMPR_WHITE_WORLD);clearMmprWhite(p2,MMPR_WHITE_WORLD)", 'replace', 2),
  "f.currentAttack?.sy || null": ("  if (isMmprWhite(f)) snap.push(JSON.stringify(f._mmprWhite || null))", 'after_line', 1),
  "syndromeLocked(fighter, readRawControls": ("mmprWhiteLocked(fighter, readRawControls(fighter)) ||", 'replace', 1),
  "!syndromeOwnsCharge(fighter) && ": ("inputState.charge && !fighter._suppressChargeUntilRelease && ", 'replace', 1),
  "tickSyndrome(fighter,getOpponent": ("  tickMmprWhite(fighter,getOpponent(fighter),readRawControls(fighter)||{},MMPR_WHITE_WORLD)\n  playMmprWhiteCues(fighter)", 'after_line', 1),
  "updateSyndromeCommandCombat(fighter,inputState,getOpponent": ("    const mc=updateMmprWhiteCommandCombat(fighter,inputState,getOpponent(fighter),MMPR_WHITE_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line', 1),
  "    clearSyndrome(f,SYNDROME_WORLD)": ("    clearMmprWhite(f,MMPR_WHITE_WORLD)", 'after_line', 1),
  "f._syndromeRemoteInput = replay": ("    if (isMmprWhite(f)) f._mmprWhiteRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line', 1),
  "updateSyndromeUlt()": ("    updateMmprWhiteUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line', 1),
  "drawSyndromeUnder(ctx": ("  drawArlongUnder(ctx, p1, globalFrameCount); drawArlongUnder(ctx, p2, globalFrameCount)", 'after_line', 1),
  "a.rosterKey === \"syndrome\"": ("    && !(a.rosterKey === \"mmpr_white\" && a.skinId !== b.skinId)", 'after_line', 1),
  "drawSyndromeHud(ctx": ("  drawHomelanderGauges(ctx, canvas)", 'after_line', 1),
  "drawSyndromeIntroCard(ctx": ("        _drawActiveModifiers()   // Stage 24A: show this floor's modifiers on the intro\n      }", 'after_line', 1),
  "syndromeTest: syndromeHarnessApi": ("    mmprWhiteTest: mmprWhiteHarnessApi(", 'after_line', 1),
  "drawSyndromeOver(ctx": ("  drawMunitions(ctx, globalFrameCount); drawMunitionDebug(ctx)", 'after_line', 1),
  "the_incredibles:": ("  marvel:          \"#e62429\",   // Spider-Man red", 'after_line', 1),
}
# HEAD has no other "OwnsCharge" term in the charge gate → the Syndrome term is inserted at the gate's first condition.
HEAD_TEXT = {"!syndromeOwnsCharge(fighter) && ": "inputState.charge && !fighter._suppressChargeUntilRelease && !syndromeOwnsCharge(fighter) && "}

def main():
  a = sys.argv[1:]; check = '--check' in a; headmode = '--head' in a
  outdir = a[a.index('--out') + 1] if '--out' in a else None
  root = a[a.index('--root') + 1] if '--root' in a else ROOT
  only = set(a[a.index('--only') + 1:]) if '--only' in a else None
  bad = 0
  for fn in sorted({h[0] for h in HOOKS}):
    if only and fn not in only: continue
    p = os.path.join(root, fn)
    if headmode:
      import subprocess; src = subprocess.run(['git', 'show', 'HEAD:' + fn], cwd=root, capture_output=True, text=True, check=True).stdout
    else: src = open(p, encoding='utf-8').read()
    out = src
    for h in HOOKS:
      f, anchor, op, text, marker = h[:5]; want = h[5] if len(h) > 5 else 1
      if f != fn: continue
      if headmode:
        anchor, op, want = HEAD_ANCHORS[marker]
        if op == 'replace': text = HEAD_TEXT.get(marker) or text.replace(h[1], anchor)
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
    if headmode and outdir:
      os.makedirs(outdir, exist_ok=True); open(os.path.join(outdir, fn), 'w', encoding='utf-8').write(out); continue
    if out != src and not check:
      if open(p, encoding='utf-8').read() != src: print(f'  FAIL  {fn} changed during patch; not written'); bad += 1; continue
      open(p, 'w', encoding='utf-8').write(out)
  sys.exit(1 if bad else 0)
main()
