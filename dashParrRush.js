// Dash Parr — INCREDI-RUSH, the cinematic ultimate (SIMULATION half). Owned by the shared FROZEN-CINEMATIC slot
// (cineRegistry.js): while active game.js freezes combat / physics / input and calls update(ctx) once per frame; clear()
// runs on every reset path. The render half (dashParrRushFx.js) only reads rushScene().
//   Beats (scene frames, RUSH_SCENE in dashParrData.js; hit-stop frames hold the scene on top of these):
//   OPEN    0-29   letterbox + title cut-in; the world drains to a frozen blue-grey; Dash glints and vanishes (f20)
//   FLURRY  34-113 11 hits from every side (hashed slots, sides alternate → whip-pans), each with a hit-stop scaled to
//                  the hit; the foe is lifted a little more with each one and hit 11 launches them high
//   RUNUP   120    Dash streaks to the far side of the stage and drops into a sprinter's stance while the foe hangs
//   RUN     150    the sprint across the whole stage (accelerating), the leap at 164
//   IMPACT  172    hit 12, the SONIC-BOOM punch: impact frame, rings, colour snaps back, the foe is blasted away
//   END     214    letterbox out → the foe lands knocked down, Dash finishes his recovery (INCREDI_RUSH.recovery)
// Deterministic: positions are pure functions of the scene frame + hashRandom(match seed, …); no Math.random, no clock.
// Damage goes through applyScaledDamage (the world's damage path; same call the old storm used). A KO on any flurry hit
// jumps straight to the IMPACT beat (the KO hit becomes the big one) and the scene ends cleanly.
import {INCREDI_RUSH,RUSH_SCENE} from './dashParrData.js'
import {hashRandom} from './flight.js'
import {applyScaledDamage} from './combat.js'   // runtime-only (combat.js imports dashParrState → this module)
import {registerFreezeCine} from './cineRegistry.js'
import {playDashParrCue} from './dashParrSound.js'   // presentation only (WebAudio); never reads or writes sim state

const R=RUSH_SCENE
const cine={active:false}
export const isDashRushActive=()=>!!cine.active
export const rushScene=()=>(cine.active?cine:null)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u)}
const ctr=o=>(o.x||0)+(o.w||48)/2
const feet=o=>(o.y||0)+(o.h||94)
const sfx=(ctx,id,gain=0.8)=>{try{ctx?.sound?.playJuiceSfx?.(id,{gain})}catch(_){}}
// Dash's own synth layer, played directly (the cue queue is drained by the sim tick, which is frozen during the scene)
const cue=(c,n)=>{try{playDashParrCue(n,c.caster)}catch(_){}}

// Called by dashParrState.tickRush on the opener's lock frame (Dash grounded, foe within range, not invulnerable).
export function startDashRush(f,t,W,seed=0){
 if(cine.active||!f||!t||!(t.health>0))return false
 const s=f._dashParr;if(!s)return false
 const stage=W?.stageWidth?.()||3200,dir=ctr(t)>=ctr(f)?1:-1,floor=feet(f)
 const tx=ctr(t),pi=f.playerNumber||(f.side==='p2'?2:1)
 // FLURRY plan: sides alternate (with a hashed swap now and then) so every hit is a whip-pan; heights hashed per slot.
 const plan=[];let side=-dir
 for(let i=0;i<R.hitAt.length;i++){
  const r1=hashRandom(seed,7919*(i+1)+tx|0,pi),r2=hashRandom(seed,104729*(i+1)+floor|0,pi)
  if(i>0&&r1<0.22)side=side; else side=-side
  const tier=i===R.hitAt.length-1?0:r2<0.34?0:r2<0.7?1:2   // 0 = low / ground, 1 = mid, 2 = high (airborne)
  plan.push({at:R.hitAt[i],side,dx:side*(44+Math.round(r1*34)),dy:tier===0?0:tier===1?-34-Math.round(r2*16):-78-Math.round(r2*28),tier,act:i%3===0?'ultimate':i%3===1?'heavy':'flurry'})
 }
 // RUN: from the stage edge FARTHER from the foe (a run across the whole stage, capped), blasting them toward the other side.
 const leftRoom=tx,rightRoom=stage-tx,runDir=leftRoom>=rightRoom?1:-1
 const runFrom=clamp(tx-runDir*R.maxRun,360,stage-360)
 Object.assign(cine,{active:true,k:0,f:0,real:0,stop:0,stopMax:0,caster:f,target:t,W,stage,dir,runDir,runFrom,floor,
  cx0:ctr(f),tx,ty0:t.y,y0k:R.impact-1,tFloor:floor-(t.h||94),fFloor:floor-(f.h||94),plan,hits:0,dealt:0,ko:false,lastHit:-99,impactAt:-1,
  blastFrom:tx,blastTo:clamp(tx+runDir*R.blastPx,(t.w||48)/2+10,stage-(t.w||48)/2-10)})
 s.ult={k:0,hits:0,dealt:0,pos:null,phase:'open'}
 f.vx=0;f.vy=0;f.facing=dir;f.isBlocking=false
 t.hitstun=Math.max(t.hitstun||0,9999);t.isBlocking=false;t.attacking=false;t.currentAttack=null;t.vx=0;t.vy=0;t.facing=-dir
 cue(cine,'lock');cue(cine,'rush')
 return true
}

