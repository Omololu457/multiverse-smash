#!/usr/bin/env python3
"""Frozone: idempotent, narrow registration hooks in shared files (anchored right AFTER the Syndrome lines).
Each hook = (file, anchor, op, text, marker[, count]). anchor must occur EXACTLY `count` times (asserted); op
'after_line' inserts `text` as new line(s) after the line containing anchor; op 'replace' substitutes anchor -> text.
A hook whose marker is already present is skipped, so re-running is a no-op. Other writers' lines are never touched;
each file is re-read immediately before writing and written only if changed (and only if nobody changed it meanwhile).
--head --out DIR: rebuild each shared file from HEAD:<file> with HEAD_ANCHORS instead (for a private-index commit that
carries ONLY Frozone's lines — the worktree's Syndrome / Batman / Mr. Incredible lines are other sessions' work).
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...] | --head --out DIR"""
import sys, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  frozone: { work: 'Frozone — Game Boy Advance \"The Incredibles\" playable-character sheet', artists: ['redblueyellow (sprite ripper; on-sheet caption: \"Ripped by redblueyellow. No credit needed.\")', 'Original GBA game art (THQ / Heavy Iron)'],\n"
  "    source: 'Supplied \"Game Boy Advance - The Incredibles - Playable Characters - Frozone.png\" (SHA-256 34aeab73…; preserved byte-identical in assets/frozone/source/). Exact background key (0,128,128) removed; caption excluded; exact rects in docs/frozone/source_rects.json; nearest-neighbour ×2 only. Procedural hard-edged ice effects documented in docs/frozone/ICE_SYSTEM.md. Skins: precomputed exact-palette role recolours (tools/frozone/build_skins.py).',\n"
  "    files: ['assets/frozone/**'] },")
