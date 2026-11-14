import assert from 'node:assert/strict'
import fs from 'node:fs'
import '../spdBlueData.js'
import {tickGroundTeleport as tick,groundTeleportState,groundTeleportDestination,clearGroundTeleport} from '../groundTeleport.js'
let count=0;const check=(n,fn)=>{fn();count++;console.log('PASS',n)}
const fighter=(x=200)=>({rosterKey:'spd_blue',x,y:0,w:60,h:110,health:1000,energy:100,onGround:true,vx:0}),W={stageWidth:()=>800,fighters:()=>[],solids:()=>[]}
const step=(f,n,raw={})=>{for(let i=0;i<n;i++)tick(f,raw,W)}
const pair=(f,dir='right',opts={})=>{tick(f,{[dir]:true},W,opts);tick(f,{},W,opts);tick(f,{[dir]:true},W,opts)}
check('single / held direction never teleports',()=>{const f=fighter();step(f,50,{right:true});assert.equal(f._groundTeleport.count,0)})
check('fresh release pair costs8, exact3+2+8, 120px, no invulnerability',()=>{const f=fighter();pair(f);assert.equal(f.energy,92);assert.equal(f.x,200);assert.equal(f._groundTeleport.action.age,1);step(f,2,{right:true});assert.equal(f.x,200);step(f,1,{right:true});assert.equal(f.x,260);step(f,1,{right:true});assert.equal(f.x,320);step(f,7,{right:true});assert(f._groundTeleport.action);step(f,1,{right:true});assert.equal(f._groundTeleport.action,null);assert(!f.invulnTimer);assert.equal(f._groundTeleport.count,1)})
check('left pair is symmetric',()=>{const f=fighter();pair(f,'left');step(f,12);assert.equal(f.x,80)})
check('expired and opposite pairs do not activate',()=>{const f=fighter();tick(f,{left:true},W);tick(f,{},W);tick(f,{right:true},W);assert.equal(f._groundTeleport.count,0);step(f,13);tick(f,{right:true},W);assert.equal(f._groundTeleport.count,0)})
check('no neutral transition means no new edge',()=>{const f=fighter();tick(f,{right:true},W);step(f,4,{left:true});tick(f,{right:true},W);assert.equal(f._groundTeleport.count,0)})
for(const [key,val] of Object.entries({hitstun:10,blockstun:10,stun:10,hitstop:3,isGrabbed:true,knockdownState:'down',isBlocking:true,isCharging:true,attacking:true,attackCooldown:5,onGround:false}))check('reject '+key,()=>{const f=fighter();f[key]=val;pair(f);assert.equal(f.energy,100);assert.equal(f._groundTeleport.count,0);f[key]=key==='onGround'?true:0;step(f,20,{right:true});assert.equal(f._groundTeleport.count,0)})
check('energy/cooldown deny teleport but allow dash fallback',()=>{for(const mode of ['energy','cooldown']){const f=fighter();if(mode==='energy')f.energy=7;else groundTeleportState(f).cooldown=36;pair(f);assert(f._dashTap);assert.equal(f._groundTeleport.count,0)}})
check('no destination rejects before spending',()=>{const f=fighter(740);pair(f);assert.equal(f.energy,100);assert.equal(f._groundTeleport.count,0)})
check('opponent blocks complete swept body, no cross-through',()=>{const f=fighter(),b=fighter(300);const w={...W,fighters:()=>[f,b]};assert.equal(groundTeleportDestination(f,1,w),239);tick(f,{right:true},w);tick(f,{},w);tick(f,{right:true},w);for(let i=0;i<12;i++)tick(f,{},w);assert.equal(f.x,239);assert(f.x+f.w<b.x)})
check('thin solid cannot be tunnelled; moving solid rechecked',()=>{const f=fighter(),wall={x:300,y:0,w:2,h:120},w={...W,solids:()=>[wall]};assert.equal(groundTeleportDestination(f,1,w),239);wall.x=500;tick(f,{right:true},w);tick(f,{},w);tick(f,{right:true},w);wall.x=290;for(let i=0;i<12;i++)tick(f,{},w);assert.equal(f.x,229)})
check('simultaneous mirrored teleports do not embed',()=>{const a=fighter(200),b=fighter(410),w={...W,fighters:()=>[a,b]};for(const raw of [{right:true},{},{right:true},...Array(12).fill({})]){tick(a,raw,w);tick(b,{left:!!raw.right},w);assert(a.x+a.w<=b.x)}assert(a._groundTeleport.count===1&&b._groundTeleport.count===1)})
check('paid explicit cancel callback only when legal',()=>{const f=fighter();f.attacking=true;let called=0;pair(f,'right',{canCancel:()=>true,onCancel:()=>called++});assert.equal(called,1);assert.equal(f.attacking,false);assert.equal(f.energy,92)})
check('strike interrupts vulnerable wind-up',()=>{const f=fighter();pair(f);f.hitstun=10;tick(f,{},W);assert.equal(f._groundTeleport.action,null);assert.equal(f.x,200)})
check('plain JSON roundtrip gives identical subsequent frames',()=>{const a=fighter();pair(a);const b=JSON.parse(JSON.stringify(a));for(let i=0;i<50;i++){tick(a,{},W);tick(b,{},W);assert.deepEqual(a,b)}})
check('no wall-clock timer / no update means state frozen',()=>{const f=fighter();pair(f);const before=JSON.stringify(f);assert.equal(JSON.stringify(f),before);assert(!/performance\.now|Date\.now|Math\.random/.test(fs.readFileSync('groundTeleport.js','utf8')))})
check('identity/reset cleanup and non-opt-in roster unchanged',()=>{const f=fighter();pair(f);f.rosterKey='krybot';tick(f,{},W);assert.equal(f._groundTeleport,undefined);assert(!f._dashTap);clearGroundTeleport(f);const b=fighter();b.rosterKey='green_samurai_ranger';assert.equal(tick(b,{right:true},W),false);assert(!b._groundTeleport)})
console.log(count,'teleport contract checks passed')
