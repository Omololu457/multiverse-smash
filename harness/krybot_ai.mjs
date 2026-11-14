import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage()
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
try {
 await page.goto(server.base+'/index.html?harness=1&p1=krybot&p2=krybot&seed=3344',{waitUntil:'load'})
 await page.waitForFunction(()=>__harness?.aiVsAi)
 await page.evaluate(()=>{__harness.aiVsAi.start({p1:'krybot',p2:'krybot',p1Diff:'adaptive',p2Diff:'adaptive',matches:1});__harness.skipToBattle();__harness.luffyTest.step(3)})
 await page.waitForFunction(()=>__harness.luffyTest.state()?.ready)
 const report=await page.evaluate(()=>{
  const moves=[new Set(),new Set()];let helper=false
  for(let i=0;i<1800;i++){__harness.luffyTest.step(1);for(const [j,w]of ['p1','p2'].entries()){const f=__harness.krybotTest.raw(w);if(f.currentAttack)moves[j].add(f.currentAttack.name);helper ||= !!f._krybot?.helper}}
  return {moves:moves.map(s=>[...s]),health:['p1','p2'].map(w=>__harness.krybotTest.raw(w).health),helper,state:__harness.state()}
 })
 assert(report.moves.every(m=>m.length>=2),JSON.stringify(report));assert(report.health.some(h=>h<900),JSON.stringify(report));assert.deepEqual(errors,[])
 fs.writeFileSync('docs/krybot/ai_results.json',JSON.stringify({...report,errors},null,2)+'\n');console.log('PASS both AI slots select and fight responsively for 1800 simulation frames',JSON.stringify(report))
}finally{await browser.close();server.close()}
