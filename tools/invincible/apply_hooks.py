#!/usr/bin/env python3
"""MSV1-INVINCIBLE (invincible): idempotent, narrow registration hooks in shared files (Gojo / Sukuna Shinjuku pattern).
Each hook = (phase, file, anchor, op, text, marker[, count]). A hook whose marker is present is skipped (re-run = no-op).
Every line is gated on rosterKey === 'invincible' / isInv(). CONCURRENCY: the parallel MSV1-OMNIMAN build hooks the same
shared files from Sukuna's lines, so every hook here is either an `after_line` insertion or a `replace` that INSERTS
before an existing token (the token itself survives) — both builds' anchors keep matching whichever applies first.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...] [--phase N]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  invincible: { work: 'Invincible (Mark Grayson) — SWL+ sprite sheet', artists: ['JustOruma'],\n"
  "    source: 'Invincible sprites by JustOruma (SWL+). Supplied sheet \"invencible_swl_2v_sprite_sheet__by_sayangoku2_dholu2v.png\" (kept as assets/incoming/invincible/invincible.png). Background RGB(32,30,39) keyed with an exact match flooded from the panel borders (the suit navy (27,30,39) is kept); banner, dividers, WIN / LOSE labels, credit boxes, costume strip and the big figure excluded; nearest-neighbour integer scaling only (docs/msv1/invincible/LEDGER.md, tools/invincible/slice.py).',\n"
  "    files: ['assets/invincible/**'] },")
CREDITS_TXT = ("\nInvincible sprites by JustOruma (SWL+)\n"
  "  (the new `invincible` fighter, Mark Grayson; supplied sheet\n"
  "  invencible_swl_2v_sprite_sheet__by_sayangoku2_dholu2v.png)\n"
  "Source files: assets/invincible/**  (ledger: docs/msv1/invincible/LEDGER.md)")
HOOKS = [
  (2, 'characters.js', "import { sukuna_shinjuku } from './sukunaShinjukuData.js'", 'after_line',
   "import { invincible } from './invincibleData.js'   // MSV1-INVINCIBLE Invincible (Mark Grayson) — a NEW fighter, universe invincible beside Omni-Man; invincible*.js", "from './invincibleData.js'"),
  (2, 'characters.js', "  omniman: omniMan,", 'replace', "  omniman: omniMan, invincible,", "omniMan, invincible,"),
  (2, 'spritesheets.js', "  omniman_viltrum: { actions: { idle: './assets/omniman_viltrum/idle.png' } },", 'after_line',
   "  invincible: { actions: { idle: './assets/invincible/idle.png' } },", "assets/invincible/idle.png"),
  (2, 'credits.js', "    files: ['assets/omniman_viltrum/**'] },", 'after_line', CREDIT, "assets/invincible/**"),
  (2, 'CREDITS.txt', "Source files: assets/omniman_viltrum/**  (ledger: docs/msv1/omniman/LEDGER.md)", 'after_line', CREDITS_TXT, "`invincible` fighter"),
]
WORLD = "const INVINCIBLE_WORLD = GOJO_SHINJUKU_WORLD   // MSV1-INVINCIBLE Invincible (Mark Grayson): the same world (lockstep frame, fighters, projectiles, W.damage)"
G2 = [
  ("import { sukunaShinjukuHarnessApi } from './sukunaShinjukuHarness.js'", 'after_line',
   "import { updateInvCommandCombat } from './invincible.js'   // MSV1-INVINCIBLE Invincible (Mark Grayson) — invincible-gated command layer\n"
   "import { tickInv, isInv, clearInv, clearInvMarks, invLockedForMovement, markInvCpu } from './invincibleState.js'\n"
   "import { drawInvFx, drawInvHud, playInvCues } from './invincibleFx.js'\n"
   "import { invincibleHarnessApi } from './invincibleHarness.js'", "from './invincible.js'"),
  ("const SUKUNA_SHINJUKU_WORLD = GOJO_SHINJUKU_WORLD", 'after_line', WORLD, "const INVINCIBLE_WORLD"),
  ("  for (const _f of [p1, p2]) if (_f) { clearSks(_f); clearSksMarks(_f) }", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) { clearInv(_f); clearInvMarks(_f) }", "if (_f) { clearInv(_f); clearInvMarks(_f) }", 4),
  ("    clearSks(f); clearSksMarks(f)", 'after_line', "    clearInv(f); clearInvMarks(f)", "    clearInv(f); clearInvMarks(f)"),
  ("clearGs(p1);clearGs(p2);", 'replace', "clearGs(p1);clearGs(p2);clearInv(p1);clearInv(p2);", "clearInv(p1);clearInv(p2)", 2),
  ("  tickSks(fighter,nearest,readRawControls(fighter)||{},SUKUNA_SHINJUKU_WORLD)\n  playSksCues(fighter)", 'after_line',
   "  tickInv(fighter,nearest,readRawControls(fighter)||{},INVINCIBLE_WORLD)\n  playInvCues(fighter)", "tickInv(fighter,nearest,"),
  ("  if (isSks(fighter)) { const mc=updateSksCommandCombat(fighter,inputState,nearest,SUKUNA_SHINJUKU_WORLD)", 'after_line',
   "  if (isInv(fighter)) { const mc=updateInvCommandCombat(fighter,inputState,nearest,INVINCIBLE_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }   // Invincible (Mark Grayson): every move starts in his command layer", "updateInvCommandCombat(fighter,inputState,nearest"),
  ("  if (f && f._sksBurn) snap.push(", 'after_line',
   "  if (isInv(f)) snap.push(JSON.stringify([f._inv ? { ...f._inv, cues: undefined, fx: undefined, decal: undefined } : null, f.currentAttack?.inv || null, f._invPhase || 0, f._invNoBlock || false]))   // Invincible GAME_STATE: zip, flight tap / boom, Can't Stay Down / Resolve, Terminal Velocity, CPU\n"
   "  if (f && f._invWall) snap.push(JSON.stringify([f._invWall]))   // mark Invincible writes on a foe (Invincible Punch wall-bounce watch)", "f._inv ? { ...f._inv, cues: undefined"),
  ("gsLockedForMovement(fighter) || sksLockedForMovement(fighter) ||", 'replace', "gsLockedForMovement(fighter) || invLockedForMovement(fighter) || sksLockedForMovement(fighter) ||", "invLockedForMovement(fighter) ||"),
  ("  tickSks(fighter,getOpponent(fighter),readRawControls(fighter)||{},SUKUNA_SHINJUKU_WORLD)\n  playSksCues(fighter)", 'after_line',
   "  tickInv(fighter,getOpponent(fighter),readRawControls(fighter)||{},INVINCIBLE_WORLD)\n  playInvCues(fighter)", "tickInv(fighter,getOpponent"),
  ("    const mc=updateSksCommandCombat(fighter,inputState,getOpponent(fighter),SUKUNA_SHINJUKU_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isInv(fighter)) {   // Invincible (Mark Grayson) command layer: 'consumed' | 'grab'\n    const mc=updateInvCommandCombat(fighter,inputState,getOpponent(fighter),INVINCIBLE_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateInvCommandCombat(fighter,inputState,getOpponent"),
  ("  if (isSks(f)) f._sksRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "  if (isInv(f)) f._invRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._invRemoteInput = replay"),
  ("markSksCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))   // CPU Sukuna", 'after_line',
   "  if (matchConfig.mode !== \"training\") markInvCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))   // CPU Invincible: rushdown, Zip on hit, guards below 30 %, Terminal Velocity on knockdowns", "markInvCpu(p2, baseAiDifficulty"),
  ("      markSksCpu(p1, baseAiDifficulty(matchConfig.aiDifficulty))", 'after_line', "      markInvCpu(p1, baseAiDifficulty(matchConfig.aiDifficulty))", "      markInvCpu(p1, "),
  ("    markSksCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))", 'after_line', "    markInvCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))", "    markInvCpu(p2, "),
  ("    markSksCpu(f, f._aiController?.difficulty || matchConfig.aiDifficulty)", 'after_line',
   "    markInvCpu(f, f._aiController?.difficulty || matchConfig.aiDifficulty)", "markInvCpu(f, f._aiController"),
  ("    drawSksFx(c, fighter); drawSksBurn(c, fighter, _replayFrame)", 'after_line',
   "    drawInvFx(c, fighter)   // Invincible — sheet effect strips, Terminal Velocity glint / marker / cracks, Resolve aura, bubbles (render-only; gated)", "drawInvFx(c, fighter)"),
  ("  drawSksHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawInvHud(ctx, canvas, p1, p2)   // Invincible: Resolve / Can't Stay Down / zip charges (gated)", "drawInvHud(ctx"),
  ("    sukunaShinjukuTest: sukunaShinjukuHarnessApi(", 'after_line',
   "    invincibleTest: invincibleHarnessApi({p1:()=>p1,p2:()=>p2,world:INVINCIBLE_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "invincibleTest: invincibleHarnessApi"),
  # his Charge tap (take off / come down) is read on the SIM clock in invincibleState.js; the engine's wall-clock release skips him
  ("  if (isGs(fighter)) return   // SATORU GOJO (Shinjuku): Charge = Infinity", 'after_line',
   "  if (isInv(fighter)) return   // INVINCIBLE: his Charge-tap takeoff / come-down is measured on the SIM clock in invincibleState.js (deterministic)", "if (isInv(fighter)) return   // INVINCIBLE: his Charge-tap"),
  # ZIP owns his double-tap (sim clock); the engine's double-tap dash skips him
  ("  if (isGs(fighter)) return   // Satoru Gojo (Shinjuku): double-tap toward", 'after_line',
   "  if (isInv(fighter)) return   // Invincible: double-tap ← / → = ZIP, read on the sim clock in invincibleState.js; invincible-gated", "if (isInv(fighter)) return   // Invincible: double-tap"),
  # flight guard: profile fliers (flight.js) guard in flight generically; Mark only below 60 % of his top speed (_invNoBlock
  # is set in invincibleState.js for invincible only; undefined → no change for everyone else)
  ("      !fighter._n7KCMNoBlock &&", 'replace', "      !fighter._n7KCMNoBlock && !fighter._invNoBlock &&", "!fighter._invNoBlock &&"),
  # TERMINAL VELOCITY: he leaves the screen — the body alpha reads fighter._invAlpha (render-only; undefined → 1 for everyone else)
  ("* (benReadyForm(fighter)?.bodyAlpha?.(fighter) ?? 1)", 'replace',
   "* (fighter._invAlpha ?? 1) * (benReadyForm(fighter)?.bodyAlpha?.(fighter) ?? 1)", "* (fighter._invAlpha ?? 1)"),
]
HOOKS += [(2, 'game.js') + g for g in G2]
HOOKS += [
  (2, 'combat.js', "import { sksHitbox, sksBlock, sksHit } from './sukunaShinjukuState.js'", 'after_line',
   "import { invHitbox, invBlock, invHit, invKnockback, invDamageMods, invKoFloor } from './invincibleState.js'   // Invincible hooks: move boxes, contact flags, light weight, Resolve / Can't Stay Down (invincible-gated)", "from './invincibleState.js'"),
  (2, 'combat.js', "  if (a?.sks && fighter.rosterKey === 'sukuna_shinjuku') return sksHitbox(fighter)", 'after_line',
   "  if (a?.inv && fighter.rosterKey === 'invincible') return invHitbox(fighter)   // Invincible: per-move body box; techniques have none (they strike through invincibleState)", "return invHitbox(fighter)"),
  (2, 'combat.js', "    if (!flawless) sksBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) invBlock(attacker, defender, atk)   // Invincible: authored blockstun, contact flag; gated", "invBlock(attacker, defender, atk)"),
  (2, 'combat.js', "    sksHit(attacker, defender, atk)", 'after_line',
   "    invHit(attacker, defender, atk)   // Invincible: clean / contact flags (chains, Zip cancel); gated", "    invHit(attacker, defender, atk)"),
  (2, 'combat.js', "    cyborgKnockback(attacker, defender, atk)   // Cyborg as DEFENDER", 'after_line',
   "    invKnockback(attacker, defender, atk)   // Invincible as DEFENDER: light weight (×1.3 knockback); his Sweep knocks down; gated", "invKnockback(attacker, defender, atk)"),
  (2, 'combat.js', "  rawDamage = gsDamageMods(target, rawDamage, opts)", 'replace',
   "  rawDamage = invDamageMods(target, rawDamage, opts)   // INVINCIBLE — RESOLVE: +25 % taken (invincible-gated)\n  rawDamage = gsDamageMods(target, rawDamage, opts)", "rawDamage = invDamageMods(target, rawDamage, opts)"),
  (2, 'combat.js', "  target.health = Math.max(floor, before - dealt)", 'replace',
   "  target.health = Math.max(invKoFloor(target, floor, before, dealt), before - dealt)   // invKoFloor: INVINCIBLE Can't Stay Down (once per round a KO leaves 1 HP; floor unchanged for everyone else)", "invKoFloor(target, floor, before, dealt)"),
  (2, 'combat.js', "      if (fighter._gs?.blink?.inv) continue", 'after_line',
   "      if ((fighter._invPhase || 0) > 0 && fighter.rosterKey === 'invincible') continue   // Invincible: ZIP frames 1-4 are projectile-intangible (the projectile passes)", "fighter._invPhase || 0) > 0 && fighter.rosterKey === 'invincible') continue"),
  (2, 'input.js', "!fighter._gsRemoteInput && !fighter._sksRemoteInput", 'replace',
   "!fighter._gsRemoteInput && !fighter._invRemoteInput && !fighter._sksRemoteInput", "!fighter._invRemoteInput", 2),
  (2, 'input.js', "fighter.rosterKey === 'gojo_shinjuku' || fighter.rosterKey === 'sukuna_shinjuku'", 'replace',
   "fighter.rosterKey === 'gojo_shinjuku' || fighter.rosterKey === 'invincible' || fighter.rosterKey === 'sukuna_shinjuku'", "fighter.rosterKey === 'invincible' ||"),
  # ZIP / top-speed flight pass THROUGH the foe (no body collision) — the other phasing fighters' hook, gated on him
  (3, 'physics.js', "import { enochPhasing } from './enochState.js'", 'after_line',
   "import { invPhasing } from './invincibleState.js'   // Invincible: Zip / ≥ 70 % flight speed pass through the foe (invincible-gated; false for everyone else)", "import { invPhasing }"),
  (3, 'physics.js', "    if (enochPhasing(p1, p2)) return", 'after_line',
   "    if (invPhasing(p1, p2)) return   // Invincible ZIPPING through / flying past at ≥ 70 % top speed", "if (invPhasing(p1, p2)) return"),
  # GROUND SPEED: walk / run / air drift / the engine dash × f._invSpeed (set in tickInv; undefined → 1 for everyone else)
  (2, 'physics.js', "_benSlowK * (fighter._sksSpeed || 1)", 'replace',
   "_benSlowK * (fighter._sksSpeed || 1) * (fighter._invSpeed || 1)", "(fighter._invSpeed || 1)", 2),
]
HOOKS += [
  (3, 'kits.js', "import { SUKUNA_SHINJUKU_KIT } from './sukunaShinjukuKit.js'", 'after_line',
   "import { INVINCIBLE_KIT } from './invincibleKit.js'   // MSV1-INVINCIBLE Invincible (Mark Grayson) move list", "INVINCIBLE_KIT } from"),
  (3, 'kits.js', "  sukuna_shinjuku: SUKUNA_SHINJUKU_KIT,", 'after_line', "  invincible: INVINCIBLE_KIT,   // MSV1-INVINCIBLE", "invincible: INVINCIBLE_KIT"),
]
HOOKS += [
  (4, 'tools/edoskin/eligibility.json', '  "omniman_viltrum": "HUMAN",', 'after_line', '  "invincible": "HUMAN",', '"invincible": "HUMAN"'),
  (4, 'tools/edoskin/portraits.json', ' "omniman_viltrum": "assets/omniman_viltrum/portrait.png",', 'after_line', ' "invincible": "assets/invincible/portrait.png",', '"invincible": "assets/invincible/portrait.png"'),
  (4, 'edoSkinKeys.js', '  "omniman_viltrum",', 'after_line', '  "invincible",', '  "invincible",'),
]
HOOKS += [
  (5, 'skins.js', "import { SKS_SKINS } from './sukunaShinjukuSkins.js'", 'after_line',
   "import { INV_SKINS } from './invincibleSkins.js'   // MSV1-INVINCIBLE Invincible (Mark Grayson): default + 20 premade skins (cosmetic, tools/invincibleskins)", "INV_SKINS } from"),
  (5, 'skins.js', "  sukuna_shinjuku: SKS_SKINS,", 'after_line', "  invincible: INV_SKINS,   // MSV1-INVINCIBLE", "invincible: INV_SKINS"),
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
