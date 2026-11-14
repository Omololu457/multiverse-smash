import fs from 'node:fs'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
import {characters} from '../characters.js'
import {SPD_BLUE_MOVES,spd_blue} from '../spdBlueData.js'
import {ROSTER_DAMAGE_BOOST} from '../rosterParity.js'
// Roster-parity pass (2026-11-13, owner request): HP and damage are derived, not literal. Applied hit i of a combo =
// floor(floor(floor(raw*0.6)*0.85^i)*boost) - matches the engine's per-stage flooring exactly.
const HP=spd_blue.stats.maxHealth,BOOST=ROSTER_DAMAGE_BOOST.spd_blue||1,M=SPD_BLUE_MOVES,ap=(r,i=0)=>Math.floor(Math.floor(Math.floor(r*0.6)*0.85**i)*BOOST)
const base=JSON.parse(fs.readFileSync('docs/spd_blue/roster_baseline.json'));for(const[k,v]of Object.entries(base))for(const[p,x]of Object.entries(v))assert.deepEqual(characters[k][p],x,k+'.'+p)
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],report={routes:[],advantages:[]};let pass=0,fail=0
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
const ck=(n,ok,d='')=>{ok?pass++:fail++;console.log(ok?'PASS':'FAIL',n,d)}
const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
const state=()=>page.evaluate(()=>({a:__harness.spdBlueTest.state(),b:__harness.spdBlueTest.state('p2'),stun:__harness.spdBlueTest.raw('p2').hitstun,block:__harness.spdBlueTest.raw('p2').blockstun}))
async function tap(ks,n=1){for(const k of ks)await page.keyboard.down(k);await step(n);for(const k of ks)await page.keyboard.up(k)}
async function reset(gap=72){await page.evaluate(gap=>{__harness.spdBlueTest.reset();__harness.setDummyBehavior('stand');const a=__harness.spdBlueTest.raw(),b=__harness.spdBlueTest.raw('p2');a.x=1300;b.x=1300+gap;a.facing=1;b.facing=-1;for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.comboCounter=0;f.comboTimer=0;f.vx=f.vy=0;f.invulnTimer=0;f.hitstop=0;f._forceGuard=false;f.isBlocking=false;f.dashTimer=0;f.dashCooldown=0;f.leftTapTime=f.rightTapTime=0}},gap);await step(1)}
async function wait(pred,max=100){for(let i=0;i<max;i++){const s=await state();if(pred(s))return s;await step(1)}return state()}
const clean=()=>wait(s=>s.a.attack?.blue?.clean),rec=()=>wait(s=>s.a.cancel.open)
try{
 await page.goto(server.base+'/index.html?harness=1&p1=spd_blue&p2=spd_blue&seed=883344');await page.waitForFunction(()=>window.__harness?.spdBlueTest);await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone());await step(3);await page.waitForFunction(()=>__harness.spriteReady().ready)
 let s=await state();ck(`both slots HP${HP}, normal starting energy`,s.a.hp===HP&&s.b.hp===HP&&s.a.energy<60)
 ck('all earlier roster authored data unchanged',true)
 for(const[label,route]of [['J1 -> J2 -> J3',[['j'],['j'],['j']]],['J1 -> Heavy -> Deltamax Shot',[['j'],['k'],['l']]],['Command -> baton -> knock-away',[['d','k'],['k'],['k']]]]){
  await reset();const hits=[],escapes=[];for(let i=0;i<route.length;i++){const hp=(await state()).b.hp;await tap(route[i]);s=await wait(s=>s.b.hp<hp,90);hits.push(hp-s.b.hp);if(i<route.length-1){await rec();escapes.push((await state()).stun)}}
  s=await state();const r={label,hits,damage:HP-s.b.hp,cost:100-s.a.energy,spacing:s.b.x-s.a.x,remainingStunAtRetaps:escapes};report.routes.push(r);ck(label,hits.every(x=>x>0),JSON.stringify(r))
 }
 await reset();await page.keyboard.down('j');await step(100);await page.keyboard.up('j');ck('held Light never auto-chains',(await state()).b.hp===HP-ap(M.light.damage))
 await reset(700);await tap(['l']);await step(16);s=await state();ck('one finite Deltamax projectile',s.a.shots.length===1&&s.a.shots[0].damage===M.bShot.damage);await step(26);await tap(['l']);s=await state();ck('second shot rejected while first remains',s.a.shots.length===1&&!s.a.attack);await step(60);ck('projectile expires',(await state()).a.shots.length===0)
 for(const guard of [false,true]){await reset(guard?72:700);if(guard){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}await tap(['d','l']);const pursuitOrigin=(await state()).a.attack.blue.origin;await step(70);s=await state();ck('Pursuit has no follow-up on '+(guard?'block':'whiff'),!s.a.attack&&!s.a.s.lastPursuitConfirmed);ck('Pursuit capped 110px',Math.abs(s.a.x-pursuitOrigin)<=110.001)}
 await reset();await tap(['d','l']);let names=new Set();for(let i=0;i<100;i++){s=await state();if(s.a.attack)names.add(s.a.attack.name);await step(1)}s=await state();ck('clean Pursuit triggers exactly two contacts',names.has('bPursuitFinish')&&s.b.hp<HP-ap(M.bPursuit.damage),JSON.stringify({damage:HP-s.b.hp,names:[...names]}))
 await reset(700);await tap(['s','l']);await step(15);s=await state();ck('Rising Intercept leaves ground, no invulnerability',!s.a.grounded&&s.a.s.riseUsed&&await page.evaluate(()=>!__harness.spdBlueTest.raw().invulnTimer));await tap(['s','l']);s=await wait(s=>s.a.s.landing>0);ck('explicit 18f landing recovery',s.a.s.landing===18);await step(30);ck('rise returns to ground',(await state()).a.grounded)
 await reset(700);await tap(['w']);await step(3);await tap(['s','l']);await step(13);s=await state();ck('Air Down Special is recoil shot, paid15',s.a.s.airShotUsed&&s.a.shots.length===1&&s.a.energy<86);await step(25);await tap(['s','l']);ck('air shot cannot repeat same airtime',(await state()).a.s.serial===1)
 for(const guard of ['whiff','block']){await reset(guard==='whiff'?700:72);if(guard==='block'){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}await tap(['d','k']);await rec();await tap(['k']);ck('command retap rejected on '+guard,(await state()).a.attack?.name==='bAdvance')}
 await reset();await tap(['d','k']);await clean();await rec();await tap(['k']);await clean();await rec();await tap(['w','k']);ck('confirmed command Up+Heavy branches to launcher',(await state()).a.attack?.name==='up')
 // Real manual jump follow-up; Up-Attack has its own configured binding I.
 await reset();await tap(['i']);await clean();await rec();await tap(['w']);await step(3);await tap(['j']);await clean();await rec();await tap(['s','l']);await step(30);s=await state();report.routes.push({label:'Launcher -> manual Jump -> Air -> Air Recoil Shot',damage:HP-s.b.hp,energy:s.a.energy,spacing:s.b.x-s.a.x});ck('manual aerial conversion spawns paid recoil shot; follow-up is escapable',s.a.s.serial===1&&s.a.s.airShotUsed&&s.b.hp===HP-ap(M.up.damage)-ap(M.air.damage,1),JSON.stringify(report.routes.at(-1)))
 // Every ordinary authored melee: actual hit/block contact and measured readiness, not an asserted formula.
 for(const guard of [false,true])for(const key of ['light','bJ2','bJ3','heavy','bLow','up','air','bAdvance','bChain','bAway','bPursuitFinish']){
  await reset();if(guard){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}await page.evaluate(k=>__harness.spdBlueTest.move(k),key);s=await wait(s=>guard?s.block>0:s.a.attack?.blue?.clean)
  const ok=guard?s.block>0:s.a.attack?.blue?.clean;if(ok){let ar=null,dr=null;for(let i=0;i<150;i++){s=await state();if(ar===null&&!s.a.attack)ar=i;if(dr===null&&(guard?s.block:s.stun)<=0)dr=i;if(ar!==null&&dr!==null)break;await step(1)}report.advantages.push({key,guard,attackerReady:ar,defenderReady:dr,advantage:dr-ar})}ck(key+' '+(guard?'block':'hit')+' timing measured',!!ok)
 }
 // Keyboard direction edges through the actual movement parser, with no wall-clock delay.
 await reset(700);await tap(['d']);await step(2);await tap(['d']);s=await state();const x=s.a.x;ck('keyboard fresh double tap replaces dash',s.a.teleport.count===1&&s.a.teleport.action&&await page.evaluate(()=>__harness.spdBlueTest.raw().dashTimer===0));await step(12);s=await state();ck('teleport moves exactly120 and ends after13 ticks',Math.abs(s.a.x-x-120)<.01&&!s.a.teleport.action)
 await reset(700);await page.keyboard.down('d');await step(60);await page.keyboard.up('d');ck('keyboard hold never teleports',(await state()).a.teleport.count===0)
 await reset(700);await page.evaluate(()=>__harness.spdBlueTest.raw().energy=0);await tap(['d']);await step(1);await tap(['d']);s=await state();ck('resource failure uses legal dash fallback',!s.a.teleport.count&&await page.evaluate(()=>__harness.spdBlueTest.raw().dashTimer>0))
 // Intercept Step: genuine Heavy hit, designated late recovery, a fresh release-separated pair.
 await reset();await tap(['k']);await clean();await wait(s=>s.a.attack?.timer<=12&&s.a.cancel.open);await tap(['d']);await step(1);await tap(['d']);s=await state();ck('confirmed Heavy permits paid late Intercept Step',s.a.teleport.count===1&&s.a.s.comboStepUsed&&!s.a.attack,JSON.stringify(s.a.teleport));await step(13);await tap(['k']);await step(60);s=await state();report.routes.push({label:'Heavy -> paid Intercept Step -> Heavy pressure',damage:HP-s.b.hp,spacing:s.b.x-s.a.x,energy:s.a.energy})
 for(const guard of ['whiff','block']){await reset(guard==='whiff'?700:72);if(guard==='block'){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}await tap(['k']);await wait(s=>s.a.attack?.timer<=12&&s.a.cancel.open);await tap(['d']);await step(1);await tap(['d']);ck('Intercept Step denied on '+guard,(await state()).a.teleport.count===0)}
 await reset();await tap(['u']);await step(50);s=await state();ck('unavailable shared ultimate spends nothing and does not invoke fallback',s.b.hp===HP&&s.a.energy>=100&&!s.a.attack)
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors));report.passes=pass;report.failures=fail;report.errors=errors;fs.writeFileSync('docs/spd_blue/mechanics_results.json',JSON.stringify(report,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1
}finally{await browser.close();server.close()}
