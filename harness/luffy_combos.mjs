import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}})
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto(server.base+'/index.html?harness=1&p1=luffy&p2=goku');await page.waitForFunction(()=>!!window.__harness?.luffyTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.juice.setSlowMo(false)})
 const results=await page.evaluate(()=>{
  const H=__harness,L=H.luffyTest,results=[];const costs={lfPiston:12,lfReel:18,lfPinwheel:20,lfBrace:18,lfAnchor:15,lfFinale:100}
  for(const [name,gap,route] of [['Beginner',80,'beginner'],['Basic conversion',80,'basic'],['Air route',80,'air'],['Resource route (close)',80,'resource'],['Resource route (far)',180,'resource'],['Pull route (close)',180,'pull'],['Pull route (far)',300,'pull'],['Command launcher branch',80,'command'],['Ultimate conversion',80,'ultimate']]){
   L.clearPose();L.reset();H.setDummyBehavior('stand');H.setP2X(H.p1().x+gap);L.set('p1',{energy:100});
   let frame=0,lastHP=1000;let grossStamina=0,lastSerial=0,snapSpends=0;const hits=[],escapes=[],casts=[],log=[]
   const me=()=>L.state(),opp=()=>L.state('p2')
   function tick(n=1){for(let i=0;i<n;i++){
    const before=opp();L.step(1);frame++;const f=me(),d=opp();if(f.attack?.lfInstance&&f.attack.lfInstance!==lastSerial){lastSerial=f.attack.lfInstance;grossStamina+=costs[f.attack.name]||0;if(f.attack.name==='lfSnap')snapSpends++}
    if(d.health<lastHP){hits.push({frame,damage:lastHP-d.health,hitstun:d.hitstun,gap:d.x-f.x,move:f.attack?.name,remaining:f.attack?.timer,resource:f.energy});lastHP=d.health}
    if(hits.length&&d.hitstun<=0&&d.hitstop<=0)escapes.push(frame)
    log.push({frame,move:f.attack?.name,phase:f.phase,distance:d.x-f.x,enemyHitstun:d.hitstun,y:f.y,enemyY:d.y,hitbox:f.hitbox,energy:f.energy,pips:f.state?.pips})
   }}
   const wait=(p,max=200)=>{for(let i=0;i<max;i++){if(p(me(),opp()))return true;tick()}return false}
   const key=(k,down)=>document.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:k,bubbles:true}))
   function tap(k,dir){if(dir)key(dir,true);key(k,true);tick();key(k,false);if(dir)key(dir,false);casts.push({frame,key:k,dir,move:me().attack?.name})}
   const recovery=()=>wait(s=>s.attack?.lfConfirmed&&s.phase==='recovery')
   let resolved=true
   if(route==='beginner'){tap('j');resolved=recovery();if(resolved){tap('j');resolved=recovery();if(resolved)tap('j')}}
   if(route==='basic'){tap('j');resolved=recovery();if(resolved){tap('k');resolved=recovery();if(resolved)tap('l')}}
   if(route==='air'){tap('i');resolved=recovery();if(resolved){key('d',true);tap('w');tick(3);tap('j');resolved=recovery();if(resolved)tap('l','s');key('d',false)}}
   if(route==='resource'){tap('k');resolved=recovery();if(resolved){tap('l');resolved=wait(s=>s.attack?.lfConfirmed);if(resolved){tap('l');resolved=wait(s=>s.attack?.name==='lfSnap');if(resolved){wait(s=>!s.attack);tap('k','d')}}}}
   if(route==='pull'){tap('l','d');resolved=wait(s=>!s.attack);if(resolved){tap('j');resolved=recovery();if(resolved){tap('j');resolved=recovery();if(resolved)tap('j')}}}
   if(route==='command'){tap('k','d');resolved=recovery();if(resolved){tap('k');resolved=recovery();if(resolved){tap('k','w');resolved=recovery();if(resolved){tap('w');tick(3);tap('j')}}}}
   if(route==='ultimate'){tap('k');resolved=recovery();if(resolved)tap('u')}
   tick(220)
   const last=hits.at(-1)?.frame||0,first=hits[0]?.frame||0,windows=escapes.filter(f=>f>first&&f<last)
   results.push({name,initialGap:gap,resolved,hits,casts,escapeFrames:windows.length,escapeRange:windows.length?[windows[0],windows.at(-1)]:null,
    damage:1000-opp().health,grossStamina,snapSpends,lastHitEnergy:hits.at(-1)?.resource,staminaNet:100-me().energy,pips:me().state?.pips||0,finalGap:opp().x-me().x,
    classification:resolved&&hits.length===({beginner:3,basic:3,air:3,resource:3,pull:4,command:4,ultimate:5}[route])&&!windows.length?'true combo in tested spacing':'pressure / reset / missed link',log})
  }
  return results
 })
 fs.writeFileSync('/tmp/luffy-combo-results.json',JSON.stringify(results,null,2))
 for(const {name,resolved,hits,escapeFrames,damage,staminaNet,finalGap,classification}of results)console.log(JSON.stringify({name,resolved,hits:hits.length,escapeFrames,damage,staminaNet,finalGap,classification}))
 assert.equal(results[0].hits.length,3);assert.equal(results[0].escapeFrames,0)
 assert.equal(results[1].hits.length,3);assert.equal(results[1].escapeFrames,0)
 assert.equal(errors.length,0)
 console.log('LUFFY COMBOS: measured nine routes; beginner/basic true-combo assertions passed')
}finally{await browser.close();server.close()}
