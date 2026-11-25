import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base=process.env.KEVIN_URL || 'http://127.0.0.1:8000/index.html'
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720}})
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
try {
  await page.goto(base+'?harness=1&p1=kevin_levin&p2=kevin_levin&seed=1749',{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>window.__harness?.kevinTest)
  const result=await page.evaluate(async()=>{
    const {writeRawControls,inputSettings}=await import('./input.js')
    const {PAD_BUTTON,PAD_DPAD}=await import('./padLayout.js')
    const {resolveProjectileHitsMulti}=await import('./combat.js')
    const {kevinState,kevinHand}=await import('./kevinState.js')
    const H=__harness.kevinTest, opts={mode:'pvp',p1Skin:'event_horizon',p2Skin:'glitterstorm'}
    const pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:[]}
    navigator.getGamepads=()=>[pad]
    inputSettings.p1Type='keyboard'
    inputSettings.p2Type='controller'
    const buttonMap={...PAD_BUTTON,...PAD_DPAD}
    function setPad(raw) {
      pad.buttons=Array.from({length:17},()=>({pressed:false,value:0}))
      for(const [k,v] of Object.entries(raw)) if(v && buttonMap[k]!=null)pad.buttons[buttonMap[k]]={pressed:true,value:1}
    }
    function start(){
      setPad({});__harness.start(opts);__harness.skipToBattle()
      return [H.raw(),H.raw('p2')]
    }
    const checks=[]
    const check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail})
    let [a,b]=start()
    const step=(p1={},p2={},n=1)=>{
      for(let i=0;i<n;i++){
        writeRawControls(a,p1);setPad(p2)
        __harness.aiVsAi.step(1)
      }
    }
    function probe(owner,defender,damage=30,kind=null) {
      const hand=kevinHand(defender,defender.currentAttack?.kevin?.dir || defender.facing)
      const p=H.world.spawn(owner,'kevinSyncProbe',{spawnX:hand.x,spawnY:hand.y,
        vx:-defender.facing*11,w:36,damage,kevinCapture:{family:'star',raw:30},isSpecial:true})
      if(kind)p.kevinShot={kind}
      resolveProjectileHitsMulti(H.world.projectiles,[a,b])
      return p
    }
    step({}, {special:true})
    step({}, {}, 6)
    const hp=b.health
    const orig=probe(a,b)
    check('P2 capture uses flipped hand and negative facing',b.facing===-1 && b.health===hp &&
      b._kevin.stored?.family==='star' && !H.world.projectiles.includes(orig),b._kevin.stored)
    step({}, {}, 29)
    step({}, {special:true})
    check('P2 release clears slot',b.currentMove==='kReturn'&&!b._kevin.stored)
    let shot
    for(let i=0;i<35;i++){step();shot ||= H.world.projectiles.find(p=>p.owner===b&&p.name==='kReturn')}
    check('Return from P2 has P2 ownership and leftward travel',shot?.vx<0&&shot.kevinShot.kind==='star'&&!shot.kevinCapture)

    ;[a,b]=start()
    step({}, {special:true})
    step({}, {}, 6)
    const antiLoop=probe(a,b,60,'star')
    check('a returned shot cannot enter the capture slot even if mis-tagged',
      !b._kevin.stored && !H.world.projectiles.includes(antiLoop) && b.health<b.maxHealth)
    ;[a,b]=start()
    const releases=()=>step({}, {}, 1)
    step({}, {charge:true,special:true},15);releases()
    check('L2+R1 remains one action while held',b._kevin.selected===1 && !b.currentMove && !b.isCharging)
    step({}, {down:true,special:true});step({}, {}, 34)
    check('D-pad Down + R1 applies selected alloy',b._kevin.material==='alloy')
    step({}, {up:true,heavy:true})
    check('D-pad Up + Triangle stays grounded',b.currentMove==='up'&&b.jumpCount===0)
    step({}, {},25)
    step({}, {jump:true});releases();step({}, {jump:true});releases()
    check('Cross still performs two standard jumps',b.jumpCount===2,b.jumpCount)
    b.energy=100;b.y=62;b.grounded=b.onGround=false;b.vy=-16
    step({}, {ultimate:true});step({}, {},29)
    // re-pinned 2026-11-24 (rangers_rest ult rebuild): kevinUlt.js plays a ~150-frame activation cinematic and applies the form at its
    // end — wait for it (no-op on the legacy path)
    for(let n=0;n<240&&!(b._kevin.formUntil>b._kevin.tick);n++)step({}, {},1)
    check('airborne morph preserves used jumps',b._kevin.formUntil>0 && b.jumpCount===2 && !b.onGround,
      {jumpCount:b.jumpCount,position:b.y,active:b._kevin.formUntil})
    b._kevin.formUntil=b._kevin.tick+1;b.y=52;b.vy=-14
    step({}, {},3);check('expiry starts reversion and preserves used jumps',b.currentMove==='kRevert' && b.jumpCount===2)
    step({}, {},34)
    check('timed reversion returns to human art',!b._kevin.reverting&&b._skinAnim.idle.sourceY!==b._skinAnim.kRevert.sourceY)

    ;[a,b]=start()
    a.x=1300;b.x=1363
    step({}, {down:true,special:true});step({}, {}, 34)
    const held=b._kevin.material
    step({grab:true});step({}, {},40)
    check('a successful mirror grab samples the approved coating without mutating its source',
      held==='steel'&&a._kevin.material===held&&b._kevin.material===held&&b.health===b.maxHealth-60,
      {attacker:a._kevin.material,source:b._kevin.material,damage:b.maxHealth-b.health})

    ;[a,b]=start()
    const remote={3:{charge:true,special:true},20:{down:true,special:true},65:{up:true,heavy:true},113:{jump:true},116:{jump:true},125:{special:true}}
    __harness.net.beginMock({localSide:'p1',inputDelay:2,remoteScript:frame=>__harness.replay.encode(remote[frame] || {})})
    const netSeen=new Set()
    for(let i=0;i<181;i++){step();if(b.currentMove)netSeen.add(b.currentMove)}
    check('LAN delayed mask drives P2 chords and air-neutral capture without a local pad',
      ['kApply','up','kMine'].every(x=>netSeen.has(x))&&b._kevin.material==='alloy'&&b._kevinRemoteInput,[...netSeen])
    __harness.net.end()

    ;[a,b]=start()
    const trace=()=>[a,b].map(f=>[f.x,f.y,f.health,f.energy,f.jumpCount,f.currentMove,JSON.stringify(f._kevin),f.skinId])
    for(let i=0;i<480;i++) {
      const p1=i===7?{charge:true,special:true}:i===22?{down:true,special:true}:i===160?{right:true,special:true}:
        i>188&&i<340?{charge:true}:i===349?{ultimate:true}:i===405?{down:true,special:true}:{}
      step(p1,i===4?{special:true}:i===45?{up:true,special:true}:{})
    }
    const recorded=trace(), replay=__harness.replay.stopAndGet()
    const ok=__harness.replay.play(replay)
    __harness.skipToBattle()
    a=H.raw();b=H.raw('p2');setPad({})
    for(let i=0;i<480;i++)__harness.aiVsAi.step(1)
    const played=trace()
    check('recording and playback agree on skins, moves, positions, meters and Kevin state',
      ok.ok&&JSON.stringify(recorded)===JSON.stringify(played),{playback:__harness.replay.playbackState(),recorded,played})
    __harness.replay.stopPlayback()
    return checks
  })
  for(const check of result) console.log(check.ok?'PASS':'FAIL',check.name,check.ok?'':JSON.stringify(check.detail))
  assert.deepEqual(errors,[])
  assert(result.every(item=>item.ok))
} finally {await browser.close()}
