// harness/dash_parr.test.mjs — Dash Parr mechanics, MEASURED frame data / damage / on-block, Momentum, specials,
// Incredi-Rush, defense, combos. Real keyboard input through the command parser for inputs + routes.
// Writes docs/dash/mechanics_results.json.     node harness/dash_parr.test.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
import {dash_parr as DASH_DEF,DASH_STATS,INCREDI_RUSH,RUSH_SCENE} from '../dashParrData.js'
import {ROSTER_DAMAGE_BOOST} from '../rosterParity.js'
const WALK_FEEL=+(fs.readFileSync(new URL('../physics.js',import.meta.url),'utf8').match(/export const WALK_FEEL = ([0-9.]+)/)||[0,1])[1]   // physics.js roster-wide walk multiplier
// ROSTER PARITY boost (rosterParity.js), applied at combat.applyScaledDamage on top of the floored per-hit damage:
// dealt = floor(brief hit × boost). Design-tolerance targets (±20 %) are scaled by the same boost.
const BOOST=ROSTER_DAMAGE_BOOST.dash_parr||1,mel=x=>Math.floor(x*BOOST)
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[]
const report={moves:{},routes:[],momentum:{},defense:{},ultimate:{}};let pass=0,fail=0
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
const ck=(n,ok,d='')=>{ok?pass++:fail++;console.log(ok?'PASS':'FAIL',n,d)}
const near=(a,b,t)=>Math.abs(a-b)<=t
const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
const ev=(fn,arg)=>page.evaluate(fn,arg)
const state=()=>ev(()=>{const H=__harness.dashParrTest,b=H.raw('p2');return{a:H.state(),b:H.state('p2'),stun:b.hitstun,block:b.blockstun,bAtk:b.attacking}})
async function tap(ks,n=1){for(const k of ks)await page.keyboard.down(k);await step(n);for(const k of ks)await page.keyboard.up(k)}
async function seq(list){for(const ks of list){await tap(ks,1)}}
async function reset(gap=70,{flip=false,energy=100,momentum=0,dummy='stand',bp='p2'}={}){await ev(([gap,flip,energy,momentum,dummy])=>{const H=__harness.dashParrTest;H.reset();__harness.setDummyBehavior(dummy);const a=H.raw(),b=H.raw('p2');a.x=flip?1300+gap:1300;b.x=flip?1300:1300+gap;a.facing=flip?-1:1;b.facing=flip?1:-1
 for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.comboCounter=0;f.comboTimer=0;f.vx=f.vy=0;f.invulnTimer=0;f.hitstop=0;f.isBlocking=false;f.dashTimer=0;f.dashCooldown=0;f.leftTapTime=f.rightTapTime=0;f.hitstun=0;f.blockstun=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0;f.knockdownState=false;f.y=f.groundY??f.y}
 a.energy=energy;const s=a._dashParr||(a._dashParr=null);H.move('__none__');},[gap,flip,energy,momentum,dummy]);await step(1)
 if(momentum)await ev(m=>{const H=__harness.dashParrTest,a=H.raw();a._dashParr=a._dashParr||{};a._dashParr.momentum=m;a._dashParr.blurReady=m>=100},momentum)}
async function wait(pred,max=120){for(let i=0;i<max;i++){const s=await state();if(pred(s))return s;await step(1)}return state()}
const HP2=()=>ev(()=>__harness.dashParrTest.raw('p2').maxHealth)

