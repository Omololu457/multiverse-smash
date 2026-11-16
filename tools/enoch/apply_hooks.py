#!/usr/bin/env python3
"""Enoch: idempotent, narrow registration hooks in shared files (anchored right AFTER Frozone's lines).
Each hook = (file, anchor, op, text, marker[, count]). The anchor must occur EXACTLY `count` times; 'after_line' inserts
`text` after the line(s) containing it, 'replace' substitutes anchor -> text. A hook whose marker is present is skipped.
Modes:
  --head REV --out DIR   rebuild each shared file from REV:<file> + Enoch's hooks into DIR (private-index commits and the
                         scratch test tree). The worktree is never written in this mode.
  --root DIR             apply in place under DIR (used on the scratch test tree only — the shared worktree's dirty
                         game.js / ui.js belong to another session and are never touched).
  --check                report only."""
import sys, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  enoch: { work: 'Enoch — a tribute fighter: a region recolour of the Game Boy Advance \"The Incredibles\" Frozone playable-character sheet', artists: ['redblueyellow (sprite ripper of the base sheet; on-sheet caption excluded, credited here)', 'Original GBA game art (THQ / Heavy Iron)', 'Recolour: tools/enoch/build_sprites.py (nearest-neighbour, per-region palette swap; docs/enoch/EDIT_LEDGER.md)'],\n"
  "    source: 'Built from the supplied \"Game Boy Advance - The Incredibles - Playable Characters - Frozone.png\" (read-only; Frozone\\'s own files are unchanged). Contributor tribute: one of the people who helped build Multiverse Smash. Procedural patch / beam / steam effects are hard-edged shapes (enochFx.js); the sustained laser sound is Homelander\\'s beam loop re-pitched.',\n"
  "    files: ['assets/enoch/**'] },")
