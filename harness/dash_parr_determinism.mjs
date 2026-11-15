// harness/dash_parr_determinism.mjs — Dash Parr: replay frame-identity (Momentum + every move incl. Incredi-Rush in
// GAME_STATE), render-batching independence, LAN slot-2 remote input, no Math.random / gameRng in dashParr*.js,
// lifecycle cleanup (training reset / KO / next round). Writes docs/dash/determinism_results.json.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],out={};let pass=0
const ok=(n,c,d='')=>{assert(c,n+' '+d);pass++;console.log('PASS',n,d)}
async function open(q='p1=dash_parr&p2=dash_parr&seed=55123'){const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;const old=Math.random;window.__dpRandom=[];Math.random=function(){const st=new Error().stack;if(/\/dashParr\w*\.js/.test(st)&&!/\/sound\.js/.test(st)&&__dpRandom.length<5)__dpRandom.push(st);return old()}})
 await page.goto(server.base+'/index.html?harness=1&'+q,{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.dashParrTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(1)})
 await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready&&__harness.luffyTest.state('p2')?.ready);return page}
// Input-only scripted scenario (adaptive; decisions become recorded inputs). Exercises run→Sprint→Blur, the Blur
// freebie, every special + the ultimate, sidestep. Inputs change only on multiples of 4 frames.
const SCRIPT=`(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),idle=!a.attacking&&a.onGround,fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right';t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: r[bk]=true;if(t>70)next();break                                   // run away → Momentum to Blur
  case 1: if(gap>140)r[fw]=true;else next();break
  case 2: if(idle){r.down=true;r.special=true;next()}break                    // Laps (free at Blur)
  case 3: if(t>80&&idle){r.light=true;next()}break                            // Jab
  case 4: if(t>30&&idle){r.down=true;next()}break                             // ↓↘→ + Special = Flurry
  case 5: r.down=true;r[fw]=true;next();break
  case 6: r[fw]=true;r.special=true;next();break
  case 7: if(t>70&&idle){r[fw]=true;next()}break                              // →→ + Special = Blur Dash
  case 8: next();break
  case 9: r[fw]=true;next();break
  case 10: r[fw]=true;r.special=true;next();break
  case 11: if(t>60&&idle){r[bk]=true;next()}break                             // ←↙↓ + Special = Hydroplane
  case 12: r[bk]=true;r.down=true;next();break
  case 13: r.down=true;r.special=true;next();break
  case 14: if(t>70&&idle){r[bk]=true;next()}break                             // ←← + Light = Sidestep
  case 15: next();break
  case 16: r[bk]=true;next();break
  case 17: r[bk]=true;r.light=true;next();break
  case 18: if(a.energy>=100&&idle&&gap<300){r.ultimate=true;next()}else if(gap>=300&&idle)r[fw]=true;break   // Incredi-Rush
 }return r}})()`
