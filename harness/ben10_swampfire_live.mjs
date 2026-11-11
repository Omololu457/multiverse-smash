import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { chromium } from 'playwright'
import { serve,frames,start } from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']})
const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=new Set();let passed=0
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===404)missing.add(new URL(r.url()).pathname)})
const check=(name,fn)=>{assert(fn,name);passed++;console.log('PASS',name)}
const out=process.env.MS_TEST_OUTPUT||path.join(os.tmpdir(),'ms-ben10-visual');fs.mkdirSync(out,{recursive:true})
const detail=()=>p.evaluate(()=>__harness.ben10Details())
try {
 await p.goto(server.base+'/index.html?harness=1&p1=ben10&p2=goku',{waitUntil:'load'});await p.waitForFunction(()=>!!window.__harness)
 const roster=await p.evaluate(()=>__harness.gotoCharacterSelect('ben_10'));check('Ben is selectable',roster.includes('ben10'));await start(p,{experimental:false,p1Aliens:['swampfire']})
 check('production loadout is Swampfire only',JSON.stringify((await detail()).loadout)==='["swampfire"]')
 const picker=await p.evaluate(()=>__harness.benLoadout().picker);check('production picker is approved only',JSON.stringify(picker)==='["swampfire"]')
 await p.screenshot({path:path.join(out,'01-human.png')});await p.evaluate(()=>__harness.ben10SetPower('p1',100))
 await p.keyboard.down('s');await frames(p,2);await p.keyboard.up('s');await frames(p,4);await p.keyboard.down('s');await frames(p,2);await p.keyboard.up('s');await frames(p,2);await p.keyboard.down('j');await frames(p,3);await p.keyboard.up('j');await frames(p,45)
 let d=await detail();check('real Down Down + Light transforms to Swampfire',d.form==='swampfire');check('actual Swampfire idle sheet selected',d.sheet?.includes('ben10_swampfire_idle'))
 check('human modifier applied once',d.speed===9*.92);await frames(p,10);await p.screenshot({path:path.join(out,'02-swampfire.png')})
 for(const action of ['idle','walk','run','jump','light','heavy','up','air','down_air','guard','hurt','knockdown','getup','transform','win','lose','roll']){
  await p.evaluate(a=>__harness.benPose(a),action);await frames(p,3);const s=await p.evaluate(()=>__harness.p1());check('art ready '+action,s.spriteReady!==false);if(['guard','roll','heavy','lose'].includes(action))await p.screenshot({path:path.join(out,'pose-'+action+'.png')})
 }
 await p.evaluate(()=>__harness.benPose(null));const pos=await p.evaluate(()=>({a:__harness.p1(),b:__harness.p2()}));await p.evaluate(x=>__harness.setP1X(x),pos.b.x+200);await frames(p,3);check('left facing resolves',(await p.evaluate(()=>__harness.p1())).facing===-1);await p.screenshot({path:path.join(out,'03-left-facing.png')});await p.evaluate(x=>__harness.setP1X(x),pos.b.x-300);await frames(p,3)
 const before=await p.evaluate(()=>__harness.p1().x);await p.keyboard.down('a');await frames(p,8);await p.keyboard.up('a');const after=await p.evaluate(()=>__harness.p1().x);check('Swampfire moves with keyboard',after<before)
 await p.keyboard.down('j');await frames(p,2);await p.keyboard.up('j');await frames(p,2);check('normal starts on real keyboard',(await p.evaluate(()=>__harness.p1())).attacking);await frames(p,30)
 await p.keyboard.down(';');await frames(p,3);check('block uses guard action',(await p.evaluate(()=>__harness.spriteAction('p1')))==='guard');await p.keyboard.down('k');await frames(p,2);await p.keyboard.up('k');await p.keyboard.up(';');check('Energy Guard opens from real block+Heavy',(await detail()).guard>0)
 await p.evaluate(()=>__harness.ben10Damage(100));let r0=await detail();check('actual HP damage becomes recoverable',r0.regrowth.pool>0);const hp=await p.evaluate(()=>__harness.p1().health);await frames(p,150);check('Regrowth restores HP after waiting',(await p.evaluate(()=>__harness.p1().health))>hp);await p.screenshot({path:path.join(out,'04-regrowth.png')})
 // Exercise every special/ultimate through actual keys and load the real FX, not just body poses.
 await p.evaluate(()=>{window.__sfSounds=[];const s=__harness.__sound;const original=s.playBen10.bind(s);s.playBen10=(id,...a)=>{window.__sfSounds.push(id);return original(id,...a)}})
 for(const [direction,cue,total] of [['N','sf_flame',57],['D','sf_vine',73],['F','sf_dash',50],['ULT','sf_inferno',161]]){
  await p.evaluate(()=>{__harness.ben10Reset('training');__harness.benForm('swampfire')});await frames(p,3)
  await p.evaluate(v=>__harness.ben10SetPower('p1',v),direction==='ULT'?51:100)
  // One Power margin permits the real input frame's idle drain; exact-50 is covered in the pipeline test.
  let held=direction==='D'?'s':direction==='F'?((await p.evaluate(()=>__harness.p1())).facing===1?'d':'a'):null
  if(held)await p.keyboard.down(held)
  const attack=direction==='ULT'?'u':'l';await p.keyboard.down(attack);await frames(p,2);await p.keyboard.up(attack);if(held)await p.keyboard.up(held)
  check('actual cast starts '+direction,(await detail()).attackCooldown>0)
  if(direction==='ULT'){await frames(p,61);await p.screenshot({path:path.join(out,'inferno-explosion.png')});await frames(p,total-61+5)}else await frames(p,total+5)
  check('synthesized cue routed '+direction,await p.evaluate(id=>window.__sfSounds.includes(id),cue))
 }
 await p.evaluate(()=>__harness.ben10Reset('training'));check('training reset is clean human/device',(await detail()).form===null&&(await detail()).guard===0&&(await detail()).guardCd===0)
 for(const [skin,speed,jump]of [['default',9,-19],['ben10Classic',9.7,-20],['ben10Prime',8.6,-18]]){await start(p,{experimental:true,p1Skin:skin,p1Aliens:['swampfire']});d=await detail();check('human variant live '+skin,d.speed===speed&&d.jump===jump);const expectedSheet=skin==='ben10Classic'?'ben10_idle_uniform__classic.png':'ben10_idle_uniform.png';check('human art variant '+skin,(await p.evaluate(()=>__harness.p1())).spriteSheet?.endsWith(expectedSheet));await p.evaluate(()=>{__harness.benForm('swampfire');__harness.ben10Reset('rematch')});await frames(p,4);d=await detail();check('rematch variant restored '+skin,d.form===null&&d.speed===speed&&d.jump===jump&&d.guard===0);check('human art restored '+skin,(await p.evaluate(()=>__harness.p1())).spriteSheet?.endsWith(expectedSheet))}
 // Verify preset persistence through the real settings singleton; weather source must stay optional.
 const settings=await p.evaluate(async()=>{const{juiceSettings:j}=await import('./juiceSettings.js?v='+__ASSET_V);j.setWeatherSource('off');j.applyGraphicsPreset('low');j.setPerfOverlay(true);return{preset:j.detectGraphicsPreset(),source:j.weatherSource,battle:j.battleDamage,overlay:j.perfOverlay}});check('combined Low preset and weather source',settings.preset==='low'&&settings.source==='off'&&settings.battle==='off')
 await p.reload();await p.waitForFunction(()=>!!window.__harness);const persisted=await p.evaluate(async()=>{const{juiceSettings:j}=await import('./juiceSettings.js?v='+__ASSET_V);return{preset:j.detectGraphicsPreset(),source:j.weatherSource,overlay:j.perfOverlay}});check('settings persist across reload',persisted.preset==='low'&&persisted.source==='off'&&persisted.overlay)
 // Real overlay key versus training weather modifier: no F8 collision.
 await start(p,{experimental:false,p1Aliens:['swampfire']});await p.keyboard.press('F8');await frames(p,2)
 check('F8 toggles only the persisted performance overlay',!(await p.evaluate(async()=>{const{juiceSettings:j}=await import('./juiceSettings.js?v='+__ASSET_V);return j.perfOverlay})))
 await p.keyboard.down('Shift');await p.keyboard.down('F8');await frames(p,2);await p.keyboard.up('F8');await p.keyboard.up('Shift');await frames(p,2)
 check('Shift+F8 cycles optional training weather',await p.evaluate(()=>__harness.juice.weather().setting))
 check('Shift+F8 does not toggle performance overlay',!(await p.evaluate(async()=>{const{juiceSettings:j}=await import('./juiceSettings.js?v='+__ASSET_V);return j.perfOverlay})))
 await p.evaluate(async()=>{const{juiceSettings:j}=await import('./juiceSettings.js?v='+__ASSET_V);j.setWeatherSource('off')})
 await start(p,{mode:'pvp',experimental:false,p1Aliens:['swampfire']});await p.evaluate(()=>{__harness.ben10SetPower('p1',100);__harness.ben10Morph('p1',0)});await frames(p,45);await p.evaluate(()=>__harness.ben10Defense('p1','guard'));await p.evaluate(()=>{__harness.juice.setSlowMo(false);__harness.setRoundWins(1,0);__harness.setHealth(0,'p2')});await p.waitForFunction(()=>__harness.matchFlow().victoryActive && __harness.state().gameState === "victory",null,{timeout:35000,polling:16});check('competitive KO reaches real victory',(await p.evaluate(()=>__harness.matchFlow())).winnerSide==='p1');await p.screenshot({path:path.join(out,'05-victory.png')});await p.keyboard.press('r');await p.waitForFunction(()=>!__harness.matchFlow().victoryActive,null,{timeout:10000});await frames(p,4);d=await detail();check('victory R rematch returns clean human',d.form===null&&d.guard===0&&d.guardCd===0)
 check('zero uncaught browser errors',errors.length===0);check('zero Swampfire asset failures',[...missing].every(x=>!x.includes('swampfire')));console.log('MISSING',JSON.stringify([...missing]));console.log('VISUAL_OUTPUT',out)
 console.log(`SWAMPFIRE LIVE: ${passed} passed, 0 failed`)
}finally{await browser.close();server.close()}
