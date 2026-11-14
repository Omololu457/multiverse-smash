// Paired render-cost probe: identical frozen match state, all PNGs already decoded.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:1280,height:720}})
await p.addInitScript(()=>window.requestAnimationFrame=()=>0)
try{
 await p.goto('http://localhost:8013/index.html?harness=1&p1=krybot&p2=krybot');await p.waitForFunction(()=>window.__harness?.krybotTest)
 await p.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(3)});await p.evaluate(()=>__harness.preloadDone());await p.evaluate(()=>__harness.luffyTest.step(3));await p.waitForFunction(()=>__harness.spriteReady().ready)
 const ids=['default','krybot_tv','krybot_super_legends_ds','krybot_super_legends_ds_red'],out=[]
 for(let round=0;round<4;round++)for(let n=0;n<4;n++){
  const id=ids[(n+round)%4];await p.evaluate(id=>{__harness.setSkin('p1',id);__harness.setSkin('p2',id);__harness.luffyTest.step(0)},id);await p.waitForTimeout(150);await p.evaluate(()=>__harness.luffyTest.step(0))
  const ms=await p.evaluate(()=>{const c=document.querySelector('canvas').getContext('2d');for(let i=0;i<5;i++)__harness.luffyTest.step(0);const start=performance.now();for(let i=0;i<80;i++){__harness.luffyTest.step(0);c.getImageData(0,0,1,1)}return (performance.now()-start)/80});out.push({id,round,renderMs:ms})
 }
 const medians=Object.fromEntries(ids.map(id=>{const v=out.filter(r=>r.id===id).map(r=>r.renderMs).sort((a,b)=>a-b);return [id,(v[1]+v[2])/2]}));assert(Object.values(medians).every(v=>Number.isFinite(v)&&v>0))
 fs.writeFileSync('docs/skins/krybot/render_cost_results.json',JSON.stringify({method:'4 rotating paired rounds, 80 identical frozen renders each; getImageData flush; both fighters use selected skin; no gameplay advance, all sheets warm',medians,observations:out},null,2)+'\n');console.log(medians)
}finally{await browser.close()}
