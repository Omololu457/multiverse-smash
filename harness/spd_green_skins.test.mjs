// harness/spd_green_skins.test.mjs — S.P.D. Green: Default + 6 appearance skins.
//  A. registry: Default first & unchanged, 6 ids/classes/sources, Alien X id ends "AlienX", every sheet on disk.
//  B. per skin: identical 700-frame authoritative trace vs Default (cosmetic only); every action renders unclipped
//     at the same content height as Default; shot / phase-ghost / muzzle art follow the skin; light + dark stage captures.
//  C. mirrors: two different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. session persistence of the skin choice across a reload.
//  Captures → docs/skins/spd_green/.        node harness/spd_green_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
import {getSkins} from '../skins.js'
const ROOT=process.cwd(),OUT='docs/skins/spd_green';let pass=0,fail=0;const report={skins:{}}
const ok=(c,n,d='')=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n,d)}
const list=getSkins('spd_green'),byId=Object.fromEntries(list.map(s=>[s.id,s]))
const WANT={spdGreenAlienX:'alienx',spd_green_inspired_upgrade:'upgrade',spd_green_inspired_diamondhead:'diamondhead',spd_green_inspired_heatblast:'heatblast',spd_green_inspired_spd_blue:'spd_blue',spd_green_inspired_shadow:'shadow'}
ok(list[0].id==='default'&&!list[0].animationData&&list.length===7,'A. Default first, unchanged (base sheets), exactly 6 skins added',String(list.length))
for(const [id,tag] of Object.entries(WANT)){const s=byId[id];let files=true
 for(const d of Object.values(s?.animationData||{}))if(!d.sheet.includes(`/skins/${tag}/`)||!fs.existsSync(path.join(ROOT,d.sheet)))files=false
 for(const fx of ['fx_beam0','fx_beam1','fx_streak0','fx_streak1','portrait'])if(!fs.existsSync(path.join(ROOT,`assets/spd_green/skins/${tag}/${fx}.png`)))files=false
 ok(s&&s.recolorTag===tag&&s.classification&&s.source?.version&&s.spriteScale===list[0].spriteScale&&files,`A. ${id}: registered, classified (${s?.classification}), sourced, all sheets + FX on disk`)}
ok(Object.keys(WANT).filter(k=>k.endsWith('AlienX')).length===1,'A. Alien X id ends "AlienX" → existing shared starfield overlay')
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],bad=[]
async function open(a,b){const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message))
 page.on('response',r=>{if(r.status()>=400&&/\/assets\//.test(r.url()))bad.push(r.url())})
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.__draws=[];const o=CanvasRenderingContext2D.prototype.drawImage
  CanvasRenderingContext2D.prototype.drawImage=function(im,...r){if(im?.src?.includes('/assets/')&&/spdGreenFx/.test(new Error().stack||''))__draws.push(im.src.split('/assets/')[1]);return o.call(this,im,...r)}})
 await page.goto(`${server.base}/index.html?harness=1&p1=spd_green&p2=spd_green&seed=24680`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.__harness?.spdGreenTest)
 await page.evaluate(([a,b])=>{__harness.start({p1Skin:a,p2Skin:b});__harness.skipToBattle();__harness.luffyTest.step(3)},[a,b]);await page.evaluate(()=>__harness.preloadDone());await page.evaluate(()=>__harness.luffyTest.step(3))
 await page.waitForFunction(()=>__harness.luffyTest.state()?.ready)
 await page.evaluate(async()=>{const f=__harness.spdGreenTest.raw();await Promise.all([...Object.values(f._skinAnim||f.animationData).map(d=>d.sheet),...['fx_beam0','fx_beam1','fx_streak0','fx_streak1'].map(n=>f._recolorTag?`./assets/spd_green/skins/${f._recolorTag}/${n}.png`:`./assets/spd_green/${n}.png`)].map(src=>new Promise(r=>{const im=new Image();im.onload=im.onerror=r;im.src=src})))})
 return page}
