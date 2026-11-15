// Test-only accessor for harness/dash_parr*.mjs (exposed as __harness.dashParrTest; harness URLs only).
import {startMove,getAttackHitbox,getHurtbox} from './combat.js'
import {startDashParrMove,clearDashParr,momentumTier} from './dashParrState.js'
export function dashParrHarnessApi(g){const raw=(w='p1')=>w==='p2'?g.p2():g.p1();const other=w=>w==='p2'?g.p1():g.p2();return{raw,
 reset:()=>{g.reset();for(const f of [g.p1(),g.p2()])clearDashParr(f)},
 move:(k,w='p1',cancel=false)=>startDashParrMove(raw(w),k,startMove,g.world,{opp:other(w),cancel}),
 state:(w='p1')=>{const f=raw(w);return{key:f.rosterKey,hp:f.health,maxHp:f.maxHealth,energy:f.energy,x:f.x,y:f.y,w:f.w,h:f.h,vx:f.vx,vy:f.vy,facing:f.facing,grounded:f.onGround,
  attack:f.currentAttack,box:getAttackHitbox(f),hurt:getHurtbox(f),s:f._dashParr,tier:momentumTier(f),invuln:f.invulnTimer||0,skin:f.skinId||null,tag:f._recolorTag||null,
  hitstun:f.hitstun||0,blockstun:f.blockstun||0,combo:f.comboCounter||0}}}}
