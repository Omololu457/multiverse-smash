import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[]
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
try {
 await page.goto(server.base+'/index.html?harness=1&p1=krybot&p2=krybot',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.krybotTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)})
 await page.waitForFunction(()=>__harness.luffyTest.state()?.ready);await page.waitForTimeout(100)
 await page.evaluate(()=>{__harness.krybotTest.reset();const a=__harness.krybotTest.raw(),b=__harness.krybotTest.raw('p2');a.energy=100;a.x=1300;b.x=1550;__harness.krybotTest.move('kCover');__harness.luffyTest.step(35)})
 await page.waitForTimeout(100);await page.evaluate(()=>__harness.luffyTest.step(0));await page.screenshot({path:'docs/krybot/helper_aim.png'})
 await page.evaluate(()=>{__harness.krybotTest.reset();const a=__harness.krybotTest.raw(),b=__harness.krybotTest.raw('p2');a.energy=100;a.x=1300;b.x=1390;__harness.krybotTest.move('ultimate');for(let i=0;i<70;i++){__harness.luffyTest.step(1);if(a._krybot?.super?.age===9)break}})
 await page.waitForTimeout(100);await page.evaluate(()=>__harness.luffyTest.step(0));await page.screenshot({path:'docs/krybot/crossfire.png'})
 await page.evaluate(()=>{const a=__harness.krybotTest.raw();for(let i=0;i<40;i++){if(a._krybot?.super?.age===36)break;__harness.luffyTest.step(1)}})
 await page.waitForTimeout(50);await page.evaluate(()=>__harness.luffyTest.step(0));await page.screenshot({path:'docs/krybot/crossfire_finish.png'})
 const size=await page.evaluate(()=>['p1','p2'].map(w=>__harness.measureSprite(w)))
 assert(size.every(s=>s?.contentH>40&&!s.clipped),JSON.stringify(size));assert.deepEqual(errors,[])
 fs.writeFileSync('docs/krybot/render_results.json',JSON.stringify({size,errors},null,2)+'\n');console.log('PASS supplied helper and crossfire art rendered; both fighters visible without clipping',size)
}finally{await browser.close();server.close()}
