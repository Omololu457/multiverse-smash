import {startMove,rekkaContinue,cancelWindowOpen} from './combat.js'
import {isSpdBlue,spdBlueState,startSpdBlueMove} from './spdBlueState.js'
import {groundTeleportLocked} from './groundTeleport.js'
const fresh=(s,k)=>s.edges[k]&&s.used[k]!==s.edges[k].tick&&s.clock-s.edges[k].clock<=8
const use=(s,k)=>s.used[k]=s.edges[k].tick
export function updateSpdBlueCommandCombat(f,inp,opp,W){
 if(!isSpdBlue(f))return false
 const s=spdBlueState(f),g=!!(f.onGround||f.grounded),a=f.attacking?f.currentAttack:null
 if(f.hitstun>0||f.blockstun>0||f.hitstop>0||f.isGrabbed||f.knockdownState||f.health<=0||s.landing>0||s.leaping||groundTeleportLocked(f))return 'consumed'
 const fire=(k,cancel=false)=>startSpdBlueMove(f,k,startMove,W,cancel)
 if(a&&['bAdvance','bChain'].includes(a.name)){
  f._rekkaNext=a.name==='bAdvance'?'bChain':(fresh(s,'heavy')&&s.edges.heavy.up?'up':'bAway');f._cmdHitLanded=!!a.blue?.clean
  const next=rekkaContinue(f,{edge:!!fresh(s,'heavy'),opponent:opp});if(next){use(s,'heavy');fire(next);return 'consumed'}
 }
 const contact=!!a?.blue?.clean&&cancelWindowOpen(f)
 if(a&&!contact)return 'consumed'
 if(!a&&(f.attackCooldown>0||inp.block))return 'grab'
 // No Ranger fallback ultimate: shared Zord dependency is deliberately unavailable.
 if(fresh(s,'ultimate')){use(s,'ultimate');return 'consumed'}
 if(fresh(s,'special')&&(!a||['light','bJ2','heavy','air'].includes(a.name))){const e=s.edges.special;use(s,'special');const k=!g?(e.down?'bAirShot':e.back?null:'bAirDive'):e.qcf?'bDrive1':e.qcb?'bBash':e.down?'bRise':e.up?'bSky':e.fwd?'bPursuit':e.back?'bBarrier':'bShot';if(k)fire(k,!!a);return 'consumed'}
 if(!a&&g&&fresh(s,'charge')&&(s.edges.charge.fwd||s.edges.charge.back)&&!s.edges.charge.down){use(s,'charge');fire(s.edges.charge.fwd?'bRam':'bParry');return 'consumed'}   // VARIETY L6: Charge+Forward only; neutral Charge still reaches the engine
 if(fresh(s,'light')){const e=s.edges.light,k=a?(a.name==='light'?'bJ2':a.name==='bJ2'?'bJ3':null):!g?'air':e.down?'bLow':e.fwd?'bPalm':e.back?'bWithdraw':'light';use(s,'light');if(k)fire(k,!!a);return 'consumed'}
 if(fresh(s,'heavy')||fresh(s,'upAttack')){const k=fresh(s,'upAttack')?'upAttack':'heavy',e=s.edges[k];use(s,k);const move=!g?(k==='heavy'?'bAirH':'air'):k==='heavy'&&e.qcb&&!a?'bArrest':k==='upAttack'||e.up?'up':e.down?(k==='heavy'?'bSweep':'bLow'):e.fwd?'bAdvance':e.back&&!a?'bBackstep':'heavy';if(!a||a.name==='light')fire(move,!!a);return 'consumed'}
 return a?'consumed':'grab'
}
