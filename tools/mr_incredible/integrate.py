from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def edit(file,fn):
 p=ROOT/file;s=p.read_text();v=fn(s)
 if v!=s:p.write_text(v)
def after(s,anchor,text):
 if text in s:return s
 assert anchor in s,anchor
 pos=s.index('\n',s.index(anchor));return s[:pos+1]+text+'\n'+s[pos+1:]
edit('characters.js',lambda s:after(after(s,"import { syndrome }", "import { mr_incredible } from './mrIncredibleData.js'"),'  syndrome,','  mr_incredible,                     // One fighter: veteran + timed prime form'))
edit('skins.js',lambda s:after(after(s,"import { SYNDROME_SKINS }","import { MR_SKINS } from './mrIncredibleSkins.js'"),'  syndrome: SYNDROME_SKINS,','  mr_incredible: MR_SKINS,'))
edit('kits.js',lambda s:after(after(s,"import { SYNDROME_KIT }","import { MR_KIT } from './mrIncredibleKit.js'"),'  syndrome: SYNDROME_KIT,','  mr_incredible: MR_KIT,'))
edit('spritesheets.js',lambda s:after(s,"  syndrome: { actions:","  mr_incredible: { actions: { idle: './assets/mr_incredible/default/veteran/idle.png' } },"))
def combat(s):
 s=after(s,"import { syndromeHitbox", "import { mrHitbox, mrHit } from './mrIncredibleState.js'")
 s=after(s,"  if (a?.sy &&", "  if (a?.mr && fighter.rosterKey === 'mr_incredible') return mrHitbox(fighter)")
 s=after(s,'    if (!flawless) syndromeBlock(', '    if (!flawless) mrHit(attacker, defender, atk, true)')
 s=after(s,'    syndromeHit(attacker, defender, atk,', '    mrHit(attacker, defender, atk, false)')
 return s
edit('combat.js',combat)
def game(s):
 if "from './mrIncredibleState.js'" in s:return s # installed hooks; never duplicate lifecycle cleanup
 s=after(s,"import { syndromeHarnessApi }", "import { isMr, mrTick, mrCommand, clearMr, mrLocked } from './mrIncredibleState.js'\nimport { mrVisual } from './mrIncredibleSkins.js'\nimport { drawMrHud } from './mrIncredibleFx.js'\nimport { mrHarness } from './mrIncredibleHarness.js'")
 # Tick before movement, so expiry bonuses end before this tick's movement integration.
 s=after(s,'function updateMovementInput(fighter) {',"  if (isMr(fighter)) { mrTick(fighter,getOpponent(fighter),readRawControls(fighter)||{},SYNDROME_WORLD); mrVisual(fighter) }")
 s=s.replace('if (krybotLocked(fighter) || spdBlueLocked','if (mrLocked(fighter,readRawControls(fighter)) || krybotLocked(fighter) || spdBlueLocked')
 s=after(s,'  const inputState = getFighterInput(fighter)\n  if (isKrybot', '') if False else s
 marker="  if (isMr(fighter)) { mrCommand(fighter); updateCombat(fighter,getOpponent(fighter),{},opts); return }"
 if marker not in s:
  anchor="  if (isSyndrome(fighter)) {   // Syndrome command layer: 'consumed' | 'grab'"
  s=s.replace(anchor,marker+'\n'+anchor)
 marker="  if (isMr(fighter)) { mrCommand(fighter); ctrlState={} }"
 s=after(s,"  if (isSyndrome(fighter)) { const mc=",marker)
 s=after(s,'  if (isSyndrome(f)) snap.push(',"  if (isMr(f)) snap.push(JSON.stringify([f._mrIncredible || null, f.currentAttack || null, f._grabThrowDmg || 0]))")
 # lifecycle: all existing Syndrome cleanup sites are existing round/scene/KO paths.
 lines=s.splitlines();out=[]
 for line in lines:
  out.append(line)
  if 'for (const _f of [p1, p2]) if (_f) clearSyndrome' in line:out.append('  for (const _f of [p1,p2]) { clearMr(_f); mrVisual(_f) }')
  elif line.strip()=='clearSyndrome(f,SYNDROME_WORLD)':out.append('    clearMr(f); mrVisual(f)')
  elif 'clearBatman(p1);clearBatman(p2)' in line:
   if 'if (_roundOver)' in line:out[-1]=line.rsplit('}',1)[0]+';clearMr(p1);clearMr(p2);mrVisual(p1);mrVisual(p2) }'
   else:out.append('  clearMr(p1);clearMr(p2);mrVisual(p1);mrVisual(p2)')
 s='\n'.join(out)+'\n'
 s=after(s,'  drawSyndromeHud(ctx, canvas, p1, p2)', '  drawMrHud(ctx, canvas, p1, p2)')
 s=after(s,'    syndromeTest: syndromeHarnessApi(',"    mrIncredibleTest: mrHarness({p1:()=>p1,p2:()=>p2,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),")
 # applySkin may be called during training: refresh visual without changing sim form.
 s=after(s,'  fighter.skinId = skinId', '  mrVisual(fighter) // cosmetic selection preserves veteran / prime')
 return s
edit('game.js',game)
def sprite(s):
 s=after(s,'  if (fighter._forceAction) return fighter._forceAction;',"  if (fighter.rosterKey === 'mr_incredible') {\n    if (!(fighter.hitstun > 0) && !fighter.knockdownState && !fighter.isGrabbed) {\n      if (fighter._mrIncredible?.entry > 0) return 'miTransform';\n      if (fighter._mrIncredible?.grabPose > 0) return 'miLift';\n      if (fighter.attacking && fighter.currentAttack?.mr) return fighter.currentAttack.name === 'miGrab' ? 'grab' : fighter.currentAttack.name;\n      if (fighter._mrIncredible?.land > 0 && Math.abs(fighter.vx || 0) < 1) return 'land';\n    }\n  }")
 return s
edit('sprite.js',sprite)
def physics(s):
 old='const speed = clamp(4.5 + (rawSpeed - 78) / 20 * 5, 4.5, 9.5)'
 new='const speed = (fighter.rosterKey === "mr_incredible" && fighter._mrIncredible?.remaining > 0 ? (fighter.onGround ? 1.15 : 1.10) : 1) * clamp(4.5 + (rawSpeed - 78) / 20 * 5, 4.5, 9.5)'
 if new not in s:assert old in s;s=s.replace(old,new)
 return s
edit('physics.js',physics)
def abilities(s):
 for name in ['doEnergyCharge','regenEnergy']:
  s=after(s,f'export function {name}(fighter) {{',"  if (fighter?.rosterKey === 'mr_incredible' && fighter._mrIncredible?.remaining > 0) return // no ultimate farming during prime" if name=='doEnergyCharge' else "  if (fighter?.rosterKey === 'mr_incredible' && fighter._mrIncredible?.remaining > 0) return // prime uses its finite special reserve")
 return s
edit('abilities.js',abilities)
