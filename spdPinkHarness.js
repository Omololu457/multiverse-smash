// Test-only accessor for harness/spd_pink*.mjs (exposed as __harness.spdPinkTest; harness URLs only).
import {startMove,getAttackHitbox,getCancelWindow} from './combat.js'
import {startSpdPinkMove,clearSpdPink,ownPinkShots} from './spdPinkState.js'
export function spdPinkHarnessApi(g){const raw=(w='p1')=>w==='p2'?g.p2():g.p1();return{raw,
 reset:()=>{g.reset();for(const f of [g.p1(),g.p2()])clearSpdPink(f,g.world)},
 move:(k,w='p1')=>startSpdPinkMove(raw(w),k,startMove,g.world),
 state:(w='p1')=>{const f=raw(w);return{key:f.rosterKey,hp:f.health,energy:f.energy,x:f.x,y:f.y,w:f.w,h:f.h,vx:f.vx,vy:f.vy,facing:f.facing,grounded:f.onGround,
  attack:f.currentAttack,cancel:getCancelWindow(f),box:getAttackHitbox(f),s:f._spdPink,teleport:f._groundTeleport,reserve:f._spdPink?.reserve||null,
  invuln:f.invulnTimer||0,dash:f.dashTimer||0,skin:f.skinId||null,tag:f._recolorTag||null,hitstun:f.hitstun||0,blockstun:f.blockstun||0,
  shots:ownPinkShots(f,g.world).map(p=>({x:p.x,y:p.y,damage:p.damage,lifetime:p.lifetime,sheet:p.sheet}))}}}}
