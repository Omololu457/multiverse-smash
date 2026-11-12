import { INPUT_BUFFER_FRAMES } from './input.js'
// All authoritative Luffy state lives on the fighter. Plain JSON, no callbacks, timers, or target refs.
export const isLuffy = f => f?.rosterKey === 'luffy'
export function luffyState(f) {
 if(!isLuffy(f)) return null
 return f._luffy ||= {pips:0,clock:0,decay:180,neutral:0,braceCd:0,anchorUsed:false,
  wasGrounded:!!(f.onGround||f.grounded),snapUsed:false,reelUsed:false,snapUntil:0,snapQueued:false,
  pull:null,previous:{},edges:{},buffer:{},serial:0}
}
export function clearLuffy(f) {
 if(f?._luffy){delete f._luffy;delete f._luffyCue;delete f._luffyLandingVisual}
 if(f?.currentAttack?.lf){f.currentAttack=null;f.currentMove=null;f.attacking=false;f._rekkaNext=null;f._cmdHitLanded=false}
}
export function luffyInterrupted(f) {
 const s=f?._luffy;if(!s)return
 s.pull=null;s.snapUntil=0;s.snapQueued=false;f._rekkaNext=null;f._cmdHitLanded=false;delete f._luffyCue
 if(f.currentAttack?.lf){f.currentAttack=null;f.currentMove=null;f.attacking=false}
}
export function tickLuffy(f,opp,raw={}) {
 if(!isLuffy(f)){clearLuffy(f);return}
 const s=luffyState(f)
 if(f.health<=0){s.pips=0;luffyInterrupted(f);return}
 s.up = !!raw.up
 // Input edges observe the raw controls every tick, even through stun/hitstop.
 for(const k of ['light','heavy','special','ultimate','upAttack']) {
  s.edges[k]=!!raw[k]&&!s.previous[k];s.previous[k]=!!raw[k]
  s.buffer[k]=s.edges[k]?INPUT_BUFFER_FRAMES:Math.max(0,(s.buffer[k]||0)-1)
 }
 if(s.edges.special && f.currentAttack?.lfConfirmed && s.snapUntil > 0 && s.clock <= s.snapUntil && s.pips > 0 && !s.snapUsed) s.snapQueued = true
 if(f.hitstop>0)return
 s.clock++;if(s.braceCd>0)s.braceCd--
 if(s.pips>0&&--s.decay<=0){s.pips--;s.decay=120}
 const grounded=!!(f.onGround||f.grounded)
 if(f._luffyLandingVisual>0)f._luffyLandingVisual--
 if(grounded&&!s.wasGrounded){s.anchorUsed=false;f._luffyLandingVisual=6}
 s.wasGrounded=grounded
 if(f.hitstun>0||f.blockstun>0||f.isGrabbed){luffyInterrupted(f)}
 if(!opp||opp.health<=0||(!(opp.hitstun>0)&&!s.pull)) {s.snapUsed=false;s.reelUsed=false}
 if(s.pull) {
  if(!f.attacking||f.currentAttack?.lf?.kind!=='reel'||!opp||opp.side!==s.pull.side||!grounded||!(opp.onGround||opp.grounded)||opp.hitstun<=0||opp.invulnTimer>0){s.pull=null}
  else {
   const dir=Math.sign(opp.x-f.x)||f.facing||1
   const gap=dir>0?opp.x-(f.x+f.w):f.x-(opp.x+opp.w)
   const step=Math.min(11,s.pull.left,Math.max(0,gap-10))
   opp.x=Math.max(0,Math.min(s.pull.stageWidth-(opp.w||60),opp.x-dir*step));opp.vx=0
   s.pull.left-=step;s.pull.frames--
   if(s.pull.frames<=0||step<=0){s.pull=null;f.currentAttack.lfConfirmed=true;s.snapUntil=s.clock+10}
  }
 }
 // A valid fresh retap may wait for the defined late recovery; its acceptance window is not extended.
}
export function luffyRegen(f) {
 if(!isLuffy(f))return false
 const s=luffyState(f)
 if(f.health>0&&!f.attacking&&!f.isBlocking&&!f.isCharging&&!f.isGrabbed&&!(f.hitstun>0)&&!(f.blockstun>0)&&!(f.hitstop>0)&&!f.isUltimateActive){
  if(++s.neutral>=30){s.neutral-=30;f.energy=Math.min(f.maxEnergy,f.energy+1)}
 }
 return true
}
export function luffyHit(attacker,defender,atk,{blocked=false,armored=false,stageWidth=3200}={}) {
 if(!isLuffy(attacker)||!atk?.lf||blocked||armored||!(defender.health>0))return
 const s=luffyState(attacker)
 atk.lfConfirmed=true;attacker._cmdHitLanded=true
 if(atk.lf.normal&&!atk.lfRewarded){
  atk.lfRewarded=true;attacker.energy=Math.min(attacker.maxEnergy,attacker.energy+3)
  if(attacker.onGround||attacker.grounded){s.pips=Math.min(3,s.pips+1);s.decay=180}
 }
 if(atk.lf.kind==='piston'&&!s.snapUsed&&(attacker.onGround||attacker.grounded))s.snapUntil=s.clock+10
 if(atk.lf.kind==='reel'){
  atk.lfConfirmed=false
  if(!s.reelUsed&&(defender.onGround||defender.grounded)&&(attacker.onGround||attacker.grounded)&&Math.abs((defender.y+defender.h)-(attacker.y+attacker.h))<=16){
   s.reelUsed=true;s.pull={side:defender.side,left:110,frames:10,stageWidth}
  }
 }
 if(atk.lf.kind==='finale'&&atk.lfContact===0)atk.lfTarget=defender.side
}
// Balloon is a single melee-contact absorption, excluding launchers, spikes, ultimates and throws.
// Projectiles use their ordinary shared resolution; no reflection or blanket projectile immunity.
export function absorbLuffyStrike(defender,attacker) {
 if(!isLuffy(defender)||defender.hitstun>0||defender.isGrabbed)return false
 const a=defender.currentAttack, incoming=attacker?.currentAttack
 if(a?.lf?.kind!=='brace'||a.lfAbsorbed||!incoming||incoming.isUltimate||incoming.launcher||incoming.spike)return false
 const elapsed=a.total-a.timer;if(elapsed<10||elapsed>=34)return false
 a.lfAbsorbed=true;const s=luffyState(defender);s.pips=Math.min(3,s.pips+1)
 attacker.vx=-(attacker.facing||1)*5;defender.colorFlash=8;defender._luffyCue='brace'
 return true
}
// Runs immediately before the shared resolver, once per simulation attack tick.
export function prepareLuffyAttack(f,opp) {
 const a=f.currentAttack;if(!isLuffy(f)||!a?.lf)return
 const lf=a.lf,t=a.total-a.timer
 if(lf.kind==='finale' && t>=31 && !a.lfTarget){
  a.lf={kind:'finaleMiss',noHit:true};a.name='lfFinaleMiss';f.currentMove='lfFinaleMiss'
  a.timer=60;a.total=60;a.activeStart=0;a.activeEnd=0;a.hasHit=true;return
 }
 if(lf.noHit){a.hasHit=true;return}
 if(lf.advance&&t<a.activeStart)f.vx=(f.facing||1)*lf.advance
 if(lf.kind==='anchor') {
  f.vy=Math.min(18,Math.max(f.vy||0,t>=12?12:f.vy||0))
  // Once landed, a grounded vulnerable 24f recovery replaces the descent, even on whiff.
  if(t>0&&(f.onGround||f.grounded)){
   a.name='land';f.currentMove='land';a.lf={kind:'landing',noHit:true};a.timer=24;a.total=24;a.activeStart=0;a.activeEnd=0;a.hasHit=true
  }
 }
 if(lf.contacts){
  const i=lf.contacts.findIndex(([st,ac])=>t>=st&&t<st+ac)
  if(i<0){a.hasHit=true;return}
  if(i!==a.lfContact){
   a.lfContact=i;a.hasHit=false;a.damage=lf.contacts[i][2];if(lf.contacts[i][3]!=null)a.rangeX=lf.contacts[i][3]
   if(i>0&&lf.kind==='finale'&&(!a.lfTarget||opp?.side!==a.lfTarget||!(opp.hitstun>0)||opp.health<=0))a.hasHit=true
   if(i===lf.contacts.length-1){a.pushX=lf.kind==='finale'?15:9;a.hitstun=24}
  }
 }
}

// Deliberate distal-hand vulnerability; movement/body hurtboxes never use render bounds.
export function luffyLimbHurtbox(f) {
 if(!isLuffy(f)||!f.attacking||!f.currentAttack?.lf)return null
 const a=f.currentAttack,t=a.total-a.timer,k=a.lf.kind
 let reach=0
 if(k==='piston'&&t>=13&&t<22)reach=t<16?260:100
 if(k==='reel'&&t>=18&&t<26)reach=t<22?300:100
 if(!reach)return null
 return {x:f.x+f.w/2+(f.facing||1)*reach-12,y:f.y+24,w:24,h:22}
}
