import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { characters } from '../characters.js'
import { KRYBOT_MOVES, krybot as KRYBOT_DEF } from '../krybotData.js'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
// Roster-parity pass (2026-11-13, owner request): HP and damage derived, not literal. Applied = floor(floor(raw*0.6)*boost).
const HP=KRYBOT_DEF.stats.maxHealth,BOOST=ROSTER_DAMAGE_BOOST.krybot||1,KM=KRYBOT_MOVES,ap=r=>Math.floor(Math.floor(r*0.6)*BOOST)
const baseline=JSON.parse(fs.readFileSync('docs/krybot/roster_baseline.json','utf8'))
for(const [key,data] of Object.entries(baseline)) for(const part of Object.keys(data)) assert.deepEqual(characters[key][part],data[part],`${key}.${part} changed since recorded working baseline`)
console.log('PASS existing roster stats/frame data unchanged from working baseline')
const server=await serve(), browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
let passes=0,failures=0
function check(name,ok,detail='') {console.log(`${ok?'PASS':'FAIL'} ${name} ${detail}`);if(ok)passes++;else failures++}
const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
const st=()=>page.evaluate(()=>({a:__harness.krybotTest.state('p1'),b:__harness.krybotTest.state('p2'),stun:__harness.krybotTest.raw('p2').hitstun,block:__harness.krybotTest.raw('p2').blockstun}))
async function tap(keys,n=1) {for(const k of keys)await page.keyboard.down(k);await step(n);for(const k of keys)await page.keyboard.up(k)}
async function padTap(buttons,n=1) {
 await page.evaluate(buttons=>{for(let i=0;i<2;i++)for(const b of buttons[i])__kryPads[i].buttons[b]={pressed:true,value:1}},buttons)
 await step(n)
 await page.evaluate(()=>{for(const p of __kryPads)for(const b of p.buttons){b.pressed=false;b.value=0}})
}
async function reset(gap=72) {
 await page.evaluate(gap=>{__harness.krybotTest.reset();__harness.setDummyBehavior('stand');const a=__harness.krybotTest.raw(),b=__harness.krybotTest.raw('p2');
  a.x=1300;b.x=a.x+gap;a.facing=1;b.facing=-1;for(const f of [a,b]){f.energy=100;f.comboCounter=0;f.comboTimer=0;f.vx=0;f.vy=0;f.invulnTimer=0;f._forceGuard=false;f.hitstop=0;f.isBlocking=false}},gap)
 await step(1)
}
async function waitFor(pred,max=100) {for(let i=0;i<max;i++){const s=await st();if(pred(s))return s;await step(1)}return st()}
async function contact(max=100){return waitFor(s=>s.a.attack?.krybot?.clean,max)}
async function recovery(){return waitFor(s=>s.a.cancel.open,80)}
const report={routes:[],advantages:[],specials:[]}
try {
 await page.goto(server.base+'/index.html?harness=1&p1=krybot&p2=krybot&seed=777',{waitUntil:'load'})
 await page.waitForFunction(()=>window.__harness?.krybotTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle()});await step(5)
 await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
 let s=await st();check('both slots select Krybot with ordinary starting energy',s.a.key==='krybot'&&s.b.key==='krybot'&&s.a.health===HP&&s.a.energy<60)

 for(const [label,route] of [['J1 -> J2 -> J3',[['j'],['j'],['j']]],['J1 -> Heavy -> Arm Blaster',[['j'],['k'],['l']]],['Command -> kick -> knock-away',[['d','k'],['k'],['k']]]]) {
  await reset();const hits=[]
  for(let i=0;i<route.length;i++) {
   const before=(await st()).b.health;await tap(route[i]);
   s=await waitFor(z=>z.b.health<before,80);hits.push(before-s.b.health)
   if(i<route.length-1)await recovery()
  }
  s=await st();report.routes.push({label,hits,total:HP-s.b.health,energy:s.a.energy,spacing:s.b.x-s.a.x,combo:await page.evaluate(()=>__harness.krybotTest.raw().comboCounter)})
  check(label,hits.every(h=>h>0),JSON.stringify(report.routes.at(-1)))
 }
 await reset();await page.keyboard.down('j');await step(100);await page.keyboard.up('j');
 check('held Light produces exactly one jab',(await st()).b.health===HP-ap(KM.light.damage))

 await reset();await tap(['k']);await contact();s=await st();check('unblocked Heavy creates owner mark',s.a.s.mark?.left>0 && !s.b.s.mark)
 const markClock=s.a.s.clock
 await recovery();await tap(['a','l']);await waitFor(z=>z.a.s.helper,50)
 await page.screenshot({path:'docs/krybot/helper.png'})
 s=await waitFor(z=>z.b.health<HP-ap(KM.heavy.damage),90)
 check('cover consumes live mark for +2 pushback only',!s.a.s.mark&&s.a.s.clock-markClock<60&&s.b.vx===5,JSON.stringify({elapsed:s.a.s.clock-markClock,vx:s.b.vx,damage:HP-s.b.health}))
 await step(20);s=await st()
 report.routes.push({label:'Heavy mark -> Covering Unit (pressure)',total:HP-s.b.health,spacing:s.b.x-s.a.x,mark:s.a.s.mark,cooldown:s.a.s.cooldown})
 check('cover shot hits once; helper cooldown isolated',s.b.health<HP-ap(KM.heavy.damage) && s.a.s.cooldown>0 && s.b.s.cooldown===0,JSON.stringify(report.routes.at(-1)))

 await reset(700);await tap(['a','l']);await waitFor(z=>!!z.a.s.helper)
  await page.evaluate(async()=>{const {startMove}=await import('./combat.js');const a=__harness.krybotTest.raw(),b=__harness.krybotTest.raw('p2'),h=a._krybot.helper;b.x=h.x-90;b.y=h.feet-b.h;b.facing=1;b.onGround=true;startMove(b,'light',{damage:16,startup:0,active:6,recovery:5,frameExact:true,rangeX:80,rangeY:70})})
 await step(2);s=await st();check('valid melee destroys 1 HP helper before its shot',!s.a.s.helper && !s.a.shots.some(p=>p.kind==='cover'))

 await reset(300);await tap(['l']);await step(16);s=await st();check('Arm Blaster produces one finite shot',s.a.shots.length===1 && s.a.shots[0].damage===KM.kBlaster.damage && s.a.shots[0].lifetime<=52)
 await step(65);s=await st();check('Arm shot expires or hits',s.a.shots.length===0)
 await reset(700);await tap(['l']);await step(42);await tap(['l']);await step(2);s=await st();check('second Arm cast denied while first shot remains',s.a.shots.length===1&&!s.a.attack)
 await reset(700);await tap(['d','l']);const x0=(await st()).a.attack.krybot.originX;await step(50);s=await st();check('Breach Step bounded to 120px from committed origin',Math.abs(s.a.x-x0-120)<.01,`${s.a.x-x0}px`)
 await reset(700);await tap(['s','l']);await step(15);s=await st();check('Leap leaves ground, no armor/invulnerability',!s.a.onGround && s.a.s.leapUsed && await page.evaluate(()=>!__harness.krybotTest.raw().invulnTimer))
 await tap(['s','l']);s=await waitFor(z=>z.a.s.landing>0,100);check('Leap forces landing recovery',s.a.s.landing===18,JSON.stringify({landing:s.a.s.landing,x:s.a.x}))
 await step(30);check('Leap completes without hover',(await st()).a.onGround)
 await reset(700);await tap(['w']);await step(4);await tap(['s','l']);s=await st();check('air Down+Special is the existing aerial boot',s.a.attack?.name==='air'&&s.a.energy>99)

 for(const guard of ['whiff','block']) {
  await reset(guard==='whiff'?700:72);if(guard==='block'){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}
  await tap(['d','k']);await recovery();await tap(['k']);await step(1);s=await st()
  check(`command chain cannot retap after ${guard}`,s.a.attack?.name==='kAdvance')
 }
 await reset();await tap(['d','k']);await contact();await recovery();await tap(['k']);await contact();await recovery();await tap(['w','k']);s=await st();check('confirmed final Up+Heavy branches to launcher',s.a.attack?.name==='up')

 await reset(700);await tap(['a','l']);await waitFor(z=>!!z.a.s.helper)
 await page.evaluate(async()=>{const {spawnProjectile}=await import('./abilities.js');const h=__harness.krybotTest.raw()._krybot.helper;spawnProjectile(__harness.krybotTest.raw('p2'),'krybot_test_interrupt',{spawnX:h.x,spawnY:h.feet-60,vx:0,vy:0,radius:8,w:16,h:16,damage:1,lifetime:10})})
 await step(26);s=await st();check('valid projectile destroys helper and cancels unspawned shot',!s.a.s.helper&&!s.a.shots.some(p=>p.kind==='cover'))

 // Real manual pursuit jump; no automated launcher follow-up.
 await reset();await tap(['i']);await contact();await recovery();await tap(['w']);await step(3);await tap(['j']);s=await waitFor(z=>z.b.health<HP-ap(KM.up.damage),80)
 report.routes.push({label:'Launcher -> manual jump -> Air',total:HP-s.b.health,spacing:s.b.x-s.a.x})
 check('launcher manual jump -> aerial boot lands',s.b.health<HP-ap(KM.up.damage),JSON.stringify(report.routes.at(-1)))

 for(const guard of [false,true])for(const key of ['light','kJ2','kJ3','heavy','kLow','up','air','kAdvance','kChainKick','kAway','kBreach']) {
  await reset();if(guard){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}
  await page.evaluate(key=>__harness.krybotTest.move(key),key)
  s=await waitFor(z=>guard?z.block>0:z.a.attack?.krybot?.clean,80)
  const hit=guard?s.block>0:s.a.attack?.krybot?.clean
  if(hit){let ar=null,dr=null;for(let i=0;i<150;i++){s=await st();if(ar===null&&!s.a.attack)ar=i;if(dr===null&&(guard?s.block:s.stun)<=0)dr=i;if(ar!==null&&dr!==null)break;await step(1)}report.advantages.push({key,guard,attackerReady:ar,defenderReady:dr,advantage:dr-ar})}
  check(`${key} ${guard?'block':'hit'} timing measured`,!!hit)
  if(guard && key==='heavy')check('blocked Heavy never marks',!s.a.s.mark)
 }
 for(const gap of [90,700]) {
  await reset(gap);await tap(['u']);let hp=HP;const contacts=[]
  for(let i=0;i<140;i++){await step(1);s=await st();if(s.b.health<hp){contacts.push({frame:i+1,damage:hp-s.b.health});hp=s.b.health}}
  report.specials.push({label:'ultimate',gap,damage:HP-s.b.health,contacts,super:s.a.s.super,shots:s.a.shots})
  check(`ultimate ${gap===90?'hit confirm damages':'whiff does no damage'}`,gap===90?s.b.health<HP-ap(KM.ultimate.damage):s.b.health===HP,JSON.stringify(report.specials.at(-1)))
  if(gap===90)check('confirmed ultimate delivers exactly four damage contacts',contacts.length===4,JSON.stringify(contacts))
  check('ultimate clears scripted participants and shots',!s.a.s.super && s.a.shots.length===0)
 }
 await reset(90);await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10);await tap(['u']);await step(120);s=await st();check('blocked opening never confirms sequence or deals damage',!s.a.s.super && s.b.health===HP,`${HP-s.b.health} damage`)
 await reset();await tap(['k']);await contact();await recovery();await tap(['u']);await step(140);s=await st();report.routes.push({label:'Heavy -> ultimate confirm',total:HP-s.b.health});check('Heavy recovery permits verified ultimate confirm',s.b.health<HP-ap(KM.heavy.damage)-ap(KM.ultimate.damage),JSON.stringify(report.routes.at(-1)))
 await reset(90);await tap(['u']);await waitFor(z=>!!z.a.s.super,80)
 await page.evaluate(async()=>{const {startMove}=await import('./combat.js');const a=__harness.krybotTest.raw(),b=__harness.krybotTest.raw('p2');b.hitstun=0;b.hitstop=0;b.attackCooldown=0;b.x=a.x+80;b.y=a.y;b.facing=-1;b.attacking=false;b.currentAttack=null;startMove(b,'light',{damage:16,startup:0,active:3,recovery:10,frameExact:true,rangeX:120,rangeY:70})})
 await step(3);s=await st();check('shared hit interrupts confirmed ultimate and cleans its participants/shots',s.a.health<HP&&!s.a.s.super&&!s.a.shots.some(p=>['opening','cross','finish'].includes(p.kind)))

 // Simultaneous mirrors: each slot owns its own shot, cooldown and helper.
 await page.evaluate(async()=>{const {inputSettings}=await import('./input.js');inputSettings.p1Type='controller';inputSettings.p2Type='controller';
  window.__kryPads=[0,1].map(index=>({index,connected:true,mapping:'standard',id:'Krybot test pad '+index,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));navigator.getGamepads=()=>__kryPads;
  __harness.start({mode:'pvp'});__harness.skipToBattle()});await step(5)
 await reset(600);await padTap([[5],[5]]);await step(16);s=await st();check('controller mirrors each own one Arm shot',s.a.shots.length===1&&s.b.shots.length===1,JSON.stringify([s.a.shots,s.b.shots]))
 await reset(600);await padTap([[14,5],[15,5]]);await step(26);s=await st();check('controller mirrors own separate helpers/cooldowns',!!s.a.s.helper&&!!s.b.s.helper&&s.a.s.cooldown===s.b.s.cooldown,JSON.stringify([s.a.s.cooldown,s.b.s.cooldown,s.a.s.helper,s.b.s.helper]))
 await page.evaluate(()=>{__harness.krybotTest.raw().rosterKey='goku'});await step(1);s=await st();check('identity invalidation clears only old owner',!s.a.s && !!s.b.s.helper)
 await page.evaluate(()=>{__harness.krybotTest.raw().rosterKey='krybot';__harness.krybotTest.reset()});await step(1);s=await st();check('training reset removes all helpers, marks, shots and cooldowns',!s.a.s.helper&&!s.b.s.helper&&!s.a.s.mark&&s.a.shots.length===0&&s.a.s.cooldown===0)
 check('no browser runtime errors',errors.length===0,JSON.stringify(errors))
 fs.writeFileSync('docs/krybot/mechanics_results.json',JSON.stringify({passes,failures,...report},null,2)+'\n')
 console.log(`${passes} passed / ${failures} failed`)
 if(failures)process.exitCode=1
}finally{await browser.close();server.close()}
