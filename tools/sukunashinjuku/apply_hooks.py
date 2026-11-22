#!/usr/bin/env python3
"""MSV1-SUKUNA (sukuna_shinjuku): idempotent, narrow registration hooks in shared files (Gojo Shinjuku pattern; most
anchors are Gojo Shinjuku's own hook lines, so this fighter's lines sit right after his). Each hook =
(phase, file, anchor, op, text, marker[, count]). A hook whose marker is present is skipped (re-run = no-op).
The OLD Sukuna (`sukuna`) is never touched: every line here is gated on rosterKey === 'sukuna_shinjuku' / isSks().
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...] [--phase N]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  sukuna_shinjuku: { work: 'Ryomen Sukuna (Shinjuku Arc) — sprite sheet', artists: ['Mrfresh', 'Zeltas Black', 'Mps', 'Kenny', 'Dark night', 'Dr animation'],\n"
  "    source: 'Ryomen Sukuna (Shinjuku Arc, Megumi\\'s body) sprites credited on the supplied sheet to Mrfresh, Zeltas Black, Mps, Kenny, Dark night and Dr animation (kept in assets/incoming/sukuna_shinjuku/). Green background RGB(34,177,76) chroma-keyed; the two portraits and the credits text excluded; nearest-neighbour integer scaling only (docs/msv1/sukuna/LEDGER.md, tools/sukunashinjuku/slice.py). Skins: precomputed region recolours (tools/sukunaskins/).',\n"
  "    files: ['assets/sukuna_shinjuku/**'] },")
HOOKS = [
  (1, 'characters.js', "import { gojo_shinjuku } from './gojoShinjukuData.js'", 'after_line',
   "import { sukuna_shinjuku } from './sukunaShinjukuData.js'   // MSV1-SUKUNA Ryomen Sukuna (Shinjuku Arc) — a NEW fighter beside the old `sukuna` (untouched); sukunaShinjuku*.js", "from './sukunaShinjukuData.js'"),
  (1, 'characters.js', "  gojo, gojo_shinjuku, sukuna, alt_sukuna:", 'replace', "  gojo, gojo_shinjuku, sukuna, sukuna_shinjuku, alt_sukuna:", "sukuna, sukuna_shinjuku,"),
  (1, 'spritesheets.js', "  gojo_shinjuku: { actions: { idle: './assets/gojo_shinjuku/idle.png' } },", 'after_line',
   "  sukuna_shinjuku: { actions: { idle: './assets/sukuna_shinjuku/idle.png' } },", "assets/sukuna_shinjuku/idle.png"),
  (1, 'credits.js', "    files: ['assets/gojo_shinjuku/**'] },", 'after_line', CREDIT, "assets/sukuna_shinjuku/**"),
]
WORLD = "const SUKUNA_SHINJUKU_WORLD = GOJO_SHINJUKU_WORLD   // MSV1-SUKUNA Ryomen Sukuna (Shinjuku): the same world (lockstep frame, projectiles to cut, ground patches to clear)"
G2 = [
  ("import { gojoShinjukuHarnessApi } from './gojoShinjukuHarness.js'", 'after_line',
   "import { updateSksCommandCombat } from './sukunaShinjuku.js'   // MSV1-SUKUNA Ryomen Sukuna (Shinjuku Arc) — sukuna_shinjuku-gated command layer\n"
   "import { tickSks, isSks, clearSks, clearSksMarks, sksLockedForMovement, markSksCpu } from './sukunaShinjukuState.js'\n"
   "import { drawSksFx, drawSksBurn, drawSksHud, playSksCues } from './sukunaShinjukuFx.js'\n"
   "import { sukunaShinjukuHarnessApi } from './sukunaShinjukuHarness.js'", "from './sukunaShinjuku.js'"),
  ("const GOJO_SHINJUKU_WORLD = {", 'after_line', WORLD, "const SUKUNA_SHINJUKU_WORLD"),
  ("  for (const _f of [p1, p2]) if (_f) { clearGs(_f); clearGsMarks(_f) }", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) { clearSks(_f); clearSksMarks(_f) }", "if (_f) { clearSks(_f); clearSksMarks(_f) }", 4),
  ("    clearGs(f); clearGsMarks(f)", 'after_line', "    clearSks(f); clearSksMarks(f)", "    clearSks(f); clearSksMarks(f)"),
  ("clearGs(p1);clearGs(p2)", 'replace', "clearGs(p1);clearGs(p2);clearSks(p1);clearSks(p2)", "clearSks(p1);clearSks(p2)", 2),
  ("  tickGs(fighter,nearest,readRawControls(fighter)||{},GOJO_SHINJUKU_WORLD)\n  playGsCues(fighter)", 'after_line',
   "  tickSks(fighter,nearest,readRawControls(fighter)||{},SUKUNA_SHINJUKU_WORLD)\n  playSksCues(fighter)", "tickSks(fighter,nearest,"),
  ("  if (isGs(fighter)) { updateGsCommandCombat(fighter,inputState,nearest,GOJO_SHINJUKU_WORLD);ctrlState={} }", 'after_line',
   "  if (isSks(fighter)) { const mc=updateSksCommandCombat(fighter,inputState,nearest,SUKUNA_SHINJUKU_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }   // Ryomen Sukuna (Shinjuku): every move starts in his command layer", "updateSksCommandCombat(fighter,inputState,nearest"),
  ("  if (isGs(f)) snap.push(", 'after_line',
   "  if (isSks(f)) snap.push(JSON.stringify([f._sks ? { ...f._sks, cues: undefined, fx: undefined } : null, f.currentAttack?.sks || null, f._sksAmp || 0]))   // Ryomen Sukuna (Shinjuku) GAME_STATE: cuts, arrows, fire field, burns, Amplification, World Slash, Empowered window, CPU", "f._sks ? { ...f._sks, cues: undefined"),
  ("  if (isSks(f)) snap.push(", 'after_line',
   "  if (f && f._sksBurn) snap.push(JSON.stringify([f._sksBurn]))   // mark Ryomen Sukuna (Shinjuku) writes on a foe (Fuga burn)", "JSON.stringify([f._sksBurn])"),
  ("gsLockedForMovement(fighter) ||", 'replace', "gsLockedForMovement(fighter) || sksLockedForMovement(fighter) ||", "sksLockedForMovement(fighter) ||"),
  ("  tickGs(fighter,getOpponent(fighter),readRawControls(fighter)||{},GOJO_SHINJUKU_WORLD)\n  playGsCues(fighter)", 'after_line',
   "  tickSks(fighter,getOpponent(fighter),readRawControls(fighter)||{},SUKUNA_SHINJUKU_WORLD)\n  playSksCues(fighter)", "tickSks(fighter,getOpponent"),
  ("    updateGsCommandCombat(fighter,inputState,getOpponent(fighter),GOJO_SHINJUKU_WORLD)\n    updateCombat(fighter,getOpponent(fighter),{},opts); return\n  }", 'after_line',
   "  if (isSks(fighter)) {   // Ryomen Sukuna (Shinjuku) command layer: 'consumed' | 'grab'\n    const mc=updateSksCommandCombat(fighter,inputState,getOpponent(fighter),SUKUNA_SHINJUKU_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateSksCommandCombat(fighter,inputState,getOpponent"),
  ("    if (isGs(f)) f._gsRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isSks(f)) f._sksRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._sksRemoteInput = replay"),
  ("  if (matchConfig.mode !== \"training\") markGsCpu(p2, matchConfig.aiDifficulty)", 'after_line',
   "  if (matchConfig.mode !== \"training\") markSksCpu(p2, matchConfig.aiDifficulty)   // CPU Sukuna (Shinjuku): Dismantle at range, Cleave close, Spiderweb on traps, Amplification only vs Infinity", "markSksCpu(p2, matchConfig.aiDifficulty)   // CPU"),
  ("      markGsCpu(p1, matchConfig.aiDifficulty)", 'after_line', "      markSksCpu(p1, matchConfig.aiDifficulty)", "markSksCpu(p1, matchConfig.aiDifficulty)"),
  ("    markGsCpu(p2, matchConfig.aiDifficulty)\n", 'after_line', "    markSksCpu(p2, matchConfig.aiDifficulty)", "    markSksCpu(p2, matchConfig.aiDifficulty)\n"),
  ("    markGsCpu(f, f._aiController?.difficulty || matchConfig.aiDifficulty)", 'after_line',
   "    markSksCpu(f, f._aiController?.difficulty || matchConfig.aiDifficulty)", "markSksCpu(f, f._aiController"),
  ("    drawGsFx(c, fighter, matchConfig.mode === \"training\")", 'after_line',
   "    drawSksFx(c, fighter); drawSksBurn(c, fighter, _replayFrame)   // Ryomen Sukuna (Shinjuku) — cuts, Fuga, web crack, fire patches, World Slash, Amplification outline, chant captions, bubbles; Fuga burn embers on any fighter (render-only; gated)", "drawSksFx(c, fighter)"),
  ("  drawGsHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawSksHud(ctx, canvas, p1, p2)   // Ryomen Sukuna (Shinjuku): Amplification / cooldown, Empowered Fuga window, burnout (gated)", "drawSksHud(ctx"),
  ("    gojoShinjukuTest: gojoShinjukuHarnessApi(", 'after_line',
   "    sukunaShinjukuTest: sukunaShinjukuHarnessApi({p1:()=>p1,p2:()=>p2,world:SUKUNA_SHINJUKU_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "sukunaShinjukuTest: sukunaShinjukuHarnessApi"),
]
HOOKS += [(2, 'game.js') + g for g in G2]
HOOKS += [
  (2, 'combat.js', "import { gsHitbox, gsBlock, gsHit, gsMeleeGate, gsGrabGate, gsProjectileGate, gsDamageMods } from './gojoShinjukuState.js'", 'after_line',
   "import { sksHitbox, sksBlock, sksHit } from './sukunaShinjukuState.js'   // Ryomen Sukuna (Shinjuku) hooks: his move boxes + contact flags (sukuna_shinjuku-gated)", "from './sukunaShinjukuState.js'"),
  (2, 'combat.js', "  if (a?.gs && fighter.rosterKey === 'gojo_shinjuku') return gsHitbox(fighter)", 'after_line',
   "  if (a?.sks && fighter.rosterKey === 'sukuna_shinjuku') return sksHitbox(fighter)   // Ryomen Sukuna (Shinjuku): per-move body box; technique casts have none (they strike through sukunaShinjukuState)", "return sksHitbox(fighter)"),
  (2, 'combat.js', "    if (!flawless) gsBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) sksBlock(attacker, defender, atk)   // Ryomen Sukuna (Shinjuku): authored blockstun, contact flag; gated", "sksBlock(attacker, defender, atk)"),
  (2, 'combat.js', "    gsHit(attacker, defender, atk)", 'after_line',
   "    sksHit(attacker, defender, atk)   // Ryomen Sukuna (Shinjuku): clean / contact flags (chains, cancels); gated", "    sksHit(attacker, defender, atk)"),
  (2, 'input.js', "!fighter._gsRemoteInput) {", 'replace', "!fighter._gsRemoteInput && !fighter._sksRemoteInput) {", "!fighter._sksRemoteInput) {"),
  (2, 'input.js', "fighter.rosterKey === 'gojo_shinjuku') && !fighter._aiControlled", 'replace',
   "fighter.rosterKey === 'gojo_shinjuku' || fighter.rosterKey === 'sukuna_shinjuku') && !fighter._aiControlled", "fighter.rosterKey === 'sukuna_shinjuku') && !fighter._aiControlled"),
  (2, 'input.js', "!fighter._gsRemoteInput && inputSettings[", 'replace', "!fighter._gsRemoteInput && !fighter._sksRemoteInput && inputSettings[", "!fighter._sksRemoteInput && inputSettings["),
  # Gojo's canon bypasses: Domain Amplification (every hit while active) + World-Cutting Slash ignore Infinity at every level
  (2, 'gojoShinjukuState.js', "  if ((k === GS_KEY || k === 'gojo') && techniqueName && LIMITLESS_TECH.test(techniqueName)) { s.stats.mirrorBypass++; return true }", 'after_line',
   "  if (k === 'sukuna_shinjuku' && ((attacker._sksAmp || 0) > 0 || techniqueName === 'sks_world_slash')) { s.stats.sukunaBypass = (s.stats.sukunaBypass || 0) + 1; return true }   // MSV1-SUKUNA: Domain Amplification / World-Cutting Slash (canon)", "k === 'sukuna_shinjuku' && ((attacker._sksAmp"),
  # clash winner Ryomen Sukuna (Shinjuku) reopens HIS Shrine (the old Sukuna's domain via domainKey); everyone else unchanged
  (2, 'gojoShinjukuState.js', ": { cost: 0, duration: DOMAIN.clashWin / 60, range: 1e5 })", 'replace',
   ": { cost: 0, duration: DOMAIN.clashWin / 60, range: 1e5, ...(winner.rosterKey === 'sukuna_shinjuku' ? { domainKey: 'sukuna' } : {}) })   // MSV1-SUKUNA: his Shrine is the old Sukuna's", "winner.rosterKey === 'sukuna_shinjuku' ? { domainKey: 'sukuna' }"),
]
# Domain Amplification walks through Infinity's L2/L3 repel ring too (optional skip predicate; nobody else passes one)
HOOKS += [
  (2, 'limitless.js', "export function infinityRepel(owner, lvP, W) {", 'replace',
   "export function infinityRepel(owner, lvP, W, skip = null) {   // skip: MSV1-SUKUNA (an amplified Ryomen Sukuna is not repelled)", "infinityRepel(owner, lvP, W, skip = null)"),
  (2, 'limitless.js', "    if (!o || o === owner || !(o.health > 0) || o.isGrabbed) continue\n    const gap = o.x > owner.x", 'replace',
   "    if (!o || o === owner || !(o.health > 0) || o.isGrabbed) continue\n    if (skip && skip(o)) continue\n    const gap = o.x > owner.x", "    if (skip && skip(o)) continue"),
  (2, 'gojoShinjukuState.js', "    const pushed = infinityRepel(f, lvP, W)", 'replace',
   "    const pushed = infinityRepel(f, lvP, W, o => o.rosterKey === 'sukuna_shinjuku' && (o._sksAmp || 0) > 0)   // MSV1-SUKUNA: Domain Amplification is not repelled", "o.rosterKey === 'sukuna_shinjuku' && (o._sksAmp || 0) > 0)   // MSV1-SUKUNA"),
]
HOOKS += [
  (3, 'kits.js', "import { GOJO_SHINJUKU_KIT } from './gojoShinjukuKit.js'", 'after_line',
   "import { SUKUNA_SHINJUKU_KIT } from './sukunaShinjukuKit.js'   // MSV1-SUKUNA Ryomen Sukuna (Shinjuku Arc) move list", "SUKUNA_SHINJUKU_KIT } from"),
  (3, 'kits.js', "  gojo_shinjuku: GOJO_SHINJUKU_KIT,", 'after_line', "  sukuna_shinjuku: SUKUNA_SHINJUKU_KIT,   // MSV1-SUKUNA", "sukuna_shinjuku: SUKUNA_SHINJUKU_KIT"),
]
HOOKS += [
  (4, 'skins.js', "import { GS_SKINS } from './gojoShinjukuSkins.js'", 'after_line',
   "import { SKS_SKINS } from './sukunaShinjukuSkins.js'   // MSV1-SUKUNA Ryomen Sukuna (Shinjuku Arc): default + 20 premade skins (cosmetic, tools/sukunaskins)", "SKS_SKINS } from"),
  (4, 'skins.js', "  gojo_shinjuku: GS_SKINS,", 'after_line', "  sukuna_shinjuku: SKS_SKINS,   // MSV1-SUKUNA", "sukuna_shinjuku: SKS_SKINS"),
]

def main():
  a = sys.argv[1:]; check = '--check' in a
  root = a[a.index('--root') + 1] if '--root' in a else ROOT
  phase = int(a[a.index('--phase') + 1]) if '--phase' in a else 99
  only = None
  if '--only' in a:
    only = set(x for x in a[a.index('--only') + 1:] if not x.startswith('--') and not x.isdigit())
  hooks = [h[1:] for h in HOOKS if h[0] <= phase]
  bad = 0
  for fn in sorted({h[0] for h in hooks}):
    if only and fn not in only: continue
    p = os.path.join(root, fn); src = open(p, encoding='utf-8').read(); out = src
    for h in hooks:
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
