// S.P.D. Pink Ranger (Syd Drew) — simulation state. Plain JSON state on f._spdPink, sim ticks only,
// no RNG, no wall clock. Every export is a no-op for any other rosterKey.
import {SPD_PINK_MOVES,IRON_RESERVE,BATON_REPRISAL,SPD_PINK_LANDING} from './spdPinkData.js'
import {clearGroundTeleport,groundTeleportLocked,groundTeleportDestination} from './groundTeleport.js'

export const isSpdPink=f=>f?.rosterKey==='spd_pink'
export const spdPinkState=f=>f._spdPink ||= {tick:0,clock:0,prev:{},edges:{},used:{},prepCooldown:0,stanceCooldown:0,reserve:null,
 riseUsed:false,roseUsed:false,roseFalling:false,leaping:false,airborne:false,landing:0,reprisalPending:false,serial:0,
 preps:0,reserves:0,consumed:0,expired:0,counters:0,responses:0,cues:[]}

export function clearSpdPink(f,W){
 if(!f)return
 delete f._spdPink;delete f._spdPinkRemoteInput
 if(f.rosterKey==='spd_pink')clearGroundTeleport(f)
 if(W)for(let i=W.projectiles.length-1;i>=0;i--)if(W.projectiles[i].owner===f&&W.projectiles[i]._spdPink)W.projectiles.splice(i,1)
}
export const spdPinkLocked=f=>isSpdPink(f)&&(groundTeleportLocked(f)||f._spdPink?.landing>0||f._spdPink?.leaping||(f.attacking&&!f.currentAttack?.launcher))
export const ownPinkShots=(f,W)=>(W?.projectiles||[]).filter(p=>p.owner===f&&p._spdPink)
export const spdPinkReserve=f=>isSpdPink(f)&&!!f._spdPink?.reserve
// Moves that spend an Iron Reserve charge when they START (miss/block still spends it).
const IRON={heavy:'heavyIron',pBreaker:'pBreakerIron'}

export function startSpdPinkMove(f,key,startMove,W,cancel=false){
 if(!isSpdPink(f))return false
 const s=spdPinkState(f),g=!!(f.onGround||f.grounded)
 if(IRON[key]&&s.reserve)key=IRON[key]
 const md=SPD_PINK_MOVES[key]
 if(!md||f.health<=0||f.hitstun>0||f.blockstun>0||f.isGrabbed||f.knockdownState||s.landing>0||groundTeleportLocked(f))return false
 const cost=md.cost||0
 if((f.energy||0)<cost)return false
 if(md.isSpecial&&!md.response&&((f.disabledSpecials||[]).includes('special')||f._gaDisabled>0))return false
 if(md.shot&&ownPinkShots(f,W).length)return false
 if(key==='pPrep'&&(!g||s.prepCooldown>0||s.reserve))return false
 if(key==='pStance'&&(!g||s.stanceCooldown>0))return false
 if((key==='pRise'||key==='pStance'||key==='pPrep'||/^pBreaker/.test(key)||key==='pEvade'||key==='pVault'||key==='pBar1'||key==='pSweep'||key==='pFlip')&&!g)return false
 if(key==='pAirShot'&&(g||s.airShotUsed))return false
 if(key==='pBar1'&&!s.reserve)return false
 if(key==='pRise'&&s.riseUsed)return false
 if(key==='pRose'&&(g||s.roseUsed))return false
 if(cancel){f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0}
 if(!startMove(f,key,md))return false
 f.energy=Math.max(0,f.energy-cost);f.currentMove=key
 f.currentAttack.pink={...md,dir:f.facing||1,origin:f.x,clean:false,blocked:false,fired:false,countered:false}
 f.currentAttack.hasHit=!!md.noBody;f.isBlocking=false;f.isCharging=false;f.vx=0
 if(md.iron){s.reserve=null;s.consumed++;s.cues.push('iron')}
 if(key==='up')f.jumpHeld=true
 if(key==='pPrep'){s.prepCooldown=IRON_RESERVE.cooldown;s.preps++}
 if(key==='pStance'){s.stanceCooldown=BATON_REPRISAL.cooldown}
 if(key==='pReprisal')s.responses++
 if(key==='pAirShot')s.airShotUsed=true
 if(md.invuln)f.invulnTimer=Math.max(f.invulnTimer||0,md.invuln)
 if(md.armor)f._castArmor=Math.max(f._castArmor||0,md.armor)   // VARIETY L6: armored startup (engine castArmored: absorbs non-launcher hits, damage still taken; game.js ticks it down)
 if(md.unblockable&&f.currentAttack)f.currentAttack.unblockable=true   // VARIETY L8: command throw beats guard (combat.js block branch skips unblockables; startMove does not copy the flag)
 if(key==='pRise'){s.riseUsed=true;s.leaping=true;s.airborne=false;s.riseX=f.x}
 if(key==='pRose'){s.roseUsed=true;s.roseFalling=true}
 s.cues.push(md.shot?'shot':md.prep?'prep':md.stance?'stance':'swing');return true
}

