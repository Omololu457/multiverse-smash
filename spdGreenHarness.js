// Test-only accessor for harness/spd_green*.mjs (exposed as __harness.spdGreenTest; harness URLs only).
import {startMove,getAttackHitbox,getCancelWindow} from './combat.js'
import {startSpdGreenMove,clearSpdGreen,ownGreenShots,spdGreenMarked} from './spdGreenState.js'
export function spdGreenHarnessApi(g){const raw=(w='p1')=>w==='p2'?g.p2():g.p1();return{raw,
 reset:()=>{g.reset();for(const f of [g.p1(),g.p2()])clearSpdGreen(f,g.world)},
 move:(k,w='p1')=>startSpdGreenMove(raw(w),k,startMove,g.world),
 state:(w='p1')=>{const f=raw(w),o=w==='p2'?g.p1():g.p2();return{key:f.rosterKey,hp:f.health,energy:f.energy,x:f.x,y:f.y,w:f.w,h:f.h,vx:f.vx,vy:f.vy,facing:f.facing,grounded:f.onGround,
  attack:f.currentAttack,cancel:getCancelWindow(f),box:getAttackHitbox(f),s:f._spdGreen,teleport:f._groundTeleport,marked:spdGreenMarked(f,o),
  invuln:f.invulnTimer||0,dash:f.dashTimer||0,skin:f.skinId||null,tag:f._recolorTag||null,
  shots:ownGreenShots(f,g.world).map(p=>({x:p.x,y:p.y,damage:p.damage,lifetime:p.lifetime,sheet:p.sheet}))}}}}
