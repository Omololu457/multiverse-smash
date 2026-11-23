#!/usr/bin/env python3
"""MSV1-OMNIMAN (omniman_viltrum): idempotent, narrow registration hooks in shared files (Gojo / Sukuna Shinjuku pattern;
most anchors are Sukuna Shinjuku's own hook lines, so this fighter's lines sit right after his). Each hook =
(phase, file, anchor, op, text, marker[, count]). A hook whose marker is present is skipped (re-run = no-op).
The OLD Omni-Man (`omniman`) is never touched: every line here is gated on rosterKey === 'omniman_viltrum' / isOmv(),
or on a profile key only he has (flight.js `momentum`).
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...] [--phase N]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  omniman_viltrum: { work: 'Omni-Man (Nolan Grayson, Invincible) — sprite sheet', artists: ['imhomiejaydev'],\n"
  "    source: 'Omni-Man sprites from the supplied sheet \"omni_man_sprites_reupload_from_my_lost_acc__by_imhomiejaydev\" (kept as assets/incoming/omniman/omniman.png; no credit text on the sheet itself — the artist is named in the file name). Purple background RGB(140,70,130) keyed with an exact match; nearest-neighbour integer scaling only (docs/msv1/omniman/LEDGER.md, tools/omnimanviltrum/slice.py). Skins: precomputed region recolours (tools/omnimanskins/).',\n"
  "    files: ['assets/omniman_viltrum/**'] },")
CREDITS_TXT = ("\nOmni-Man (Nolan Grayson, Invincible) sprites by imhomiejaydev\n"
  "  (the new `omniman_viltrum` fighter; the old `omniman` is unchanged; supplied sheet\n"
  "  omni_man_sprites_reupload_from_my_lost_acc__by_imhomiejaydev_deqbeyy.png)\n"
  "Source files: assets/omniman_viltrum/**  (ledger: docs/msv1/omniman/LEDGER.md)")
HOOKS = [
  (1, 'characters.js', "import { sukuna_shinjuku } from './sukunaShinjukuData.js'", 'after_line',
   "import { omniman_viltrum } from './omnimanViltrumData.js'   // MSV1-OMNIMAN Omni-Man (Viltrumite) — a NEW fighter beside the old `omniman` (untouched); omnimanViltrum*.js", "from './omnimanViltrumData.js'"),
  (1, 'characters.js', "  omniman: omniMan,", 'replace', "  omniman: omniMan, omniman_viltrum,   // omniman_viltrum: MSV1-OMNIMAN", "omniman_viltrum,   // omniman_viltrum: MSV1-OMNIMAN"),
  (1, 'spritesheets.js', "  sukuna_shinjuku: { actions: { idle: './assets/sukuna_shinjuku/idle.png' } },", 'after_line',
   "  omniman_viltrum: { actions: { idle: './assets/omniman_viltrum/idle.png' } },", "assets/omniman_viltrum/idle.png"),
  (1, 'credits.js', "    files: ['assets/sukuna_shinjuku/**'] },", 'after_line', CREDIT, "assets/omniman_viltrum/**"),
  (1, 'CREDITS.txt', "Source files: assets/sukuna_shinjuku/**  (ledger: docs/msv1/sukuna/LEDGER.md)", 'after_line', CREDITS_TXT, "omniman_viltrum` fighter"),
]

HOOKS += [
  (1, 'tools/edoskin/eligibility.json', '  "omega_ranger": "MASKED",', 'after_line', '  "omniman_viltrum": "HUMAN",', '"omniman_viltrum": "HUMAN"'),
  (1, 'tools/edoskin/portraits.json', ' "sukuna_shinjuku": "assets/sukuna_shinjuku/portrait.png",', 'after_line', ' "omniman_viltrum": "assets/omniman_viltrum/portrait.png",', '"omniman_viltrum": "assets/omniman_viltrum/portrait.png"'),
  (1, 'edoSkinKeys.js', '  "omega_ranger",', 'after_line', '  "omniman_viltrum",', '"omniman_viltrum",'),
]

HOOKS += [
  (2, 'flight.js', '  landThreshold: 16, minPoseFrames: 4, cruiseFastFrac: 0.70,\n}\n\nexport const FLIGHT_PHASE', 'replace', '  landThreshold: 16, minPoseFrames: 4, cruiseFastFrac: 0.70,\n}\n\n// OMNI-MAN — VILTRUMITE (MSV1-OMNIMAN, omniman_viltrum) — WIRED (traits.flightProfile:"omniman_viltrum"). The FASTEST and\n// HARDEST-TO-CONTROL flier: top speed 57.2 = 1.3 × Dseyl (44, the fastest roster flier), accel 5.5 = 1.25 × Dseyl\'s 4.4,\n// coast drag 0.9292 (from the same speed he slides 2.5 × as far as Homelander), unlimited duration (drain 0), no air dash.\n// The `momentum` block switches stepFlight to a heading + speed integrator FOR THIS PROFILE ONLY (no other profile has the\n// key → their per-axis code is unchanged): steering eases from 15°/f at a standstill to 2.5°/f (±25° per 10 f) at top\n// speed, an input > 120° from his heading only decelerates (≈0.6 s to turn around from top speed), and Guard\n// (fighter._flightBrake, set by omnimanViltrumState.js) brakes ×0.851 per frame (80 % gone in 10 frames).\n// docs/msv1/omniman/FLIGHT_REFERENCE.md\nFLIGHT_PROFILES.omniman_viltrum = {\n  accel: 5.5, maxH: 57.2, maxV: 57.2, drag: 0.9292, reverseBrake: 1, overspeedDrag: 0.90, ceilEaseZone: 72,\n  dashSpeed: 0, dashFrames: 0, maxAirDash: 0, dashCost: 9999, energyMax: 1, drainPerFrame: 0, groundRefillPerFrame: 1,\n  liftoff: -9, takeoffFrames: 6, landRecovery: 4, landRecoveryAfterAir: 8, groundedLock: 90, landThreshold: 70,\n  minPoseFrames: 3, cruiseFastFrac: 0.25,\n  momentum: { top: 57.2, accel: 5.5, drag: 0.9292, turnSlow: 0.2618, turnFast: 0.04363, reverseCos: -0.5, reverseDecel: 1.6824,\n    flipBelow: 1.0, brake: 0.836, softLandMax: 0.70 },\n}\n\nexport const FLIGHT_PHASE', 'FLIGHT_PROFILES.omniman_viltrum = {'),
  (2, 'flight.js', '  } else {\n    // ── NORMAL 8-WAY VELOCITY (accel / drag / reverse-brake) ──────────────────', 'replace', '  } else if (p.momentum) {\n    momentumStep(fighter, c, p.momentum, hx, hy)   // MSV1-OMNIMAN: heading + speed (only a profile with `momentum`)\n  } else {\n    // ── NORMAL 8-WAY VELOCITY (accel / drag / reverse-brake) ──────────────────', 'momentumStep(fighter, c, p.momentum, hx, hy)   // MSV1-OMNIMAN'),
  (2, 'flight.js', '    if ((input.holdDown || (D && !U)) && nearFloor) { beginLanding(fighter, p, c); landed = true }', 'replace', '    if ((input.holdDown || (D && !U)) && nearFloor && !(p.momentum && !c.mSoftLandOk)) { beginLanding(fighter, p, c); landed = true }   // p.momentum: MSV1-OMNIMAN (no soft landing at ≥ 70 % speed)', '!(p.momentum && !c.mSoftLandOk)'),
  (2, 'flight.js', '  if (c.phase === FLIGHT_PHASE.AIRDASH) return "capeTwirl"\n', 'replace', '  if (c.phase === FLIGHT_PHASE.AIRDASH) return "capeTwirl"\n  if (p.momentum) return momentumPose(fighter, c, p)   // MSV1-OMNIMAN\n', 'if (p.momentum) return momentumPose(fighter, c, p)'),
  (2, 'flight.js', '\nfunction axisStep(v, h, p) {', 'replace', '\n// MSV1-OMNIMAN — momentum integrator (only a profile with a `momentum` block; Omni-Man Viltrumite). Velocity = heading × speed.\n// Plain numbers rounded to 1e-4 each frame (replay / LAN). c.mBraking / c.mReversing feed his pose; nothing else reads them.\nconst _r4 = v => Math.round(v * 1e4) / 1e4\nfunction momentumStep(fighter, c, m, hx, hy) {\n  let sp = Math.hypot(fighter.vx || 0, fighter.vy || 0), hd = sp > 0.001 ? Math.atan2(fighter.vy || 0, fighter.vx || 0) : null\n  c.mBraking = !!fighter._flightBrake; c.mReversing = false\n  if (c.mBraking) { sp *= m.brake; if (sp < 0.08) sp = 0 }\n  else if (hx || hy) {\n    const want = Math.atan2(hy, hx)\n    if (hd == null || sp < m.flipBelow) { hd = want; sp += m.accel }\n    else {\n      let d = want - hd\n      while (d > Math.PI) d -= 2 * Math.PI\n      while (d < -Math.PI) d += 2 * Math.PI\n      if (Math.cos(d) <= m.reverseCos) { sp = Math.max(0, sp - m.reverseDecel); c.mReversing = true }   // can\'t reverse instantly\n      else { const k = Math.min(1, sp / m.top), rate = m.turnSlow + (m.turnFast - m.turnSlow) * k; hd += Math.max(-rate, Math.min(rate, d)); sp += m.accel }\n    }\n  } else { sp *= m.drag; if (sp < 0.08) sp = 0 }\n  sp = Math.min(sp, m.top)\n  fighter.vx = hd == null ? 0 : _r4(sp * Math.cos(hd)); fighter.vy = hd == null ? 0 : _r4(sp * Math.sin(hd))\n  c.mSoftLandOk = sp < m.top * m.softLandMax            // at ≥ 70 % he can\'t soft-land: the floor is a HARD landing (his sim)\n}\nfunction momentumPose(fighter, c, p) {\n  const sp = Math.hypot(fighter.vx || 0, fighter.vy || 0)\n  if (c.mBraking && sp > 1) return "brake"\n  if (c.mReversing) return "turn"\n  if (sp > p.momentum.top * p.cruiseFastFrac) return "cruiseB"\n  if ((fighter.vy || 0) < -1.4) return "rise"\n  return "hoverIdle"\n}\n\nfunction axisStep(v, h, p) {', 'function momentumStep(fighter, c, m, hx, hy)'),
]


WORLD_OMV = "const OMNIMAN_VILTRUM_WORLD = GOJO_SHINJUKU_WORLD   // MSV1-OMNIMAN Omni-Man (Viltrumite): the same world (lockstep frame, fighters, W.damage, raw controls)"
G2O = [
  ("import { sukunaShinjukuHarnessApi } from './sukunaShinjukuHarness.js'", 'after_line',
   "import { updateOmvCommandCombat } from './omnimanViltrum.js'   // MSV1-OMNIMAN Omni-Man (Viltrumite) — omniman_viltrum-gated command layer (the old `omniman` is untouched)\n"
   "import { tickOmv, isOmv, clearOmv, clearOmvMarks, omvLockedForMovement, markOmvCpu, omvNoBlock, omvOwnsCharge } from './omnimanViltrumState.js'\n"
   "import { drawOmvFx, drawOmvHud, drawOmvSky, playOmvCues } from './omnimanViltrumFx.js'\n"
   "import { omnimanViltrumHarnessApi } from './omnimanViltrumHarness.js'", "from './omnimanViltrum.js'"),
  ("const SUKUNA_SHINJUKU_WORLD = GOJO_SHINJUKU_WORLD", 'after_line', WORLD_OMV, "const OMNIMAN_VILTRUM_WORLD"),
  ("  for (const _f of [p1, p2]) if (_f) { clearSks(_f); clearSksMarks(_f) }", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) { clearOmv(_f); clearOmvMarks(_f) }", "if (_f) { clearOmv(_f); clearOmvMarks(_f) }", 4),
  ("    clearSks(f); clearSksMarks(f)", 'after_line', "    clearOmv(f); clearOmvMarks(f)", "    clearOmv(f); clearOmvMarks(f)"),
  ("clearSks(p1);clearSks(p2)", 'replace', "clearSks(p1);clearSks(p2);clearOmv(p1);clearOmv(p2)", "clearOmv(p1);clearOmv(p2)", 2),
  ("  tickSks(fighter,nearest,readRawControls(fighter)||{},SUKUNA_SHINJUKU_WORLD)\n  playSksCues(fighter)", 'after_line',
   "  tickOmv(fighter,nearest,readRawControls(fighter)||{},OMNIMAN_VILTRUM_WORLD)\n  playOmvCues(fighter, camera)", "tickOmv(fighter,nearest,"),
  ("  if (isSks(fighter)) { const mc=updateSksCommandCombat(fighter,inputState,nearest,SUKUNA_SHINJUKU_WORLD)", 'after_line',
   "  if (isOmv(fighter)) { const mc=updateOmvCommandCombat(fighter,inputState,nearest,OMNIMAN_VILTRUM_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }   // Omni-Man (Viltrumite): every move starts in his command layer", "updateOmvCommandCombat(fighter,inputState,nearest"),
  ("  if (f && f._sksBurn) snap.push(", 'after_line',
   "  if (isOmv(f)) snap.push(JSON.stringify([f._omv ? { ...f._omv, cues: undefined, fx: undefined } : null, f.currentAttack?.omv || null, f._flightBrake || false]))   // Omni-Man (Viltrumite) GAME_STATE: speed history, boom arm, crash / landing timers, rushes, holds, Escape Velocity phases, CPU", "f._omv ? { ...f._omv, cues: undefined"),
  ("  if (isOmv(f)) snap.push(", 'after_line',
   "  if (f && (f._omvWall || f._omvHeldBy != null)) snap.push(JSON.stringify([f._omvWall || null, f._omvHeldBy ?? null]))   // marks Omni-Man (Viltrumite) writes on a foe (wall bounce, held)", "f._omvWall || f._omvHeldBy"),
  ("sksLockedForMovement(fighter) ||", 'replace', "sksLockedForMovement(fighter) || omvLockedForMovement(fighter) ||", "omvLockedForMovement(fighter) ||"),
  ("  tickSks(fighter,getOpponent(fighter),readRawControls(fighter)||{},SUKUNA_SHINJUKU_WORLD)\n  playSksCues(fighter)", 'after_line',
   "  tickOmv(fighter,getOpponent(fighter),readRawControls(fighter)||{},OMNIMAN_VILTRUM_WORLD)\n  playOmvCues(fighter, camera)", "tickOmv(fighter,getOpponent"),
  ("    const mc=updateSksCommandCombat(fighter,inputState,getOpponent(fighter),SUKUNA_SHINJUKU_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isOmv(fighter)) {   // Omni-Man (Viltrumite) command layer: 'consumed' | 'grab'\n    const mc=updateOmvCommandCombat(fighter,inputState,getOpponent(fighter),OMNIMAN_VILTRUM_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateOmvCommandCombat(fighter,inputState,getOpponent"),
  ("  if (isSks(f)) f._sksRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "  if (isOmv(f)) f._omvRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._omvRemoteInput = replay"),
  ("markSksCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))   // CPU Sukuna", 'after_line',
   "  if (matchConfig.mode !== \"training\") markOmvCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))   // CPU Omni-Man (Viltrumite)", "markOmvCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))   // CPU Omni"),
  ("      markSksCpu(p1, baseAiDifficulty(matchConfig.aiDifficulty))", 'after_line', "      markOmvCpu(p1, baseAiDifficulty(matchConfig.aiDifficulty))", "      markOmvCpu(p1, "),
  ("    markSksCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))", 'after_line', "    markOmvCpu(p2, baseAiDifficulty(matchConfig.aiDifficulty))", "    markOmvCpu(p2, "),
  ("    markSksCpu(f, f._aiController?.difficulty || matchConfig.aiDifficulty)", 'after_line',
   "    markOmvCpu(f, f._aiController?.difficulty || matchConfig.aiDifficulty)", "markOmvCpu(f, f._aiController"),
  ("    drawSksFx(c, fighter); drawSksBurn(c, fighter, _replayFrame)", 'after_line',
   "    drawOmvFx(c, fighter)   // Omni-Man (Viltrumite) — speed lines, afterimage trail, sonic boom, crash / landing bursts, bubbles (render-only; gated)", "drawOmvFx(c, fighter)"),
  ("  drawSksHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawOmvHud(ctx, canvas, p1, p2)   // Omni-Man (Viltrumite): speed meter, BRAKE / COMMITTED, Unimpressed cooldown (gated)", "drawOmvHud(ctx"),
  ("  drawSupermanMoonBackdrop(ctx, canvas)   // Superman ULTIMATE", 'after_line',
   "  drawOmvSky(ctx, canvas, p1, p2, (matchConfig.seed | 0) || 1)   // Omni-Man (Viltrumite) ESCAPE VELOCITY — sky → space → planet → back, screen space, under the fighters (render-only; gated)", "drawOmvSky(ctx"),
  ("    sukunaShinjukuTest: sukunaShinjukuHarnessApi(", 'after_line',
   "    omnimanViltrumTest: omnimanViltrumHarnessApi({p1:()=>p1,p2:()=>p2,world:OMNIMAN_VILTRUM_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "omnimanViltrumTest: omnimanViltrumHarnessApi"),
  ("  if (isGs(fighter)) return   // SATORU GOJO (Shinjuku): Charge = Infinity", 'after_line',
   "  if (isOmv(fighter)) return   // OMNI-MAN (Viltrumite): his Charge-tap takeoff / come-down is measured on the SIM clock in omnimanViltrumState.js (deterministic)", "if (isOmv(fighter)) return   // OMNI-MAN"),
  ("!dseylOwnsCharge(fighter) &&", 'replace', "!dseylOwnsCharge(fighter) && !omvOwnsCharge(fighter) &&", "!omvOwnsCharge(fighter) &&"),
  ("      !fighter._flightActive && !isOmniManForcedDescent(fighter)) fighter.isBlocking = true", 'replace',
   "      !fighter._flightActive && !isOmniManForcedDescent(fighter) && !omvNoBlock(fighter)) fighter.isBlocking = true   // omvNoBlock: Omni-Man (Viltrumite) can't guard above 40 % flight speed", "!omvNoBlock(fighter)) fighter.isBlocking = true"),
]
HOOKS += [(2, 'game.js') + g for g in G2O]
HOOKS += [
  (2, 'combat.js', "import { sksHitbox, sksBlock, sksHit } from './sukunaShinjukuState.js'", 'after_line',
   "import { omvHitbox, omvBlock, omvHit, omvKnockback } from './omnimanViltrumState.js'   // Omni-Man (Viltrumite) hooks: his move boxes + speed-scaled contact + heavy weight (omniman_viltrum-gated)", "from './omnimanViltrumState.js'"),
  (2, 'combat.js', "  if (a?.sks && fighter.rosterKey === 'sukuna_shinjuku') return sksHitbox(fighter)", 'after_line',
   "  if (a?.omv && fighter.rosterKey === 'omniman_viltrum') return omvHitbox(fighter)   // Omni-Man (Viltrumite): per-move body box; techniques have none (they strike through omnimanViltrumState)", "return omvHitbox(fighter)"),
  (2, 'combat.js', "    if (!flawless) sksBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) omvBlock(attacker, defender, atk)   // Omni-Man (Viltrumite): authored blockstun + more negative on block at speed; gated", "omvBlock(attacker, defender, atk)"),
  (2, 'combat.js', "    sksHit(attacker, defender, atk)", 'after_line',
   "    omvHit(attacker, defender, atk)   // Omni-Man (Viltrumite): contact flags, Haymaker wall bounce, impact fx; gated", "    omvHit(attacker, defender, atk)"),
  (2, 'combat.js', "    cyborgKnockback(attacker, defender, atk)   // Cyborg as DEFENDER", 'after_line',
   "    omvKnockback(attacker, defender)   // Omni-Man (Viltrumite) as DEFENDER: heavy (received knockback × 0.85); gated", "omvKnockback(attacker, defender)"),
  (2, 'input.js', "!fighter._sksRemoteInput) {", 'replace', "!fighter._sksRemoteInput && !fighter._omvRemoteInput) {", "!fighter._omvRemoteInput) {"),
  (2, 'input.js', "fighter.rosterKey === 'sukuna_shinjuku') && !fighter._aiControlled", 'replace',
   "fighter.rosterKey === 'sukuna_shinjuku' || fighter.rosterKey === 'omniman_viltrum') && !fighter._aiControlled", "fighter.rosterKey === 'omniman_viltrum') && !fighter._aiControlled"),
  (2, 'input.js', "!fighter._sksRemoteInput && inputSettings[", 'replace', "!fighter._sksRemoteInput && !fighter._omvRemoteInput && inputSettings[", "!fighter._omvRemoteInput && inputSettings["),
]

HOOKS += [
  (3, 'combat.js', "import { omvHitbox, omvBlock, omvHit, omvKnockback } from './omnimanViltrumState.js'", 'after_line',
   "import { omvMeleeGate, omvProjectileGate } from './omnimanViltrumState.js'   // Omni-Man (Viltrumite) UNIMPRESSED counter window: the hit is not felt (omniman_viltrum-gated)", "import { omvMeleeGate, omvProjectileGate }"),
  (3, 'combat.js', "  if (gsMeleeGate(defender, attacker)) { attacker.currentAttack.hasHit = true; return }", 'after_line',
   "  if (omvMeleeGate(defender, attacker)) { attacker.currentAttack.hasHit = true; return }   // Omni-Man (Viltrumite): UNIMPRESSED — inside the 24-frame window the strike is not felt; he backhands; gated", "if (omvMeleeGate(defender, attacker))"),
  (3, 'combat.js', "      if (gsProjectileGate(fighter, proj) === 'remove') { projectiles.splice(i, 1); break }", 'after_line',
   "      if (omvProjectileGate(fighter, proj) === 'remove') { projectiles.splice(i, 1); break }   // Omni-Man (Viltrumite): UNIMPRESSED swats it away; gated", "omvProjectileGate(fighter, proj) === 'remove'"),
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
      elif op == 'before_line':
        k = 0
        for _ in range(want):
          i = out.index(anchor, k); i = out.rfind('\n', 0, i) + 1
          out = out[:i] + text + '\n' + out[i:]; k = i + len(text) + 1 + len(anchor)
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
