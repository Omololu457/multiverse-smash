import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
const BASE='docs/skins/krybot/',browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[]
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.__skinDraws=[];const orig=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(im?.src?.includes('/assets/krybot/')&&(new Error().stack||'').includes('krybotFx.js'))__skinDraws.push(im.src.split('/assets/')[1]);return orig.call(this,im,...args)}})
try{
 await page.goto('http://localhost:8013/index.html?harness=1&p1=krybot&p2=krybot');await page.waitForFunction(()=>window.__harness?.krybotTest)
 await page.evaluate(()=>{__harness.start({p1Skin:'krybot_tv',p2Skin:'krybot_super_legends_ds_red'});__harness.skipToBattle();__harness.luffyTest.step(3)})
 await page.evaluate(()=>__harness.preloadDone());await page.evaluate(()=>__harness.luffyTest.step(3));await page.waitForFunction(()=>__harness.luffyTest.state()?.ready)
 const ids=['default','krybot_tv','krybot_super_legends_ds','krybot_super_legends_ds_red']
 for(const id of ids){
  await page.evaluate(id=>__harness.setSkin('p1',id),id);await page.waitForTimeout(80)
  for(const stage of ['World Tournament Arena','Null Void']){
   await page.evaluate(stage=>{__harness.selectStageByName(stage);__harness.krybotTest.reset();__harness.luffyTest.step(2)},stage);await page.waitForTimeout(80);await page.evaluate(()=>__harness.luffyTest.step(0))
   const sizes=await page.evaluate(()=>['p1','p2'].map(w=>__harness.measureSprite(w)));assert(sizes.every(s=>s.contentH>40&&!s.clipped));assert.equal(await page.evaluate(()=>__harness.krybotTest.raw('p2').skinId),'krybot_super_legends_ds_red')
   await page.screenshot({path:BASE+id+'_'+(stage==='Null Void'?'dark':'light')+'.png'})
  }
 }
 await page.evaluate(()=>{__harness.setSkin('p1','krybot_tv');const H=__harness.krybotTest;H.reset();H.raw().x=1300;H.raw('p2').x=1580;for(const side of ['p1','p2']){H.raw(side).energy=100;H.move('kCover',side)}__harness.luffyTest.step(35)})
 await page.waitForTimeout(100);await page.evaluate(()=>{__skinDraws.length=0;__harness.luffyTest.step(0)})
 const draws=await page.evaluate(()=>[...new Set(__skinDraws)]);assert(draws.includes('krybot/skins/tv/kBlaster.png'));assert(draws.includes('krybot/skins/ds_red/kBlaster.png'))
 await page.screenshot({path:BASE+'mirror_helpers.png'})
 for(const side of ['p1','p2']){
  const hit=await page.evaluate(side=>{const H=__harness.krybotTest;H.reset();const a=H.raw(side),b=H.raw(side==='p1'?'p2':'p1');a.x=1300;b.x=1390;a.facing=1;b.facing=-1;a.energy=100;H.move('ultimate',side);for(let i=0;i<75;i++){__harness.luffyTest.step(1);if(a._krybot?.super?.age===9)break}return !!a._krybot?.super},side);assert(hit,side+' ultimate must confirm')
  await page.waitForTimeout(100);await page.evaluate(()=>{__skinDraws.length=0;__harness.luffyTest.step(0)})
  const ds=await page.evaluate(()=>[...new Set(__skinDraws)]),expected=side==='p1'?'tv':'ds_red';assert(ds.includes('krybot/skins/'+expected+'/kBlaster.png'))
  await page.screenshot({path:BASE+'ultimate_'+side+'.png'})
 }
 await page.evaluate(()=>{__harness.krybotTest.reset();__harness.setSkin('p1','not-a-skin');__harness.luffyTest.step(3)});await page.waitForTimeout(100);await page.evaluate(()=>__harness.luffyTest.step(0))
 const fallback=await page.evaluate(()=>({anim:__harness.krybotTest.raw()._skinAnim,size:__harness.measureSprite()}));assert.equal(fallback.anim,null);assert(fallback.size.contentH>40&&!fallback.size.clipped)
 // The existing helper cache must issue no new asset fetches during repeated draws.
 const before=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/krybot/')).length)
 await page.evaluate(()=>{for(let i=0;i<50;i++)__harness.luffyTest.step(0)})
 const after=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/krybot/')).length);assert.equal(after,before)
 assert.deepEqual(errors,[]);fs.writeFileSync(BASE+'mirror_results.json',JSON.stringify({readabilityStages:['World Tournament Arena','Null Void'],skins:ids,simultaneousHelpers:draws,cinematicsBothOwners:true,missingSkinFallback:true,noNewResourcesDuring50Draws:true,errors},null,2)+'\n');console.log('PASS all palettes on bright/dark stages; independent P1/P2/helper/ultimate appearances; missing fallback; cached draws; no browser errors')
}finally{await browser.close()}
