// Normal launch verification. No ?harness, RAF override, forced state, resources or KO.
// The response-only observer reads private state; all actions use real mouse/keyboard input.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
const url=process.env.LUFFY_PLAY_URL||'http://127.0.0.1:8000/'
const out='/tmp/ms-luffy-launch';fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage({viewport:{width:1280,height:720}})
const errors=[],missing=[],checks=[]
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(new URL(r.url()).pathname)})
const observer=`
window.__luffyLaunchRead = () => {
 const snap=f=>f?{key:f.rosterKey,x:f.x,y:f.y,w:f.w,h:f.h,facing:f.facing,health:f.health,energy:f.energy,onGround:f.onGround,attacking:f.attacking,hitstun:f.hitstun,hitstop:f.hitstop,blockstun:f.blockstun,comboCounter:f.comboCounter,attackCooldown:f.attackCooldown,phase:getAttackPhase(f),move:f.currentMove,attack:f.currentAttack?JSON.parse(JSON.stringify(f.currentAttack)):null,lf:f._luffy?JSON.parse(JSON.stringify(f._luffy)):null,sprite:f.spriteHandler?.currentAction}:null;
 return {state:gameState,tutorialActive:tutorial.isActive(),frame:globalFrameCount,countdown,roundWins:{...roundWins},round:roundNumber,mode:matchConfig.mode,experimental:matchConfig.benExperimental,universe:matchConfig.selectedUniverse,p1Key:matchConfig.p1CharKey,p2Key:matchConfig.p2CharKey,skin:matchConfig.p1Skin,rects:(_padMenuRects()||[]).map(r=>({...r})),universes:gameState===GAME_STATES.SELECT_UNIVERSE?getUniverseList():[],roster:gameState===GAME_STATES.SELECT_CHARACTER?getCharacterRosterForSelectedUniverse().map(c=>({id:c.id,name:c.name})):[],p1:snap(p1),p2:snap(p2)};
};`
await page.route('**/game.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+observer})})
const read=()=>page.evaluate(()=>window.__luffyLaunchRead())
const check=(name,ok)=>{assert(ok,name);checks.push(name);console.log('PASS',name)}
const wait=async(fn,timeout=15000)=>{await page.waitForFunction(fn,null,{timeout,polling:'raf'});return read()}
const shot=async name=>page.screenshot({path:out+'/'+name+'.png'})
const clickIndex=async i=>{const s=await read(),r=s.rects[i];assert(r,'missing menu rectangle '+i);await page.mouse.click(r.x+r.w/2,r.y+r.h/2);await page.waitForTimeout(220);console.log('MENU',JSON.stringify((await read()).state))}
const clickId=async id=>{const s=await read();await clickIndex(s.rects.findIndex(r=>r.id===id))}
const tap=async k=>page.keyboard.press(k,{delay:28})
async function pickLuffy(){await wait(()=>__luffyLaunchRead().state==='selectUniverse');let s=await read();const i=s.universes.findIndex(u=>u.id==='one_piece');assert(i>=0,'One Piece absent');
 let r=s.rects[i];if(r.y>650){await page.mouse.move(600,430);await page.mouse.wheel(0,r.y-350);await page.waitForTimeout(300)}
 await clickIndex(i);await wait(()=>__luffyLaunchRead().state==='selectCharacter');s=await read();await clickIndex(s.roster.findIndex(c=>c.id==='luffy'));
 s=await read();if(s.state==='selectSkin')await clickIndex(0)
}
try{
 await page.goto(url,{waitUntil:'networkidle'});await wait(()=>typeof window.__luffyLaunchRead==='function');check('plain playable URL has no startup-skipping harness',await page.evaluate(()=>!window.__harness&&!location.search));await shot('01-title');check('ordinary title loads',(await read()).state==='start')
 await clickId('play');if((await read()).tutorialActive){await wait(()=>__luffyLaunchRead().state==='battle'&&__luffyLaunchRead().countdown<=0,45000);await shot('first-boot-tutorial');await page.keyboard.press('Escape');check('first-boot tutorial can be skipped through its normal Escape control',!(await read()).tutorialActive)}await wait(()=>__luffyLaunchRead().state==='mainMenu');check('normal main menu loads via PLAY',(await read()).state==='mainMenu');await shot('02-main-menu')
 await clickId('play');await clickId('pvp');await pickLuffy();await shot('03-luffy-selection');await pickLuffy();await wait(()=>__luffyLaunchRead().state==='selectStage');await clickIndex(0)
 await wait(()=>__luffyLaunchRead().state==='battle'&&__luffyLaunchRead().countdown<=0,30000)
 let s=await read();check('normal menus spawn Luffy with default skin',s.p1.key==='luffy'&&s.p2.key==='luffy'&&s.skin==='default');check('normal play retains production Ben restrictions',s.experimental!==true);await shot('04-match')
 // Remaining play assertions are filled below; no hidden state mutation is used.
 fs.writeFileSync(out+'/menu-result.json',JSON.stringify({url,checks,errors,missing,snapshot:s},null,2));console.log('MENU_READY',s.p1.key,s.p2.key,s.mode)
 if(process.env.LUFFY_MENU_ONLY!=='1'){
  const idle=()=>wait(()=>{const s=__luffyLaunchRead();return s.state==='battle'&&s.countdown<=0&&s.p1.health>0&&!s.p1.attack&&s.p1.attackCooldown<=0&&!s.p1.hitstun&&!s.p1.hitstop},12000)
  async function close(gap=78){await idle();let q=await read();if(Math.abs(q.p2.x-q.p1.x)<=gap+4)return;const key=q.p2.x>q.p1.x?'d':'a';await page.keyboard.down(key);try{await page.waitForFunction(g=>{const s=__luffyLaunchRead();return Math.abs(s.p2.x-s.p1.x)<=g},gap,{timeout:12000,polling:'raf'})}finally{await page.keyboard.up(key)}}
  async function meter(min){await idle();await page.waitForFunction(n=>__luffyLaunchRead().p1.energy>=n,min,{timeout:65000,polling:'raf'})}
  async function confirmed(){return wait(()=>!!__luffyLaunchRead().p1.attack?.lfConfirmed,4000)}
  async function recovery(){return wait(()=>{const f=__luffyLaunchRead().p1;return f.attack?.lfConfirmed&&f.phase==='recovery'},4000)}
  let before=await read();await page.keyboard.down('a');await page.waitForTimeout(300);await page.keyboard.up('a');s=await read();check('normal-launch movement responds to A/D',Math.abs(s.p1.x-before.p1.x)>20)
  await tap('w');await wait(()=>!__luffyLaunchRead().p1.onGround);check('normal-launch jump uses real movement',!(await read()).p1.onGround);await wait(()=>__luffyLaunchRead().p1.onGround)
  await close();before=await read();await tap('j');await recovery();await tap('j');await recovery();await tap('j');await confirmed();s=await read();check('fresh Light chain hits through normal play',s.p2.health<before.p2.health&&s.p1.attack.name==='lfJ3');check('clean grounded normals build three Wind-Up pips',s.p1.lf.pips===3);await shot('05-wind-up')
  await close();await tap('k');await confirmed();check('normal-launch Heavy connects',(await read()).p1.attack.name==='heavy')
  await meter(12);await close();before=await read();await tap('l');await confirmed();await tap('l');await wait(()=>__luffyLaunchRead().p1.attack?.name==='lfSnap',3000);s=await read();check('fresh Special retap buys late-only Snapback',s.p1.lf.pips===before.p1.lf.pips-1&&s.p1.lf.snapUsed&&s.p1.attack.lf.noHit);await shot('06-snapback')
  await meter(18);await close();await page.keyboard.down('d');await tap('l');await page.keyboard.up('d');await confirmed();s=await read();check('Forward Special dispatches real Reel-In',s.p1.attack.name==='lfReel');await shot('07-reel')
  await meter(20);await close();before=await read();await page.keyboard.down('s');await tap('l');await page.keyboard.up('s');await confirmed();await idle();s=await read();check('Down Special Pinwheel connects',s.p2.health<before.p2.health);await shot('08-pinwheel-end')
  await meter(18);await close();await page.keyboard.down('a');await tap('l');await page.keyboard.up('a');await wait(()=>__luffyLaunchRead().p1.attack?.name==='lfBrace');await shot('09-balloon');check('Back Special enters Balloon Brace',(await read()).p1.lf.braceCd>0);await idle()
  await meter(15);await tap('w');await wait(()=>!__luffyLaunchRead().p1.onGround);await page.keyboard.down('s');await tap('l');await page.keyboard.up('s');await wait(()=>__luffyLaunchRead().p1.attack?.name==='lfAnchor');check('Air Down Special is Anchor Heel',(await read()).p1.lf.anchorUsed);await shot('10-anchor');await wait(()=>__luffyLaunchRead().p1.attack?.name==='land',6000);await idle()
  // Earn meter honestly; no resource setter, save injection or infinite-energy mode.
  while((await read()).p1.energy<100){await close();await tap('j');await confirmed();await idle()}
  check('Stamina reaches 100 through real eligible play',(await read()).p1.energy===100)
  await close();before=await read();await tap('u');await confirmed();check('logical Ultimate starts Full-Stretch Finale',(await read()).p1.attack.name==='lfFinale');await shot('11-ultimate');await idle();s=await read();check('confirmed ultimate spends actual Stamina and deals follow-up damage',s.p1.energy<=5&&s.p2.health<before.p2.health-60)
  // Finish a full competitive match with actual attacks, including its second round.
  const kos=[];let attempts=0
  while((await read()).state!=='victory'&&attempts++<180){
   s=await read();if(s.state==='battle'&&s.p2?.health<=0&&!kos.includes(s.round)){kos.push(s.round);console.log('REAL_KO',s.round);await shot('ko-round-'+s.round)}
   if(s.state==='battle'&&s.countdown<=0&&s.p2.health>0){await close();await page.waitForFunction(()=>{const s=__luffyLaunchRead();return s.p1.comboCounter===0||s.state!=='battle'},null,{timeout:6000,polling:'raf'});if((await read()).state==='battle'){await tap('k');await page.waitForTimeout(750)}}
   else await page.waitForTimeout(150);if(attempts%10===0){const q=await read();console.log('MATCH_PROGRESS',q.state,q.round,q.roundWins,q.p2.health)}
  }
  s=await read();check('actual attack damage reaches KO and match victory',s.state==='victory'&&s.roundWins.p1>=2&&s.p2.health===0);await shot('12-victory')
  await tap('r');await wait(()=>__luffyLaunchRead().state==='battle'&&__luffyLaunchRead().countdown<=0,30000);s=await read();check('normal R rematch restores Luffy and clears resources/rounds',s.p1.key==='luffy'&&s.p1.health===1000&&s.p1.energy===50&&s.p1.lf.pips===0&&s.roundWins.p1===0);check('rematch releases victory and defeat poses for both Luffys',s.p1.sprite==='idle'&&s.p2.sprite==='idle');await shot('13-rematch')
  check('normal launch has no uncaught JavaScript errors',errors.length===0);check('normal launch has no missing Luffy assets',!missing.some(x=>/luffy/i.test(x)))
  console.log('LUFFY NORMAL LAUNCH:',checks.length,'passed, 0 failed')
 }
}catch(e){console.error('LAST_STATE',JSON.stringify(await read()));throw e}finally{fs.writeFileSync(out+'/result.json',JSON.stringify({url,checks,errors,missing,last:await read()},null,2));await browser.close()}
