import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'

const base=process.env.KEVIN_URL || 'http://127.0.0.1:8000/index.html'
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720}})
const browserErrors=[]
page.on('pageerror',e=>browserErrors.push(e.message))
await page.addInitScript(()=>{window.requestAnimationFrame=()=>0})

try {
  await page.goto(base+'?harness=1&p1=kevin_levin&p2=gwen&seed=1349',{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>window.__harness?.kevinTest,null,{timeout:25000})
  await page.evaluate(()=>{__harness.start({mode:'pvp'});__harness.skipToBattle();__harness.aiVsAi.step(1)})
  await page.evaluate(()=>__harness.preloadDone())
  console.log('Game loaded at',base)
  const result=await page.evaluate(async () => {
    const {writeRawControls,inputSettings}=await import('./input.js')
    const {PAD_BUTTON,PAD_DPAD}=await import('./padLayout.js')
    const buttonMap={...PAD_BUTTON,...PAD_DPAD}
    const pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:[]}
    navigator.getGamepads=()=>[pad]
    inputSettings.p2Type='controller'
    const bindPad=raw=>{pad.buttons=Array.from({length:17},()=>({pressed:false,value:0}))
      for(const [key,held] of Object.entries(raw)) if(held&&buttonMap[key]!=null)pad.buttons[buttonMap[key]]={pressed:true,value:1}
    }
    bindPad({})
    const {resolveProjectileHitsMulti}=await import('./combat.js')
    const {kevinHand,kevinState}=await import('./kevinState.js')
    const {KEVIN_MOVES,KEVIN_SKINS,KEVIN_ART,SAMPLE_IDS,KEVIN_RUSH}=await import('./kevinData.js')
    const H=__harness.kevinTest
    const a=H.raw(),b=H.raw('p2'), W=H.world, checks=[],measure=[],routes=[]
    const check=(label,ok,data)=>checks.push({label,ok:!!ok,data})
    function step(ra={},rb={},n=1) {
      for(let i=0;i<n;i++) {
        writeRawControls(a,ra);bindPad(rb)
        __harness.aiVsAi.step(1)
      }
    }
    function reset(distance=61) {
      H.reset();__harness.setRoundTimer(99999);__harness.setDummyBehavior('stand')
      W.projectiles.length=0
      for(const [i,f] of [a,b].entries()) {
        f.health=f.maxHealth;f.energy=100;f.x=1300+i*distance;f.y=W.floor()-f.h;f.groundY=W.floor()
        f.onGround=f.grounded=true;f.vx=f.vy=0;f.facing=i?-1:1;f.hitstun=f.blockstun=f.hitstop=0
        f.invulnTimer=0;f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0
        f.knockdownState=false;f.knockdownTimer=0;f.isGrabbed=false;f.isBlocking=false;f._forceGuard=false
        f.comboCounter=0;f.comboTimer=0;f.jumpCount=0;f.jumpHeld=false;f.juggleCount=0;f.isLaunched=false
        f.dashTimer=f.dashCooldown=0
        writeRawControls(f,{})
      }
      delete a._kevin
      step()
    }
    function press(raw,fireSide='p1') { if(fireSide==='p1') step(raw);else step({},raw);step() }
    function transform(){
      press({ultimate:true})
      step({}, {}, 31)
      check('full meter activation',a._kevin.formUntil>a._kevin.tick && a.energy<1,{move:a.currentMove,form:a._kevin.formUntil,energy:a.energy})
    }
    function coat(id) {
      const i=SAMPLE_IDS.indexOf(id)
      for(let n=0;n<i;n++)press({charge:true,special:true})
      press({down:true,special:true})
      step({}, {}, 35)
      return a._kevin.material
    }
    function isolated(key,input,{ultimate=false,material,distance=61,air=false,targetAir=false}={}) {
      reset(distance)
      if(ultimate) transform()
      if(material) check('Apply '+material,coat(material)===material)
      if(air) {step({up:true,jump:true},targetAir?{up:true,jump:true}:{});step({}, {}, 4)}
      const hp=b.health
      press(input)
      const move=a.currentMove
      const pose=a._skinAnim?.[move]?.frames || 0
      step({}, {}, 96)
      const damage=hp-b.health
      measure.push({form:ultimate?'ultimate':'human',key,raw:KEVIN_MOVES[ultimate?'ultimate':'human'][key]?.throwDamage || ({kQuarry:135,kShards:162})[key] || KEVIN_MOVES[ultimate?'ultimate':'human'][key]?.damage,damage,pose})
      check('dispatch '+key,move===key && pose>0,{move,pose,damage})
      check('damage '+key,damage>0,{damage,pose})
    }
    reset()
    check('Kevin registered',a.rosterKey==='kevin_levin',{key:a.rosterKey})
    check('twelve sourced skin entries',KEVIN_SKINS.length===12 && KEVIN_SKINS.every(s=>s.source))
    for (const [key,raw] of Object.entries({
      light:{light:true},heavy:{heavy:true},kReach:{right:true,heavy:true},up:{upAttack:true},
      kSweep:{down:true,heavy:true},kGrab:{grab:true},kRush:{right:true,special:true},
      kQuarry:{up:true,jump:true,special:true}
    })) isolated(key,raw)
    for(const id of SAMPLE_IDS)isolated(KEVIN_RUSH[id],{right:true,special:true},{material:id,distance:110})
    for(const [key,raw] of Object.entries({
      light:{light:true},heavy:{heavy:true},kReach:{right:true,heavy:true},up:{upAttack:true},
      kSweep:{down:true,heavy:true},kGrab:{grab:true},kArc:{right:true,special:true},
      kHalo:{up:true,jump:true,special:true},kShards:{down:true,special:true}
    })) isolated(key,raw,{ultimate:true})
    isolated('air',{light:true},{air:true,targetAir:true})
    isolated('down_air',{heavy:true},{air:true})
    isolated('air',{light:true},{air:true,targetAir:true,ultimate:true})
    isolated('down_air',{heavy:true},{air:true,ultimate:true})
    isolated('kFurnace',{down:true,special:true},{air:true,ultimate:true})
    isolated('kAirRush',{right:true,special:true},{air:true,targetAir:true})

    reset()
    const order=[]
    for(const id of SAMPLE_IDS) {
      press({down:true,special:true});step({}, {}, 31);order.push(a._kevin.material)
      press({special:true,charge:true})
    }
    check('fresh chords cycle and coatings replace one another',JSON.stringify(order)===JSON.stringify(SAMPLE_IDS),order)
    const selected=a._kevin.selected, energy=a.energy
    step({special:true,charge:true},{},20)
    check('held chord cycles once and consumes special/charge',a._kevin.selected===(selected+1)%6 && a.currentMove==null && a.energy-energy<2,
      {selected:a._kevin.selected,energyDelta:a.energy-energy})
    step()
    check('unsupported field contact leaves stone',a._kevin.material==='stone')
    const stoneUntil=a._kevin.coatUntil
    press({left:true,special:true});step({}, {}, 15)
    check('unsupported field contact does not reset timer',a._kevin.coatUntil===stoneUntil)
    for(const prop of H.contacts()) {
      reset(560);a.x=prop.x-a.w/2;b.x=Math.min(W.stageWidth()-b.w,a.x+140)
      a.ignoreCameraBounds=b.ignoreCameraBounds=true
      press({left:true,special:true});step({}, {}, 26)
      a.ignoreCameraBounds=b.ignoreCameraBounds=false
      check('field prop '+prop.material,a._kevin.material===prop.material,
        {center:a.x+a.w/2,source:prop.x,actual:a._kevin.material})
    }

    function projectile(owner,defender,{capture={family:'mana',raw:92},wrong=false,ultimate=false}={}) {
      const hand=kevinHand(defender,defender.currentAttack?.kevin?.dir || defender.facing)
      const p=W.spawn(owner,'captureProbe',{spawnX:hand.x,spawnY:hand.y,
        vx:wrong?defender.facing*12:-defender.facing*12,w:26,damage:67,isUltimate:ultimate,kevinCapture:capture})
      return p
    }
    function collide(defender=a,owner=b,opts={}) {
      const p=projectile(owner,defender,opts)
      const before=defender.health
      resolveProjectileHitsMulti(W.projectiles,[a,b])
      return {p,damage:before-defender.health,stored:defender._kevin?.stored}
    }
    reset(410)
    press({special:true});step({}, {}, 5)
    let out=collide()
    check('valid shot consumed before contact damage',out.stored?.raw===92 && out.damage===0 && !W.projectiles.includes(out.p))
    const expires=a._kevin.stored?.until
    step({}, {}, 34)
    press({down:true,special:true});step({}, {}, 35)
    check('material does not refresh stored cap',a._kevin.stored?.until===expires)
    press({special:true})
    check('release spends charge at commitment',a.currentMove==='kReturn' && !a._kevin.stored)
    let returned=null,starting=b.health
    for(let i=0;i<65;i++){step();returned ||= W.projectiles.find(p=>p.name==='kReturn')}
    check('return has Kevin ownership and finite lifetime',returned?.owner===a && returned.kevinShot.kind==='mana' &&
      !returned.kevinCapture && starting>b.health,{damage:starting-b.health})
    measure.push({key:'kReturn',raw:101,damage:starting-b.health})

    reset()
    press({special:true});step({}, {}, 5);collide();step({}, {}, 34)
    const beforeThunder=b.health
    press({left:true,heavy:true})
    check('Thunder spends slot on commitment',a.currentMove==='kThunder' && !a._kevin.stored)
    step({}, {}, 52)
    measure.push({key:'kThunder',raw:155,damage:beforeThunder-b.health})
    check('Thunder single damage result',beforeThunder-b.health===93,{damage:beforeThunder-b.health})

    for(const [label,time,options] of [
      ['early',0,{}],['late',17,{}],['receding',6,{wrong:true}],
      ['unsupported',6,{capture:null}],['ultimate',6,{ultimate:true}]
    ]) {
      reset(410);press({special:true});step({}, {}, time)
      out=collide(a,b,options)
      check(label+' shot does not capture',!out.stored,out.damage)
    }
    reset(410);press({special:true});step({}, {}, 5)
    const first=projectile(b,a,{capture:{family:'mana',raw:92}})
    const second=projectile(b,a,{capture:{family:'ki',raw:120}})
    starting=a.health
    resolveProjectileHitsMulti(W.projectiles,[a,b])
    check('simultaneous capture uses resolver order, only one stored',a._kevin.stored?.family==='ki' &&
      !W.projectiles.includes(second) && (a.health<starting || W.projectiles.includes(first)),{damage:starting-a.health})

    reset()
    coat('steel')
    press({right:true,special:true});step({}, {}, 4)
    const steelHp=a.health
    out=collide(a,b,{capture:{family:'star',raw:30}})
    const arm=a.currentAttack?.kevin?.armorSpent
    check('Wrecking Ram absorbs a light interruption but takes damage',arm && a.health<steelHp && a.currentMove==='kSteel')
    let steelFollow=false,heavyDamage=0,steelPhase=0,steelPrev=b.health
    for(let i=0;i<70;i++) {
      const attack=a.currentAttack
      let raw={}
      if(!steelPhase && attack?.kevin?.clean && !a.hitstop) {raw={heavy:true};steelPhase=1}
      step(raw)
      steelFollow ||= a.currentMove==='heavy'
      if(a.currentMove==='heavy'&&b.health<steelPrev)heavyDamage=steelPrev-b.health
      steelPrev=b.health
    }
    routes.push({name:'Armored Wrecking Ram → Heavy',followup:heavyDamage})
    check('Steel real heavy follow-up after an armored rush',steelFollow && heavyDamage>0,{steelFollow,heavyDamage})

    reset(65);transform()
    step({left:true,special:true})
    step({}, {}, 3)
    step({}, {light:true})
    let counter=false
    const beforeCounter=b.health
    for(let i=0;i<36;i++){step();counter ||= a.currentMove==='kRiposte'}
    check('blocking window of claw counter yields a real riposte',counter&&beforeCounter>b.health,
      {counter,damage:beforeCounter-b.health})

    // Real Gwen cast through her shared action path.
    reset(250)
    let gwenShot
    press({special:true},'p2')
    for(let i=0;i<32;i++){step();gwenShot ||= W.projectiles.find(p=>p.name==='gwenBolt')}
    check('actual Gwen Mana Bolt exports normalized capture metadata',gwenShot?.kevinCapture?.raw===92,gwenShot?.kevinCapture)
    reset(340)
    step({}, {special:true})
    let catching=false
    for(let i=0;i<75;i++){
      const mana=W.projectiles.find(p=>p.name==='gwenBolt')
      const delta=mana?mana.x-kevinHand(a).x:Infinity
      const fire=!catching&&delta>=70&&delta<=105
      catching ||= fire
      step(fire?{special:true}:{})
    }
    check('genuine Mana Bolt enters the slot through game-loop collision',a._kevin.stored?.family==='mana'&&a.health===a.maxHealth,
      {catching,stored:a._kevin.stored,hp:a.health})

    reset()
    const seq=[]
    const hp=b.health
    let old=hp,phase=0
    for(let tick=0;tick<90;tick++) {
      let raw={}
      const attack=a.currentAttack
      if(phase===0){raw.light=true;phase++}
      else if(phase===1 && attack?.name==='light' && attack.kevin?.clean && !a.hitstop){raw.light=true;phase++}
      else if(phase===2 && attack?.name==='kLight2' && attack.kevin?.clean && !a.hitstop){raw.light=true;phase++}
      const stun=b.hitstun
      step(raw)
      if(b.health<old){seq.push({tick,move:a.currentMove,damage:old-b.health,stun});old=b.health}
    }
    routes.push({name:'Three light presses',damage:hp-b.health,hits:seq})
    check('three-hit chain retains previous hitstun',seq.length===3 && seq.slice(1).every(h=>h.stun>0),seq)

    for(const [label,opener,material] of [
      ['Launcher → jump → air',{upAttack:true},null],
      ['Green Machine → launcher → air',{right:true,special:true},'alloy'],
      ['Ricochet Riot → Air Light → Drop',{right:true,special:true},'rubber']
    ]) {
      reset()
      if(material) coat(material)
      let prev=b.health, phase=0, jumpAt=-99
      const hits=[], moves=new Set()
      for(let tick=0;tick<105;tick++) {
        const stun=b.hitstun, attack=a.currentAttack
        const clean=attack?.kevin?.clean && !a.hitstop
        let raw={}
        if(tick===0)raw=opener
        if(material==='alloy' && phase===0 && clean && attack.name==='kAlloy') {raw={upAttack:true};phase=1}
        else if(material==='rubber' && phase===0 && clean && attack.name==='kRubber') {raw={light:true};phase=1}
        else if(material==='rubber' && phase===1 && clean && attack.name==='air') {raw={heavy:true};phase=2}
        else if(material!=='rubber' && phase<2 && clean && attack.name==='up') {
          raw={up:true,jump:true};phase=2;jumpAt=tick
        } else if(phase===2 && tick===jumpAt+1) {raw={light:true};phase=3}
        step(raw)
        if(a.currentMove)moves.add(a.currentMove)
        if(b.health<prev){hits.push({tick,move:a.currentMove,damage:prev-b.health,stun});prev=b.health}
      }
      routes.push({name:label,hits,moves:[...moves]})
    }

    reset()
    let state=kevinState(a)
    a.health=721
    state.stored={family:'ki',raw:120,until:state.tick+480}
    const x0=a.x, shotEnd=state.stored.until
    transform()
    check('morph preserves HP, ground X, and original shot expiry',a.health===721&&a.x===x0&&state.stored?.raw===120&&state.stored.until===shotEnd)
    const cashHP=b.health
    press({ultimate:true})
    step({}, {}, 100)
    check('cash-out hits once then reverts',cashHP-b.health>=200 && a._kevin.formUntil===0 && !a._kevin.cinematic,
      {damage:cashHP-b.health,action:a.currentMove})
    measure.push({key:'kCash early',damage:cashHP-b.health})
    reset(400);transform();press({ultimate:true});step({}, {}, 105)
    check('cash-out whiff spends form',!a._kevin.formUntil && b.health===b.maxHealth && !a._kevin.cinematic)
    reset();transform();step({}, {block:true},10);step({ultimate:true},{block:true},1);step({}, {block:true},80)
    check('cash-out block does not start cinematic',b.health>950 && !a._kevin.cinematic && !a._kevin.formUntil,{hp:b.health})
    reset(450);transform();step({}, {}, 738)
    check('form times out and ends',a._kevin.formUntil===0 && !a._kevin.cinematic && a.health===a.maxHealth)

    const signatures=[]
    for(const {id} of KEVIN_SKINS) {
      reset();__harness.setSkin('p1',id)
      const hp0=b.health
      press({heavy:true});step({}, {}, 47)
      const human=[b.health-hp0,a.x,a.energy,a.jumpCount,a.attackCooldown]
      reset();coat('stone')
      press({right:true,special:true});step({}, {}, 65)
      const coated=[b.health,a.x,a.energy,a.jumpCount,a._kevin.material,a._kevin.coatUntil]
      reset();press({ultimate:true});step({}, {}, 32)
      press({right:true,special:true});step({}, {}, 65)
      const mutant=[b.health,a.x,a.energy,a.jumpCount,a._kevin.formUntil]
      signatures.push([human,coated,mutant])
      check('registered atlas '+id,!!KEVIN_ART[id].ultimate.kArc.sheet && a.skinId===id)
    }
    check('all skins give identical simulated outcomes',new Set(signatures.map(JSON.stringify)).size===1,signatures)
    reset();transform();a._kevin.formUntil=a._kevin.tick+6
    const lateHP=b.health
    press({ultimate:true});step({}, {}, 101)
    const lateDamage=lateHP-b.health
    check('near-expiry cash-out deals about 180 raw',lateDamage>=108&&lateDamage<=110,{lateDamage})
    measure.push({key:'kCash late',damage:lateDamage})
    reset();transform();b.health=15;press({ultimate:true});step({}, {}, 70)
    check('cash-out resolves KO',b.health===0,{hp:b.health,cinematic:a._kevin?.cinematic})
    for(const stage of H.stages().filter(name=>name!=='Battle Royale Colosseum')) {
      __harness.start({mode:'training',stage})
      __harness.skipToBattle()
      const fighter=H.raw()
      fighter.energy=100
      const frame=(raw={},n=1)=>{for(let i=0;i<n;i++){writeRawControls(fighter,raw);__harness.aiVsAi.step(1)}}
      frame()
      const obtained=[]
      for(const id of SAMPLE_IDS){
        frame({down:true,special:true});frame({},36)
        obtained.push(fighter._kevin.material)
        frame({right:true,special:true})
        if(fighter.currentMove!==KEVIN_RUSH[id])obtained.push('bad-rush')
        frame({},85)
        frame({charge:true,special:true});frame({},2)
      }
      check('all samples and signatures reachable on '+stage,JSON.stringify(obtained)===JSON.stringify(SAMPLE_IDS),obtained)
    }
    __harness.ffaStart(3,['kevin_levin','gwen','kevin_levin'])
    const [wide]=H.world.fighters(), wideStage=__harness.ffaInfo().stage
    wide.energy=100
    const wideFrame=(raw={},n=1)=>{for(let i=0;i<n;i++){writeRawControls(wide,raw);__harness.aiVsAi.step(1)}}
    const wideObtained=[]
    for(const id of SAMPLE_IDS) {
      wideFrame({down:true,special:true});wideFrame({},36)
      wideObtained.push(wide._kevin.material)
      const dir=wide.facing===-1?'left':'right'
      wideFrame({[dir]:true,special:true})
      if(wide.currentMove!==KEVIN_RUSH[id])wideObtained.push('bad-rush')
      wideFrame({},85)
      wideFrame({charge:true,special:true});wideFrame({},2)
    }
    check('all samples and signatures reachable on '+wideStage,
      wideStage==='Battle Royale Colosseum'&&JSON.stringify(wideObtained)===JSON.stringify(SAMPLE_IDS),wideObtained)
    return {checks,measure,routes}
  })
  for(const {label,ok,data} of result.checks) if(!ok) console.log('FAIL',label,JSON.stringify(data))
  console.log(JSON.stringify({passed:result.checks.filter(r=>r.ok).length,failed:result.checks.filter(r=>!r.ok).length,
    measures:result.measure,routes:result.routes,browserErrors},null,2))
  if(process.env.KEVIN_REPORT)fs.writeFileSync(process.env.KEVIN_REPORT,JSON.stringify({...result,browserErrors},null,2)+'\n')
  assert.deepEqual(browserErrors,[])
  assert(result.checks.every(r=>r.ok))
} finally { await browser.close() }
