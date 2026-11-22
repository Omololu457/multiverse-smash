import {
  COATING_TICKS, FORM_TICKS, SHOT_TICKS, KEVIN_MOVES, KEVIN_RUSH,
  MATERIALS, OPPONENT_SURFACES, SAMPLE_IDS, SHOT_FAMILIES
} from './kevinData.js'
import { startMove, resolveGrab, cancelWindowOpen, applyScaledDamage } from './combat.js'
import { INPUT_BUFFER_FRAMES } from './input.js'

export const isKevin = f => f?.rosterKey === 'kevin_levin'
const grounded = f => !!(f.onGround ?? f.grounded)
const feet = f => f.y+f.h
const center = f => f.x+f.w/2
const busy = f => f.health<=0 || f.hitstop>0 || f.hitstun>0 || f.blockstun>0 ||
  f.isGrabbed || f.knockdownState || f.domainFrozen || f.domainUntouchable || f.eliminated
const elapsed = a => a.total-a.timer
const latched = (a,k) => a?.kevin?.key === k
const active = a => a && elapsed(a)>=a.activeStart && elapsed(a)<=a.activeEnd
const offense = f => Math.max(f.attackMultiplier || 1,f.damageMultiplier || 1)

export function kevinState(f) {
  return f._kevin ||= {
    tick:0, selected:0, material:null, coatUntil:0, formUntil:0, reverting:false,
    stored:null, catchUntil:0, prev:{}, edges:{}, chord:false, airSpent:false,
    grabUntil:0, serial:0, intake:null, dissolved:0, riposte:false, cinematic:null
  }
}
export const kevinForm = f => isKevin(f) && (f._kevin?.formUntil>0 || f.currentAttack?.kevin?.form==='ultimate' || !!f._kevin?.cinematic)
export function clearKevin(f, world) {
  if (!isKevin(f)) return
  if (f.health<=0 && kevinForm(f)) f._kevinDefeat=true
  if (f.health>0) delete f._kevinDefeat
  if (f._kevin?.cinematic) endCash(f,world,false)
  if (f._kevin?.grabTarget && world) {
    const target=world.fighters().find(p=>p?.side===f._kevin.grabTarget)
    if (target?._kevinGrabOwner===f.side) {
      target.isGrabbed=false
      target.grabTimer=0
      delete target._kevinGrabOwner
    }
  }
  if (world?.projectiles) {
    for (let i=world.projectiles.length-1;i>=0;i--) {
      const p=world.projectiles[i]
      if (p.owner===f && p.kevinShot) world.projectiles.splice(i,1)
    }
  }
  if (f.currentAttack?.kevin) endAttack(f)
  delete f._kevin
  delete f._kevinInjectedRaw
  delete f._grabThrowDmg
}

function endAttack(f) {
  f.attacking=false
  f.currentAttack=null
  f.currentMove=null
}
function applyMaterial(s,material) {
  if (!MATERIALS[material]) return
  s.material=material
  s.coatUntil=s.tick+COATING_TICKS
}

