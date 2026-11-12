import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { luffy, LUFFY_MOVES } from '../luffyData.js'
import { characters } from '../characters.js'
import * as C from '../combat.js'
import * as A from '../abilities.js'
import { tickLuffy,luffyState,luffyRegen,clearLuffy } from '../luffyState.js'
import { updateLuffyCommandCombat,executeLuffySpecial } from '../luffy.js'
import { physics } from '../physics.js'
import { getSkins } from '../skins.js'
let passed=0
const test=(name,fn)=>{try{fn();passed++;console.log('PASS',name)}catch(e){console.error('FAIL',name);throw e}}
export const fighter=(key='luffy',x=100,side='p1')=>({...characters[key],rosterKey:key,side,x,y:300,w:60,h:100,groundY:400,
 health:1000,maxHealth:1000,energy:50,maxEnergy:100,facing:side==='p1'?1:-1,vx:0,vy:0,onGround:true,grounded:true,
 hitstun:0,hitstop:0,blockstun:0,attackCooldown:0,attacking:false,currentAttack:null,currentMove:null,
 comboCounter:0,comboTimer:0,damageMultiplier:1,attackMultiplier:1,defenseMultiplier:1,attackSpeedMultiplier:1,
 speedMultiplier:1,juggleCount:0,maxAirHits:3,airHits:0})
