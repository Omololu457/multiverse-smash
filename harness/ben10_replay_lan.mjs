import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { startLanServer } from '../net/lanServer.mjs'
import { serve,frames,start } from './ben10_test_utils.mjs'
const server=await serve(), browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']})
let passed=0;const errors=[];const check=(n,c)=>{assert(c,n);passed++;console.log('PASS',n)}
const open=async(query='')=>{const p=await browser.newPage({viewport:{width:1280,height:720}});p.on('pageerror',e=>errors.push(e.message));await p.goto(server.base+'/index.html?harness=1&p1=ben10&p2=goku'+query);await p.waitForFunction(()=>!!window.__harness);return p}
let relay
try{
 const p=await open()
 await p.evaluate(()=>{__harness.rng.forceSeed(424242);__harness.juice.setSlowMo(false);__harness.juice.setHitstopStyle('classic');__harness.start({mode:'pvp',experimental:false,p1Aliens:['swampfire']})});await frames(p,4);await p.evaluate(()=>__harness.skipToBattle());await frames(p,4)
 const key=async(k,n)=>{await p.keyboard.down(k);await frames(p,n);await p.keyboard.up(k)}
 await key('s',2);await frames(p,4);await key('s',2);await frames(p,2);await key('j',3);await frames(p,45)
 check('replay segment really transforms', (await p.evaluate(()=>__harness.ben10Details())).form==='swampfire')
 await key('p',65);await key('d',38);await key('l',3);await frames(p,65)
 // Real P2 controls, recorded through the existing raw masks: approach and hit Ben.
 await key('ArrowLeft',14);await key('1',3);await frames(p,35);await key('2',3);await frames(p,160)
 const rec=await p.evaluate(()=>__harness.replay.stopAndGet());check('Ben replay has real input/state checkpoints',rec?.states?.length>=5&&rec.frames.length>5)
 check('replay preserves policy, loadout and timing',rec.benExperimental===false&&rec.p1Aliens[0]==='swampfire'&&rec.hitstopStyle==='classic'&&rec.slowMo===false)
 check('checkpoints include serialized Ben device state',rec.states.some(s=>s.a.length===5&&JSON.parse(s.a[4]).device))
 // Change local preferences to prove playback uses the recording's authoritative timing.
 await p.evaluate(()=>{__harness.juice.setHitstopStyle('scaled');__harness.juice.setSlowMo(true)})
 const result=await p.evaluate(r=>__harness.replay.play(r),rec);check('Ben replay accepted',result.ok)
 await p.evaluate(()=>__harness.skipToBattle());await p.waitForFunction(n=>__harness.replay.frame()>=n,rec.frameCount+2,{timeout:30000})
 const playback=await p.evaluate(()=>__harness.replay.playbackState());console.log('REPLAY_STATE',JSON.stringify(playback));check('Ben replay has zero checkpoint divergence',playback?.desyncFrame==null&&playback.checks>=5&&playback.checks===playback.matched)
 await p.close()
 relay=startLanServer({port:0,relay:true,log:()=>{}});await new Promise(r=>relay.wss.once('listening',r));const url=`ws://127.0.0.1:${relay.wss.address().port}`
 const host=await open('&relay='+encodeURIComponent(url)),join=await open('&relay='+encodeURIComponent(url))
 await host.evaluate(()=>{__harness.juice.setHitstopStyle('classic');__harness.juice.setSlowMo(false);__harness.online.hostStart()});await host.waitForFunction(()=>['waiting','ready'].includes(__harness.online.status()),null,{timeout:10000})
 await host.waitForFunction(()=>!!__harness.online.hostCode(),null,{timeout:10000});const code=await host.evaluate(()=>__harness.online.hostCode());await join.evaluate(c=>{__harness.juice.setHitstopStyle('scaled');__harness.online.join(c)},code);await host.waitForFunction(()=>__harness.online.bothPresent(),null,{timeout:10000});await host.evaluate(()=>__harness.online.hostStartMatch('ben10','goku',null));await join.waitForFunction(()=>__harness.online.isActive(),null,{timeout:10000})
 await Promise.all([host.evaluate(()=>__harness.skipToBattle()),join.evaluate(()=>__harness.skipToBattle())]);await frames(host,8)
 check('LAN agrees on seed',(await host.evaluate(()=>__harness.online.seed()))===(await join.evaluate(()=>__harness.online.seed())))
 check('real network setup preserves host timing',(await join.evaluate(()=>__harness.juice.hitstopStyle())).effective==='classic')
 const hk=async(k,n)=>{await host.keyboard.down(k);await frames(host,n);await host.keyboard.up(k)}
 await hk('s',2);await frames(host,4);await hk('s',2);await frames(host,2);await hk('j',3);await frames(host,48)
 check('both LAN peers transform to actual Swampfire',(await host.evaluate(()=>__harness.ben10Details())).form==='swampfire'&&(await join.evaluate(()=>__harness.ben10Details())).form==='swampfire')
 await hk('p',25);await hk('d',15);await hk('l',3);await frames(host,60)
 const samples=[[],[]];const probe=q=>q.evaluate(()=>({frame:__harness.net.frame(),a:__harness.ben10Details(),p1:__harness.p1().health,p2:__harness.p2().health}))
 for(let i=0;i<140;i++){const values=await Promise.all([probe(host),probe(join)]);values.forEach((v,i)=>samples[i].push(v));await new Promise(r=>setTimeout(r,16))}
 const map=new Map(samples[1].map(s=>[s.frame,s]));let shared=0,bad=0;for(const a of samples[0]){const b=map.get(a.frame);if(!b)continue;shared++;if(JSON.stringify(a)!==JSON.stringify(b))bad++}
 console.log('LAN_SHARED',shared,'MISMATCHED',bad);check('LAN compares actual shared frames',shared>=5);check('Ben/Swampfire state and HP match across real peers',bad===0)
 check('no uncaught replay/LAN browser errors',errors.length===0)
 console.log(`BEN REPLAY/LAN: ${passed} passed, 0 failed`)
}finally{await browser.close();server.close();if(relay)await relay.close()}