// 700-frame scripted trace (input-only after a fixed placement) — must be identical for every skin.
const TRACE=async page=>page.evaluate(async()=>{const {writeRawControls}=await import('./input.js');const H=__harness.spdGreenTest;H.reset();__harness.setDummyBehavior('stand')
 const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1560;a.facing=1;b.facing=-1;for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.hitstun=0;f.hitstop=0;f.comboCounter=0}
 const ev={10:{charge:true},70:{right:true},74:{},78:{right:true},110:{right:true,special:true},200:{special:true},280:{light:true},300:{light:true},320:{heavy:true},380:{down:true,special:true},470:{left:true,special:true},540:{up:true,jump:true},552:{down:true,special:true},620:{right:true,heavy:true}}
 const t=[];let shot=null;for(let i=0;i<700;i++){writeRawControls(a,ev[i]||{});__harness.luffyTest.step(1)
  const p=(__harness.projectiles?.()||[]).find(p=>p._spdGreen||p.type==='spd_green_shot');if(p&&!shot)shot=p.sheet||p.spriteSheet||p.image?.src||null
  t.push(JSON.stringify([a.x,a.y,a.vx,a.vy,a.health,a.energy,a.currentAttack?.name,a.currentAttack?.timer,b.x,b.y,b.health,b.hitstun,a._spdGreen?.mark,a._groundTeleport?.count]))}
 return {t,shot}})
