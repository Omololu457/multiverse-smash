import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import { balHpMult } from '../rosterBalance.js'
const HP=Math.round(1250*balHpMult('mr_incredible'))   // 1250 design HP × his roster balance row (2026-11-25)
const browser=await chromium.launch({headless:true}), page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],results={damage:[],checks:[]}
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
const check=(name,value)=>{results.checks.push({name,pass:!!value});console.log(value?'PASS':'FAIL',name);assert(value,name)}
try{
 await page.goto('http://localhost:8000/index.html?harness=1&p1=mr_incredible&p2=mr_incredible&seed=3517');await page.waitForFunction(()=>window.__harness?.mrIncredibleTest)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone());await page.waitForFunction(()=>__harness.spriteReady().ready);await page.waitForTimeout(1500)
 const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n),state=()=>page.evaluate(()=>__harness.mrIncredibleTest.state())
 const setup=async(prime=false,gap=65)=>page.evaluate(([prime,gap])=>{
  const H=__harness.mrIncredibleTest;H.reset();__harness.setDummyBehavior('stand');__harness.setRoundTimer(99999)
  const a=H.raw(),b=H.raw('p2');for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.onGround=f.grounded=true;f.y=400;f.groundY=500;f.hitstun=f.blockstun=f.hitstop=0;f.invulnTimer=0;f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0;f.knockdownState=false;f.isGrabbed=false;f.isBlocking=false;f._forceGuard=false;f.comboCounter=0;f.comboTimer=0;f.juggleCount=0;f.jumpCount=0;f.jumpHeld=false;f.dashTimer=f.dashCooldown=0}
  a.x=1300;b.x=1300+gap;a.facing=1;b.facing=-1
  if(prime){H.activate();__harness.luffyTest.step(24)}
 },[prime,gap])
 const tap=async keys=>{await step(1);for(const k of keys)await page.keyboard.down(k);await step(1);for(const k of keys)await page.keyboard.up(k)}
 check(`one fighter / ${HP} HP (1250 × balance) / normal double jump`,(await state()).maxHp===HP&&(await state()).maxJumps===2)
 // Live melee path for every authored attack, isolated clean opponent.
 for(const prime of [false,true])for(const key of ['light','miLight2','miFinish','heavy','miLow','up','air','down_air','miForward','miDownHeavy','miImpact','miRush','miRise','miSlam','miSpin','miGrab','miLift']){
  await setup(prime,key==='miRush'?125:65)
  const r=await page.evaluate(key=>{const H=__harness.mrIncredibleTest,a=H.raw(),b=H.raw('p2');if(['air','down_air'].includes(key)){a.y-=35;a.onGround=a.grounded=false;a.vy=0}const hp=b.health,e=a.energy,res=a._mrIncredible?.reserve||0;const started=H.move(key),snap=a.currentAttack?JSON.parse(JSON.stringify(a.currentAttack)):null;const hits=[];let old=hp
   for(let i=0;i<150;i++){__harness.aiVsAi.step(1);if(b.health<old)hits.push({tick:i,damage:old-b.health,stun:b.hitstun});old=b.health}
   return {key,prime:!!snap?.mr?.prime,started,raw:snap?.damage,total:snap?.total,recovery:snap?.mr?.recovery,damage:hp-b.health,hits,cost:snap?.mr?.prime?res-a._mrIncredible.reserve:Math.round((e-a.energy)*100)/100}
  },key);results.damage.push(r);check(`${prime?'prime':'veteran'} ${key} starts`,r.started);check(`${prime?'prime':'veteran'} ${key} single budget`,r.hits.length<=1);check(`${prime?'prime':'veteran'} ${key} connects`,r.damage>0)
 }
 await setup();await tap(['j']);await step(5);check('fresh Square starts actual light',(await state()).attack?.name==='light');await page.keyboard.down('j');await step(80);await page.keyboard.up('j');check('holding Square cannot loop chain',!(await state()).attack)
 await setup();await tap(['u']);let s=await state();check('R2 activates without heal',s.s.remaining===900&&s.hp===HP&&s.energy===0);await page.keyboard.down('u');await step(70);check('held R2 does not instantly cancel',(await state()).s.remaining>0);await page.keyboard.up('u');await step(1);await tap(['u']);check('fresh eligible R2 returns early',(await state()).s.remaining===0)
 for(const hp of [1,317,HP]){await setup();await page.evaluate(hp=>__harness.mrIncredibleTest.raw().health=hp,hp);await tap(['u']);check(`activation HP ${hp} unchanged`,(await state()).hp===hp)}
 await setup();await tap(['w']);await step(2);await tap(['w']);await step(1);s=await state();check('two fresh jumps consume both jumps',s.jumpCount===2);await tap(['u']);check('air activation retains jump count',(await state()).jumpCount===2);await step(30);const rise=await page.evaluate(()=>__harness.mrIncredibleTest.move('miRise'));check('one Rising Power available in air',rise);await step(2);await page.evaluate(()=>{const f=__harness.mrIncredibleTest.raw();f.attacking=false;f.currentAttack=null;f.attackCooldown=0});check('Rising Power cannot repeat in same airtime',!(await page.evaluate(()=>__harness.mrIncredibleTest.move('miRise'))))
 // Exact expiry, move snapshot and form boundary: artificial positioning/timer setup is explicit.
 for(const kind of ['idle','attack','hitstun','knockdown','grabbed']){
  await setup(true,400);await page.evaluate(kind=>{const H=__harness.mrIncredibleTest,a=H.raw();a._mrIncredible.remaining=2;if(kind==='attack')H.move('heavy');if(kind==='hitstun')a.hitstun=35;if(kind==='knockdown'){a.knockdownState='down';a.knockdownTimer=35}if(kind==='grabbed'){a.isGrabbed=true;a.grabTimer=50}},kind);await step(2);s=await state();check(`expiry ends bonus in ${kind}`,s.s.remaining===0);if(kind==='attack')check('expiry retains started move raw130',s.attack?.damage===130);await step(95);check(`bounded visual return in ${kind}`,(await state()).s.visual==='veteran')
 }
 await setup(true);await page.evaluate(()=>__harness.setSkin('p1','mi_cosmic'));await step(1);check('skin switch keeps prime stats/form',(await state()).s.remaining>0&&(await state()).skin==='mi_cosmic');await step(900);check('expiry preserves skin',(await state()).skin==='mi_cosmic'&&(await state()).s.visual==='veteran')
 // Paired assets decode and same gameplay for all skins / forms.
 const skins=await page.evaluate(async()=>{const {MR_SKINS,MR_FORM_SKINS}=await import('./mrIncredibleSkins.js');const out=[];for(const s of MR_SKINS){for(const form of ['veteran','prime']){const paths=[...new Set(Object.values(MR_FORM_SKINS[s.id][form]).map(a=>a.sheet))];for(const src of paths){const im=new Image();im.src=src;await im.decode()} }out.push(s.id)}return out});check('all eleven paired skins decode',skins.length===11)
 await setup(true);await step(5);await page.screenshot({path:'docs/mr_incredible/runtime_prime.png'});await step(900);await page.screenshot({path:'docs/mr_incredible/runtime_veteran.png'})
 check('no browser exceptions',errors.length===0)
}finally{fs.writeFileSync('docs/mr_incredible/runtime_results.json',JSON.stringify({...results,errors},null,2));await browser.close()}
