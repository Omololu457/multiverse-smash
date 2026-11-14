// harness/spd_pink.test.mjs — S.P.D. Pink Ranger (Syd Drew) mechanics + MEASURED routes.
// Real keyboard input through the actual movement/command parsers (no startup-skipping for routes).
// Writes docs/spd_pink/mechanics_results.json.   node harness/spd_pink.test.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],report={routes:[],advantages:[],moves:{},iron:{},counter:{}};let pass=0,fail=0
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
const ck=(n,ok,d='')=>{ok?pass++:fail++;console.log(ok?'PASS':'FAIL',n,d)}
// Roster-parity pass (2026-11-13): HP HP→1120 and every authored damage value ×1.7 (SPD_PINK_DAMAGE_SCALE).
const HP=1120,SC=1.7,sc=v=>Math.round(v*SC)
const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
const state=()=>page.evaluate(()=>{const H=__harness.spdPinkTest,b=H.raw('p2');return{a:H.state(),b:H.state('p2'),stun:b.hitstun,block:b.blockstun,combo:H.raw().comboCounter,bAtk:b.attacking}})
async function tap(ks,n=1){for(const k of ks)await page.keyboard.down(k);await step(n);for(const k of ks)await page.keyboard.up(k)}
async function reset(gap=72,flip=false){await page.evaluate(([gap,flip])=>{const H=__harness.spdPinkTest;H.reset();__harness.setDummyBehavior('stand');const a=H.raw(),b=H.raw('p2');a.x=flip?1300+gap:1300;b.x=flip?1300:1300+gap;a.facing=flip?-1:1;b.facing=flip?1:-1
 for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.comboCounter=0;f.comboTimer=0;f.vx=f.vy=0;f.invulnTimer=0;f.hitstop=0;f._forceGuard=false;f.isBlocking=false;f.dashTimer=0;f.dashCooldown=0;f.leftTapTime=f.rightTapTime=0;f.hitstun=0;f.blockstun=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0}},[gap,flip]);await step(1)}
async function wait(pred,max=100){for(let i=0;i<max;i++){const s=await state();if(pred(s))return s;await step(1)}return state()}
const clean=()=>wait(s=>s.a.attack?.pink?.clean),rec=()=>wait(s=>s.a.cancel.open)
const FWD=flip=>flip?'a':'d',BACK=flip=>flip?'d':'a'
// Grant Iron Reserve the honest way: real Charge press, wait for the 12+24 completion.
async function prep(){await tap(['p']);return wait(s=>s.a.reserve,60)}
const p2move=k=>page.evaluate(k=>{const z=__harness.spdPinkTest.raw('p2');z.attacking=false;z.currentAttack=null;z.attackCooldown=0;return __harness.spdPinkTest.move(k,'p2')},k)
async function route(label,steps,{gap=72,flip=false,between=rec,pre=null}={}){
 await reset(gap,flip);if(pre)await pre();const hits=[],stunAtRetap=[];const e0=(await state()).a.energy;let s
 for(let i=0;i<steps.length;i++){const hp=(await state()).b.hp;if(typeof steps[i]==='function')await steps[i]();else await tap(steps[i]);s=await wait(s=>s.b.hp<hp,90);hits.push(hp-s.b.hp)
  if(i<steps.length-1){await between(i);stunAtRetap.push((await state()).stun)}}
 s=await state();const r={label,hits,damage:HP-s.b.hp,energySpentNet:+(e0-s.a.energy).toFixed(2),trueCombo:stunAtRetap.every(x=>x>0),stunAtRetap,comboCounter:s.combo,flip};report.routes.push(r);return r}
