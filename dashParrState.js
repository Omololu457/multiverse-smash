// Dash Parr — simulation state. Plain JSON on f._dashParr (GAME_STATE: snapshotted by game.js determinism hash,
// cleared on reset / round end / KO). Sim ticks only; no Math.random, no gameRng, no wall clock. Every hashed
// value is hashRandom(match seed, sim frame, player index). Every export is a no-op for any other rosterKey.
import {DASH_STATS,DASH_PARR_KEY,DASH_PARR_MOVES,MOMENTUM,DASH_ENERGY,DASH_COMBO_SCALE,SIDESTEP,PANIC_RUN,CANT_CATCH_ME,INCREDI_RUSH,SPECIAL_KEYS,FLASH_TIME} from './dashParrData.js'
import {hashRandom} from './flight.js'
import {applyScaledDamage} from './combat.js'   // runtime-only use (rush hits); combat.js imports this module's hooks

export const isDashParr=f=>f?.rosterKey===DASH_PARR_KEY
export const dashParrState=f=>f._dashParr ||= {tick:0,clock:0,prev:{},edges:{},used:{},hist:[],taps:{fwd:[],back:[],down:[]},
 momentum:0,still:0,blurReady:false,blurSpent:0,sidestepCd:0,panicUsed:false,cccUsed:0,combo:{steps:0,last:null},serial:0,
 lowProfile:false,phase:false,lap:null,ult:null,lock:0,airFlurry:false,ft:false,ftFrames:0,cues:[],stats:{hitsLanded:0,hitsTaken:0,sprintFrames:0,blurs:0,flashTimes:0}}

export function clearDashParr(f){
 if(!f)return
 delete f._dashParr;delete f._dashParrRemoteInput
}
const slot=o=>o?.playerNumber||(o?.side==='p2'?2:1)
export const momentumTier=f=>{const m=f?._dashParr?.momentum||0;return m>=MOMENTUM.blurAt?'blur':m>=MOMENTUM.sprintAt?'sprint':'jog'}
const stageW=W=>(W?.stageWidth?.()||3200)
const clampX=(f,x,W)=>Math.max(0,Math.min(stageW(W)-(f.w||48),x))

// ── physics.js hooks ──────────────────────────────────────────────────────────────────────────────────────
// Walk / run speed multiplier from the Momentum tier (1 for everyone else → byte-identical movement).
export function dashParrWalkMul(f){return isDashParr(f)?MOMENTUM.speedMul[momentumTier(f)]:1}
// Body phasing: Blur Dash / Laps / Sidestep / Panic Run / Incredi-Rush pass through the opponent's body.
export function dashParrPhasing(a,b){return !!((isDashParr(a)&&a._dashParr?.phase)||(isDashParr(b)&&b._dashParr?.phase))}

// ── abilities.js hook ─────────────────────────────────────────────────────────────────────────────────────
// Super Speed passive recharge 4/s. Returns true when handled (dash_parr only).
export function dashParrRegen(f){
 if(!isDashParr(f))return false
 if(!(f.maxEnergy>0)||f.infiniteEnergy)return true
 if(f._dashParr?.ft)return true   // no passive regen while Flash Time drains
 f.energy=Math.min(f.maxEnergy,(f.energy||0)+DASH_ENERGY.regenPerFrame);return true
}

