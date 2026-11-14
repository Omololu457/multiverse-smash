import { krybotState, startKrybotMove, clearKrybot, ownKrybotShots } from './krybotState.js'
import { startMove, getAttackHitbox, getCancelWindow } from './combat.js'
export function krybotHarnessApi(g) {
  const pick=(w='p1')=>w==='p2'?g.p2():g.p1()
  return {
    raw:pick,
    reset:()=>{g.reset();for(const f of [g.p1(),g.p2()])clearKrybot(f,g.world)},
    move:(key,w='p1')=>startKrybotMove(pick(w),key,startMove,g.world),
    state:(w='p1')=>{const f=pick(w);if(!f)return null;return {key:f.rosterKey,health:f.health,energy:f.energy,
      x:f.x,y:f.y,vx:f.vx,vy:f.vy,side:f.side,facing:f.facing,onGround:f.onGround,attack:f.currentAttack,
      box:getAttackHitbox(f),cancel:getCancelWindow(f),s:f._krybot||null,
      shots:ownKrybotShots(f,g.world).map(p=>({kind:p._krybot.kind,x:p.x,y:p.y,damage:p.damage,lifetime:p.lifetime}))}},
  }
}
