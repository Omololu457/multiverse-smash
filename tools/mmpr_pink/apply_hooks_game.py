#!/usr/bin/env python3
"""Narrow, idempotent mmpr_pink hooks for game.js. Each anchor is matched exactly with an asserted count; the file is
written only if its sha256 is unchanged since it was read. Re-running is a no-op (marker check)."""
import hashlib, sys, re
p = 'game.js'; src = open(p).read(); h0 = hashlib.sha256(src.encode()).hexdigest()
if 'updateMmprPinkCommandCombat' in src: print('already applied'); sys.exit(0)
s = src
def once(a, b, n=1):
    global s
    assert s.count(a) == n, (n, s.count(a), a[:80]); s = s.replace(a, b)
once("import { mmprBlackHarnessApi } from './mmprBlackHarness.js'\n",
     "import { mmprBlackHarnessApi } from './mmprBlackHarness.js'\n"
     "import { updateMmprPinkCommandCombat } from './mmprPink.js'   // Pink Ranger (Kimberly Hart, MMPR) — mmpr_pink-gated command layer\n"
     "import { tickMmprPink, isMmprPink, clearMmprPink, mmprPinkLocked, isMmprPinkUltActive, updateMmprPinkUlt, clearMmprPinkUlt } from './mmprPinkState.js'\n"
     "import { drawMmprPinkFx, playMmprPinkCues } from './mmprPinkFx.js'\n"
     "import { mmprPinkHarnessApi } from './mmprPinkHarness.js'\n")
once("  fighters: () => gameState === GAME_STATES.FFA_BATTLE ? ffaState.fighters : [p1, p2] }\n",
     "  fighters: () => gameState === GAME_STATES.FFA_BATTLE ? ffaState.fighters : [p1, p2] }\n"
     "const MMPR_PINK_WORLD = MMPR_BLACK_WORLD   // Pink Ranger: the same self-contained world (Thunder Megazord strikes + arrows read fighters / spawn / damage)\n")
once("isMmprBlackUltActive() ", "isMmprBlackUltActive() || isMmprPinkUltActive() ")
s, k = re.subn(r"(?m)^(\s*)clearMmprBlackUlt\(\)(.*)$", lambda m: m.group(0) + "\n" + m.group(1) + "clearMmprPinkUlt()   // Pink Ranger Thunderstring (freeze contract)", s); assert k == 4, k
once("  for (const _f of [p1, p2]) if (_f) clearMmprBlack(_f,MMPR_BLACK_WORLD)\n",
     "  for (const _f of [p1, p2]) if (_f) clearMmprBlack(_f,MMPR_BLACK_WORLD)\n  for (const _f of [p1, p2]) if (_f) clearMmprPink(_f,MMPR_PINK_WORLD)\n", 4)
once("  tickMmprBlack(fighter,nearest,readRawControls(fighter)||{},MMPR_BLACK_WORLD)\n  playMmprBlackCues(fighter)\n",
     "  tickMmprBlack(fighter,nearest,readRawControls(fighter)||{},MMPR_BLACK_WORLD)\n  playMmprBlackCues(fighter)\n"
     "  tickMmprPink(fighter,nearest,readRawControls(fighter)||{},MMPR_PINK_WORLD)\n  playMmprPinkCues(fighter)\n")
once("  if (isMmprBlack(fighter)) { const mc=updateMmprBlackCommandCombat(fighter,inputState,nearest,MMPR_BLACK_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }\n",
     "  if (isMmprBlack(fighter)) { const mc=updateMmprBlackCommandCombat(fighter,inputState,nearest,MMPR_BLACK_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }\n"
     "  if (isMmprPink(fighter)) { const mc=updateMmprPinkCommandCombat(fighter,inputState,nearest,MMPR_PINK_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }\n")
once("JSON.stringify(f.currentAttack || null))   // Black Ranger + Falconzord sortie GAME_STATE\n",
     "JSON.stringify(f.currentAttack || null))   // Black Ranger + Falconzord sortie GAME_STATE\n"
     "  if (isMmprPink(f)) snap.push(JSON.stringify(f._mmprPink || null))   // Pink Ranger GAME_STATE (bow draw, Spotter Link, call location, Thread); _falcon/currentAttack pushed above\n")
