// harness/spd_green.test.mjs — S.P.D. Green Ranger (Bridge Carson) mechanics + MEASURED routes.
// Real keyboard input through the actual movement/command parsers (no startup-skipping for routes).
// Writes docs/spd_green/mechanics_results.json.   node harness/spd_green.test.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],report={routes:[],advantages:[],moves:{}};let pass=0,fail=0
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
const ck=(n,ok,d='')=>{ok?pass++:fail++;console.log(ok?'PASS':'FAIL',n,d)}
// Roster-parity pass (2026-11-13): HP HP→1120 and every authored damage value ×1.7 (SPD_GREEN_DAMAGE_SCALE).
const HP=1120,SC=1.7,sc=v=>Math.round(v*SC)
const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
const G='spdGreenTest'
const state=()=>page.evaluate(()=>{const H=__harness.spdGreenTest,b=H.raw('p2');return{a:H.state(),b:H.state('p2'),stun:b.hitstun,block:b.blockstun,combo:H.raw().comboCounter,bAtk:b.attacking}})
async function tap(ks,n=1){for(const k of ks)await page.keyboard.down(k);await step(n);for(const k of ks)await page.keyboard.up(k)}
async function reset(gap=72,flip=false){await page.evaluate(([gap,flip])=>{const H=__harness.spdGreenTest;H.reset();__harness.setDummyBehavior('stand');const a=H.raw(),b=H.raw('p2');a.x=flip?1300+gap:1300;b.x=flip?1300:1300+gap;a.facing=flip?-1:1;b.facing=flip?1:-1
 for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.comboCounter=0;f.comboTimer=0;f.vx=f.vy=0;f.invulnTimer=0;f.hitstop=0;f._forceGuard=false;f.isBlocking=false;f.dashTimer=0;f.dashCooldown=0;f.leftTapTime=f.rightTapTime=0;f.hitstun=0;f.blockstun=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0}
 for(let i=__harness.projectiles?.().length||0;i>0;i--);},[gap,flip]);await step(1)}
async function wait(pred,max=100){for(let i=0;i<max;i++){const s=await state();if(pred(s))return s;await step(1)}return state()}
const clean=()=>wait(s=>s.a.attack?.green?.clean),rec=()=>wait(s=>s.a.cancel.open)
const FWD=flip=>flip?'a':'d',BACK=flip=>flip?'d':'a'
// Run a route: each step = keys; waits for a damage increase; records whether the defender was still in hitstun
// when the next press happened (true combo) — `gaps` = defender hitstun remaining at each retap (>0 = combo).
async function route(label,steps,{gap=72,flip=false,between=rec}={}){
 await reset(gap,flip);const hits=[],stunAtRetap=[];let s
 for(let i=0;i<steps.length;i++){const hp=(await state()).b.hp;if(typeof steps[i]==='function')await steps[i]();else await tap(steps[i]);s=await wait(s=>s.b.hp<hp,90);hits.push(hp-s.b.hp)
  if(i<steps.length-1){await between(i);stunAtRetap.push((await state()).stun)}}
 s=await state();const r={label,hits,damage:HP-s.b.hp,energySpent:100-s.a.energy,trueCombo:stunAtRetap.every(x=>x>0),stunAtRetap,comboCounter:s.combo,flip};report.routes.push(r);return r}
