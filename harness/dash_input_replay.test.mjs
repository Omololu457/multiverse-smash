// Exercise the existing double-tap handler and its serialized dash-intent bit.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(), browser=await chromium.launch({headless:true}), page=await browser.newPage()
await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
let passed=0
const check=(name,value)=>{assert(value,name);passed++;console.log('PASS',name)}
try{
 await page.goto(server.base+'/index.html?harness=1&p1=luffy&p2=goku');await page.waitForFunction(()=>!!window.__harness?.luffyTest)
 await page.evaluate(()=>{__harness.juice.setSlowMo(false);__harness.juice.setHitstopStyle('classic');__harness.rng.forceSeed(8192);__harness.start({mode:'pvp'});__harness.skipToBattle();window.__dashClock=25;performance.now=()=>window.__dashClock})
 await page.keyboard.down('d');await page.evaluate(()=>__harness.luffyTest.step(1))
 check('first direction within 240ms of load never dashes',!(await page.evaluate(()=>__harness.juice.dashState().dashTimer)))
 await page.keyboard.up('d');await page.evaluate(()=>{__harness.luffyTest.step(1);window.__dashClock=100})
 await page.keyboard.down('d');await page.evaluate(()=>__harness.luffyTest.step(1));await page.keyboard.up('d')
 check('a genuine second direction tap starts the ordinary dash',(await page.evaluate(()=>__harness.juice.dashState().dashTimer))>0)
 await page.evaluate(()=>__harness.luffyTest.step(240))
 const rec=await page.evaluate(()=>__harness.replay.stopAndGet())
 const hasDash=await page.evaluate(async r=>{const m=await import('./replay.js');return r.frames.some(f=>m.decodeInput(f.p1).dash)},rec)
 check('resolved double tap is carried by the existing dash mask',hasDash)
 check('dash replay accepted',(await page.evaluate(r=>__harness.replay.play(r),rec)).ok)
 await page.evaluate(()=>__harness.skipToBattle());await page.evaluate(n=>__harness.luffyTest.step(n),rec.frameCount+3)
 const result=await page.evaluate(()=>__harness.replay.playbackState());check('ordinary dash replay matches every state checkpoint',result.desyncFrame==null&&result.checks>=4&&result.checks===result.matched)
 console.log(`DASH INPUT / REPLAY: ${passed} passed, 0 failed`)
}finally{await browser.close();server.close()}