// combat.js hooks (spd_pink-gated).
export function spdPinkHitbox(f){const a=f.currentAttack,m=a?.pink;if(!m||m.noBody)return {x:0,y:0,w:0,h:0};return {x:m.dir===1?f.x+f.w:f.x-a.rangeX,y:f.y+(m.boxY??22),w:a.rangeX,h:a.rangeY}}
export function spdPinkBlock(f,d,a){if(!isSpdPink(f)||!a?.pink)return;d.blockstun=a.pink.blockstun;a.pink.blocked=true}
export function spdPinkHit(f,d,a,{armored=false}={}){if(!isSpdPink(f)||!a?.pink||armored)return;a.pink.clean=true;f._cmdHitLanded=true
 if(a.pink.knockdown&&d.health>0){d.knockdownState=true;d.knockdownTimer=Math.max(d.knockdownTimer||0,44);d.vy=Math.min(d.vy||0,-6)}}   // same knockdown contract as S.P.D. Red

// BATON REPRISAL — shared counter contract (called at the top of combat.resolveAttackHit, after the
// hitbox/hurtbox overlap test, like the Nezuko/Baki/Kurapika counters). Returns true when the incoming hit is
// consumed. Eligible: an ordinary melee hit from the FRONT within 140px while the stance is in its 12f ready
// window. Excluded: ultimates, grabs/throws, cinematics, unblockables, explicit counter-bypass moves (which
// includes Syd's own response → no counter recursion). Projectiles never reach this path (no reflection).
// Unlike the riposte counters, the attacker is NOT stunned and takes no damage here: Syd answers next tick with
// an ordinary blockable raw 40 response (pReprisal) that the attacker can block or escape if recovered.
export function spdPinkCounter(defender,attacker){
 if(!isSpdPink(defender)||!attacker||attacker===defender)return false
 const a=defender.attacking?defender.currentAttack:null,m=a?.pink,atk=attacker.currentAttack
 if(!m?.stance||m.countered||!atk)return false
 const t=a.total-a.timer;if(t<a.activeStart||t>a.activeEnd)return false
 // Move-data flags live on the per-move payload (startMove does not copy them onto currentAttack): check both.
 const md=atk.pink||atk.blue||atk.green||{}
 if(atk.isUltimate||md.isUltimate||atk.counterBypass||md.counterBypass||atk.unblockable||md.unblockable||atk.isGrab||atk.damageType==='grab'||md.damageType==='grab'||atk.isProjectile||attacker.inCinematic||attacker._cinematic)return false
 const dc=(attacker.x+attacker.w/2)-(defender.x+defender.w/2)
 if(Math.sign(dc||defender.facing||1)!==(defender.facing||1)||Math.abs(dc)>BATON_REPRISAL.range)return false
 m.countered=true;atk.hasHit=true
 const s=spdPinkState(defender);s.reprisalPending=true;s.counters++;s.cues.push('counter')
 defender.parryFlash=Math.max(defender.parryFlash||0,12)
 return true
}

