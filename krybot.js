import { startMove, rekkaContinue, cancelWindowOpen } from './combat.js'
import { isKrybot,krybotState,startKrybotMove,krybotCanStart } from './krybotState.js'

// Reads logical raw button edges captured before shared input consumption.
// Eight simulation-frame buffer survives hitstop; holding a button never retaps.
const fresh=(s,k)=>s.edges[k] && s.used[k]!==s.edges[k].tick && s.clock-s.edges[k].clock<=8
const use=(s,k)=>{s.used[k]=s.edges[k].tick}
export function updateKrybotCommandCombat(f,inp,opp,W) {
  if(!isKrybot(f))return false
  const s=krybotState(f), g=!!(f.onGround||f.grounded)
  if(f.hitstun>0 || f.blockstun>0 || f.hitstop>0 || f.isGrabbed || f.knockdownState || f.health<=0 || s.landing>0 || s.leaping)return 'consumed'
  const a=f.attacking?f.currentAttack:null
  const fire=(key,cancel=false)=>startKrybotMove(f,key,startMove,W,cancel)
  // Command chain uses the shared clean-hit recovery/retap gate.
  if(a && ['kAdvance','kChainKick'].includes(a.name)) {
    f._rekkaNext=a.name==='kAdvance'?'kChainKick':(fresh(s,'heavy') && s.edges.heavy.up?'up':'kAway')
    // The clean flag comes from the actual unblocked hit hook, never rendering.
    f._cmdHitLanded=!!a.krybot?.clean
    const next=rekkaContinue(f,{edge:!!fresh(s,'heavy'),opponent:opp})
    if(next) { use(s,'heavy'); fire(next); return 'consumed' }
  }
  const contact=!!a?.krybot?.clean && cancelWindowOpen(f)
  if(a && !contact)return 'consumed'
  if(!a && (f.attackCooldown>0 || inp.block))return 'grab'
  if(fresh(s,'ultimate') && g && (!a || a.name==='heavy')) {
    use(s,'ultimate'); if(krybotCanStart(f,'ultimate',W))fire('ultimate',!!a)
    return 'consumed'
  }
  if(fresh(s,'special') && (!a || ['light','kJ2','heavy'].includes(a.name))) {
    const e=s.edges.special; use(s,'special')
    // Air ↓+Special is the SAME aerial boot, not a new special or leap reset.
    const key=!g?(e.down?'air':null):e.down?'kLeap':e.fwd?'kBreach':e.back?'kCover':'kBlaster'
    if(key)fire(key,!!a)
    return 'consumed'
  }
  if(fresh(s,'light')) {
    const e=s.edges.light
    const key=a?(a.name==='light'?'kJ2':a.name==='kJ2'?'kJ3':null):!g?'air':e.down?'kLow':'light'
    use(s,'light'); if(key)fire(key,!!a)
    return 'consumed'
  }
  if(fresh(s,'heavy') || fresh(s,'upAttack')) {
    const b=fresh(s,'upAttack')?'upAttack':'heavy', e=s.edges[b]
    const key=!g?'air':b==='upAttack'||e.up?'up':e.down?'kLow':e.fwd?'kAdvance':'heavy'
    use(s,b)
    if(!a || a.name==='light')fire(key,!!a)
    return 'consumed'
  }
  return a?'consumed':'grab'
}
