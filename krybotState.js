// Authoritative per-owner plain JSON. Helpers are scoped entities, never fake
// fighters: generic summons lack a one-HP interruptible aim/fire/exit behavior.
// Projectiles use the existing shared projectile lifecycle and collision pipeline.
import { KRYBOT_MOVES, krybot, krybotDmg } from './krybotData.js'
export const isKrybot = f => f?.rosterKey === 'krybot'
// Verified aim cell: forearm tip at (47,21.5), foot pivot (22,57), scale 2.2.
export const KRYBOT_MUZZLE = { x:56, height:78 }
export const KRYBOT_CROSSFIRE_SPACING = 160
export const krybotState = f => f._krybot ||= {clock:0,tick:0,prev:{},edges:{},used:{},cooldown:0,mark:null,helper:null,
  leapUsed:false,leaping:false,landing:0,super:null,serial:0,cues:[]}
const ground = f => !!(f.onGround || f.grounded)
const cx = f => f.x + (f.w || 60)/2
const feet = f => f.y + (f.h || 110)
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v))
const overlap = (a,b) => a && b && a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y
const targetId = f => [f.side, f.rosterKey]
const sameTarget = (id,f) => id && f && id[0] === f.side && id[1] === f.rosterKey && f.health > 0
export const ownKrybotShots = (f,W,kind) => (W?.projectiles || []).filter(p=>p.owner===f && p._krybot && (!kind || p._krybot.kind===kind))
export function clearKrybot(f,W) {
  if (!f) return
  if (W) for(let i=W.projectiles.length-1;i>=0;i--) if(W.projectiles[i].owner===f && W.projectiles[i]._krybot) W.projectiles.splice(i,1)
  delete f._krybot
  delete f._krybotRemoteInput
}
export function krybotRoundReset(f,W) {
  clearKrybot(f,W)
  if(isKrybot(f)) { f.baseSpeed=f.speed=krybot.stats.speed; f.dashSpeed=krybot.stats.dashSpeed }
}
export function krybotLocked(f) { return isKrybot(f) && (f._krybot?.landing>0 || f._krybot?.leaping || (f.attacking && !f.currentAttack?.launcher)) }
export function krybotCanStart(f,key,W) {
  const s=krybotState(f), md=KRYBOT_MOVES[key]
  if(!md || f.health<=0 || f.hitstun>0 || f.blockstun>0 || f.isGrabbed || f.knockdownState || s.landing>0 || s.leaping) return false
  if((f.energy||0)<(md.cost||0)) return false
  if(md.isUltimate && (f.ultimateCooldown>0 || (f.disabledSpecials||[]).includes('ultimate'))) return false
  if(md.isSpecial && ((f.disabledSpecials||[]).includes('special') || (f.disabledSpecials||[]).includes(key) || f._gaDisabled>0)) return false
  if(key==='kCover' && (s.cooldown>0 || s.helper || ownKrybotShots(f,W,'cover').length || s.super)) return false
  if(key==='kBlaster' && ownKrybotShots(f,W,'arm').length) return false
  if(key==='kLeap' && s.leapUsed) return false
  return true
}
export function startKrybotMove(f,key,startMove,W,cancel=false) {
  if(!isKrybot(f) || !krybotCanStart(f,key,W)) return false
  const md=KRYBOT_MOVES[key], s=krybotState(f)
  if(cancel) { f.attacking=false; f.currentAttack=null; f.currentMove=null; f.attackCooldown=0 }
  if(!startMove(f,key,md)) return false
  f.energy=Math.max(0,(f.energy||0)-(md.cost||0)); f.currentMove=key
  f.currentAttack.krybot={dir:f.facing||1,clean:false,fired:false,originX:f.x,...md}
  if(md.noBody) f.currentAttack.hasHit=true
  f.isBlocking=false; f.isCharging=false; f.vx=0
  if(key==='down_air') f.currentAttack.spike=false
  // An Up+Heavy held through impact must not auto-pursue. Release then press
  // Jump deliberately; the shared physics jump-cancel performs the follow-up.
  if(key==='up') f.jumpHeld=true
  if(key==='kCover') s.cooldown=480
  if(key==='kLeap') { s.leapUsed=true; s.leaping=true }
  if(key==='ultimate') {
    s.helper=null; s.super=null
    for(let i=W.projectiles.length-1;i>=0;i--) if(W.projectiles[i].owner===f && W.projectiles[i]._krybot) W.projectiles.splice(i,1)
  }
  s.cues.push(md.isUltimate?'blast':md.isSpecial?'whoosh':'punch')
  return true
}
export function krybotHitbox(f) {
  const a=f.currentAttack, md=a?.krybot
  if(!md || md.noBody) return null
  return {x:f.facing===1?f.x+f.w:f.x-a.rangeX,y:f.y+(md.boxY??24),w:a.rangeX,h:a.rangeY}
}
export function krybotBlockstun(f,d,a) { if(isKrybot(f) && a?.krybot) d.blockstun=a.krybot.blockstun }
// Crossfire's explicit no-damage-on-block rule. Ordinary Arm/Cover shots retain
// the engine's normal chip; this is not a damage/combo-scaling replacement.
export function krybotProjectileChip(p,chip) {
  return isKrybot(p?.owner) && ['opening','cross','finish'].includes(p._krybot?.kind) ? 0 : chip
}
export function krybotHit(f,d,a) {
  if(!isKrybot(f) || !a?.krybot) return
  a.krybot.clean=true; f._cmdHitLanded=true
  if(a.krybot.mark) krybotState(f).mark={target:targetId(d),left:60}
}
export function krybotProjectileHit(p,d) {
  const f=p.owner, m=p._krybot
  if(!isKrybot(f) || !m || d.isBlocking || !(d.health>0)) return
  const s=krybotState(f)
  if(m.kind==='cover' && s.mark?.left>0 && sameTarget(s.mark.target,d)) {
    d.vx += (p.vx<0?-1:1)*2; s.mark=null // pushback ONLY, no damage/stun/resource modifier
  }
  if(m.kind==='opening' && f.attacking && f.currentAttack?.name==='ultimate' && !s.super) {
    s.super={age:0,target:targetId(d),impactX:cx(d),impactY:d.y+d.h*.5,feet:feet(f),dir:f.facing||1}
    const a=f.currentAttack, more=Math.max(0,48-a.timer); a.total+=more; a.timer+=more
  }
}
function shot(f,W,kind,x,y,dir,damage,extra={}) {
  const p=W.spawn(f,'krybot_'+kind,{spawnX:x,spawnY:y,vx:dir*9,vy:0,w:10,h:10,radius:5,
    damage,hitstun:kind==='opening'?38:18,knockbackX:kind==='opening'?1:3,knockbackY:0,lifetime:52,
    sheet:'./assets/krybot/shot.png',spriteW:8,spriteH:8,spriteFrames:1,spriteScale:1.5,...extra})
  if(p) { p.damageType='energy'; p._krybot={kind,serial:++krybotState(f).serial}; p.isSpecial=kind!=='opening'; p.isUltimate=kind==='opening' || kind==='cross' || kind==='finish' }
  return p
}
function aimPoint(f) { const d=f.currentAttack?.krybot?.dir||f.facing||1; return [cx(f)+d*KRYBOT_MUZZLE.x,feet(f)-KRYBOT_MUZZLE.height,d] }
function tickHelper(f,opp,s,W) {
  const h=s.helper
  if(!h) return
  // Check live enemy hit geometry and projectiles before the firing beat. The
  // helper has no collision body and never soaks/removes a projectile.
  const box={x:h.x-22,y:h.feet-114,w:44,h:114}
  const foes=W.fighters?.() || [opp]
  for(const foe of foes) {
    if(!foe || foe===f || foe.health<=0 || (f.team!=null && foe.team===f.team)) continue
    if(foe.attacking && !foe.currentAttack?.hasHit && foe.currentAttack?.category!=='grab' && W.active(foe.currentAttack) && overlap(W.hitbox(foe),box)) { s.helper=null; return }
  }
  for(const p of W.projectiles) if(p.owner!==f && !p.visualOnly && !p._struck && !p.returning && (!p.hitDelay || (p.age||0)>=p.hitDelay) && (!p.owner || f.team==null || p.owner.team!==f.team) &&
    overlap({x:p.x-(p.radius||5),y:p.y-(p.radius||5),w:(p.radius||5)*2,h:(p.radius||5)*2},box)) { s.helper=null; return }
  h.age++
  if(h.age<=8) h.x=clamp(h.x+h.dir*6,24,W.stageWidth()-24)
  if(h.age===18 && !h.fired) { h.fired=true; shot(f,W,'cover',h.x+h.dir*KRYBOT_MUZZLE.x,h.feet-KRYBOT_MUZZLE.height,h.dir,krybotDmg(24)); s.cues.push('blast') }
  if(h.age>45) h.x=clamp(h.x-h.dir*4,24,W.stageWidth()-24)
  if(h.age>=70) s.helper=null
}
export function tickKrybot(f,opp,raw,W) {
  if(!isKrybot(f)) { if(f?._krybot) clearKrybot(f,W); return }
  const s=krybotState(f); s.tick++
  for(const k of ['light','heavy','special','ultimate','upAttack']) {
    const v=!!raw[k]
    if(v && !s.prev[k]) s.edges[k]={tick:s.tick,clock:s.clock,down:!!raw.down,up:!!raw.up,
      fwd:!!(f.facing===-1?raw.left:raw.right),back:!!(f.facing===-1?raw.right:raw.left)}
    s.prev[k]=v
  }
  if(f.health<=0 || !opp || opp.health<=0) { clearKrybot(f,W); return }
  // Entity lifetime, mark timeout and cooldown use actual simulation updates,
  // including the owner's hitstop. Input-buffer/attack clocks pause in hitstop.
  if(s.cooldown>0)s.cooldown--
  const liveTargets=W.fighters?.() || [opp]
  if(s.mark && (--s.mark.left<=0 || !liveTargets.some(t=>sameTarget(s.mark.target,t)))) s.mark=null
  if(f.hitstun>0 || f.isGrabbed || (s.super && (!f.attacking || f.currentAttack?.name!=='ultimate'))) {
    s.super=null
    for(let i=W.projectiles.length-1;i>=0;i--) if(W.projectiles[i].owner===f && ['opening','cross','finish'].includes(W.projectiles[i]._krybot?.kind)) W.projectiles.splice(i,1)
    if(f.hitstun>0 || f.isGrabbed) s.leaping=false
  }
  tickHelper(f,opp,s,W)
  if(f.hitstop>0) return
  s.clock++
  if(s.landing>0) { s.landing--; f.vx=0; f.isBlocking=false }
  if(ground(f) && !s.leaping) s.leapUsed=false
  if(s.leaping && ground(f) && s.leapAirborne) {
    s.leaping=false; s.leapAirborne=false; s.landing=18; f.vx=0
    if(f.currentAttack?.name==='kLeap') { f.attacking=false; f.currentAttack=null; f.currentMove=null; f.attackCooldown=18 }
  }
  if(s.leaping && !ground(f)) s.leapAirborne=true
  const a=f.attacking?f.currentAttack:null, md=a?.krybot, t=a?a.total-a.timer:-1
  if(md && !(f.hitstun>0) && !f.isGrabbed) {
    f.facing=md.dir
    if(md.travel && t>=md.travel[0] && t<md.travel[1]) {
      f.x=clamp(md.originX+md.dir*md.travel[2]*(t-md.travel[0]+1),0,W.stageWidth()-f.w)
      f.vx=0; f.facing=md.dir
    }
    else if(ground(f)) f.vx=0
    if(a.name==='kLeap') {
      if(t===6) { f.vy=-17; f.vx=0; f.onGround=false; f.grounded=false; f.jumpCount=Math.max(f.jumpCount||0,1); s.leapAirborne=true; s.leapX=f.x }
      if(t>=6) { f.vx=0; f.x=clamp(s.leapX+md.dir*Math.min(120,(t-6)*5),0,W.stageWidth()-f.w) }
    }
    if(t===a.activeStart-1 && !md.fired) {
      md.fired=true
      if(md.shot) { const [x,y,d]=aimPoint(f); shot(f,W,md.shot,x,y,d,a.damage); s.cues.push('blast') }
      if(a.name==='kCover') {
        s.helper={hp:1,age:0,dir:md.dir,x:clamp(cx(f)-md.dir*90,24,W.stageWidth()-24),feet:feet(f),fired:false}
      }
    }
  }
  if(s.super) {
    const c=s.super
    if(!liveTargets.some(t=>sameTarget(c.target,t))) { s.super=null; return }
    c.age++
    // Allies are scripted presentation participants. The bolts still have to
    // intersect the opponent; no target teleport/root, no invisible capture.
    if(c.age===8 || c.age===18) {
      const dir=c.age===8?c.dir:-c.dir
      const x=clamp(c.impactX-dir*KRYBOT_CROSSFIRE_SPACING,30,W.stageWidth()-30)
      shot(f,W,'cross',x+dir*KRYBOT_MUZZLE.x,c.feet-KRYBOT_MUZZLE.height,dir,krybotDmg(35),{vx:dir*12,lifetime:20,hitstun:24,knockbackX:1})
      s.cues.push('blast')
    }
    // The full explosion winds up from age 30. Damage begins with its largest
    // supplied cell (age 36), so a 36px collider never precedes visible blast art.
    if(c.age===36) {
      shot(f,W,'finish',c.impactX,c.impactY,c.dir,krybotDmg(100),{vx:0,lifetime:5,w:72,h:72,radius:36,hitstun:28,knockbackX:7,
        sheet:'./assets/krybot/cells/fx3.png',spriteW:64,spriteH:64,spriteFrames:1,spriteScale:1.6,spriteOnce:true})
      s.cues.push('explosion')
    }
    if(c.age>=42) s.super=null
  }
}
