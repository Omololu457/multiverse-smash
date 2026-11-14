import { LUFFY_MOVES } from './luffyData.js'
import { startMove, rekkaContinue, getAttackPhase } from './combat.js'
import { isLuffy, luffyState } from './luffyState.js'
function fire(f,key) {
 const md=LUFFY_MOVES[key],s=luffyState(f)
 if(!md||!s||f.health<=0||f.hitstun>0||f.blockstun>0||f.isGrabbed||f.isCharging)return false
 if((f.energy||0)<(md.cost||0))return false
 const disabled=f.disabledSpecials||[]
 if(key==='lfFinale'&&((f.ultimateCooldown||0)>0||disabled.includes('ultimate')))return false
 if(md.isSpecial&&(disabled.includes(key)||disabled.includes('special')))return false
 if(key==='lfBrace'&&s.braceCd>0)return false
 if(key==='lfAnchor'&&(s.anchorUsed||f.onGround||f.grounded))return false
 if(['lfMuchi','lfKane','lfHop','lfGatling','lfBazooka','lfOno','lfKaza'].includes(key)&&!(f.onGround||f.grounded))return false
 if(key==='lfStamp'&&(f.onGround||f.grounded))return false
 if(!startMove(f,key,md))return false
 f.currentMove=key;f.currentAttack.lf={...md.lf};f.currentAttack.lfInstance=++s.serial
 f._rekkaNext=md.lf?.next||null;f._cmdHitLanded=false
 if(key==='heavy')f._parryInputBuffer=5
 f.energy=Math.max(0,f.energy-(md.cost||0))
 if(key==='lfBrace')s.braceCd=180
 if(key==='lfAnchor')s.anchorUsed=true
 if(md.invuln)f.invulnTimer=Math.max(f.invulnTimer||0,md.invuln)
 if(md.armor)f._castArmor=Math.max(f._castArmor||0,md.armor)   // VARIETY L6: armored startup (engine castArmored: absorbs non-launcher hits, damage still taken; game.js ticks it down)
 if(md.unblockable&&f.currentAttack)f.currentAttack.unblockable=true   // VARIETY L8: command throw beats guard (combat.js block branch skips unblockables; startMove does not copy the flag)
 if(md.isSpecial||md.isUltimate){f.vx=0;f.isBlocking=false;s.snapUntil=0;s.snapQueued=false}
 f._luffyCue=key==='lfBrace'?'inflate':key==='lfSnap'?'snap':key==='lfFinale'?'finale':md.isSpecial?'stretch':null
 return true
}
export function executeLuffySpecial(f) {
 if(!isLuffy(f))return false
 const dir=f._specialHeldDir||null
 if(!(f.onGround||f.grounded))return dir==='D'?fire(f,'lfAnchor'):false
 const m=luffyState(f).motion;luffyState(f).motion=null
 if(m==='qcf')return fire(f,'lfGatling')
 if(m==='qcb')return fire(f,'lfBazooka')
 return fire(f,dir==='F'?'lfReel':dir==='D'?'lfPinwheel':dir==='B'?'lfBrace':'lfPiston')
}
export function executeLuffyUltimate(f) {
 if(!isLuffy(f)||!(f.onGround||f.grounded))return false
 return fire(f,'lfFinale')
}
// Shares the engine's resolved controls, buffer duration and recovery-only rekka gate.
// Raw edges (recorded on _luffy every tick) distinguish a new press from held/buffered Special.
export function updateLuffyCommandCombat(fighter,inputState,opp,context={}) {
 if(!isLuffy(fighter))return false
 const s=luffyState(fighter),a=fighter.currentAttack,grounded=!!(fighter.onGround||fighter.grounded)
 if(fighter.hitstun>0||fighter.blockstun>0||fighter.hitstop>0||fighter.isGrabbed||fighter.isCharging||inputState.charge)return true
 if(a&&s.edges.special&&s.snapUntil>=s.clock&&s.snapUntil>0&&a.lfConfirmed&&s.pips>0&&!s.snapUsed)s.snapQueued=true
 if(a&&s.snapQueued&&grounded&&a.lfConfirmed&&a.lf?.snapLate!=null&&
    a.total-a.timer>=a.lf.snapLate&&getAttackPhase(fighter)==='recovery'&&s.pips>0&&!s.snapUsed){
  s.pips--;s.snapUsed=true;s.snapQueued=false;s.snapUntil=0
  fighter.attacking=false;fighter.currentAttack=null;fighter.currentMove=null;fighter.attackCooldown=0;fighter.vx=0
  fire(fighter,'lfSnap');return true
 }
 if(a){
  if(a.lfConfirmed&&a.lf?.normal&&(grounded||a.name==='air')){
   const priorNext=fighter._rekkaNext
   let edge=false,key=null
   if(a.lf.button==='light'&&s.edges.light){key=a.lf.next;edge=true}
   if(a.lf.button==='heavy'&&s.edges.heavy){key=a.name==='lfCmd2'&&(inputState.up||s.up)?'up':a.lf.next;edge=true}
   if(a.name==='light'&&s.edges.heavy&&!inputState.up){key='heavy';edge=true}
   if(['light','lfJ2','heavy'].includes(a.name)&&s.edges.special&&grounded&&!inputState.down&&!inputState.up&&!inputState.left&&!inputState.right){key='special';edge=true}
   if(a.name==='air'&&s.edges.special&&inputState.down&&!s.anchorUsed){key='lfAnchor';edge=true}
   if(a.name==='heavy'&&s.edges.ultimate&&!(fighter.ultimateCooldown>0)&&!(fighter.disabledSpecials||[]).includes('ultimate')){key='ultimate';edge=true}
   if(edge){
    // Validate meter before tearing down recovery. Only neutral Piston can cancel a normal.
    const actual=key==='special'?'lfPiston':key==='ultimate'?'lfFinale':key
    if((fighter.energy||0)>=(LUFFY_MOVES[actual]?.cost||0)&&!(fighter.disabledSpecials||[]).includes(actual)&&!(key==='special'&&(fighter.disabledSpecials||[]).includes('special'))){
     fighter._rekkaNext=actual
     const next=rekkaContinue(fighter,{edge:true,phase:getAttackPhase(fighter),opponent:opp,requireHit:true})
     if(next){s.buffer.light=s.buffer.heavy=s.buffer.special=s.buffer.ultimate=0;
      if(next==='lfFinale'&&context.ultimate)context.ultimate()
      else if(next==='lfPiston'&&context.special){fighter._specialHeldDir=null;context.special()}
      else fire(fighter,next)
      return true}
    }
    fighter._rekkaNext=priorNext
   }
  }
  return true
 }
 if(fighter.attackCooldown>0||inputState.block)return true
 const forward=fighter.facing === 1 ? !!inputState.right : !!inputState.left
 if(s.buffer.ultimate>0){s.buffer.ultimate=0;s.buffer.special=s.buffer.light=s.buffer.heavy=s.buffer.upAttack=0;context.ultimate?context.ultimate():executeLuffyUltimate(fighter);return true}
 if(s.buffer.special>0){
  s.buffer.special=0;s.buffer.light=s.buffer.heavy=s.buffer.upAttack=0;fighter._specialHeldDir=inputState.down?'D':forward?'F':(fighter.facing===1?inputState.left:inputState.right)?'B':null
  context.special?context.special():executeLuffySpecial(fighter);return true
 }
 if(grounded&&s.buffer.upAttack>0){s.buffer.upAttack=0;fire(fighter,'up');return true}
 const back=fighter.facing === 1 ? !!inputState.left : !!inputState.right
 if(s.buffer.light>0){s.buffer.light=0;fire(fighter,grounded?(inputState.down?'lfLow':forward?'lfKane':back?'lfOno':'light'):(inputState.down?'down_air':'air'));return true}
 if(s.buffer.heavy>0){s.buffer.heavy=0;fire(fighter,grounded?(s.hmotion==='qcb'?'lfKaza':inputState.up?'up':inputState.down?'lfMuchi':forward?'lfCmd1':back?'lfHop':'heavy'):(inputState.down?'down_air':'lfStamp'));return true}
 return false // generic grab/throw remains the shared engine contract
}
