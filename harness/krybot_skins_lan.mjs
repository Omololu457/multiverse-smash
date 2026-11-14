import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {startLanServer} from '../net/lanServer.mjs'
const BASE='docs/skins/krybot/',relay=startLanServer({port:8796,relay:true,log:()=>{}})
await new Promise(r=>relay.wss.once('listening',r))
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']})
const errors=[]
try{
 const host=await browser.newPage({viewport:{width:1280,height:720}}),join=await browser.newPage({viewport:{width:1280,height:720}})
 for(const p of [host,join]){p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8013/index.html?harness=1&relay=ws%3A%2F%2F127.0.0.1%3A8796');await p.waitForFunction(()=>window.__harness?.online);await p.mouse.click(640,360)}
 await host.evaluate(()=>__harness.online.hostStart());await host.waitForFunction(()=>['ready','waiting'].includes(__harness.online.status()))
 await host.waitForFunction(()=>!!__harness.online.hostCode());const code=await host.evaluate(()=>__harness.online.hostCode())
 await join.evaluate(c=>__harness.online.join(c),code);await join.waitForFunction(()=>__harness.online.status()==='joined');await host.waitForFunction(()=>__harness.online.status()==='ready')
 const rect=await host.evaluate(async()=>{const u=await import('./ui.js');return u.getOnlineHostRects(document.querySelector('canvas'),true)[0]});await host.mouse.click(rect.x+rect.w/2,rect.y+rect.h/2)
 for(const idx of [1,3]){
  await host.waitForTimeout(300);await host.mouse.move(1100,580);await host.mouse.wheel(0,640);await host.waitForTimeout(300);await host.mouse.click(960,454);await host.waitForTimeout(300);await host.mouse.click(522,330);await host.waitForTimeout(400)
  const r=(await host.evaluate(()=>__harness.skinSelectRects()))[idx];await host.mouse.click(r.x+r.w/2,r.y+r.h/2);await host.waitForTimeout(600)
 }
 assert.equal((await host.evaluate(()=>__harness.state())).gameState,'selectStage')
 await host.mouse.click(1145,474);await Promise.all([host,join].map(p=>p.waitForFunction(()=>__harness.online.isActive(),null,{timeout:15000})))
 for(const p of [host,join])await p.evaluate(()=>__harness.skipToBattle())
 await Promise.all([host,join].map(p=>p.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:30000})))
 const appearance=p=>p.evaluate(()=>['p1','p2'].map(w=>{const f=__harness.krybotTest.raw(w);return {id:f.skinId,sheet:f._skinAnim?.idle?.sheet,tint:f.tintColor}}))
 const a=await appearance(host),b=await appearance(join);assert.deepEqual(a,b);assert.deepEqual(a.map(x=>x.id),['krybot_tv','krybot_super_legends_ds_red']);assert(a.every(x=>!x.tint))
 const hs=[],js=[];for(let i=0;i<100;i++){const [h,j]=await Promise.all([host,join].map(p=>p.evaluate(()=>__harness.online.syncProbe())));hs.push(h);js.push(j);await host.waitForTimeout(16)}
 const jm=new Map(js.map(x=>[x.frame,x]));let shared=0;for(const h of hs)if(jm.has(h.frame)){assert.deepEqual(h,jm.get(h.frame));shared++}assert(shared>=3,'need overlapping simulation frames')
 await host.screenshot({path:BASE+'lan_host.png'});await join.screenshot({path:BASE+'lan_join.png'});assert.deepEqual(errors,[])
 fs.writeFileSync(BASE+'lan_results.json',JSON.stringify({appearance:a,sharedFrames:shared,errors},null,2)+'\n');console.log('PASS actual host/join code; normal host character/skin/stage selection; MATCH_SETUP independent palettes on both peers; identical',shared,'shared frames')
}finally{await browser.close();await relay.close()}