HOOKS = [
  ('characters.js', "import { syndrome } from './syndromeData.js'   // Syndrome (The Incredibles, GBA sheets) — syndrome*.js", 'after_line',
   "import { frozone } from './frozoneData.js'   // Frozone (The Incredibles, GBA sheet) — frozone*.js", "from './frozoneData.js'"),
  ('characters.js', "  syndrome,                          // Syndrome (The Incredibles) — Arsenal Conductor", 'after_line',
   "  frozone,                           // Frozone (The Incredibles) — Ice Skater (Chill → Freeze → Shatter, Black Ice, Absolute Zero); frozone*.js", "  frozone,   "),
  ('spritesheets.js', "  syndrome: { actions: { idle: './assets/syndrome/idle.png' } },", 'after_line',
   "  frozone: { actions: { idle: './assets/frozone/idle.png' } },", "assets/frozone/idle.png"),
  ('kits.js', "import { SYNDROME_KIT } from './syndromeKit.js'   // Syndrome (syndrome) Move List", 'after_line',
   "import { FROZONE_KIT } from './frozoneKit.js'   // Frozone (frozone) Move List", "frozoneKit.js"),
  ('kits.js', "  syndrome: SYNDROME_KIT,", 'after_line', "  frozone: FROZONE_KIT,", "frozone: FROZONE_KIT"),
  ('skins.js', "import { SYNDROME_SKINS } from './syndromeSkins.js'   // Syndrome default + 12 whole-arsenal skins (cosmetic, precomputed)", 'after_line',
   "import { FROZONE_SKINS } from './frozoneSkins.js'   // Frozone default + 10 skins (body, portrait, disc, ice; cosmetic, precomputed)", "frozoneSkins.js"),
  ('skins.js', "  syndrome: SYNDROME_SKINS,", 'after_line', "  frozone: FROZONE_SKINS,", "frozone: FROZONE_SKINS"),
  ('sound.js', "import { SYNDROME_SOUNDS } from './syndromeSound.js'   // Syndrome synth SFX (SFX bus; voice bus untouched; no dialogue)", 'after_line',
   "import { FROZONE_SOUNDS } from './frozoneSound.js'   // Frozone synth SFX (SFX bus; voice bus untouched; no dialogue)", "frozoneSound.js"),
  ('sound.js', "  ...SYNDROME_SOUNDS, // syndrome_*", 'after_line',
   "  ...FROZONE_SOUNDS, // frozone_* : ice casts, lance, Black Ice, skate / brake, Chill / Freeze / Shatter, Absolute Zero", "...FROZONE_SOUNDS"),
  ('credits.js', "    files: ['assets/syndrome/**'] },", 'after_line', CREDIT, "assets/frozone/**"),
  ('combat.js', "import { syndromeHitbox, syndromeBlock, syndromeHit, syndromeProjectileHit } from './syndromeState.js'", 'after_line',
   "import { frozoneHitbox, frozoneBlock, frozoneHit, frozoneProjectileHit } from './frozoneState.js'   // Frozone hooks (frozone-gated)", "from './frozoneState.js'"),
  ('combat.js', "  if (a?.sy && fighter.rosterKey === 'syndrome') return syndromeHitbox(fighter)", 'after_line',
   "  if (a?.fz && fighter.rosterKey === 'frozone') return frozoneHitbox(fighter)   // Frozone: the ice strike's box at the casting hand (body-less casts have none — Lance / Black Ice are projectiles)", "return frozoneHitbox(fighter)"),
  ('combat.js', "    if (!flawless) syndromeBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) frozoneBlock(attacker, defender, atk)   // Frozone: authored blockstun; no Chill on block; frozone-gated", "frozoneBlock(attacker"),
  ('combat.js', "    syndromeHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    frozoneHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Frozone: clean flag (chain / cancels), Chill / Freeze / Shatter, ultimate confirm; frozone-gated", "frozoneHit(attacker"),
  ('combat.js', "      syndromeProjectileHit(proj, fighter, {armored:!!supArmoredProj})", 'after_line',
   "      frozoneProjectileHit(proj, fighter, {armored:!!supArmoredProj})   // Frozone: Lance / Black Ice contact → Chill (clean only), thaw; frozone-gated", "frozoneProjectileHit(proj"),
  ('sprite.js', "    if (fighter.rosterKey === 'syndrome') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'frozone') fighter._lastSpriteFrame = this.frameIndex;   // Frozone: presentation read (harness frame checks)", "rosterKey === 'frozone') fighter._lastSpriteFrame"),
  ('input.js', "!fighter._syndromeRemoteInput && ", 'replace', "!fighter._syndromeRemoteInput && !fighter._frozoneRemoteInput && ", "!fighter._frozoneRemoteInput && ", 2),
  ('input.js', "fighter.rosterKey === 'syndrome' || ", 'replace', "fighter.rosterKey === 'syndrome' || fighter.rosterKey === 'frozone' || ", "fighter.rosterKey === 'frozone' || "),
]
GAME = [
  ("import { syndromeHarnessApi } from './syndromeHarness.js'", 'after_line',
   "import { updateFrozoneCommandCombat } from './frozone.js'   // Frozone (The Incredibles) — frozone-gated command layer\nimport { tickFrozone, isFrozone, clearFrozone, frozoneLocked, isFrozoneUltActive, updateFrozoneUlt, clearFrozoneUlt, updateFrozoneIntro, finalizeFrozoneIntro } from './frozoneState.js'\nimport { drawFrozoneUnder, drawFrozoneOver, drawFrozoneHud, drawFrozoneIntroCard, playFrozoneCues } from './frozoneFx.js'\nimport { frozoneHarnessApi } from './frozoneHarness.js'", "from './frozone.js'"),
  ("const SYNDROME_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const FROZONE_WORLD = MMPR_BLACK_WORLD   // Frozone: the same self-contained world (stage width, fighters, projectiles = Lance / Black Ice volumes, Shatter + ultimate damage through W.damage)", "const FROZONE_WORLD"),
  ("isSyndromeUltActive() || ", 'replace', "isSyndromeUltActive() || isFrozoneUltActive() || ", "isFrozoneUltActive() || "),
  ("  clearSyndromeUlt()   // Syndrome OPERATION KRONOS (freeze contract)", 'after_line',
   "  clearFrozoneUlt()   // Frozone ABSOLUTE ZERO (freeze contract)", "clearFrozoneUlt()   // Frozone ABSOLUTE", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearSyndrome(_f,SYNDROME_WORLD)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearFrozone(_f,FROZONE_WORLD)", "if (_f) clearFrozone(_f,FROZONE_WORLD)", 4),
  ("  tickSyndrome(fighter,nearest,readRawControls(fighter)||{},SYNDROME_WORLD)\n  playSyndromeCues(fighter)", 'after_line',
   "  tickFrozone(fighter,nearest,readRawControls(fighter)||{},FROZONE_WORLD)\n  playFrozoneCues(fighter)", "tickFrozone(fighter,nearest,"),
  ("  if (isSyndrome(fighter)) { const mc=updateSyndromeCommandCombat(fighter,inputState,nearest,SYNDROME_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isFrozone(fighter)) { const mc=updateFrozoneCommandCombat(fighter,inputState,nearest,FROZONE_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateFrozoneCommandCombat(fighter,inputState,nearest"),
  ("clearSyndrome(p1,SYNDROME_WORLD);clearSyndrome(p2,SYNDROME_WORLD)", 'replace',
   "clearSyndrome(p1,SYNDROME_WORLD);clearSyndrome(p2,SYNDROME_WORLD);clearFrozone(p1,FROZONE_WORLD);clearFrozone(p2,FROZONE_WORLD)", "clearFrozone(p1,FROZONE_WORLD);clearFrozone(p2", 2),
  ("  if (isSyndrome(f)) snap.push(JSON.stringify([f._syndrome ? { ...f._syndrome, cues: undefined } : null, f.currentAttack?.sy || null]))", 'after_line',
   "  if (isFrozone(f)) snap.push(JSON.stringify([f._frozone ? { ...f._frozone, cues: undefined } : null, f.currentAttack?.fz || null, f.dashSpeed || 0]))   // Frozone GAME_STATE (Chill pips / Freeze / immunity / Black Ice patch / skate profile / ribbon / press edges / move descriptor; render cue queue excluded)", "f.currentAttack?.fz || null"),
  ("syndromeLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "syndromeLocked(fighter, readRawControls(fighter)) || frozoneLocked(fighter, readRawControls(fighter)) ||", "frozoneLocked(fighter, readRawControls"),
  ("  tickSyndrome(fighter,getOpponent(fighter),readRawControls(fighter)||{},SYNDROME_WORLD)\n  playSyndromeCues(fighter)", 'after_line',
   "  tickFrozone(fighter,getOpponent(fighter),readRawControls(fighter)||{},FROZONE_WORLD)\n  playFrozoneCues(fighter)", "tickFrozone(fighter,getOpponent"),
  ("  if (isSyndrome(fighter)) {   // Syndrome command layer: 'consumed' | 'grab'\n    const mc=updateSyndromeCommandCombat(fighter,inputState,getOpponent(fighter),SYNDROME_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isFrozone(fighter)) {   // Frozone command layer: 'consumed' | 'grab'\n    const mc=updateFrozoneCommandCombat(fighter,inputState,getOpponent(fighter),FROZONE_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateFrozoneCommandCombat(fighter,inputState,getOpponent"),
  ("    clearSyndrome(f,SYNDROME_WORLD)", 'after_line', "    clearFrozone(f,FROZONE_WORLD)", "    clearFrozone(f,FROZONE_WORLD)"),
  ("    if (isSyndrome(f)) f._syndromeRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isFrozone(f)) f._frozoneRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._frozoneRemoteInput = replay"),
  ("  if (isSyndromeUltActive()) {\n    updateSyndromeUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // FROZONE \"ABSOLUTE ZERO: CITY ON ICE\": the same freeze contract (frozoneState.js).\n  if (isFrozoneUltActive()) {\n    updateFrozoneUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateFrozoneUlt()"),
  ("  drawSyndromeUnder(ctx, p1, p2, SYNDROME_WORLD)", 'after_line',
   "  drawFrozoneUnder(ctx, p1, p2, FROZONE_WORLD)   // Frozone — Black Ice patch, skate ribbon, ultimate floor ice + ramp (world-space, under the fighters; render-only; gated)", "drawFrozoneUnder(ctx"),
  ("  drawSyndromeOver(ctx, p1, p2, SYNDROME_WORLD)", 'after_line',
   "  drawFrozoneOver(ctx, p1, p2, FROZONE_WORLD)   // Frozone — ice strikes, lance, guard plate, Chill pips, freeze shell, shatter fragments (render-only; gated)", "drawFrozoneOver(ctx"),
  ("    && !(a.rosterKey === \"syndrome\" && a.skinId !== b.skinId)   // Syndrome: same rule", 'after_line',
   "    && !(a.rosterKey === \"frozone\" && a.skinId !== b.skinId)   // Frozone: same rule", "a.rosterKey === \"frozone\""),
  ("  drawSyndromeHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawFrozoneHud(ctx, canvas, p1, p2)   // Frozone: Black Ice / Freeze / air-skate readout under his health; Absolute Zero cut-in (gated)", "drawFrozoneHud(ctx"),
  ("      drawSyndromeIntroCard(ctx, canvas, p1, p2)", 'after_line',
   "      drawFrozoneIntroCard(ctx, canvas, p1, p2)   // Frozone: portrait + name card while his own intro plays (presentation only; gated)", "drawFrozoneIntroCard(ctx"),
  ("    syndromeTest: syndromeHarnessApi(", 'after_line',
   "    frozoneTest: frozoneHarnessApi({p1:()=>p1,p2:()=>p2,world:FROZONE_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "frozoneTest: frozoneHarnessApi"),
  # intro skate-in (combat frozen during INTRO; same pattern as Killua / Sanji) + finalize on end / skip
  ("updateSanjiIntro(p1) }", 'replace', "updateSanjiIntro(p1); updateFrozoneIntro(p1) }", "updateFrozoneIntro(p1)"),
  ("updateSanjiIntro(p2) }", 'replace', "updateSanjiIntro(p2); updateFrozoneIntro(p2) }", "updateFrozoneIntro(p2)"),
  ("finalizeSanjiIntroPos(p1) }", 'replace', "finalizeSanjiIntroPos(p1); finalizeFrozoneIntro(p1) }", "finalizeFrozoneIntro(p1) }"),
  ("finalizeSanjiIntroPos(p2) }", 'replace', "finalizeSanjiIntroPos(p2); finalizeFrozoneIntro(p2) }", "finalizeFrozoneIntro(p2) }"),
  ("    finalizeKilluaIntroPos(p1); finalizeKilluaIntroPos(p2)   // undo the roll-in offset if we skip mid-roll", 'after_line',
   "    finalizeFrozoneIntro(p1); finalizeFrozoneIntro(p2)   // Frozone: undo the skate-in offset if skipped mid-skate", "finalizeFrozoneIntro(p1); finalizeFrozoneIntro(p2)"),
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