function strike(ctx,i){
 const c=cine,t=c.target,f=c.caster
 if(!(t.health>0))return
 const before=t.health
 try{applyScaledDamage(t,INCREDI_RUSH.damage[i],{scale:1,attacker:f,move:'rush',source:'dash_parr_rush',tier:'big'})}catch(_){}
 c.hits++;c.dealt+=Math.max(0,before-t.health);c.lastHit=c.k
 f.comboCounter=(f.comboCounter||0)+1;f.comboTimer=90
 t.colorFlash=i===INCREDI_RUSH.hits-1?14:6
 const s=f._dashParr
 if(s?.ult){const p=c.plan[i]||{side:c.runDir,dx:0,dy:0};s.ult.hits=c.hits;s.ult.dealt=c.dealt;s.ult.pos={dx:p.dx,dy:p.dy,side:p.side,hit:i}}
 if(!(t.health>0))c.ko=true
}

// foe lift (feet above the floor) at scene frame k: nudged up from hit 6, launched by hit 11, hanging in slow motion
function lift(k){
 const H=R.hitAt,L=R.launchH
 if(k<H[5])return 0
 if(k<H[10])return 6*Math.min(5,Math.floor((k-H[5])/((H[10]-H[5])/5))+1)
 if(k<R.impact){const u=1-Math.pow(1-clamp((k-H[10])/8,0,1),3);return 30+(L-30)*u-Math.max(0,k-H[10]-8)*0.15}   // launched, then a slow-motion drift down   // slow-motion drift down
 return null
}
export function rushLift(k){return lift(k)}

function update(ctx={}){
 const c=cine;if(!c.active)return
 const f=c.caster,t=c.target
 if(!f||!t)return clear()
 c.real++
 if(c.stop>0){c.stop--;
  // hit-stop: the scene holds; the foe trembles in place (y only, x stays pinned)
  if(t.health>0&&c.k<R.impact+1)t.y=c.tFloor-(lift(c.f)??0)+((c.real%2)?2:-2)
  camera(ctx);return}
 const k=c.k
 events(ctx,k)
 if(!c.active)return
 place(k)
 c.f=k
 if(f._dashParr?.ult){f._dashParr.ult.k=k;f._dashParr.ult.phase=k<R.hitAt[0]?'open':k<R.runup?'flurry':k<R.run?'runup':k<R.impact?'run':'impact'}
 camera(ctx)
 c.k++
 if(c.k>R.end)finish()
}

function events(ctx,k){
 const c=cine,H=R.hitAt
 if(k===0){sfx(ctx,'sting_pitch_rise_hold',0.9);sfx(ctx,'pitch_drop_slowmo',0.8);sfx(ctx,'boom_anticipation_suck',0.5);ctx.camera?.shake?.(6,8)}
 if(k===8)sfx(ctx,'energy_tone_hold',0.45)
 if(k===R.vanish){sfx(ctx,'swish_fast_01',0.8);cue(c,'rushZip')}
 for(let i=0;i<H.length;i++){
  if(k===H[i]-3){sfx(ctx,'swish_fast_0'+(1+i%3),0.55+0.03*i);cue(c,'rushZip')}
  if(k===H[i]){
   strike(ctx,i)
   const big=i===H.length-1
   c.stop=c.stopMax=R.stop[i]
   sfx(ctx,big?'hit_heavy_boom_01':i%2?'impact_crack_01':'impact_hit_01',0.6+0.035*i)
   if(i>=4&&i%2===0)sfx(ctx,'crack_sizzle_bright',0.35+0.03*i)
   if(i===5)sfx(ctx,'hit_flurry_01',0.6)
   if(big)sfx(ctx,'boom_medium_01',0.8)
   cue(c,big?'rushLaunch':'rushHit')
   ctx.camera?.shake?.(big?14:3+i*0.7,big?14:5+(i>>1))
   if(c.ko){c.koSkip=true;c.y0k=k;c.k=R.impact;return}   // KO: straight to the IMPACT beat (the KO hit becomes the big one)
  }
 }
 if(k===R.runup){sfx(ctx,'whoosh_medium_01',0.8);cue(c,'rushZip')}
 if(k===R.runup+8){sfx(ctx,'charge_swell_riser',0.85);sfx(ctx,'energy_hum_low',0.5)}
 if(k===R.run){sfx(ctx,'whoosh_medium_02',0.9);sfx(ctx,'charge_hum_rise',0.6);cue(c,'rushRun')}
 if(k===R.impact-9)sfx(ctx,'boom_anticipation_suck',0.9)
 if(k===R.leap)sfx(ctx,'swish_fast_03',0.9)
 if(k===R.impact){
  if(!c.koSkip||c.target.health>0)strike(ctx,INCREDI_RUSH.hits-1)
  c.impactAt=c.real
  c.stop=c.stopMax=R.impactStop
  sfx(ctx,'impact_frame_boom_long',1);sfx(ctx,'boom_huge_02_roar',1);sfx(ctx,'hit_heavy_boom_01',0.9);sfx(ctx,'boom_huge_01',0.7)
  cue(c,'sonicBoom')
  ctx.camera?.shake?.(30,30)
 }
 if(k===R.impact+R.blast-2){sfx(ctx,'rumble_tail_01',0.9);sfx(ctx,'boom_medium_02',0.7);ctx.camera?.shake?.(12,12)}
}