const RENDER=async page=>page.evaluate(async()=>{const f=__harness.spdGreenTest.raw(),out=[];for(const action of Object.keys(f._skinAnim||f.animationData)){__harness.forceAction(action);__harness.luffyTest.step(1);await new Promise(r=>setTimeout(r,12));__harness.luffyTest.step(0);out.push({action,...__harness.measureSprite()})}__harness.forceAction(null);return out})
try{
 // Default baseline
 let page=await open('default','default');const base=await TRACE(page),baseR=await RENDER(page);await page.close()
 ok(baseR.every(r=>r.contentH>20&&!r.clipped),'B. Default: every action renders unclipped',JSON.stringify(baseR.filter(r=>!(r.contentH>20)||r.clipped)))
 for(const [id,tag] of Object.entries(WANT)){
  page=await open(id,'default')
  const me=await page.evaluate(()=>{const f=__harness.spdGreenTest.raw();return {id:f.skinId,tag:f._recolorTag,idle:f._skinAnim?.idle?.sheet}})
  ok(me.id===id&&me.tag===tag&&me.idle?.includes(`/skins/${tag}/`),`B. ${id}: applied (tag ${me.tag})`)
  const tr=await TRACE(page),d=base.t.findIndex((s,i)=>s!==tr.t[i])
  ok(d===-1,`B. ${id}: 700-frame trace identical to Default (timing/geometry/damage untouched)`,d===-1?'':`frame ${d}`)
  const R=await RENDER(page),mism=R.filter((r,i)=>r.clipped||Math.abs(r.contentH-baseR[i].contentH)>1||Math.abs(r.contentW-baseR[i].contentW)>1)
  ok(!mism.length,`B. ${id}: all ${R.length} actions render, same content box as Default`,JSON.stringify(mism.slice(0,3)))
  // FX follow the skin (render-only): phase ghost, muzzle star; shot sheet path
  await page.evaluate(()=>{__harness.spdGreenTest.reset();const a=__harness.spdGreenTest.raw(),b=__harness.spdGreenTest.raw('p2');a.x=1300;b.x=1900;a.energy=100;__draws.length=0;__harness.luffyTest.step(1)})
  await page.keyboard.down('d');await page.evaluate(()=>__harness.luffyTest.step(1));await page.keyboard.up('d');await page.evaluate(()=>__harness.luffyTest.step(2));await page.keyboard.down('d');await page.evaluate(()=>__harness.luffyTest.step(1));await page.keyboard.up('d')
  await page.evaluate(()=>__harness.luffyTest.step(3));await page.screenshot({path:`${OUT}/${id}_phase.png`})
  await page.evaluate(()=>__harness.luffyTest.step(20));await page.keyboard.down('l');await page.evaluate(()=>__harness.luffyTest.step(1));await page.keyboard.up('l');await page.evaluate(()=>__harness.luffyTest.step(15))
  const dr=await page.evaluate(()=>[...new Set(__draws)]);await page.screenshot({path:`${OUT}/${id}_shot.png`})
  ok(dr.some(x=>x.includes(`spd_green/skins/${tag}/fx_streak`))&&dr.some(x=>x.includes(`spd_green/skins/${tag}/fx_beam0`)),`B. ${id}: phase ghost + muzzle drawn in the skin`,dr.join(','))
  const sh=await page.evaluate(()=>{const H=__harness.spdGreenTest;H.reset();const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1900;a.energy=100;a.attacking=false;a.currentAttack=null;a.attackCooldown=0;__harness.luffyTest.step(1);H.move('gShot');__harness.luffyTest.step(16);return H.state().shots})
  ok(sh.length===1&&sh[0].sheet===`./assets/spd_green/skins/${tag}/fx_beam1.png`,`B. ${id}: live Deltamax shot uses the skin sheet`,JSON.stringify(sh))
  for(const [stage,tone] of [['World Tournament Arena','light'],['Null Void','dark']]){
   await page.evaluate(s=>{__harness.selectStageByName(s);__harness.spdGreenTest.reset();__harness.luffyTest.step(2)},stage);await page.waitForTimeout(60);await page.evaluate(()=>__harness.luffyTest.step(0))
   const m=await page.evaluate(()=>__harness.measureSprite('p1'));ok(m.contentH>40&&!m.clipped,`B. ${id}: readable on ${tone} stage`,String(m.contentH));await page.screenshot({path:`${OUT}/${id}_${tone}.png`})}
  report.skins[id]={tag,traceIdentical:d===-1,actions:R.length}
  await page.close()
 }
 // C. mirrors
 for(const [a,b,same] of [['spd_green_inspired_heatblast','spd_green_inspired_diamondhead',false],['spdGreenAlienX','spdGreenAlienX',true]]){
  page=await open(a,b);await page.evaluate(()=>__harness.luffyTest.step(0))
  const m=await page.evaluate(()=>['p1','p2'].map(w=>{const f=__harness.spdGreenTest.raw(w);return {id:f.skinId,idle:f._skinAnim?.idle?.sheet,tint:f.tintColor||null}}))
  if(same)ok(m[0].id===a&&m[1].id===b&&!m[0].tint&&!!m[1].tint,`C. same-skin mirror (${a}) → P2 gets the existing mirror wash`,JSON.stringify(m))
  else ok(m[0].id===a&&m[1].id===b&&m[0].idle!==m[1].idle&&!m[0].tint&&!m[1].tint,`C. ${a} vs ${b}: both own palettes`,JSON.stringify(m))
  await page.screenshot({path:`${OUT}/mirror_${a}_vs_${b}.png`});await page.close()}
 // D. persistence across reload (session=1)
 page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`${server.base}/index.html?harness=1&session=1&p1=spd_green&p2=spd_green`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.__harness?.session);await page.mouse.click(640,360)
 await page.evaluate(()=>{__harness.start({p1Skin:'spd_green_inspired_spd_blue',p2Skin:'spd_green_inspired_shadow',mode:'vs',difficulty:'dummy'});__harness.skipToBattle()});await page.waitForTimeout(400)
 const saved=await page.evaluate(()=>__harness.session());await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.session);await page.waitForTimeout(300);const restored=await page.evaluate(()=>__harness.session())
 ok(saved.p1Skin==='spd_green_inspired_spd_blue'&&restored.p1Skin==='spd_green_inspired_spd_blue'&&restored.p2Skin==='spd_green_inspired_shadow','D. skin choice persists across a reload',JSON.stringify(restored));await page.close()
 ok(!bad.length,'no missing asset requests',JSON.stringify(bad.slice(0,5)));ok(!errors.length,'no browser runtime errors',JSON.stringify(errors.slice(0,3)))
}finally{report.passes=pass;report.failures=fail;fs.writeFileSync(`${OUT}/skins_results.json`,JSON.stringify(report,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
