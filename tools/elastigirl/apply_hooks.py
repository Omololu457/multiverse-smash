#!/usr/bin/env python3
"""Elastigirl: idempotent, narrow registration hooks in shared files (same contract as tools/batman/apply_hooks.py).
Each hook = (phase, file, anchor, op, text, marker[, count]). The anchor must occur EXACTLY `count` times (asserted);
'after_line' inserts `text` after the line containing the anchor, 'replace' substitutes anchor -> text. A hook whose
marker is already present is skipped (re-running is a no-op). Anchors are the Batman rebuild's lines (present at the
branch base 7a2b638af). Every inserted line is gated on rosterKey 'elastigirl' (or an Elastigirl-only field).
Usage: apply_hooks.py [--check] [--root DIR] [--phase N]     (applies hooks of phase <= N; default: all)"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  elastigirl: { work: 'Elastigirl (Helen Parr) — The Incredibles (Game Boy Advance) playable-character sheet', artists: ['redblueyellow (ripper)'],\n"
  "    source: 'Supplied \"Game Boy Advance - The Incredibles - Playable Characters - Elastigirl.png\" (byte copy at assets/sprites/elastigirl.png, SHA-256 70f6aefe…). On-sheet text: \"Ripped by redblueyellow. No credit needed.\" (excluded from extraction, credited anyway). Teal key exact, original pixels, nearest-neighbour only. Rects in docs/elastigirl/source_rects.json; raft frames include Dash and Violet as drawn on the sheet.',\n"
  "    files: ['assets/elastigirl/**', 'assets/sprites/elastigirl.png'] },")
HOOKS = [
  # ── Phase 1: roster entry + art registration ──
  (1, 'characters.js', "import { batman as batmanRebuild } from './batmanData.js'", 'after_line',
   "import { elastigirl } from './elastigirlData.js'   // Elastigirl (Helen Parr, The Incredibles GBA sheet) — universe 'the_incredibles'; elastigirl*.js", "from './elastigirlData.js'"),
  (1, 'characters.js', "  mmpr_white,                        // White Ranger", 'after_line',
   "  elastigirl,                        // Elastigirl (Helen Parr, The Incredibles) — Footsies / Grappler (Long Arm, Slingshot, Parachute, Family Raft); elastigirl*.js", "  elastigirl,"),
  (1, 'spritesheets.js', "  mmpr_black: { actions: { idle: './assets/mmpr_black/idle.png' } },", 'after_line',
   "  elastigirl: { actions: { idle: './assets/elastigirl/idle.png' } },   // Elastigirl (elastigirl*.js) — per-action strips from tools/elastigirl/extract.py", "./assets/elastigirl/idle.png"),
  (1, 'skins.js', "import { BATMAN_SKINS } from './batmanSkins.js'", 'after_line',
   "import { ELASTIGIRL_SKINS } from './elastigirlSkins.js'   // Elastigirl default + palette skins (cosmetic, precomputed)", "elastigirlSkins.js"),
  (1, 'skins.js', "  mmpr_black: MMPR_BLACK_SKINS,", 'after_line', "  elastigirl: ELASTIGIRL_SKINS,", "elastigirl: ELASTIGIRL_SKINS"),
  (1, 'credits.js', "    files: ['assets/batman/**'] },", 'after_line', CREDIT, "assets/elastigirl/**"),
  # (universe colour: Elastigirl joins the existing 'the_incredibles' universe, which already has one)
  # ── Phase 2: Elasticity regen (abilities.js regenEnergy) ──
  (2, 'abilities.js', "import { luffyRegen } from './luffyState.js'", 'after_line',
   "import { elastigirlRegen } from './elastigirlState.js'   // Elastigirl: Elasticity recharge 5/s (elastigirl-gated)", "elastigirlRegen } from"),
  (2, 'abilities.js', "  if (luffyRegen(fighter)) return", 'after_line',
   "  if (elastigirlRegen(fighter)) return   // Elastigirl: Elasticity 5/s (no-op for everyone else)", "if (elastigirlRegen(fighter))"),
  (2, 'combat.js', "import { batmanHitbox, batmanBlock, batmanHit, absorbBatman } from './batmanState.js'", 'after_line',
   "import { elastigirlDamageMods } from './elastigirlState.js'   // Elastigirl hooks (elastigirl-gated)", "from './elastigirlState.js'"),
  (2, 'combat.js', "  rawDamage = arlongDamageMods(target, rawDamage, opts)", 'after_line',
   "  rawDamage = elastigirlDamageMods(target, rawDamage, opts)   // ELASTIGIRL — Rubber Body (−15% melee normals) + Elasticity +4 landed / +3 taken (returns rawDamage untouched unless she is involved)", "elastigirlDamageMods(target"),
  # ── Phase 3: sim tick, slingshot, command layer plumbing, GAME_STATE snapshot, lifecycle ──
  (3, 'game.js', "import { batmanHarnessApi } from './batmanHarness.js'", 'after_line',
   "import { updateElastigirlCommandCombat } from './elastigirl.js'   // Elastigirl (Helen Parr) — elastigirl-gated command layer\n"
   "import { tickElastigirl, isElastigirl, clearElastigirl, elastigirlLocked, elastigirlSnapshot } from './elastigirlState.js'\n"
   "import { drawElastigirlFx, playElastigirlCues } from './elastigirlFx.js'\n"
   "import { elastigirlHarnessApi } from './elastigirlHarness.js'", "from './elastigirl.js'"),
  (3, 'game.js', "const BATMAN_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const ELASTIGIRL_WORLD = MMPR_BLACK_WORLD   // Elastigirl: the same self-contained world (stage width, frame, seed, fighters, W.damage)", "const ELASTIGIRL_WORLD"),
  (3, 'game.js', "  for (const _f of [p1, p2]) if (_f) clearBatman(_f)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearElastigirl(_f)", "if (_f) clearElastigirl(_f)", 4),
  (3, 'game.js', "  tickBatman(fighter,nearest,readRawControls(fighter)||{},BATMAN_WORLD)\n  playBatmanCues(fighter)", 'after_line',
   "  tickElastigirl(fighter,nearest,readRawControls(fighter)||{},ELASTIGIRL_WORLD)\n  playElastigirlCues(fighter)", "tickElastigirl(fighter,nearest,"),
  (3, 'game.js', "  if (isBatman(fighter)) { const mc=updateBatmanRebuildCombat(fighter,inputState,nearest,BATMAN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isElastigirl(fighter)) { const mc=updateElastigirlCommandCombat(fighter,inputState,nearest,ELASTIGIRL_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateElastigirlCommandCombat(fighter,inputState,nearest"),
  (3, 'game.js', "clearBatman(p1);clearBatman(p2)", 'replace',
   "clearBatman(p1);clearBatman(p2);clearElastigirl(p1);clearElastigirl(p2)", "clearElastigirl(p1);clearElastigirl(p2)", 2),
  (3, 'game.js', "  if (isBatman(f)) snap.push(", 'after_line',
   "  if (isElastigirl(f)) snap.push(JSON.stringify(elastigirlSnapshot(f)))   // Elastigirl GAME_STATE (state, pendulum, current attack)", "elastigirlSnapshot(f)"),
  (3, 'game.js', "batmanLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "batmanLocked(fighter, readRawControls(fighter)) || elastigirlLocked(fighter, readRawControls(fighter)) ||", "elastigirlLocked(fighter, readRawControls"),
  (3, 'game.js', "  tickBatman(fighter,getOpponent(fighter),readRawControls(fighter)||{},BATMAN_WORLD)\n  playBatmanCues(fighter)", 'after_line',
   "  tickElastigirl(fighter,getOpponent(fighter),readRawControls(fighter)||{},ELASTIGIRL_WORLD)\n  playElastigirlCues(fighter)", "tickElastigirl(fighter,getOpponent"),
  (3, 'game.js', "    const mc=updateBatmanRebuildCombat(fighter,inputState,getOpponent(fighter),BATMAN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isElastigirl(fighter)) {   // Elastigirl command layer: 'consumed' | 'grab'\n    const mc=updateElastigirlCommandCombat(fighter,inputState,getOpponent(fighter),ELASTIGIRL_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateElastigirlCommandCombat(fighter,inputState,getOpponent"),
  (3, 'game.js', "    clearBatman(f)", 'after_line', "    clearElastigirl(f)", "    clearElastigirl(f)"),
  (3, 'game.js', "    if (isBatman(f)) f._batmanRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isElastigirl(f)) f._elastigirlRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._elastigirlRemoteInput = replay"),
  (3, 'game.js', "    drawBatmanFx(c, fighter)", 'after_line',
   "    drawElastigirlFx(c, fighter)   // Elastigirl — slingshot arm to the anchor, parachute shadow ovals, guard / raft splash (render-only; elastigirl only)", "drawElastigirlFx(c, fighter"),
  (3, 'game.js', '    && !(a.rosterKey === "batman" && a.skinId !== b.skinId)', 'after_line',
   '    && !(a.rosterKey === "elastigirl" && a.skinId !== b.skinId)   // Elastigirl: same rule', 'a.rosterKey === "elastigirl" && a.skinId'),
  (3, 'game.js', "    batmanTest: batmanHarnessApi(", 'after_line',
   "    elastigirlTest: elastigirlHarnessApi({p1:()=>p1,p2:()=>p2,world:ELASTIGIRL_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "elastigirlTest: elastigirlHarnessApi"),
  (3, 'input.js', "!fighter._mmprPinkRemoteInput && !fighter._batmanRemoteInput) {", 'replace',
   "!fighter._mmprPinkRemoteInput && !fighter._batmanRemoteInput && !fighter._elastigirlRemoteInput) {", "!fighter._elastigirlRemoteInput) {"),
  (3, 'input.js', "fighter.rosterKey === 'batman') && !fighter._aiControlled", 'replace',
   "fighter.rosterKey === 'batman' || fighter.rosterKey === 'elastigirl') && !fighter._aiControlled", "fighter.rosterKey === 'elastigirl') && !fighter._aiControlled"),
  (3, 'input.js', "!fighter._batmanRemoteInput && inputSettings[", 'replace',
   "!fighter._batmanRemoteInput && !fighter._elastigirlRemoteInput && inputSettings[", "!fighter._elastigirlRemoteInput && inputSettings["),
  (3, 'combat.js', "import { elastigirlDamageMods } from './elastigirlState.js'", 'replace',
   "import { elastigirlHitbox, elastigirlHurtbox, elastigirlBlock, elastigirlHit, elastigirlDamageMods } from './elastigirlState.js'", "elastigirlHitbox, elastigirlHurtbox"),
  (3, 'combat.js', "  if (a?.bm && fighter.rosterKey === 'batman') return batmanHitbox(fighter)", 'after_line',
   "  if (a?.eg && fighter.rosterKey === 'elastigirl') return elastigirlHitbox(fighter)   // Elastigirl: per-move limb box + multi-contact windows", "return elastigirlHitbox(fighter)"),
  (3, 'combat.js', "  if (fighter.rosterKey === 'arlong') return arlongHurtbox(fighter)", 'after_line',
   "  if (fighter.rosterKey === 'elastigirl') return elastigirlHurtbox(fighter)   // ELASTIGIRL — stretched-limb hurtbox while a long normal is active; Whirl Kick upper-body invulnerability (elastigirl-gated)", "return elastigirlHurtbox(fighter)"),
  (3, 'combat.js', "    if (!flawless) batmanBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) elastigirlBlock(attacker, defender, atk)   // Elastigirl: authored on-block advantage; elastigirl-gated", "elastigirlBlock(attacker"),
  (3, 'combat.js', "    batmanHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    elastigirlHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Elastigirl: clean flag (Long Arm pull, Whip bounce, raft carry); elastigirl-gated", "elastigirlHit(attacker"),
  # ── Phase 4: moveset metadata (Move List) ──
  (4, 'kits.js', "import { BATMAN_KIT } from './batmanKit.js'", 'after_line',
   "import { ELASTIGIRL_KIT } from './elastigirlKit.js'   // Elastigirl (elastigirl) Move List", "elastigirlKit.js"),
  (4, 'kits.js', "  batman: BATMAN_KIT,", 'after_line', "  elastigirl: ELASTIGIRL_KIT,", "elastigirl: ELASTIGIRL_KIT"),
  # ── Phase 6: Stretch Guard parry absorb ──
  (6, 'combat.js', "elastigirlHit, elastigirlDamageMods } from './elastigirlState.js'", 'replace',
   "elastigirlHit, absorbElastigirl, elastigirlDamageMods } from './elastigirlState.js'", "absorbElastigirl, elastigirlDamageMods"),
  (6, 'combat.js', "  if (absorbBatman(defender, attacker, attacker.currentAttack))", 'after_line',
   "  if (absorbElastigirl(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }   // Elastigirl Stretch Guard: parry window absorbs one strike; elastigirl-gated", "absorbElastigirl(defender"),
  # ── Phase 8: sound ──
  (8, 'sound.js', "import { BATMAN_SOUNDS } from './batmanSound.js'", 'after_line',
   "import { ELASTIGIRL_SOUNDS } from './elastigirlSound.js'   // Elastigirl synth SFX placeholders (SFX bus; voice bus untouched)", "elastigirlSound.js"),
  (8, 'sound.js', "  ...BATMAN_SOUNDS,", 'after_line',
   "  ...ELASTIGIRL_SOUNDS, // elastigirl_* : stretch boing, snap-back, whirl, parachute flutter, whip crack, family raft wave", "...ELASTIGIRL_SOUNDS"),
]


def main():
  a = sys.argv[1:]; check = '--check' in a
  root = a[a.index('--root') + 1] if '--root' in a else ROOT
  phase = int(a[a.index('--phase') + 1]) if '--phase' in a else 99
  bad = 0
  for fn in sorted({h[1] for h in HOOKS}):
    p = os.path.join(root, fn); src = open(p, encoding='utf-8').read(); out = src
    for h in HOOKS:
      ph, f, anchor, op, text, marker = h[:6]; want = h[6] if len(h) > 6 else 1
      if f != fn or ph > phase: continue
      if marker in out: print(f'  skip  {fn}: {marker[:50]!r} present'); continue
      n = out.count(anchor)
      if n != want: print(f'  FAIL  {fn}: anchor x{n} (want {want}): {anchor[:70]!r}'); bad += 1; continue
      if op == 'replace': out = out.replace(anchor, text)
      else:
        k = 0
        for _ in range(want):
          i = out.index(anchor, k); j = out.find('\n', i + len(anchor)); j = len(out) if j < 0 else j
          out = out[:j] + '\n' + text + out[j:]; k = j + 1 + len(text)
      print(f'  {"would" if check else "apply"} P{ph} {fn}: {marker[:50]!r}')
    if out != src and not check:
      if open(p, encoding='utf-8').read() != src: print(f'  FAIL  {fn} changed during patch; not written'); bad += 1; continue
      open(p, 'w', encoding='utf-8').write(out)
  sys.exit(1 if bad else 0)


main()
