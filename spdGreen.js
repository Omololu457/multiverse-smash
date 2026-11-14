// S.P.D. Green Ranger — command layer (press edges recorded in tickSpdGreen from readRawControls,
// so keyboard / pad / replay / LAN feed the same parser). Returns 'consumed' | 'grab'.
import {startMove,rekkaContinue,cancelWindowOpen} from './combat.js'
import {isSpdGreen,spdGreenState,startSpdGreenMove,spdGreenFollowOpen,spdGreenMarked} from './spdGreenState.js'
import {groundTeleportLocked} from './groundTeleport.js'
const fresh=(s,k)=>s.edges[k]&&s.used[k]!==s.edges[k].tick&&s.clock-s.edges[k].clock<=8
const use=(s,k)=>s.used[k]=s.edges[k].tick
export function updateSpdGreenCommandCombat(f,inp,opp,W){
 if(!isSpdGreen(f))return false
 const s=spdGreenState(f),g=!!(f.onGround||f.grounded),a=f.attacking?f.currentAttack:null
 if(f.hitstun>0||f.blockstun>0||f.hitstop>0||f.isGrabbed||f.knockdownState||f.health<=0||s.landing>0||s.leaping||groundTeleportLocked(f))return 'consumed'
 const fire=(k,cancel=false)=>startSpdGreenMove(f,k,startMove,W,cancel)
 // Marked Acrobat Step follow-up: fresh Heavy inside the 10-tick window only (pays 5, consumes the mark).
 if(a?.name==='gAcro2'){
  if(fresh(s,'heavy')&&spdGreenFollowOpen(f,opp,s.edges.heavy)){use(s,'heavy');fire('gFollow',true)}
  return 'consumed'
 }
 // Forward+Heavy string: advancing kick → Deltamax check → knock-away (confirmed Up+Heavy → launcher).
 if(a&&['gAdvance','gChain'].includes(a.name)){
  f._rekkaNext=a.name==='gAdvance'?'gChain':(fresh(s,'heavy')&&s.edges.heavy.up?'up':'gAway');f._cmdHitLanded=!!a.green?.clean
  const next=rekkaContinue(f,{edge:!!fresh(s,'heavy'),opponent:opp});if(next){use(s,'heavy');fire(next);return 'consumed'}
 }
 const contact=!!a?.green?.clean&&cancelWindowOpen(f)
 if(a&&!contact)return 'consumed'
 if(!a&&(f.attackCooldown>0||inp.block))return 'grab'
 // Shared Zord ultimate not present: press consumed, no meter, no fallback.
 if(fresh(s,'ultimate')){use(s,'ultimate');return 'consumed'}
 // AURA READ: fresh Charge press, grounded neutral (no attack, no guard, no crouch). Held Charge never repeats.
 if(fresh(s,'charge')){const e=s.edges.charge;use(s,'charge');if(!a&&g&&!e.block&&!e.down)fire(e.fwd?'gRam':e.back?'gRead':'gScan');return a?'consumed':'grab'}
 if(fresh(s,'special')&&(!a||['light','gJ2','heavy','air','gElbow'].includes(a.name))){
  const e=s.edges.special;use(s,'special')
  // ↓↘→ (motion recorded from raw directions) against YOUR marked foe → Read Rush; otherwise the normal directional set.
  const k=!g?(e.down?'gHeel':'gAirShot'):e.qcf&&spdGreenMarked(f,opp)?'gRush1':e.qcb?'gArc':e.down?'gRise':e.up?'gSomer':e.fwd?'gAcro':e.back?(a?null:'gRetreat'):'gShot'
  if(k)fire(k,!!a)
  return 'consumed'
 }
 if(fresh(s,'light')){const e=s.edges.light,k=a?(a.name==='light'?'gJ2':a.name==='gJ2'?'gJ3':null):!g?'air':e.down?'gLow':e.fwd?'gElbow':e.back?'gSnap':'light';use(s,'light');if(k)fire(k,!!a);return 'consumed'}
 if(fresh(s,'heavy')||fresh(s,'upAttack')){const k=fresh(s,'upAttack')?'upAttack':'heavy',e=s.edges[k];use(s,k);const move=!g?(k==='heavy'?'gAirH':'air'):k==='heavy'&&e.qcb&&!a?'gToss':k==='upAttack'||e.up?'up':e.down?(k==='heavy'?'gSweep':'gLow'):e.fwd?'gAdvance':e.back&&!a?'gEvade':'heavy';if(!a||a.name==='light')fire(move,!!a);return 'consumed'}
 return a?'consumed':'grab'
}
