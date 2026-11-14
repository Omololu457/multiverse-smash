// harness/spd_green_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → Power Rangers → S.P.D. Green → skin → CPU pick → stage → match →
// moves in both facings (scan/mark, Acrobat, shot, phase step) → KO → victory → rematch. Screenshots → docs/spd_green/visual_*.png
//   node harness/spd_green_visual.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
import {spd_green as _DEF} from '../spdGreenData.js'
const HP=_DEF.stats.maxHealth   // roster-parity pass (2026-11-13): derived, not literal
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],log={};let pass=0,fail=0
page.on('pageerror',e=>errors.push(e.message))
const ck=(n,c,d='')=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n,d)}
const shot=n=>page.screenshot({path:`docs/spd_green/visual_${n}.png`})
const S=()=>page.evaluate(()=>__harness.state())
// Locate a rect-menu item by id with the virtual pad cursor, then click it with the REAL mouse (client coords).
async function click(re){const r=await page.evaluate(src=>{const re=new RegExp(src),cv=document.querySelector('canvas'),b=cv.getBoundingClientRect();__harness.padNav({down:true})
  for(const d of ['down','right','up','left'])for(let i=0;i<90;i++){const s=__harness.padMenuState();if(re.test(String(s.selId)))return {...s,cx:b.left+s.mouseX*b.width/cv.width,cy:b.top+s.mouseY*b.height/cv.height};__harness.padNav({[d]:true})}return null},re)
 if(!r)throw Error('menu item not found: '+re+' '+JSON.stringify(await page.evaluate(()=>__harness.padMenuState())));await page.mouse.move(r.cx,r.cy);await page.waitForTimeout(150);await page.mouse.click(r.cx,r.cy);await page.waitForTimeout(450);return r}
// Character cards carry no ids: walk the cursor, hover each card with the REAL mouse, read the hovered key.
async function findChar(key){const n=(await page.evaluate(()=>__harness.padMenuState())).count,seen=[]
 const path=[];for(let row=0;row<6;row++){for(let c=0;c<8;c++)path.push(row%2?'left':'right');path.push('down')}
 for(const dir of path){const r=await page.evaluate(dir=>{__harness.padNav({[dir]:true});const cv=document.querySelector('canvas'),b=cv.getBoundingClientRect(),s=__harness.padMenuState();return {...s,cx:b.left+s.mouseX*b.width/cv.width,cy:b.top+s.mouseY*b.height/cv.height}},dir)
  await page.mouse.move(r.cx,r.cy);await page.waitForTimeout(60);const d=await page.evaluate(()=>__harness.selectDetail());seen.push(d?.key);if(d?.key===key)return {...r,seen}}
 return {seen,missing:true}}
