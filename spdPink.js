// S.P.D. Pink Ranger — command layer (press edges recorded in tickSpdPink from readRawControls,
// so keyboard / pad / replay / LAN feed the same parser). Returns 'consumed' | 'grab'.
import {startMove,rekkaContinue,cancelWindowOpen} from './combat.js'
import {isSpdPink,spdPinkState,startSpdPinkMove} from './spdPinkState.js'
import {groundTeleportLocked} from './groundTeleport.js'
const fresh=(s,k)=>s.edges[k]&&s.used[k]!==s.edges[k].tick&&s.clock-s.edges[k].clock<=8
const use=(s,k)=>s.used[k]=s.edges[k].tick
export function updateSpdPinkCommandCombat(f,inp,opp,W){
 if(!isSpdPink(f))return false
 const s=spdPinkState(f),g=!!(f.onGround||f.grounded),a=f.attacking?f.currentAttack:null
 if(f.hitstun>0||f.blockstun>0||f.hitstop>0||f.isGrabbed||f.knockdownState||f.health<=0||s.landing>0||s.leaping||s.reprisalPending||groundTeleportLocked(f))return 'consumed'
 const fire=(k,cancel=false)=>startSpdPinkMove(f,k,startMove,W,cancel)
 // Forward+Heavy string: weapon check → fresh Heavy kick → fresh Heavy knock-away (confirmed Up+Heavy → launcher).
 if(a&&['pCheck','pKick'].includes(a.name)){
  f._rekkaNext=a.name==='pCheck'?'pKick':(fresh(s,'heavy')&&s.edges.heavy.up?'up':'pAway');f._cmdHitLanded=!!a.pink?.clean
  const next=rekkaContinue(f,{edge:!!fresh(s,'heavy'),opponent:opp});if(next){use(s,'heavy');fire(next);return 'consumed'}
 }
 const contact=!!a?.pink?.clean&&cancelWindowOpen(f)
 if(a&&!contact)return 'consumed'
 if(!a&&(f.attackCooldown>0||inp.block))return 'grab'
 // Shared Zord ultimate not present: press consumed, no meter, no fallback.
 if(fresh(s,'ultimate')){use(s,'ultimate');return 'consumed'}
 // IRON RESERVE: fresh Charge press, grounded neutral only (no attack, no guard, no crouch). Held Charge never repeats.
 if(fresh(s,'charge')){const e=s.edges.charge;use(s,'charge');if(!a&&g&&!e.block&&!e.down&&!e.fwd&&!e.back)fire('pPrep');else if(!a&&g&&!e.block&&!e.down&&e.fwd)fire('pShoulder');return a?'consumed':'grab'}
 if(fresh(s,'special')&&(!a||['light','pJ2','pJ3','heavy','heavyIron','air'].includes(a.name))){
  const e=s.edges.special;use(s,'special')
  // ↓↘→ (motion recorded from raw directions) WITH an Iron Reserve charge → Iron Barrage; otherwise the directional set.
  const k=!g?(e.down?'pRose':'pAirShot'):e.qcf&&s.reserve?'pBar1':e.qcb&&!a?'pFlip':e.down?'pRise':e.up?'pVault':e.fwd?'pBreaker':e.back?(a?null:'pStance'):'pShot'
  if(k)fire(k,!!a)
  return 'consumed'
 }
 if(fresh(s,'light')){const e=s.edges.light,k=a?(a.name==='light'?'pJ2':a.name==='pJ2'?'pJ3':null):!g?'air':e.down?'pLow':e.fwd?'pKnee':e.back?'pBackfist':'light';use(s,'light');if(k)fire(k,!!a);return 'consumed'}
 if(fresh(s,'heavy')||fresh(s,'upAttack')){const k=fresh(s,'upAttack')?'upAttack':'heavy',e=s.edges[k];use(s,k);const move=!g?(k==='heavy'?'pAirH':'air'):k==='heavy'&&e.qcb&&!a?'pToss':k==='upAttack'||e.up?'up':e.down?(k==='heavy'?'pSweep':'pLow'):e.fwd?'pCheck':e.back&&!a?'pEvade':'heavy';if(!a||['light','pJ2'].includes(a.name))fire(move,!!a);return 'consumed'}
 return a?'consumed':'grab'
}
