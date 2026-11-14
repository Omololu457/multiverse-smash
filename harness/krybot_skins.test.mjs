import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
import {characters} from '../characters.js'
import {KRYBOT_MOVES} from '../krybotData.js'
import {getSkins,getSkin} from '../skins.js'
const BASE='docs/skins/krybot/',baseline=JSON.parse(fs.readFileSync(BASE+'gameplay_baseline.json'))
for(const [k,v] of Object.entries(baseline.roster))for(const part of Object.keys(v))assert.deepEqual(characters[k][part],v[part],`${k}.${part}`)
assert.deepEqual(KRYBOT_MOVES,baseline.krybot)
const skins=getSkins('krybot');assert.equal(skins.length,4);assert.equal(getSkin('krybot','missing').id,'default')
for(const s of skins){assert(s.source.version&&s.source.url&&s.regionMapping&&s.effectsPolicy&&s.compatibility);if(s.animationData)for(const[k,d]of Object.entries(s.animationData)){const {sheet,...a}=d,{sheet:_,...b}=characters.krybot.animationData[k];assert.deepEqual(a,b);assert(fs.existsSync(sheet.replace('./','')))}}
console.log('PASS zero authored gameplay/frame-data changes for every character; complete skin metadata and identical animation dimensions/origins/timelines')
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],results=[]
try {
 for(const skin of skins){
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.__skinDraws=[];const orig=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(im?.src?.includes('/assets/krybot/')&&(new Error().stack||'').includes('krybotFx.js'))__skinDraws.push(im.src.split('/assets/')[1]);return orig.call(this,im,...args)}})
  await page.goto(server.base+'/index.html?harness=1&p1=krybot&p2=krybot&seed=334455',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.krybotTest)
  await page.evaluate(id=>{__harness.start({p1Skin:id});__harness.skipToBattle();__harness.luffyTest.step(3)},skin.id)
  await page.evaluate(()=>__harness.preloadDone());await page.evaluate(()=>__harness.luffyTest.step(3))
  await page.waitForFunction(()=>__harness.luffyTest.state()?.ready)
  await page.evaluate(async()=>{const f=__harness.krybotTest.raw();await Promise.all(Object.values(f._skinAnim||f.animationData).map(d=>new Promise(r=>{const im=new Image();im.onload=im.onerror=r;im.src=d.sheet})))})
  const run=await page.evaluate(()=>{
   const H=__harness.krybotTest,a=H.raw(),b=H.raw('p2');H.reset();a.x=1300;b.x=1372;a.facing=1;b.facing=-1;a.energy=100
   const trace=[];let helper=false,ultimate=false;const start=performance.now()
   for(let i=0;i<520;i++){
    if(i===0)H.move('light');if(i===30)H.move('heavy');if(i===100)H.move('kCover');if(i===200){a.energy=100;H.move('ultimate')}if(i===320)H.move('kBreach');if(i===400){a.energy=100;H.move('kLeap')}
    __harness.luffyTest.step(1);helper ||= !!a._krybot?.helper;ultimate ||= !!a._krybot?.super
    trace.push(JSON.stringify([a.x,a.y,a.vx,a.vy,a.health,a.energy,a.hitstun,a.hitstop,a.jumpCount,a.currentAttack,a._krybot,b.x,b.y,b.vx,b.vy,b.health,b.energy,b.hitstun,b.hitstop,H.state().shots]))
   }
   return {trace,helper,ultimate,ms:performance.now()-start,health:b.health,draws:[...new Set(__skinDraws)]}
  })
  assert(run.helper&&run.ultimate,skin.id+' must exercise helpers/ultimate')
  if(results.length)assert.deepEqual(run.trace,results[0].trace,skin.id+' changes authoritative outcomes')
  const poses=await page.evaluate(async()=>{const f=__harness.krybotTest.raw(),out=[];__harness.krybotTest.reset();for(const action of Object.keys(f._skinAnim||f.animationData)){__harness.forceAction(action);__harness.luffyTest.step(1);await new Promise(r=>setTimeout(r,20));__harness.luffyTest.step(0);const m=__harness.measureSprite();out.push({action,...m})}__harness.forceAction(null);return out})
  assert(poses.every(p=>p.contentH>10&&!p.clipped),JSON.stringify(poses.filter(p=>p.contentH<=10||p.clipped)))
  await page.evaluate(()=>{const H=__harness.krybotTest;H.reset();H.raw().energy=100;H.raw('p2').x=H.raw().x+250;H.move('kCover');__harness.luffyTest.step(35)})
  await page.waitForTimeout(50);await page.evaluate(()=>__harness.luffyTest.step(0));await page.screenshot({path:BASE+skin.id+'_helper.png'})
  const expected=skin.id==='default'?'krybot/kBlaster.png':`krybot/skins/${skin.id==='krybot_tv'?'tv':skin.id.endsWith('_red')?'ds_red':'ds'}/kBlaster.png`
  const fx=await page.evaluate(()=>[...new Set(__skinDraws)]);assert(fx.includes(expected),skin.id+' helper must use owning skin: '+fx)
  results.push({...run,id:skin.id,poses,draws:fx});console.log('PASS',skin.id,'30 real body actions; matching helper/crossfire sheets; identical 520-frame gameplay',Math.round(run.ms)+'ms')
  await page.close()
 }
 assert.deepEqual(errors,[])
 fs.writeFileSync(BASE+'focused_results.json',JSON.stringify({rosterFrameDataUnchanged:true,frameComparison:520,errors,skins:results.map(({trace,...r})=>r)},null,2)+'\n')
}finally{await browser.close();server.close()}
