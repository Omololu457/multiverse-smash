// harness/spd_pink_determinism.mjs — S.P.D. Pink: replay frame-identity, LAN slot-2 input, render-batching
// independence, no Math.random, lifecycle cleanup (training reset / KO / next round / mirrored Iron Reserve), LAN slot 2, gamepad.
// Writes docs/spd_pink/determinism_results.json.     node harness/spd_pink_determinism.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],out={};let pass=0
const ok=(n,c,d='')=>{assert(c,n+' '+d);pass++;console.log('PASS',n,d)}
async function open(){const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;const old=Math.random;window.__pkRandom=[];Math.random=function(){const st=new Error().stack;if(/\/spdPink\w*\.js/.test(st)&&!/\/sound\.js/.test(st)&&__pkRandom.length<5)__pkRandom.push(st);return old()}})
 await page.goto(server.base+'/index.html?harness=1&p1=spd_pink&p2=spd_pink&seed=55123',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.spdPinkTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(1)})
 await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready&&__harness.luffyTest.state('p2')?.ready);return page}
// One scripted 640-frame scenario exercising every SPD Pink system (scan → mark → acrobat → follow-up, shot,
// teleport, retreat, rise, heel). Inputs change only on multiples of 4 frames (so batched stepping can replay it).
// Input-only (no state injection) so a recorded replay reproduces it from the battle start. Adaptive: reads state to
// decide the next press (the decisions become recorded inputs). Phases advance in order; each press lasts 1 frame.
const SCRIPT=`(()=>{let ph=0,t=0;return (i,a,b)=>{const r={},gap=Math.abs(b.x-a.x),idle=!a.attacking&&!a._groundTeleport?.action&&!(a._spdPink?.landing>0)&&a.onGround,fw=a.facing===1?'right':'left',bk=a.facing===1?'left':'right';t++
 const next=()=>{ph++;t=0}
 switch(ph){
  case 0: if(gap>230)r[fw]=true;else next();break
  case 1: if(t>6&&idle){r.charge=true;next()}break                       // Iron Reserve preparation
  case 2: r.charge=t>2&&t<6?false:true;if(a.energy>=99||t>400)next();break // re-press after prep = hold to recharge
  case 3: if(t===2)r[fw]=true;if(t===6)r[fw]=true;if(t>8&&a._groundTeleport?.count)next();if(t>30)next();break   // phase step
  case 4: if(gap>90&&t<60)r[fw]=true;else if(idle&&t>4){r[fw]=true;r.special=true;next()}break                    // (charged) Iron Breaker
  case 5: if(t>50&&idle){r.special=true;next()}break                        // Deltamax Shot
  case 6: if(t>50&&idle){r[bk]=true;r.special=true;next()}break             // Baton Reprisal stance
  case 7: if(t>50&&idle){r.down=true;r.special=true;next()}break            // Rising Check
  case 8: if(t>60&&idle){r.up=r.jump=true;next()}break                      // jump
  case 9: if(t<5)r.up=r.jump=true;else if(!a.onGround&&t>9){r.down=true;r.special=true;next()}else if(t>40)next();break   // Falling Rose
  case 10: if(t>60&&idle){r.light=true;next()}break
  case 11: if(t===8){r.light=true;next()}break
  case 12: if(t===10){r.heavy=true;next()}break
  case 13: if(t>40&&idle){r[fw]=true;r.heavy=true;next()}break              // F+H weapon check
 }return r}})()`