// All arena floors receive the same three match props when Kevin participates.
// Data describes only sampling volumes. They neither collide nor deal damage.
export function kevinContacts(width, floor) {
  const middle=width/2
  const gap=Math.min(360,width*.24)
  return [
    {material:'steel',x:middle-gap,y:floor},
    {material:'stone',x:middle,y:floor},
    {material:'alloy',x:middle+gap,y:floor}
  ]
}
function fieldSource(f,world) {
  if (!grounded(f)) return null
  for (const prop of kevinContacts(world.stageWidth(),world.floor())) {
    if (Math.abs(feet(f)-prop.y)<=12 && Math.abs(center(f)-prop.x)<=68) return prop.material
  }
  return null
}
function canGrab(f,target,dir) {
  return target && target.health>0 && !target.eliminated && !target.isGrabbed && !target.knockdownState &&
    !target.domainUntouchable && !target.invulnTimer &&
    Math.abs(feet(f)-feet(target))<=35 && (center(target)-center(f))*dir>=-6
}
function begin(f,key,options={}) {
  const s=kevinState(f)
  const form=s.formUntil>0 || key==='kRevert' || key==='kCash' ? 'ultimate' : 'human'
  const m=KEVIN_MOVES[form][key]
  if (!m || busy(f) || (m.cost || 0)>f.energy || (m.airAction && s.airSpent)) return false
  if (key==='kMine' && s.tick<s.catchUntil) return false
  if (m.isSpecial && key!=='kTransform' && key!=='kRevert' && (f.disabledSpecials || []).includes('special')) return false
  if (key==='kTransform' && (f.energy<100 || (f.disabledSpecials || []).includes('ultimate'))) return false
  if (options.cancel) { endAttack(f);f.attackCooldown=0 }
  if (!startMove(f,key,{...m,damage:options.damage ?? m.damage})) return false

  const material=s.material
  const a=f.currentAttack
  a.kevin={key,form,material,serial:++s.serial,dir:f.facing || 1,clean:false,
    applied:false,emitted:0,armorSpent:false,charge:null,sample:options.sample || null}
  a.hasHit=!!m.noBody
  if (key==='kReturn' || key==='kThunder') { a.kevin.charge=s.stored;s.stored=null }
  if (key==='kMine') s.catchUntil=s.tick+64
  if (key==='kTransform') f.energy-=100
  if (m.airAction) s.airSpent=true
  f.currentMove=key
  f.energy-=m.cost || 0
  f.isBlocking=false
  f.isCharging=false
  if (grounded(f)) f.vx=0
  return true
}
export function kevinCapture(f,p,box) {
  const s=f?._kevin, a=f?.currentAttack
  if (!isKevin(f) || !s || busy(f) || s.stored || !latched(a,'kMine') || !active(a)) return false
  const capture=p.kevinCapture
  if (!SHOT_FAMILIES[capture?.family] || !Number.isFinite(capture.raw) || !p.owner ||
      p.isUltimate || p.boomerang || p.returning || p.persist || p.piercesMulti || p.radial ||
      p._gunbaiReflected || p._portalReflected || p.kevinShot) return false
  const dir=a.kevin.dir
  const hand=kevinHand(f,dir)
  if (p.vx*dir>=-1 || (p.x-center(f))*dir<16) return false
  const reach=18
  if (box.x>hand.x+reach || box.x+box.w<hand.x-reach ||
      box.y>hand.y+reach || box.y+box.h<hand.y-reach) return false
  s.stored={family:capture.family,raw:Math.max(1,Math.min(180,capture.raw)),until:s.tick+SHOT_TICKS}
  s.intake={family:capture.family,x:p.x,y:p.y,at:s.tick}
  return true
}
export function kevinHand(f, dir=f.facing || 1) {
  return {x:center(f)+dir*(kevinForm(f)?48:32),y:feet(f)-(kevinForm(f)?92:69)}
}
export function kevinGuardChip(f, p, damage) {
  if (!isKevin(f) || kevInUltimate(f) || f._kevin?.material!=='armor' ||
    !p.kevinCapture || p.kevinCapture.raw>110 || p.isUltimate ||
    p.vx*(f.facing||1)>=0 || (p.x-center(f))*(f.facing||1)<0) return damage
  return damage*.5
}
const kevInUltimate = f => f._kevin?.formUntil>0