// Measure one move started directly (no input latency): startup = first frame the defender's HP drops (or blockstun
// appears), damage per hit, hit count, and frame advantage on block = defender-free frame − attacker-free frame.
async function measure(key,{gap=60,block=false,momentum=0,air=false,maxF=320}={}){
 await reset(gap,{dummy:block?'block':'stand',momentum});if(block)await step(20)
 await ev(([key,air])=>{const H=__harness.dashParrTest,a=H.raw();if(air){a.onGround=false;a.grounded=false;a.y-=140;a.vy=0;const b=H.raw('p2');b.onGround=false;b.grounded=false;b.y-=140;b.vy=0}},[key,air])
 const r=await ev(([key,block,maxF,air])=>{const H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2');if(block)b.isBlocking=true
  const hp0=b.health;const ok=H.move(key);if(!ok)return {ok:false};const hits=[];let first=-1,aFree=-1,bFree=-1,blocked=false,last=b.health,stunSeen=0
  for(let i=1;i<=maxF;i++){if(air){b.vy=0;b.onGround=false}
   if(block){b.isBlocking=true}__harness.luffyTest.step(1)
   if(b.health<last){hits.push(last-b.health);if(first<0)first=i;last=b.health}
   if(b.blockstun>0&&first<0){first=i;blocked=true}
   if(b.blockstun>0)blocked=true
   if(aFree<0&&!a.attacking&&i>2)aFree=i
   if(blocked&&bFree<0&&b.blockstun<=0&&i>first)bFree=i
   if(aFree>0&&(!block||bFree>0)&&i>first+2)break}
  return {ok:true,first,hits,total:hp0-b.health,aFree,bFree,adv:block?bFree-aFree:null,flawless:!!b._lastBlockFlawless,x:a.x,bx:b.x}},[key,block,maxF,air])
 return r}

