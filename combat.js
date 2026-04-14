/**
 * COMBAT ENGINE — hitstop scaling, grab/throw, parry, super armor,
 * chip damage, clash, wall bounce flag, damage number emission.
 * + SECOND ENGINE (combined below)
 */

import { physics } from "./physics.js"
import { performUltimate } from "./abilities.js"
import { sound, SFX } from "./sound.js"

// ========================
// HITSTOP TABLES
// ========================

const HITSTOP = {
  light:4,air:4,grab:6,heavy:8,launcher:8,spike:8,
  special:12,ultimate:20,parry:14,clash:14,default:4
}

// ========================
// HELPERS (MERGED)
// ========================

function _catFromName(n){
  n=(n||"").toLowerCase()
  if(n==="light"||n==="air") return "light"
  if(n==="heavy") return "heavy"
  if(n==="up"||n.includes("launch")) return "launcher"
  if(n==="down_air"||n.includes("spike")) return "spike"
  if(n==="grab") return "grab"
  return "light"
}

export function getHitstopFrames(atk){
  if(!atk) return HITSTOP.default
  if(atk.isUltimate) return HITSTOP.ultimate
  if(atk.isSpecial) return HITSTOP.special

  const c = atk.category || _catFromName(atk.name)
  return HITSTOP[c] ?? HITSTOP.default
}

export function getSparkCategory(atk){
  if(!atk) return "light"
  if(atk.isUltimate) return "ultimate"
  if(atk.isSpecial) return "special"

  const c = atk.category || _catFromName(atk.name)
  if(c==="heavy"||c==="launcher"||c==="spike") return "heavy"
  return "light"
}

function _hitSound(atk,blocking){
  if(blocking) return SFX?.BLOCK||"block"
  if(!atk) return SFX?.HIT_LIGHT||"hit_light"
  if(atk.isUltimate) return SFX?.HIT_ULTIMATE||"hit_ultimate"
  if(atk.isSpecial) return SFX?.HIT_SPECIAL||"hit_special"

  const c = atk.category||_catFromName(atk.name)
  if(c==="heavy"||c==="launcher"||c==="spike") return SFX?.HIT_HEAVY||"hit_heavy"
  return SFX?.HIT_LIGHT||"hit_light"
}

function _dur(base,f){ return Math.max(8,Math.floor(base/(f?.attackSpeedMultiplier||1))) }

// ========================
// STATE INIT
// ========================

export function ensureCombatState(f){
  if(!f) return
  const D={
    attacking:false,currentMove:null,currentMoveData:null,currentAttack:null,
    moveTimer:0,movePhase:"idle",hasHitThisMove:false,attackCooldown:0,
    hitstun:0,blockstun:0,hitstop:0,isGrabbed:false,invulnTimer:0,
    comboCounter:0,comboTimer:0,airHits:0,maxAirHits:3,colorFlash:0,
    attackMultiplier:1,damageMultiplier:1,defenseMultiplier:1,
    energy:0,maxEnergy:100,wasInStartup:false,
    grabTimer:0,grabInputBuffer:0,knockdownState:false,knockdownTimer:0,
    techRoll:null,wallBounce:false,parryFlash:0,armorFlash:0,clashFlash:0,
    _parryInputBuffer:0
  }
  for(const k in D){ if(f[k]==null) f[k]=D[k] }
}

// ========================
// COMBO SCALE
// ========================

export function getComboScale(f){
  if(!f||f.comboCounter<=1) return 1
  const s=[1,0.92,0.84,0.76,0.70,0.65]
  return s[Math.min(f.comboCounter-1,s.length-1)]
}

// ========================
// ATTACK PHASE
// ========================

export function attackIsActive(a){
  if(!a) return false
  const e=a.total-a.timer
  return e>=a.activeStart && e<=a.activeEnd
}

export function getAttackPhase(f){
  if(!f?.currentAttack) return "idle"
  const a=f.currentAttack,e=a.total-a.timer
  if(e<a.activeStart) return "startup"
  if(e<=a.activeEnd) return "active"
  return "recovery"
}

// ========================
// HITBOX / HURTBOX
// ========================

export function getAttackHitbox(f){
  const a=f?.currentAttack
  if(!f||!a) return null
  const w=a.rangeX||50,h=a.rangeY||40
  const x=f.facing===1?f.x+f.w:f.x-w
  let y=f.y+20
  if(a.name==="up") y=f.y-30
  if(a.name==="down_air") y=f.y+30
  return {x,y,w,h}
}

export function getHurtbox(f){
  if(!f) return null
  return {
    x:f.x+6,
    y:f.y+6,
    w:Math.max(1,f.w-12),
    h:Math.max(1,f.h-6)
  }
}

export function rectsOverlap(a,b){
  return !!a&&!!b&&
    a.x<b.x+b.w&&
    a.x+a.w>b.x&&
    a.y<b.y+b.h&&
    a.y+a.h>b.y
}

// ========================
// SPECIAL TRAITS
// ========================

export function shouldGojoAutoDodge(d){
  if(!d?.currentFormData?.autoDodge) return false
  const c=d.currentFormData.autoDodgeKiCost||5
  if((d.energy||0)<c) return false
  d.energy-=c
  d.teleportFlash=8
  return true
}

export function applyUltraEgoReaction(d){
  if(!d?.currentFormData?.rageHealOnHit) return
  const c=d.currentFormData.healCostPerHitKi||4
  if((d.energy||0)<c) return
  d.energy-=c
  d.health=Math.min(d.maxHealth||1000,d.health+d.currentFormData.rageHealOnHit)
}