export function kevinArmor(f, attack, projectile=false) {
  const a=f?.currentAttack, k=a?.kevin
  if (!isKevin(f) || !k || k.form!=='human' || k.armorSpent || f._kevin?.material!==k.material ||
      attack.isUltimate || attack.launcher || attack.spike || attack.unblockable || attack.guardBreak) return false
  const t=elapsed(a)
  const qualifies=projectile ? !!attack.kevinCapture && attack.kevinCapture.raw<80 :
    !attack.isSpecial && attack.category==='light' && attack.damage<80
  if (!qualifies) return false
  const ram=k.key==='kSteel' && t>=5 && t<=a.activeEnd
  const stone=k.material==='stone' && grounded(f) && ['heavy','kStone','kReach','kSweep'].includes(k.key) &&
    t>=5 && t<=a.activeEnd
  if (!ram && !stone) return false
  k.armorSpent=true
  return true
}
export function kevinCounter(f,attacker) {
  const a=f?.currentAttack, incoming=attacker?.currentAttack
  if (!isKevin(f) || !latched(a,'kCounter') || !active(a) || incoming?.isUltimate ||
      incoming?.unblockable || incoming?.launcher || f._kevin.riposte ||
      (center(attacker)-center(f))*a.kevin.dir<0) return false
  f._kevin.riposte=true
  incoming.hasHit=true
  return true
}
export function kevinBox(f) {
  const a=f.currentAttack, k=a.kevin, m=KEVIN_MOVES[k.form][k.key]
  if (m.noBody) return {x:0,y:0,w:0,h:0}
  const range=a.rangeX, y=feet(f), dir=k.dir, x=center(f), back=14
  const high=m.beam?104:a.launcher?162:m.low?34:k.form==='ultimate'?109:98
  const depth=m.beam?58:a.launcher?151:m.low?42:k.key==='kFurnace'?168:m.dive?116:88
  return {x:dir>0?x-back:x-range,y:y-high,w:range+back,h:depth}
}
export function kevinBlock(f,d,a) {
  if (!isKevin(f) || !a.kevin) return
  const k=a.kevin
  k.clean=false
  if (k.material==='taydenite' && k.form==='human' && f._kevin?.material==='taydenite' &&
      KEVIN_MOVES.human[k.key].cut) d.blockstun=Math.max(d.blockstun || 0,k.key==='kCrystal'?24:21)
}
export function kevinHit(f,d,a,armored,cashDamage) {
  if (!isKevin(f) || !a.kevin || armored || d.health<=0) return
  const s=kevinState(f), k=a.kevin
  k.clean=true
  if (k.key==='kRubber' && !s.airSpent && grounded(f)) {
    s.airSpent=true
    f.vx=-k.dir*2
    f.vy=-12
    f.onGround=f.grounded=false
  }
  if (k.key==='kSweep' && grounded(d) && !d.knockdownState) {
    d.knockdownState=true
    d.knockdownTimer=26
    d.invulnTimer=Math.max(d.invulnTimer || 0,26)
  }
  if (k.key==='kCash' && cashDamage!=null) {
    s.cinematic={target:d.side,t:0,damage:cashDamage,x:center(d),y:d.y,feet:feet(d),vy:d.vy,vx:d.vx,onGround:d.onGround,
      grounded:d.grounded,hitstun:d.hitstun,dir:k.dir}
    d.vx=d.vy=f.vx=f.vy=0
  }
}

const inputKeys=['light','heavy','upAttack','special','ultimate','grab']
function readEdges(f,s,raw) {
  for (const key of Object.keys(s.edges)) {
    if (s.tick-s.edges[key].tick>INPUT_BUFFER_FRAMES) delete s.edges[key]
  }
  const chord=!!(raw.charge && raw.special)
  const dir={
    tick:s.tick, up:!!raw.up, down:!!raw.down,
    fwd:!!(f.facing===-1?raw.left:raw.right), back:!!(f.facing===-1?raw.right:raw.left)
  }
  if (chord && !s.chord && !s.prev.special) s.edges.cycle=dir
  if (chord) delete s.edges.special
  s.chord=chord || (s.chord && !!(raw.special || raw.charge))
  for (const key of inputKeys) {
    if (raw[key] && !s.prev[key] && (key!=='special' || !s.chord)) s.edges[key]=dir
    s.prev[key]=!!raw[key]
  }
  if (raw.grab && s.edges.grab?.tick===s.tick) f.grabInputBuffer=6
  if (!raw.jump) f.jumpHeld=false
}
function moveProjectile(f,a,m,world) {
  const k=a.kevin, t=elapsed(a), kind=m.shot
  if (t<a.activeStart || k.emitted >= (kind==='shards'?3:1) || t<a.activeStart+k.emitted*5) return
  const count=k.emitted++
  const hand=kevinHand(f,k.dir)
  const base={spawnX:hand.x,spawnY:hand.y,vx:k.dir*16,vy:0,isSpecial:true,lifetime:62,hitstun:21}
  let raw, data, visual
  if (kind==='return') {
    const family=SHOT_FAMILIES[k.charge.family]
    raw=Math.max(60,Math.min(160,Math.round(k.charge.raw*1.1)))
    data={vx:k.dir*family.speed,w:family.radius*2,color:family.color}
    visual=k.charge.family
  } else if (kind==='shards') {
    raw=54
    data={w:26,vx:k.dir*(16+count),vy:(count-1)*.5,lifetime:46,color:'#b6ffeb'}
    visual='fxShard'
  } else {
    raw=135
    data={spawnX:center(f)+k.dir*42,spawnY:feet(f)-95,w:51,vx:k.dir*13,vy:1.1,
      knockbackX:9,knockbackY:-4,lifetime:58,color:'#dbbb83'}
    visual='fxBoulder'
  }
  const p=world.spawn(f,a.name,{...base,...data,damage:raw*offense(f)})
  if (p) {
    p.kevinShot={kind:visual,serial:k.serial,index:count,dir:k.dir}
    p.noTrail=true
  }
}