try{
 // ── A. replay frame identity
 let page=await open()
 const rec=await page.evaluate(async src=>{const {writeRawControls}=await import('./input.js');const S=eval(src),H=__harness.spdPinkTest,a=H.raw(),b=H.raw('p2')
  const dig=()=>JSON.stringify(['p1','p2'].map(w=>{const f=H.raw(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._spdPink,f._groundTeleport,f.currentAttack]}))
  const traces=[],seen=new Set();for(let i=0;i<1100;i++){writeRawControls(a,S(i,a,b));__harness.luffyTest.step(1);const s=a._spdPink;if(s?.reserve)seen.add('reserve');if(a._groundTeleport?.count)seen.add('teleport');if(H.state().shots.length||a._spdPink?.serial)seen.add('shot');if(a.currentAttack)seen.add(a.currentAttack.name);traces.push(dig())}
  return {traces,seen:[...seen],rep:__harness.replay.stopAndGet()}},SCRIPT)
 ok('recorded scenario exercises prep/reserve/teleport/shot/specials',['reserve','teleport','shot','pPrep','pShot','pBreakerIron','pStance','pRise','pRose','pCheck'].every(k=>rec.seen.includes(k)),JSON.stringify(rec.seen))
 const v=await page.evaluate(rep=>__harness.replay.play(rep),rec.rep);ok('replay validates',v.ok,JSON.stringify(v))
 await page.evaluate(()=>{__harness.skipToBattle();__harness.luffyTest.step(1)});await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready&&__harness.luffyTest.state('p2')?.ready)
 const pb=await page.evaluate(n=>{const H=__harness.spdPinkTest,t=[];for(let i=0;i<n;i++){__harness.luffyTest.step(1);t.push(JSON.stringify(['p1','p2'].map(w=>{const f=H.raw(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f._spdPink,f._groundTeleport,f.currentAttack]})))}return {t,st:__harness.replay.playbackState()}},rec.traces.length)
 const first=rec.traces.findIndex((s,i)=>s!==pb.t[i]);ok('replay matches every authoritative frame (1100)',first===-1,first===-1?'':`frame ${first}\n${rec.traces[first]}\n${pb.t[first]}`);ok('no replay checkpoint desync',!pb.st.desync,JSON.stringify(pb.st))
 out.replay={frames:1100,identical:true,exercised:rec.seen}
 // ── B. render batching: same inputs, step(1)+render each frame vs 4-frame batches with one render
 // Playback of section A must be stopped first, or the scripted inputs below are ignored (remote-input flag).
 await page.evaluate(()=>__harness.replay.stopPlayback?.())
 const r1=await page.evaluate(async src=>{const {writeRawControls}=await import('./input.js');const H=__harness.spdPinkTest,run=(stepper)=>{H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1560;a.facing=1;b.facing=-1
   for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.hitstun=0;f.hitstop=0;f.comboCounter=0}const t=[]
   const SS=eval(src);for(let i=0;i<1100;i+=4){writeRawControls(a,SS(i,a,b));stepper();t.push(JSON.stringify([a.x,a.y,a.health,a.energy,b.x,b.health,a._spdPink?.reserve?.timer,a._spdPink?.clock,a._groundTeleport?.count,a.currentAttack?.name]))}return t}
  const perFrame=run(()=>{for(let k=0;k<4;k++)__harness.luffyTest.step(1)})   // render after every sim frame
  const batched=run(()=>__harness.luffyTest.step(4))                          // 4 sim frames, one render
  const noRender=run(()=>{for(let k=0;k<4;k++)__harness.luffyTest.step(1)})
  return {perFrame,batched,noRender}},SCRIPT)
 const d1=r1.perFrame.findIndex((s,i)=>s!==r1.batched[i]);ok('render batching (1 render/frame vs 1 render/4 frames) gives identical sim',d1===-1,d1===-1?'':`${r1.perFrame[d1]} vs ${r1.batched[d1]}`)
 ok('second identical run reproduces exactly',JSON.stringify(r1.perFrame)===JSON.stringify(r1.noRender))
 ok('batching runs are live (inputs move the fighter and start moves)',new Set(r1.perFrame.map(x=>JSON.parse(x)[0])).size>5&&r1.perFrame.some(x=>JSON.parse(x)[9]),String(new Set(r1.perFrame.map(x=>JSON.parse(x)[0])).size))
 out.renderBatching={samples:r1.perFrame.length,identical:true}
 // ── C. lifecycle
 const L=await page.evaluate(()=>{const H=__harness.spdPinkTest,a=()=>H.raw(),b=()=>H.raw('p2'),step=n=>__harness.luffyTest.step(n)
  const reset=(gap=260)=>{H.reset();a().x=1300;b().x=1300+gap;a().facing=1;b().facing=-1;for(const f of[a(),b()]){f.energy=100;f.health=f.maxHealth;f.hitstop=0;f.hitstun=0;f.vx=f.vy=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0}step(1)}
  reset();H.move('pPrep');step(50);const charged=!!a()._spdPink?.reserve;a().x=1300;b().x=1700;H.move('pShot');step(18);const shot=H.state().shots.length===1
  H.reset();step(1);const trainingClears=!a()._spdPink?.reserve&&!H.state().shots.length&&!(a()._spdPink?.prepCooldown>0)&&!(a()._spdPink?.stanceCooldown>0)&&!a()._groundTeleport?.cooldown
  // mirrored: both prepare → two independent charges; spending P1's leaves P2's
  reset();H.move('pPrep');H.move('pPrep','p2');step(40);const both=!!a()._spdPink?.reserve&&!!b()._spdPink?.reserve
  a().attacking=false;a().currentAttack=null;a().attackCooldown=0;H.move('heavy');const mirrors=both&&a().currentAttack?.name==='heavyIron'&&!a()._spdPink.reserve&&!!b()._spdPink.reserve
  return {charged,shot,trainingClears,mirrors}})
 for(const [k,c] of Object.entries(L))ok('lifecycle: '+k,c,JSON.stringify(L))
 out.lifecycle=L
 // KO → round end clears state; next round starts fresh (live loop, dummy CPU)
 await page.close();page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`${server.base}/index.html?harness=1&session=1&p1=spd_pink&p2=spd_pink`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.__harness?.spdPinkTest)
 await page.mouse.click(640,360);await page.evaluate(()=>{__harness.start({mode:'vs',difficulty:'dummy'});__harness.skipToBattle()})
 await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000})
 await page.evaluate(()=>{const H=__harness.spdPinkTest,A=H.raw(),B=H.raw('p2');A.energy=100;A._spdPink=null;B.x=A.x+300;B.vx=0})
 await page.keyboard.press('p',{delay:80});await page.waitForFunction(()=>!!__harness.spdPinkTest.raw()._spdPink?.reserve,null,{timeout:4000}).catch(()=>{});   // wall-clock: the prep/scan ends ~1.1-1.3s in under headless load; wait for the state, not a fixed sleep
 const pre=await page.evaluate(()=>({mark:!!__harness.spdPinkTest.raw()._spdPink?.reserve}))
 await page.evaluate(()=>{const H=__harness.spdPinkTest,A=H.raw(),B=H.raw('p2');A.hitstun=0;A.attackCooldown=0;A.attacking=false;A.currentAttack=null;B.health=1;B.x=A.x+78;B.y=A.y;B.vx=0;B.vy=0;B.onGround=true;B.invulnTimer=0;B.hitstun=120;B.isBlocking=false})
 await page.keyboard.down('j');await page.waitForTimeout(180);await page.keyboard.up('j');await page.waitForTimeout(300)
 const ko=await page.evaluate(()=>({p2hp:__harness.spdPinkTest.raw('p2').health,a:__harness.spdPinkTest.raw()._spdPink||null,b:__harness.spdPinkTest.raw('p2')._spdPink||null}))
 ok('live Charge grants Iron Reserve in a real match',pre.mark);ok('KO clears both fighters\' SPD Pink state (reserve gone)',ko.p2hp<=0&&!ko.a?.reserve&&!ko.b?.reserve,JSON.stringify({hp:ko.p2hp,a:!!ko.a,b:!!ko.b}))
 await page.waitForFunction(()=>(__harness.state().gameState==='battle'&&__harness.state().countdown<=0&&__harness.spdPinkTest.raw('p2').health>1)||__harness.state().gameState==='victory',null,{timeout:45000})
 const nr=await page.evaluate(()=>({gs:__harness.state().gameState,a:__harness.spdPinkTest.raw()._spdPink?.reserve||null,cd:__harness.spdPinkTest.raw()._spdPink?.prepCooldown||0,tp:__harness.spdPinkTest.raw()._groundTeleport?.cooldown||0}))
 ok('next round starts with no Iron Reserve / cooldowns',!nr.a&&nr.cd===0&&nr.tp===0,JSON.stringify(nr))
 // ── D. LAN: slot 2 is SPD Pink driven by injected remote input (with a live neutral pad)
 await page.close();page=await open()
 const lan=await page.evaluate(async()=>{const {inputSettings}=await import('./input.js');__harness.replay.stopPlayback?.();inputSettings.p1Type='keyboard';inputSettings.p2Type='controller'
  window.__pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[__pad]
  __harness.start({mode:'pvp'});__harness.skipToBattle();const H=__harness.spdPinkTest
  __harness.net.beginMock({localSide:'p1',inputDelay:2,remoteScript:fr=>__harness.replay.encode(fr===8?{charge:true}:fr===80?{special:true}:fr===140||fr===144?{left:true}:{})})
  let scan=false,shot=false,tp=false;for(let i=0;i<200;i++){__harness.luffyTest.step(1);const s=H.state('p2');scan ||= s.attack?.name==='pPrep';shot ||= s.shots.length>0;tp ||= !!s.teleport?.count}
  const fr=__harness.net.frame();__harness.net.end();return {scan,shot,tp,frame:fr,remote:!!H.raw('p2')._spdPinkRemoteInput}})
 ok('LAN-injected slot-2 SPD Pink: Iron Reserve prep + shot + teleport',lan.scan&&lan.shot&&lan.tp&&lan.frame>=200,JSON.stringify(lan))
 out.lan=lan
 // ── E. local gamepad drives SPD Pink through readRawControls' pad branch (R1 = Special, L2 = Charge)
 await page.close();page=await open()
 const pad=await page.evaluate(async()=>{const {inputSettings}=await import('./input.js');inputSettings.p1Type='controller'
  const btn=()=>Array.from({length:17},()=>({pressed:false,value:0}));window.__gp={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:btn()};navigator.getGamepads=()=>[__gp]
  const H=__harness.spdPinkTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1560;a.energy=100;__harness.luffyTest.step(2)
  __gp.buttons[6]={pressed:true,value:1};__harness.luffyTest.step(1);__gp.buttons[6]={pressed:false,value:0};const scan=a.currentAttack?.name==='pPrep';__harness.luffyTest.step(60)
  b.x=1900;__gp.buttons[5]={pressed:true,value:1};__harness.luffyTest.step(1);__gp.buttons[5]={pressed:false,value:0};__harness.luffyTest.step(16)
  const r={scan,mark:!!a._spdPink?.reserve,shot:H.state().shots.length===1};inputSettings.p1Type='keyboard';return r})
 ok('local gamepad: L2 prepares Iron Reserve, R1 fires the Deltamax shot',pad.scan&&pad.mark&&pad.shot,JSON.stringify(pad));out.gamepad=pad
 const rnd=await page.evaluate(()=>__pkRandom);ok('no Math.random in spdPink*.js',rnd.length===0,JSON.stringify(rnd))
 ok('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{out.passes=pass;out.errors=errors;fs.writeFileSync('docs/spd_pink/determinism_results.json',JSON.stringify(out,null,2)+'\n');console.log(pass,'passed');await browser.close();server.close()}
