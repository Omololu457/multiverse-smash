import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),out={},errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
const ck=(n,c)=>{console.log(c?'PASS':'FAIL',n);assert(c,n)}
const DIG=`f=>[f.x,f.y,f.vx,f.vy,f.health,f.energy,f.hitstun,f.hitstop,f.comboCounter,f.jumpCount,f._mrIncredible||null,f.currentAttack||null,f._grabThrowDmg||0]`
const SCRIPT=`i=>{const r={};if(i<45)r.right=true;if(i>=45&&i<150)r.charge=true;if(i===155)r.ultimate=true;if(i===190||i===201||i===215)r.light=true;if(i===270)r.heavy=true;if(i===280){r.right=true;r.special=true}if(i===380){r.up=r.jump=true}if(i===390)r.light=true;if(i===450){r.up=r.jump=r.special=true}if(i===520){r.down=r.special=true}if(i===610){r.left=r.special=true}return r}`
try{
 await page.goto('http://localhost:8000/index.html?harness=1&p1=mr_incredible&p2=mr_incredible&seed=6107');await page.waitForFunction(()=>window.__harness?.mrIncredibleTest);await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.aiVsAi.step(1)});await page.waitForFunction(()=>__harness.spriteReady().ready)
 const rec=await page.evaluate(async([src,dig])=>{const {writeRawControls}=await import('./input.js');const script=eval(src),D=eval(dig),H=__harness.mrIncredibleTest,trace=[],seen=new Set();let prime=false,returned=false
 for(let i=0;i<1200;i++){writeRawControls(H.raw(),script(i));__harness.aiVsAi.step(1);const a=H.raw();if(a.currentAttack)seen.add(a.currentAttack.name);prime||=a._mrIncredible?.remaining>0;returned||=prime&&a._mrIncredible?.remaining===0;trace.push(JSON.stringify([D(a),D(H.raw('p2'))]))}
 return {trace,prime,returned,seen:[...seen],rep:__harness.replay.stopAndGet()}
 },[SCRIPT,DIG]);out.recording={prime:rec.prime,returned:rec.returned,seen:rec.seen};ck('input scenario activates and naturally expires',rec.prime&&rec.returned)
 const valid=await page.evaluate(rep=>__harness.replay.play(rep),rec.rep);ck('replay accepts full recorded match',valid.ok);await page.evaluate(()=>{__harness.skipToBattle();__harness.aiVsAi.step(1)})
 const pb=await page.evaluate(dig=>{const D=eval(dig),H=__harness.mrIncredibleTest,t=[];for(let i=0;i<1200;i++){__harness.aiVsAi.step(1);t.push(JSON.stringify([D(H.raw()),D(H.raw('p2'))]))}return {trace:t,state:__harness.replay.playbackState(),remote:H.raw()._mrRemoteInput}},DIG)
 const first=rec.trace.findIndex((t,i)=>t!==pb.trace[i]);out.replay={frames:1200,firstDifference:first,recorded:first>=0?rec.trace[first]:null,playback:first>=0?pb.trace[first]:null,status:pb.state};ck('every authoritative frame matches replay',first===-1);ck('remote injection stays authoritative',pb.remote);ck('no checkpoint desync',!pb.state.desync)
 await page.evaluate(()=>__harness.replay.stopPlayback())
 // JSON restore of Mr-owned state and move snapshots, then deterministic continuation.
 const roundtrip=await page.evaluate(async dig=>{const {mrTick,mrStart,mrActivate}=await import('./mrIncredibleState.js');const {createFighter}=await import('./combat.js');const H=__harness.mrIncredibleTest;H.reset();const f=H.raw();f.energy=100;f.attackCooldown=0;f.attacking=false;mrActivate(f);for(let i=0;i<24;i++)mrTick(f,null,{});mrStart(f,'heavy');const snap=JSON.stringify(f._mrIncredible),attack=JSON.stringify(f.currentAttack);return {s:snap===JSON.stringify(JSON.parse(snap)),a:attack===JSON.stringify(JSON.parse(attack)),raw:f.currentAttack.damage}},DIG);ck('plain JSON serializes transition and move snapshot',roundtrip.s&&roundtrip.a&&roundtrip.raw===130)
 ck('no browser exceptions',!errors.length)
}catch(e){out.error=e.stack;console.log(e.stack);process.exitCode=1}finally{fs.writeFileSync('docs/mr_incredible/determinism_results.json',JSON.stringify(out,null,2));await browser.close()}
