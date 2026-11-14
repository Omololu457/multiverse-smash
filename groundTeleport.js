// Opt-in grounded, energy-paid, non-invulnerable teleport. Plain JSON / sim ticks.
const profiles=new Map()
export function registerGroundTeleport(id,config){profiles.set(id,Object.freeze({window:12,cost:8,cooldown:36,startup:3,transit:2,recovery:8,distance:120,minDistance:4,...config}));return profiles.get(id)}
export const groundTeleportProfile=f=>profiles.get(f?.rosterKey)||null
export const groundTeleportState=f=>f._groundTeleport ||= {tick:0,prev:0,lastDir:0,lastAt:-1000,released:false,cooldown:0,action:null,count:0}
export const groundTeleportLocked=f=>!!f?._groundTeleport?.action
export function clearGroundTeleport(f){if(f)delete f._groundTeleport}
const overlapY=(f,b)=>f.y<b.y+b.h&&f.y+f.h>b.y
// Sweep the complete body, never just test the endpoint (no thin-wall tunnelling).
export function groundTeleportDestination(f,dir,W,distance=120){
 let x=Math.max(0,Math.min(W.stageWidth()-f.w,f.x+dir*distance))
 const solids=[...(W.fighters?.()||[]).filter(o=>o&&o!==f&&o.health>0),...(W.solids?.()||[])]
 for(const b of solids){if(!overlapY(f,b))continue
  if(dir>0&&b.x>=f.x+f.w-0.01)x=Math.min(x,b.x-f.w-1)
  if(dir<0&&b.x+b.w<=f.x+0.01)x=Math.max(x,b.x+b.w+1)
  if(f.x<b.x+b.w&&f.x+f.w>b.x)return f.x // pre-existing embedding cannot authorize crossing
 }
 return dir>0?Math.max(f.x,x):Math.min(f.x,x)
}
export function tickGroundTeleport(f,raw,W,{canCancel=()=>false,onCancel=()=>{}}={}){
 const P=groundTeleportProfile(f);if(!P){if(f?._groundTeleport)clearGroundTeleport(f);return false}
 const s=groundTeleportState(f);s.tick++;if(s.cooldown>0)s.cooldown--
 const L=!!raw.left,R=!!raw.right,dir=L===R?0:L?-1:1
 const edge=dir!==0&&s.prev===0;s.prev=dir
 if(dir===0)s.released=true
 let request=0
 if(edge){if(s.lastDir===dir&&s.released&&s.tick-s.lastAt<=P.window){request=dir;s.lastAt=-1000;s.lastDir=0}else{s.lastDir=dir;s.lastAt=s.tick}s.released=false}
 const bad=!(f.health>0)||f.hitstun>0||f.blockstun>0||f.stun>0||f.hitstop>0||f.isGrabbed||f.knockdownState||!(f.onGround||f.grounded)||f.isBlocking||raw.block||raw.down||f.isCharging||f._tauntPlaying||W.cinematic?.(f)
 if(s.action&&bad)s.action=null
 if(request){
  const cancel=!!f.attacking&&canCancel(f)
  const eligible=!bad&&!s.action&&(!f.attacking?!(f.attackCooldown>0):cancel)
  // Every attempted pair is consumed now, including illegal/rejected requests.
  f._dashTap=false
  if(eligible){
   if((f.energy||0)<P.cost||s.cooldown>0)f._dashTap=true // existing legal dash fallback only
   else{const x=groundTeleportDestination(f,request,W,P.distance)
    if(Math.abs(x-f.x)>=P.minDistance){
     if(cancel){onCancel(f);f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0}
     f.energy-=P.cost;s.cooldown=P.cooldown;s.count++;s.action={age:0,dir:request,x0:f.x,x1:x,phase:'windup'};f.dashTimer=0;f._dashTap=false
    }
   }
  }
 }
 const a=s.action;if(!a)return false
 f.vx=0;f.dashTimer=0;f._dashTap=false
 if(a.age<P.startup)a.phase='windup'
 else if(a.age<P.startup+P.transit){a.phase='transit';const wanted=a.x0+(a.x1-a.x0)*(a.age-P.startup+1)/P.transit
  // Re-sweep on each transit tick: moving opponents / simultaneous teleports remain solid.
  f.x=groundTeleportDestination(f,a.dir,W,Math.abs(wanted-f.x));a.x1=groundTeleportDestination(f,a.dir,W,Math.abs(a.x1-f.x))
 }else a.phase='recovery'
 if(++a.age>=P.startup+P.transit+P.recovery)s.action=null
 return true
}
