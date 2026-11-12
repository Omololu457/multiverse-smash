import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']})
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[]
const out='/tmp/ms-luffy-visual';fs.mkdirSync(out,{recursive:true})
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(new URL(r.url()).pathname)})
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
let passed=0;const check=(name,condition)=>{assert(condition,name);passed++;console.log('PASS',name)}
const state=(side='p1')=>page.evaluate(w=>__harness.luffyTest.state(w),side)
const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
const set=(side,values)=>page.evaluate(([w,v])=>__harness.luffyTest.set(w,v),[side,values])
const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png')})}
const reset=async(gap=80)=>{await page.evaluate(gap=>{__harness.luffyTest.clearPose();__harness.luffyTest.reset();__harness.setDummyBehavior('stand');const x=__harness.p1().x;__harness.luffyTest.set('p1',{x,energy:100});__harness.setP2X(x+gap)},gap);await step(1)}
async function tap(key){await page.keyboard.down(key);await step(1);await page.keyboard.up(key)}
async function until(pred,max=160){for(let i=0;i<max;i++){const s=await state();if(pred(s))return s;await step(1)}throw Error('condition timed out: '+JSON.stringify(await state()))}
try{
 await page.goto(server.base+'/index.html?harness=1&p1=luffy&p2=goku',{waitUntil:'load'});await page.waitForFunction(()=>!!window.__harness?.luffyTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(1)})
 await page.waitForFunction(()=>__harness.luffyTest.state().ready);await step(1)
 await page.evaluate(()=>{window.__luffySounds=[];const s=__harness.__sound,old=s.play.bind(s);s.play=id=>{window.__luffySounds.push(id);return old(id)}})
 let f=await state();check('actual spawn: Luffy, intended default scale, ordinary half starting Stamina',f.key==='luffy'&&Math.abs(f.spriteScale-2.3/1.18)<1e-8&&f.energy===50)
 const universes=await page.evaluate(()=>__harness.luffyTest.universes());const one=universes.find(u=>u.id==='one_piece')
 check('actual One Piece selection title and count',one?.name==='One Piece'&&one.count===1)
 check('universe ordering uses display title',universes.every((u,i)=>i===0||universes[i-1].name.localeCompare(u.name)<=0))
 check('real selection filter includes Luffy',await page.evaluate(()=>__harness.gotoCharacterSelect('one_piece').includes('luffy')))
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle()});await step(2);await shot('00-idle')
 await reset();await page.keyboard.down('j');await step(70);await page.keyboard.up('j');f=await state();check('held keyboard Light only one instance/pip',f.state.serial===1&&f.state.pips===1)
 await reset();await tap('j');await until(s=>s.attack?.lfConfirmed&&s.phase==='recovery');await tap('j');check('real fresh Light retap J2',(await state()).attack?.name==='lfJ2')
 await until(s=>s.attack?.lfConfirmed&&s.phase==='recovery');await tap('j');check('real fresh Light retap J3',(await state()).attack?.name==='lfJ3');await shot('01-light-chain')
 const cases=[['heavy','k',null,'heavy',14],['sweep','j','s','lfLow',8],['launcher','i',null,'up',12],['piston','l',null,'lfPiston',13],['reel','l','d','lfReel',18],['pinwheel','l','s','lfPinwheel',20],['brace','l','a','lfBrace',14],['ultimate','u',null,'lfFinale',44]]
 for(const[name,key,dir,move,time]of cases){
  await reset(name==='piston'||name==='reel'?220:80)
  if(dir)await page.keyboard.down(dir);await tap(key);if(dir)await page.keyboard.up(dir)
  check('actual directional/input dispatch '+name,(await state()).attack?.name===move)
  await until(s=>s.attack&&s.attack.total-s.attack.timer>=time,180)
  await shot('attack-'+name)
  const s=await state();check('sprite and active simulation move agree '+name,s.spriteAction===move)
  if(name==='piston')check('long render canvas does not expand body hurtbox',s.body.w===48&&s.hitbox.w===230)
  await until(s=>!s.attack,280)
 }
 await reset();await page.evaluate(()=>__harness.luffyTest.resources('p1',2));await tap('l');await until(s=>s.attack?.lfConfirmed);await tap('l');await until(s=>s.attack?.name==='lfSnap');check('real Special fresh retap activates paid Snapback',(await state()).state.pips===1);await shot('snapback');await step(1) // cue is consumed on the following simulation tick
 // Walk and jump use real movement; report measured displacement and apex.
 await reset(700);const startX=(await state()).x;await page.keyboard.down('d');await step(30);await page.keyboard.up('d');const dx=(await state()).x-startX
 check('walk displacement slightly above ordinary brawler',dx>170&&dx<210);await shot('movement')
 await reset(700);const baseY=(await state()).y;await tap('w');let apex=baseY
 for(let i=0;i<90;i++){apex=Math.min(apex,(await state()).y);await step(1)}
 console.log('MEASURE movement',JSON.stringify({walk30:dx,jumpHeight:baseY-apex}))
 check('moderate-high single jump returns to a genuine floor',(await state()).onGround&&baseY-apex>250)
 await reset(700);await tap('w');await tap('j');check('air normal dispatch',(await state()).attack?.name==='air');await step(8);await shot('air-heel')
 await until(s=>!s.attack);await page.keyboard.down('s');await tap('l');await page.keyboard.up('s');check('air Down Special dispatch',(await state()).attack?.name==='lfAnchor');await step(14);await shot('anchor-heel');await until(s=>s.attack?.name==='land');check('Anchor enforces explicit landing recovery',(await state()).attack.timer>=20);await shot('landing')
 // Command retaps, including the Up+Heavy launcher branch.
 await reset(80);await page.keyboard.down('d');await tap('k');await page.keyboard.up('d');await until(s=>s.attack?.lfConfirmed&&s.phase==='recovery');await tap('k');check('command second fresh Heavy',(await state()).attack?.name==='lfCmd2')
 await until(s=>s.attack?.lfConfirmed&&s.phase==='recovery');await page.keyboard.down('w');await tap('k');await page.keyboard.up('w');check('confirmed Up+Heavy branch uses standard launcher',(await state()).attack?.name==='up');await shot('command-launcher')
 // Both facing directions and supplied defensive/reaction/recovery/victory art.
 for(const[action,face]of [['idle',-1],['guard',1],['guard_hit',-1],['hurt',1],['hurt_heavy',-1],['hurt_air',1],['knockdown',-1],['getup',1],['win',1],['lose',-1]]){
  await reset(400);await set('p1',{facing:face});await page.evaluate(a=>__harness.luffyTest.pose('p1',a),action);await page.waitForTimeout(30);await page.evaluate(a=>__harness.luffyTest.pose('p1',a),action);await shot('pose-'+action)
 }
 await page.evaluate(()=>__harness.luffyTest.clearPose())
 // Controller mapping is the shared standard Gamepad API, including no held auto-chain.
 await reset();await page.evaluate(()=>{
  window.__luffyPad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}
  navigator.getGamepads=()=>[window.__luffyPad];window.dispatchEvent(new Event('gamepadconnected'));__harness.setInputType(1,'controller')
 })
 await page.evaluate(()=>window.__luffyPad.buttons[2]={pressed:true,value:1});await step(70);await page.evaluate(()=>window.__luffyPad.buttons[2]={pressed:false,value:0});await step(1)
 check('controller held Square is one normal instance',(await state()).state.serial===1)
 await reset();await page.evaluate(()=>window.__luffyPad.buttons[5]={pressed:true,value:1});await step(1);check('controller R1 is logical Special',(await state()).attack?.name==='lfPiston')
 await page.evaluate(()=>{window.__luffyPad.buttons[5]={pressed:false,value:0};__harness.setInputType(1,'keyboard');navigator.getGamepads=()=>[]})
 check('distinct synthesized stretch/inflate/snap/ultimate cues',await page.evaluate(()=>['luffy_stretch','luffy_inflate','luffy_snap','luffy_finale'].every(id=>window.__luffySounds.includes(id))))
 check('no Luffy assets missing',!missing.some(x=>x.includes('/luffy/')))
 check('no uncaught browser errors',errors.length===0)
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed,errors,missing,dx,jumpHeight:baseY-apex},null,2))
 console.log(`LUFFY LIVE: ${passed} passed, 0 failed`)
}finally{await browser.close();server.close()}