try{
 await page.goto(server.base+'/index.html?harness=1&p1=spd_green&p2=spd_green&seed=883344');await page.waitForFunction(()=>window.__harness?.spdGreenTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone());await step(3);await page.waitForFunction(()=>__harness.spriteReady().ready)
 let s=await state();ck('both slots spd_green, HP'+HP+', normal starting energy',s.a.key==='spd_green'&&s.a.hp===HP&&s.b.hp===HP&&s.a.energy<60,JSON.stringify({e:s.a.energy}))
 // ── Normals: raw values via real keys
 for(const flip of [false,true]){
  let r=await route('J1 -> J2 -> J3'+(flip?' (mirrored)':''),[['j'],['j'],['j']],{flip});ck(r.label+' hits & true combo',r.hits.length===3&&r.hits.every(x=>x>0)&&r.trueCombo,JSON.stringify(r))
 }
 let r=await route('J1 -> Heavy -> Deltamax Check',[['j'],['k'],['l']]);ck(r.label,r.hits.every(x=>x>0),JSON.stringify(r))
 r=await route('Forward+Heavy -> Heavy -> Heavy',[['d','k'],['k'],['k']]);ck(r.label,r.hits.every(x=>x>0)&&r.trueCombo,JSON.stringify(r))
 await reset();await tap(['d','k']);await clean();await rec();await tap(['k']);await clean();await rec();await tap(['w','k']);ck('confirmed command Up+Heavy branches to launcher',(await state()).a.attack?.name==='up')
 for(const g of ['whiff','block']){await reset(g==='whiff'?700:72);if(g==='block'){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}await tap(['d','k']);await rec();await tap(['k']);ck('command retap rejected on '+g,(await state()).a.attack?.name==='gAdvance')}
 const J1=report.routes[0].hits[0];report.engineDamageScale=+(J1/sc(17)).toFixed(3)
 await reset();await page.keyboard.down('j');await step(100);await page.keyboard.up('j');s=await state();ck('held Light never auto-chains (one hit only)',s.b.hp===HP-J1,String(s.b.hp))
 // Launcher -> manual jump -> air (no automatic attacker lift)
 await reset();await tap(['i']);await clean();s=await state();const liftY=s.a.y;ck('launcher does not lift the attacker',s.a.grounded,JSON.stringify({vy:s.a.vy}))
 await rec();await tap(['w']);await step(3);await tap(['j']);s=await wait(s=>s.a.attack?.name==='air'&&s.a.attack.green.clean,60);await step(20);s=await state()
 r={label:'Launcher -> manual Jump -> Air',damage:HP-s.b.hp,hits:null,trueCombo:!!s.a.attack||s.combo>=2,comboCounter:s.combo};report.routes.push(r);ck(r.label+' connects (launcher + air, combo 2)',s.combo>=2&&HP-s.b.hp>report.routes[0].hits[0]*2,JSON.stringify(r))
 // ── Deltamax Check
 await reset(700);let e0=(await state()).a.energy;await tap(['l']);let e1=(await state()).a.energy;await step(16);s=await state();ck('one finite Deltamax projectile, raw 36, cost 12',s.a.shots.length===1&&s.a.shots[0].damage===sc(36)&&Math.abs(e0-e1-12)<0.5,JSON.stringify({shots:s.a.shots,spent:e0-e1}))
 await step(26);await tap(['l']);s=await state();ck('second shot rejected while first remains',s.a.shots.length===1&&!s.a.attack)
 await step(60);s=await state();ck('shot has a finite lifetime',s.a.shots.length===0)
 // ── AURA READ
 await reset(300);await tap(['p']);s=await state();ck('Charge press starts the scan (grounded neutral)',s.a.attack?.name==='gScan'&&s.a.s.scanCooldown>0)
 const scanStart=await page.evaluate(()=>__harness.spdGreenTest.raw().currentAttack.total);ck('scan totals 12+24+12 = 48f',scanStart===48,String(scanStart))
 s=await wait(s=>s.a.s.mark,60);ck('completed scan within 350px marks the opponent for 180f',!!s.a.s.mark&&s.a.marked&&s.a.s.mark.timer>=178,JSON.stringify(s.a.s.mark))
 ck('mark does no damage / debuff',s.b.hp===HP&&s.stun===0)
 const markedAt=await page.evaluate(()=>__harness.spdGreenTest.raw()._spdGreen.clock);await wait(s=>!s.a.s.mark,200);s=await state();ck('mark expires after 180f',!s.a.s.mark&&s.a.s.clock-markedAt>=179&&s.a.s.clock-markedAt<=181,String(s.a.s.clock-markedAt))
 await reset(300);await tap(['p']);await step(60);await tap(['p']);s=await state();ck('cooldown 240f: second scan rejected',!s.a.attack&&s.a.s.scans===1)
 await reset(420);await tap(['p']);await step(60);s=await state();ck('out of range (>350px) completes without a mark',!s.a.s.mark&&s.a.s.scans===1)
 await reset(300);await page.keyboard.down('p');await step(300);await page.keyboard.up('p');s=await state();ck('held Charge never repeats the scan',s.a.s.scans===1)
 await reset(72);await tap(['p']);await step(14);await page.evaluate(async()=>{const {startMove}=await import('./combat.js');const z=__harness.spdGreenTest.raw('p2');startMove(z,'heavy',z.basic_attacks.heavy)});s=await wait(s=>s.a.hp<HP,40);await step(40);s=await state()
 ck('interrupted scan gives no reward',s.a.hp<HP&&!s.a.s.mark&&s.a.s.marks===0,JSON.stringify({hp:s.a.hp,marks:s.a.s.marks}))
 await reset(300);await tap(['s','p']);s=await state();ck('crouching Charge does not scan',!s.a.attack)
 // One mark per owner + ownership: P2's own state never carries P1's mark
 await reset(300);await tap(['p']);s=await wait(s=>s.a.s.mark,60);ck('mark is owned by P1 only (P2 state unmarked)',s.a.marked&&!s.b.marked&&!s.b.s?.mark)
 // ── ACROBAT STEP
 await reset();e0=(await state()).a.energy;await tap(['d','l']);e1=(await state()).a.energy;const seen=[];for(let i=0;i<45;i++){s=await state();const at=s.a.attack;if(at&&at.green?.clean&&!seen.some(x=>x.startsWith(at.name+':')))seen.push(at.name+':'+at.damage);await step(1)}s=await state()
 report.moves.acroUnmarked={contacts:seen,applied:HP-s.b.hp,cost:+(e0-e1).toFixed(2)};ck('Acrobat Step: two clean contacts raw 20 + 28, cost 18',seen.join()===`gAcro:${sc(20)},gAcro2:${sc(28)}`&&Math.abs(e0-e1-18)<0.5,JSON.stringify(report.moves.acroUnmarked))
 await reset();await tap(['d','l']);await wait(s=>s.a.attack?.name==='gAcro2',60);await wait(s=>s.a.cancel?.phase==='recovery',60);await tap(['k']);await step(30);s=await state();ck('unmarked: no follow-up',s.a.s.follows===0)
 const ax=(await state()).a.x;await reset(72);await tap(['d','l']);await step(40);s=await state();ck('advance is bounded and never crosses the opponent',s.a.x+s.a.w<=s.b.x+1,JSON.stringify({ax:s.a.x,bx:s.b.x}))
 await reset(700);await tap(['d','l']);await step(45);s=await state();ck('advance capped ~100px',s.a.x-1300<=102&&s.a.x-1300>=60,String(s.a.x-1300))
 // Marked follow-up route: scan at range, close in, Acrobat Step, fresh Heavy in window
 async function markedAcro(gap,guard=false,late=false){await reset(260);await tap(['p']);await wait(s=>s.a.s.mark,60);await step(14)
  await page.evaluate(gap=>{const H=__harness.spdGreenTest,a=H.raw(),b=H.raw('p2');b.x=a.x+gap;a.energy=100},gap);if(guard){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(4)}
  const hp0=(await state()).b.hp;await tap(['d','l']);await wait(s=>s.a.attack?.name==='gAcro2',60);s=await wait(s=>s.a.cancel?.phase==='recovery',60);const stunAtRecovery=s.stun
  if(late)await step(11);const ek=(await state()).a.energy;await tap(['k']);const after=await state();const followCost=+(ek-after.a.energy).toFixed(2);const hp1=after.b.hp;const stunAtFollowStart=after.stun;s=await wait(s=>s.b.hp<hp1,30);const fol=s.a.s.follows;const followHit=hp1-s.b.hp;await step(30);s=await state()
  return {hp0,stunAtRecovery,stunAtFollowStart,follows:fol,followHit,followCost,damage:hp0-s.b.hp,mark:!!s.a.s.mark,combo:s.combo}}
 let m=await markedAcro(72);report.routes.push({label:'Aura Read -> Acrobat Step -> marked Heavy follow-up',...m,trueCombo:m.stunAtRecovery>0&&m.follows===1})
 ck('marked clean Acrobat Step allows ONE fresh-Heavy follow-up (+5, mark consumed)',m.follows===1&&Math.abs(m.followCost-5)<0.5&&!m.mark&&m.followHit>0,JSON.stringify(m))
 ck('marked follow-up is a true combo (defender in hitstun from step to follow-up hit)',m.stunAtFollowStart>0&&m.combo>=3,JSON.stringify(m))
 m=await markedAcro(72,true);ck('blocked Acrobat Step: no follow-up, mark kept',m.follows===0&&m.mark,JSON.stringify(m))
 m=await markedAcro(600);ck('whiffed Acrobat Step: no follow-up',m.follows===0&&m.mark,JSON.stringify(m))
 m=await markedAcro(72,false,true);ck('late (>10f) Heavy: no follow-up',m.follows===0,JSON.stringify(m))
 // ── RISING ARC
 await reset(700);e0=(await state()).a.energy;await tap(['s','l']);e1=(await state()).a.energy;await step(12);s=await state();ck('Rising Arc leaves ground, cost 18, no invulnerability',!s.a.grounded&&s.a.s.riseUsed&&Math.abs(e0-e1-18)<0.5&&!s.a.invuln,JSON.stringify({g:s.a.grounded,spent:e0-e1}))
 s=await wait(s=>s.a.s.landing>0,90);ck('explicit landing recovery (16f)',s.a.s.landing>=14&&s.a.s.landing<=16,String(s.a.s.landing))
 await reset(72);await tap(['s','l']);s=await wait(s=>s.b.hp<HP,40);ck('Rising Arc raw 40 hits',s.a.attack?.damage===sc(40)&&s.b.hp<HP,String(HP-s.b.hp))
 // ── READ AND RETREAT
 for(const flip of [false,true]){await reset(300,flip);e0=(await state()).a.energy;await tap([BACK(flip),'l']);s=await state();const x0=s.a.attack?.green?.origin;e1=s.a.energy;await step(40);s=await state();const moved=(s.a.x-x0)*(flip?1:-1)
  ck('Read and Retreat moves back <=90px, cost 12, faces foe'+(flip?' (mirrored)':''),moved>85&&moved<=90.01&&Math.abs(e0-e1-12)<0.5&&s.a.facing===(flip?-1:1),JSON.stringify({moved,spent:e0-e1}))}
 await reset(300);await page.keyboard.down('a');await step(240);await page.keyboard.up('a');await step(30);const wallX=(await state()).a.x;await page.evaluate(()=>{const H=__harness.spdGreenTest,a=H.raw(),b=H.raw('p2');b.x=a.x+300;a.energy=100;a.facing=1});await step(2);await tap(['a','l']);s=await state();const rs=s.a.attack?.name;await step(40);s=await state();ck('Retreat bounded by the stage edge (no push past the wall)',rs==='gRetreat'&&s.a.x>=wallX-0.01&&s.a.x<=wallX+6,JSON.stringify({rs,wallX,x:s.a.x}))
 await reset(72);await tap(['j']);await step(3);await tap(['a','l']);s=await state();ck('Retreat never cancels out of attacks',s.a.attack?.name!=='gRetreat')
 await reset(72);await page.evaluate(()=>{__harness.spdGreenTest.raw().hitstun=30});await tap(['a','l']);s=await state();ck('Retreat never starts in hitstun',s.a.attack?.name!=='gRetreat')
 await reset(72);await tap(['a','l']);await step(20);s=await state();ck('Retreat has no damaging body collision',s.b.hp===HP)
 // ── HEEL RETURN
 await reset(700);await tap(['w']);await step(6);e0=(await state()).a.energy;await tap(['s','l']);s=await state();ck('Heel Return in the air, raw 44, cost 15',s.a.attack?.name==='gHeel'&&s.a.attack.damage===sc(44)&&Math.abs(e0-s.a.energy-15)<0.5)
 s=await wait(s=>s.a.grounded,90);await step(1);s=await state();ck('Heel landing recovery 24f',s.a.s.landing>=22&&s.a.s.landing<=24,String(s.a.s.landing))
 await reset(700);await tap(['w']);await step(4);await tap(['s','l']);await step(14);e0=(await state()).a.energy;await page.evaluate(()=>{const a=__harness.spdGreenTest.raw();a.attacking=false;a.currentAttack=null;a.attackCooldown=0});await tap(['s','l']);s=await state();ck('Heel Return once per airtime (even if the first ended)',s.a.attack?.name!=='gHeel'&&e0-s.a.energy<1,JSON.stringify({n:s.a.attack?.name}))
 await reset(64);await tap(['w']);await step(5);await tap(['s','l']);s=await wait(s=>s.b.hp<HP,60);const vyAtHit=s.a.vy;await step(2);s=await state();ck('Heel Return connects, no pogo bounce (keeps descending)',HP-s.b.hp>0&&s.a.vy>=0&&vyAtHit>=0,JSON.stringify({applied:HP-s.b.hp,vy:s.a.vy,vyAtHit}))
 // ── DOUBLE-TAP TELEPORT (shared groundTeleport.js contract)
 for(const flip of [false,true]){await reset(700,flip);await tap([FWD(flip)]);await step(2);e0=(await state()).a.energy;await tap([FWD(flip)]);s=await state();const x0=s.a.teleport.action?.x0;e1=s.a.energy
  ck('fresh double tap -> phase step (no dash)'+(flip?' (mirrored)':''),s.a.teleport.count===1&&!!s.a.teleport.action&&s.a.dash===0)
  await step(14);s=await state();ck('phase step: 120px, cost 8, no invulnerability'+(flip?' (mirrored)':''),Math.abs(s.a.x-x0)===120&&Math.abs(e0-e1-8)<0.5&&!s.a.invuln,JSON.stringify({d:s.a.x-x0,spent:e0-e1}))}
 await reset(700);await page.keyboard.down('d');await step(60);await page.keyboard.up('d');ck('holding a direction never teleports',((await state()).a.teleport?.count||0)===0)
 await reset(700);await page.evaluate(()=>{__harness.spdGreenTest.raw().energy=0});await tap(['d']);await step(1);await tap(['d']);s=await state();ck('low Energy -> legal dash fallback, never both',!s.a.teleport?.count&&s.a.dash>0)
 await reset(140);await tap(['d']);await step(2);await tap(['d']);await step(16);s=await state();ck('teleport stops at the opponent body (no behind placement)',s.a.x+s.a.w<=s.b.x+1&&s.a.facing===1,JSON.stringify({a:s.a.x,b:s.b.x}))
 await reset(700);await tap(['d']);await step(2);await tap(['d']);await step(16);await tap(['d']);await step(2);await tap(['d']);s=await state();ck('36f cooldown blocks an immediate second step',s.a.teleport.count===1)
 await reset(72);await page.evaluate(()=>{__harness.spdGreenTest.raw().hitstun=20});await tap(['d']);await step(1);await tap(['d']);s=await state();ck('no teleport while stunned',!s.a.teleport?.count)
 // Teleport reposition -> punish: step in from 190px, then Heavy
 await reset(190);await tap(['d']);await step(2);await tap(['d']);await step(13);await tap(['k']);s=await wait(s=>s.b.hp<HP,40)
 r={label:'Phase step (120px) -> Heavy punish',damage:HP-s.b.hp,energySpent:100-s.a.energy};report.routes.push(r);ck(r.label,r.damage>0&&r.damage===report.advantages.length*0+r.damage,JSON.stringify(r))
 // ── ULTIMATE (shared Zord not present)
 await reset();await page.evaluate(()=>{__harness.spdGreenTest.raw().energy=100});await tap(['u']);await step(50);s=await state();ck('ultimate unavailable: spends nothing, no fallback',s.b.hp===HP&&s.a.energy>=100&&!s.a.attack)
 // ── Per-move measured frame advantage (hit + block)
 for(const guard of [false,true])for(const key of ['light','gJ2','gJ3','heavy','gLow','up','gAdvance','gChain','gAway','gFollow','gRise']){
  await reset();if(guard){await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(10)}
  const t0=await page.evaluate(k=>{__harness.spdGreenTest.move(k);return __harness.spdGreenTest.raw().currentAttack?.total},key);let first=null
  for(let i=0;i<60;i++){s=await state();if(guard?s.block>0:s.a.attack?.green?.clean){first=i;break}await step(1)}
  let ar=null,dr=null;if(first!==null)for(let i=0;i<150;i++){s=await state();if(ar===null&&!s.a.attack&&!(s.a.s?.landing>0))ar=i;if(dr===null&&(guard?s.block:s.stun)<=0)dr=i;if(ar!==null&&dr!==null)break;await step(1)}
  report.advantages.push({key,guard,total:t0,contactFrame:first,attackerReadyAfter:ar,defenderFreeAfter:dr,advantage:ar===null||dr===null?null:dr-ar})
 }
 ck('every grounded normal/command connects (hit + block)',report.advantages.every(a=>a.contactFrame!==null),JSON.stringify(report.advantages.filter(a=>a.contactFrame===null)))
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{report.passes=pass;report.failures=fail;report.errors=errors;fs.writeFileSync('docs/spd_green/mechanics_results.json',JSON.stringify(report,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