export function kevinTick(f,target,raw,world) {
  if (f.health<=0) { clearKevin(f,world);return }
  const s=kevinState(f)
  ++s.tick
  readEdges(f,s,raw)
  if (f.isGrabbed && f.currentAttack?.kevin) endAttack(f)
  if (grounded(f)) s.airSpent=false
  if (s.stored && s.tick>=s.stored.until) s.stored=null
  if (s.material && s.tick>=s.coatUntil) {
    s.dissolved=s.tick+16
    s.dissolvedMaterial=s.material
    s.material=null
  }
  if (s.formUntil && s.tick>=s.formUntil) { s.formUntil=0;s.reverting=true }
  if (busy(f)) return
  const a=f.attacking?f.currentAttack:null
  if (!a?.kevin) return
  const k=a.kevin, m=KEVIN_MOVES[k.form][k.key], t=elapsed(a)
  if (m.travel && !k.clean && t>=m.travel[0] && t<m.travel[1]) {
    const [, , speed]=m.travel
    const left=world.stageLeft()
    const right=world.stageRight()-f.w
    const gap=target?(center(target)-center(f))*k.dir:Infinity
    const step=gap>=0?Math.min(speed,Math.max(0,gap-(target?Math.min(42,(f.w+target.w)/2):0))):speed
    f.x=Math.max(left,Math.min(right,f.x+k.dir*step))
    f.vx=0
  }
  if (k.key==='air' && s.airSpent && !grounded(f) && t<=a.activeStart && t>0) {
    f.vx=k.dir*4
  }
  if (m.dive && t>=(m.diveAt ?? a.activeStart) && !grounded(f)) f.vy=Math.max(f.vy,15)
  if (m.shot) moveProjectile(f,a,m,world)
  if (t<a.activeStart || k.applied) return
  k.applied=true
  if (k.key==='kTransform') {
    s.material=null;s.coatUntil=0;s.formUntil=s.tick+FORM_TICKS
  } else if (k.key==='kApply') applyMaterial(s,k.sample)
  else if (k.key==='kField' || k.key==='kCarSample') applyMaterial(s,fieldSource(f,world))
  else if (k.key==='kRevert') s.reverting=false
  else if (m.throwDamage && canGrab(f,target,k.dir) && resolveGrab(f,target,{},73)) {
    s.grabUntil=s.tick+28
    s.grabTarget=target.side
    target._kevinGrabOwner=f.side
    f._grabThrowDmg=m.throwDamage*offense(f)/Math.max(.5,target.defenseMultiplier || 1)
    if (k.form==='human') {
      const surface=isKevin(target) && !kevinForm(target)?target._kevin?.material:OPPONENT_SURFACES[target.rosterKey]
      applyMaterial(s,surface)
    }
  }
}

export function kevinLocked(f) {
  if (!isKevin(f)) return false
  const s=f._kevin, a=f.currentAttack
  return !!(s && s.grabUntil>s.tick) || (!!f.attacking && !(a?.launcher && a.kevin?.clean)) || !!s?.edges.cycle
}