// ── combat.js hooks ───────────────────────────────────────────────────────────────────────────────────────
// applyScaledDamage: energy on hit (+4 landed / +3 taken), Momentum +6 on a damaging hit landed, Can't Catch Me
// (first hit taken at Sprint+ tier deals −30%). Block chip never counts as a hit. Returns the (maybe reduced) raw.
export function dashParrDamageMods(target,raw,opts={}){
 const atk=opts.attacker
 if(!(raw>0)||opts.source==='block-chip')return raw
 if(!isDashParr(target)&&!isDashParr(atk))return raw
 if(isDashParr(target)&&target.health>0){
  const s=dashParrState(target)
  if(s.momentum>=MOMENTUM.sprintAt){raw*=CANT_CATCH_ME;s.cccUsed++;s.cues.push('ccm')}
  s.momentum=0;s.blurReady=false;s.stats.hitsTaken++
  target.energy=Math.min(target.maxEnergy||100,(target.energy||0)+DASH_ENERGY.onTaken)
 }
 if(isDashParr(atk)&&atk!==target&&target?.health>0){
  const s=dashParrState(atk)
  s.stats.hitsLanded++
  atk.energy=Math.min(atk.maxEnergy||100,(atk.energy||0)+DASH_ENERGY.onHit)
  gainMomentum(atk,s,MOMENTUM.hitGain)
 }
 return raw
}
function gainMomentum(f,s,v){
 const was=s.momentum;s.momentum=Math.min(MOMENTUM.max,s.momentum+v)
 if(was<MOMENTUM.blurAt&&s.momentum>=MOMENTUM.blurAt){s.blurReady=true;s.stats.blurs++;s.cues.push('blur')}
}
// 85% per combo STEP: a multi-hit move is one step (Flurry's 8 punches share one scale).
export function dashParrComboScale(f){
 const s=f?._dashParr,a=f?.currentAttack
 if(!s||!(f.comboCounter>0))return 1
 const k=a?.dp&&s.combo.last===a.dp.serial?s.combo.steps-1:s.combo.steps
 return Math.pow(DASH_COMBO_SCALE,Math.max(0,k))
}
export function dashParrHitbox(f){
 const a=f.currentAttack,m=a?.dp
 if(!m||m.noBody)return {x:0,y:0,w:0,h:0}
 if(m.lapTarget){const L=m.lapTarget;return {x:L.x-24,y:L.y,w:L.w+48,h:L.h}}
 if(m.sweep){const x0=Math.min(m.sweep[0],m.sweep[1]),x1=Math.max(m.sweep[0],m.sweep[1]);return {x:x0,y:f.y+(m.boxY??12),w:x1-x0+f.w,h:a.rangeY}}
 return {x:m.dir===1?f.x+f.w:f.x-a.rangeX,y:f.y+(m.boxY??20),w:a.rangeX,h:a.rangeY}
}
export function dashParrHurtbox(f){
 if(!isDashParr(f)||!f._dashParr?.lowProfile)return null
 return {x:f.x+6,y:f.y+f.h*0.62,w:Math.max(1,f.w-12),h:f.h*0.38}
}
// Block: authored on-block advantage (blockstun = attacker's remaining frames + onBlock) for Dash's moves;
// any block BY Dash zeroes his Momentum.
export function dashParrBlock(atkF,d,a,flawless=false){
 if(isDashParr(d)){const s=dashParrState(d);s.momentum=0;s.blurReady=false}
 if(!isDashParr(atkF)||!a?.dp)return
 a.dp.blocked=true
 if(flawless)return
 d.blockstun=Math.max(1,(a.timer||0)+a.dp.onBlock+1)   // +1: blockstun ticks down on the block frame itself (measured)
}
export function dashParrHit(atkF,d,a,{armored=false}={}){
 if(!isDashParr(atkF)||!a?.dp)return
 const s=dashParrState(atkF)
 if(!(atkF.comboCounter>0))s.combo={steps:0,last:null}
 if(s.combo.last!==a.dp.serial){s.combo.steps++;s.combo.last=a.dp.serial}
 if(!armored)a.dp.clean=true
 atkF._cmdHitLanded=true;s.cues.push(a.name==='flurry'?'pop':'hit')
}

// ── moves ─────────────────────────────────────────────────────────────────────────────────────────────────
export function startDashParrMove(f,key,startMove,W,{cancel=false,opp=null}={}){
 if(!isDashParr(f))return false
 const s=dashParrState(f);let md=DASH_PARR_MOVES[key];const g=!!(f.onGround||f.grounded)
 if(!md||f.health<=0||f.isGrabbed||f.knockdownState||s.lock>0)return false
 if(f.hitstun>0&&key!=='panic')return false
 if(f.blockstun>0)return false
 const special=SPECIAL_KEYS.includes(key),free=special&&s.momentum>=MOMENTUM.blurAt
 const cost=free?0:(md.cost||0)
 if((f.energy||0)<cost)return false
 if((special||md.isUltimate)&&((f.disabledSpecials||[]).includes('special')||f._gaDisabled>0))return false
 if(!g&&!(key==='air'||md.airOk))return false
 if(g&&key==='air')return false
 if(key==='sidestep'&&s.sidestepCd>0)return false
 if(md.sprintFast&&momentumTier(f)!=='jog')md={...md,startup:md.startup-MOMENTUM.startupBonus.sprint}
 if(cancel){f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0}
 if(!startMove(f,key,md))return false
 f.energy=Math.max(0,(f.energy||0)-cost);f.currentMove=key
 if(free){s.momentum=0;s.blurReady=false;s.blurSpent++;s.cues.push('free')}
 const dir=f.facing||1
 f.currentAttack.dp={key,dir,origin:f.x,serial:++s.serial,onBlock:md.onBlock,clean:false,blocked:false,noBody:!!md.noBody,free,cost}
 f.currentAttack.hasHit=!!md.noBody;f.isBlocking=false;f.isCharging=false
 if(g)f.vx=0
 if(md.launcher)f.jumpHeld=true
 if(key==='laps'){const o=opp,d=o?Math.abs((o.x+o.w/2)-(f.x+f.w/2)):Infinity;s.lap={locked:!!(o&&o.health>0&&d<=md.lapRange),side:o&&o.x>f.x?1:-1}}
 if(key==='flurry')s.airFlurry=!g
 if(key==='sidestep'){
  s.sidestepCd=SIDESTEP.cooldown
  const o=opp,close=o&&Math.abs((o.x+o.w/2)-(f.x+f.w/2))<=SIDESTEP.behindRange
  const to=close?(o.x>f.x?o.x+o.w+8:o.x-f.w-8):f.x-dir*SIDESTEP.awayPx
  f.currentAttack.dp.to=clampX(f,to,W);f.currentAttack.dp.behind=!!close
 }
 if(key==='panic'){
  const o=opp,away=o&&o.x>f.x?-1:1
  f.currentAttack.dp.to=clampX(f,f.x+away*PANIC_RUN.distance,W)
  f.invulnTimer=Math.max(f.invulnTimer||0,PANIC_RUN.invuln)
 }
 s.cues.push(key==='blurDash'?'whoosh':key==='flurry'?'flurry':key==='laps'?'laps':key==='rush'?'rush':key==='sidestep'||key==='panic'?'whoosh':'swing')
 return true
}

