// harness/spd_green_determinism.mjs — S.P.D. Green: replay frame-identity, LAN slot-2 input, render-batching
// independence, no Math.random, lifecycle cleanup (training reset / KO / next round / mirrored marks).
// Writes docs/spd_green/determinism_results.json.     node harness/spd_green_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],out={};let pass=0
const ok=(n,c,d='')=>{assert(c,n+' '+d);pass++;console.log('PASS',n,d)}
async function open(){const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;const old=Math.random;window.__grRandom=[];Math.random=function(){const st=new Error().stack;if(/\/spdGreen\w*\.js/.test(st)&&!/\/sound\.js/.test(st)&&__grRandom.length<5)__grRandom.push(st);return old()}})
 await page.goto(server.base+'/index.html?harness=1&p1=spd_green&p2=spd_green&seed=55123',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.spdGreenTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(1)})
 await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready&&__harness.luffyTest.state('p2')?.ready);return page}
// One scripted 640-frame scenario exercising every SPD Green system (scan → mark → acrobat → follow-up, shot,
// teleport, retreat, rise, heel). Inputs change only on multiples of 4 frames (so batched stepping can replay it).
// Input-only (no state injection) so a recorded replay reproduces it from the battle start. Adaptive: reads state to
// decide the next press (the decisions become recorded inputs). Phases advance in order; each press lasts 1 frame.
const SCRIPT=`(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),idle=!a.attacking&&!a._groundTeleport?.action&&!(a._spdGreen?.landing>0)&&a.onGround,fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right';t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>230)r[fw]=true;else next();break
  case 1: if(t>6&&idle){r.charge=true;next()}break                       // Aura Read
  case 2: r.charge=t>2&&t<6?false:true;if(a.energy>=99||t>400)next();break // re-press after scan = hold to recharge
  case 3: if(t===2)r[fw]=true;if(t===6)r[fw]=true;if(t>8&&a._groundTeleport?.count)next();if(t>30)next();break   // phase step
  case 4: if(gap>70&&t<60)r[fw]=true;else if(idle&&t>4){r[fw]=true;r.special=true;next()}break                    // Acrobat Step
  case 5: if(a.currentAttack?.name==='gAcro2'&&a.currentAttack.total-a.currentAttack.timer>a.currentAttack.activeEnd&&!a.hitstop){r.heavy=true;next()}if(t>90)next();break   // marked follow-up
  case 6: if(t>50&&idle){r.special=true;next()}break                        // Deltamax Check
  case 7: if(t>50&&idle){r[bk]=true;r.special=true;next()}break             // Read and Retreat
  case 8: if(t>50&&idle){r.down=true;r.special=true;next()}break            // Rising Arc
  case 9: if(t>60&&idle){r.up=r.jump=true;next()}break                             // jump
  case 10: if(t<5)r.up=r.jump=true;else if(!a.onGround&&t>9){r.down=true;r.special=true;next()}else if(t>40)next();break   // Heel Return (airborne)
  case 11: if(t>60&&idle){r.light=true;next()}break
  case 12: if(t===8){r.light=true;next()}break
  case 13: if(t===10){r.heavy=true;next()}break
 }return r}})()`
