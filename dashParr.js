// Dash Parr — command layer. Press edges + motions are recorded in tickDashParr from readRawControls, so keyboard /
// pad / replay / LAN feed the same parser. Returns 'consumed' | 'grab' (engine grab only).
//   Light            Jab (fresh re-press chains Jab → Jab → Heavy on contact)   ↓+Light / ↓+Heavy  Low slide
//   Heavy            Heavy lunge        ↑+Heavy / Up-Attack  Launcher           air Light / Heavy  Air streak
//   ↓↘→ +Special     Flurry             →→ +Special  Blur Dash                 ↓↓ +Special  Laps
//   ← +Special       FLASH TIME (toggle)  ←↙↓ +Special  Hydroplane         ↓↘→↓↘→ +Special or Ultimate  INCREDI-RUSH
//   ←← +Light        Sidestep           Block + Heavy (while comboed 3+)  Panic Run (handled in tickDashParr)
// Simple-input fallbacks (pad / CPU friendly; motions are the canon inputs): Special neutral → Flurry,
// fwd → Blur Dash, down → Laps (back is Flash Time).
import {startMove,getAttackPhase} from './combat.js'
import {isDashParr,dashParrState,startDashParrMove,toggleDashParrFlashTime} from './dashParrState.js'
const fresh=(s,k)=>s.edges[k]&&s.used[k]!==s.edges[k].tick&&s.clock-s.edges[k].clock<=8
const use=(s,k)=>s.used[k]=s.edges[k].tick
// Cancel routes on CLEAN contact once the move is in recovery (multi-hit moves keep every hit).
const ROUTES={jab:['jab2','heavy','low','launcher','special'],heavy:['special'],low:['launcher','special'],launcher:['special'],
 air:['special'],laps:['jab','heavy','low','launcher','ultimate'],flurry:['ultimate'],blurDash:['ultimate'],hydro:['launcher','ultimate']}
export function updateDashParrCommandCombat(f,inp,opp,W){
 if(!isDashParr(f))return false
 const s=dashParrState(f),g=!!(f.onGround||f.grounded),a=f.attacking?f.currentAttack:null
 if(f.hitstun>0||f.blockstun>0||f.hitstop>0||f.isGrabbed||f.knockdownState||f.health<=0||s.lock>0)return 'consumed'
 const fire=(k,cancel=false)=>startDashParrMove(f,k,startMove,W,{cancel,opp})
 const contact=!!a?.dp?.clean&&getAttackPhase(f)==='recovery'
 const can=r=>!a||(contact&&(ROUTES[a.name]||[]).includes(r))
 if(a&&!contact)return 'consumed'
 if(!a&&(f.attackCooldown>0||inp.block))return 'grab'
 // ULTIMATE: Ultimate button, or ↓↘→↓↘→ + Special.
 if((fresh(s,'ultimate')||(fresh(s,'special')&&s.edges.special.dqcf))&&can('ultimate')){
  const k=fresh(s,'ultimate')?'ultimate':'special';use(s,k)
  if(g&&(f.energy||0)>=100)fire('rush',!!a);return 'consumed'
 }
 if(fresh(s,'special')&&can('special')){
  const e=s.edges.special;use(s,'special')
  // FLASH TIME: plain Back + Special on the ground (no ←↙↓ motion) toggles the time-slow. Not a move: no attack starts.
  if(g&&!a&&e.back&&!e.qcbd&&!e.qcf&&!e.dqcf&&!e.down){toggleDashParrFlashTime(f);return 'consumed'}
  const k=!g?'flurry':e.qcf?'flurry':e.qcbd?'hydro':e.downTap2?'laps':e.fwdTap2?'blurDash':e.down?'laps':e.fwd?'blurDash':'flurry'
  if(!g&&a&&a.name!=='air')return 'consumed'
  fire(k,!!a);return 'consumed'
 }
 if(fresh(s,'light')){
  const e=s.edges.light;use(s,'light')
  if(!a&&g&&e.backTap2&&s.sidestepCd<=0){fire('sidestep');return 'consumed'}
  const k=!g?'air':e.down?'low':'jab'
  if(a){
   if(k==='jab'&&a.name==='jab'&&can('jab2')&&(s.jabChain||0)<1){s.jabChain=(s.jabChain||0)+1;fire('jab',true)}
   else if(k==='low'&&can('low'))fire('low',true)
   else if(k==='jab'&&a.name==='laps'&&can('jab')){s.jabChain=0;fire('jab',true)}
   return 'consumed'
  }
  if(k==='jab')s.jabChain=0
  fire(k);return 'consumed'
 }
 if(fresh(s,'heavy')||fresh(s,'upAttack')){
  const k0=fresh(s,'upAttack')?'upAttack':'heavy',e=s.edges[k0];use(s,k0)
  if(e.block)return 'consumed'   // Block+Heavy is Panic Run (only while being comboed)
  const k=!g?'air':(k0==='upAttack'||e.up)?'launcher':e.down?'low':'heavy'
  if(a){if(can(k))fire(k,true);return 'consumed'}
  fire(k);return 'consumed'
 }
 return a?'consumed':'grab'
}