// ── per-frame tick (sim) ──────────────────────────────────────────────────────────────────────────────────
// Raw direction history (facing-relative) → motion tokens for the command layer.
function token(r){return r[0]&&r[1]?'df':r[0]&&r[2]?'db':r[0]?'d':r[1]?'f':r[2]?'b':'n'}
export function motionTokens(hist,win){const out=[];const h=hist.slice(-win);for(const r of h){const t=token(r);if(out[out.length-1]!==t)out.push(t)}return out}
const tail=(toks,skip)=>toks.filter(t=>t!=='n'&&!skip.includes(t))
export function readMotion(hist){
 const t30=tail(motionTokens(hist,30),['df']),t15=tail(motionTokens(hist,15),['df']),tb=tail(motionTokens(hist,15),['db'])
 const ends=(a,b)=>a.length>=b.length&&b.every((x,i)=>a[a.length-b.length+i]===x)
 return {dqcf:ends(t30,['d','f','d','f']),qcf:ends(t15,['d','f']),qcbd:ends(tb,['b','d'])}
}
// ── FLASH TIME (Back + Special toggle) ──
// game.js _oppTimeScaleOf reads this: the fraction of normal speed Dash imposes on his foe (0 = not slowing).
export function dashParrOppTimeScale(user){return isDashParr(user)&&user._dashParr?.ft?FLASH_TIME.oppSlow:0}
export const dashParrFlashTimeActive=f=>!!(isDashParr(f)&&f._dashParr?.ft)
export function toggleDashParrFlashTime(f){
 if(!isDashParr(f))return false
 const s=dashParrState(f)
 if(s.ft){endFlashTime(s);return true}
 if((f.energy||0)<FLASH_TIME.threshold)return false
 s.ft=true;s.ftFrames=0;s.stats.flashTimes++;f.isBlocking=false;s.cues.push('flashOn');return true
}
function endFlashTime(s){if(!s.ft)return;s.ft=false;s.cues.push('flashOff')}
const recentTaps=(arr,tick,win)=>arr.filter(t=>tick-t<=win).length

