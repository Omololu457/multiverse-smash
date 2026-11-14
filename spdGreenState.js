// S.P.D. Green Ranger (Bridge Carson) — simulation state. Plain JSON state on f._spdGreen, sim ticks only,
// no RNG, no wall clock. Every export is a no-op for any other rosterKey.
import {SPD_GREEN_MOVES,AURA_READ,SPD_GREEN_LANDING} from './spdGreenData.js'
import {clearGroundTeleport,groundTeleportLocked,groundTeleportDestination} from './groundTeleport.js'

export const isSpdGreen=f=>f?.rosterKey==='spd_green'
export const spdGreenState=f=>f._spdGreen ||= {tick:0,clock:0,prev:{},edges:{},used:{},scanCooldown:0,mark:null,riseUsed:false,heelUsed:false,
 leaping:false,airborne:false,landing:0,acro:null,followUsed:false,serial:0,scans:0,marks:0,follows:0,cues:[]}
// Render-only cache: which fighter object the mark points at (gameplay compares playerNumber, never this).
const markRender=new WeakMap()
export const spdGreenMarkTarget=f=>markRender.get(f)||null

export function clearSpdGreen(f,W){
 if(!f)return
 delete f._spdGreen;delete f._spdGreenRemoteInput;markRender.delete(f)
 if(f.rosterKey==='spd_green')clearGroundTeleport(f)
 if(W)for(let i=W.projectiles.length-1;i>=0;i--)if(W.projectiles[i].owner===f&&W.projectiles[i]._spdGreen)W.projectiles.splice(i,1)
}
export const spdGreenLocked=f=>isSpdGreen(f)&&(groundTeleportLocked(f)||f._spdGreen?.landing>0||f._spdGreen?.leaping||(f.attacking&&!f.currentAttack?.launcher))
export const ownGreenShots=(f,W)=>(W?.projectiles||[]).filter(p=>p.owner===f&&p._spdGreen)
const slot=o=>o?.playerNumber||0
// The mark is valid only for its own owner, its own target, while the timer runs.
export function spdGreenMarked(f,opp){const m=f?._spdGreen?.mark;return !!(isSpdGreen(f)&&m&&m.timer>0&&opp&&m.target===slot(opp))}

export function startSpdGreenMove(f,key,startMove,W,cancel=false){
 if(!isSpdGreen(f))return false
 const s=spdGreenState(f),md=SPD_GREEN_MOVES[key],g=!!(f.onGround||f.grounded)
 if(!md||f.health<=0||f.hitstun>0||f.blockstun>0||f.isGrabbed||f.knockdownState||s.landing>0||groundTeleportLocked(f))return false
 const cost=key==='gFollow'?AURA_READ.followCost:(md.cost||0)
 if((f.energy||0)<cost)return false
 if(md.isSpecial&&((f.disabledSpecials||[]).includes('special')||f._gaDisabled>0))return false
 if(md.shot&&ownGreenShots(f,W).length)return false
 if(key==='gScan'&&(!g||s.scanCooldown>0))return false
 if((key==='gRise'||key==='gRetreat'||key==='gAcro')&&!g)return false
 if(key==='gRise'&&s.riseUsed)return false
 if(key==='gHeel'&&(g||s.heelUsed))return false
 if(cancel){f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0}
 if(!startMove(f,key,md))return false
 f.energy=Math.max(0,f.energy-cost);f.currentMove=key
 f.currentAttack.green={...md,dir:f.facing||1,origin:f.x,clean:false,blocked:false,fired:false}
 f.currentAttack.hasHit=!!md.noBody;f.isBlocking=false;f.isCharging=false;f.vx=0
 if(key==='up')f.jumpHeld=true
 if(key==='gScan'){s.scanCooldown=AURA_READ.cooldown;s.scans++}
 if(key==='gRise'){s.riseUsed=true;s.leaping=true;s.airborne=false;s.riseX=f.x}
 if(key==='gHeel'){s.heelUsed=true;s.heelFalling=true}
 if(key==='gAcro')s.acro={clean:false,blocked:false,stage:1}
 if(key==='gFollow'){s.followUsed=true;s.mark=null;s.follows++;markRender.delete(f)}
 s.cues.push(md.shot?'shot':md.scan?'scan':'swing');return true
}

