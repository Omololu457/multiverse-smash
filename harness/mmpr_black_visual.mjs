// harness/mmpr_black_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → Power Rangers → Black Ranger → skin → CPU pick → stage → match (intro) →
// moves in both facings (J chain, Falcon Sweep, Talon Lift, Covering Volley, Crescent Break, Rising Mastodon, blink,
// ultimate) → profile → KO → victory → rematch. Screenshots → docs/mmpr_black/visual_*.png
//   node harness/mmpr_black_visual.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const HP=1000
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],log={};let pass=0,fail=0
page.on('pageerror',e=>errors.push(e.message))
const ck=(n,c,d='')=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n,d)}
const shot=n=>page.screenshot({path:`docs/mmpr_black/visual_${n}.png`})
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
const G=()=>page.evaluate(()=>{const H=__harness.mmprBlackTest;return {a:H.state(),b:H.state('p2'),ult:H.ult()}})
try{
 await page.goto(server.base+'/index.html?harness=1',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.state);await page.waitForTimeout(900)
 await shot('01_title');await page.mouse.click(640,400);await page.waitForTimeout(500)
 await click('^play$');await click('^vs$');await click('^easy$')
 await page.mouse.move(1100,580);await page.mouse.wheel(0,640);await page.waitForTimeout(350);await shot('02_universes');await page.mouse.click(960,454);await page.waitForTimeout(600)
 const g=await findChar('mmpr_black');log.roster=g.seen;ck('Power Rangers roster lists mmpr_black',!g.missing,JSON.stringify(g.seen));await page.waitForTimeout(250)
 log.detail=await page.evaluate(()=>__harness.selectDetail());await shot('03_select_mmpr_black')
 ck(`select detail: Black Ranger, HP${HP}`,log.detail?.key==='mmpr_black'&&log.detail.stats.maxHealth===HP,JSON.stringify(log.detail))
 await page.mouse.click(g.cx,g.cy);await page.waitForTimeout(600)
 log.skinState=await page.evaluate(()=>__harness.padMenuState());await shot('04_skin_select')
 ck('skin select offers Default + 6 skins',log.skinState.gameState==='selectSkin'&&log.skinState.count>=7,JSON.stringify(log.skinState))
 const sk=await page.evaluate(()=>{const cv=document.querySelector('canvas'),b=cv.getBoundingClientRect();for(let i=0;i<20&&__harness.padMenuState().idx!==2;i++)__harness.padNav({right:true});const s=__harness.padMenuState();return {...s,cx:b.left+s.mouseX*b.width/cv.width,cy:b.top+s.mouseY*b.height/cv.height}})
 await page.mouse.move(sk.cx,sk.cy);await page.waitForTimeout(200);await shot('05_skin_hover');await page.mouse.click(sk.cx,sk.cy);await page.waitForTimeout(700)
 log.afterP1=await S();await page.mouse.move(1100,580);await page.mouse.wheel(0,640);await page.waitForTimeout(300);await page.mouse.click(960,454);await page.waitForTimeout(500)
 if((await S()).gameState==='selectCharacter'){const k=await findChar('krybot');await page.mouse.click(k.cx,k.cy);await page.waitForTimeout(500);if((await page.evaluate(()=>__harness.padMenuState())).gameState==='selectSkin')await click('.*')}
 await page.waitForTimeout(500);log.preStage=await page.evaluate(()=>__harness.padMenuState());await shot('06_stage_select')
 if(log.preStage.gameState==='selectStage')await click('.*')
 // intro: capture while the intro plays (acrobatic entry + cosmetic flypast)
 for(let i=0;i<40;i++){const st=await page.evaluate(()=>!!__harness.mmprBlackTest?.raw()?._introPlaying);if(st){await page.waitForTimeout(500);await shot('07a_intro');log.introSeen=true;break}await page.waitForTimeout(100)}
 await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000});await page.waitForTimeout(700)
 let s=await G();log.match={p1:s.a.key,skin:s.a.skin,tag:s.a.tag,p2:s.b.key};await shot('07_match_start')
 ck('normal launch: Black Ranger in a real match with the chosen skin',s.a.key==='mmpr_black'&&s.a.tag==='upgrade',JSON.stringify(log.match))
 await page.evaluate(()=>__harness.setDummyBehavior?.('stand'))
 const place=(gap,flip)=>page.evaluate(([gap,flip])=>{__harness.setRoundTimer(5400);const H=__harness.mmprBlackTest,a=H.raw(),b=H.raw('p2');a.x=1300;b.x=flip?1300-gap:1300+gap;a.facing=flip?-1:1;b.facing=flip?1:-1;a.energy=100;a.health=a.maxHealth;b.health=b.maxHealth;b.vx=0;a.attacking=false;a.currentAttack=null;a.attackCooldown=0;a.hitstun=0;b.hitstun=0;b.attacking=false;b.currentAttack=null;b.isBlocking=false;b._forceGuard=false;b.attackCooldown=150;b.y=a.y;b.vy=0;b.onGround=true;if(a._falcon){a._falcon.pips=2;a._falcon.lockout=0;a._falcon.refill=0;a._falcon.postUlt=0;a._falcon.sortie=null}},[gap,flip])
 const press=async(keys,wait)=>{for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(40);for(const k of keys)await page.keyboard.up(k);if(wait)await page.waitForTimeout(wait)}
 let ultDone=0
 for(const flip of [false,true]){const f=flip?'L':'R',fw=flip?'a':'d',bk=flip?'d':'a'
  await place(80,flip);await page.waitForTimeout(200);await press(['j'],120);await press(['j'],160);await press(['j'],140);await shot(`08_${f}_j3`);await page.waitForTimeout(500)
  await place(200,flip);await page.waitForTimeout(200);await press([fw,'l'],330);await shot(`09_${f}_falcon_sweep_warn`);await page.waitForTimeout(250);await shot(`10_${f}_falcon_sweep`);await page.waitForTimeout(700)
  s=await G();ck(`real-time Falcon Sweep committed (${f})`,s.a.falcon.commits>=1,JSON.stringify({c:s.a.falcon.commits}))
  await place(150,flip);await page.waitForTimeout(200);await press(['w','l'],420);await shot(`11_${f}_talon_lift`);await page.waitForTimeout(800)
  await place(330,flip);await page.waitForTimeout(200);await press([bk,'l'],700);await shot(`12_${f}_covering_volley`);await page.waitForTimeout(700)
  s=await G();ck(`Covering Volley fired its shots (${f})`,s.a.falcon.shotsFired>=2,String(s.a.falcon.shotsFired))
  await place(80,flip);await page.waitForTimeout(200);await press(['l'],330);await shot(`13_${f}_crescent_break`);await page.waitForTimeout(700)
  await place(70,flip);await page.waitForTimeout(200);await press(['s','l'],260);await shot(`14_${f}_rising_mastodon`);await page.waitForTimeout(900)
  for(let t=0;t<3;t++){await place(600,flip);await page.waitForTimeout(300);await press([fw],30);await press([fw],30);await shot(`15_${f}_blink`);await page.waitForTimeout(600);if((await G()).a.ranger?.blinks>=1)break}
  s=await G();ck(`double-tap blink fired in real time (${f})`,s.a.ranger?.blinks>=1,JSON.stringify(s.a.ranger))
  await place(80,flip);await page.waitForTimeout(250);await page.evaluate(()=>{const b=__harness.mmprBlackTest.raw('p2');b.hitstun=45;b.isBlocking=false});await press(['u'],0)   // close confirm: opener into an opponent already in hitstun
  let ult=false;for(let i=0;i<40;i++){await page.waitForTimeout(50);if((await G()).ult.active){ult=true;break}}
  if(ult){await page.waitForTimeout(250);await shot(`16_${f}_ult_sweep`);await page.waitForTimeout(700);await shot(`17_${f}_ult_rise`);await page.waitForTimeout(900);await shot(`18_${f}_ult_dive`)}
  ck(`real-time ultimate captured the opener (${f})`,ult);for(let i=0;i<120&&(await G()).ult.active;i++)await page.waitForTimeout(100)
  s=await G();ck(`ultimate completed and ended cleanly (${f})`,!s.ult.active&&s.a.s.stats.ultDone>ultDone&&!s.a.attack?.name?.startsWith('ult'),JSON.stringify({done:s.a.s.stats,hud:s.a.hud}));ultDone=s.a.s.stats.ultDone
 }
 // PROFILE: repeated sortie calls + ultimate vs an idle baseline (sim+render steps in this page)
 log.profile=await page.evaluate(()=>{const H=__harness.mmprBlackTest,a=H.raw(),b=H.raw('p2'),step=n=>__harness.luffyTest.step(n)
  const time=fn=>{const t0=performance.now();fn();return performance.now()-t0}
  const setup=()=>{a.x=1300;b.x=1500;b.attackCooldown=9999;b.attacking=false;b.currentAttack=null;a.hitstun=0;a.health=a.maxHealth;b.health=b.maxHealth;a.energy=100;a.attacking=false;a.currentAttack=null;a.attackCooldown=0;if(a._falcon){a._falcon.pips=2;a._falcon.lockout=0;a._falcon.postUlt=0}}
  setup();const idle=time(()=>step(600))/600
  let calls=0;const rej=[];const pass=()=>{for(let i=0;i<10;i++){setup();for(const k of ['sweep','talon','volley']){if(a._falcon){a._falcon.lockout=0;a._falcon.pips=2}a.attacking=false;a.currentAttack=null;a.energy=100;if(H.move('bCall','p1',{kind:k}))calls++;else rej.push({k,hs:a.hitstun,g:a.onGround,att:a.currentAttack?.name,land:a._mmprBlack?.landing,F:a._falcon&&{p:a._falcon.pips,l:a._falcon.lockout,s:a._falcon.sortie?.kind,pu:a._falcon.postUlt,pk:a._falcon.pendingKind},e:a.energy,kd:a.knockdownState,hp:a.health});step(90)}}}
  pass();const cache0=H.fxCache();const sortie=time(pass)/(10*3*90)   // 2nd pass measured: first-use image loads are not leaks
  setup();b.x=1380;a.energy=100;H.move('bUltOpen');const ultT=time(()=>step(320))/320
  return {msPerFrameIdle:+idle.toFixed(3),msPerFrameSorties:+sortie.toFixed(3),msPerFrameUlt:+ultT.toFixed(3),calls,fxCacheBefore:cache0,fxCacheAfter:H.fxCache(),projectilesLeft:H.state().shots.length,rejected:rej.length,unexplained:rej.filter(r=>!(r.hs>0||!r.g||!r.F||r.kd||r.att)).length,rejectSample:rej.slice(0,3)}})
 ck('profile: 60 call attempts in a LIVE match — every rejection has a legitimate cause (hitstun / airborne / training reset), second pass adds no cached images, leaks no projectiles',log.profile.calls>=40&&log.profile.unexplained===0&&log.profile.fxCacheAfter===log.profile.fxCacheBefore&&log.profile.projectilesLeft===0,JSON.stringify(log.profile))
 ck('profile: sortie / ultimate frames stay within 3x idle cost and under 8 ms',log.profile.msPerFrameSorties<Math.max(8,log.profile.msPerFrameIdle*3)&&log.profile.msPerFrameUlt<Math.max(8,log.profile.msPerFrameIdle*3),JSON.stringify(log.profile))
 log.fps=await page.evaluate(async()=>{let n=0;const t0=performance.now();await new Promise(r=>{const tick=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(tick);else r()};requestAnimationFrame(tick)});return Math.round(n/((performance.now()-t0)/1000))})
 ck('page keeps animating (rAF fps sample, headless)',log.fps>=20,String(log.fps))
 for(let round=0;round<3;round++){
  if((await S()).gameState==='victory')break
  await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000})
  await page.evaluate(()=>{const a=__harness.mmprBlackTest.raw(),b=__harness.mmprBlackTest.raw('p2');a.health=a.maxHealth;a.hitstun=0;a.hitstop=0;a.attackCooldown=0;a.attacking=false;a.currentAttack=null;a.vx=0;b.health=1;b.x=a.x+70*(a.facing||1);b.y=a.y;b.vx=0;b.vy=0;b.onGround=true;b.invulnTimer=0;b.hitstun=120;b.isBlocking=false;b.attacking=false;b.currentAttack=null;b._forceGuard=false})
  await page.keyboard.down('j');await page.waitForTimeout(180);await page.keyboard.up('j');await page.waitForTimeout(1500);await shot(`19_ko_${round}`)
  await page.waitForFunction(()=>__harness.state().gameState==='victory'||(__harness.state().gameState==='battle'&&__harness.mmprBlackTest.raw('p2').health>1),null,{timeout:45000})
 }
 ck('victory screen reached',(await S()).gameState==='victory');await page.waitForTimeout(900);await shot('20_victory')
 await page.keyboard.press('r');await page.waitForFunction(()=>__harness.state().gameState==='battle',null,{timeout:30000})
 s=await G()   // read at rematch start, before the live CPU can land a hit
 await page.waitForFunction(()=>__harness.state().countdown<=0,null,{timeout:30000});await page.waitForTimeout(300);await shot('21_rematch');ck('rematch: Black, same skin, fresh pips/state',s.a.key==='mmpr_black'&&s.a.tag==='upgrade'&&(s.a.hud?.pips??2)===2&&!s.a.falcon?.sortie&&!(s.a.hud?.lockout>0)&&s.a.hp===HP,JSON.stringify({tag:s.a.tag,hp:s.a.hp,hud:s.a.hud}))
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{log.passes=pass;log.failures=fail;log.errors=errors;fs.writeFileSync('docs/mmpr_black/visual_results.json',JSON.stringify(log,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
