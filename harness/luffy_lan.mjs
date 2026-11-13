import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { startLanServer } from '../net/lanServer.mjs'
import { serve,frames,start } from './ben10_test_utils.mjs'
const server=await serve(), browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']})
let passed=0;const errors=[];const check=(n,c)=>{assert(c,n);passed++;console.log('PASS',n)}
const open=async(query='')=>{const p=await browser.newPage({viewport:{width:1280,height:720}});p.on('pageerror',e=>errors.push(e.message));await p.goto(server.base+'/index.html?harness=1&p1=luffy&p2=goku'+query);await p.waitForFunction(()=>!!window.__harness);return p}
let relay
try{
 relay=startLanServer({port:0,relay:true,log:()=>{}});await new Promise(r=>relay.wss.once('listening',r));const url=`ws://127.0.0.1:${relay.wss.address().port}`
 const host=await open('&relay='+encodeURIComponent(url)),join=await open('&relay='+encodeURIComponent(url))
 await host.evaluate(()=>{__harness.juice.setHitstopStyle('classic');__harness.juice.setSlowMo(false);__harness.online.hostStart()});await host.waitForFunction(()=>['waiting','ready'].includes(__harness.online.status()),null,{timeout:10000})
 await host.waitForFunction(()=>!!__harness.online.hostCode(),null,{timeout:10000});const code=await host.evaluate(()=>__harness.online.hostCode());await join.evaluate(c=>{__harness.juice.setHitstopStyle('scaled');__harness.online.join(c)},code);await host.waitForFunction(()=>__harness.online.bothPresent(),null,{timeout:10000});await host.evaluate(()=>__harness.online.hostStartMatch('luffy','goku',null));await join.waitForFunction(()=>__harness.online.isActive(),null,{timeout:10000})
 await Promise.all([host.evaluate(()=>__harness.skipToBattle()),join.evaluate(()=>__harness.skipToBattle())]);await frames(host,8)
 check('LAN agrees on seed',(await host.evaluate(()=>__harness.online.seed()))===(await join.evaluate(()=>__harness.online.seed())))
 check('real network setup preserves host timing',(await join.evaluate(()=>__harness.juice.hitstopStyle())).effective==='classic')
 const hk=async(k,n)=>{await host.keyboard.down(k);await frames(host,n);await host.keyboard.up(k)}
 await hk('d',2);await frames(host,2);await hk('d',3);await frames(host,12)
 await hk('d',36);await hk('j',3);await frames(host,35);await hk('l',3);await frames(host,70)
 check('both LAN peers spawn actual Luffy',(await host.evaluate(()=>__harness.luffyTest.state().key))==='luffy'&&(await join.evaluate(()=>__harness.luffyTest.state().key))==='luffy')
 const samples=[[],[]];const probe=q=>q.evaluate(()=>({frame:__harness.net.frame(),a:__harness.luffyTest.state().state,x:__harness.p1().x,y:__harness.p1().y,energy:__harness.p1().energy,p1:__harness.p1().health,p2:__harness.p2().health}))
 for(let i=0;i<140;i++){const values=await Promise.all([probe(host),probe(join)]);values.forEach((v,i)=>samples[i].push(v));await new Promise(r=>setTimeout(r,16))}
 const map=new Map(samples[1].map(s=>[s.frame,s]));let shared=0,bad=0;for(const a of samples[0]){const b=map.get(a.frame);if(!b)continue;shared++;if(JSON.stringify(a)!==JSON.stringify(b))bad++}
 console.log('LAN_SHARED',shared,'MISMATCHED',bad);check('LAN compares actual shared frames',shared>=5);check('Luffy resources, position, serialized state and HP match across real peers',bad===0)
 check('no uncaught LAN browser errors',errors.length===0)
 console.log(`LUFFY LAN: ${passed} passed, 0 failed`)
}finally{if(relay)for(const client of relay.wss.clients)client.terminate();await browser.close();server.close();if(relay)await relay.close()}