// combat.js hooks (spd_green-gated).
export function spdGreenHitbox(f){const a=f.currentAttack,m=a?.green;if(!m||m.noBody)return {x:0,y:0,w:0,h:0};return {x:m.dir===1?f.x+f.w:f.x-a.rangeX,y:f.y+(m.boxY??22),w:a.rangeX,h:a.rangeY}}
export function spdGreenBlock(f,d,a){if(!isSpdGreen(f)||!a?.green)return;d.blockstun=a.green.blockstun;a.green.blocked=true;if(f._spdGreen?.acro&&/^gAcro/.test(a.name))f._spdGreen.acro.blocked=true}
export function spdGreenHit(f,d,a,{armored=false}={}){
 if(!isSpdGreen(f)||!a?.green||armored)return
 a.green.clean=true;f._cmdHitLanded=true
 const s=f._spdGreen;if(s?.acro&&/^gAcro/.test(a.name)&&!s.acro.blocked)s.acro.clean=true
}

// Is the marked Acrobat Step follow-up open right now? (clean opener on THIS owner's mark, unused this combo,
// first `followWindow` ticks of the second kick's recovery). Pure query; the command layer consumes.
// Window = the first `followWindow` FREE frames (sim clock, which hitstop freezes) of gAcro2's recovery. The Heavy
// press must happen after recovery began (edge.tick >= recTick; a press during that hitstop is buffered into the
// window's first frame) and inside the window (edge.clock - recClock < W). Presses during the kick itself never count.
export function spdGreenFollowOpen(f,opp,edge){
 const s=f?._spdGreen,a=f?.currentAttack,A=s?.acro
 if(!isSpdGreen(f)||!s||!a||a.name!=='gAcro2'||!A?.clean||A.blocked||s.followUsed||!spdGreenMarked(f,opp)||A.recTick==null||!edge)return false
 const W=AURA_READ.followWindow;return s.clock-A.recClock<=W&&edge.tick>=A.recTick&&edge.clock-A.recClock<W
}

