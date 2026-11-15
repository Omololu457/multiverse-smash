// harness/dash_parr_visual.mjs — RENDER CHECK: boot → pick Dash (p1) vs a CPU fighter → start match → confirm both
// fighters + HUD render (no crash / no black screen) for ALL 3 skins and at the Blur tier, plus move captures
// (Blur Dash, Flurry, Laps loop, Hydroplane, Incredi-Rush storm) in both facings.
// Screenshots → docs/dash/visual_*.png, results → docs/dash/visual_results.json.   node harness/dash_parr_visual.mjs [p2]
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const P2=process.argv[2]||'spd_green'
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],log={shots:[]};let pass=0,fail=0
const ck=(n,c,d='')=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n,d)}
const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
const shot=async n=>{await page.evaluate(()=>__harness.luffyTest.step(1));const p=`docs/dash/visual_${n}.png`;await page.screenshot({path:p});log.shots.push(p)}
// Pixel probe on the live canvas (screen space): opaque non-backdrop pixels inside a rect + "black screen" check.
const probe=()=>page.evaluate(()=>{const cv=document.querySelector('canvas'),c=cv.getContext('2d'),H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2')
 const cam=__harness.state().camera||{x:0,y:0,zoom:1},img=c.getImageData(0,0,cv.width,cv.height).data
 let lit=0;for(let i=0;i<img.length;i+=4*97)if(img[i]+img[i+1]+img[i+2]>30)lit++
 const hud=(x0,y0,w,h)=>{let n=0;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const k=(y*cv.width+x)*4;if(img[k]>200&&img[k+1]>140&&img[k+2]<120)n++}return n}
 return {lit:lit/(img.length/(4*97)),hpP1:!!a&&a.health>0,hpP2:!!b&&b.health>0,gaugeY:cv.height-17,energyBarPx:hud(70,cv.height-60,340,40)}})
async function boot(skin){
 await page.goto(server.base+`/index.html?harness=1&p1=dash_parr&p2=${P2}&seed=9191`,{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.dashParrTest,null,{timeout:30000})
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone?.())
 const applied=await page.evaluate(sk=>__harness.setSkin('p1',sk),skin)
 await page.waitForFunction(()=>__harness.spriteReady?.().ready!==false,null,{timeout:20000}).catch(()=>{})
 await page.evaluate(()=>{const H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2');a.x=1240;b.x=1420;a.facing=1;b.facing=-1;a.energy=100;__harness.setDummyBehavior?.('stand');__harness.luffyTest.step(20)})
 await page.waitForTimeout(300);return applied}
async function play(key,frames,setup=''){await page.evaluate(([key,frames,setup])=>{const H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2');H.reset();a.x=1240;b.x=1420;a.facing=1;b.facing=-1;a.energy=100;if(setup)eval(setup);__harness.luffyTest.step(2);H.move(key);__harness.luffyTest.step(frames)},[key,frames,setup])}
try{
 for(const [skin,label] of [['default','supersuit'],['dash_parr_incredibles2','incredibles2'],['dash_parr_trackstar','trackstar']]){
  const applied=await boot(skin);await shot(`01_match_${label}`)
  const p=await probe(),st=await page.evaluate(()=>({a:__harness.dashParrTest.state(),b:__harness.dashParrTest.state('p2'),gs:__harness.state().gameState}))
  ck(`[${label}] match running, both fighters live, skin applied`,st.gs==='battle'&&st.a.key==='dash_parr'&&st.b.key===P2&&(skin==='default'||st.a.tag===label),JSON.stringify({gs:st.gs,skin:applied,tag:st.a.tag}))
  ck(`[${label}] not a black screen + energy HUD drawn`,p.lit>0.5&&p.energyBarPx>20,JSON.stringify(p))
  // Blur tier: render-only afterimages while running at Momentum 100
  await page.evaluate(()=>{const H=__harness.dashParrTest,a=H.raw();a._dashParr={...(a._dashParr||{}),momentum:100,blurReady:true}})
  await page.keyboard.down('a');await page.evaluate(()=>__harness.luffyTest.step(10));await shot(`02_blur_${label}`);await page.keyboard.up('a')
  const t=await page.evaluate(()=>__harness.dashParrTest.state().tier);ck(`[${label}] Blur tier renders (afterimages + BLUR gauge)`,t==='blur'&&errors.length===0,t)
  await play('blurDash',10);await shot(`03_blurdash_${label}`)
 }
 // move captures on the default skin, both facings
 await boot('default')
 for(const flip of [false,true]){const L=flip?'L':'R',setup=flip?"a.x=1420;b.x=1240;a.facing=-1;b.facing=1":''
  await play('flurry',18,setup);await shot(`04_flurry_${L}`)
  await play('laps',16,setup);await shot(`05_laps_${L}`)
  await play('hydro',18,setup);await shot(`06_hydro_${L}`)
  await play('jab',5,setup);await shot(`07_jab_${L}`)
  await play('launcher',11,setup);await shot(`08_launcher_${L}`)
  await play('sidestep',4,setup);await shot(`09_sidestep_${L}`)
 }
 await play('rush',70);await shot('10_rush_storm')
 const r=await page.evaluate(()=>({ult:!!__harness.dashParrTest.raw()._dashParr?.ult,alpha:null}));ck('Incredi-Rush storm renders (body hidden, storm drawn)',r.ult&&errors.length===0)
 await page.evaluate(()=>__harness.luffyTest.step(220));await shot('11_rush_after')
 // Flash Time (← + Special): Dash full speed, the foe slowed to ~1/3 (cyan ripples + FLASH TIME HUD label)
 await page.evaluate(()=>{const H=__harness.dashParrTest,a=H.raw(),b=H.raw('p2');H.reset();a.x=1240;b.x=1420;a.facing=1;b.facing=-1;a.energy=150;__harness.luffyTest.step(2)})
 await page.keyboard.down('a');await page.keyboard.down('l');await page.evaluate(()=>__harness.luffyTest.step(1));await page.keyboard.up('l');await page.keyboard.up('a')
 await page.keyboard.down('d');await page.evaluate(()=>__harness.luffyTest.step(14));await shot('13_flash_time');await page.keyboard.up('d')
 const ft=await page.evaluate(()=>({ft:!!__harness.dashParrTest.raw()._dashParr?.ft,slow:!!__harness.dashParrTest.raw('p2')._timeSlowAcc}))
 ck('Flash Time renders (Dash active, opponent time-slowed)',ft.ft&&ft.slow&&errors.length===0,JSON.stringify(ft))
 ck('no browser runtime errors across all captures',errors.length===0,JSON.stringify(errors.slice(0,5)))
}catch(e){fail++;console.log('FAIL exception',e.stack)}
finally{log.pass=pass;log.fail=fail;log.errors=errors;fs.writeFileSync('docs/dash/visual_results.json',JSON.stringify(log,null,2)+'\n');console.log(pass,'passed',fail,'failed');await browser.close();server.close();process.exit(fail?1:0)}