once("clearMmprBlack(p1,MMPR_BLACK_WORLD);clearMmprBlack(p2,MMPR_BLACK_WORLD)",
     "clearMmprBlack(p1,MMPR_BLACK_WORLD);clearMmprBlack(p2,MMPR_BLACK_WORLD);clearMmprPink(p1,MMPR_PINK_WORLD);clearMmprPink(p2,MMPR_PINK_WORLD)", 2)
once("mmprBlackLocked(fighter, readRawControls(fighter)) || teleportTick",
     "mmprBlackLocked(fighter, readRawControls(fighter)) || mmprPinkLocked(fighter, readRawControls(fighter)) || teleportTick")
once("  tickMmprBlack(fighter,getOpponent(fighter),readRawControls(fighter)||{},MMPR_BLACK_WORLD)\n  playMmprBlackCues(fighter)\n",
     "  tickMmprBlack(fighter,getOpponent(fighter),readRawControls(fighter)||{},MMPR_BLACK_WORLD)\n  playMmprBlackCues(fighter)\n"
     "  tickMmprPink(fighter,getOpponent(fighter),readRawControls(fighter)||{},MMPR_PINK_WORLD)\n  playMmprPinkCues(fighter)\n")
once("    const mc=updateMmprBlackCommandCombat(fighter,inputState,getOpponent(fighter),MMPR_BLACK_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }\n",
     "    const mc=updateMmprBlackCommandCombat(fighter,inputState,getOpponent(fighter),MMPR_BLACK_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }\n"
     "  if (isMmprPink(fighter)) {   // Pink Ranger command layer: 'consumed' | 'grab'\n"
     "    const mc=updateMmprPinkCommandCombat(fighter,inputState,getOpponent(fighter),MMPR_PINK_WORLD)\n"
     "    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }\n")
once("    clearMmprBlack(f,MMPR_BLACK_WORLD)\n    clearSpdRed(f)\n",
     "    clearMmprBlack(f,MMPR_BLACK_WORLD)\n    clearMmprPink(f,MMPR_PINK_WORLD)\n    clearSpdRed(f)\n")
once("    if (isMmprBlack(f)) f._mmprBlackRemoteInput = replay.isPlayback() || netMatch.isActive()\n",
     "    if (isMmprBlack(f)) f._mmprBlackRemoteInput = replay.isPlayback() || netMatch.isActive()\n"
     "    if (isMmprPink(f)) f._mmprPinkRemoteInput = replay.isPlayback() || netMatch.isActive()\n")
once("  if (isMmprBlackUltActive()) {\n    updateMmprBlackUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }\n",
     "  if (isMmprBlackUltActive()) {\n    updateMmprBlackUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }\n"
     "  // PINK RANGER \"THUNDERSTRING: HEAVEN'S FINAL ARROW\": the same freeze contract (mmprPinkState.js).\n"
     "  if (isMmprPinkUltActive()) {\n    updateMmprPinkUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }\n")
once("    drawMmprBlackFx(c, fighter, getOpponent(fighter))",
     "    drawMmprPinkFx(c, fighter, getOpponent(fighter))   // Pink Ranger — Thunder Megazord strike / ultimate scene, Spotter reticle, call location, warnings, Command pips, Thread flash, blink ghost (render-only)\n"
     "    drawMmprBlackFx(c, fighter, getOpponent(fighter))")
once("    && !(a.rosterKey === \"mmpr_black\" && a.skinId !== b.skinId)   // Black Ranger: same rule\n",
     "    && !(a.rosterKey === \"mmpr_black\" && a.skinId !== b.skinId)   // Black Ranger: same rule\n"
     "    && !(a.rosterKey === \"mmpr_pink\" && a.skinId !== b.skinId)   // Pink Ranger: same rule\n")
once("    mmprBlackTest: mmprBlackHarnessApi(",
     "    mmprPinkTest: mmprPinkHarnessApi({p1:()=>p1,p2:()=>p2,world:MMPR_PINK_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),\n"
     "    mmprBlackTest: mmprBlackHarnessApi(")
cur = open(p).read()
assert hashlib.sha256(cur.encode()).hexdigest() == h0, 'game.js changed while patching — aborting'
open(p, 'w').write(s); print('game.js hooks applied')
