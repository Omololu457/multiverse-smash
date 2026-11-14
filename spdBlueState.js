import {SPD_BLUE_MOVES} from './spdBlueData.js'
import {clearGroundTeleport,groundTeleportLocked,groundTeleportDestination} from './groundTeleport.js'
export const isSpdBlue=f=>f?.rosterKey==='spd_blue'
export const spdBlueState=f=>f._spdBlue ||= {tick:0,clock:0,prev:{},edges:{},used:{},barrierCooldown:0,barrierSpent:false,riseUsed:false,airShotUsed:false,leaping:false,landing:0,comboStepUsed:false,serial:0,cues:[]}
export function clearSpdBlue(f,W){if(!f)return;delete f._spdBlue;delete f._spdBlueRemoteInput;clearGroundTeleport(f);if(W)for(let i=W.projectiles.length-1;i>=0;i--)if(W.projectiles[i].owner===f&&W.projectiles[i]._spdBlue)W.projectiles.splice(i,1)}
export const spdBlueLocked=f=>isSpdBlue(f)&&(groundTeleportLocked(f)||f._spdBlue?.landing>0||f._spdBlue?.leaping||(f.attacking&&!f.currentAttack?.launcher))
export function spdBlueCanStep(f){const a=f.currentAttack;return isSpdBlue(f)&&!spdBlueState(f).comboStepUsed&&a?.blue?.clean&&a.blue.stepConfirm&&a.total-a.timer>a.activeEnd&&a.timer<=12}
export function spdBlueStepSpent(f){spdBlueState(f).comboStepUsed=true}
export const ownBlueShots=(f,W)=>(W?.projectiles||[]).filter(p=>p.owner===f&&p._spdBlue)
export function startSpdBlueMove(f,key,startMove,W,cancel=false){
 if(!isSpdBlue(f))return false
 const s=spdBlueState(f),md=SPD_BLUE_MOVES[key],g=!!(f.onGround||f.grounded)
 if(!md||f.health<=0||f.hitstun>0||f.blockstun>0||f.isGrabbed||f.knockdownState||s.landing>0||groundTeleportLocked(f)||(f.energy||0)<(md.cost||0))return false
 if(md.isSpecial&&((f.disabledSpecials||[]).includes('special')||f._gaDisabled>0))return false
 if(key==='bBarrier'&&(!g||s.barrierCooldown>0))return false
 if(md.shot&&ownBlueShots(f,W).length)return false
 if(key==='bRise'&&(!g||s.riseUsed))return false
 if(key==='bAirShot'&&(g||s.airShotUsed))return false
 if(key==='bAirDive'&&(g||s.diveUsed))return false
 if((key==='bSweep'||key==='bBackstep'||key==='bDrive1'||key==='bBash'||key==='bSky')&&!g)return false
 if(cancel){f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0}
 if(!startMove(f,key,md))return false
 f.energy=Math.max(0,f.energy-(md.cost||0));f.currentMove=key;f.currentAttack.blue={...md,dir:f.facing||1,origin:f.x,clean:false,fired:false};f.currentAttack.hasHit=!!md.noBody;f.isBlocking=false;f.isCharging=false;f.vx=0
 if(key==='up')f.jumpHeld=true
 if(key==='bBarrier'){s.barrierCooldown=180;s.barrierSpent=false}
 if(key==='bRise'){s.riseUsed=true;s.leaping=true;s.airborne=false;s.riseX=f.x}
 if(key==='bAirShot')s.airShotUsed=true
 if(key==='bAirDive'){s.diveUsed=true;s.diveFalling=true}
 if(md.invuln)f.invulnTimer=Math.max(f.invulnTimer||0,md.invuln)
 if(md.armor)f._castArmor=Math.max(f._castArmor||0,md.armor)   // VARIETY L6: armored startup (engine castArmored: absorbs non-launcher hits, damage still taken; game.js ticks it down)
 if(md.unblockable&&f.currentAttack)f.currentAttack.unblockable=true   // VARIETY L8: command throw beats guard (combat.js block branch skips unblockables; startMove does not copy the flag)
 s.cues.push(md.shot?'shot':'swing');return true
}
export function spdBlueHitbox(f){const a=f.currentAttack,m=a?.blue;if(!m||m.noBody)return {x:0,y:0,w:0,h:0};return {x:m.dir===1?f.x+f.w:f.x-a.rangeX,y:f.y+(m.boxY??22),w:a.rangeX,h:a.rangeY}}
export function spdBlueBlock(f,d,a){if(isSpdBlue(f)&&a?.blue){d.blockstun=a.blue.blockstun;a.blue.blocked=true}}
export function spdBlueHit(f,d,a,{armored=false}={}){if(!isSpdBlue(f)||!a?.blue||armored)return;a.blue.clean=true;f._cmdHitLanded=true
 if(a.blue.knockdown&&d.health>0){d.knockdownState=true;d.knockdownTimer=Math.max(d.knockdownTimer||0,44);d.vy=Math.min(d.vy||0,-6)}}   // variety pass: S.P.D. Red's knockdown contract
