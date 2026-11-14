import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage()
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;const old=Math.random;window.__kryRandom=[];Math.random=function(){const st=new Error().stack;if(/\/krybot\w*\.js/.test(st)&&!/\/sound\.js/.test(st)&&__kryRandom.length<5)__kryRandom.push(st);return old()}})
try {
 await page.goto(server.base+'/index.html?harness=1&p1=krybot&p2=krybot&seed=77331',{waitUntil:'load'})
 await page.waitForFunction(()=>window.__harness?.krybotTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(1)})
 await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
 const recorded=await page.evaluate(async()=>{
  const {writeRawControls}=await import('./input.js');const traces=[];let helper=false,shot=false,superSeen=false
  const digest=()=>JSON.stringify(['p1','p2'].map(w=>{const f=__harness.krybotTest.raw(w),s=__harness.krybotTest.state(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,s.s,s.attack,s.shots]}))
  for(let i=0;i<670;i++) {
   const raw={right:i<75,charge:i>=300&&i<480}
   if(i===80){raw.down=true;raw.special=true}
   if(i===150)raw.special=true
   if(i===220){raw[__harness.krybotTest.raw().facing===1?'left':'right']=true;raw.special=true}
   if(i===500)raw.ultimate=true
   writeRawControls(__harness.krybotTest.raw(),raw);__harness.luffyTest.step(1)
   const s=__harness.krybotTest.state();helper ||= !!s.s?.helper;shot ||= s.shots.length>0;superSeen ||= !!s.s?.super
   traces.push(digest())
  }
  return {traces,rep:__harness.replay.stopAndGet(),helper,shot,superSeen}
 })
 assert(recorded.helper && recorded.shot,`recorded scenario must exercise helper and projectile state: ${JSON.stringify({helper:recorded.helper,shot:recorded.shot,last:recorded.traces.at(-1)})}`)
 console.log('PASS recorded 670 actual simulation frames including helper and shot state')
 const validation=await page.evaluate(rep=>__harness.replay.play(rep),recorded.rep)
 assert(validation.ok,JSON.stringify(validation));await page.evaluate(()=>{__harness.skipToBattle();__harness.luffyTest.step(1)});await page.waitForFunction(()=>__harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
 const playback=await page.evaluate(n=>{const traces=[];for(let i=0;i<n;i++){__harness.luffyTest.step(1);traces.push(JSON.stringify(['p1','p2'].map(w=>{const f=__harness.krybotTest.raw(w),s=__harness.krybotTest.state(w);return [f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,s.s,s.attack,s.shots]})))}return {traces,st:__harness.replay.playbackState()}},recorded.traces.length)
 const first=recorded.traces.findIndex((s,i)=>s!==playback.traces[i])
 assert.equal(first,-1,`replay mismatch frame ${first}:\n${recorded.traces[first]}\n${playback.traces[first]}`)
 assert(!playback.st.desync,JSON.stringify(playback.st));console.log('PASS replay JSON round-trip matches every authoritative frame and shared checkpoints')

 // LAN remote input must reach slot 2 even with a live neutral controller.
 const lan=await page.evaluate(async()=>{
  const {inputSettings}=await import('./input.js');__harness.replay.stopPlayback();inputSettings.p1Type='keyboard';inputSettings.p2Type='controller'
  window.__kryPad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[__kryPad]
  __harness.start({mode:'pvp'});__harness.skipToBattle()
  __harness.net.beginMock({localSide:'p1',inputDelay:2,remoteScript:fr=>__harness.replay.encode(fr===8?{right:true,special:true}:fr===80?{special:true}:{})})
  let helper=false,shot=false
  for(let i=0;i<150;i++){__harness.luffyTest.step(1);const s=__harness.krybotTest.state('p2');helper ||= !!s.s?.helper;shot ||= s.shots.length>0}
  const f=__harness.net.frame();__harness.net.end();return {helper,shot,frame:f,owner:__harness.krybotTest.state('p2')}
 })
 assert(lan.helper&&lan.shot&&lan.frame>=150,JSON.stringify(lan));console.log('PASS LAN-injected slot 2 helper and shot with a live neutral controller')
 assert.deepEqual(await page.evaluate(()=>__kryRandom),[]);assert.deepEqual(errors,[])
 fs.writeFileSync('docs/krybot/determinism_results.json',JSON.stringify({frames:670,frameIdentical:true,sharedReplayCheckpoints:playback.st,recordedHelper:recorded.helper,recordedShot:recorded.shot,recordedSuper:recorded.superSeen,lan:{helper:lan.helper,shot:lan.shot,frames:lan.frame},errors},null,2)+'\n')
 console.log('PASS no Krybot Math.random calls or browser runtime errors')
}finally{await browser.close();server.close()}
