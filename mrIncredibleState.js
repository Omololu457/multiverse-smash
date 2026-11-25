// Simulation state is plain JSON. No skin fields, wall clocks, renderer reads, or random draws.
import { MR_MOVES as M, MR_PRIME as P } from './mrIncredibleData.js'
import { startMove, resolveGrab, cancelWindowOpen } from './combat.js'
export const isMr=f=>f?.rosterKey==='mr_incredible'
export const mrState=f=>f._mrIncredible||=({tick:0,remaining:0,visual:'veteran',pending:0,entry:0,reserve:0,activated:-100,prev:{},edges:{},serial:0,riseUsed:false,wasGround:true,grabPose:0,land:0})
export const mrBoost=f=>isMr(f)&&(f._mrIncredible?.remaining||0)>0
const ground=f=>!!(f.onGround||f.grounded)
const illegal=f=>f.health<=0||f.hitstun>0||f.blockstun>0||f.hitstop>0||f.isGrabbed||f.knockdownState
function expire(f){const s=mrState(f);s.remaining=0;s.reserve=0;s.pending=1;s.entry=0;f.energy=0}
export function clearMr(f,other=null){if(!isMr(f))return;if(f._mrIncredible?.grabPose>0&&other?.isGrabbed){other.isGrabbed=false;other.grabTimer=0;other.hitstun=Math.min(other.hitstun||0,6)};delete f._mrIncredible;delete f._mrInjectedRaw;delete f._grabThrowDmg;delete f._mrLand;delete f._mrPose}
export function mrActivate(f){
 if(!isMr(f)||illegal(f)||f.attacking||f.attackCooldown>0)return false
 const s=mrState(f);if(s.pending||s.entry||s.remaining>0||f.energy<100)return false
 f.energy-=100;s.remaining=P.duration;s.visual='prime';s.entry=P.entry;s.activated=s.tick;s.reserve=P.specialReserve
 f.isBlocking=false;f.isCharging=false
 try{_primeHook?.(f)}catch(_){}   // mrIncredibleUlt.js: the BACK IN MY PRIME activation cinematic (presentation; the mode is unchanged)
 return true
}
// activation listener (set by mrIncredibleUlt.js — no import cycle): called once per successful activation, after the mode is applied
let _primeHook=null
export const setMrPrimeHook=fn=>{_primeHook=typeof fn==='function'?fn:null}
export function mrStart(f,key,{cancel=false}={}){
 if(!isMr(f)||illegal(f))return false
 const s=mrState(f),m=M[key],g=ground(f);if(!m||s.entry)return false
 if(['air','down_air'].includes(key)&&g)return false
 if(!g&&!['air','down_air','miRise','miSlam'].includes(key))return false
 if(key==='miRise'&&s.riseUsed)return false
 if(m.isSpecial&&(f.disabledSpecials||[]).includes('special'))return false
 const boosted=mrBoost(f),cost=m.cost||0,meter=boosted?s.reserve:f.energy
 if(meter<cost)return false
 const data={...m,damage:m.damage*(boosted?P.damage:1),recovery:boosted?Math.max(P.minRecovery,Math.ceil(m.recovery*P.recovery)):m.recovery}
 if(cancel){f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0}
 if(!startMove(f,key,data))return false
 if(boosted)s.reserve-=cost;else f.energy-=cost
 f.currentMove=key;f.currentAttack.mr={key,prime:boosted,serial:++s.serial,dir:f.facing||1,clean:false,blocked:false,contact:false,originX:f.x,recovery:data.recovery,raw:data.damage}
 f.currentAttack.hasHit=!!m.noBody;f.isBlocking=false;f.isCharging=false
 if(g)f.vx=0
 if(key==='miRise'){s.riseUsed=true;f.jumpHeld=true}
 if(key==='miSlam'&&g){f.vy=-12;f.onGround=f.grounded=false}
 return true
}
export function mrLocked(f,raw){if(!isMr(f))return false;const s=mrState(f);return !!(s.entry||s.grabPose||f.attacking&&!(f.currentAttack?.launcher&&f.currentAttack?.hasHit)||raw?.up&&raw?.special)}
export function mrTick(f,opp,raw={},W){
 if(!isMr(f))return
 const s=mrState(f);s.tick++;for(const k of Object.keys(s.edges))if(s.tick-s.edges[k].tick>8)delete s.edges[k]
 for(const k of ['light','heavy','upAttack','special','ultimate','grab'])if(raw[k]&&!s.prev[k])s.edges[k]={tick:s.tick,up:!!raw.up,down:!!raw.down,fwd:!!(f.facing===1?raw.right:raw.left),back:!!(f.facing===1?raw.left:raw.right)}
 s.prev={light:!!raw.light,heavy:!!raw.heavy,upAttack:!!raw.upAttack,special:!!raw.special,ultimate:!!raw.ultimate,grab:!!raw.grab}
 if(!raw.jump&&!raw.up)f.jumpHeld=false // release during hitstop still arms the next fresh jump
 if(f.health<=0){clearMr(f,opp);return}
 if(s.remaining>0){s.remaining--;f.energy=0;if(s.remaining===0)expire(f)}
 if(s.entry>0){s.entry--;if(illegal(f))s.entry=0}
 if(s.pending){
  const safe=!f.attacking&&!f.isGrabbed&&!s.grabPose&&!s.entry
  if(safe||s.pending>=P.visualFallback){s.visual='veteran';s.pending=0}else s.pending++
 }
 if(s.grabPose>0)s.grabPose--
 const g=ground(f)
 if(g&&!s.wasGround){s.riseUsed=false;s.land=8}
 if(s.land>0)s.land--
 s.wasGround=g
 if(f.hitstop>0)return // freeze committed travel/impulses with the shared attack clock
 const a=f.attacking?f.currentAttack:null,md=M[a?.mr?.key]
 if(!a?.mr||!md)return
 const t=a.total-a.timer
 if(md.travel&&t>=md.travel[0]&&t<md.travel[1]){
  const maxTravel=md.travel[2]*(md.travel[1]-md.travel[0]);const dir=a.mr.dir
  f.x=Math.max(0,Math.min((W?.stageWidth?.()||3200)-f.w,f.x+dir*Math.min(md.travel[2],Math.max(0,maxTravel-Math.abs(f.x-a.mr.originX)))));f.vx=0
 }
 if(md.rise&&t===6){f.vy=-19;f.onGround=f.grounded=false}
 if(md.dive&&t>=md.startup&&!g)f.vy=Math.max(f.vy,16)
 if(md.slam){
  if(t>=8&&!g)f.vy=Math.max(f.vy,16)
  // Contact opens once on landing; a bounded failed landing ends without a remote quake.
  if(!a.mr.contact&&g&&t>=md.startup){a.mr.contact=true;a.activeStart=t;a.activeEnd=t+2;a.timer=Math.max(1,3+a.mr.recovery);a.total=t+a.timer}
  if(!a.mr.contact)a.activeStart=a.total+1
 }
 if(md.grab&&t>=md.startup&&!a.mr.contact){
  a.mr.contact=true
  if(opp&&Math.abs((opp.y+opp.h)-(f.y+f.h))<=42&&opp.health>0&&!opp.isGrabbed&&!opp.knockdownState&&!(opp.invulnTimer>0)&&Math.abs((opp.x+opp.w/2)-(f.x+f.w/2))<=70&&((opp.x-f.x)*a.mr.dir)>=-10&&resolveGrab(f,opp,{},70)){
   f._grabThrowDmg=a.mr.raw*Math.max(f.damageMultiplier||1,f.attackMultiplier||1)/Math.max(.5,opp.defenseMultiplier||1)
   s.grabPose=28
  }
 }
}
export function mrCommand(f){
 if(!isMr(f))return false
 const s=mrState(f),e=s.edges,g=ground(f),a=f.attacking?f.currentAttack:null
 // Fresh R2 during prime discards remaining duration without touching the current attack.
 if(e.ultimate){const pressTick=e.ultimate.tick;delete e.ultimate;if(s.remaining>0){if(pressTick-s.activated>=P.debounce)expire(f)}else mrActivate(f);return true}
 if(illegal(f)||s.entry||s.grabPose)return true
 const clean=a?.mr?.clean&&cancelWindowOpen(f)
 const fire=(k,cancel=false)=>{s.edges={};return mrStart(f,k,{cancel})}
 if(a){
  if(clean&&e.light&&['light','miLight2'].includes(a.name))fire(a.name==='light'?'miLight2':'miFinish',true)
  else if(clean&&e.special&&['heavy','miForward','air'].includes(a.name)){const q=e.special;fire(q.up?'miRise':q.down?'miSlam':q.fwd?'miRush':q.back?'miSpin':'miImpact',true)}
  return true
 }
 if(f.attackCooldown>0)return true
 if(e.grab){fire(e.grab.fwd?'miLift':'miGrab');return true}
 if(e.special){const q=e.special;fire(q.up?'miRise':q.down?'miSlam':q.fwd?'miRush':q.back?'miSpin':'miImpact');return true}
 if(e.upAttack){fire(g?'up':'air');return true}
 if(e.heavy){const q=e.heavy;fire(!g?(q.down?'down_air':'air'):q.up?'up':q.down?'miDownHeavy':q.fwd?'miForward':'heavy');return true}
 if(e.light){fire(g?(e.light.down?'miLow':'light'):'air');return true}
 return true
}
export function mrHit(f,d,a,blocked=false){if(!isMr(f)||!a?.mr)return;a.mr.blocked=blocked;a.mr.clean=!blocked&&!(d._bossArmor||d._castArmor>0); if(blocked)d.blockstun=M[a.mr.key].blockstun}
export function mrHitbox(f){const a=f.currentAttack,m=M[a?.mr?.key];if(!m||m.noBody||m.slam&&!a.mr.contact)return {x:0,y:0,w:0,h:0}
 const dir=a.mr.dir,cx=f.x+f.w/2,feet=f.y+f.h
 const low=['miLow','miDownHeavy','miSlam','down_air'].includes(a.mr.key),w=m.rangeX+25
 return {x:dir===1?cx-12:cx-w+12,y:feet-(low?55:a.launcher?125:100),w,h:low?65:a.launcher?115:85}}