export function kevinCommand(f, target, world) {
  if (busy(f)) return
  const s=kevinState(f), e=s.edges, a=f.attacking?f.currentAttack:null, g=grounded(f)
  if (s.grabUntil>s.tick) return
  const fire=(key,options)=> {
    if (begin(f,key,options)) s.edges={}
  }
  if (!a && !s.reverting && f._aiControlled && !e.ultimate && !f.attackCooldown && g && target) {
    const dir=f.facing || 1, hand=kevinHand(f,dir)
    const soon=world.projectiles.some(p=>{
      const speed=-p.vx*dir, distance=(p.x-hand.x)*dir
      return p.owner===target && p.kevinCapture && speed>0 && distance/speed>=5 &&
        distance/speed<=11 && Math.abs(p.y-hand.y)<23
    })
    if (soon && !s.stored && s.tick>=s.catchUntil) e.special={tick:s.tick}
    else if (!s.stored && e.special && !s.formUntil) {
      if (!s.material && f.energy>=8 && Math.abs(center(target)-center(f))>170) e.special.down=true
      else e.special.fwd=true
    }
  }
  if (s.riposte && latched(a,'kCounter')) {
    s.riposte=false
    fire('kRiposte',{cancel:true})
    return
  }
  if (!latched(a,'kCounter')) s.riposte=false
  if (a) {
    if (!a.kevin?.clean || !cancelWindowOpen(f) || elapsed(a)-a.activeEnd>10) return
    if (s.formUntil===0 && a.kevin.form==='ultimate') return
    if (e.light && a.name==='light') fire('kLight2',{cancel:true})
    else if (e.light && a.name==='kLight2') fire('kLight3',{cancel:true})
    else if (g && (e.upAttack || e.heavy?.up) && a.name==='kAlloy') fire('up',{cancel:true})
    else if (!g && e.light && a.name==='kRubber') fire('air',{cancel:true})
    else if (!g && e.heavy && a.name==='air') fire('down_air',{cancel:true})
    else if (g && e.heavy && a.name==='kSteel' && a.kevin.armorSpent) fire('heavy',{cancel:true})
    return
  }
  if (f.attackCooldown>0) return
  if (s.reverting) { fire('kRevert');return }
  const ult=s.formUntil>0
  if (e.cycle) {
    if (!ult && g) s.selected=(s.selected+1)%SAMPLE_IDS.length
    s.edges={}
    return
  }
  if (e.ultimate) {
    if (ult) {
      if (g) {
        const time=s.formUntil-s.tick
        if (begin(f,'kCash',{damage:Math.round(180+180*time/FORM_TICKS)})) {
          s.formUntil=0;s.reverting=true;s.edges={}
        }
      }
    } else fire('kTransform')
    return
  }
  if (e.grab && g) { fire('kGrab');return }
  if (e.special) {
    const q=e.special, directional=q.up || q.down || q.fwd || q.back
    if (!directional) fire(s.stored?'kReturn':'kMine')
    else if (!g) {
      if (ult || q.fwd) fire(ult?'kFurnace':'kAirRush')
    } else if (ult) fire(q.up?'kHalo':q.down?'kShards':q.fwd?'kArc':'kCounter')
    else if (q.up) fire('kQuarry')
    else if (q.down) fire('kApply',{sample:SAMPLE_IDS[s.selected]})
    else if (q.fwd) fire(KEVIN_RUSH[s.material] || 'kRush')
    else {
      const sample=fieldSource(f,world)
      fire(sample==='alloy'?'kCarSample':'kField',{sample})
    }
    return
  }
  if (!g) {
    if (e.heavy) fire('down_air')
    else if (e.light) fire('air')
  } else if (e.heavy || e.upAttack) {
    const q=e.heavy || e.upAttack
    fire(q.up || (!e.heavy && e.upAttack)?'up':q.down?'kSweep':q.fwd?'kReach':q.back && s.stored?'kThunder':'heavy')
  } else if (e.light) fire('light')
}

// The world driver uses the same freeze, camera advance and round-reset paths as
// the other character cinematics. The opener resolves damage exactly once.
export function kevinCashOwner(fighters) {
  return fighters.find(f=>isKevin(f) && f._kevin?.cinematic)
}
function endCash(f, world, landed) {
  const s=f._kevin, c=s.cinematic
  const t=world?.fighters().find(p=>p?.side===c.target)
  if (t) {
    t.y=c.y;t.onGround=c.onGround;t.grounded=c.grounded
    t.vx=landed?c.dir*7:c.vx;t.vy=landed?-5:c.vy
    t.hitstun=landed?Math.max(c.hitstun,20):c.hitstun
  }
  s.cinematic=null
  endAttack(f)
  f.attackCooldown=landed?12:0
}
export function updateKevinCash(f,world,camera) {
  const c=f._kevin.cinematic, t=world.fighters().find(p=>p?.side===c.target)
  if (!t || t.eliminated || f.health<=0) {endCash(f,world,false);return}
  const n=++c.t
  if (n>=50) { endCash(f,world,true);return }
  // Vertical-only cinematic offset. The recorded collision position is restored.
  t.y=Math.max(0,c.y-(n<=21?Math.min(1,n/21):Math.max(0,1-(n-21)/20))*84)
  if (n===41) {
    applyScaledDamage(t,c.damage,{scale:1,source:'ultimate',tier:'big',
      attacker:f,move:'kCash',defenseApplied:true,offenseApplied:true})
    camera?.shake?.(10,13)
    t.colorFlash=8
  }
  if (camera) {
    camera.targetX=(center(f)+center(t))/2
    camera.targetY=(feet(f)+t.y)/2
    camera.targetZoom=1.32
  }
}

export function kevinDebris(p) {
  if (p.kevinShot?.kind!=='fxBoulder' || !p.owner?._kevin) return
  const state=p.owner._kevin
  state.debris={x:p.x,y:p.y,dir:p.kevinShot.dir,at:state.tick}
}