export function tickDashParr(f,opp,raw,W,startMove,seed=0){
 if(!isDashParr(f)){if(f?._dashParr)clearDashParr(f);return}
 // The shared fighter factory / round revert stamps the generic speed 84 / dash 16 → re-apply Dash's own stats
 // (Killua Zoldyck's: walk 8.75 px/f, run 10.45 px/f). Same contract as batmanState.tickBatman; a speed modifier (other values) is kept.
 if(f.baseSpeed===84&&f.dashSpeed===16){const st=DASH_STATS;f.baseSpeed=f.speed=st.speed;f.dashSpeed=st.dashSpeed;f.dashDuration=st.dashDuration;f.dashCooldownMax=st.dashCooldownMax}
 const s=dashParrState(f);s.tick++
 const fw=!!(f.facing===-1?raw.left:raw.right),bk=!!(f.facing===-1?raw.right:raw.left)
 const p=s.hist[s.hist.length-1]||[0,0,0]
 s.hist.push([raw.down?1:0,fw?1:0,bk?1:0]);if(s.hist.length>32)s.hist.shift()
 if(fw&&!p[1])s.taps.fwd.push(s.tick);if(bk&&!p[2])s.taps.back.push(s.tick);if(raw.down&&!p[0])s.taps.down.push(s.tick)
 for(const k of ['fwd','back','down'])s.taps[k]=s.taps[k].filter(t=>s.tick-t<=16)
 const mo=readMotion(s.hist)
 for(const k of ['light','heavy','special','ultimate','upAttack']){const v=!!raw[k];if(v&&!s.prev[k])s.edges[k]={tick:s.tick,clock:s.clock,down:!!raw.down,up:!!raw.up,fwd:fw,back:bk,block:!!raw.block,
  ...mo,fwdTap2:recentTaps(s.taps.fwd,s.tick,14)>=2,backTap2:recentTaps(s.taps.back,s.tick,14)>=2,downTap2:recentTaps(s.taps.down,s.tick,15)>=2};s.prev[k]=v}
 if(f.health<=0||opp?.health<=0){s.phase=false;s.lowProfile=false;s.ft=false;if(s.ult)endRush(f,opp,s,W,true);return}
 // PANIC RUN — Block + Heavy while being comboed (3+ hits), 40 energy, once per round. Read even in hitstun.
 {const e=s.edges.heavy;if(e&&s.used.heavy!==e.tick&&e.block&&s.tick-e.tick<=2&&f.hitstun>0&&!s.panicUsed&&(f.energy||0)>=PANIC_RUN.cost&&(opp?.comboCounter||0)>=PANIC_RUN.minHitsTaken&&!f.isGrabbed){
  s.used.heavy=e.tick;s.panicUsed=true;f.energy-=PANIC_RUN.cost;f.hitstun=0;f.stun=0;f.knockdownState=false;f.attacking=false;f.currentAttack=null;f.attackCooldown=0
  if(opp){opp.comboCounter=0;opp.comboTimer=0}
  startDashParrMove(f,'panic',startMove,W,{opp})}}
 if(f.hitstop>0)return
 s.clock++
 if(s.sidestepCd>0)s.sidestepCd--
 if(s.ft){s.ftFrames++;f.isBlocking=false;f.energy=Math.max(0,(f.energy||0)-FLASH_TIME.drain);if(f.energy<=0)endFlashTime(s)}
 if(s.lock>0){s.lock--;f.vx=0}
 const g=!!(f.onGround||f.grounded),a=f.attacking?f.currentAttack:null,m=a?.dp,t=a?a.total-a.timer:-1
 // ── MOMENTUM (GAME_STATE) ──
 if(f.hitstun>0||f.blockstun>0||f.isGrabbed){s.momentum=0;s.blurReady=false;s.still=0}
 else if(!a&&g){
  const sp=Math.abs(f.vx||0)
  if(sp>=MOMENTUM.runMinSpeed||(f.dashTimer||0)>0){gainMomentum(f,s,MOMENTUM.runFill);s.still=0}
  else if(sp<0.5){if(++s.still>=MOMENTUM.stillFrames){s.momentum=0;s.blurReady=false}}
  else s.still=0
 }else s.still=0
 if(momentumTier(f)!=='jog')s.stats.sprintFrames++
 s.phase=false;s.lowProfile=false
 if(!m){if(s.ult)endRush(f,opp,s,W,true);return}
 if(f.hitstun>0||f.isGrabbed){if(s.ult)endRush(f,opp,s,W,true);return}
 f.facing=m.dir
 const md=DASH_PARR_MOVES[m.key]
 // multi-hit re-arm (Flurry 8 / Laps 4)
 // index-based so a re-arm frozen under hitstop is never skipped
 // (the tick runs before the combat timer advances, so a hit due on elapsed tick T is re-armed at T-1)
 if(md.hitTicks){m.hi=m.hi||1;if(m.hi<md.hitTicks.length&&t>=md.hitTicks[m.hi]-1){a.hasHit=false;m.hi++}
  m.hitstop=m.hi>=md.hitTicks.length?null:md.chainHitstop}
 if(m.key==='flurry'&&s.airFlurry&&!g&&t<a.activeEnd+1){f.vy=0;f.vx=0}
 if(md.travel&&t>=md.travel[0]&&t<md.travel[1]&&g)f.x=clampX(f,f.x+m.dir*md.travel[2],W)
 if(m.key==='blurDash'&&t>=a.activeStart&&t<=a.activeEnd){const x0=f.x;f.x=clampX(f,f.x+m.dir*md.dashPx/md.active,W);m.sweep=[x0,f.x];s.phase=true;f.vx=0}
 else if(m.key==='blurDash')m.sweep=null
 if(m.key==='hydro'){
  if(t>=a.activeStart&&t<=a.activeEnd&&!m.clean){f.x=clampX(f,f.x+m.dir*md.skimPx/md.active,W);f.vx=0}
  s.lowProfile=t>=md.lowProfile[0]-1&&t<=md.lowProfile[1]-1   // tick runs one frame ahead of the combat timer
 }
 if(m.key==='laps'){
  s.phase=t>=a.activeStart&&t<=a.activeEnd
  m.lapTarget=s.lap?.locked&&opp&&t>=a.activeStart&&t<=a.activeEnd?{x:opp.x,y:opp.y,w:opp.w||48,h:opp.h||94}:null
  if(t===a.activeEnd){
   if(s.lap?.locked&&opp)f.x=clampX(f,s.lap.side>0?opp.x+(opp.w||48)+6:opp.x-f.w-6,W)
   gainMomentum(f,s,md.momentumGain);s.lap=null
  }
 }
 if(m.key==='sidestep'||m.key==='panic'){
  const span=m.key==='sidestep'?6:12
  if(t>=1&&t<=span){s.phase=true;f.x=clampX(f,m.origin+(m.to-m.origin)*t/span,W);f.vx=0}
  if(m.key==='sidestep'&&t===SIDESTEP.iStart-1)f.invulnTimer=Math.max(f.invulnTimer||0,SIDESTEP.iEnd-SIDESTEP.iStart+2)   // set on move frame 1 → invulnerable frames 2..10 (the engine decrements it the frame it is set)
 }
 if(m.key==='rush')tickRush(f,opp,s,a,t,W,seed)
}