export function spdBlueBarrierActive(f){const a=f?.currentAttack;return isSpdBlue(f)&&f.attacking&&a?.name==='bBarrier'&&!f._spdBlue?.barrierSpent&&a.total-a.timer>=a.activeStart&&a.total-a.timer<=a.activeEnd&&!(f.hitstun>0)&&!f.isGrabbed}
// Existing defense contract: consume one contact before normal damage resolution.
// Grabs, unblockables, ultimates and cinematic contacts bypass; zero offensive hit/pulse callbacks.
export function absorbSpdBlue(f,source,attack,projectile=false){
 if(!spdBlueBarrierActive(f)||!attack||attack.isUltimate||attack.isCinematic||attack.cinematic||attack.unblockable||attack.damageType==='grab'||attack.category==='grab'||!(attack.damage>0))return false
 const sx=projectile?attack.x:source?.x+(source?.w||0)/2,fc=f.x+f.w/2
 if(!Number.isFinite(sx)||(sx-fc)*(f.facing||1)<0)return false
 const s=spdBlueState(f);s.barrierSpent=true;s.pulse=8;s.absorptions=(s.absorptions||0)+1
 if(source&&Math.abs(source.x-f.x)<180)source.vx=(f.facing||1)*Math.min(3,Math.max(0,Math.abs(source.vx||0)))+2*(f.facing||1)
 s.cues.push('block');return true
}
// ↓↘→: forward-without-down in the last 4 ticks preceded by down-without-forward within 15 (same reader as Green/Pink).
// ↓↙← (quarter-circle back): back-without-down in the last 4 ticks, preceded by down-without-back within 15. Pure function of the raw history.
export function blueQcb(h){if(!h?.length)return false;const n=h.length;let j=-1;for(let i=n-1;i>=Math.max(0,n-4);i--)if(h[i][2]&&!h[i][0]){j=i;break}if(j<0)return false;for(let i=j-1;i>=Math.max(0,n-15);i--)if(h[i][0]&&!h[i][2])return true;return false}
export function blueQcf(h){if(!h?.length)return false;const n=h.length;let j=-1;for(let i=n-1;i>=Math.max(0,n-4);i--)if(h[i][1]&&!h[i][0]){j=i;break}if(j<0)return false;for(let i=j-1;i>=Math.max(0,n-15);i--)if(h[i][0]&&!h[i][1])return true;return false}
export function tickSpdBlue(f,opp,raw,W,startMove){
 if(!isSpdBlue(f)){if(f?._spdBlue)clearSpdBlue(f,W);return}
 const s=spdBlueState(f);s.tick++
 {const fw=!!(f.facing===-1?raw.left:raw.right),bk=!!(f.facing===-1?raw.right:raw.left);(s.hist ||= []).push([raw.down?1:0,fw?1:0,bk?1:0]);if(s.hist.length>16)s.hist.shift()}   // variety pass: ↓↘→ history
 for(const k of ['light','heavy','special','ultimate','upAttack','charge']){const v=!!raw[k];if(v&&!s.prev[k])s.edges[k]={tick:s.tick,clock:s.clock,down:!!raw.down,up:!!raw.up,fwd:!!(f.facing===-1?raw.left:raw.right),back:!!(f.facing===-1?raw.right:raw.left),qcf:blueQcf(s.hist),qcb:blueQcb(s.hist)};s.prev[k]=v}
 if(f.health<=0||opp?.health<=0){clearSpdBlue(f,W);return}
 if(s.barrierCooldown>0)s.barrierCooldown--;if(s.pulse>0)s.pulse--
 if(!(f.comboCounter>0)&&!(opp?.hitstun>0))s.comboStepUsed=false
 if(f.hitstun>0||f.isGrabbed){s.leaping=false;s.landing=0;s.barrierSpent=true;s.diveFalling=false}
 if(f.hitstop>0)return
 s.clock++
 if(s.landing>0){s.landing--;f.vx=0}
 const g=!!(f.onGround||f.grounded)
 if(g&&!s.leaping){s.riseUsed=false;s.airShotUsed=false;s.diveUsed=false}
 // Delta Dive: landing recovery 14 on touchdown (even after the active window ends); no bounce, no hover.
 if(s.diveFalling&&g){s.diveFalling=false;if(f.currentAttack?.blue?.dive){f.attacking=false;f.currentAttack=null;f.currentMove=null}s.landing=14;f.attackCooldown=14;f.vx=0;return}
 if(s.leaping&&g&&s.airborne){s.leaping=false;s.landing=18;f.vx=0;f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=18}
 if(!g&&s.leaping)s.airborne=true
 const a=f.attacking?f.currentAttack:null,m=a?.blue,t=a?a.total-a.timer:-1
 if(!m||f.hitstun>0||f.isGrabbed)return
 f.facing=m.dir
 if(m.counter&&t>=m.counter[0]&&t<m.counter[1]&&opp?.attacking&&opp.currentAttack&&!opp.currentAttack.hasHit&&!opp.currentAttack.unblockable&&opp.currentAttack.damageType!=='grab'){const o=opp.currentAttack,ot=o.total-o.timer;if(ot>=(o.activeStart??0)-1&&ot<=(o.activeEnd??o.total)&&Math.abs((opp.x+(opp.w||48)/2)-(f.x+(f.w||48)/2))<=m.counter[2]){s.counterReads=(s.counterReads||0)+1;startSpdBlueMove(f,m.counterInto,startMove,W,true);const n=f.currentAttack?.blue;if(n)n.origin=f.x;return}}   // VARIETY L7: counter stance reads a live melee attack in range -> strike
 if(m.travel&&t>=m.travel[0]&&t<m.travel[1]){const x=m.origin+m.dir*m.travel[2]*(t-m.travel[0]+1);f.x=groundTeleportDestination(f,m.dir,W,Math.max(0,(x-f.x)*m.dir));f.vx=0}
 else if(m.retreat&&t>=a.activeStart&&t<=a.activeEnd){const span=a.activeEnd-a.activeStart+1,want=m.origin-m.dir*m.retreat*(t-a.activeStart+1)/span;f.x=groundTeleportDestination(f,-m.dir,W,Math.max(0,(f.x-want)*m.dir));f.vx=0}
 else if(m.pull&&t>=m.pull[0]&&t<m.pull[1]){const want=m.origin-m.dir*m.pull[2]*(t-m.pull[0]+1);f.x=groundTeleportDestination(f,-m.dir,W,Math.max(0,(f.x-want)*m.dir));f.vx=0}   // VARIETY L5: Back+Light steps back during startup
 else if(g)f.vx=0
 if(m.dive&&t>=a.activeStart){f.vy=Math.min(12,Math.max(f.vy||0,9));f.vx=m.dir*6}
 // Motion string: a BLOCKED stage ends the string with an 18f stop (blockstun is not guard in this engine, so
 // chaining after a block would let the next stage connect). Whiff still commits to the full string.
 if((a.name==='bDrive1'||a.name==='bDrive2')&&t>=a.total-1&&m.blocked&&!m.clean){f.attacking=false;f.currentAttack=null;f.currentMove=null;s.landing=18;f.attackCooldown=18;f.vx=0;return}
 if((a.name==='bDrive1'||a.name==='bDrive2')&&t>=a.total-1){startSpdBlueMove(f,a.name==='bDrive1'?'bDrive2':'bDrive3',startMove,W,true);const n=f.currentAttack?.blue;if(n)n.origin=f.x;return}
 if(a.name==='bPursuit'&&m.clean&&t>a.activeEnd){startSpdBlueMove(f,'bPursuitFinish',startMove,W,true);return}
 if(a.name==='bRise'&&t===5){f.vy=-17;f.vx=m.dir*4;f.onGround=false;f.grounded=false;f.jumpCount=Math.max(1,f.jumpCount||0);s.airborne=true}
 if(s.leaping){f.vx=0;f.x=Math.max(0,Math.min(W.stageWidth()-f.w,s.riseX+m.dir*Math.min(100,Math.max(0,t-5)*4)))}
 if(t===a.activeStart-1&&!m.fired){m.fired=true
  if(m.shot){const air=a.name==='bAirShot',p=W.spawn(f,'spd_blue_shot',{spawnX:f.x+f.w/2+m.dir*(air?62:68),spawnY:f.y+f.h-(air?104:84),vx:m.dir*9,vy:0,w:44,h:6,radius:3,damage:a.damage,hitstun:20,knockbackX:3,knockbackY:0,lifetime:48,sheet:f._recolorTag?`./assets/spd_blue/skins/${f._recolorTag}/shot.png`:'./assets/spd_blue/shot.png',spriteW:64,spriteH:4,spriteFrames:1,spriteScale:0.75});if(p){p.damageType='energy';p.isSpecial=true;p._spdBlue={serial:++s.serial}}
   if(air){f.x=Math.max(0,Math.min(W.stageWidth()-f.w,f.x-m.dir*16));f.vx=-m.dir*2} s.cues.push('shot')
  }
 }
}
