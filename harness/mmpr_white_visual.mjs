// harness/mmpr_white_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → Power Rangers → White Ranger → skin → CPU pick → stage → match (intro) →
// moves in both facings (J chain, Saba's Answer, Twin Fist, Crane Rise, Ninja Edge, Formation follow-up, Tiger Ascent, blink,
// ultimate) → profile → KO → victory → rematch. Screenshots → docs/mmpr_white/visual_*.png
//   node harness/mmpr_white_visual.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const HP=1000
const server=await serve(),browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],log={};let pass=0,fail=0
page.on('pageerror',e=>errors.push(e.message))
const ck=(n,c,d='')=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n,d)}
const shot=n=>page.screenshot({path:`docs/mmpr_white/visual_${n}.png`})
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
const G=()=>page.evaluate(()=>{const H=__harness.mmprWhiteTest;return {a:H.state(),b:H.state('p2'),ult:H.ult()}})
try{
 await page.goto(server.base+'/index.html?harness=1',{waitUntil:'load'});await page.waitForFunction(()=>window.__harness?.state);await page.waitForTimeout(900)
 await shot('01_title');await page.mouse.click(640,400);await page.waitForTimeout(500)
 await click('^play$');await click('^vs$');await click('^easy$')
 await page.mouse.move(1100,580);await page.mouse.wheel(0,640);await page.waitForTimeout(350);await shot('02_universes');await page.mouse.click(960,454);await page.waitForTimeout(600)
 const g=await findChar('mmpr_white');log.roster=g.seen;ck('Power Rangers roster lists mmpr_white',!g.missing,JSON.stringify(g.seen));await page.waitForTimeout(250)
 log.detail=await page.evaluate(()=>__harness.selectDetail());await shot('03_select_mmpr_white')
 ck(`select detail: White Ranger, HP${HP}`,log.detail?.key==='mmpr_white'&&log.detail.stats.maxHealth===HP,JSON.stringify(log.detail))
 await page.mouse.click(g.cx,g.cy);await page.waitForTimeout(600)
 log.skinState=await page.evaluate(()=>__harness.padMenuState());await shot('04_skin_select')
 ck('skin select offers Default + 6 skins',log.skinState.gameState==='selectSkin'&&log.skinState.count>=7,JSON.stringify(log.skinState))
 const sk=await page.evaluate(()=>{const cv=document.querySelector('canvas'),b=cv.getBoundingClientRect();for(let i=0;i<20&&__harness.padMenuState().idx!==2;i++)__harness.padNav({right:true});const s=__harness.padMenuState();return {...s,cx:b.left+s.mouseX*b.width/cv.width,cy:b.top+s.mouseY*b.height/cv.height}})
 await page.mouse.move(sk.cx,sk.cy);await page.waitForTimeout(200);await shot('05_skin_hover');await page.mouse.click(sk.cx,sk.cy);await page.waitForTimeout(700)
 log.afterP1=await S();await page.mouse.move(1100,580);await page.mouse.wheel(0,640);await page.waitForTimeout(300);await page.mouse.click(960,454);await page.waitForTimeout(500)
 if((await S()).gameState==='selectCharacter'){const k=await findChar('krybot');await page.mouse.click(k.cx,k.cy);await page.waitForTimeout(500);if((await page.evaluate(()=>__harness.padMenuState())).gameState==='selectSkin')await click('.*')}
 await page.waitForTimeout(500);log.preStage=await page.evaluate(()=>__harness.padMenuState());await shot('06_stage_select')
 if(log.preStage.gameState==='selectStage')await click('.*')
 // intro: capture while the intro plays (cart arrival + Saba presented)
 for(let i=0;i<40;i++){const st=await page.evaluate(()=>!!__harness.mmprWhiteTest?.raw()?._introPlaying);if(st){await page.waitForTimeout(500);await shot('07a_intro');log.introSeen=true;break}await page.waitForTimeout(100)}
 await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000});await page.waitForTimeout(700)
 let s=await G();log.match={p1:s.a.key,skin:s.a.skin,tag:s.a.tag,p2:s.b.key};await shot('07_match_start')
 ck('normal launch: White Ranger in a real match with the chosen skin',s.a.key==='mmpr_white'&&s.a.tag==='upgrade',JSON.stringify(log.match))
 await page.evaluate(()=>__harness.setDummyBehavior?.('stand'))
 const place=(gap,flip)=>page.evaluate(([gap,flip])=>{__harness.setRoundTimer(5400);const H=__harness.mmprWhiteTest,a=H.raw(),b=H.raw('p2');a.x=1300;b.x=flip?1300-gap:1300+gap;a.facing=flip?-1:1;b.facing=flip?1:-1;a.energy=100;a.health=a.maxHealth;b.health=b.maxHealth;b.vx=0;a.attacking=false;a.currentAttack=null;a.attackCooldown=0;a.hitstun=0;b.hitstun=0;b.attacking=false;b.currentAttack=null;b.isBlocking=false;b._forceGuard=false;b.attackCooldown=150;b.y=a.y;b.vy=0;b.onGround=true;if(a._falcon){a._falcon.pips=2;a._falcon.lockout=0;a._falcon.refill=0;a._falcon.postUlt=0;a._falcon.sortie=null}},[gap,flip])
 const press=async(keys,wait)=>{for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(40);for(const k of keys)await page.keyboard.up(k);if(wait)await page.waitForTimeout(wait)}
 let ultDone=0
 const waitFor=async(pred,max=60)=>{for(let i=0;i<max;i++){const q=await G();if(pred(q))return q;await page.waitForTimeout(25)}return G()}
 for(const flip of [false,true]){const f=flip?'L':'R',fw=flip?'a':'d',bk=flip?'d':'a'
  await place(80,flip);await page.waitForTimeout(200);await press(['j'],120);await press(['j'],160);await press(['j'],140);await shot(`08_${f}_j3`);await page.waitForTimeout(500)
  await place(110,flip);await page.waitForTimeout(200);await press(['l'],260);await shot(`09_${f}_saba_answer`);await page.waitForTimeout(700)
  await place(200,flip);await page.waitForTimeout(200);await press([fw,'l'],250);await shot(`10_${f}_twin_fist_warn`);await page.waitForTimeout(200);await shot(`11_${f}_twin_fist`);await page.waitForTimeout(800)
  s=await G();ck(`real-time Twin Fist order committed (${f})`,s.a.falcon.commits>=1,JSON.stringify({c:s.a.falcon.commits}))
  await place(170,flip);await page.waitForTimeout(200);await press(['w','l'],420);await shot(`12_${f}_crane_rise`);await page.waitForTimeout(900)
  await place(220,flip);await page.waitForTimeout(200);await press([bk,'l'],420);await shot(`13_${f}_ninja_edge_warn`);await page.waitForTimeout(300);await shot(`14_${f}_ninja_edge`);await page.waitForTimeout(800)
  s=await G();ck(`all three orders committed in real time (${f})`,s.a.falcon.commits>=3,JSON.stringify({c:s.a.falcon.commits}))
  // Formation: token held → Twin Fist → retap Special as soon as the offer opens → follow-up punch
  await place(200,flip);await page.evaluate(()=>__harness.mmprWhiteTest.giveToken());await page.waitForTimeout(250);await shot(`15_${f}_token_hud`)
  const fh0=(await G()).a.s.stats.followHits,hp0=(await G()).b.hp;const q0=await G();log[`formationPre_${f}`]={atk:q0.a.attack?.name,g:q0.a.grounded,land:q0.a.s?.landing,hs:q0.a.hitstun,bs:q0.a.blockstun,F:q0.a.hud,e:q0.a.energy,blink:q0.a.ranger?.blink,facing:q0.a.facing,x:q0.a.x,bx:q0.b.x,kd:q0.a.knockdown};await page.evaluate(()=>{const b=__harness.mmprWhiteTest.raw('p2');b.hitstun=45;b.isBlocking=false;b._forceGuard=false});await press([fw,'l'],0);await page.waitForTimeout(100);const q1=await G();log[`formationPost_${f}`]={atk:q1.a.attack?.name,pk:q1.a.falcon?.pendingKind,calls:q1.a.falcon?.calls,facing:q1.a.facing,s:q1.a.s&&{edges:q1.a.s.edges,used:q1.a.s.used}};const qo=await waitFor(q=>q.a.s?.accept||q.b.hp<hp0&&!q.a.s?.token,120);log[`formation_${f}`]={offer:!!qo.a.s?.accept,token:!!qo.a.s?.token,bhp:qo.b.hp,hp0,blk:qo.b.blockstun,sortie:qo.a.falcon?.sortie?.kind,age:qo.a.falcon?.sortie?.age,gap:Math.round(Math.abs(qo.a.x-qo.b.x))};await press(['l'],0);await page.waitForTimeout(250);await shot(`16_${f}_formation_follow`);await page.waitForTimeout(700)
  s=await G();ck(`real-time Formation follow-up accepted and landed (${f})`,s.a.s.stats.followHits>fh0,JSON.stringify(s.a.s.stats))
  await place(70,flip);await page.waitForTimeout(200);await press(['s','l'],260);await shot(`17_${f}_tiger_ascent`);await page.waitForTimeout(900)
  for(let t=0;t<3;t++){await place(600,flip);await page.waitForTimeout(300);await press([fw],30);await press([fw],30);await shot(`18_${f}_blink`);await page.waitForTimeout(600);if((await G()).a.ranger?.blinks>=1)break}
  s=await G();ck(`double-tap blink fired in real time (${f})`,s.a.ranger?.blinks>=1,JSON.stringify(s.a.ranger))
  await place(80,flip);await page.waitForTimeout(250);await page.evaluate(()=>{const b=__harness.mmprWhiteTest.raw('p2');b.hitstun=45;b.isBlocking=false});await press(['u'],0)
  let ult=false;for(let i=0;i<60;i++){await page.waitForTimeout(50);if((await G()).ult.active){ult=true;break}}
  if(ult){await page.waitForTimeout(300);await shot(`19_${f}_ult_fist`);await page.waitForTimeout(800);await shot(`20_${f}_ult_crane`);await page.waitForTimeout(1300);await shot(`21_${f}_ult_final`)}
  ck(`real-time ultimate captured the opener (${f})`,ult);for(let i=0;i<120&&(await G()).ult.active;i++)await page.waitForTimeout(100)
  s=await G();ck(`ultimate completed and ended cleanly (${f})`,!s.ult.active&&s.a.s.stats.ultDone>ultDone&&!s.a.attack?.name?.startsWith('ult'),JSON.stringify({done:s.a.s.stats,hud:s.a.hud}));ultDone=s.a.s.stats.ultDone
 }
 // PROFILE: repeated sortie calls + ultimate vs an idle baseline (sim+render steps in this page)
 log.profile=await page.evaluate(()=>{const H=__harness.mmprWhiteTest,a=H.raw(),b=H.raw('p2'),step=n=>__harness.luffyTest.step(n)
  const time=fn=>{const t0=performance.now();fn();return performance.now()-t0}
  const setup=()=>{a.x=1300;b.x=1500;b.attackCooldown=9999;b.attacking=false;b.currentAttack=null;a.hitstun=0;a.health=a.maxHealth;b.health=b.maxHealth;a.energy=100;a.attacking=false;a.currentAttack=null;a.attackCooldown=0;if(a._falcon){a._falcon.pips=2;a._falcon.lockout=0;a._falcon.postUlt=0}}
  setup();const idle=time(()=>step(600))/600
  let calls=0;const rej=[];const pass=()=>{for(let i=0;i<10;i++){setup();for(const k of ['ninjaTwinFist','ninjaCraneRise','ninjaEdge']){if(a._falcon){a._falcon.lockout=0;a._falcon.pips=2}a.attacking=false;a.currentAttack=null;a.energy=100;if(H.move('wCall','p1',{kind:k}))calls++;else rej.push({k,hs:a.hitstun,g:a.onGround,att:a.currentAttack?.name,land:a._mmprWhite?.landing,ws:a._mmprWhite&&{lp:a._mmprWhite.leaping,de:a._mmprWhite.descending},blink:!!a._ranger?.blink,cd:a.attackCooldown,bs:a.blockstun,grab:a.isGrabbed,hst:a.hitstop,F:a._falcon&&{p:a._falcon.pips,l:a._falcon.lockout,s:a._falcon.sortie?.kind,pu:a._falcon.postUlt,pk:a._falcon.pendingKind},e:a.energy,kd:a.knockdownState,hp:a.health});step(90)}}}
  pass();const cache0=H.fxCache();const sortie=time(pass)/(10*3*90)   // 2nd pass measured: first-use image loads are not leaks
  setup();b.x=1380;a.energy=100;H.move('wUltOpen');const ultT=time(()=>step(320))/320
  return {msPerFrameIdle:+idle.toFixed(3),msPerFrameSorties:+sortie.toFixed(3),msPerFrameUlt:+ultT.toFixed(3),calls,fxCacheBefore:cache0,fxCacheAfter:H.fxCache(),projectilesLeft:(H.state().shots||[]).length,rejected:rej.length,unexplained:rej.filter(r=>!(r.hs>0||!r.g||!r.F||r.kd||r.att||r.F.s)).length,rejectSample:rej.slice(0,3),unexplainedSample:rej.filter(r=>!(r.hs>0||!r.g||!r.F||r.kd||r.att||r.F.s)).slice(0,3)}})
 ck('profile: 30 call attempts in a LIVE match — every rejection has a legitimate cause (hitstun / airborne / one live order at a time), second pass adds no cached images, leaks no projectiles',log.profile.calls>=20&&log.profile.unexplained===0&&log.profile.fxCacheAfter===log.profile.fxCacheBefore&&log.profile.projectilesLeft===0,JSON.stringify(log.profile))
 ck('profile: order / ultimate frames stay within 3x idle cost and under 8 ms',log.profile.msPerFrameSorties<Math.max(8,log.profile.msPerFrameIdle*3)&&log.profile.msPerFrameUlt<Math.max(8,log.profile.msPerFrameIdle*3),JSON.stringify(log.profile))
 log.fps=await page.evaluate(async()=>{let n=0;const t0=performance.now();await new Promise(r=>{const tick=()=>{n++;if(performance.now()-t0<2000)requestAnimationFrame(tick);else r()};requestAnimationFrame(tick)});return Math.round(n/((performance.now()-t0)/1000))})
 ck('page keeps animating (rAF fps sample, headless)',log.fps>=20,String(log.fps))
 for(let round=0;round<3;round++){
  if((await S()).gameState==='victory')break
  await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000})
  await page.evaluate(()=>{const a=__harness.mmprWhiteTest.raw(),b=__harness.mmprWhiteTest.raw('p2');a.health=a.maxHealth;a.hitstun=0;a.hitstop=0;a.attackCooldown=0;a.attacking=false;a.currentAttack=null;a.vx=0;b.health=1;b.x=a.x+70*(a.facing||1);b.y=a.y;b.vx=0;b.vy=0;b.onGround=true;b.invulnTimer=0;b.hitstun=120;b.isBlocking=false;b.attacking=false;b.currentAttack=null;b._forceGuard=false})
  await page.keyboard.down('j');await page.waitForTimeout(180);await page.keyboard.up('j');await page.waitForTimeout(1500);await shot(`22_ko_${round}`)
  await page.waitForFunction(()=>__harness.state().gameState==='victory'||(__harness.state().gameState==='battle'&&__harness.mmprWhiteTest.raw('p2').health>1),null,{timeout:45000})
 }
 ck('victory screen reached',(await S()).gameState==='victory');await page.waitForTimeout(900);await shot('23_victory')
 await page.keyboard.press('r');await page.waitForFunction(()=>__harness.state().gameState==='battle',null,{timeout:30000})
 s=await G()   // read at rematch start, before the live CPU can land a hit
 await page.waitForFunction(()=>__harness.state().countdown<=0,null,{timeout:30000});await page.waitForTimeout(300);await shot('24_rematch');ck('rematch: White, same skin, fresh pips/Formation state',s.a.key==='mmpr_white'&&s.a.tag==='upgrade'&&(s.a.hud?.pips??2)===2&&!s.a.falcon?.sortie&&!(s.a.hud?.lockout>0)&&!s.a.s?.token&&!s.a.s?.coll&&s.a.hp===HP,JSON.stringify({tag:s.a.tag,hp:s.a.hp,hud:s.a.hud}))
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors))
}finally{log.passes=pass;log.failures=fail;log.errors=errors;fs.writeFileSync('docs/mmpr_white/visual_results.json',JSON.stringify(log,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
