import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics, WALK_FEEL } from '../physics.js'   // WALK_FEEL: the 2026-11-21 walk ×1.15
import { BEN_ALIEN_BUFF, BEN_HUMAN_BUFF } from '../benAlienBalance.js'   // 2026-11-23/24 Ben + alien speed buffs: live speed = design × buff
import { rosterDamageBoost, ogSpeedMult } from '../rosterParity.js'
import { balDmgMult } from '../rosterBalance.js'
const BAL = balDmgMult('ben10')   // roster balance sweep 2026-11-25: Ben's row multiplies his live damage
const HS = BEN_HUMAN_BUFF.speed, near = (a, b) => Math.abs(a - b) < 1e-9
import { SWAMPFIRE } from '../swampfire.js'
import { tickRegrowth, invalidateBenAction } from '../ben10State.js'
import { getAvailableAlienKeys, BEN10_SLOT_COUNT } from '../aliens.js'
let passed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { console.error('FAIL', name); throw e } }
const fresh = (key = 'ben10', x = 0, experimental = true) => ({ rosterKey: key, benExperimental: experimental, side: key === 'ben10' ? 'p1' : 'p2',
 health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
 facing: 1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
 attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1 })
const ben = (form, experimental = true, skin = 'default') => { const f = fresh('ben10', 0, experimental); F.applyBen10VariantStats(f, skin); F.setupBen10(f); if (form) { assert(F.applyAlien(f, form)); f.transformed = true } return f }
const ticks = n => { for (let i = 0; i < n; i++) A.updatePendingSpawns() }
const projectileHit = (p, target) => { p.x = target.x + target.w / 2; p.y = target.y + target.h / 2; C.resolveProjectileHitsMulti([p], [target]) }
for (const [skin, speed, jump] of [['default', 9, -19], ['ben10Classic', 9.7, -20], ['ben10Prime', 8.6, -18]]) test('variant lifecycle ' + skin, () => {
 const f = ben(null, true, skin); const hp = f.maxHealth; f.health -= 123
 for (let i = 0; i < 3; i++) { F.applyAlien(f, 'swampfire'); f.transformed = true; assert(near(f._benWalkSpeed, speed * HS * .92 * BEN_ALIEN_BUFF.speed)); F.revertToHuman(f); assert.equal(f.health, hp - 123); assert(near(f._benWalkSpeed, speed * HS)); assert.equal(f.jumpForce, jump); physics.moveFighter(f, {r:true}, {right:'r'}); assert(near(f.vx, speed * HS * WALK_FEEL)) }
})
test('production selection rejects all placeholder/invalid saved choices', () => {
 { const _ready = getAvailableAlienKeys(false); assert(_ready.length >= BEN10_SLOT_COUNT, 'PICK FIVE: at least one READY alien per dial slot'); assert.deepEqual(_ready.slice(0,5), ['swampfire','heatblast','megawhatt','goop','xlr8']) } const f = fresh('ben10',0,false); F.setupBen10(f,['clockwork','not-an-alien']); assert.deepEqual(f.omnitrix.aliens, getAvailableAlienKeys(false).slice(0, BEN10_SLOT_COUNT)); assert.equal(F.applyAlien(f,'clockwork'), false); assert(F.applyAlien(f,'swampfire')); assert(getAvailableAlienKeys(true).includes('clockwork'))
})
test('Prime is not silently approved in production', () => { const f=ben(null,false,'ben10Prime'); assert.equal(f._benVariant,'alienforce') })
test('transform startup cancels on hitstun; spent Power is not refunded', () => {
 const f=ben(); assert(F.ben10BeginTransform(f,0)); assert.equal(f.energy,80); f.hitstun=5; F.updateTransformDevice(f); assert.equal(f.omnitrix.startup,0); assert.equal(f.transformed,false)
})
test('depletion timeout and manual reversion are distinct', () => {
 const f=ben('swampfire'); f.energy=0; F.updateTransformDevice(f); assert.equal(f.transformed,false); assert.equal(f.omnitrix.timeoutCooldown,360); f.energy=100; assert.equal(F.tryTransform(f),false)
 const g=ben('swampfire'); assert(F.ben10Revert(g)); assert.equal(g.omnitrix.timeoutCooldown,0); assert.equal(g.omnitrix.manualLockout,20)
})
test('Clockwork actual spawn-to-hit slow reaches physics and expires', () => {
 A.clearAbilityState(); const f=ben('clockwork'), t=fresh('goku',75); assert(A.triggerSpecial(f,{getOpponent:()=>t})); ticks(12); const p=A.activeProjectiles.find(p=>p.name==='clockwork_ray'); assert(p); projectileHit(p,t); assert.equal(t._timeSlowTimer,96); t.hitstun=0;t.hitstop=0;t.vx=0;physics.moveFighter(t,{r:true},{right:'r'}); const slow=t.vx; for(let i=0;i<96;i++)C.updateCombat(t,f,{});assert.equal(t._timeSlowTimer,0);t.vx=0;physics.moveFighter(t,{r:true},{right:'r'}); assert.equal(t.vx,slow*2)
})
test('Diamondhead actual eruption marks juggle launch', () => {
 A.clearAbilityState(); const f=ben('diamondhead'), t=fresh('goku',75); f._specialHeldDir='D'; assert(A.triggerSpecial(f,{getOpponent:()=>t})); ticks(12); const p=A.activeProjectiles.find(p=>p.name==='ben10_diamond_eruption'); projectileHit(p,t); assert.equal(t.isLaunched,true); assert.equal(t.grounded,false); assert.equal(t.vy,-14)
})
for (const mode of ['melee','projectile']) test('one-hit Energy Guard '+mode, () => {
 const t=ben('swampfire'); t.x=70; t._benEnergyGuard=90; const f=fresh('goku');
 const contact=()=>{ if(mode==='projectile') projectileHit({owner:f,ownerId:'p2',name:'test',damage:50,radius:20,vx:1},t); else { f.attacking=false; f.attackCooldown=0; C.startMove(f,'light',{damage:50,startup:0,active:5,recovery:10,rangeX:100,rangeY:130,frameExact:true}); C.resolveAttackHit(f,t) } }
 const H0=t.health; contact(); assert.equal(t.health,H0); assert.equal(t._benEnergyGuard,0); contact(); assert(t.health<H0)   // H0 = the shared pool (950 × the 2026-11-24 Ben HP buff)
})
test('projectile interrupts ordinary attack but preserves Superman heavy armor', () => {
 const f=fresh('goku'),t=fresh('goku',70); t.currentAttack={name:'heavy'};t.attacking=true;projectileHit({owner:f,ownerId:'p1',damage:50,radius:20,vx:1},t);assert.equal(t.attacking,false);assert.equal(t.currentAttack,null)
 const s=fresh('superman',70);s.currentAttack={name:'heavy'};s.attacking=true;projectileHit({owner:f,ownerId:'p1',damage:50,radius:20,vx:1},s);assert.equal(s.attacking,true);assert.equal(s._supArmorCd,480)
})
test('pending Ben cast cancelled on interruption/identity/KO; detached shot persists', () => {
 for(const invalid of ['hit','identity','ko']) { A.clearAbilityState();const f=ben('heatblast');assert(A.triggerSpecial(f,{}));if(invalid==='hit')invalidateBenAction(f);if(invalid==='identity')f.rosterKey='goku';if(invalid==='ko')f.health=0;ticks(15);assert.equal(A.activeProjectiles.length,0) }
 A.clearAbilityState();const f=ben('heatblast');A.triggerSpecial(f,{});ticks(15);assert(A.activeProjectiles.length>0);F.revertToHuman(f);assert(A.activeProjectiles.some(p=>p.name==='heatblast_fire'))
})
test('Regrowth uses actual damage, waits 120+10 frames, respects pool/cap and never heals on entry', () => {
 const f=ben('swampfire'),att=fresh('goku'),B=rosterDamageBoost(att),H0=f.health; C.applyScaledDamage(f,100,{attacker:att,source:'projectile'}); const actual=H0-f.health;assert(Math.abs(actual-100*C.GLOBAL_DAMAGE_SCALE*B/f.defenseMultiplier)<=1.5,`${actual} ≈ 100 × global scale × goku's roster boost ÷ his defense`);const r=f.omnitrix.regrowth;assert.equal(r.pool,actual*.35);for(let i=0;i<129;i++)tickRegrowth(f);assert.equal(f.health,H0-actual);tickRegrowth(f);assert.equal(f.health,H0-actual+2);assert.equal(r.restored,2)   // H0 / B: the 2026-11-24 Ben HP buff + goku's roster boost (OG lift × balance row)
 C.applyScaledDamage(f,Math.round(1000/B),{attacker:att,source:'projectile'});assert.equal(r.wait,120);for(let i=0;i<700;i++)tickRegrowth(f);assert.equal(r.restored,80);assert(r.pool<=.000001);const hp=f.health;F.revertToHuman(f);assert.equal(f.omnitrix.regrowth,null);F.applyAlien(f,'swampfire');f.transformed=true;assert.equal(f.health,hp);assert.equal(f.omnitrix.regrowth.pool,0);assert.equal(f.omnitrix.regrowth.restored,0)
})
test('ineligible self-cost cannot bank HP and zero HP never regenerates',()=>{ const f=ben('swampfire');C.applyScaledDamage(f,40,{attacker:f});assert.equal(f.omnitrix.regrowth.pool,0);f.health=0;f.omnitrix.regrowth.pool=20;for(let i=0;i<200;i++)tickRegrowth(f);assert.equal(f.health,0) })
test('Swampfire normals raw damage, startup and exact-frame block targets',()=>{
 const expected={light:[18,5,-1],heavy:[58,15,-7],down:[26,7,-4],up:[48,12,-10],air:[32,8,2],down_air:[32,8,2]}
 for(const[k,[damage,startup,adv]]of Object.entries(expected)){const m=SWAMPFIRE.basic_attacks[k];assert.equal(m.damage,damage);assert.equal(m.startup,startup);assert.equal(m.blockstun-m.active-m.recovery,adv);const f=ben('swampfire');assert(C.startMove(f,k,m));assert.equal(f.currentAttack.activeEnd-f.currentAttack.activeStart+1,m.active)}
})
test('Swampfire Flame Jet five real contacts and actual combo curve',()=>{
 A.clearAbilityState();const f=ben('swampfire'),t=fresh('goku',160);const hp=t.health;let expected=0;assert(A.triggerSpecial(f,{}));assert.equal(f.energy,88);let hits=0
 for(let frame=1;frame<=33;frame++){A.updatePendingSpawns();const live=A.activeProjectiles.filter(p=>!p.visualOnly);for(const p of live){expected+=Math.floor(9*C.getComboScale(f)*1.1*.6*BEN_ALIEN_BUFF.damage*BAL);projectileHit(p,t);hits++;A.activeProjectiles.splice(A.activeProjectiles.indexOf(p),1)}}
 assert.equal(hits,5);assert.equal(hp-t.health,expected);assert.equal(expected,68) // 2026-11-19 alien buff ×1.5 + 2026-11-25 balance row ×1.75 (was 23); floor per hit; pre-increment scales 1,1,.92,.84,.76
})
test('Swampfire ultimate requires alien form, costs 50 and has 3 actual radial contacts',()=>{
 A.clearAbilityState();const f=ben('swampfire'),t=fresh('goku',100);assert(A.triggerUltimate(f,{getOpponent:()=>t}));assert.equal(f.energy,50);assert.equal(f.attackCooldown,161);let hits=0,expected=0;const hp=t.health
 for(let frame=1;frame<=62;frame++){A.updatePendingSpawns();for(const p of A.activeProjectiles.filter(p=>!p.visualOnly)){expected+=Math.floor(p.damage*C.getComboScale(f)*1.1*.6*BEN_ALIEN_BUFF.damage*BAL);projectileHit(p,t);hits++;A.activeProjectiles.splice(A.activeProjectiles.indexOf(p),1)}}assert.equal(hits,3);assert.equal(hp-t.health,expected)
})
test('same-seed Vow, bounded eligible loadout and serializable state',()=>{
 const a=ben(),b=ben();for(const frame of [1,20,40,200])assert.equal(F.ben10VowPick(a,42,frame,0),F.ben10VowPick(b,42,frame,0));const p=ben(null,false);assert.deepEqual(p.omnitrix.aliens,getAvailableAlienKeys(false).slice(0,BEN10_SLOT_COUNT));for(const frame of [1,20,40]){const k=F.ben10VowPick(p,42,frame,0);assert(k>=0&&k<p.omnitrix.aliens.length);assert.equal(k,F.ben10VowPick(p,42,frame,0))}   // PICK FIVE: production now loads the first five READY aliens (was Swampfire only)assert.deepEqual(JSON.parse(JSON.stringify(p.omnitrix)),p.omnitrix)
})
test('non-Ben movement and raw projectile damage preserved',()=>{ const f=fresh('goku');f.baseSpeed=88;physics.moveFighter(f,{r:true},{right:'r'});assert(near(f.vx,7*WALK_FEEL*ogSpeedMult(f)),`${f.vx}`);const t=fresh('goku',70);projectileHit({owner:f,ownerId:'p1',damage:50,radius:20,vx:1},t);assert(Math.abs((950-t.health)-30*rosterDamageBoost(f))<=1,`${950-t.health}`) })   // goku's own walk ×1.15 / OG speed lift / roster damage boost (2026-11-21..25 balance) — Ben's changes still don't leak
test('Vine Eruption fixed sites, bounded connecting hold, final launcher',()=>{
 A.clearAbilityState();const f=ben('swampfire'),t=fresh('goku',80); f._specialHeldDir='D'; assert(A.triggerSpecial(f,{})); assert.equal(f.energy,82);let hits=0;const sites=[]
 for(let frame=1;frame<=38;frame++){A.updatePendingSpawns();for(const p of A.activeProjectiles.filter(p=>!p.visualOnly)){sites.push(p.x);projectileHit(p,t);hits++;A.activeProjectiles.splice(A.activeProjectiles.indexOf(p),1)}if(t._benVineHold)physics.moveFighter(t,{},{});}
 assert.deepEqual(sites,[110,210,310]);assert.equal(hits,3);assert.equal(t.isLaunched,true);assert.equal(t._benVineHold,undefined)
})
test('Blaze Dash moves exactly 260 pixels after startup; no wall crossing',()=>{
 A.clearAbilityState();const f=ben('swampfire');f._specialHeldDir='F';assert(A.triggerSpecial(f,{}));assert.equal(f.energy,90);for(let frame=1;frame<=25;frame++){A.updatePendingSpawns();if(f._benLunge)physics.moveFighter(f,{},{})}assert.equal(f.x,260)
 f.x=physics.stageWidth-65;f._benLunge={frames:13,speed:20};for(let i=0;i<13;i++)physics.moveFighter(f,{},{});assert.equal(f.x,physics.stageWidth-f.w)
})
test('explicit zero projectile fields survive actual hit and false flags',()=>{
 A.clearAbilityState();const f=ben(),t=fresh('goku',70);const p=A.spawnProjectile(f,'zero',{damage:0,speed:0,vx:0,vy:0,knockbackX:0,knockbackY:0,hitstun:0,isSpecial:false,visualOnly:false});projectileHit(p,t);assert.equal(t.health,950);assert.equal(t.vx,0);assert.equal(t.vy,0);assert.equal(p.isSpecial,false)
})
test('generic form updates cannot erase Swampfire defense/offense',()=>{
 const f=ben('swampfire');f.currentFormData={damageMultiplier:1,defenseMultiplier:1};A.updateTransformationState(f,{});F.updateTransformDevice(f);assert(near(f.defenseMultiplier,1.1*BEN_ALIEN_BUFF.defense));assert(near(f.damageMultiplier,1.1*BEN_ALIEN_BUFF.damage))   // Swampfire 1.1 × the global alien buff
})
test('exactly 50 Power commits Inferno, then depletion reverts; interruption cancels',()=>{
 A.clearAbilityState();const f=ben('swampfire');f.energy=50;assert(A.triggerUltimate(f,{}));let beats=0;for(let i=0;i<162;i++){A.updatePendingSpawns();beats+=A.activeProjectiles.filter(p=>p.name?.startsWith('sf_inferno_')).length;A.activeProjectiles.length=0;F.updateTransformDevice(f)}assert.equal(beats,3);assert.equal(f.transformed,false);assert(f.omnitrix.timeoutCooldown>0)
 A.clearAbilityState();const g=ben('swampfire');g.energy=50;assert(A.triggerUltimate(g,{}));g.hitstun=10;F.updateTransformDevice(g);ticks(65);assert.equal(A.activeProjectiles.filter(p=>!p.visualOnly).length,0);assert.equal(g.transformed,false)
})
test('swapping mid-combo cancels the old move without clearing combo scale or healing',()=>{
 const f=ben(null,true);F.setupBen10(f,['xlr8','swampfire']);F.applyAlien(f,'xlr8');f.transformed=true;f.energy=100;f.health=700;f.comboCounter=3;f.comboTimer=80;f.attacking=true;f.currentAttack={name:'old'};assert(F.ben10Swap(f,1));assert.equal(f.currentAttack,null);assert.equal(f.attacking,false);assert.equal(f.comboCounter,3);assert.equal(f.health,700);assert.equal(f.energy,90)   // swap cost 15 → 10 (2026-11-23 Ben buff)
})
test('legacy direct damage is eligible; explicit self/ineligible damage is not',()=>{
 const f=ben('swampfire');C.applyScaledDamage(f,100,{source:'ability'});assert.equal(f.omnitrix.regrowth.pool,Math.floor(100*C.GLOBAL_DAMAGE_SCALE/f.defenseMultiplier)*.35);   // was 54: his defense now includes the global alien buff (×1.30)
 const pool=f.omnitrix.regrowth.pool;C.applyScaledDamage(f,10,{regrowthEligible:false,source:'health-cost'});assert.equal(f.omnitrix.regrowth.pool,pool)
})
test('Ben KO clears executable state and retains only defeated form presentation until reset',()=>{
 const f=ben('swampfire');f._benEnergyGuard=30;f._benGuardCd=40;f._fbAbsorbWindow=20;C.applyScaledDamage(f,9999,{attacker:fresh('goku')});assert.equal(f.health,0);assert.equal(f._benEnergyGuard,undefined);assert.equal(f._benGuardCd,undefined);assert.equal(f.omnitrix.regrowth,null);assert.equal(f._fbAbsorbWindow,undefined);assert.equal(f.activeAlien,'swampfire');F.updateTransformDevice(f);assert.equal(f.activeAlien,'swampfire');F.setupBen10(f);assert.equal(f.activeAlien,null)
})
test('paid cast recovery cannot be cancelled by walking/revert/swap',()=>{
 A.clearAbilityState();const f=ben('swampfire');f._specialHeldDir='N';assert(A.triggerSpecial(f,{}));const x=f.x;physics.moveFighter(f,{r:true},{right:'r'});assert.equal(f.x,x);assert.equal(f.vx,0);assert.equal(F.ben10Revert(f),false);assert.equal(F.ben10Swap(f,1),false);invalidateBenAction(f);assert.equal(f._benPowerCommit,0)
})
test('Classic human art and full stat block survive alien setup/revert',()=>{
 const f=fresh('ben10');f._baseSkinAnim={idle:{sheet:'classic.png'}};f.stats={attack:90,defense:85};F.applyBen10VariantStats(f,'ben10Classic');F.setupBen10(f);assert.equal(f._skinAnim.idle.sheet,'classic.png');F.applyAlien(f,'xlr8');f.transformed=true;F.revertToHuman(f);assert.equal(f._skinAnim.idle.sheet,'classic.png');assert.equal(f.stats.weight,undefined);assert.equal(f.stats.sizeW,undefined);assert.equal(f.stats.attack,90);assert.equal(f.maxJumps,1)
})
test('Swampfire block chip applies its defense divisor only once',()=>{
 const f=ben('swampfire'),a=fresh('goku');f.x=70;f.isBlocking=true;f.blockHeldFrames=100;C.startMove(a,'heavy',{damage:100,startup:0,active:5,recovery:10,rangeX:100,rangeY:130,frameExact:true});const before=f.health;C.resolveAttackHit(a,f);const d=before-f.health,one=100*C.GLOBAL_DAMAGE_SCALE*rosterDamageBoost(a)/f.defenseMultiplier*.2;assert(d>0&&Math.abs(d-one)<=one*.1,`chip ${d} ≈ ${one.toFixed(1)} (divisor once; twice would be ≈ ${(one/f.defenseMultiplier).toFixed(1)})`)   // goku's roster boost + the alien defense buff (2026-11-19..25) moved the exact number
})
A.clearAbilityState();console.log(`BEN INTEGRATION: ${passed} passed, 0 failed`)
