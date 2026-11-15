import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),out={}
await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
try{
 await page.goto('http://localhost:8000/index.html?harness=1&p1=mr_incredible&p2=mr_incredible&seed=2811',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__harness?.mrIncredibleTest)
 out.result=await page.evaluate(async()=>{
 const {inputSettings}=await import('./input.js'),H=__harness.mrIncredibleTest
 const buttons=()=>Array.from({length:17},()=>({pressed:false,value:0}));window.__mrReplayPad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:buttons()};navigator.getGamepads=()=>[__mrReplayPad];inputSettings.p1Type='controller';inputSettings.p2Type='keyboard'
 const D=f=>JSON.stringify([f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f.jumpCount,f._mrIncredible||null,f.currentAttack||null,f._grabThrowDmg||0])
 __harness.start();__harness.skipToBattle();__harness.aiVsAi.step(1);const traces=[],seen=new Set()
 for(let i=0;i<700;i++){__mrReplayPad.buttons=buttons();const press=n=>__mrReplayPad.buttons[n]={pressed:true,value:1};if(i<105)press(6);if(i===110)press(7);if(i===180){press(12);press(5)}if(i===260){press(13);press(5)}if(i===350){press(12);press(3)}if(i===420)press(0);if(i===425)press(0);if(i===470){press(13);press(3)}if(i===580)press(7)
  __harness.aiVsAi.step(1);const a=H.raw();if(a.currentAttack)seen.add(a.currentAttack.name);traces.push([D(a),D(H.raw('p2'))])}
 const rep=__harness.replay.stopAndGet();__mrReplayPad.buttons=buttons();const valid=__harness.replay.play(rep);__harness.skipToBattle();__harness.aiVsAi.step(1);let first=-1,actual=null,want=null
 for(let i=0;i<700;i++){__harness.aiVsAi.step(1);const row=[D(H.raw()),D(H.raw('p2'))];if(first<0&&JSON.stringify(row)!==JSON.stringify(traces[i])){first=i;actual=row;want=traces[i]}}
 return {valid,first,seen:[...seen],actual,want,playback:__harness.replay.playbackState()}
 });assert(out.result.valid.ok);assert(out.result.seen.includes('miRise')&&out.result.seen.includes('up')&&out.result.seen.includes('down_air'));assert(out.result.first===-1,'every pad-recorded authoritative frame matches replay');assert(!out.result.playback.desync);console.log('PASS 700-frame PS5 replay: separate Up/Cross, directional specials/launcher/down-air and prime early return')
}catch(e){out.error=e.stack;console.log(e.stack);process.exitCode=1}finally{fs.writeFileSync('docs/mr_incredible/pad_replay_results.json',JSON.stringify(out,null,2));await browser.close()}
