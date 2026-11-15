#!/usr/bin/env python3
"""Megumi Fushiguro: idempotent, narrow registration hooks in shared files (anchored AFTER the Robin lines).
Each hook = (file, anchor, op, text, marker[, count]). anchor must occur EXACTLY `count` times (asserted); op
'after_line' inserts `text` as new line(s) after the line containing anchor; op 'replace' substitutes anchor -> text.
A hook whose marker is already present is skipped, so re-running is a no-op. Other writers' lines are never touched;
the file is re-read immediately before writing and written only if changed.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  megumi_fushiguro: { work: 'Megumi Fushiguro — Jump Ultimate Stars-style sprite sheet', artists: ['xxniiroxx (DeviantArt)'],\n"
  "    source: 'Supplied \"megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg\" (SHA-256 aee09880…; preserved byte-identical in assets/megumi_fushiguro/source/). Background removed by border-connected key segmentation + conservative edge decontamination; sheet labels / signature excluded by explicit rectangles; nearest-neighbour integer scaling only (docs/megumi/ASSET_QUALITY.md, SPRITE_MAP.md, source_rects.json). Skins: precomputed region recolours (tools/megumi/build_skins.py).',\n"
  "    files: ['assets/megumi_fushiguro/**'] },")
R = "robin"
HOOKS = [
  ('characters.js', "import { robin } from './robinData.js'", 'after_line',
   "import { megumi_fushiguro } from './megumiData.js'   // Megumi Fushiguro (Jujutsu Kaisen, Ten Shadows) — megumi*.js", "from './megumiData.js'"),
  ('characters.js', "  robin,                             // Robin (Dick Grayson, DC)", 'after_line',
   "  megumi_fushiguro,                  // Megumi Fushiguro (JJK) — Tactical Summoner (one-action shikigami, Shadow Routes, Max Elephant, Shadow Step, Chimera Shadow Garden); megumi*.js", "  megumi_fushiguro,  "),
  ('spritesheets.js', "  robin: { actions: { idle: './assets/robin/idle.png' } },", 'after_line',
   "  megumi_fushiguro: { actions: { idle: './assets/megumi_fushiguro/idle.png' } },", "assets/megumi_fushiguro/idle.png"),
  ('kits.js', "import { ROBIN_KIT } from './robinKit.js'", 'after_line',
   "import { MEGUMI_KIT } from './megumiKit.js'   // Megumi Fushiguro (megumi_fushiguro) Move List", "megumiKit.js"),
  ('kits.js', "  robin: ROBIN_KIT,", 'after_line', "  megumi_fushiguro: MEGUMI_KIT,", "megumi_fushiguro: MEGUMI_KIT"),
  ('skins.js', "import { ROBIN_SKINS } from './robinSkins.js'", 'after_line',
   "import { MEGUMI_SKINS } from './megumiSkins.js'   // Megumi default + 10 skins (cosmetic, precomputed region recolours)", "megumiSkins.js"),
  ('skins.js', "  robin: ROBIN_SKINS,", 'after_line', "  megumi_fushiguro: MEGUMI_SKINS,", "megumi_fushiguro: MEGUMI_SKINS"),
  ('sound.js', "import { ROBIN_SOUNDS } from './robinSound.js'", 'after_line',
   "import { MEGUMI_SOUNDS } from './megumiSound.js'   // Megumi synth SFX (SFX bus; voice bus untouched; no dialogue)", "megumiSound.js"),
  ('sound.js', "  ...ROBIN_SOUNDS, // robin_*", 'after_line',
   "  ...MEGUMI_SOUNDS, // megumi_* : hand sign, shikigami emergence, lightning, serpent rise, water, pull, Shadow Step, Shadow Route, ultimate", "...MEGUMI_SOUNDS"),
  ('credits.js', "    files: ['assets/robin/**'] },", 'after_line', CREDIT, "assets/megumi_fushiguro/**"),
  ('combat.js', "import { robinHitbox, robinBlock, robinHit, robinProjectileHit } from './robinState.js'", 'after_line',
   "import { megumiHitbox, megumiBlock, megumiHit, megumiProjectileHit } from './megumiState.js'   // Megumi hooks (megumi-gated)", "from './megumiState.js'"),
  ('combat.js', "  if (a?.rb && fighter.rosterKey === 'robin') return robinHitbox(fighter)", 'after_line',
   "  if (a?.mg && fighter.rosterKey === 'megumi_fushiguro') return megumiHitbox(fighter)   // Megumi: per-move body box; summon gestures have none (the shikigami's projectile volume hits)", "return megumiHitbox(fighter)"),
  ('combat.js', "    if (!flawless) robinBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) megumiBlock(attacker, defender, atk)   // Megumi: authored blockstun; megumi-gated", "megumiBlock(attacker"),
  ('combat.js', "    robinHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    megumiHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Megumi: clean flag (chain / cancels), Shadow Route progress; megumi-gated", "megumiHit(attacker"),
  ('combat.js', "      robinProjectileHit(proj, fighter, {armored:!!supArmoredProj})", 'after_line',
   "      megumiProjectileHit(proj, fighter, {armored:!!supArmoredProj})   // Megumi: summon contact bookkeeping (route confirm, Toad pull, Totality confirm); megumi-gated", "megumiProjectileHit(proj"),
  ('sprite.js', "    if (fighter.rosterKey === 'robin') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'megumi_fushiguro') fighter._lastSpriteFrame = this.frameIndex;   // Megumi: presentation read for Shadow Step echoes (megumiFx)", "rosterKey === 'megumi_fushiguro') fighter._lastSpriteFrame"),
  # both remote-input skips (controller poll + pad command path) and the pad-enabled roster list
  ('input.js', "!fighter._robinRemoteInput && ", 'replace',
   "!fighter._robinRemoteInput && !fighter._megumiRemoteInput && ", "!fighter._megumiRemoteInput && ", 2),
  ('input.js', "fighter.rosterKey === 'robin' || ", 'replace',
   "fighter.rosterKey === 'robin' || fighter.rosterKey === 'megumi_fushiguro' || ", "fighter.rosterKey === 'megumi_fushiguro' || "),
]
GAME = [
  ("import { robinHarnessApi } from './robinHarness.js'", 'after_line',
   "import { updateMegumiCommandCombat } from './megumi.js'   // Megumi Fushiguro (JJK) — megumi-gated command layer\nimport { tickMegumi, isMegumi, clearMegumi, megumiLocked, megumiOwnsCharge, isMegumiUltActive, updateMegumiUlt, clearMegumiUlt } from './megumiState.js'\nimport { drawMegumiFx, drawMegumiHud, drawMegumiIntroCard, playMegumiCues } from './megumiFx.js'\nimport { megumiHarnessApi } from './megumiHarness.js'", "from './megumi.js'"),
  ("const ROBIN_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const MEGUMI_WORLD = MMPR_BLACK_WORLD   // Megumi: the same self-contained world (stage width, projectiles = summon hit volumes, ultimate damage through W.damage)", "const MEGUMI_WORLD"),
  ("isRobinUltActive() || ", 'replace',
   "isRobinUltActive() || isMegumiUltActive() || ", "isMegumiUltActive() || "),
  ("  clearRobinUlt()   // Robin CHECKMATE (freeze contract)", 'after_line',
   "  clearMegumiUlt()   // Megumi CHIMERA SHADOW GARDEN (freeze contract)", "clearMegumiUlt()   // Megumi CHIMERA", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearRobin(_f,ROBIN_WORLD)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearMegumi(_f,MEGUMI_WORLD)", "if (_f) clearMegumi(_f,MEGUMI_WORLD)", 4),
  ("  tickRobin(fighter,nearest,readRawControls(fighter)||{},ROBIN_WORLD)\n  playRobinCues(fighter)", 'after_line',
   "  tickMegumi(fighter,nearest,readRawControls(fighter)||{},MEGUMI_WORLD)\n  playMegumiCues(fighter)", "tickMegumi(fighter,nearest,"),
  ("  if (isRobin(fighter)) { const mc=updateRobinCommandCombat(fighter,inputState,nearest,ROBIN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isMegumi(fighter)) { const mc=updateMegumiCommandCombat(fighter,inputState,nearest,MEGUMI_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateMegumiCommandCombat(fighter,inputState,nearest"),
  ("clearRobin(p1,ROBIN_WORLD);clearRobin(p2,ROBIN_WORLD)", 'replace',
   "clearRobin(p1,ROBIN_WORLD);clearRobin(p2,ROBIN_WORLD);clearMegumi(p1,MEGUMI_WORLD);clearMegumi(p2,MEGUMI_WORLD)", "clearMegumi(p1,MEGUMI_WORLD);clearMegumi(p2", 2),
  ("  if (isRobin(f)) snap.push(JSON.stringify([f._robin || null, f.currentAttack?.rb || null, f._rbLand || 0]))", 'after_line',
   "  if (isMegumi(f)) snap.push(JSON.stringify([f._megumi || null, f.currentAttack?.mg || null]))   // Megumi GAME_STATE (summon, rabbits, pull, Shadow Route, step cooldown, airtime allowances, press edges, move descriptor)", "f._megumi || null, f.currentAttack?.mg"),
  ("robinLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "robinLocked(fighter, readRawControls(fighter)) || megumiLocked(fighter, readRawControls(fighter)) ||", "megumiLocked(fighter, readRawControls"),
  ("!robinOwnsCharge(fighter) && !fighter.attacking", 'replace',
   "!robinOwnsCharge(fighter) && !megumiOwnsCharge(fighter) && !fighter.attacking", "!megumiOwnsCharge(fighter) && !fighter.attacking"),
  ("  tickRobin(fighter,getOpponent(fighter),readRawControls(fighter)||{},ROBIN_WORLD)\n  playRobinCues(fighter)", 'after_line',
   "  tickMegumi(fighter,getOpponent(fighter),readRawControls(fighter)||{},MEGUMI_WORLD)\n  playMegumiCues(fighter)", "tickMegumi(fighter,getOpponent"),
  ("    const mc=updateRobinCommandCombat(fighter,inputState,getOpponent(fighter),ROBIN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isMegumi(fighter)) {   // Megumi command layer: 'consumed' | 'grab'\n    const mc=updateMegumiCommandCombat(fighter,inputState,getOpponent(fighter),MEGUMI_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateMegumiCommandCombat(fighter,inputState,getOpponent"),
  ("    clearRobin(f,ROBIN_WORLD)", 'after_line', "    clearMegumi(f,MEGUMI_WORLD)", "    clearMegumi(f,MEGUMI_WORLD)"),
  ("    if (isRobin(f)) f._robinRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isMegumi(f)) f._megumiRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._megumiRemoteInput = replay"),
  ("    updateRobinUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // MEGUMI \"CHIMERA SHADOW GARDEN\": the same freeze contract (megumiState.js).\n  if (isMegumiUltActive()) {\n    updateMegumiUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateMegumiUlt()"),
  ("    drawRobinFx(c, fighter, getOpponent(fighter))", 'after_line',
   "    drawMegumiFx(c, fighter)   // Megumi — shikigami, rabbits, Shadow Step echoes, Mahoraga intro showcase, ultimate shikigami (render-only; megumi only)", "drawMegumiFx(c, fighter"),
  ("    && !(a.rosterKey === \"robin\" && a.skinId !== b.skinId)", 'after_line',
   "    && !(a.rosterKey === \"megumi_fushiguro\" && a.skinId !== b.skinId)   // Megumi: same rule", "a.rosterKey === \"megumi_fushiguro\""),
  ("  drawRobinHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawMegumiHud(ctx, canvas, p1, p2)   // Megumi: Shadow Route stocks (supplied Divine Dog silhouette) + Shadow Step status; domain cut-in (gated)", "drawMegumiHud(ctx"),
  ("      drawRobinIntroCard(ctx, canvas, p1, p2)", 'after_line',
   "      drawMegumiIntroCard(ctx, canvas, p1, p2)   // Megumi: name card while his own intro plays; Mahoraga variant labelled as a showcase (gated)", "drawMegumiIntroCard(ctx"),
  ("    robinTest: robinHarnessApi(", 'after_line',
   "    megumiTest: megumiHarnessApi({p1:()=>p1,p2:()=>p2,world:MEGUMI_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "megumiTest: megumiHarnessApi"),
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