const ids=()=>page.evaluate(()=>{const out=[];const n=__harness.padMenuState().count;for(let i=0;i<n;i++){out.push(__harness.padMenuState().selId);__harness.padNav({right:true})}return out})
const G=()=>page.evaluate(()=>{const H=__harness.spdGreenTest;return {a:H.state(),b:H.state('p2')}})
try{
 await page.goto(server.base+'/index.html?harness=1',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.state);await page.waitForTimeout(900)
 await shot('01_title');await page.mouse.click(640,400);await page.waitForTimeout(500)
 await click('^play$');await click('^vs$');await click('^easy$')
 await page.mouse.move(1100,580);await page.mouse.wheel(0,640);await page.waitForTimeout(350);await shot('02_universes');await page.mouse.click(960,454);await page.waitForTimeout(600)
 const g=await findChar('spd_green');log.roster=g.seen;ck('Power Rangers roster lists spd_green (MMPR Green/Tommy untouched)',!g.missing,JSON.stringify(g.seen));await page.waitForTimeout(250)
 log.detail=await page.evaluate(()=>__harness.selectDetail());await shot('03_select_spd_green')
 ck(`select detail: S.P.D. Green Ranger, HP${HP}, kit type`,log.detail?.key==='spd_green'&&log.detail.stats.maxHealth===HP&&/Acrobatic Read/.test(log.detail.kitType||''),JSON.stringify(log.detail))
 // the hover already moved selection: click the card itself
 await page.mouse.click(g.cx,g.cy);await page.waitForTimeout(600)
 log.skinState=await page.evaluate(()=>__harness.padMenuState());await shot('04_skin_select')
 ck('skin select offers Default + 6 skins',log.skinState.gameState==='selectSkin'&&log.skinState.count>=7,JSON.stringify(log.skinState))
 // choose the 3rd entry (Upgrade — Inspired): move the virtual cursor to idx 2 then real click
 const sk=await page.evaluate(()=>{const cv=document.querySelector('canvas'),b=cv.getBoundingClientRect();for(let i=0;i<20&&__harness.padMenuState().idx!==2;i++)__harness.padNav({right:true});const s=__harness.padMenuState();return {...s,cx:b.left+s.mouseX*b.width/cv.width,cy:b.top+s.mouseY*b.height/cv.height}})
 await page.mouse.move(sk.cx,sk.cy);await page.waitForTimeout(200);await shot('05_skin_hover');await page.mouse.click(sk.cx,sk.cy);await page.waitForTimeout(700)
 // CPU: Power Rangers → Krybot (default skin), same real path
 log.afterP1=await S();await page.mouse.move(1100,580);await page.mouse.wheel(0,640);await page.waitForTimeout(300);await page.mouse.click(960,454);await page.waitForTimeout(500)
 if((await S()).gameState==='selectCharacter'){const k=await findChar('krybot');await page.mouse.click(k.cx,k.cy);await page.waitForTimeout(500);if((await page.evaluate(()=>__harness.padMenuState())).gameState==='selectSkin')await click('.*')}
 await page.waitForTimeout(500);log.preStage=await page.evaluate(()=>__harness.padMenuState());await shot('06_stage_select')
 if(log.preStage.gameState==='selectStage')await click('.*')
 await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000});await page.waitForTimeout(700)
 let s=await G();log.match={p1:s.a.key,skin:s.a.skin,tag:s.a.tag,p2:s.b.key};await shot('07_match_start')
 ck('normal launch: SPD Green in a real match with the chosen skin',s.a.key==='spd_green'&&/upgrade/.test(s.a.skin||'')&&s.a.tag==='upgrade',JSON.stringify(log.match))
 // freeze the CPU so captures are of Bridge's moves (CPU set to stand still through the existing dummy behaviour)
 await page.evaluate(()=>__harness.setDummyBehavior?.('stand'))
 const place=(gap,flip)=>page.evaluate(([gap,flip])=>{const a=__harness.spdGreenTest.raw(),b=__harness.spdGreenTest.raw('p2');a.x=1300;b.x=flip?1300-gap:1300+gap;a.energy=100;a.health=a.maxHealth;b.health=b.maxHealth;b.vx=0;a.attacking=false;a.currentAttack=null;a.attackCooldown=0;a.hitstun=0;b.hitstun=0},[gap,flip])
 for(const flip of [false,true]){const f=flip?'L':'R',fw=flip?'a':'d'
  await place(260,flip);await page.waitForTimeout(250);await page.keyboard.press('p',{delay:80});await page.waitForTimeout(450);await shot(`08_${f}_aura_scan`);await page.waitForFunction(()=>!!__harness.spdGreenTest.raw()._spdGreen?.mark,null,{timeout:4000}).catch(()=>{})   // wait for the state, not a fixed sleep (headless load)
  s=await G();ck(`real-time scan marks the CPU (${f})`,s.a.marked,JSON.stringify(s.a.s?.mark));await shot(`09_${f}_marked`)
  await place(80,flip);await page.waitForTimeout(150);await page.keyboard.down(fw);await page.keyboard.press('l',{delay:80});await page.keyboard.up(fw);await page.waitForTimeout(260);await shot(`10_${f}_acrobat_handstand`);await page.waitForTimeout(700)
  await place(500,flip);await page.waitForTimeout(400);await page.keyboard.press('l',{delay:80});await page.waitForTimeout(290);await shot(`11_${f}_deltamax`);await page.waitForTimeout(700)
  await place(600,flip);await page.waitForTimeout(400);await page.keyboard.press(fw);await page.waitForTimeout(70);await page.keyboard.press(fw);await page.waitForTimeout(40);await shot(`12_${f}_phase_streak`);await page.waitForTimeout(600)
  s=await G();ck(`phase step fired in real time (${f})`,s.a.teleport?.count>=1,JSON.stringify(s.a.teleport))
  await place(70,flip);await page.waitForTimeout(250);await page.keyboard.down('s');await page.keyboard.press('l',{delay:80});await page.keyboard.up('s');await page.waitForTimeout(260);await shot(`13_${f}_rising_arc`);await page.waitForTimeout(900)
 }
 log.fps=await page.evaluate(async()=>{let n=0;const t0=performance.now();await new Promise(r=>{const tick=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(tick);else r()};requestAnimationFrame(tick)});return Math.round(n/((performance.now()-t0)/1000))})
 ck('page keeps animating (rAF fps sample, headless)',log.fps>=20,String(log.fps))
 // KO → victory → rematch
 for(let round=0;round<3;round++){
  if((await S()).gameState==='victory')break
  await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000})
  await page.evaluate(()=>{const a=__harness.spdGreenTest.raw(),b=__harness.spdGreenTest.raw('p2');a.health=a.maxHealth;a.hitstun=0;a.hitstop=0;a.attackCooldown=0;a.attacking=false;a.currentAttack=null;a.vx=0;b.health=1;b.x=a.x+78;b.y=a.y;b.vx=0;b.vy=0;b.onGround=true;b.invulnTimer=0;b.hitstun=120;b.isBlocking=false;b.attacking=false;b.currentAttack=null;b._forceGuard=false})
  await page.keyboard.down('j');await page.waitForTimeout(180);await page.keyboard.up('j');await page.waitForTimeout(1500);await shot(`14_ko_${round}`)
  await page.waitForFunction(()=>__harness.state().gameState==='victory'||(__harness.state().gameState==='battle'&&__harness.spdGreenTest.raw('p2').health>1),null,{timeout:45000})
 }
 ck('victory screen reached',(await S()).gameState==='victory');await page.waitForTimeout(900);await shot('15_victory')
 await page.keyboard.press('r',{delay:80});await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:30000});await page.waitForTimeout(500)
 s=await G();await shot('16_rematch');ck('rematch: SPD Green, same skin, fresh state',s.a.key==='spd_green'&&s.a.tag==='upgrade'&&!s.a.s?.mark&&s.a.hp===HP,JSON.stringify({tag:s.a.tag,hp:s.a.hp,mark:s.a.s?.mark}))
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{log.passes=pass;log.failures=fail;log.errors=errors;fs.writeFileSync('docs/spd_green/visual_results.json',JSON.stringify(log,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
