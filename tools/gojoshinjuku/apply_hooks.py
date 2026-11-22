#!/usr/bin/env python3
"""MSV1-GOJO (gojo_shinjuku): idempotent, narrow registration hooks in shared files (Higuruma/Megumi pattern).
Each hook = (file, anchor, op, text, marker[, count]). The anchor must occur exactly `count` times (default 1);
'after_line' inserts `text` after the line holding the anchor; 'replace' substitutes anchor -> text. A hook whose marker
is already present is skipped, so re-running is a no-op. Other writers' lines are never touched.
Apply to the worktree AND to a HEAD copy (--root DIR) so a private-index commit carries only these hunks.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...] [--phase N]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  gojo_shinjuku: { work: 'Satoru Gojo (Shinjuku Arc) — Jump Ultimate Stars-style sprite sheet', artists: ['FinhJ', 'ZebrasBlack (credit)', 'R0B4N (credit)'],\n"
  "    source: 'Satoru Gojo (Shinjuku Arc) sprites by FinhJ, credits ZebrasBlack and R0B4N. Supplied sheet \"satoru_gojo_shinjuku_arc_jus_sprite_sheet_by_finhj_by_finhj_dhxrc7c.png\" (SHA-256 9e865da6…; kept in assets/incoming/gojo_shinjuku/). Indigo background RGB(33,31,63) chroma-keyed; header, row labels, dividers and box borders excluded; nearest-neighbour integer scaling only (docs/msv1/gojo/LEDGER.md, tools/gojoshinjuku/slice.py). Skins: precomputed region recolours (tools/gojoskins/).',\n"
  "    files: ['assets/gojo_shinjuku/**'] },")
# phase tags let one script grow phase by phase; a hook is applied when its phase <= --phase (default: all)
HOOKS = [
  (1, 'characters.js', "import { higuruma } from './higurumaData.js'", 'after_line',
   "import { gojo_shinjuku } from './gojoShinjukuData.js'   // MSV1-GOJO Satoru Gojo (Shinjuku Arc, FinhJ sheet) — a NEW fighter beside the old `gojo` (untouched); gojoShinjuku*.js + limitless.js", "from './gojoShinjukuData.js'"),
  (1, 'characters.js', "  gojo, sukuna,", 'replace', "  gojo, gojo_shinjuku, sukuna,", "gojo, gojo_shinjuku,"),
  (1, 'spritesheets.js', "  higuruma: { actions: { idle: './assets/higuruma/idle.png' } },", 'after_line',
   "  gojo_shinjuku: { actions: { idle: './assets/gojo_shinjuku/idle.png' } },", "assets/gojo_shinjuku/idle.png"),
  (1, 'credits.js', "    files: ['assets/higuruma/**'] },", 'after_line', CREDIT, "assets/gojo_shinjuku/**"),
]

# ── phase 3: Infinity wired into a match (sim tick, command layer, combat gates, input, replay / LAN, HUD) ──
WORLD = ("const GOJO_SHINJUKU_WORLD = { ...MMPR_BLACK_WORLD, frame: () => _replayFrame, projectileList: () => activeProjectiles, "
  "removeProjectile: p => { const i = activeProjectiles.indexOf(p); if (i >= 0) activeProjectiles.splice(i, 1) }, "
  "summons: () => activeSummons, removeSummon: o => { const i = activeSummons.indexOf(o); if (i >= 0) activeSummons.splice(i, 1) }, "
  "drones: () => activeDrones, removeDrone: o => { const i = activeDrones.indexOf(o); if (i >= 0) activeDrones.splice(i, 1) }, "
  "munitions: () => activeMunitions, removeMunition: o => { const i = activeMunitions.indexOf(o); if (i >= 0) activeMunitions.splice(i, 1) }, "
  "clones: o => (o?._ninja?.clones || []).filter(c => !c.dead).map(c => ({ x: c.x - (o.w || 48) / 2, y: c.feet - (o.h || 94), w: o.w || 48, h: o.h || 94, ref: c })), "
  "removeClone: (o, c) => { if (c?.ref) c.ref.dead = true }, "
  "patches: () => MMPR_BLACK_WORLD.fighters().flatMap(o => (o?._enoch?.field?.patches || []).map(patch => ({ owner: o, patch }))), "
  "removePatch: (o, p) => { const L = o?._enoch?.field?.patches; const i = L ? L.indexOf(p) : -1; if (i >= 0) L.splice(i, 1) }, "
  "raw: f => readRawControls(f) || {} }   // MSV1-GOJO Satoru Gojo (Shinjuku): Black Ranger's world + lockstep frame + every list Limitless acts on (projectiles, summons, drones, munitions, ninja clones, Enoch patches)")
G3 = [
  ("import { higurumaHarnessApi } from './higurumaHarness.js'", 'after_line',
   "import { updateGsCommandCombat } from './gojoShinjuku.js'   // MSV1-GOJO Satoru Gojo (Shinjuku Arc) — gojo_shinjuku-gated command layer\n"
   "import { tickGs, isGs, clearGs, clearGsMarks, gsLockedForMovement, gsOwnsCharge, markGsCpu } from './gojoShinjukuState.js'\n"
   "import { drawGsFx, drawGsHud, playGsCues } from './gojoShinjukuFx.js'\n"
   "import { gojoShinjukuHarnessApi } from './gojoShinjukuHarness.js'", "from './gojoShinjuku.js'"),
  ("const HIGURUMA_WORLD = MMPR_BLACK_WORLD", 'after_line', WORLD, "const GOJO_SHINJUKU_WORLD"),
  ("  for (const _f of [p1, p2]) if (_f) clearHiguruma(_f)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) { clearGs(_f); clearGsMarks(_f) }", "if (_f) { clearGs(_f); clearGsMarks(_f) }", 4),
  ("    clearHiguruma(f)", 'after_line', "    clearGs(f); clearGsMarks(f)", "    clearGs(f); clearGsMarks(f)"),
  ("clearHiguruma(p1);clearHiguruma(p2)", 'replace', "clearHiguruma(p1);clearHiguruma(p2);clearGs(p1);clearGs(p2)", "clearGs(p1);clearGs(p2)", 2),
  ("  tickHiguruma(fighter,nearest,readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", 'after_line',
   "  tickGs(fighter,nearest,readRawControls(fighter)||{},GOJO_SHINJUKU_WORLD)\n  playGsCues(fighter)", "tickGs(fighter,nearest,"),
  ("  if (isHiguruma(fighter)) { const mc=updateHigurumaCommandCombat(fighter,inputState,nearest,HIGURUMA_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isGs(fighter)) { updateGsCommandCombat(fighter,inputState,nearest,GOJO_SHINJUKU_WORLD);ctrlState={} }   // Satoru Gojo (Shinjuku): every move starts in his command layer", "updateGsCommandCombat(fighter,inputState,nearest"),
  ("  if (isHiguruma(f)) snap.push(", 'after_line',
   "  if (isGs(f)) snap.push(JSON.stringify([f._gs ? { ...f._gs, cues: undefined, fx: undefined } : null, f.currentAttack?.gs || null, f._gsHalf || 0]))   // Satoru Gojo (Shinjuku) GAME_STATE: CE, Infinity level / press, fields, imaginary mass, chant, cooldowns, burnout, domain / clash, CPU reaction", "f._gs ? { ...f._gs, cues: undefined"),
  ("  if (isGs(f)) snap.push(", 'after_line',
   "  if (f && (f._gsTechBurnout || f._gsSawInfinity != null)) snap.push(JSON.stringify([f._gsTechBurnout || 0, f._gsSawInfinity ?? null]))   // marks Gojo (Shinjuku) writes on an opponent (clash burnout, what the CPU has seen)", "f._gsTechBurnout || 0, f._gsSawInfinity"),
  ("higurumaLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "higurumaLocked(fighter, readRawControls(fighter)) || gsLockedForMovement(fighter) ||", "gsLockedForMovement(fighter) ||"),
  ("!megumiOwnsCharge(fighter)", 'replace', "!megumiOwnsCharge(fighter) && !gsOwnsCharge(fighter)", "!gsOwnsCharge(fighter)"),
  ("  if (isDseyl(fighter)) return   // DSEYL:", 'after_line',
   "  if (isGs(fighter)) return   // SATORU GOJO (Shinjuku): Charge = Infinity / RCT / Falling Blossom, measured on the SIM clock in gojoShinjukuState.js", "if (isGs(fighter)) return   // SATORU GOJO"),
  ("  tickHiguruma(fighter,getOpponent(fighter),readRawControls(fighter)||{},HIGURUMA_WORLD)\n  playHigurumaCues(fighter)", 'after_line',
   "  tickGs(fighter,getOpponent(fighter),readRawControls(fighter)||{},GOJO_SHINJUKU_WORLD)\n  playGsCues(fighter)", "tickGs(fighter,getOpponent"),
  ("    const mc=updateHigurumaCommandCombat(fighter,inputState,getOpponent(fighter),HIGURUMA_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isGs(fighter)) {   // Satoru Gojo (Shinjuku) command layer: every move (normals and throw included) starts there\n    updateGsCommandCombat(fighter,inputState,getOpponent(fighter),GOJO_SHINJUKU_WORLD)\n    updateCombat(fighter,getOpponent(fighter),{},opts); return\n  }", "updateGsCommandCombat(fighter,inputState,getOpponent"),
  ("    if (isHiguruma(f)) f._higurumaRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isGs(f)) f._gsRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._gsRemoteInput = replay"),
  ("  applyAIInputToKeys(p2, getAIInput(p2AI, p2, p1, { stage: getStageTheme(), roundNumber, mode: matchConfig.mode }))", 'after_line',
   "  if (matchConfig.mode !== \"training\") markGsCpu(p2, matchConfig.aiDifficulty)   // CPU Gojo (Shinjuku): reacts to a coming super with Infinity (never reads the foe's hidden state)", "markGsCpu(p2, matchConfig.aiDifficulty)"),
  ("      applyAIInputToKeys(p1, getAIInput(p1AI, p1, p2, { stage: getStageTheme(), roundNumber, mode: \"aivsai\" }))", 'after_line',
   "      markGsCpu(p1, matchConfig.aiDifficulty)", "markGsCpu(p1, matchConfig.aiDifficulty)"),
  ("    applyAIInputToKeys(p2, getAIInput(p2AI, p2, p1, { stage: getStageTheme(), roundNumber, mode: \"aivsai\" }))", 'after_line',
   "    markGsCpu(p2, matchConfig.aiDifficulty)", "    markGsCpu(p2, matchConfig.aiDifficulty)\n"),
  ("    applyAIInputToKeys(f, getAIInput(f._aiController, f, target, { stage: getStageTheme(), roundNumber, mode: \"ffa\" }))", 'after_line',
   "    markGsCpu(f, f._aiController?.difficulty || matchConfig.aiDifficulty)", "markGsCpu(f, f._aiController"),
  ("    drawHigurumaFx(c, fighter)", 'after_line',
   "    drawGsFx(c, fighter, matchConfig.mode === \"training\")   // Satoru Gojo (Shinjuku) — Blue / Red / Purple, chant captions, nosebleed; Infinity draws NOTHING (training debug ring only) (render-only; gated)", "drawGsFx(c, fighter"),
  ("  drawHigurumaHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawGsHud(ctx, canvas, p1, p2)   // Satoru Gojo (Shinjuku): CE bar (Infinity's only tell), Void cooldown, burnout, FBE / RCT cooldowns (gated)", "drawGsHud(ctx"),
  ("    higurumaTest: higurumaHarnessApi(", 'after_line',
   "    gojoShinjukuTest: gojoShinjukuHarnessApi({p1:()=>p1,p2:()=>p2,world:GOJO_SHINJUKU_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "gojoShinjukuTest: gojoShinjukuHarnessApi"),
]
HOOKS += [(3, 'game.js') + g for g in G3]
HOOKS += [
  (3, 'combat.js', "import { megumiHitbox, megumiBlock, megumiHit, megumiProjectileHit } from './megumiState.js'", 'after_line',
   "import { gsHitbox, gsBlock, gsHit, gsMeleeGate, gsGrabGate, gsProjectileGate, gsDamageMods } from './gojoShinjukuState.js'   // Satoru Gojo (Shinjuku) hooks: Infinity / Falling Blossom gates + his move boxes (gojo_shinjuku-gated)", "from './gojoShinjukuState.js'"),
  (3, 'combat.js', "  if (a?.mg && fighter.rosterKey === 'megumi_fushiguro') return megumiHitbox(fighter)", 'after_line',
   "  if (a?.gs && fighter.rosterKey === 'gojo_shinjuku') return gsHitbox(fighter)   // Satoru Gojo (Shinjuku): per-move body box; technique casts have none (their fields strike through gojoShinjukuState)", "return gsHitbox(fighter)"),
  (3, 'combat.js', "  if (shouldGojoAutoDodge(defender) || shouldSasukeAbsoluteDefenseNegate(defender)) {", 'replace',
   "  if (gsMeleeGate(defender, attacker)) { attacker.currentAttack.hasHit = true; return }   // Satoru Gojo (Shinjuku): Falling Blossom auto-counter / INFINITY stops the strike (silent, no flash: it is invisible); L1/L2 supers pass; gojo_shinjuku-gated\n  if (shouldGojoAutoDodge(defender) || shouldSasukeAbsoluteDefenseNegate(defender)) {", "gsMeleeGate(defender, attacker)"),
  (3, 'combat.js', "  if (Math.abs(aCX - dCX) > range) return false", 'after_line',
   "  if (gsGrabGate(defender, attacker)) { attacker.attackCooldown = 18; return false }   // Satoru Gojo (Shinjuku): Infinity cannot be grabbed; gojo_shinjuku-gated", "gsGrabGate(defender, attacker)"),
  (3, 'combat.js', "    if (!flawless) megumiBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) gsBlock(attacker, defender, atk)   // Satoru Gojo (Shinjuku): authored blockstun, contact flag; gojo_shinjuku-gated", "gsBlock(attacker, defender, atk)"),
  (3, 'combat.js', "    megumiHit(attacker, defender, atk, {armored:", 'after_line',
   "    gsHit(attacker, defender, atk)   // Satoru Gojo (Shinjuku): clean flag, +4 CE, Black Flash window, Blue Fist pull, Red Rush crumple; gojo_shinjuku-gated", "    gsHit(attacker, defender, atk)"),
  (3, 'combat.js', "      if (proj.radial && !_benWeak && Math.hypot(hurtbox.x + hurtbox.w / 2 - proj.x", 'after_line',
   "      if (gsProjectileGate(fighter, proj) === 'remove') { projectiles.splice(i, 1); break }   // Satoru Gojo (Shinjuku): Infinity stops it at contact (L1/L2 supers pass) / Falling Blossom; gojo_shinjuku-gated", "gsProjectileGate(fighter, proj)"),
  (3, 'combat.js', "  rawDamage = elastigirlDamageMods(target, rawDamage, opts)", 'after_line',
   "  rawDamage = gsDamageMods(target, rawDamage, opts)   // SATORU GOJO (Shinjuku) — Infinity on every other damage path (beams, cinematics, patches, scripted strikes): stopped / L2 supers ×0.5 (raw untouched for everyone else)", "gsDamageMods(target, rawDamage"),
  (3, 'input.js', "&& !fighter._nsrRemoteInput) {", 'replace', "&& !fighter._nsrRemoteInput && !fighter._gsRemoteInput) {", "!fighter._gsRemoteInput) {"),
  (3, 'input.js', "fighter.rosterKey === 'ninja_storm_cgpt') && !fighter._aiControlled", 'replace',
   "fighter.rosterKey === 'ninja_storm_cgpt' || fighter.rosterKey === 'gojo_shinjuku') && !fighter._aiControlled", "fighter.rosterKey === 'gojo_shinjuku') && !fighter._aiControlled"),
  (3, 'input.js', "!fighter._nsrRemoteInput && inputSettings[", 'replace', "!fighter._nsrRemoteInput && !fighter._gsRemoteInput && inputSettings[", "!fighter._gsRemoteInput && inputSettings["),
  (3, 'input.js', "        charge:b(PAD_BUTTON.charge), block:", 'replace',
   "        charge:b(PAD_BUTTON.charge) || (fighter.rosterKey === 'gojo_shinjuku' && b(11)), block:", "fighter.rosterKey === 'gojo_shinjuku' && b(11)"),
]

# ── phase 4 (user request): double-tap teleport / long blink on the sim clock; the blink's travel is invulnerable ──
HOOKS += [
  (4, 'game.js', "  if (groundTeleportProfile(fighter)) return // opt-in sim press/release edges own this input", 'after_line',
   "  if (isGs(fighter)) return   // Satoru Gojo (Shinjuku): double-tap toward = teleport, away = long blink, read on the sim clock in gojoShinjukuState.js; gojo_shinjuku-gated", "if (isGs(fighter)) return   // Satoru Gojo (Shinjuku): double-tap"),
  (4, 'combat.js', "      if (gsProjectileGate(fighter, proj) === 'remove') { projectiles.splice(i, 1); break }", 'after_line',
   "      if (fighter._gs?.blink?.inv) continue   // Satoru Gojo (Shinjuku): the long blink's travel frames are invulnerable (the projectile passes); gojo_shinjuku-gated", "fighter._gs?.blink?.inv) continue"),
]

# ── phase 5: Unlimited Void reuses the old Gojo's domain (freeze, background video, theme) via domainKey 'gojo' ──
# Behaviour-identical for every other domain: rosterKey only differs from the owner's key when domainKey is passed
# (only gojoShinjukuState.js passes it).
HOOKS += [
  (5, 'domains.js', '    rosterKey: (fighter.rosterKey || fighter.id || "").toLowerCase()', 'replace',
   '    rosterKey: options.domainKey || (fighter.rosterKey || fighter.id || "").toLowerCase()   // domainKey: Satoru Gojo (Shinjuku) borrows the old Gojo\'s Unlimited Void ("gojo")', "rosterKey: options.domainKey ||"),
  (5, 'domains.js', '  if ((domain.owner?.rosterKey || domain.rosterKey) === "gojo") {', 'replace',
   '  if ((domain.owner?.rosterKey || domain.rosterKey) === "gojo" || domain.rosterKey === "gojo") {   // + Satoru Gojo (Shinjuku) via domainKey', '|| domain.rosterKey === "gojo") {   // + Satoru Gojo (Shinjuku)'),
  (5, 'domains.js', '  const gojoDomain = activeDomains.find(d => d?.owner?.rosterKey === "gojo")', 'replace',
   '  const gojoDomain = activeDomains.find(d => d?.owner?.rosterKey === "gojo" || d?.rosterKey === "gojo")   // + Satoru Gojo (Shinjuku) via domainKey', '|| d?.rosterKey === "gojo")   // + Satoru Gojo (Shinjuku)'),
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
