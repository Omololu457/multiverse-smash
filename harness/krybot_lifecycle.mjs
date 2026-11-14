import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[]
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
try {
 await page.goto(server.base+'/index.html?harness=1&p1=krybot&p2=krybot',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.krybotTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(3)})
 const results=await page.evaluate(()=>{
  const H=__harness.krybotTest,step=n=>__harness.luffyTest.step(n),a=()=>H.raw(),b=()=>H.raw('p2')
  const reset=(gap=72)=>{H.reset();a().x=1300;b().x=1300+gap;for(const f of[a(),b()]){f.energy=100;f.hitstop=0;f.invulnTimer=0;f.vx=0;f.vy=0}a().facing=1;b().facing=-1;step(1)}
  const hit=()=>{for(let i=0;i<80;i++){step(1);if(a().currentAttack?.krybot?.clean)return true}return false}
  reset();H.move('heavy');if(!hit())throw Error('heavy did not hit');const startTick=a()._krybot.tick;a().hitstop=80;step(59);const before=a()._krybot.mark?.left;step(1)
  const exactMark=before===1&&!a()._krybot.mark&&a()._krybot.tick-startTick===60
  reset(700);H.move('kCover');step(24);const spawned=!!a()._krybot.helper;a().hitstop=120;step(71)
  const lifetime=spawned&&!a()._krybot.helper&&!H.state().shots.length;step(385);const cooldown=a()._krybot.cooldown===0
  reset();H.move('heavy');hit();step(40);const old=a()._krybot.mark?.left;H.move('heavy');hit();const refreshed=old>0&&a()._krybot.mark?.left===60&&!Array.isArray(a()._krybot.mark)
  reset();H.move('heavy');hit();for(const f of[a(),b()]){f.hitstun=0;f.hitstop=0;f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0}H.move('heavy','p2');step(14)
  const ma=a()._krybot.mark,mb=b()._krybot.mark
  const mirrors=ma?.target[0]==='p2'&&mb?.target[0]==='p1'&&ma.left<mb.left
  reset();const edge=__harness.luffyTest.edge('p1','right');a().x=edge.width-180;b().x=edge.width-100;a().facing=1;H.move('heavy');hit();step(40);H.move('kCover');step(25);const h=a()._krybot.helper
  const wall=h&&h.x>=24&&h.x<=edge.width-24;step(100);const finite=!a()._krybot.helper&&!H.state().shots.length
  // An ultimate commit clears ordinary allied support immediately.
  reset(700);H.move('kCover');step(26);for(const f of[a(),b()]){f.attacking=false;f.currentAttack=null;f.attackCooldown=0;f.hitstun=0}a().energy=100;H.move('ultimate');const ultimateClears=!a()._krybot.helper&&!H.state().shots.some(p=>p.kind==='cover')
  return {exactMark,lifetime,cooldown,refreshed,mirrors,wall:!!wall,finite,ultimateClears}
 })
 for(const [name,ok] of Object.entries(results))assert(ok,`${name} failed: ${JSON.stringify(results)}`)
 assert.deepEqual(errors,[]);fs.writeFileSync('docs/krybot/lifecycle_results.json',JSON.stringify({...results,errors},null,2)+'\n');console.log('PASS lifecycle, exact hitstop-independent timers, repeated marks, mirror marks, wall pressure and ultimate transition',results)
}finally{await browser.close();server.close()}
