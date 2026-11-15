#!/usr/bin/env python3
"""Violet Parr: idempotent, narrow registration hooks in shared files (same contract as tools/batman/apply_hooks.py).
Each hook = (phase, file, anchor, op, text, marker[, count]). anchor must occur EXACTLY `count` times; op 'after_line'
inserts `text` after the line containing anchor, 'before_line' before it, 'replace' substitutes anchor -> text. A hook
whose marker is already present is skipped. `--phase N` applies hooks of phases <= N (one commit per phase).
Usage: apply_hooks.py [--check] [--root DIR] [--phase N]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  violet: { work: 'Violet Parr — Game Boy Advance \"The Incredibles\" playable-character sheet', artists: ['redblueyellow (sprite ripper; on-sheet caption: \"Ripped by redblueyellow. No credit needed.\")', 'Original GBA game art (THQ / Heavy Iron Studios)'],\n"
  "    source: 'Supplied \"Game Boy Advance - The Incredibles - Playable Characters - Violet.png\" (SHA-256 4bf0ab80…6e20; preserved byte-identical as assets/sprites/violet.png). Exact background key (0,128,128) removed; caption excluded. Original pixels only.',\n"
  "    files: ['assets/sprites/violet.png', 'assets/violet/**'] },")
HOOKS = [
  (1, 'characters.js', "import { batman as batmanRebuild } from './batmanData.js'", 'after_line',
   "import { violet } from './violetData.js'   // Violet Parr (The Incredibles, GBA sheet) — violet*.js", "from './violetData.js'"),
  (1, 'characters.js', "  batman: batmanRebuild,  ", 'before_line',
   "  violet,                            // Violet Parr (The Incredibles) — Zoner / Trickster (Vanish, Force Push, Bubble Shield, Force Ball, Field Trap, FULL FORCE); violet*.js", "  violet,  "),
  (1, 'spritesheets.js', '    actions: { idle: "./assets/batman/body.png" }', 'after_line',
   '  },\n  violet: {   // Violet Parr (The Incredibles GBA sheet). Per-action strips live on characters.js → violet.animationData (violetSprites.js)\n    actions: { idle: "./assets/violet/idle.png" }', './assets/violet/idle.png'),
  (1, 'skins.js', "import { BATMAN_SKINS } from './batmanSkins.js'", 'after_line',
   "import { VIOLET_SKINS } from './violetSkins.js'   // Violet Parr: Supersuit default + palette-swap skins (cosmetic, precomputed)", "violetSkins.js"),
  (1, 'skins.js', "SKINS.batman = BATMAN_SKINS", 'after_line',
   "SKINS.violet = VIOLET_SKINS   // Violet Parr: her own skin list (no generic auto-recolours)", "SKINS.violet = VIOLET_SKINS"),
  (1, 'fighters.js', '    case "omniman": drawOmniMan(ctx, x, y, w, h, fighter); break', 'after_line',
   '    case "violet":  if (fighter._violet?.inv) ctx.globalAlpha *= 0.35; drawFallback(ctx, x, y, w, h, fighter); break   // ★ Violet Parr (procedural fallback while sprites load; 35% while invisible)', 'case "violet":'),
  (1, 'credits.js', "    files: ['assets/batman/**'] },", 'after_line', CREDIT, "assets/violet/**"),
  (1, 'game.js', '  marvel:          "#e62429",   // Spider-Man red', 'after_line',
   '  pixar:           "#e8323c",   // Incredibles suit red (Elastigirl)', 'pixar:           "#e8323c"'),   # same line as the Elastigirl build (one shared Pixar group)
  (1, 'game.js', "import { batmanHarnessApi } from './batmanHarness.js'", 'after_line',
   "import { violetHarnessApi } from './violetHarness.js'   // Violet Parr test accessor (harness URLs only)", "violetHarness.js"),
  (1, 'game.js', "    batmanTest: batmanHarnessApi(", 'after_line',
   "    violetTest: violetHarnessApi({p1:()=>p1,p2:()=>p2,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "violetTest: violetHarnessApi"),
  # ── phase 2: stats / energy economy / run / weight ──
  (2, 'abilities.js', "import { updateZoroSantoryu } from './zoroState.js'", 'after_line',
   "import { violetRegen } from './violetState.js'   // Violet Parr: Force Field regen 5 / s (violet-gated)", "violetRegen } from './violetState.js'"),
  (2, 'abilities.js', "  if (zoroRegen(fighter)) return", 'after_line', "  if (violetRegen(fighter)) return   // Violet Parr: Force Field 5 / s (violet-gated)", "if (violetRegen(fighter)) return"),
  (2, 'combat.js', "import { batmanHitbox, batmanBlock, batmanHit, absorbBatman } from './batmanState.js'", 'after_line',
   "import { violetHit, violetKnockback } from './violetState.js'   // Violet Parr hooks (violet-gated)", "from './violetState.js'"),
  (2, 'combat.js', "    batmanHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    violetHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Violet: +4 Force Field on a landed hit; violet-gated", "    violetHit(attacker"),
  (2, 'combat.js', "    zoroKnockback(attacker, defender, atk)", 'after_line', "    violetKnockback(attacker, defender, atk)   // Violet: weight 0.8 (knockback taken ÷ 0.8); violet-gated", "violetKnockback(attacker"),
  (2, 'game.js', "import { batmanHarnessApi } from './batmanHarness.js'", 'after_line',
   "import { tickViolet, isViolet, clearViolet } from './violetState.js'   // Violet Parr (The Incredibles) — violet-gated sim", "import { tickViolet"),
  (2, 'game.js', "const BATMAN_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const VIOLET_WORLD = MMPR_BLACK_WORLD   // Violet Parr: the same self-contained world (stage width, fighters, frame, seed, W.damage)", "const VIOLET_WORLD"),
  (2, 'game.js', "  for (const _f of [p1, p2]) if (_f) clearBatman(_f)", 'after_line', "  for (const _f of [p1, p2]) if (_f) clearViolet(_f)", "if (_f) clearViolet(_f)", 4),
  (2, 'game.js', "  tickBatman(fighter,nearest,readRawControls(fighter)||{},BATMAN_WORLD)\n  playBatmanCues(fighter)", 'after_line',
   "  tickViolet(fighter,nearest,readRawControls(fighter)||{},VIOLET_WORLD)", "tickViolet(fighter,nearest,"),
  (2, 'game.js', "  tickBatman(fighter,getOpponent(fighter),readRawControls(fighter)||{},BATMAN_WORLD)\n  playBatmanCues(fighter)", 'after_line',
   "  tickViolet(fighter,getOpponent(fighter),readRawControls(fighter)||{},VIOLET_WORLD)", "tickViolet(fighter,getOpponent"),
  (2, 'game.js', ";clearBatman(p1);clearBatman(p2)", 'replace', ";clearBatman(p1);clearBatman(p2);clearViolet(p1);clearViolet(p2)", "clearViolet(p1);clearViolet(p2)", 2),
  (2, 'game.js', "    clearMmprPink(f,MMPR_PINK_WORLD)\n    clearBatman(f)", 'after_line', "    clearViolet(f)", "    clearViolet(f)"),
  (2, 'game.js', "  if (isBatman(f)) snap.push(JSON.stringify([f._batman || null", 'after_line',
   "  if (isViolet(f)) snap.push(JSON.stringify([f._violet || null, f.currentAttack?.vi || null, f.baseSpeed, f.runWhenAdvancing || false]))   // Violet GAME_STATE (energy ledger, run, Vanish, shield, push, trap, ult, cooldowns, edges)", "if (isViolet(f)) snap.push"),
  # ── phase 3: VANISH ──
  (3, 'combat.js', "import { violetHit, violetKnockback } from './violetState.js'", 'replace',
   "import { violetHit, violetBlock, violetKnockback } from './violetState.js'", "violetHit, violetBlock,"),
  (3, 'combat.js', "    if (!flawless) batmanBlock(attacker, defender, atk)", 'after_line',
   "    violetBlock(attacker, defender, atk)   // Violet: a blocked strike still ends Vanish; violet-gated", "violetBlock(attacker, defender"),
  (3, 'game.js', "import { tickViolet, isViolet, clearViolet } from './violetState.js'", 'replace',
   "import { tickViolet, isViolet, clearViolet, violetFacingFix } from './violetState.js'", "clearViolet, violetFacingFix"),
  (3, 'game.js', "import { violetHarnessApi } from './violetHarness.js'", 'before_line',
   "import { updateVioletCommandCombat } from './violet.js'   // Violet Parr command layer (violet-gated)", "from './violet.js'"),
  (3, 'game.js', "  if (isBatman(fighter)) { const mc=updateBatmanRebuildCombat(fighter,inputState,nearest,BATMAN_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isViolet(fighter)) { const vc=updateVioletCommandCombat(fighter,inputState,nearest,VIOLET_WORLD);if(vc)ctrlState=vc==='grab'?{grab:!!inputState.grab}:{} }", "updateVioletCommandCombat(fighter,inputState,nearest"),
  (3, 'game.js', "    const mc=updateBatmanRebuildCombat(fighter,inputState,getOpponent(fighter),BATMAN_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isViolet(fighter)) {   // Violet Parr command layer: 'consumed' | 'grab' | false (fall through to the engine)\n    const vc=updateVioletCommandCombat(fighter,inputState,getOpponent(fighter),VIOLET_WORLD)\n    if (vc) { updateCombat(fighter,getOpponent(fighter),vc==='grab'?{grab:!!inputState.grab}:{},opts); return }\n  }", "updateVioletCommandCombat(fighter,inputState,getOpponent"),
  (3, 'game.js', "  if (p1.x < p2.x) { p1.facing =  1; p2.facing = -1 }", 'before_line',
   "  const _vioPrevFacing = [p1.facing, p2.facing]   // Violet: pre-auto-turn facings (an invisible Violet is not auto-faced)", "_vioPrevFacing = [p1.facing"),
  (3, 'game.js', "  rangerFacingFix(p1, p2); rangerFacingFix(p2, p1)", 'after_line',
   "  violetFacingFix(p1, p2, _vioPrevFacing[0]); violetFacingFix(p2, p1, _vioPrevFacing[1])   // Violet VANISH: the opponent does not auto-turn toward her (no-op otherwise)", "violetFacingFix(p1, p2"),
  (3, 'sprite.js', 'import { isFlying } from "./flight.js"', 'after_line',
   "import { violetSpriteAction, violetAlpha } from './violetView.js'   // Violet Parr: invisible strips + 35 % alpha (render-only, violet-gated)", "from './violetView.js'"),
  (3, 'sprite.js', "    const action = this.determineAction(fighter);", 'replace',
   "    const action = violetSpriteAction(fighter, this.determineAction(fighter));   // Violet: Vanish strips (identity for everyone else)", "violetSpriteAction(fighter, this.determineAction"),
  (3, 'sprite.js', '    const _sprFilter = impactPostCanvas ? "none" : spriteFilter;', 'after_line',
   "    if (fighter.rosterKey === 'violet') ctx.globalAlpha *= violetAlpha(fighter);   // Violet VANISH: 35 % while invisible (render-only)", "ctx.globalAlpha *= violetAlpha(fighter)"),
  # ── phase 4: MOVESET (combo scale, dome absorb / reflect, ball armour, authored blockstun, movement lock, FX) ──
  (4, 'combat.js', "import { violetHit, violetBlock, violetKnockback } from './violetState.js'", 'replace',
   "import { violetHit, violetBlock, violetKnockback, violetComboScale, absorbViolet, violetProjectile } from './violetState.js'", "violetComboScale, absorbViolet"),
  (4, 'combat.js', "  if (fighter?.rosterKey === 'spd_red' && curve === COMBO_DAMAGE_CURVE) return spdRedComboScale(fighter)", 'after_line',
   "  if (fighter?.rosterKey === 'violet' && curve === COMBO_DAMAGE_CURVE) return violetComboScale(fighter)   // Violet Parr: 85% per hit (violet-gated)", "return violetComboScale(fighter)"),
  (4, 'combat.js', "  if (absorbBatman(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }", 'after_line',
   "  if (absorbViolet(defender, attacker, attacker.currentAttack)) { attacker.currentAttack.hasHit = true; return }   // Violet BUBBLE SHIELD: the dome stops the strike; violet-gated", "absorbViolet(defender"),
  (4, 'combat.js', "      if (absorbSpdBlue(fighter, proj.owner, proj, true)) { projectiles.splice(i, 1); break }", 'after_line',
   "      { const _vio = violetProjectile(fighter, proj); if (_vio === 'absorb') { projectiles.splice(i, 1); break } if (_vio === 'reflect') break }   // Violet: dome reflect ×1.2 / Force Ball armour; violet-gated", "violetProjectile(fighter, proj)"),
  (4, 'combat.js', "    violetBlock(attacker, defender, atk)   // Violet: a blocked strike still ends Vanish; violet-gated", 'replace',
   "    violetBlock(attacker, defender, atk, flawless)   // Violet: a blocked strike still ends Vanish + authored blockstun (not on a flawless block); violet-gated", "violetBlock(attacker, defender, atk, flawless)"),
  (4, 'game.js', "import { tickViolet, isViolet, clearViolet, violetFacingFix } from './violetState.js'", 'replace',
   "import { tickViolet, isViolet, clearViolet, violetFacingFix, violetLocked } from './violetState.js'", "violetFacingFix, violetLocked }"),
  (4, 'game.js', "import { updateVioletCommandCombat } from './violet.js'", 'after_line',
   "import { drawVioletFx, drawVioletScreen } from './violetFx.js'   // Violet Parr FX (render-only, violet-gated)", "from './violetFx.js'"),
  (4, 'game.js', "(fighter, readRawControls(fighter)) || teleportTick) {", 'replace',
   "(fighter, readRawControls(fighter)) || violetLocked(fighter, readRawControls(fighter)) || teleportTick) {", "violetLocked(fighter, readRawControls"),   # anchor = the tail of the shared locked-chain (other builds insert before it)
  (4, 'game.js', "    drawBatmanFx(c, fighter)   // Batman", 'after_line',
   "    drawVioletFx(c, fighter)   // Violet Parr — push ring, dome, shell, trap bubble + telegraph, FULL FORCE (render-only; violet only)", "drawVioletFx(c, fighter)"),
  (4, 'game.js', "  drawBatmanHud(ctx, canvas, p1, p2)   // Batman", 'after_line',
   "  drawVioletScreen(ctx, canvas, p1, p2)   // Violet FULL FORCE detonation flash (render-only; gated)", "drawVioletScreen(ctx, canvas"),
  (4, 'game.js', "    violetTest: violetHarnessApi({p1:()=>p1,p2:()=>p2,reset:", 'replace',
   "    violetTest: violetHarnessApi({p1:()=>p1,p2:()=>p2,projectiles:()=>activeProjectiles,reset:", "violetHarnessApi({p1:()=>p1,p2:()=>p2,projectiles:"),
  # ── phase 6: DEFENSE (body-less moves have no strike box → no clash) ──
  (6, 'combat.js', "import { violetHit, violetBlock, violetKnockback, violetComboScale, absorbViolet, violetProjectile } from './violetState.js'", 'replace',
   "import { violetHit, violetBlock, violetKnockback, violetComboScale, absorbViolet, violetProjectile, violetNoBox } from './violetState.js'", "violetProjectile, violetNoBox }"),
  (6, 'combat.js', "  if (a?.bm && fighter.rosterKey === 'batman') return batmanHitbox(fighter)", 'after_line',
   "  if (a?.vi && fighter.rosterKey === 'violet' && violetNoBox(fighter, a)) return null   // Violet: body-less specials / Phase Step have no strike box (no clash); violet-gated", "violetNoBox(fighter, a)) return null"),
  # ── phase 8: SOUND (WebAudio placeholders; reads cue serials, never mutates sim state) ──
  (8, 'game.js', "import { drawVioletFx, drawVioletScreen } from './violetFx.js'", 'after_line',
   "import { playVioletCues } from './violetSound.js'   // Violet Parr synth SFX (SFX bus; hash pitch / noise; violet-gated)", "from './violetSound.js'"),
  (8, 'game.js', "  tickViolet(fighter,nearest,readRawControls(fighter)||{},VIOLET_WORLD)", 'after_line', "  playVioletCues(fighter)   // Violet SFX (FFA)", "playVioletCues(fighter)   // Violet SFX (FFA)"),
  (8, 'game.js', "  tickViolet(fighter,getOpponent(fighter),readRawControls(fighter)||{},VIOLET_WORLD)", 'after_line', "  playVioletCues(fighter)   // Violet SFX (1v1)", "playVioletCues(fighter)   // Violet SFX (1v1)"),
  # ── phase 9: METADATA (Move List kit) ──
  (9, 'kits.js', "import { BATMAN_KIT } from './batmanKit.js'", 'after_line',
   "import { VIOLET_KIT } from './violetKit.js'   // Violet Parr (violet) Move List", "from './violetKit.js'"),
  (9, 'kits.js', "  batman: BATMAN_KIT,", 'after_line', "  violet: VIOLET_KIT,", "  violet: VIOLET_KIT,"),
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
      if marker in out: continue
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
      print(f'  {"would" if check else "apply"} {fn}: {marker[:60]!r}')
    if out != src and not check:
      if open(p, encoding='utf-8').read() != src: print(f'  FAIL  {fn} changed during patch; not written'); bad += 1; continue
      open(p, 'w', encoding='utf-8').write(out)
  sys.exit(1 if bad else 0)
main()