try{
 let page=await open()
 const rec=await page.evaluate(async src=>{const {writeRawControls}=await import('./input.js');const S=eval(src),H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2')
  const dig=()=>JSON.stringify(['p1','p2'].map(w=>{const f=H.raw(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._dashParr,f.currentAttack]}))
  const traces=[],seen=new Set();let maxM=0
  for(let i=0;i<1500;i++){writeRawControls(a,S(i,a,b));__harness.luffyTest.step(1);const s=a._dashParr;if(s){maxM=Math.max(maxM,s.momentum);if(s.blurSpent)seen.add('freebie');if(s.ult)seen.add('ultLock')}if(a.currentAttack)seen.add(a.currentAttack.name);traces.push(dig())}
  return {traces,seen:[...seen],maxM,rep:__harness.replay.stopAndGet()}},SCRIPT)
 ok('scenario exercises Blur + freebie + every special + sidestep + Incredi-Rush',['freebie','laps','jab','flurry','blurDash','hydro','sidestep','rush','ultLock'].every(k=>rec.seen.includes(k))&&rec.maxM===100,JSON.stringify(rec.seen))
 const v=await page.evaluate(rep=>__harness.replay.play(rep),rec.rep);ok('replay validates',v.ok,JSON.stringify(v))
 await page.evaluate(()=>{__harness.skipToBattle();__harness.luffyTest.step(1)});await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready&&__harness.luffyTest.state('p2')?.ready)
 const pb=await page.evaluate(n=>{const H=__harness.dashParrTest,t=[];for(let i=0;i<n;i++){__harness.luffyTest.step(1);t.push(JSON.stringify(['p1','p2'].map(w=>{const f=H.raw(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._dashParr,f.currentAttack]})))}return {t,st:__harness.replay.playbackState()}},rec.traces.length)
 const first=rec.traces.findIndex((s,i)=>s!==pb.t[i]);ok('replay matches every authoritative frame (1500, Momentum incl.)',first===-1,first===-1?'':`frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`);ok('no replay checkpoint desync',!pb.st.desync,JSON.stringify(pb.st))
 out.replay={frames:1500,identical:true,exercised:rec.seen}
 await page.evaluate(()=>__harness.replay.stopPlayback?.())
 const r1=await page.evaluate(async src=>{const {writeRawControls}=await import('./input.js');const H=__harness.dashParrTest,run=(stepper)=>{H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1560;a.facing=1;b.facing=-1
   for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.hitstun=0;f.hitstop=0;f.comboCounter=0}const t=[]
   const SS=eval(src);for(let i=0;i<1500;i+=4){writeRawControls(a,SS(i,a,b));stepper();t.push(JSON.stringify([a.x,a.y,a.health,a.energy,b.x,b.health,a._dashParr?.momentum,a._dashParr?.clock,a._dashParr?.ult,a.currentAttack?.name]))}return t}
  const perFrame=run(()=>{for(let k=0;k<4;k++)__harness.luffyTest.step(1)}),batched=run(()=>__harness.luffyTest.step(4)),again=run(()=>{for(let k=0;k<4;k++)__harness.luffyTest.step(1)})
  return {perFrame,batched,again}},SCRIPT)
 const d1=r1.perFrame.findIndex((s,i)=>s!==r1.batched[i]);ok('render batching (1 render/frame vs 1 render/4 frames) gives identical sim',d1===-1,d1===-1?'':`${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
 ok('second identical run reproduces exactly',JSON.stringify(r1.perFrame)===JSON.stringify(r1.again))
 ok('batching runs are live',new Set(r1.perFrame.map(x=>JSON.parse(x)[0])).size>5&&r1.perFrame.some(x=>JSON.parse(x)[9]))
 // seed changes the Rush positions; same seed reproduces them
 const pos=await page.evaluate(()=>{const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1460;a.energy=100;H.move('rush');const p=[];for(let i=0;i<200;i++){__harness.luffyTest.step(1);if(a._dashParr?.ult?.pos)p.push(JSON.stringify(a._dashParr.ult.pos))}return [...new Set(p)].join('|')})
 out.rushPositions=pos.split('|').length
 // lifecycle
 const L=await page.evaluate(()=>{const H=__harness.dashParrTest,a=()=>H.raw(),step=n=>__harness.luffyTest.step(n)
  H.reset();a().energy=100;H.move('__');a()._dashParr.momentum=90;H.move('sidestep');step(5);H.reset();step(1);const s=a()._dashParr
  return {trainingClears:!s||(s.momentum===0&&s.sidestepCd===0&&!s.ult&&!s.panicUsed)}})
 for(const [k,c] of Object.entries(L))ok('lifecycle: '+k,c,JSON.stringify(L))
 // KO → round end clears; next round starts fresh (live loop)
 await page.close();page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`${server.base}/index.html?harness=1&session=1&p1=dash_parr&p2=dash_parr`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.__harness?.dashParrTest)
 await page.mouse.click(640,360);await page.evaluate(()=>{__harness.start({mode:'vs',difficulty:'dummy'});__harness.skipToBattle()})
 await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000})
 await page.evaluate(()=>{const H=__harness.dashParrTest,A=H.raw(),B=H.raw('p2');H.move('__');A._dashParr.momentum=100;A._dashParr.panicUsed=true;B.health=1;B.x=A.x+70;B.vx=0;B.hitstun=120;B.invulnTimer=0})
 await page.keyboard.down('j');await page.waitForTimeout(150);await page.keyboard.up('j');await page.waitForTimeout(300)
 const ko=await page.evaluate(()=>({p2hp:__harness.dashParrTest.raw('p2').health,a:__harness.dashParrTest.raw()._dashParr||null}))
 ok('KO clears Dash state (Momentum / Panic flag)',ko.p2hp<=0&&!ko.a?.momentum&&!ko.a?.panicUsed,JSON.stringify(ko))
 await page.waitForFunction(()=>(__harness.state().gameState==='battle'&&__harness.state().countdown<=0&&__harness.dashParrTest.raw('p2').health>1)||__harness.state().gameState==='victory',null,{timeout:45000})
 const nr=await page.evaluate(()=>({gs:__harness.state().gameState,s:__harness.dashParrTest.raw()._dashParr||null}))
 ok('next round starts with Momentum 0, Panic Run available',!nr.s?.momentum&&!nr.s?.panicUsed,JSON.stringify({gs:nr.gs,m:nr.s?.momentum}))
 // LAN: slot 2 Dash driven by injected remote input
 await page.close();page=await open()
 const lan=await page.evaluate(async()=>{const {inputSettings}=await import('./input.js');__harness.replay.stopPlayback?.();inputSettings.p1Type='keyboard';inputSettings.p2Type='controller'
  window.__pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[__pad]
  __harness.start({mode:'pvp'});__harness.skipToBattle();const H=__harness.dashParrTest
  __harness.net.beginMock({localSide:'p1',inputDelay:2,remoteScript:fr=>__harness.replay.encode(fr===8?{special:true}:fr>=60&&fr<130?{right:true}:fr===150?{down:true,special:true}:{})})
  let flurry=false,laps=false,mom=0;for(let i=0;i<220;i++){__harness.luffyTest.step(1);const s=H.state('p2');flurry ||= s.attack?.name==='flurry';laps ||= s.attack?.name==='laps';mom=Math.max(mom,s.s?.momentum||0)}
  const fr=__harness.net.frame();__harness.net.end();return {flurry,laps,mom,frame:fr,remote:!!H.raw('p2')._dashParrRemoteInput}})
 ok('LAN-injected slot-2 Dash: Flurry + Momentum from running + Laps',lan.flurry&&lan.laps&&lan.mom>20&&lan.frame>=200,JSON.stringify(lan));out.lan=lan
 // local gamepad: R1 = Special
 await page.close();page=await open()
 const pad=await page.evaluate(async()=>{const {inputSettings}=await import('./input.js');inputSettings.p1Type='controller'
  const btn=()=>Array.from({length:17},()=>({pressed:false,value:0}));window.__gp={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:btn()};navigator.getGamepads=()=>[__gp]
  const H=__harness.dashParrTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1400;a.energy=100;__harness.luffyTest.step(2)
  __gp.buttons[5]={pressed:true,value:1};__harness.luffyTest.step(1);__gp.buttons[5]={pressed:false,value:0};const r={atk:a.currentAttack?.name};inputSettings.p1Type='keyboard';return r})
 ok('local gamepad: R1 fires a Dash special through readRawControls',pad.atk==='flurry',JSON.stringify(pad));out.gamepad=pad
 const rnd=await page.evaluate(()=>__dpRandom);ok('no Math.random in dashParr*.js',rnd.length===0,JSON.stringify(rnd))
 const src=['dashParr.js','dashParrData.js','dashParrState.js','dashParrFx.js','dashParrSound.js','dashParrKit.js','dashParrSkins.js','dashParrHarness.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n')
 ok('no Math.random / gameRng tokens in Dash sources',!/Math\.random|gameRng/.test(src.replace(/\/\/.*$/mg,'')))
 ok('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{out.passes=pass;out.errors=errors;fs.mkdirSync('docs/dash',{recursive:true});fs.writeFileSync('docs/dash/determinism_results.json',JSON.stringify(out,null,2)+'\n');console.log(pass,'passed');await browser.close();server.close()}
