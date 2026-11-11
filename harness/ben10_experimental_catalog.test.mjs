// Activation review, not certification of finished art or full-match balance.
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import { clearDomains } from '../domains.js'
import { getAvailableAlienKeys } from '../aliens.js'
let passed=0
for(const key of getAvailableAlienKeys(true).filter(k=>k!=='swampfire')){
 for(const direction of ['N','F','D','ULT']){
  A.clearAbilityState();clearDomains()
  const f={rosterKey:'ben10',benExperimental:true,side:'p1',x:500,y:300,w:60,h:110,groundY:410,facing:1,health:950,maxHealth:950,energy:100,maxEnergy:100,hitstun:0,blockstun:0,attackCooldown:0,ultimateCooldown:0,onGround:true,grounded:true}
  F.applyBen10VariantStats(f);F.setupBen10(f);assert(F.applyAlien(f,key));f.transformed=true;f._specialHeldDir=direction
  const t={rosterKey:'goku',side:'p2',x:570,y:300,w:60,h:110,groundY:410,health:5000,maxHealth:5000,energy:100,maxEnergy:100,onGround:true,grounded:true,facing:-1}
  const context={getOpponent:()=>t,worldWidth:3200,worldHeight:1600}
  assert.equal(direction==='ULT'?A.triggerUltimate(f,context):A.triggerSpecial(f,context),true,`${key} ${direction} activates`)
  assert(f.energy>=0&&f.energy<100,`${key} ${direction} charges Power`)
  for(let i=0;i<220;i++)A.updatePendingSpawns()
  assert(Number.isFinite(t.health),`${key} ${direction} leaves finite HP`)
  console.log('PASS experimental activation',key,direction);passed++
 }
}
A.clearAbilityState();clearDomains();console.log(`BEN EXPERIMENTAL CATALOG: ${passed} passed, 0 failed; art/combo/network certification is NOT implied`)