// ========================
// MOVE START
// ========================

export function startMove(f,key,data){
  if(!f||!data) return false
  if(f.attacking||f.hitstun>0||f.attackCooldown>0) return false

  const st=data.startup||5,ac=data.active||4,rc=data.recovery||10
  const total=_dur(st+ac+rc,f)

  f.attacking=true
  f.currentAttack={
    name:key,
    category:data.category||_catFromName(key),
    damage:data.damage||40,
    total,
    timer:total,
    activeStart:st,
    activeEnd:st+ac,
    rangeX:data.rangeX||60,
    rangeY:data.rangeY||40,
    hitstun:data.hitstun||15,
    pushX:data.knockbackX||4,
    launchY:data.knockbackY??-2,
    launcher:key==="up",
    spike:key==="down_air",
    superArmor:!!data.superArmor,
    isSpecial:!!data.isSpecial,
    isUltimate:!!data.isUltimate,
    hasHit:false
  }

  f.wasInStartup=true
  return true
}

// ========================
// HIT RESOLUTION (MERGED)
// ========================

export function resolveAttackHit(attacker,defender,hitEffects=null){
  if(!attacker?.currentAttack||attacker.currentAttack.hasHit) return
  if(!attackIsActive(attacker.currentAttack)) return

  const hitbox=getAttackHitbox(attacker)
  const hurtbox=getHurtbox(defender)
  if(!rectsOverlap(hitbox,hurtbox)) return

  if(shouldGojoAutoDodge(defender)){
    attacker.currentAttack.hasHit=true
    sound?.play?.(SFX.BLOCK)
    return
  }

  const atk=attacker.currentAttack
  const isCounter=!!(defender.wasInStartup && getAttackPhase(defender)==="startup")

  let dmg=Math.floor(
    (atk.damage||40)*
    getComboScale(attacker)*
    (attacker.damageMultiplier||1)*
    (attacker.attackMultiplier||1)/
    Math.max(0.5,defender.defenseMultiplier||1)
  )

  if(isCounter){
    dmg=Math.floor(dmg*1.25)
    sound?.play?.(SFX.COUNTER_HIT)
  }

  if(defender.isBlocking){
    dmg=Math.floor(dmg*0.2)
    defender.blockstun=10
    sound?.play?.(SFX.BLOCK)
  } else {
    const hs=getHitstopFrames(atk)
    attacker.hitstop=hs
    defender.hitstop=hs

    defender.hitstun=Math.max(defender.hitstun||0,atk.hitstun||0)
    defender.vx=(attacker.facing||1)*(atk.pushX||4)

    if(atk.launcher){
      physics.launcherAttack(attacker,defender,atk.launchY??-12,-22)
    } else if(atk.spike){
      physics.downAirSpike(attacker,defender,30)
    } else {
      defender.vy=atk.launchY??-2
    }

    sound?.play?.(_hitSound(atk,false))
  }

  defender.health=Math.max(0,(defender.health||0)-dmg)
  defender.colorFlash=atk.isUltimate?12:atk.isSpecial?9:6

  attacker.currentAttack.hasHit=true
  attacker.comboCounter++
  attacker.comboTimer=90
  attacker.wasInStartup=false

  sound?.playCombo?.(attacker.comboCounter)

  if(defender.health<=0) sound?.play?.(SFX.KO)

  applyUltraEgoReaction(defender)

  if(Array.isArray(hitEffects)){
    hitEffects.push({
      x:hitbox.x+hitbox.w/2,
      y:hitbox.y+hitbox.h/2,
      timer:12,
      category:getSparkCategory(atk),
      damage:dmg
    })
  }
}

// ========================
// MAIN UPDATE
// ========================

export function updateCombat(f,o,controls={},options={}){
  if(!f||!o) return
  ensureCombatState(f)

  if(f.hitstop>0){ f.hitstop--; return }

  if(f.hitstun>0) f.hitstun--
  if(f.blockstun>0) f.blockstun--
  if(f.comboTimer>0) f.comboTimer--; else f.comboCounter=0
  if(f.attackCooldown>0) f.attackCooldown--

  f.wasInStartup=!!(
    f.attacking && f.currentAttack &&
    getAttackPhase(f)==="startup"
  )

  if(!f.attacking&&!f.hitstun){
    if(controls.upAttack) startMove(f,"up",{})
    else if(controls.grab) startMove(f,"grab",{})
    else if(controls.air) startMove(f,"air",{})
    else if(controls.downAir) startMove(f,"down_air",{})
    else if(controls.light) startMove(f,"light",{})
    else if(controls.heavy) startMove(f,"heavy",{})
  }

  if(f.attacking&&f.currentAttack){
    f.currentAttack.timer--

    if(getAttackPhase(f)==="active"){
      resolveAttackHit(f,o,options.hitEffects)
    }

    if(f.currentAttack.timer<=0){
      f.attacking=false
      f.currentAttack=null
      f.currentMove=null
      f.attackCooldown=10
    }
  }

  if((f.energy||0)<(f.maxEnergy||0)){
    f.energy+=0.1
  }
}

// ========================
// PROJECTILES
// ========================

export function updateProjectiles(projectiles=[],stageWidth=3200){
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i]
    if(!p){ projectiles.splice(i,1); continue }
    p.x+=p.vx||0
    p.y+=p.vy||0
    if(p.lifetime!=null) p.lifetime--

    if(
      p.x<-200||p.x>stageWidth+200||
      p.y<-400||p.y>2000||
      (p.lifetime!=null&&p.lifetime<=0)
    ){
      projectiles.splice(i,1)
    }
  }
}
