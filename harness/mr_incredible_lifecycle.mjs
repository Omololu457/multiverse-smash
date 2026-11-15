import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),out=[]
const check=(name,pass)=>{out.push({name,pass:!!pass});assert(pass,name);console.log('PASS',name)}
try{
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);await page.goto('http://localhost:8000/index.html?harness=1&p1=mr_incredible&p2=mr_incredible&seed=8712',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__harness?.mrIncredibleTest);await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(1)})
 const results=await page.evaluate(()=>{
 const H=__harness.mrIncredibleTest,step=n=>__harness.aiVsAi.step(n),a=H.raw(),b=H.raw('p2'),r={}
 const setup=()=>{H.reset();__harness.setDummyBehavior('stand');__harness.setRoundTimer(99999);for(const f of [a,b]){f.x=f===a?1300:1365;f.y=400;f.onGround=f.grounded=true;f.energy=100;f.health=f.maxHealth;f.hitstun=f.blockstun=f.hitstop=0;f.invulnTimer=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0;f.knockdownState=false;f.isGrabbed=false;f.comboCounter=f.comboTimer=0;f.vx=f.vy=0;f.jumpHeld=false}a.facing=1;b.facing=-1}
 setup();a.hitstun=10;r.stunReject=!H.activate()&&a.energy===100;a.hitstun=0;a.knockdownState='down';r.downReject=!H.activate();a.knockdownState=false
 for(const x of [0,3000]){setup();a.x=x;const hp=a.health,j=a.jumpCount;r['boundary'+x]=H.activate()&&a.x===x&&a.health===hp&&a.jumpCount===j}
 setup();__harness.setSkin('p1','mi_cosmic');H.activate();step(24);H.move('miLift');for(let i=0;i<20&&!b.isGrabbed;i++)step(1);r.captured=b.isGrabbed;a._mrIncredible.remaining=1;const hp=b.health;step(1);r.throwExpiry=a._mrIncredible.remaining===0&&a._mrIncredible.visual==='prime'&&a._grabThrowDmg===188.5;step(35);r.throwSnapshot=hp-b.health===113&&a._mrIncredible.visual==='veteran'&&a.skinId==='mi_cosmic'
 setup();a.health=600;const base=[a.maxHealth,a.speed,a.baseSpeed,a.attackMultiplier,a.damageMultiplier,a.defenseMultiplier];let repeat=true
 for(let i=0;i<6;i++){a.energy=100;repeat&&=H.activate();step(24);repeat&&=H.move('heavy')&&a.currentAttack.damage===130;a._mrIncredible.remaining=1;step(70);repeat&&=a.health===600&&JSON.stringify(base)===JSON.stringify([a.maxHealth,a.speed,a.baseSpeed,a.attackMultiplier,a.damageMultiplier,a.defenseMultiplier])}r.repeated=repeat
 return r
 });for(const [k,v] of Object.entries(results))check(k,v)
 await page.evaluate(()=>{__harness.start({mode:'vs',p1Skin:'mi_cosmic'});__harness.skipToBattle();__harness.aiVsAi.step(1);const H=__harness.mrIncredibleTest,a=H.raw();a.energy=100;a.hitstun=a.hitstop=0;a.attackCooldown=0;H.activate();a.health=0;__harness.aiVsAi.step(1)})
 const ko=await page.evaluate(()=>{const a=__harness.mrIncredibleTest.raw();return !a._mrIncredible?.remaining&&a.skinId==='mi_cosmic'&&a.maxHealth===1250&&a.damageMultiplier===1});check('KO during prime clears bonus and preserves skin',ko)
}catch(e){console.log(e.stack);process.exitCode=1}finally{fs.writeFileSync('docs/mr_incredible/lifecycle_results.json',JSON.stringify(out,null,2));await browser.close()}
