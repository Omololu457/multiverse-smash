import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:1280,height:720}}),out=[]
try{
 await p.goto('http://localhost:8013/index.html?harness=1&p1=krybot&p2=krybot');await p.waitForFunction(()=>window.__harness?.krybotTest)
 for(const id of ['default','krybot_tv','krybot_super_legends_ds','krybot_super_legends_ds_red']){
  const t=Date.now();await p.evaluate(id=>{__harness.start({p1Skin:id,p2Skin:id});__harness.skipToBattle()},id);await p.waitForFunction(()=>__harness.preloadReady());const preloadMs=Date.now()-t
  await p.waitForTimeout(500)
  const ms=await p.evaluate(()=>new Promise(resolve=>{const times=[];let last;function step(t){if(last!=null)times.push(t-last);last=t;if(times.length===90)resolve(times);else requestAnimationFrame(step)}requestAnimationFrame(step)}))
  out.push({id,preloadMs,meanFrameMs:ms.reduce((a,b)=>a+b)/ms.length,p95FrameMs:[...ms].sort((a,b)=>a-b)[85],preloadFailures:await p.evaluate(()=>__harness.preloadFailures())});assert.deepEqual(out.at(-1).preloadFailures,[])
 }
 fs.writeFileSync('docs/skins/krybot/performance_results.json',JSON.stringify({environment:'Headless Chromium, normal RAF, 1280x720; 90 samples after 500ms warmup per skin. Local machine smoke, not a cross-device guarantee.',results:out},null,2)+'\n');console.log(out)
}finally{await browser.close()}