export function step(f,d,raw={}){
 tickLuffy(f,d,raw);updateLuffyCommandCombat(f,raw,d);C.updateCombat(f,d,{}, {stageWidth:1200});C.updateCombat(d,f,{}, {stageWidth:1200})
 A.regenEnergy(f)
}
const advance=(f,d,n,raw={})=>{for(let i=0;i<n;i++)step(f,d,raw)}
const pair=(x=180)=>[fighter(),fighter('goku',x,'p2')]
const cast=(f,key)=>{assert(C.startMove(f,key,LUFFY_MOVES[key]));return f.currentAttack}
test('supplied source dimensions, alpha metadata and SHA-256 are preserved',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../docs/luffy/source_rects.json',import.meta.url)))
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+m.source.file,import.meta.url))).digest('hex'),m.source.sha256)
 assert.deepEqual(m.source.size,[710,3989]);assert.equal(m.frames.length,408)
 const ids=new Set(m.frames.map(f=>f.id));assert.equal(ids.size,408)
 for(const seq of Object.values(m.animations))for(const id of seq)assert(ids.has(id))
})
test('unique actual roster identity, One Piece and default-only skin',()=>{
 assert.equal(characters.luffy,luffy);assert.equal(luffy.universe,'one_piece');assert.equal(luffy.stats.maxHealth,1000)
 assert.deepEqual(getSkins('luffy').map(s=>s.id),['default'])
})
test('grounded unblocked normal instance awards one pip and exactly three Stamina',()=>{
 const[f,d]=pair();cast(f,'light');advance(f,d,5);assert(d.health<1000);assert.equal(luffyState(f).pips,1);assert.equal(f.energy,53)
 advance(f,d,3);assert.equal(luffyState(f).pips,1);assert.equal(f.energy,53)
})
test('normal startup is five simulation ticks, not legacy scaled time',()=>{
 const[f,d]=pair();cast(f,'light');advance(f,d,4);assert.equal(d.health,1000);step(f,d);assert(d.health<1000)
})
test('blocked normal grants no pips or Stamina and cannot chain',()=>{
 const[f,d]=pair();d.isBlocking=true;d._blockHeldFrames=20;cast(f,'light');advance(f,d,15)
 assert.equal(luffyState(f).pips,0);assert.equal(f.energy,50)
 step(f,d,{light:true});assert.notEqual(f.currentAttack?.name,'lfJ2')
})
test('air normal recovers Stamina but never grants grounded Wind-Up',()=>{
 const[f,d]=pair();f.onGround=f.grounded=false;cast(f,'air');advance(f,d,8)
 assert(d.health<1000);assert.equal(luffyState(f).pips,0);assert.equal(f.energy,53)
})
test('Wind-Up decays at 180 then 120 simulation frames and clamps to zero',()=>{
 const[f,d]=pair(900),s=luffyState(f);s.pips=3
 for(let i=0;i<179;i++)tickLuffy(f,d,{});assert.equal(s.pips,3)
 tickLuffy(f,d,{});assert.equal(s.pips,2)
 for(let i=0;i<119;i++)tickLuffy(f,d,{});assert.equal(s.pips,2)
 tickLuffy(f,d,{});assert.equal(s.pips,1)
 for(let i=0;i<240;i++)tickLuffy(f,d,{});assert.equal(s.pips,0)
})
test('Stamina neutral recovery is integer deterministic two per second, no charge bonus',()=>{
 const[f]=pair();for(let i=0;i<60;i++)A.regenEnergy(f);assert.equal(f.energy,52)
 for(const flag of ['attacking','isBlocking','isCharging','isGrabbed','isUltimateActive']){f[flag]=true;for(let i=0;i<60;i++)A.regenEnergy(f);assert.equal(f.energy,52);f[flag]=false}
 f.hitstun=20;for(let i=0;i<60;i++)A.regenEnergy(f);assert.equal(f.energy,52);f.hitstun=0
 A.doEnergyCharge(f);assert.equal(f.energy,52);f.energy=100;for(let i=0;i<60;i++)A.regenEnergy(f);assert.equal(f.energy,100)
})
test('held Light performs one attack only; no automatic three-hit chain',()=>{
 const[f,d]=pair();advance(f,d,80,{light:true});assert.equal(luffyState(f).serial,1);assert.equal(luffyState(f).pips,1)
})
test('fresh recovery Light retaps chain J1/J2/J3, maximum three',()=>{
 const[f,d]=pair();step(f,d,{light:true});let guard=0
 while(!(f.currentAttack?.lfConfirmed&&C.getAttackPhase(f)==='recovery')&&guard++<60)step(f,d)
 step(f,d,{light:true});assert.equal(f.currentAttack?.name,'lfJ2');step(f,d)
 guard=0;while(!(f.currentAttack?.lfConfirmed&&C.getAttackPhase(f)==='recovery')&&guard++<60)step(f,d)
 step(f,d,{light:true});assert.equal(f.currentAttack?.name,'lfJ3');assert.equal(f._rekkaNext,null)
})
test('Piston costs 12; whiff/held Special never enables Snapback',()=>{
 const[f,d]=pair(900);step(f,d,{special:true});assert.equal(f.currentAttack?.name,'lfPiston');assert.equal(f.energy,38)
 luffyState(f).pips=2;advance(f,d,50,{special:true});assert.equal(luffyState(f).pips,2);assert.equal(luffyState(f).serial,1)
})
test('confirmed Piston fresh retap spends one pip, late recovery only, no extra damage',()=>{
 const[f,d]=pair(230);luffyState(f).pips=2;step(f,d,{special:true})
 let g=0;while(!f.currentAttack?.lfConfirmed&&g++<50)step(f,d)
 const hp=d.health;assert(hp<1000);step(f,d,{special:true})
 assert.notEqual(f.currentAttack?.name,'lfSnap')
 while(f.currentAttack?.name==='lfPiston'&&g++<90)step(f,d)
 assert.equal(f.currentAttack?.name,'lfSnap');assert.equal(luffyState(f).pips,1);assert.equal(luffyState(f).snapUsed,true)
 advance(f,d,5);assert.equal(d.health,hp);assert.equal(f.invulnTimer||0,0)
})
test('expired Snapback retap does not spend a pip',()=>{
 const[f,d]=pair(230);luffyState(f).pips=2;step(f,d,{special:true});advance(f,d,34);step(f,d,{special:true});assert.equal(luffyState(f).pips,2);assert.notEqual(f.currentAttack?.name,'lfSnap')
})
test('Pinwheel resolves three contacts only; specials award no normal resources',()=>{
 const[f,d]=pair();cast(f,'lfPinwheel');let hits=0,last=1000
 for(let i=0;i<110;i++){step(f,d);if(d.health<last){hits++;last=d.health}}
 assert.equal(hits,3);assert.equal(luffyState(f).pips,0);assert(f.energy<=53)
})
test('Balloon startup/one-strike absorption/no healing/cooldown and punishable tail',()=>{
 const[f,d]=pair(),s=luffyState(f);f._specialHeldDir='B';assert(executeLuffySpecial(f));assert.equal(s.braceCd,180);const health=f.health
 advance(f,d,10);cast(d,'light');advance(f,d,5);assert.equal(f.health,health);assert.equal(s.pips,1);assert.equal(f.currentAttack?.lfAbsorbed,true)
 d.attacking=false;d.currentAttack=null;d.attackCooldown=0;cast(d,'light');advance(f,d,5);assert(f.health<health);assert.equal(s.pips,1)
})
test('Balloon does not absorb ultimate or shared grab',()=>{
 const[f,d]=pair();cast(f,'lfBrace');advance(f,d,11)
 d.currentAttack={name:'test',total:10,timer:5,activeStart:0,activeEnd:8,damage:60,isUltimate:true,hasHit:false,rangeX:100,rangeY:60,hitstun:20};d.attacking=true
 C.resolveAttackHit(d,f);assert(f.health<1000);assert.equal(luffyState(f).pips,0)
})
test('Reel-In is blockable; grounded pull bounded and respects body/wall limits',()=>{
 const[f,d]=pair(400);f._specialHeldDir='F';assert(executeLuffySpecial(f));advance(f,d,65)
 assert(d.health<1000);assert(d.x>=f.x+f.w+10);assert(d.x>=290&&d.x<=400);assert.equal(luffyState(f).reelUsed,true)
})
test('Reel cannot restand airborne target or arm Snapback from air hit',()=>{
 const[f,d]=pair(260);d.onGround=d.grounded=false;f._specialHeldDir='F';assert(executeLuffySpecial(f));advance(f,d,22)
 assert(d.health<1000);assert.equal(luffyState(f).pull,null);assert.equal(luffyState(f).snapUntil,0)
})
test('Anchor Heel has one use per genuine airtime and a capped descent',()=>{
 const[f,d]=pair(900);f.onGround=f.grounded=false;f._specialHeldDir='D';assert(executeLuffySpecial(f));advance(f,d,20);assert(f.vy<=18);assert.equal(luffyState(f).anchorUsed,true)
 f.attacking=false;f.currentAttack=null;f.attackCooldown=0;assert.equal(executeLuffySpecial(f),false)
 tickLuffy(f,d,{});f.onGround=f.grounded=true;tickLuffy(f,d,{});assert.equal(luffyState(f).anchorUsed,false)
})
test('ultimate whiff never arms follow-ups or captures target',()=>{
 const[f,d]=pair(900);f.energy=100;step(f,d,{ultimate:true});assert.equal(f.energy,0);advance(f,d,140);assert.equal(d.health,1000);assert.equal(d.hitstun,0);assert(!f.attacking)
})
test('ultimate clean opener produces exactly four contacts through shared scaling',()=>{
 const[f,d]=pair(200);f.energy=100;step(f,d,{ultimate:true});let hits=0,last=1000
 for(let i=0;i<300;i++){step(f,d);if(d.health<last){hits++;last=d.health}}
 assert.equal(hits,4);assert(d.health>780);assert.equal(d.hitstun,0);assert(!f.attacking)
})
test('armor damage cannot grant Wind-Up or a confirmed recovery cancel',()=>{
 const[f,d]=pair();d.rosterKey='superman';d.attacking=true;d.currentAttack={name:'heavy',superArmor:true,total:50,timer:40,activeStart:30,activeEnd:32}
 cast(f,'light');advance(f,d,5);assert.equal(luffyState(f).pips,0);assert(!f.currentAttack?.lfConfirmed)
})
test('interruption, KO and identity replacement clear executable character state',()=>{
 const[f,d]=pair();const s=luffyState(f);s.pips=3;s.snapQueued=true;s.pull={side:'p2',left:100,frames:10};f.hitstun=5;tickLuffy(f,d,{});assert.equal(s.pull,null);assert.equal(s.snapQueued,false)
 C.applyScaledDamage(f,10000,{source:'test',scale:1});assert.equal(f.health,0);assert.equal(f._luffy,undefined)
 f.health=1000;luffyState(f);f.rosterKey='goku';tickLuffy(f,d,{});assert.equal(f._luffy,undefined)
 clearLuffy(f)
})
test('authoritative state survives JSON round trip and identical inputs remain deterministic',()=>{
 const run=()=>{const[f,d]=pair();for(let i=0;i<240;i++)step(f,d,{light:i%28===0});return JSON.stringify({s:f._luffy,hp:d.health,en:f.energy,attack:f.currentAttack})}
 assert.equal(run(),run());const f=fighter();assert.deepEqual(JSON.parse(JSON.stringify(luffyState(f))),luffyState(f))
})
test('projectiles, DOT and self-effects never grant normal pips or Stamina',()=>{
 const[f,d]=pair();const energy=f.energy
 C.resolveProjectileHitsMulti([{owner:f,ownerId:f.side,x:d.x+30,y:d.y+40,radius:10,damage:25,vx:5,lifetime:10}], [d])
 C.applyScaledDamage(d,10,{attacker:f,source:'dot'});C.applyScaledDamage(f,10,{attacker:f,source:'self'})
 assert.equal(luffyState(f).pips,0);assert.equal(f.energy,energy)
})
test('extended distal hand can be punished without widening the body hurtbox',()=>{
 const[f,d]=pair(440);cast(f,'lfPiston');f.currentAttack.timer=f.currentAttack.total-13
 assert.equal(C.getHurtbox(f).w,48);cast(d,'light');d.currentAttack.timer=d.currentAttack.total-5
 C.resolveAttackHit(d,f);assert(f.health<1000);assert.equal(f.currentAttack,null);assert.equal(C.getHurtbox(f).w,48)
})
test('Balloon cannot absorb an ordinary projectile',()=>{
 const[f,d]=pair();cast(f,'lfBrace');advance(f,d,11)
 C.resolveProjectileHitsMulti([{owner:d,ownerId:d.side,x:f.x+30,y:f.y+40,radius:10,damage:25,vx:-5,lifetime:10}], [f])
 assert(f.health<1000);assert.equal(luffyState(f).pips,0)
})
test('shared grab bypasses Balloon and interrupts its executable defense',()=>{
 const[f,d]=pair(160);cast(f,'lfBrace');advance(f,d,11);assert.equal(C.resolveGrab(d,f),true)
 tickLuffy(f,d,{});assert.equal(f.currentAttack,null);assert.equal(luffyState(f).pips,0);assert.equal(f.isGrabbed,true)
})
test('shared parry outcome never awards pips or permits Snapback',()=>{
 const[f,d]=pair();cast(f,'lfPiston');luffyState(f).pips=2
 // Exercise the existing shared short-startup parry contract; do not alter its roster-wide rules.
 Object.assign(f.currentAttack,{total:8,timer:5,activeStart:6,activeEnd:6});d._parryInputBuffer=5
 assert.equal(C.checkParry(d,f),true);tickLuffy(f,d,{special:true})
 assert.equal(f.currentAttack,null);assert.equal(luffyState(f).pips,2);assert.equal(luffyState(f).snapUntil,0)
})
test('blocked Piston cannot enable a retap cancel',()=>{
 const[f,d]=pair();d.isBlocking=true;d._blockHeldFrames=20;luffyState(f).pips=2
 step(f,d,{special:true});advance(f,d,16);step(f,d,{special:true});advance(f,d,4)
 assert.equal(luffyState(f).pips,2);assert.notEqual(f.currentAttack?.name,'lfSnap')
})
test('Snapback and Reel-In cannot be repeated inside one live combo',()=>{
 const[f,d]=pair(230),s=luffyState(f);s.snapUsed=true;s.reelUsed=true;s.pips=3;d.hitstun=100
 cast(f,'lfPiston');advance(f,d,14);assert.equal(s.snapUntil,0)
 f.attacking=false;f.currentAttack=null;f.attackCooldown=0;cast(f,'lfReel');advance(f,d,20)
 assert.equal(s.pull,null);assert.equal(s.reelUsed,true);assert.equal(s.snapUsed,true)
 d.hitstun=0;d.hitstop=0;f.hitstop=0;tickLuffy(f,d,{});assert.equal(s.snapUsed,false);assert.equal(s.reelUsed,false)
})
test('blocked ultimate only resolves opener chip and uses shared recast policy',()=>{
 const[f,d]=pair();f.energy=100;d.isBlocking=true;d._blockHeldFrames=20
 assert.equal(A.triggerUltimate(f,{}),true);assert(f.ultimateCooldown>0)
 advance(f,d,31);const hp=d.health;assert(f.currentAttack?.lf?.noHit);assert.equal(f.currentMove,'lfFinaleMiss')
 advance(f,d,200);assert.equal(d.health,hp);assert.equal(d.hitstun,0);assert(!f.attacking)
 f.energy=100;assert.equal(A.triggerUltimate(f,{}),false)
})
test('whiffed command retaps cannot advance the string',()=>{
 const[f,d]=pair(900);step(f,d,{right:true,heavy:true});advance(f,d,14);step(f,d,{heavy:true})
 assert.notEqual(f.currentAttack?.name,'lfCmd2');advance(f,d,30);assert.equal(f._rekkaNext,null)
})

test('Ultimate has priority over simultaneous Special; a failed attempt cannot spill into a special',()=>{
 const[f,d]=pair(900);step(f,d,{ultimate:true,special:true});assert.equal(f.attacking,false)
 advance(f,d,20,{ultimate:true,special:true});assert.equal(luffyState(f).serial,0);assert.equal(f.energy,50)
})


test('Anchor Heel caps integrated falling displacement before gravity moves the body',()=>{
 const[f]=pair();f.onGround=f.grounded=false;f.y=0;f.vy=25;f.groundY=2000;cast(f,'lfAnchor');
 physics.applyGravity(f);assert.equal(f.y,18);assert.equal(f.vy,18)
})

test('Luffy resets release victory/defeat poses without clearing another fighter pose',()=>{
 const f=fighter();f._forceAction='win';clearLuffy(f);assert.equal(f._forceAction,undefined)
 f._forceAction='lose';luffyState(f);clearLuffy(f);assert.equal(f._forceAction,undefined)
 const other=fighter('goku');other._forceAction='win';clearLuffy(other);assert.equal(other._forceAction,'win')
})
console.log(`LUFFY: ${passed} passed, 0 failed`)