export function tickSpdGreen(f,opp,raw,W,startMove){
 if(!isSpdGreen(f)){if(f?._spdGreen)clearSpdGreen(f,W);return}
 const s=spdGreenState(f);s.tick++
 for(const k of ['light','heavy','special','ultimate','upAttack','charge']){const v=!!raw[k];if(v&&!s.prev[k])s.edges[k]={tick:s.tick,clock:s.clock,down:!!raw.down,up:!!raw.up,fwd:!!(f.facing===-1?raw.left:raw.right),back:!!(f.facing===-1?raw.right:raw.left),block:!!raw.block};s.prev[k]=v}
 if(f.health<=0||opp?.health<=0){clearSpdGreen(f,W);return}
 // Stamp the first recovery tick of the second Acrobat kick (even inside hitstop) for the follow-up window.
 {const a0=f.attacking?f.currentAttack:null;if(a0?.name==='gAcro2'&&s.acro&&s.acro.recTick==null&&a0.total-a0.timer>a0.activeEnd){s.acro.recTick=s.tick;s.acro.recClock=s.clock}}
 if(f.hitstop>0)return
 s.clock++
 if(s.scanCooldown>0)s.scanCooldown--
 if(s.mark){if(--s.mark.timer<=0||!(opp?.health>0)){s.mark=null;markRender.delete(f)}}
 if(!(f.comboCounter>0)&&!(opp?.hitstun>0))s.followUsed=false
 if(f.hitstun>0||f.isGrabbed){s.leaping=false;s.landing=0;s.acro=null;s.heelFalling=false}
 if(s.landing>0){s.landing--;f.vx=0}
 const g=!!(f.onGround||f.grounded)
 if(g&&!s.leaping){s.riseUsed=false;s.heelUsed=false}
 if(s.leaping&&g&&s.airborne){s.leaping=false;s.landing=SPD_GREEN_LANDING.rise;f.vx=0;f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=SPD_GREEN_LANDING.rise}
 if(!g&&s.leaping)s.airborne=true
 const a=f.attacking?f.currentAttack:null,m=a?.green,t=a?a.total-a.timer:-1
 if(!a||!/^gAcro/.test(a.name))s.acro=null
 // Heel Return landing recovery applies on touchdown even if the active window already ran out.
 if(s.heelFalling&&g){s.heelFalling=false;if(a?.green?.heel){f.attacking=false;f.currentAttack=null;f.currentMove=null}s.landing=SPD_GREEN_LANDING.heel;f.attackCooldown=SPD_GREEN_LANDING.heel;f.vx=0;return}
 if(!m||f.hitstun>0||f.isGrabbed)return
 f.facing=m.dir
 // Bounded advance: re-swept every tick against bodies/terrain/stage (no cross-through, no tracking).
 if(m.travel&&t>=m.travel[0]&&t<m.travel[1]){const x=m.origin+m.dir*m.travel[2]*(t-m.travel[0]+1);f.x=groundTeleportDestination(f,m.dir,W,Math.max(0,(x-f.x)*m.dir));f.vx=0}
 else if(m.retreat&&t>=a.activeStart&&t<=a.activeEnd){const span=a.activeEnd-a.activeStart+1,want=m.origin-m.dir*m.retreat*(t-a.activeStart+1)/span;f.x=groundTeleportDestination(f,-m.dir,W,Math.max(0,(f.x-want)*m.dir));f.vx=0}
 else if(g&&!m.heel)f.vx=0
 // Acrobat Step: second kick always follows the first unless interrupted (one committed special).
 if(a.name==='gAcro'&&t>=a.total-1){startSpdGreenMove(f,'gAcro2',startMove,W,true);const n=f.currentAttack?.green;if(n)n.origin=f.x;return}
 // Aura Read: scan completes on the last scan tick; interruption (hit/grab/cancel) never reaches here.
 if(m.scan&&t===a.activeEnd){
  const d=opp?Math.abs((opp.x+opp.w/2)-(f.x+f.w/2)):Infinity
  if(d<=AURA_READ.range&&opp?.health>0){s.mark={target:slot(opp),timer:AURA_READ.markFrames};s.marks++;markRender.set(f,opp);s.cues.push('mark')}
 }
 if(a.name==='gRise'&&t===8){f.vy=-17;f.vx=m.dir*4;f.onGround=false;f.grounded=false;f.jumpCount=Math.max(1,f.jumpCount||0);s.airborne=true}
 if(s.leaping){f.vx=0;f.x=Math.max(0,Math.min(W.stageWidth()-f.w,s.riseX+m.dir*Math.min(90,Math.max(0,t-8)*4)))}
 // Heel Return: no stall; committed capped descent from the active frame, landing recovery on touchdown.
 if(m.heel&&t>=a.activeStart){f.vy=Math.min(14,Math.max(f.vy||0,10));f.vx=m.dir*2}
 if(m.shot&&t===a.activeStart-1&&!m.fired){m.fired=true
  const p=W.spawn(f,'spd_green_shot',{spawnX:f.x+f.w/2+m.dir*68,spawnY:f.y+f.h-84,vx:m.dir*9,vy:0,w:44,h:6,radius:3,damage:a.damage,hitstun:20,knockbackX:3,knockbackY:0,lifetime:48,
   sheet:f._recolorTag?`./assets/spd_green/skins/${f._recolorTag}/fx_beam1.png`:'./assets/spd_green/fx_beam1.png',spriteW:72,spriteH:4,spriteFrames:1,spriteScale:0.75})
  if(p){p.damageType='energy';p.isSpecial=true;p._spdGreen={serial:++s.serial}}
  s.muzzle=6;s.cues.push('shot')
 }
 if(s.muzzle>0)s.muzzle--
}