try{
 await page.goto(server.base+'/index.html?harness=1&p1=dash_parr&p2=spd_green&seed=424242');await page.waitForFunction(()=>window.__harness?.dashParrTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone?.());await step(3)
 // ── PHASE 1/2: registration + stats
 let s=await state()
 const meta=await ev(async()=>{const {characters}=await import('./characters.js');const c=characters.dash_parr;return {name:c.name,displayName:c.displayName,universe:c.universe,diff:c.difficulty,arch:c.archetype,tag:c.tagline,hp:c.stats.maxHealth,w:c.stats.weight,e:c.stats.maxEnergy,st:c.stats,k:characters.killua.stats,en:c.traits.energyName,has:c.traits.hasEnergy,bio:c.bio}})
 ck('registered: name/displayName Dash, archetype, tagline, difficulty 4',meta.name==='Dash'&&meta.displayName==='Dash'&&meta.arch==='Speedster / Rushdown'&&meta.tag==='Ready, set, already gone.'&&meta.diff===4,JSON.stringify(meta))
 ck('bio is two sentences',meta.bio.split(/(?<=\.)\s/).length===2)
 // Stats: started as Killua Zoldyck's (owner request 2026-11-15), then the 2026-11-15 roster-parity balance pass gave Dash his
// own numbers (HP / speed / dashSpeed). Assert the live fighter matches dashParrData.js, not Killua.
 ck(`stats: dashParrData.js (HP ${DASH_DEF.stats.maxHealth}, energy 180 "Super Speed", speed ${DASH_STATS.speed}, jump 33, 2 jumps, dash ${DASH_STATS.dashSpeed})`,s.a.maxHp===DASH_DEF.stats.maxHealth&&meta.e===180&&meta.en==='Super Speed'&&meta.has&&Object.keys({...meta.st,...DASH_DEF.stats}).every(k=>meta.st[k]===DASH_DEF.stats[k])&&meta.st.speed===DASH_STATS.speed&&meta.st.dashSpeed===DASH_STATS.dashSpeed,JSON.stringify({st:meta.st,data:DASH_DEF.stats}))
 // walk / run speed
 await reset(600);await page.keyboard.down('d');await step(12);s=await state();await page.keyboard.up('d');const walk=Math.abs(s.a.vx)
 const WALK=Math.min(9.5,Math.max(4.5,4.5+(DASH_STATS.speed-78)/20*5))*WALK_FEEL   // physics.js walk map on Dash's speed stat × the roster-wide WALK_FEEL
 ck(`walk speed ${WALK} px/f at Jog (speed ${DASH_STATS.speed})`,near(walk,WALK,0.05),String(walk))
 await reset(900);await tap(['d']);await step(2);await tap(['d']);await step(3);s=await state();const run=Math.abs(s.a.vx)
 ck(`run (double-tap dash) speed ${DASH_STATS.dashSpeed*0.55} px/f (dash ${DASH_STATS.dashSpeed} × 0.55)`,near(run,DASH_STATS.dashSpeed*0.55,0.05),String(run));report.stats={walk,run}
 // energy: regen 4/s, +4 landed, +3 taken
 await reset(600,{energy:10});await step(60);s=await state();ck('Super Speed recharges 4/s',near(s.a.energy-10,4,0.15),String(s.a.energy-10))
 // ── PHASE 3: MOMENTUM
 await reset(1200);s=await state();ck('Momentum starts at 0 (Jog)',(s.a.s?.momentum||0)===0&&s.a.tier==='jog')
 await page.keyboard.down('a');await step(20);s=await state();ck('running fills 1.5/frame',near(s.a.s.momentum,1.5*20,3),String(s.a.s.momentum));await step(20);s=await state()
 ck('50+ → Sprint tier',s.a.tier==='sprint',String(s.a.s.momentum))
 const sprintWalk=Math.abs(s.a.vx);ck('Sprint: +10% move speed',near(sprintWalk,WALK*1.1,0.06),String(sprintWalk))
 await step(30);s=await state();ck('100 → Blur tier (+ blurReady)',s.a.tier==='blur'&&s.a.s.blurReady,String(s.a.s.momentum));const blurWalk=Math.abs(s.a.vx)
 ck('Blur: +20% move speed',near(blurWalk,WALK*1.2,0.06),String(blurWalk));await page.keyboard.up('a')
 await wait(s=>Math.abs(s.a.vx)<0.5,30);await step(28);s=await state();ck('standing still 29f keeps Momentum',s.a.s.momentum===100,String(s.a.s.momentum));await step(4);s=await state();ck('standing still 30f drains Momentum to 0',s.a.s.momentum===0,String(s.a.s.momentum))
 report.momentum={walk,sprintWalk,blurWalk}
 // hit landed +6
 await reset(60);await tap(['j']);s=await wait(s=>s.b.hp<s.b.maxHp,20);await step(1);s=await state();ck('damaging hit landed: Momentum +6, energy +4',s.a.s.momentum===6&&near(s.a.energy,100,0.5)||s.a.s.momentum===6,JSON.stringify({m:s.a.s.momentum,e:s.a.energy}))
 await reset(60,{energy:50});await tap(['j']);await wait(s=>s.b.hp<s.b.maxHp,20);s=await state();ck('energy +4 on hit landed',near(s.a.energy-50,4,0.4),String(s.a.energy-50))
 // taken / blocked drain
 for(const how of ['hit','block']){await reset(60,{momentum:80});await ev(async how=>{const {startMove}=await import('./combat.js');const H=__harness.dashParrTest,z=H.raw('p2'),a=H.raw();a.energy=50;if(how==='block'){a.isBlocking=true;a._blockHeld=60}startMove(z,'light',z.basic_attacks.light)},how)
  for(let i=0;i<25;i++){if(how==='block')await ev(()=>{__harness.dashParrTest.raw().isBlocking=true});await step(1)}s=await state()
  ck(`${how === 'hit' ? 'taking a hit' : 'blocking'} drains Momentum to 0`,(s.a.s?.momentum||0)===0,JSON.stringify({m:s.a.s?.momentum,hp:s.a.hp,bs:s.a.blockstun}))
  if(how==='hit')ck('energy +3 on hit taken',near(s.a.energy-50,3+25*4/60,0.4),String(s.a.energy-50))}
 // ── PHASE 4: MOVESET (measured)
 const BRIEF={jab:[4,14,1],heavy:[10,40,-4],low:[6,20,-3],launcher:[10,38,-8],air:[6,24,2]}
 for(const [k,[st,dm,ob]] of Object.entries(BRIEF)){
  const h=await measure(k,{air:k==='air'}),b=await measure(k,{block:true,air:k==='air'})
  report.moves[k]={startup:h.first,damage:h.total,onBlock:b.adv,brief:{startup:st,damage:dm,onBlock:ob}}
  ck(`${k}: ${st}f startup, ${dm} dmg`,h.first===st+1-1||h.first===st,JSON.stringify({first:h.first,total:h.total}));ck(`${k}: damage ${dm} ×${BOOST} = ${mel(dm)}`,h.total===mel(dm),String(h.total))
  ck(`${k}: ${ob>0?'+':''}${ob} on block`,b.adv===ob,JSON.stringify({adv:b.adv,aFree:b.aFree,bFree:b.bFree,flawless:b.flawless}))
 }
 // Sprint −1f startup on Jab / Heavy
 for(const k of ['jab','heavy']){const h=await measure(k,{momentum:60});ck(`Sprint: ${k} startup −1f`,h.first===report.moves[k].startup-1,String(h.first))}
 // Specials
 let f=await measure('flurry');report.moves.flurry={startup:f.first,hits:f.hits.length,damage:f.total}
 ck(`Flurry: 8 hits = ${8*mel(7)} (unscaled sum of 7s ×${BOOST}; engine 85%/step keeps one step)`,f.hits.length===8&&near(f.total,8*mel(7),2),JSON.stringify(f.hits))
 f=await measure('flurry',{block:true});report.moves.flurry.onBlock=f.adv;ck('Flurry −6 on block',f.adv===-6,String(f.adv))
 f=await measure('blurDash',{gap:120});report.moves.blurDash={damage:f.total,startup:f.first};ck(`Blur Dash: ${mel(44)} dmg (44 ×${BOOST})`,near(f.total,mel(44),1),String(f.total))
 ck('Blur Dash passes THROUGH the opponent (cross-up: ends on the far side)',f.x>f.bx,JSON.stringify({x:f.x,bx:f.bx}))
 const bdTravel=await ev(()=>{const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1000;b.x=1700;a.facing=1;b.facing=-1;a.energy=100;__harness.luffyTest.step(1);const x0=a.x;H.move('blurDash');for(let i=0;i<40;i++)__harness.luffyTest.step(1);return a.x-x0})
 ck('Blur Dash lunges 400px',near(bdTravel,400,2),String(bdTravel))
 f=await measure('blurDash',{block:true,gap:120});report.moves.blurDash.onBlock=f.adv;ck('Blur Dash −10 on block',f.adv===-10,String(f.adv))
 f=await measure('laps',{gap:150});report.moves.laps={hits:f.hits.length,damage:f.total};ck(`Laps: 4 hits = ${4*mel(16)} (4×16 ×${BOOST})`,f.hits.length===4&&near(f.total,4*mel(16),4),JSON.stringify(f.hits))
 ck('Laps ends BEHIND the opponent',f.x>f.bx,JSON.stringify({x:f.x,bx:f.bx}))
 s=await state();ck('Laps grants +20 Momentum (plus +6 per hit)',s.a.s.momentum>=20,String(s.a.s.momentum))
 f=await measure('hydro',{gap:200});report.moves.hydro={damage:f.total,startup:f.first};ck(`Hydroplane: ${mel(36)} dmg (36 ×${BOOST})`,near(f.total,mel(36),1),String(f.total))
 const lp=await ev(()=>{const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=600;b.x=1800;a.energy=100;H.move('hydro');const prof=[];for(let i=1;i<=40;i++){__harness.luffyTest.step(1);const s=H.state();prof.push(!!a._dashParr.lowProfile&&s.hurt.h<a.h*0.5)}return prof})
 const lpOn=lp.map((v,i)=>v?i+1:0).filter(Boolean);report.moves.hydro.lowProfile=[lpOn[0],lpOn[lpOn.length-1]]
 ck('Hydroplane low profile ≈ f10–30 (shrunken hurtbox)',lpOn[0]===10&&lpOn[lpOn.length-1]===30,JSON.stringify(report.moves.hydro.lowProfile))
 // projectile ducks under low profile
 const duck=await ev(async()=>{const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1700;a.facing=1;b.facing=-1;a.energy=100;b.energy=100;const hp0=a.health
  __harness.spdGreenTest.move('gShot','p2');for(let i=0;i<4;i++)__harness.luffyTest.step(1);H.move('hydro');for(let i=0;i<40;i++)__harness.luffyTest.step(1);return {hit:a.health<hp0}})
 ck('Hydroplane ducks a mid projectile',!duck.hit,JSON.stringify(duck))
 // ── PHASE 4: ULTIMATE
 const ult=await ev(()=>{const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1460;a.facing=1;a.energy=100;const hp0=b.health,mx=[]
  const ok=H.move('rush');let lockedAt=-1,freeAt=-1,lastHit=-1,hits=0,last=b.health,bx=b.x
  let lockAtFree=-1,kdAtFree=false
  for(let i=1;i<=360;i++){__harness.luffyTest.step(1);if(a._dashParr?.ult&&lockedAt<0)lockedAt=i;if(b.health<last){hits++;lastHit=i;last=b.health;mx.push(Math.round(b.x-bx))}if(freeAt<0&&!a.attacking&&i>5){freeAt=i;lockAtFree=a._dashParr?.lock??-1;kdAtFree=!!b.knockdownState}}
  return {ok,energy:a.energy,dmg:hp0-b.health,hits,lockedAt,lastHit,freeAt,lockAtFree,bMoved:mx,knockdown:kdAtFree}})
 report.ultimate=ult
 const RUSH_DMG=INCREDI_RUSH.damage.reduce((t,d)=>t+mel(d),0)
 ck(`INCREDI-RUSH: 12 hits = ${RUSH_DMG} (200 unscaled, each hit ×${BOOST})`,ult.hits===12&&ult.dmg===RUSH_DMG,JSON.stringify(ult))
 // 2026-11-23 cinematic rebuild: the scene runs frozen (dashParrRush.js); the finisher lands at RUSH_SCENE.impact + every hit-stop,
 // the scene ends RUSH_SCENE.end − impact (+ the impact's own hit-stop) later, then INCREDI_RUSH.recovery frames of lockout.
 const RS=RUSH_SCENE,fin=RS.impact+RS.stop.reduce((t,v)=>t+v,0)
 ck(`INCREDI-RUSH cinematic: finisher ≈ ${fin}f after the lock, scene ends ≈ ${RS.end-RS.impact+RS.impactStop}f later, then ${INCREDI_RUSH.recovery}f recovery lockout`,near(ult.lastHit-ult.lockedAt,fin,4)&&near(ult.freeAt-ult.lastHit,RS.end-RS.impact+RS.impactStop,4)&&near(ult.lockAtFree,INCREDI_RUSH.recovery,2),JSON.stringify(ult))
 ck('INCREDI-RUSH finisher knocks the foe down',ult.knockdown,JSON.stringify(ult))
 ck('opponent is held in place during the storm',ult.bMoved.slice(0,11).every(v=>v===0),JSON.stringify(ult.bMoved))
 const rushDet=await ev(()=>{const run=()=>{const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1460;a.energy=100;H.move('rush');const p=[];for(let i=0;i<320;i++){__harness.luffyTest.step(1);const u=a._dashParr?.ult;if(u?.pos)p.push(JSON.stringify(u.pos))}return [...new Set(p)]};return [run(),run()]})
 ck('Rush hit positions are hashed + reproducible',rushDet[0].length===12&&JSON.stringify(rushDet[0])===JSON.stringify(rushDet[1]),String(rushDet[0].length))
 await reset(160,{energy:99});await tap(['u']);s=await state();ck('Rush needs 100 energy',!s.a.attack)
 // ── input parser (real keys)
 const IN=[['flurry',[['s'],['s','d'],['d','l']]],['blurDash',[['d'],[],['d'],['d','l']]],['laps',[['s'],[],['s'],['s','l']]],['hydro',[['a'],['a','s'],['s','l']]],['rush',[['s'],['s','d'],['d'],['s'],['s','d'],['d','l']]],['sidestep',[['a'],[],['a'],['a','j']]]]
 for(const [k,keys] of IN){await reset(k==='blurDash'?300:150);await seq(keys);s=await state();ck(`input → ${k}`,s.a.attack?.name===k,String(s.a.attack?.name))}
 await reset(60);await tap(['s','j']);s=await state();ck('↓+Light → Low',s.a.attack?.name==='low');await reset(60);await tap(['w','k']);s=await state();ck('↑+Heavy → Launcher',s.a.attack?.name==='launcher')
 // ── FLASH TIME (← + Special toggle; owner request 2026-11-15)
 await reset(300,{energy:99});await tap(['a','l']);s=await state()
 ck('Flash Time: ← + Special turns it on (no attack starts)',!!s.a.s?.ft&&!s.a.attack,JSON.stringify({ft:s.a.s?.ft,atk:s.a.attack?.name}))
 {const ftm=await ev(()=>{const H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2');let skipped=0,blk=0;const e0=a.energy
   for(let i=0;i<60;i++){__harness.luffyTest.step(1);if(b._timeSlowFlag)skipped++;if(a.isBlocking)blk++}
   return {skipped,e0,e1:a.energy,blk}})
  ck('Flash Time: opponent runs at ~1/3 speed (≈40 of 60 frames skipped)',ftm.skipped>=37&&ftm.skipped<=42,JSON.stringify(ftm))
  ck('Flash Time: drains 0.22/frame with no passive regen',near(ftm.e0-ftm.e1,60*0.22,0.3),JSON.stringify(ftm))}
 await page.keyboard.down(';');await step(6);s=await state();await page.keyboard.up(';')
 ck('Flash Time: Dash cannot block while it is on',!(await ev(()=>__harness.dashParrTest.raw().isBlocking))&&!!s.a.s.ft)
 await step(4);await tap(['a','l']);await step(2);s=await state();const bFlag=await ev(()=>!!__harness.dashParrTest.raw('p2')._timeSlowFlag)
 ck('Flash Time: second ← + Special turns it off, opponent back to full speed',!s.a.s.ft&&!bFlag,JSON.stringify({ft:s.a.s.ft,bFlag}))
 await reset(300,{energy:89});await tap(['a','l']);s=await state();ck('Flash Time: needs 90 Super Speed',!s.a.s?.ft&&!s.a.attack)
 await reset(300,{energy:95});await tap(['a','l']);await ev(()=>{__harness.dashParrTest.raw().energy=0.3});await step(3);s=await state()
 ck('Flash Time: ends on its own when Super Speed runs dry',!s.a.s.ft&&s.a.energy<=0.3,JSON.stringify({ft:s.a.s.ft,e:s.a.energy}))
 await reset(150);await seq([['a'],['a','s'],['s','l']]);s=await state();ck('←↙↓ + Special is still Hydroplane',s.a.attack?.name==='hydro'&&!s.a.s.ft,String(s.a.attack?.name))
 // ── PHASE 3/5: Blur freebie
 await reset(150,{momentum:100,energy:30});await seq([['s'],['s','d'],['d','l']]);s=await state()
 ck('Blur tier: special costs 0 energy and Momentum resets to 0',s.a.attack?.name==='flurry'&&near(s.a.energy,30,0.4)&&s.a.s.momentum===0&&s.a.s.blurSpent===1,JSON.stringify({e:s.a.energy,m:s.a.s.momentum}))
 await reset(150,{momentum:0,energy:30});await tap(['s','l']);s=await state();ck('next special after the freebie costs energy again (Laps 20)',near(s.a.energy,10,0.2),String(s.a.energy))
 // ── PHASE 6: DEFENSE
 const ss=await ev(()=>{const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1400;a.facing=1;b.facing=-1;const ok=H.move('sidestep');const inv=[];for(let i=1;i<=14;i++){__harness.luffyTest.step(1);inv.push(a.invulnTimer>0)}const after=a.x>b.x;const ok2=H.move('sidestep');return {ok,inv,after,ok2,cd:a._dashParr.sidestepCd}})
 const invOn=ss.inv.map((v,i)=>v?i+1:0).filter(Boolean);report.defense.sidestep={iframes:[invOn[0],invOn[invOn.length-1]],cooldown:ss.cd}
 ck('Sidestep: blur behind a close foe',ss.ok&&ss.after,JSON.stringify(ss));ck('Sidestep i-frames 2–10',invOn[0]===2&&invOn[invOn.length-1]===10,JSON.stringify(invOn));ck('Sidestep 4 s cooldown',!ss.ok2&&ss.cd>200)
 const ccm=await ev(async()=>{const {startMove}=await import('./combat.js');const H=__harness.dashParrTest,out=[]
  for(const m of [0,60,60]){H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1360;a.facing=1;b.facing=-1;a._dashParr=null;H.move('__');if(m)a._dashParr={...(a._dashParr||{}),momentum:m};const hp=a.health;startMove(b,'light',b.basic_attacks.light);for(let i=0;i<30;i++)__harness.luffyTest.step(1);out.push(hp-a.health)}
  return out})
 ck("Can't Catch Me: first hit at Sprint+ deals −30%",near(ccm[1],ccm[0]*0.7,1.01),JSON.stringify(ccm));report.defense.cantCatchMe={jog:ccm[0],sprint:ccm[1]}
 // Panic Run: real input (block + heavy) after 3 hits taken
 const pr=await ev(async()=>{const {startMove}=await import('./combat.js');const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1360;a.facing=1;b.facing=-1;a.energy=100;b.comboCounter=3;a.hitstun=30;return true})
 await page.keyboard.down(';');await tap(['k']);await page.keyboard.up(';');s=await state();const pr1={atk:s.a.attack?.name,e:s.a.energy,stun:s.a.hitstun,inv:s.a.invuln,used:s.a.s.panicUsed}
 ck('Panic Run: Block+Heavy while comboed breaks out (40 energy, invulnerable)',pr1.atk==='panic'&&pr1.stun===0&&pr1.inv>0&&near(pr1.e,60,0.5),JSON.stringify(pr1))
 await step(40);await ev(()=>{const H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2');a.energy=100;b.comboCounter=4;a.hitstun=30});await page.keyboard.down(';');await tap(['k']);await page.keyboard.up(';');s=await state()
 ck('Panic Run is once per round',s.a.attack?.name!=='panic'&&s.a.hitstun>0);report.defense.panic=pr1
 await ev(()=>{const H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2');H.reset();a.energy=100;b.comboCounter=2;a.hitstun=30});await page.keyboard.down(';');await tap(['k']);await page.keyboard.up(';');s=await state()
 ck('Panic Run needs 3+ hits taken',s.a.attack?.name!=='panic')
 // ── PHASE 5: COMBOS (real input, cancels on contact)
 const HP=await HP2()
 async function route(label,target,fn,{gap=60}={}){await reset(gap,{energy:100});await fn();await step(60);s=await state();const hits=await ev(()=>__harness.dashParrTest.raw().comboCounter||0)
  // target is the pre-boost design number: scale it by the roster boost. The boost is applied (and floored) per hit at the
  // choke-point, so each landed hit can lose < 1 HP to flooring vs target×boost — the lower bound allows 1 HP per hit for that.
  const r={label,target,boosted:+(target*BOOST).toFixed(1),damage:HP-s.b.hp,hits,ratio:+((HP-s.b.hp)/(target*BOOST)).toFixed(3)};report.routes.push(r);ck(`${label} ≈ ${target}×${BOOST} (±20%, −1/hit floor) → ${r.damage}`,r.damage>=target*BOOST*0.8-hits&&r.ratio<=1.2,JSON.stringify(r));return r}
 const until=async(name,pred=s=>s.a.attack?.dp?.clean&&s.a.attack?.name===name&&s.a.attack.total-s.a.attack.timer>s.a.attack.activeEnd,max=80)=>wait(pred,max)
 await route('Jab, Jab, Heavy, Blur Dash',97,async()=>{await tap(['j']);await until('jab');await tap(['j']);await until('jab');await tap(['k']);await until('heavy');await tap(['d']);await tap([]);await tap(['d','l'])})
 await route('Low, Launcher, Air, Flurry',112,async()=>{await tap(['s','j']);await until('low');await tap(['w','k']);await until('launcher',s=>s.a.attack?.name==='launcher'&&s.a.attack.dp.clean);await step(2);await tap(['w']);await step(6);await tap(['j']);await until('air');await tap(['l'])})
 await route('Laps, Jab, Heavy, Flurry',147,async()=>{await tap(['s','l']);await until('laps');await tap(['j']);await until('jab');await tap(['k']);await until('heavy');await tap(['l'])},{gap:150})
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors.slice(0,5)))
}catch(e){fail++;console.log('FAIL exception',e.stack)}
finally{report.pass=pass;report.fail=fail;fs.mkdirSync('docs/dash',{recursive:true});fs.writeFileSync('docs/dash/mechanics_results.json',JSON.stringify(report,null,2)+'\n');console.log(pass,'passed',fail,'failed');await browser.close();server.close();process.exit(fail?1:0)}