HOOKS = [
  ('characters.js', "import { frozone } from './frozoneData.js'   // Frozone (The Incredibles, GBA sheet) — frozone*.js", 'after_line',
   "import { enoch } from './enochData.js'   // Enoch (The Incredibles, tribute fighter: Frozone recolour + visor fire + water) — enoch*.js", "from './enochData.js'"),
  ('characters.js', "  frozone,                           // Frozone (The Incredibles) — Ice Skater (Chill → Freeze → Shatter, Black Ice, Absolute Zero); frozone*.js", 'after_line',
   "  enoch,                             // Enoch (The Incredibles) — Elemental Controller / Trail Glider (thermal, ice / fire / water patches, glide); enoch*.js", "  enoch,   "),
  ('spritesheets.js', "  frozone: { actions: { idle: './assets/frozone/idle.png' } },", 'after_line',
   "  enoch: { actions: { idle: './assets/enoch/idle.png' } },", "assets/enoch/idle.png"),
  ('kits.js', "import { FROZONE_KIT } from './frozoneKit.js'   // Frozone (frozone) Move List", 'after_line',
   "import { ENOCH_KIT } from './enochKit.js'   // Enoch (enoch) Move List", "enochKit.js"),
  ('kits.js', "  frozone: FROZONE_KIT,", 'after_line', "  enoch: ENOCH_KIT,", "enoch: ENOCH_KIT"),
  ('skins.js', "import { FROZONE_SKINS } from './frozoneSkins.js'   // Frozone default + 10 skins (body, portrait, disc, ice; cosmetic, precomputed)", 'after_line',
   "import { ENOCH_SKINS } from './enochSkins.js'   // Enoch: the default only (keeps his ×2 presentation scale)", "enochSkins.js"),
  ('skins.js', "  frozone: FROZONE_SKINS,", 'after_line', "  enoch: ENOCH_SKINS,", "enoch: ENOCH_SKINS"),
  ('sound.js', "import { FROZONE_SOUNDS } from './frozoneSound.js'   // Frozone synth SFX (SFX bus; voice bus untouched; no dialogue)", 'after_line',
   "import { ENOCH_SOUNDS } from './enochSound.js'   // Enoch synth SFX (SFX bus; voice bus untouched; no dialogue)", "enochSound.js"),
  ('sound.js', "  ...FROZONE_SOUNDS, // frozone_* : ice casts, lance, Black Ice, skate / brake, Chill / Freeze / Shatter, Absolute Zero", 'after_line',
   "  ...ENOCH_SOUNDS, // enoch_* : crackle / shatter, fire crackle, water-reaction hiss + thump, steam, glide whoosh, overload", "...ENOCH_SOUNDS"),
  ('credits.js', "    files: ['assets/frozone/**'] },", 'after_line', CREDIT, "assets/enoch/**"),
  ('combat.js', "import { frozoneHitbox, frozoneBlock, frozoneHit, frozoneProjectileHit } from './frozoneState.js'   // Frozone hooks (frozone-gated)", 'after_line',
   "import { enochHitbox, enochBlock, enochHit, enochProjectileHit } from './enochState.js'   // Enoch hooks (enoch-gated)", "from './enochState.js'"),
  ('combat.js', "  if (a?.fz && fighter.rosterKey === 'frozone') return frozoneHitbox(fighter)", 'after_line',
   "  if (a?.en && fighter.rosterKey === 'enoch') return enochHitbox(fighter)   // Enoch: the strike's box (body-less casts have none — blasts / orbs are projectiles, the beam is hitscan)", "return enochHitbox(fighter)"),
  ('combat.js', "    if (!flawless) frozoneBlock(attacker, defender, atk)", 'after_line',
   "    if (!flawless) enochBlock(attacker, defender, atk)   // Enoch: authored blockstun; enoch-gated", "enochBlock(attacker"),
  ('combat.js', "    frozoneHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after_line',
   "    enochHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Enoch: clean flag (chain / cancels), super meter, Deep Freeze (shared _supFrozen); enoch-gated", "enochHit(attacker"),
  ('combat.js', "      frozoneProjectileHit(proj, fighter, {armored:!!supArmoredProj})", 'after_line',
   "      enochProjectileHit(proj, fighter, {armored:!!supArmoredProj})   // Enoch: blast / orb / hail contact → clean flag + meter; enoch-gated", "enochProjectileHit(proj"),
  ('sprite.js', "    if (fighter.rosterKey === 'frozone') fighter._lastSpriteFrame = this.frameIndex;", 'after_line',
   "    if (fighter.rosterKey === 'enoch') fighter._lastSpriteFrame = this.frameIndex;   // Enoch: presentation read (harness frame checks)", "rosterKey === 'enoch') fighter._lastSpriteFrame"),
  ('sprite.js', "      if (fighter._mrIncredible?.land > 0 && Math.abs(fighter.vx || 0) < 1) return 'land';\n    }\n  }", 'after_line',
   "  if (fighter.rosterKey === 'enoch' && fighter._enoch?.pose && !fighter.attacking && !(fighter.hitstun > 0) && !fighter.knockdownState && !fighter.isGrabbed) {   // Enoch: glide / turn / ramp / disc poses (a fire trail = the _fire copy)\n    const p = fighter._enoch.pose, el = fighter._enoch.glide?.type || fighter._enoch.ramp?.type\n    return el === 'fire' && fighter.animationData?.[p + '_fire'] ? p + '_fire' : p;\n  }", "rosterKey === 'enoch' && fighter._enoch?.pose"),
  ('input.js', "!fighter._frozoneRemoteInput && ", 'replace', "!fighter._frozoneRemoteInput && !fighter._enochRemoteInput && ", "!fighter._enochRemoteInput && ", 2),
  ('input.js', "fighter.rosterKey === 'frozone' || ", 'replace', "fighter.rosterKey === 'frozone' || fighter.rosterKey === 'enoch' || ", "fighter.rosterKey === 'enoch' || "),
  # physics: Enoch's ICE patches (elements.js) — every helper is the identity unless the fighter stands on someone's ICE patch
  ('physics.js', "import { arlongWalkMul, arlongDashMul } from './arlongState.js'", 'after_line',
   "import { elWalkVx, elFriction, elDashMul } from './elements.js'   // element patches (Enoch's ICE): slippery walk / friction / 20 % longer backdash — identity for anyone not on an ICE patch", "from './elements.js'"),
  ('physics.js', "* arlongDashMul(fighter) * dashParrWalkMul(fighter)   // Arlong swim-dash", 'replace',
   "* arlongDashMul(fighter) * dashParrWalkMul(fighter) * elDashMul(fighter)   // Arlong swim-dash", "* elDashMul(fighter)"),
  ('physics.js', "fighter.vx = flashTime ? -FT_ZIP : -walkSpeed", 'replace', "fighter.vx = flashTime ? -FT_ZIP : elWalkVx(fighter, -walkSpeed)", "elWalkVx(fighter, -walkSpeed)"),
  ('physics.js', "fighter.vx = flashTime ? FT_ZIP : walkSpeed", 'replace', "fighter.vx = flashTime ? FT_ZIP : elWalkVx(fighter, walkSpeed)", "elWalkVx(fighter, walkSpeed)"),
  ('physics.js', "          fighter.vx *= fric\n", 'replace', "          fighter.vx *= elFriction(fighter, fric)\n", "fighter.vx *= elFriction(fighter, fric)"),
  ('physics.js', "      fighter.vx *= fighter.onGround ? this.friction : this.airFriction", 'replace',
   "      fighter.vx *= fighter.onGround ? elFriction(fighter, this.friction) : this.airFriction", "elFriction(fighter, this.friction)"),
  ('physics.js', "import { dashParrWalkMul, dashParrPhasing } from './dashParrState.js'", 'after_line',
   "import { enochPhasing } from './enochState.js'   // Enoch: an ICE glide skates past the opponent (enoch-gated; false for everyone else)", "{ enochPhasing }"),
  ('physics.js', "    if (dashParrPhasing(p1, p2)) return", 'after_line',
   "    if (enochPhasing(p1, p2)) return   // Enoch skating PAST on an ICE glide (fire glides and everything else still collide)", "enochPhasing(p1, p2)) return"),
]
GAME = [
  ("import { frozoneHarnessApi } from './frozoneHarness.js'", 'after_line',
   "import { updateEnochCommandCombat } from './enoch.js'   // Enoch (The Incredibles) — enoch-gated command layer\nimport { tickEnoch, isEnoch, clearEnoch, enochLocked, isEnochUltActive, updateEnochUlt, clearEnochUlt, updateEnochIntro, finalizeEnochIntro } from './enochState.js'\nimport { drawEnochUnder, drawEnochOver, drawEnochHud, drawEnochIntroCard, playEnochCues } from './enochFx.js'\nimport { enochHarnessApi } from './enochHarness.js'", "from './enoch.js'"),
  ("const FROZONE_WORLD = MMPR_BLACK_WORLD", 'after_line',
   "const ENOCH_WORLD = MMPR_BLACK_WORLD   // Enoch: the same self-contained world (stage width, frame + seed, fighters, projectiles = blast / orb volumes, attackBox for the disc, W.damage for bursts / beam / patches / supers)", "const ENOCH_WORLD"),
  ("isFrozoneUltActive() || ", 'replace', "isFrozoneUltActive() || isEnochUltActive() || ", "isEnochUltActive() || "),
  ("  clearFrozoneUlt()   // Frozone ABSOLUTE ZERO (freeze contract)", 'after_line',
   "  clearEnochUlt()   // Enoch SUPER (freeze contract)", "clearEnochUlt()   // Enoch SUPER", 4),
  ("  for (const _f of [p1, p2]) if (_f) clearFrozone(_f,FROZONE_WORLD)", 'after_line',
   "  for (const _f of [p1, p2]) if (_f) clearEnoch(_f,ENOCH_WORLD)", "if (_f) clearEnoch(_f,ENOCH_WORLD)", 4),
  ("  tickFrozone(fighter,nearest,readRawControls(fighter)||{},FROZONE_WORLD)\n  playFrozoneCues(fighter)", 'after_line',
   "  tickEnoch(fighter,nearest,readRawControls(fighter)||{},ENOCH_WORLD)\n  playEnochCues(fighter)", "tickEnoch(fighter,nearest,"),
  ("  if (isFrozone(fighter)) { const mc=updateFrozoneCommandCombat(fighter,inputState,nearest,FROZONE_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after_line',
   "  if (isEnoch(fighter)) { const mc=updateEnochCommandCombat(fighter,inputState,nearest,ENOCH_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateEnochCommandCombat(fighter,inputState,nearest"),
  ("clearFrozone(p1,FROZONE_WORLD);clearFrozone(p2,FROZONE_WORLD)", 'replace',
   "clearFrozone(p1,FROZONE_WORLD);clearFrozone(p2,FROZONE_WORLD);clearEnoch(p1,ENOCH_WORLD);clearEnoch(p2,ENOCH_WORLD)", "clearEnoch(p1,ENOCH_WORLD);clearEnoch(p2", 2),
  ("  if (isFrozone(f)) snap.push(JSON.stringify([f._frozone ? { ...f._frozone, cues: undefined } : null, f.currentAttack?.fz || null, f.dashSpeed || 0]))", 'after_line',
   "  if (isEnoch(f)) snap.push(JSON.stringify([f._enoch ? { ...f._enoch, cues: undefined } : null, f.currentAttack?.en || null]))   // Enoch GAME_STATE (thermal, patches, glide / ramp / beam / disc, cooldowns, press edges + motion history, move descriptor; render cue queue excluded)\n  if (f._elSlick || f._elWet) snap.push(JSON.stringify([f._elSlick || null, f._elWet || null]))   // element-patch flags on ANY fighter standing in Enoch's patches", "f.currentAttack?.en || null"),
  ("frozoneLocked(fighter, readRawControls(fighter)) ||", 'replace',
   "frozoneLocked(fighter, readRawControls(fighter)) || enochLocked(fighter, readRawControls(fighter)) ||", "enochLocked(fighter, readRawControls"),
  ("  tickFrozone(fighter,getOpponent(fighter),readRawControls(fighter)||{},FROZONE_WORLD)\n  playFrozoneCues(fighter)", 'after_line',
   "  tickEnoch(fighter,getOpponent(fighter),readRawControls(fighter)||{},ENOCH_WORLD)\n  playEnochCues(fighter)", "tickEnoch(fighter,getOpponent"),
  ("  if (isFrozone(fighter)) {   // Frozone command layer: 'consumed' | 'grab'\n    const mc=updateFrozoneCommandCombat(fighter,inputState,getOpponent(fighter),FROZONE_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after_line',
   "  if (isEnoch(fighter)) {   // Enoch command layer: 'consumed' | 'grab'\n    const mc=updateEnochCommandCombat(fighter,inputState,getOpponent(fighter),ENOCH_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateEnochCommandCombat(fighter,inputState,getOpponent"),
  ("    clearFrozone(f,FROZONE_WORLD)", 'after_line', "    clearEnoch(f,ENOCH_WORLD)", "    clearEnoch(f,ENOCH_WORLD)"),
  ("    if (isFrozone(f)) f._frozoneRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after_line',
   "    if (isEnoch(f)) f._enochRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._enochRemoteInput = replay"),
  ("    updateFrozoneUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after_line',
   "  // ENOCH SUPER (Absolute Zero / Flash Point / Thermal Shock): the same freeze contract (enochState.js).\n  if (isEnochUltActive()) {\n    updateEnochUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "updateEnochUlt()"),
  ("  drawFrozoneUnder(ctx, p1, p2, FROZONE_WORLD)", 'after_line',
   "  drawEnochUnder(ctx, p1, p2, ENOCH_WORLD)   // Enoch — ICE / FIRE / WATER patches + the hovering disc (world-space, under the fighters; render-only; gated)", "drawEnochUnder(ctx"),
  ("  drawFrozoneOver(ctx, p1, p2, FROZONE_WORLD)", 'after_line',
   "  drawEnochOver(ctx, p1, p2, ENOCH_WORLD)   // Enoch — visor beam, reaction bursts, steam clouds (capped), super presentation (render-only; gated)", "drawEnochOver(ctx"),
  ("  drawFrozoneHud(ctx, canvas, p1, p2)", 'after_line',
   "  drawEnochHud(ctx, canvas, p1, p2)   // Enoch: thermal bar under his health (blue → teal → orange, balance zone outlined) + super cut-in (gated)", "drawEnochHud(ctx"),
  ("      drawFrozoneIntroCard(ctx, canvas, p1, p2)", 'after_line',
   "      drawEnochIntroCard(ctx, canvas, p1, p2)   // Enoch: portrait + name card while his own intro plays (presentation only; gated)", "drawEnochIntroCard(ctx"),
  ("    frozoneTest: frozoneHarnessApi(", 'after_line',
   "    enochTest: enochHarnessApi({p1:()=>p1,p2:()=>p2,world:ENOCH_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "enochTest: enochHarnessApi"),
  ("updateFrozoneIntro(p1) }", 'replace', "updateFrozoneIntro(p1); updateEnochIntro(p1) }", "updateEnochIntro(p1)"),
  ("updateFrozoneIntro(p2) }", 'replace', "updateFrozoneIntro(p2); updateEnochIntro(p2) }", "updateEnochIntro(p2)"),
  ("finalizeFrozoneIntro(p1) }", 'replace', "finalizeFrozoneIntro(p1); finalizeEnochIntro(p1) }", "finalizeEnochIntro(p1) }"),
  ("finalizeFrozoneIntro(p2) }", 'replace', "finalizeFrozoneIntro(p2); finalizeEnochIntro(p2) }", "finalizeEnochIntro(p2) }"),
  ("    finalizeFrozoneIntro(p1); finalizeFrozoneIntro(p2)   // Frozone: undo the skate-in offset if skipped mid-skate", 'after_line',
   "    finalizeEnochIntro(p1); finalizeEnochIntro(p2)   // Enoch: undo the glide-in offset if skipped mid-glide", "finalizeEnochIntro(p1); finalizeEnochIntro(p2)"),
  # Charge (L2) is Enoch's glide button: the shared energy charge is off for him (his Super meter fills from damage)
  ("!dseylOwnsCharge(fighter) && ", 'replace', "!dseylOwnsCharge(fighter) && !isEnoch(fighter) && ", "!isEnoch(fighter) && "),
]
HOOKS += [('game.js',) + g for g in GAME]

def apply(fn, src):
  out, bad = src, 0
  for h in HOOKS:
    f, anchor, op, text, marker = h[:5]; want = h[5] if len(h) > 5 else 1
    if f != fn: continue
    if marker in out: continue
    n = out.count(anchor)
    if n != want: print(f'  FAIL  {fn}: anchor x{n} (want {want}): {anchor[:80]!r}'); bad += 1; continue
    if op == 'replace': out = out.replace(anchor, text)
    else:
      k = 0
      for _ in range(want):
        i = out.index(anchor, k); j = out.find('\n', i + len(anchor) - (1 if anchor.endswith('\n') else 0)); j = len(out) if j < 0 else j
        out = out[:j] + '\n' + text + out[j:]; k = j + 1 + len(text)
  return out, bad

def main():
  a = sys.argv[1:]; check = '--check' in a; bad = 0
  files = sorted({h[0] for h in HOOKS})
  if '--list' in a: print(' '.join(files)); return
  if '--head' in a:
    rev = a[a.index('--head') + 1]; out = a[a.index('--out') + 1]
    for fn in files:
      src = subprocess.run(['git', 'show', f'{rev}:{fn}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
      new, b = apply(fn, src); bad += b
      dst = os.path.join(out, fn); os.makedirs(os.path.dirname(dst) or '.', exist_ok=True)
      open(dst, 'w', encoding='utf-8').write(new); print(f'  {fn}: {"changed" if new != src else "unchanged"}')
  else:
    root = a[a.index('--root') + 1] if '--root' in a else None
    if not root: sys.exit('refusing to patch the shared worktree: pass --root <scratch tree> or --head REV --out DIR')
    for fn in files:
      p = os.path.join(root, fn); src = open(p, encoding='utf-8').read(); new, b = apply(fn, src); bad += b
      if new != src and not check: open(p, 'w', encoding='utf-8').write(new)
      print(f'  {fn}: {"would change" if check and new != src else "changed" if new != src else "unchanged"}')
  sys.exit(1 if bad else 0)
main()