try{
 // ── A. replay frame identity
 let page=await open()
 const rec=await page.evaluate(async src=>{const {writeRawControls}=await import('./input.js');const S=eval(src),H=__harness.spdGreenTest,a=H.raw(),b=H.raw('p2')
  const dig=()=>JSON.stringify(['p1','p2'].map(w=>{const f=H.raw(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._spdGreen,f._groundTeleport,f.currentAttack]}))
  const traces=[],seen=new Set();for(let i=0;i<1100;i++){writeRawControls(a,S(i,a,b));__harness.luffyTest.step(1);const s=a._spdGreen;if(s?.mark)seen.add('mark');if(s?.follows)seen.add('follow');if(a._groundTeleport?.count)seen.add('teleport');if(H.state().shots.length)seen.add('shot');if(a.currentAttack)seen.add(a.currentAttack.name);traces.push(dig())}
  return {traces,seen:[...seen],rep:__harness.replay.stopAndGet()}},SCRIPT)
 ok('recorded scenario exercises scan/mark/teleport/shot/specials',['mark','follow','teleport','gShot','gScan','gAcro','gFollow','gRetreat','gRise','gHeel'].every(k=>rec.seen.includes(k)),JSON.stringify(rec.seen))
 const v=await page.evaluate(rep=>__harness.replay.play(rep),rec.rep);ok('replay validates',v.ok,JSON.stringify(v))
 await page.evaluate(()=>{__harness.skipToBattle();__harness.luffyTest.step(1)});await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready&&__harness.luffyTest.state('p2')?.ready)
 const pb=await page.evaluate(n=>{const H=__harness.spdGreenTest,t=[];for(let i=0;i<n;i++){__harness.luffyTest.step(1);t.push(JSON.stringify(['p1','p2'].map(w=>{const f=H.raw(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._spdGreen,f._groundTeleport,f.currentAttack]})))}return {t,st:__harness.replay.playbackState()}},rec.traces.length)
 const first=rec.traces.findIndex((s,i)=>s!==pb.t[i]);ok('replay matches every authoritative frame (1100)',first===-1,first===-1?'':`frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`);ok('no replay checkpoint desync',!pb.st.desync,JSON.stringify(pb.st))
 out.replay={frames:1100,identical:true,exercised:rec.seen}
 // ── B. render batching: same inputs, step(1)+render each frame vs 4-frame batches with one render
 const r1=await page.evaluate(async src=>{const {writeRawControls}=await import('./input.js');const H=__harness.spdGreenTest,run=(stepper)=>{H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1560;a.facing=1;b.facing=-1
   for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.hitstun=0;f.hitstop=0;f.comboCounter=0}const t=[]
   const SS=eval(src);for(let i=0;i<1100;i+=4){writeRawControls(a,SS(i,a,b));stepper();t.push(JSON.stringify([a.x,a.y,a.health,a.energy,b.x,b.health,a._spdGreen?.mark,a._spdGreen?.clock,a._groundTeleport?.count,a.currentAttack?.name]))}return t}
  const perFrame=run(()=>{for(let k=0;k<4;k++)__harness.luffyTest.step(1)})   // render after every sim frame
  const batched=run(()=>__harness.luffyTest.step(4))                          // 4 sim frames, one render
  const noRender=run(()=>{for(let k=0;k<4;k++)__harness.luffyTest.step(1)})
  return {perFrame,batched,noRender}},SCRIPT)
 const d1=r1.perFrame.findIndex((s,i)=>s!==r1.batched[i]);ok('render batching (1 render/frame vs 1 render/4 frames) gives identical sim',d1===-1,d1===-1?'':`${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
 ok('second identical run reproduces exactly',JSON.stringify(r1.perFrame)===JSON.stringify(r1.noRender))
 out.renderBatching={samples:r1.perFrame.length,identical:true}
 // ── C. lifecycle
 const L=await page.evaluate(()=>{const H=__harness.spdGreenTest,a=()=>H.raw(),b=()=>H.raw('p2'),step=n=>__harness.luffyTest.step(n)
  const reset=(gap=260)=>{H.reset();a().x=1300;b().x=1300+gap;a().facing=1;b().facing=-1;for(const f of[a(),b()]){f.energy=100;f.health=f.maxHealth;f.hitstop=0;f.hitstun=0;f.vx=f.vy=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0}step(1)}
  reset();H.move('gScan');step(50);const marked=!!a()._spdGreen?.mark;a().x=1300;b().x=1700;H.move('gShot');step(18);const shot=H.state().shots.length===1
  H.reset();step(1);const trainingClears=!a()._spdGreen?.mark&&!H.state().shots.length&&!(a()._spdGreen?.scanCooldown>0)&&!a()._groundTeleport?.cooldown
  // mirrored: both scan each other → two independent marks, each owner sees only its own
  reset();H.move('gScan');H.move('gScan','p2');step(40);const ma=a()._spdGreen?.mark,mb=b()._spdGreen?.mark
  const mirrors=ma?.target===2&&mb?.target===1&&H.state().marked&&H.state('p2').marked
  return {marked,shot,trainingClears,mirrors}})
 for(const [k,c] of Object.entries(L))ok('lifecycle: '+k,c,JSON.stringify(L))
 out.lifecycle=L
 // KO → round end clears state; next round starts fresh (live loop, dummy CPU)
 await page.close();page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`${server.base}/index.html?harness=1&session=1&p1=spd_green&p2=spd_green`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.__harness?.spdGreenTest)
 await page.mouse.click(640,360);await page.evaluate(()=>{__harness.start({mode:'vs',difficulty:'dummy'});__harness.skipToBattle()})
 await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000})
 await page.evaluate(()=>{const H=__harness.spdGreenTest,A=H.raw(),B=H.raw('p2');A.energy=100;A._spdGreen=null;B.x=A.x+300;B.vx=0})
 await page.keyboard.press('p');await page.waitForTimeout(1200);const pre=await page.evaluate(()=>({mark:!!__harness.spdGreenTest.raw()._spdGreen?.mark}))
 await page.evaluate(()=>{const H=__harness.spdGreenTest,A=H.raw(),B=H.raw('p2');A.hitstun=0;A.attackCooldown=0;A.attacking=false;A.currentAttack=null;B.health=1;B.x=A.x+78;B.y=A.y;B.vx=0;B.vy=0;B.onGround=true;B.invulnTimer=0;B.hitstun=120;B.isBlocking=false})
 await page.keyboard.down('j');await page.waitForTimeout(180);await page.keyboard.up('j');await page.waitForTimeout(300)
 const ko=await page.evaluate(()=>({p2hp:__harness.spdGreenTest.raw('p2').health,a:__harness.spdGreenTest.raw()._spdGreen||null,b:__harness.spdGreenTest.raw('p2')._spdGreen||null}))
 ok('live scan marks in a real match',pre.mark);ok('KO clears both fighters\' SPD Green state',ko.p2hp<=0&&!ko.a?.mark&&!ko.b?.mark,JSON.stringify({hp:ko.p2hp,a:!!ko.a,b:!!ko.b}))
 await page.waitForFunction(()=>(__harness.state().gameState==='battle'&&__harness.state().countdown<=0&&__harness.spdGreenTest.raw('p2').health>1)||__harness.state().gameState==='victory',null,{timeout:45000})
 const nr=await page.evaluate(()=>({gs:__harness.state().gameState,a:__harness.spdGreenTest.raw()._spdGreen?.mark||null,cd:__harness.spdGreenTest.raw()._spdGreen?.scanCooldown||0,tp:__harness.spdGreenTest.raw()._groundTeleport?.cooldown||0}))
 ok('next round starts with no mark / cooldowns',!nr.a&&nr.cd===0&&nr.tp===0,JSON.stringify(nr))
 // ── D. LAN: slot 2 is SPD Green driven by injected remote input (with a live neutral pad)
 await page.close();page=await open()
 const lan=await page.evaluate(async()=>{const {inputSettings}=await import('./input.js');__harness.replay.stopPlayback?.();inputSettings.p1Type='keyboard';inputSettings.p2Type='controller'
  window.__pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[__pad]
  __harness.start({mode:'pvp'});__harness.skipToBattle();const H=__harness.spdGreenTest
  __harness.net.beginMock({localSide:'p1',inputDelay:2,remoteScript:fr=>__harness.replay.encode(fr===8?{charge:true}:fr===80?{special:true}:fr===140||fr===144?{left:true}:{})})
  let scan=false,shot=false,tp=false;for(let i=0;i<200;i++){__harness.luffyTest.step(1);const s=H.state('p2');scan ||= s.attack?.name==='gScan';shot ||= s.shots.length>0;tp ||= !!s.teleport?.count}
  const fr=__harness.net.frame();__harness.net.end();return {scan,shot,tp,frame:fr,remote:!!H.raw('p2')._spdGreenRemoteInput}})
 ok('LAN-injected slot-2 SPD Green: scan + shot + teleport',lan.scan&&lan.shot&&lan.tp&&lan.frame>=200,JSON.stringify(lan))
 out.lan=lan
 // ── E. local gamepad drives SPD Green through readRawControls' pad branch (R1 = Special, L2 = Charge)
 await page.close();page=await open()
 const pad=await page.evaluate(async()=>{const {inputSettings}=await import('./input.js');inputSettings.p1Type='controller'
  const btn=()=>Array.from({length:17},()=>({pressed:false,value:0}));window.__gp={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:btn()};navigator.getGamepads=()=>[__gp]
  const H=__harness.spdGreenTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1560;a.energy=100;__harness.luffyTest.step(2)
  __gp.buttons[6]={pressed:true,value:1};__harness.luffyTest.step(1);__gp.buttons[6]={pressed:false,value:0};const scan=a.currentAttack?.name==='gScan';__harness.luffyTest.step(60)
  b.x=1900;__gp.buttons[5]={pressed:true,value:1};__harness.luffyTest.step(1);__gp.buttons[5]={pressed:false,value:0};__harness.luffyTest.step(16)
  const r={scan,mark:!!a._spdGreen?.mark,shot:H.state().shots.length===1};inputSettings.p1Type='keyboard';return r})
 ok('local gamepad: L2 scans (marks), R1 fires the Deltamax shot',pad.scan&&pad.mark&&pad.shot,JSON.stringify(pad));out.gamepad=pad
 const rnd=await page.evaluate(()=>__grRandom);ok('no Math.random in spdGreen*.js',rnd.length===0,JSON.stringify(rnd))
 ok('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{out.passes=pass;out.errors=errors;fs.writeFileSync('docs/spd_green/determinism_results.json',JSON.stringify(out,null,2)+'\n');console.log(pass,'passed');await browser.close();server.close()}