// ↓↘→ (quarter-circle forward): forward-without-down in the last 4 ticks, preceded by down-without-forward within
// 15 ticks (↘ optional — lenient like the roster's other motion reads). Pure function of the raw history.
// ↓↙← (quarter-circle back): back-without-down in the last 4 ticks, preceded by down-without-back within 15. Pure function of the raw history.
export function qcb(h){if(!h?.length)return false;const n=h.length;let j=-1;for(let i=n-1;i>=Math.max(0,n-4);i--)if(h[i][2]&&!h[i][0]){j=i;break}if(j<0)return false;for(let i=j-1;i>=Math.max(0,n-15);i--)if(h[i][0]&&!h[i][2])return true;return false}
export function qcf(h){if(!h?.length)return false;const n=h.length;let j=-1
 for(let i=n-1;i>=Math.max(0,n-4);i--)if(h[i][1]&&!h[i][0]){j=i;break}
 if(j<0)return false;for(let i=j-1;i>=Math.max(0,n-15);i--)if(h[i][0]&&!h[i][1])return true;return false}
export function tickSpdPink(f,opp,raw,W,startMove){
 if(!isSpdPink(f)){if(f?._spdPink)clearSpdPink(f,W);return}
 const s=spdPinkState(f);s.tick++
 // Direction history (raw, facing-relative, last 16 ticks) → ↓↘→ motion read at the press (deterministic; replay/LAN safe).
 {const fw=!!(f.facing===-1?raw.left:raw.right),bk=!!(f.facing===-1?raw.right:raw.left);(s.hist ||= []).push([raw.down?1:0,fw?1:0,bk?1:0]);if(s.hist.length>16)s.hist.shift()}
 for(const k of ['light','heavy','special','ultimate','upAttack','charge']){const v=!!raw[k];if(v&&!s.prev[k])s.edges[k]={tick:s.tick,clock:s.clock,down:!!raw.down,up:!!raw.up,fwd:!!(f.facing===-1?raw.left:raw.right),back:!!(f.facing===-1?raw.right:raw.left),block:!!raw.block,qcf:qcf(s.hist),qcb:qcb(s.hist)};s.prev[k]=v}
 if(f.health<=0||opp?.health<=0){clearSpdPink(f,W);return}
 if(f.hitstop>0)return
 s.clock++
 if(s.prepCooldown>0)s.prepCooldown--
 if(s.stanceCooldown>0)s.stanceCooldown--
 // Iron Reserve lifetime: 300 sim frames; expiry grants nothing back.
 if(s.reserve&&--s.reserve.timer<=0){s.reserve=null;s.expired++}
 if(f.hitstun>0||f.isGrabbed){s.leaping=false;s.landing=0;s.roseFalling=false;s.reprisalPending=false}
 if(s.landing>0){s.landing--;f.vx=0}
 const g=!!(f.onGround||f.grounded)
 if(g&&!s.leaping){s.riseUsed=false;s.roseUsed=false;s.airShotUsed=false}
 if(s.leaping&&g&&s.airborne){s.leaping=false;s.landing=SPD_PINK_LANDING.rise;f.vx=0;f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=SPD_PINK_LANDING.rise}
 if(!g&&s.leaping)s.airborne=true
 // Baton Reprisal response: exactly one, started the tick after the consumed hit.
 if(s.reprisalPending){s.reprisalPending=false;if(startSpdPinkMove(f,'pReprisal',startMove,W,true)){const n=f.currentAttack?.pink;if(n)n.origin=f.x};return}
 const a=f.attacking?f.currentAttack:null,m=a?.pink,t=a?a.total-a.timer:-1
 // Falling Rose landing recovery applies on touchdown even if the active window already ran out.
 if(s.roseFalling&&g){s.roseFalling=false;if(a?.pink?.rose){f.attacking=false;f.currentAttack=null;f.currentMove=null}s.landing=SPD_PINK_LANDING.rose;f.attackCooldown=SPD_PINK_LANDING.rose;f.vx=0;return}
 if(!m||f.hitstun>0||f.isGrabbed)return
 f.facing=m.dir
 // Bounded advance: re-swept every tick against bodies/terrain/stage (no cross-through, no tracking).
 if(m.travel&&t>=m.travel[0]&&t<m.travel[1]){const x=m.origin+m.dir*m.travel[2]*(t-m.travel[0]+1);f.x=groundTeleportDestination(f,m.dir,W,Math.max(0,(x-f.x)*m.dir));f.vx=0}
 else if(m.retreat&&t>=a.activeStart&&t<=a.activeEnd){const span=a.activeEnd-a.activeStart+1,want=m.origin-m.dir*m.retreat*(t-a.activeStart+1)/span;f.x=groundTeleportDestination(f,-m.dir,W,Math.max(0,(f.x-want)*m.dir));f.vx=0}
 else if(m.pull&&t>=m.pull[0]&&t<m.pull[1]){const want=m.origin-m.dir*m.pull[2]*(t-m.pull[0]+1);f.x=groundTeleportDestination(f,-m.dir,W,Math.max(0,(f.x-want)*m.dir));f.vx=0}   // VARIETY L5: Back+Light steps back during startup
 else if(g&&!m.rose)f.vx=0
 // Iron Barrage: three committed hits (plays out on hit, block or whiff — no free cancel).
 // Motion string: a BLOCKED stage ends the string with an 18f stop (blockstun is not guard in this engine, so
 // chaining after a block would let the next stage connect). Whiff still commits to the full string.
 if((a.name==='pBar1'||a.name==='pBar2')&&t>=a.total-1&&m.blocked&&!m.clean){f.attacking=false;f.currentAttack=null;f.currentMove=null;s.landing=18;f.attackCooldown=18;f.vx=0;return}
 if((a.name==='pBar1'||a.name==='pBar2')&&t>=a.total-1){startSpdPinkMove(f,a.name==='pBar1'?'pBar2':'pBar3',startMove,W,true);const n=f.currentAttack?.pink;if(n)n.origin=f.x;return}
 // Iron Reserve: granted only when the preparation window completes (interruption never reaches here).
 if(m.prep&&t===a.activeEnd&&!s.reserve){s.reserve={timer:IRON_RESERVE.lifetime};s.reserves++;s.cues.push('reserve')}
 if(a.name==='pRise'&&t===9){f.vy=-17;f.vx=m.dir*4;f.onGround=false;f.grounded=false;f.jumpCount=Math.max(1,f.jumpCount||0);s.airborne=true}
 if(s.leaping){f.vx=0;f.x=Math.max(0,Math.min(W.stageWidth()-f.w,s.riseX+m.dir*Math.min(80,Math.max(0,t-9)*4)))}
 // Falling Rose: no stall/hover; capped descent from the active frame, landing recovery on touchdown.
 if(m.rose&&t>=a.activeStart){f.vy=Math.min(14,Math.max(f.vy||0,10));f.vx=m.dir*2}
 if(m.shot&&t===(m.shotAtEnd?a.activeEnd:a.activeStart-1)&&!m.fired){m.fired=true
  const p=W.spawn(f,'spd_pink_shot',{spawnX:f.x+f.w/2+m.dir*66,spawnY:f.y+f.h-(m.airShot?72:82),vx:m.dir*(m.airShot?8:9),vy:m.airShot?3:0,w:44,h:6,radius:3,damage:a.damage,hitstun:20,knockbackX:3,knockbackY:0,lifetime:48,
   sheet:f._recolorTag?`./assets/spd_pink/skins/${f._recolorTag}/fx_beam1.png`:'./assets/spd_pink/fx_beam1.png',spriteW:64,spriteH:4,spriteFrames:1,spriteScale:0.75})
  if(p){p.damageType='energy';p.isSpecial=true;p._spdPink={serial:++s.serial}}
  s.muzzle=6;s.cues.push('shot')
 }
 if(s.muzzle>0)s.muzzle--
}