// ── INCREDI-RUSH (ultimate) ───────────────────────────────────────────────────────────────────────────────
function tickRush(f,opp,s,a,t,W,seed){
 const R=INCREDI_RUSH
 if(t===R.startup){
  const d=opp?Math.abs((opp.x+opp.w/2)-(f.x+f.w/2)):Infinity
  if(opp&&opp.health>0&&d<=R.range&&!(opp.invulnTimer>0)){s.ult={hits:0,lx:opp.x,ly:opp.y,pos:null,dealt:0};opp.attacking=false;opp.currentAttack=null;opp.isBlocking=false;s.cues.push('lock')}
  else{a.timer=Math.min(a.timer,30)}   // whiff: storm skipped, short recovery
 }
 const u=s.ult
 if(!u)return
 const st=t-R.startup
 if(st>=0&&st<R.storm){
  s.phase=true;f.vx=0;f.vy=0
  opp.x=u.lx;opp.y=u.ly;opp.vx=0;opp.vy=0;opp.hitstun=Math.max(opp.hitstun||0,4);opp.isBlocking=false;opp.attacking=false;opp.currentAttack=null
  const every=R.storm/R.hits
  if(st%every===every-1&&u.hits<R.hits){
   const pi=slot(f),r1=hashRandom(seed,s.clock,pi),r2=hashRandom(seed,s.clock+7919,pi)
   const side=r1<0.5?-1:1,ang=r2*Math.PI   // hashed position around the target: side + height arc
   u.pos={dx:side*(30+Math.round(r2*50)),dy:-Math.round(Math.sin(ang)*60),side,hit:u.hits}
   const dealt=opp.health
   applyRushHit(f,opp,R.damage[u.hits])
   u.dealt+=dealt-opp.health;u.hits++;s.cues.push('rushHit')
   if(opp.health<=0){endRush(f,opp,s,W,false);return}
  }
 }
 if(st===R.storm)endRush(f,opp,s,W,false)
}
function applyRushHit(f,opp,v){applyScaledDamage(opp,v,{scale:1,attacker:f,move:'rush',source:'dash_parr_rush',tier:'big'});opp.colorFlash=6}
function endRush(f,opp,s,W,interrupted){
 const u=s.ult;s.ult=null;s.phase=false
 if(!u||!opp)return
 if(!interrupted){
  const side=u.pos?.side||1
  f.x=clampX(f,side>0?u.lx+(opp.w||48)+10:u.lx-f.w-10,W)
  if(opp.health>0){opp.hitstun=Math.max(opp.hitstun||0,30);opp.vx=-side*6;opp.vy=-7}
  s.cues.push('rushEnd')
 }
}
export const dashParrLocked=f=>isDashParr(f)&&((f._dashParr?.lock>0)||(f.attacking&&!(f.currentAttack?.launcher&&f.currentAttack?.hasHit)))