// Dash's and the foe's sim positions at scene frame k (Dash's real x/y follow his drawn position so the scene ends where he stands).
export function dashRushPose(k){
 const c=cine,H=R.hitAt,P=c.plan,tf=c.tFloor+(c.target.h||94)
 if(k<R.vanish)return {x:c.cx0,feet:c.floor,dir:c.dir,act:'ultimate',fr:k<10?0:2,vis:1}
 if(k<R.runup){
  let i=-1;for(let j=0;j<H.length;j++)if(H[j]<=k)i=j
  const nx=P[i+1],cur=P[i]
  const footOf=p=>tf-(lift(k)??0)+(p?p.dy:0)
  if(cur&&k-cur.at<4)return {x:c.tx+cur.dx,feet:footOf(cur),dir:-cur.side,act:cur.act,fr:cur.act==='ultimate'?1:cur.act==='heavy'?1:3,vis:1,hit:i}
  if(nx&&nx.at-k<=2)return {x:c.tx+nx.dx,feet:footOf(nx),dir:-nx.side,act:'ultimate',fr:0,vis:1,wind:true}
  const from=cur?{x:c.tx+cur.dx,y:footOf(cur)}:{x:c.cx0,y:c.floor},to=nx?{x:c.tx+nx.dx,y:footOf(nx)}:{x:c.runFrom,y:c.floor}
  const a=cur?cur.at+4:R.vanish,b=nx?nx.at-2:R.runup,u=clamp((k-a)/Math.max(1,b-a),0,1)
  return {x:from.x+(to.x-from.x)*u,feet:from.y+(to.y-from.y)*u,dir:to.x>=from.x?1:-1,act:'run',fr:k,vis:0,zip:{x0:from.x,y0:from.y,x1:to.x,y1:to.y,u}}
 }
 if(k<R.run){const u=clamp((k-R.runup)/8,0,1)
  if(u<1){const from=c.tx+(P[P.length-1]?.dx||0);return {x:from+(c.runFrom-from)*u,feet:c.floor,dir:c.runDir,act:'run',fr:k,vis:0,zip:{x0:from,y0:c.floor-60,x1:c.runFrom,y1:c.floor,u}}}
  return {x:c.runFrom,feet:c.floor,dir:c.runDir,act:k<R.run-10?'low':'ultimate',fr:0,vis:1,stance:true}}
 const hitX=c.tx-c.runDir*36,fy=Math.min(c.floor,tf-(lift(c.y0k)??R.launchH)+22)
 if(k<R.impact){const u=(k-R.run)/(R.impact-R.run),e=Math.pow(u,1.7)
  const x=c.runFrom+(hitX-c.runFrom)*e,lu=clamp((k-R.leap)/(R.impact-R.leap),0,1)
  return {x,feet:c.floor+(fy-c.floor)*Math.sin(lu*Math.PI/2),dir:c.runDir,act:k>=R.leap?'ultimate':'run',fr:k>=R.leap?4:k,vis:1,run:true,speed:(hitX-c.runFrom)/(R.impact-R.run)}}
 // impact + aftermath: Dash holds the punch, then drops and skids to a stop
 const v=k-R.impact
 if(v<6)return {x:hitX,feet:fy,dir:c.runDir,act:'ultimate',fr:4,vis:1}
 const u=clamp((v-6)/14,0,1)
 return {x:hitX+c.runDir*60*ease(u),feet:fy+(c.floor-fy)*Math.min(1,u*1.6),dir:c.runDir,act:u<1?'low':'win',fr:u<1?0:1,vis:1}
}
function foeAt(k){
 const c=cine,l=lift(k)
 if(l!=null)return {x:c.tx,y:c.tFloor-l}
 const v=k-R.impact,u=clamp(v/R.blast,0,1),e=1-Math.pow(1-u,2.4),y0=c.tFloor-(lift(c.y0k)??R.launchH)
 return {x:c.blastFrom+(c.blastTo-c.blastFrom)*e,y:y0+(c.tFloor-y0)*Math.min(1,u*u*1.15)-Math.sin(Math.PI*u)*30*(1-u)}
}
export function rushFoeAt(k){return foeAt(k)}
function place(k){
 const c=cine,f=c.caster,t=c.target,p=dashRushPose(k),o=foeAt(k)
 f.x=clamp(p.x-(f.w||48)/2,0,c.stage-(f.w||48));f.y=p.feet-(f.h||94);f.facing=p.dir;f.vx=0;f.vy=0
 t.x=clamp(o.x-(t.w||48)/2,0,c.stage-(t.w||48));t.y=o.y;t.vx=0;t.vy=0;t.isBlocking=false
 if(k<R.impact)t.facing=-c.dir
 // the flurry keeps the foe's x pinned (the storm happens AROUND them); only the finisher moves them
}
function camera(ctx){
 const c=cine,cam=ctx.camera;if(!cam?.focusOnFighter)return
 const k=c.f,f=c.caster,t=c.target,H=R.hitAt,box=(x,y)=>({x:x-24,y:y-47,w:48,h:94})
 const tc={x:ctr(t),y:t.y+(t.h||94)/2}
 if(k<R.vanish+6)cam.focusOnFighter(f,1.15)
 else if(k<R.runup){let i=0;for(let j=0;j<H.length;j++)if(H[j]<=k+2)i=j
  const p=c.plan[i];cam.focusOnFighter(box(tc.x+p.side*40,tc.y-10),1.15)}   // whip toward the side of the next/current hit
 else if(k<R.run)cam.focusOnFighter(box(c.runFrom+c.runDir*120,c.floor-60),1.15)
 else if(k<R.impact)cam.focusOnFighter(box(c.tx-c.runDir*160,c.floor-110),1.12)   // the camera whips ahead to the impact point; Dash runs INTO frame
 else if(k<R.impact+6)cam.focusOnFighter(box(c.tx-c.runDir*60,t.y+40),1.15)
 else if(k<R.impact+R.blast)cam.focusBetween?.(f,t,1.1)
 else cam.focusBetween?.(f,t,1.0)
}