try{
 await page.goto(server.base+'/index.html?harness=1&p1=spd_pink&p2=spd_pink&seed=883355');await page.waitForFunction(()=>window.__harness?.spdPinkTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone());await step(3);await page.waitForFunction(()=>__harness.spriteReady().ready)
 let s=await state();ck('both slots spd_pink, HP'+HP+', normal starting energy (<60 of 100)',s.a.key==='spd_pink'&&s.a.hp===HP&&s.b.hp===HP&&s.a.energy<60&&(await page.evaluate(()=>__harness.spdPinkTest.raw().maxEnergy))===100,JSON.stringify({e:s.a.energy}))
 // ── Normals / strings
 for(const flip of [false,true]){
  const r=await route('J1 -> J2 -> J3'+(flip?' (mirrored)':''),[['j'],['j'],['j']],{flip});ck(r.label+' hits & true combo',r.hits.length===3&&r.hits.every(x=>x>0)&&r.trueCombo,JSON.stringify(r))
 }
 const J1=report.routes[0].hits[0];report.engineDamageScale=+(J1/sc(17)).toFixed(3)
 await reset();await tap(['j']);await clean();await rec();await tap(['j']);await clean();await rec();await tap(['j']);await clean();await rec();await tap(['j']);s=await state();ck('three Light stages maximum (4th press does not chain)',s.a.attack?.name==='pJ3'||!s.a.attack,String(s.a.attack?.name))
 await reset();await page.keyboard.down('j');await step(100);await page.keyboard.up('j');s=await state();ck('held Light never auto-chains (one hit only)',s.b.hp===HP-J1,String(s.b.hp))
 let r=await route('J1 -> Heavy -> Deltamax Shot',[['j'],['k'],['l']]);ck(r.label,r.hits.every(x=>x>0)&&r.trueCombo,JSON.stringify(r))
 r=await route('Forward+Heavy -> Heavy -> Heavy',[['d','k'],['k'],['k']]);ck(r.label+' (weapon check -> kick -> knock-away)',r.hits.every(x=>x>0)&&r.trueCombo,JSON.stringify(r))
 await reset();await tap(['d','k']);s=await state();ck('F+H starts the weapon check',s.a.attack?.name==='pCheck')
 await clean();await rec();await tap(['k']);await clean();await rec();await tap(['w','k']);ck('confirmed command Up+Heavy branches to launcher',(await state()).a.attack?.name==='up')
 for(const g of ['whiff','block']){await reset(g==='whiff'?700:72);if(g==='block'){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}await tap(['d','k']);await rec();await tap(['k']);ck('command retap rejected on '+g,(await state()).a.attack?.name==='pCheck')}
 await reset();await tap(['i']);await clean();s=await state();ck('launcher does not lift the attacker',s.a.grounded)
 await rec();await tap(['w']);await step(3);await tap(['j']);await wait(s=>s.a.attack?.name==='air'&&s.a.attack.pink.clean,60);await step(20);s=await state()
 r={label:'Launcher -> manual Jump -> Air',damage:HP-s.b.hp,hits:null,trueCombo:s.combo>=2,comboCounter:s.combo};report.routes.push(r);ck(r.label+' connects (combo 2)',s.combo>=2&&r.damage>J1*2,JSON.stringify(r))
 // ── Deltamax Shot
 await reset(700);let e0=(await state()).a.energy;await tap(['l']);let e1=(await state()).a.energy;await step(17);s=await state();ck('one finite Deltamax shot, raw 38, cost 12, startup 16',s.a.shots.length===1&&s.a.shots[0].damage===sc(38)&&Math.abs(e0-e1-12)<0.5,JSON.stringify({shots:s.a.shots,spent:e0-e1}))
 await step(26);await tap(['l']);s=await state();ck('second shot rejected while first remains',s.a.shots.length===1&&!s.a.attack)
 await step(60);s=await state();ck('shot has a finite lifetime',s.a.shots.length===0)
 // ── IRON RESERVE
 await reset(300);await tap(['p']);s=await state();const tot=await page.evaluate(()=>__harness.spdPinkTest.raw().currentAttack?.total)
 ck('Charge starts the preparation: 12+24+12 = 48f, cooldown armed',s.a.attack?.name==='pPrep'&&tot===48&&s.a.s.prepCooldown>0,String(tot))
 const pStart=s.a.s.clock;s=await wait(s=>s.a.reserve,60);ck('completion (after 12+24f) grants exactly one charge, lifetime 300',s.a.reserve?.timer>=299&&s.a.s.reserves===1&&s.a.s.clock-pStart>=35&&s.a.s.clock-pStart<=37,JSON.stringify({res:s.a.reserve,dt:s.a.s.clock-pStart}))
 const rClock=s.a.s.clock;await step(14);await tap(['p']);s=await state();ck('max one charge / cooldown: second Charge rejected',!s.a.attack&&s.a.s.reserves===1)
 await wait(s=>!s.a.reserve,320);s=await state();ck('charge expires after 300f with nothing back',!s.a.reserve&&s.a.s.expired===1&&s.a.s.clock-rClock>=299&&s.a.s.clock-rClock<=301,String(s.a.s.clock-rClock))
 await reset(300);await tap(['p']);await step(80);await tap(['p']);s=await state();ck('cooldown 180f: re-press at ~80f rejected',!s.a.attack&&s.a.s.preps===1)
 await reset(300);await page.keyboard.down('p');await step(300);await page.keyboard.up('p');s=await state();ck('held Charge never repeats the preparation',s.a.s.preps===1)
 await reset(300);await tap(['s','p']);s=await state();ck('crouching Charge does not prepare',!s.a.attack)
 await reset(300);await tap(['d','p']);s=await state();ck('directional Charge does not prepare (neutral only)',s.a.attack?.name!=='pPrep')
 await reset(72);await tap(['p']);await step(14);await p2move('heavy');s=await wait(s=>s.a.hp<HP,40);await step(60);s=await state()
 ck('interrupted preparation grants nothing',s.a.hp<HP&&!s.a.reserve&&s.a.s.reserves===0,JSON.stringify({hp:s.a.hp,res:s.a.s.reserves}))
 // consumers
 await reset(300);await prep();await page.evaluate(()=>{__harness.spdPinkTest.raw('p2').x=__harness.spdPinkTest.raw().x+72});await step(14);await tap(['k']);s=await state();const iron=await page.evaluate(()=>{const a=__harness.spdPinkTest.raw().currentAttack;return a&&{n:a.name,d:a.damage,t:a.total,as:a.activeStart}})
 ck('next Heavy consumes the charge on START: raw 70, startup 18 (15+3), total 53 (+6 recovery)',iron?.n==='heavyIron'&&iron.d===sc(70)&&iron.t===18+3+32&&!s.a.reserve,JSON.stringify(iron))
 s=await wait(s=>s.b.hp<HP,40);report.iron.chargedHeavyApplied=HP-s.b.hp
 await reset(700);await prep();await step(14);await tap(['k']);s=await state();ck('whiffed Heavy still spends the charge',s.a.attack?.name==='heavyIron'&&!s.a.reserve)
 await reset(72);await page.evaluate(()=>__harness.setDummyBehavior('block'));await prep();await step(14);await tap(['k']);s=await wait(s=>s.block>0,40);const blk={blocked:!!s.a.attack?.pink?.blocked,stun:s.stun,block:s.block};await step(40);s=await state()
 ck('blocked Heavy spends the charge (blocked, chip only, no guard break)',blk.blocked&&blk.block>0&&blk.stun===0&&!s.a.reserve&&HP-s.b.hp<sc(20)&&s.a.s.consumed===1,JSON.stringify({...blk,chip:HP-s.b.hp}))
 await reset(72);await prep();await step(14);await tap(['j']);await step(30);s=await state();ck('Light does NOT consume the charge',!!s.a.reserve&&s.b.hp<HP)
 await reset(700);await prep();await step(14);await tap(['l']);await step(30);s=await state();ck('Deltamax Shot does NOT consume the charge',!!s.a.reserve&&s.a.s.consumed===0)
 await reset(72);await prep();await step(14);await tap(['o']);await step(40);s=await state();ck('grab does NOT consume the charge',!!s.a.reserve&&s.a.s.consumed===0,JSON.stringify({res:s.a.reserve}))
 await reset(700);await prep();await step(14);const t0=(await state()).a.reserve.timer;await tap(['d']);await step(2);await tap(['d']);await step(16);s=await state()
 ck('teleport neither consumes nor resets Iron Reserve',s.a.teleport?.count===1&&!!s.a.reserve&&s.a.reserve.timer<t0,JSON.stringify({t0,t:s.a.reserve?.timer}))
 await reset(72);await prep();await step(14);await tap(['d','l']);s=await state();const ib=await page.evaluate(()=>{const a=__harness.spdPinkTest.raw().currentAttack;return a&&{n:a.name,d:a.damage,t:a.total,st:a.activeStart}})
 ck('Iron Breaker consumes the charge: raw 72, startup 20 (17+3), +6 recovery',ib?.n==='pBreakerIron'&&ib.d===sc(72)&&ib.t===20+3+34&&!s.a.reserve,JSON.stringify(ib))
 await reset(300);await prep();await page.evaluate(()=>{__harness.spdPinkTest.raw().energy=100});await tap(['u']);await step(30);s=await state();ck('ultimate press neither spends nor uses the charge',!!s.a.reserve&&s.a.energy>=99)
 // charged Heavy punish: the opponent whiffs a Heavy at 150px, Syd punishes its recovery with the stored charge
 await reset(300);await prep();await step(14);await page.evaluate(()=>{const H=__harness.spdPinkTest,a=H.raw(),b=H.raw('p2');b.x=a.x+a.w+100});await step(1);await p2move('heavy');await wait(s=>s.b.attack?.name==='heavy'&&s.b.attack.total-s.b.attack.timer>18,40)
 for(let i=0;i<20&&(await state()).b.x-((await state()).a.x+(await state()).a.w)>70;i++){await page.keyboard.down('d');await step(1)}await page.keyboard.up('d');await tap(['k'])
 s=await wait(s=>s.b.hp<HP,40);r={label:'Iron Reserve -> charged Heavy punish (opponent Heavy whiffed at 100px edge gap; Syd walks in)',damage:HP-s.b.hp,defenderStillRecovering:!!s.bAtk||s.stun>0};report.routes.push(r);ck(r.label,r.damage>0,JSON.stringify(r))
 // ── IRON BREAKER
 await reset(72);e0=(await state()).a.energy;await tap(['d','l']);e1=(await state()).a.energy;s=await state();const bk=await page.evaluate(()=>{const a=__harness.spdPinkTest.raw().currentAttack;return a&&{n:a.name,d:a.damage,t:a.total,as:a.activeStart}})
 ck('Iron Breaker: cost 20, raw 56, startup 17',bk?.n==='pBreaker'&&bk.d===sc(56)&&bk.as===17&&Math.abs(e0-e1-20)<0.5,JSON.stringify({bk,spent:e0-e1}))
 await reset(700);await tap(['d','l']);const bo=(await state()).a.attack?.pink?.origin;await step(50);s=await state();ck('Iron Breaker advance bounded ~90px (from move origin)',s.a.x-bo>=80&&s.a.x-bo<=90.01,String(s.a.x-bo))
 await reset(72);await tap(['d','l']);await step(50);s=await state();ck('Iron Breaker stops at the body (no capture / cross)',s.a.x+s.a.w<=s.b.x+1&&s.combo<=1)
 r=await route('J1 -> J2 -> Iron Breaker (confirm)',[['j'],['j'],['d','l']]);ck(r.label,r.hits.every(x=>x>0)&&r.trueCombo,JSON.stringify(r))
 r=await route('Iron Reserve, then J1 -> J2 -> charged Iron Breaker',[['j'],['j'],['d','l']],{gap:72,pre:async()=>{await page.evaluate(()=>{__harness.spdPinkTest.raw('p2').x+=200});await prep();await step(14);await page.evaluate(()=>{const H=__harness.spdPinkTest;H.raw('p2').x=H.raw().x+72})}})
 ck(r.label+' (charged: +3f startup — combo or gap measured)',r.hits.every(x=>x>0),JSON.stringify(r))
 // ── RISING CHECK
 await reset(700);e0=(await state()).a.energy;await tap(['s','l']);e1=(await state()).a.energy;await step(14);s=await state();ck('Rising Check leaves ground, cost 18, no invulnerability',!s.a.grounded&&s.a.s.riseUsed&&Math.abs(e0-e1-18)<0.5&&!s.a.invuln,JSON.stringify({g:s.a.grounded,spent:e0-e1}))
 s=await wait(s=>s.a.s.landing>0,90);ck('explicit landing recovery (16f)',s.a.s.landing>=14&&s.a.s.landing<=16,String(s.a.s.landing))
 await reset(72);await tap(['s','l']);s=await wait(s=>s.b.hp<HP,40);ck('Rising Check raw 42 hits',s.a.attack?.damage===sc(42)&&s.b.hp<HP,String(HP-s.b.hp))
 // ── FALLING ROSE
 await reset(700);await tap(['w']);await step(6);e0=(await state()).a.energy;await tap(['s','l']);s=await state();ck('Falling Rose in the air, raw 44, cost 15',s.a.attack?.name==='pRose'&&s.a.attack.damage===sc(44)&&Math.abs(e0-s.a.energy-15)<0.5)
 let maxVy=0;for(let i=0;i<60&&!(await state()).a.grounded;i++){maxVy=Math.max(maxVy,(await state()).a.vy);await step(1)}await step(1);s=await state();ck('capped descent (vy<=14) and 24f landing recovery',maxVy<=14.01&&s.a.s.landing>=22&&s.a.s.landing<=24,JSON.stringify({maxVy,land:s.a.s.landing}))
 await reset(700);await tap(['w']);await step(4);await tap(['s','l']);await step(14);e0=(await state()).a.energy;await page.evaluate(()=>{const a=__harness.spdPinkTest.raw();a.attacking=false;a.currentAttack=null;a.attackCooldown=0});await tap(['s','l']);s=await state();ck('Falling Rose once per airtime (no pogo / air reset)',s.a.attack?.name!=='pRose'&&e0-s.a.energy<1)
 await reset(64);await tap(['w']);await step(5);await tap(['s','l']);s=await wait(s=>s.b.hp<HP,60);const vyHit=s.a.vy;await step(2);s=await state();ck('Falling Rose connects without bounce/hover',HP-s.b.hp>0&&s.a.vy>=0&&vyHit>=0,JSON.stringify({vy:s.a.vy}))
 // ── BATON REPRISAL
 async function stance({gap=72,behind=false,guard=false,mutate=null,lead=0}={}){await reset(gap);if(behind)await page.evaluate(()=>{const H=__harness.spdPinkTest,a=H.raw(),b=H.raw('p2');b.x=a.x-72;b.facing=1;a.facing=1});if(guard){await page.evaluate(()=>__harness.setDummyBehavior('block'))}
  e0=(await state()).a.energy;await tap(['a','l']);const st=await state();if(lead)await step(lead);await p2move('heavy');if(mutate)await page.evaluate(m=>{const at=__harness.spdPinkTest.raw('p2').currentAttack;Object.assign(at,m)},mutate)
  let hit=null,resp=null,resHit=0,hpB=null;for(let i=0;i<70;i++){s=await state();if(hit===null&&s.a.hp<HP)hit=i;if(!resp&&s.a.attack?.name==='pReprisal'){resp=i;hpB=s.b.hp}if(resp!==null&&!resHit&&s.b.hp<hpB)resHit=hpB-s.b.hp;await step(1)}s=await state()
  return {start:st.a.attack?.name,spent:+(e0-st.a.energy).toFixed(2),hpA:s.a.hp,hpB:s.b.hp,counters:s.a.s.counters,responseAt:resp,responseHit:resHit,blockedResponse:s.b.hp===HP&&resp!==null,cd:s.a.s.stanceCooldown}}
 let c=await stance();report.counter.success=c
 ck('Baton Reprisal: back Special enters stance, cost 18',c.start==='pStance'&&Math.abs(c.spent-18)<0.5,JSON.stringify(c))
 ck('close frontal melee hit consumed (no damage) -> one blockable raw 40 response lands',c.hpA===HP&&c.counters===1&&c.responseAt!==null&&c.responseHit>0,JSON.stringify(c))
 report.routes.push({label:'Baton Reprisal counter -> response',damage:c.responseHit,trueCombo:null,note:'one response; not a stun riposte'})
 c=await stance({behind:true});ck('hit from BEHIND is not countered',c.hpA<HP&&c.counters===0,JSON.stringify(c))
 c=await stance({mutate:{isUltimate:true}});ck('ultimate-flagged hit is not countered',c.hpA<HP&&c.counters===0,JSON.stringify(c))
 c=await stance({mutate:{damageType:'grab',isGrab:true}});ck('grab-typed hit is not countered',c.hpA<HP&&c.counters===0,JSON.stringify(c))
 c=await stance({mutate:{counterBypass:true}});ck('explicit counter-bypass move is not countered',c.hpA<HP&&c.counters===0,JSON.stringify(c))
 c=await stance({lead:20});ck('hit after the 12f window (stance recovery) is not countered — stance is punishable',c.hpA<HP&&c.counters===0,JSON.stringify(c))
 // blockable response: P2 recovers & blocks
 await reset(72);await tap(['a','l']);await step(3);await p2move('pJ2');await wait(s=>s.a.s.counters===1,40);await page.evaluate(()=>{const z=__harness.spdPinkTest.raw('p2');z.attacking=false;z.currentAttack=null;__harness.setDummyBehavior('block')});s=await wait(s=>s.block>0,40);const rb={blocked:!!s.a.attack?.pink?.blocked,name:s.a.attack?.name,stun:s.stun};await step(40);s=await state()
 ck('response is blockable when the attacker has recovered (blocked, chip only)',rb.blocked&&rb.name==='pReprisal'&&rb.stun===0&&s.a.s.responses===1&&HP-s.b.hp<sc(10)&&s.a.s.counters===1,JSON.stringify({...rb,chip:HP-s.b.hp}))
 // recursion: P2 is a Pink in an active stance when P1's response arrives
 await reset(72);await tap(['a','l']);await p2move('heavy');await wait(s=>s.a.s.counters===1,40)
 await page.evaluate(()=>{const H=__harness.spdPinkTest,z=H.raw('p2');z.attacking=false;z.currentAttack=null;z._spdPink.stanceCooldown=0;H.move('pStance','p2');const at=z.currentAttack;at.timer=at.total-at.activeStart})
 await step(30);s=await state();ck('no counter recursion: the response is not countered by another Reprisal',s.b.s.counters===0&&s.a.s.counters===1&&s.b.hp<HP,JSON.stringify({b:s.b.s.counters,hp:s.b.hp}))
 // projectile: calibrate the shot's arrival, then put it inside the stance window
 await reset(260);await p2move('pShot');let arrive=null;for(let i=0;i<80;i++){if((await state()).a.hp<HP){arrive=i;break}await step(1)}
 await reset(260);await p2move('pShot');await step(Math.max(0,arrive-14));await tap(['a','l']);await step(40);s=await state();ck('projectile is never countered or reflected',s.a.hp<HP&&s.a.s.counters===0&&!s.b.s.counters,JSON.stringify({arrive,hp:s.a.hp}))
 await reset(72);await tap(['a','l']);await step(60);await page.evaluate(()=>{const a=__harness.spdPinkTest.raw();a.energy=100});await tap(['a','l']);s=await state();ck('Baton Reprisal cooldown 180f',s.a.attack?.name!=='pStance')
 await reset(72);await page.keyboard.down('a');await page.keyboard.down('l');await step(200);await page.keyboard.up('l');await page.keyboard.up('a');s=await state();ck('held input never repeats the stance (no new stance after the 180f cooldown while held)',s.a.s.stanceCooldown===0&&s.a.attack?.name!=='pStance')
 // ── DOUBLE-TAP TELEPORT (shared groundTeleport.js contract)
 for(const flip of [false,true]){await reset(700,flip);await tap([FWD(flip)]);await step(2);e0=(await state()).a.energy;await tap([FWD(flip)]);s=await state();const x0=s.a.teleport.action?.x0;e1=s.a.energy
  ck('fresh double tap -> phase step (no dash)'+(flip?' (mirrored)':''),s.a.teleport.count===1&&!!s.a.teleport.action&&s.a.dash===0)
  await step(14);s=await state();ck('phase step: 120px, cost 8, no invulnerability'+(flip?' (mirrored)':''),Math.abs(s.a.x-x0)===120&&Math.abs(e0-e1-8)<0.5&&!s.a.invuln,JSON.stringify({d:s.a.x-x0,spent:e0-e1}))}
 await reset(700);await page.keyboard.down('d');await step(60);await page.keyboard.up('d');ck('holding a direction never teleports',((await state()).a.teleport?.count||0)===0)
 await reset(700);await page.evaluate(()=>{__harness.spdPinkTest.raw().energy=0});await tap(['d']);await step(1);await tap(['d']);s=await state();ck('low Energy -> legal dash fallback, never both',!s.a.teleport?.count&&s.a.dash>0)
 await reset(140);await tap(['d']);await step(2);await tap(['d']);await step(16);s=await state();ck('teleport stops at the opponent body (no automatic side switch)',s.a.x+s.a.w<=s.b.x+1&&s.a.facing===1,JSON.stringify({a:s.a.x,b:s.b.x}))
 await reset(700);await tap(['d']);await step(2);await tap(['d']);await step(16);await tap(['d']);await step(2);await tap(['d']);s=await state();ck('36f cooldown blocks an immediate second step',s.a.teleport.count===1)
 await reset(72);await page.evaluate(()=>{__harness.spdPinkTest.raw().hitstun=20});await tap(['d']);await step(1);await tap(['d']);s=await state();ck('no teleport while stunned',!s.a.teleport?.count)
 await reset(72);await page.evaluate(()=>__harness.setDummyBehavior('stand'));await tap(['j']);await step(2);await tap(['d']);await step(1);await tap(['d']);s=await state();ck('no teleport out of an attack (no unapproved cancel)',!s.a.teleport?.count)
 await reset(300);await page.keyboard.down(';');await step(4);await tap(['d']);await step(1);await tap(['d']);await page.keyboard.up(';');s=await state();ck('no teleport while guarding',!s.a.teleport?.count)
 await reset(190);await tap(['d']);await step(2);await tap(['d']);await step(13);await tap(['k']);s=await wait(s=>s.b.hp<HP,40)
 r={label:'Phase step (120px) -> Heavy punish',damage:HP-s.b.hp,energySpentNet:+(100-s.a.energy).toFixed(2)};report.routes.push(r);ck(r.label,r.damage>0,JSON.stringify(r))
 // ── ULTIMATE (shared Zord not present)
 await reset();await page.evaluate(()=>{__harness.spdPinkTest.raw().energy=100});await tap(['u']);await step(50);s=await state();ck('ultimate unavailable: spends nothing, no fallback, no guaranteed damage',s.b.hp===HP&&s.a.energy>=100&&!s.a.attack)
 // ── Mirror ownership: P2's preparation never charges P1
 await reset(300);await p2move('pPrep');await step(50);s=await state();ck('Iron Reserve is per-owner (P2 charged, P1 not)',!!s.b.reserve&&!s.a.reserve)
 await reset(300);await tap(['p']);await p2move('pPrep');await step(50);s=await state();ck('simultaneous mirror preparations: two independent charges',!!s.a.reserve&&!!s.b.reserve)
 // ── Per-move measured frame advantage (hit + block)
 for(const guard of [false,true])for(const key of ['light','pJ2','pJ3','heavy','heavyIron','pLow','up','pCheck','pKick','pAway','pBreaker','pBreakerIron','pRise','pReprisal']){
  await reset();if(guard){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}
  const t0=await page.evaluate(k=>{__harness.spdPinkTest.move(k);return __harness.spdPinkTest.raw().currentAttack?.total},key);let first=null
  for(let i=0;i<60;i++){s=await state();if(guard?s.block>0:s.a.attack?.pink?.clean){first=i;break}await step(1)}
  let ar=null,dr=null;if(first!==null)for(let i=0;i<150;i++){s=await state();if(ar===null&&!s.a.attack&&!(s.a.s?.landing>0))ar=i;if(dr===null&&(guard?s.block:s.stun)<=0)dr=i;if(ar!==null&&dr!==null)break;await step(1)}
  report.advantages.push({key,guard,total:t0,contactFrame:first,attackerReadyAfter:ar,defenderFreeAfter:dr,advantage:ar===null||dr===null?null:dr-ar})
 }
 ck('every grounded normal/special connects (hit + block)',report.advantages.every(a=>a.contactFrame!==null),JSON.stringify(report.advantages.filter(a=>a.contactFrame===null)))
 const adv=(k,g)=>report.advantages.find(a=>a.key===k&&a.guard===g)?.advantage
 ck('Iron Breaker is punishable on block',adv('pBreaker',true)<=-8,String(adv('pBreaker',true)))
 ck('charged Heavy is less safe than plain Heavy (+6 recovery)',adv('heavyIron',true)<adv('heavy',true),`${adv('heavyIron',true)} vs ${adv('heavy',true)}`)
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{report.passes=pass;report.failures=fail;report.errors=errors;fs.writeFileSync('docs/spd_pink/mechanics_results.json',JSON.stringify(report,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
