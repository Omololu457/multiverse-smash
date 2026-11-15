import fs from 'node:fs'
import assert from 'node:assert/strict'
import { _electron, chromium } from 'playwright'
const useBrowser=process.argv.includes('--browser')
const app=useBrowser?await chromium.launch({headless:true}):await _electron.launch({executablePath:'electron/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',args:['electron','--user-data-dir=/tmp/mr-incredible-electron-'+Date.now()],env:{...process.env,LAN_PORT:'0',DIAG:'1',CAPTURE:'0',PAD_CHECK:'0'}})
if(!useBrowser){app.process().stdout?.on('data',d=>fs.appendFileSync('/tmp/mr_electron_diag.log',d));app.process().stderr?.on('data',d=>fs.appendFileSync('/tmp/mr_electron_diag.log',d))}
const page=useBrowser?await app.newPage({viewport:{width:1280,height:720}}):await app.firstWindow();if(!useBrowser)await page.setViewportSize({width:1280,height:720});const errors=[],log={};page.on('pageerror',e=>errors.push(e.message))
const url=useBrowser?'http://localhost:8000/index.html':await page.url();console.log('LAUNCH_URL',url);await page.goto(url.split('?')[0]+'?harness=1');
const S=()=>page.evaluate(()=>__harness.state());const shot=n=>page.screenshot({path:`docs/mr_incredible/desktop_${n}.png`});
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.evaluate(()=>__harness.padNav({confirm:true})); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
// universe cards carry no menu id and the grid (3 wide) does not wrap: reach card u by row / column, then real-click it
async function uni(u) { const r = await page.evaluate(u => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 12; i++) { __harness.padNav({ up: true }); __harness.padNav({ left: true }) }
    for (let i = 0; i < Math.floor(u / 3); i++) __harness.padNav({ down: true }); for (let i = 0; i < u % 3; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, u)
  await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(80); await page.evaluate(()=>__harness.padNav({confirm:true})); await page.waitForTimeout(450); return r }

async function skin(n){const r=await page.evaluate(n=>{for(let i=0;i<12;i++){__harness.padNav({up:true});__harness.padNav({left:true})}for(let i=0;i<n;i++)__harness.padNav({right:true});const c=document.querySelector('canvas'),b=c.getBoundingClientRect(),s=__harness.padMenuState();return {x:b.left+s.mouseX*b.width/c.width,y:b.top+s.mouseY*b.height/c.height,idx:s.idx}},n);console.log('skin',r.idx);await page.mouse.move(r.x,r.y);await page.evaluate(()=>__harness.padNav({confirm:true}));await page.waitForTimeout(450)}
try{
 await page.waitForFunction(()=>window.__harness?.state);await page.waitForTimeout(1200);await shot('01_title');await page.mouse.click(640,400);await page.waitForTimeout(500)
 await click('^play$');await click('^vs$');await click('^easy$');let found={missing:true}
 // Incredibles is discovered through the real universe and roster menus.
 for(let u=20;u<30&&found.missing;u++){
  const r=await uni(u);console.log('universe',u,JSON.stringify(await S()));if(r.idx!==u)break
  if((await S()).gameState!=='selectCharacter')continue
  found=await findChar('mr_incredible');if(found.missing){await page.evaluate(()=>__harness.nav.back());await page.waitForTimeout(250)}else log.universe=u
 }
 assert(!found.missing,'Mr. Incredible appears in actual universe roster');await shot('02_select');await page.evaluate(()=>__harness.padNav({confirm:true}));await page.waitForTimeout(400)
 log.skins=await page.evaluate(()=>__harness.padMenuState());assert(log.skins.count===11);await shot('03_skins');await skin(1)
 if((await S()).gameState==='selectUniverse')await uni(log.universe)
 if((await S()).gameState==='selectCharacter'){const r=await findChar('mr_incredible');assert(!r.missing);await page.evaluate(()=>__harness.padNav({confirm:true}));await page.waitForTimeout(400)}
 if((await S()).gameState==='selectSkin')await skin(2)
 if((await S()).gameState==='selectStage')await click('.*')
 let intro=false;for(let i=0;i<90;i++){const s=await page.evaluate(()=>__harness.mrIncredibleTest.state());if(s?.action?.startsWith('intro')){intro=true;await shot('04_intro');break}await page.waitForTimeout(60)}
 assert(intro,'authored intro appears');await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000});await page.waitForTimeout(800)
 log.match=await page.evaluate(()=>({a:__harness.mrIncredibleTest.state(),b:__harness.mrIncredibleTest.state('p2')}));assert(log.match.a.key==='mr_incredible'&&log.match.b.key==='mr_incredible');assert(log.match.a.skin==='mi_modern');await shot('05_match')
 await page.evaluate(()=>{const H=__harness.mrIncredibleTest;for(const f of [H.raw(),H.raw('p2')]){f.attackCooldown=9999;f.hitstun=0;f.health=f.maxHealth}H.raw().attackCooldown=0;H.raw().energy=100;H.raw('p2').x=H.raw().x+450})
 await page.keyboard.press('u',{delay:60});await page.waitForTimeout(700);assert((await page.evaluate(()=>__harness.mrIncredibleTest.state())).s.remaining>0);await shot('06_prime')
 await page.waitForTimeout(16000);const reverted=await page.evaluate(()=>__harness.mrIncredibleTest.state());assert(reverted.s.remaining===0&&reverted.s.visual==='veteran'&&reverted.skin==='mi_modern');await shot('07_expired')
 // Setup a real lethal melee contact, then let actual round and result logic run.
 await page.evaluate(()=>{const H=__harness.mrIncredibleTest,a=H.raw(),b=H.raw('p2');for(const f of [a,b]){f.attacking=false;f.currentAttack=null;f.hitstun=f.hitstop=f.blockstun=0;f.invulnTimer=0;f.isBlocking=false;f.onGround=f.grounded=true;f.y=400;f.vx=f.vy=0}a.attackCooldown=0;a.x=1300;a.facing=1;b.x=1365;b.health=1;b.attackCooldown=9999;});await page.keyboard.press('k',{delay:60});
 for(let rd=0;rd<3;rd++){await page.waitForTimeout(4500);if((await S()).gameState==='victory')break;await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000});await page.evaluate(()=>{const H=__harness.mrIncredibleTest,a=H.raw(),b=H.raw('p2');a.attacking=false;a.currentAttack=null;a.attackCooldown=0;a.hitstun=a.hitstop=0;b.health=1;b.x=a.x+65;b.y=a.y;b.invulnTimer=0;b.hitstun=0;b.attackCooldown=9999;b.isBlocking=false});await page.keyboard.press('k',{delay:60})}
 await page.waitForFunction(()=>__harness.state().gameState==='victory',null,{timeout:45000});await shot('08_ko');await page.keyboard.press('r');await page.waitForFunction(()=>['intro','battle'].includes(__harness.state().gameState),null,{timeout:30000});await page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:45000});
 log.rematch=await page.evaluate(()=>__harness.mrIncredibleTest.state());assert(log.rematch.hp===1250&&!log.rematch.s?.remaining&&log.rematch.skin==='mi_modern');await shot('09_rematch');assert(errors.length===0);console.log('PASS desktop normal menus → skin → intro → match → prime → expire → KO → rematch')
}catch(e){log.failure=e.stack;console.log('FAIL',e.stack);if(!page.isClosed())await shot('failure');process.exitCode=1}
finally{log.errors=errors;log.url=url;fs.writeFileSync('docs/mr_incredible/desktop_results.json',JSON.stringify(log,null,2));await app.close()}
