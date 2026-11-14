import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage()
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
try {
 await page.goto(server.base+'/index.html?harness=1&p1=krybot&p2=krybot',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.krybotTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(3)})
 let trace=[]
 async function tick(n=1){for(let i=0;i<n;i++){const row=await page.evaluate(()=>{__harness.luffyTest.step(1);const a=__harness.krybotTest.raw(),b=__harness.krybotTest.raw('p2');return {hp:b.health,hitstun:b.hitstun,freeze:b.hitstop,gap:b.x-a.x,phase:__harness.krybotTest.state().cancel,move:a.currentAttack?.name,mark:a._krybot?.mark?.left||0}});trace.push(row)}return trace.at(-1)}
 async function tap(keys){for(const k of keys)await page.keyboard.down(k);await tick();for(const k of keys)await page.keyboard.up(k)}
 async function wait(fn,max=100){for(let i=0;i<max;i++){if(trace.length&&fn(trace.at(-1)))return;await tick()}throw Error('route wait timed out')}
 const results=[]
 for(const [label,buttons,cost]of [
  ['J1 -> J2 -> J3',[['j'],['j'],['j']],0],['J1 -> Heavy -> Arm Blaster',[['j'],['k'],['l']],12],
  ['Command -> knock-away',[['d','k'],['k'],['k']],0],['Launcher -> manual jump -> Air',[['i'],['w'],['j']],0],
  ['Heavy -> Covering Unit (pressure)',[['k'],['a','l']],25],['Heavy -> ultimate',[['k'],['u']],100]]) {
  await page.evaluate(()=>{__harness.krybotTest.reset();__harness.setDummyBehavior('stand');const a=__harness.krybotTest.raw(),b=__harness.krybotTest.raw('p2');a.x=1300;b.x=1372;a.facing=1;b.facing=-1;a.energy=100})
  trace=[];await tick();const hp0=trace[0].hp;let hp=hp0   // start HP read from the match (roster-parity pass: maxHealth 900→1080)
  for(let i=0;i<buttons.length;i++){
   await tap(buttons[i])
   if(label.startsWith('Launcher')&&i===1){await tick(3);continue}
   await wait(r=>r.hp<hp);hp=trace.at(-1).hp
   if(i<buttons.length-1)await wait(r=>r.phase.open)
  }
  if(label==='Heavy -> ultimate')await tick(110)
  const contacts=[];let lastHp=hp0,lastIndex=null
  for(let i=0;i<trace.length;i++)if(trace[i].hp<lastHp){contacts.push({frame:i,damage:lastHp-trace[i].hp,gap:trace[i].gap,escapeFrames:lastIndex==null?null:trace.slice(lastIndex+1,i).filter(r=>r.hitstun<=0&&r.freeze<=0).length});lastHp=trace[i].hp;lastIndex=i}
  assert(contacts.length>=2,`${label}: ${JSON.stringify(contacts)}`)
  results.push({label,cost,total:hp0-lastHp,contacts})
 }
 assert(results.find(r=>r.label.includes('pressure')).contacts[1].escapeFrames>0,'cover route must be identified as escapable pressure')
 fs.writeFileSync('docs/krybot/route_measurements.json',JSON.stringify(results,null,2)+'\n');console.log('PASS routes measured per simulation update with actual escape windows',JSON.stringify(results))
}finally{await browser.close();server.close()}