function finish(){
 const c=cine,f=c.caster,t=c.target
 if(t){t.vx=0;t.vy=0;t.hitstun=0;t.y=c.tFloor
  if(t.health>0){t.knockdownState=true;t.knockdownTimer=Math.max(t.knockdownTimer||0,52)}}
 if(f){f.y=c.fFloor;f.vx=0;f.vy=0
  const s=f._dashParr
  // the Rush move ends here; INCREDI_RUSH.recovery frames of lockout follow (s.lock: no moves, no walking)
  f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=Math.max(f.attackCooldown||0,4)
  if(s){s.ult=null;s.phase=false;s.lock=INCREDI_RUSH.recovery;s.cues.push('rushEnd')}}
 reset()
}
const reset=()=>{for(const k of Object.keys(cine))delete cine[k];cine.active=false}
// Every reset path (round reset, rematch, KO teardown, training reset, menu): restore both fighters, drop the scene.
export function clear(){
 if(!cine.active)return
 const c=cine,f=c.caster,t=c.target
 if(t){t.hitstun=0;t.vx=0;t.vy=0;t.y=c.tFloor}
 if(f){f.attacking=false;f.currentAttack=null;f.currentMove=null;f.y=c.fFloor;f.vx=0;f.vy=0;if(f._dashParr){f._dashParr.ult=null;f._dashParr.phase=false}}
 reset()
}
export const clearDashRush=clear
// a fighter being cleared (clearDashParr) drops a scene it is part of
export function dropDashRushFor(f){if(cine.active&&(cine.caster===f||cine.target===f))clear()}
export const getDashRushStatus=()=>({active:!!cine.active,k:cine.k|0,hits:cine.hits|0,dealt:cine.dealt||0,stop:cine.stop|0})

registerFreezeCine('dash_parr',{active:()=>!!cine.active,update,clear})
