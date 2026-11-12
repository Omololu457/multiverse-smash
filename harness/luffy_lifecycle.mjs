import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']})
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];let passed=0
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0});page.on('pageerror',e=>errors.push(e.message))
const check=(n,c)=>{assert(c,n);passed++;console.log('PASS',n)}
const open=async(p1='luffy',p2='goku',suffix='')=>{await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}${suffix}`);await page.waitForFunction(()=>!!window.__harness?.luffyTest);await page.evaluate(()=>{__harness.start({mode:'pvp'});__harness.skipToBattle();__harness.juice.setSlowMo(false);__harness.luffyTest.step(2)})}
const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
const shot=async name=>{await page.evaluate(()=>{__harness.setImpactFlash(-1,0);for(let i=0;i<40;i++)__harness.luffyTest.step(0)});await page.screenshot({path:'/tmp/ms-luffy-visual/'+name+'.png'})}
const st=(w='p1')=>page.evaluate(w=>__harness.luffyTest.state(w),w)
try{
 await open()
 for(const kind of ['training','round','rematch']){
  await page.evaluate(()=>{__harness.luffyTest.resources('p1',3);__harness.luffyTest.set('p1',{energy:100})})
  await page.keyboard.down('a');await page.keyboard.down('l');await step(12);await page.keyboard.up('a');await page.keyboard.up('l')
  check(kind+' fixture really armed Balloon',(await st()).state.braceCd>0)
  await page.evaluate(k=>{__harness.ben10Reset(k);__harness.skipToBattle();__harness.luffyTest.step(1)},kind)
  const f=await st();check(kind+' lifecycle clears pips, cooldown, airtime and queued/pull state',!(f.state?.pips)&&!(f.state?.braceCd)&&!f.state?.anchorUsed&&!f.state?.snapQueued&&!f.state?.pull&&!f.attack)
  check(kind+' restores shared HP and ordinary energy policy',f.health===1000&&f.energy===(kind==='training'?100:50))
 }
 // Actual competitive KO → victory → R rematch.
 await page.evaluate(()=>{__harness.setRoundWins(1,0);__harness.luffyTest.resources('p1',3);__harness.setHealth(0,'p2')});await step(1000)
 check('actual KO reaches real victory',await page.evaluate(()=>__harness.matchFlow().victoryActive&&__harness.state().gameState==='victory'))
 await shot('victory-live');await page.keyboard.press('r');await page.evaluate(()=>__harness.skipToBattle());await step(2)
 check('real R rematch clears winner character state',(await st()).state?.pips===0&&(await st()).energy===50)
 check('real rematch releases Luffy victory pose',(await st()).spriteAction==='idle')
 // Second slot uses its real distinct keyboard controls and mirrored art.
 await open('goku','luffy');await page.evaluate(()=>{__harness.luffyTest.set('p1',{x:750});__harness.luffyTest.set('p2',{x:830,energy:100})})
 await page.keyboard.down('1');await step(6);await page.keyboard.up('1');let f=await st('p2')
 check('P2 actual Light input grants its own pip and damages P1',f.state.pips===1&&(await st()).health<1000)
 await step(35);await page.keyboard.down('4');await step(14);await page.keyboard.up('4');f=await st('p2')
 check('P2 Special input uses own mirrored Piston',f.attack?.name==='lfPiston'&&f.facing===-1)
 await shot('p2-piston');check('P2 renders the active Piston extension during confirmed hitstop',(await st('p2')).spriteAction==='lfPiston'&&(await st('p2')).spriteFrame===3)
 // Stage edges: root/recovery retains body inside boundaries in both facings.
 await page.evaluate(()=>__harness.ben10Reset('training'))
 for(const side of ['left','right']){
  const {x,width}=await page.evaluate(side=>__harness.luffyTest.edge('p2',side),side)
  await page.keyboard.down('4');await step(14);await page.keyboard.up('4')
  const dir=side==='left'?'ArrowLeft':'ArrowRight';await page.keyboard.down(dir);await step(8);await page.keyboard.up(dir)
  f=await st('p2');check('stage-edge cast keeps body at the actual legal view boundary '+side,Number.isFinite(f.x)&&f.x>=0&&f.x+f.w<=width&&Math.abs(f.x-x)<2)
  await shot('edge-'+side);await page.evaluate(()=>__harness.ben10Reset('training'))
 }
 // Saved selection is restored through the real persistence module, not a new catalog.
 await open('luffy','goku','&session=1');await page.evaluate(()=>__harness.setSession({selectedUniverse:'one_piece',p1CharKey:'luffy',p1Skin:'default',screen:'selectCharacter'}))
 await page.goto(server.base+'/index.html?harness=1&session=1');await page.waitForFunction(()=>!!window.__harness)
 const saved=await page.evaluate(()=>__harness.session());check('saved Luffy universe, identity and default skin survive reload',saved.selectedUniverse==='one_piece'&&saved.p1CharKey==='luffy'&&saved.p1Skin==='default')
 // A recorded actual keyboard segment must replay Luffy's full serialized state without divergence.
 await open();await page.evaluate(()=>{__harness.rng.forceSeed(424242);__harness.juice.setHitstopStyle('classic');__harness.juice.setSlowMo(false);__harness.start({mode:'pvp'});__harness.skipToBattle()})
 await page.keyboard.down('d');await step(65);await page.keyboard.up('d')
 for(let i=0;i<4;i++){await page.keyboard.down('j');await step(1);await page.keyboard.up('j');await step(27)}
 await page.keyboard.down('l');await step(1);await page.keyboard.up('l');await step(80)
 const record=await page.evaluate(()=>__harness.replay.stopAndGet());check('real Luffy replay contains authoritative checkpoints',record.states?.length>=5&&record.frames.length>5)
 const replay=await page.evaluate(r=>__harness.replay.play(r),record);check('Luffy replay accepted',replay.ok);await page.evaluate(()=>__harness.skipToBattle());await step(record.frameCount+3)
 const result=await page.evaluate(()=>__harness.replay.playbackState());console.log('REPLAY',JSON.stringify(result));check('all Luffy state checkpoints match replay',result.desyncFrame==null&&result.checks>=5&&result.checks===result.matched)
 // Shared AI runs Luffy's real normal/special dispatch and leaves finite state.
 await page.evaluate(()=>{__harness.replay.stopPlayback();__harness.rng.forceSeed(12345);__harness.aiVsAi.start({p1:'luffy',p2:'goku',p1Diff:'easy',p2Diff:'easy',matches:1,speed:1});__harness.skipToBattle()});await step(1200)
 const a=await st(),b=await st('p2');check('AI smoke spawns and fights with finite Luffy state',a.key==='luffy'&&Number.isFinite(a.x)&&Number.isFinite(a.energy)&&a.energy>=0&&a.energy<=100&&(a.health<1000||b.health<1000))
 check('no uncaught errors during lifecycle / both slots / replay / AI',errors.length===0)
 fs.writeFileSync('/tmp/luffy-lifecycle-results.json',JSON.stringify({passed,errors,replay:result,saved,ai:{p1:a,p2:b}},null,2))
 console.log(`LUFFY LIFECYCLE: ${passed} passed, 0 failed`)
}finally{await browser.close();server.close()}
