// Human P2 keys must survive the CPU-input cleanup path in local versus.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage()
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
try{
 await page.goto(server.base+'/index.html?harness=1&p1=goku&p2=goku');await page.waitForFunction(()=>!!window.__harness)
 await page.evaluate(()=>{__harness.start({mode:'pvp'});__harness.skipToBattle();__harness.aiVsAi.step(2);__harness.setP2X(__harness.p1().x+80)})
 const hp=await page.evaluate(()=>__harness.p1().health)
 await page.keyboard.down('1');await page.evaluate(()=>__harness.aiVsAi.step(7));await page.keyboard.up('1')
 const data=await page.evaluate(()=>({p1:__harness.p1(),p2:__harness.p2()}))
 assert(data.p1.health<hp,'P2 real Light key must hit P1 through the normal PvP pipeline')
 assert(data.p2.comboCounter>0,'P2 hit must be attributed to P2')
 assert.equal(errors.length,0)
 console.log('PVP KEYBOARD: 3 passed, 0 failed')
}finally{await browser.close();server.close()}
