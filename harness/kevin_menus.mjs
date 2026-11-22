import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'

const url=process.env.KEVIN_URL || 'http://127.0.0.1:8000/index.html'
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720}})
const errors=[]
const report={url}
page.on('pageerror',error=>{if(errors.length<6)errors.push(error.stack || error.message)})

const waitState=state=>page.waitForFunction(state=>__harness.state().gameState===state,state,{timeout:25000})
const waitFight=()=>page.waitForFunction(()=>__harness.state().gameState==='battle'&&__harness.state().countdown<=0,null,{timeout:35000})
const menuStatus=()=>page.evaluate(()=>__harness.padMenuState())
async function click(id) {
  const client=await page.evaluate(id=>{
    const r=__harness.ui.currentHoverRects().find(x=>x.id===id)
    if (!r) return null
    const c=document.querySelector('canvas'),b=c.getBoundingClientRect()
    return [b.x+(r.x+r.w/2)*b.width/c.width,b.y+(r.y+r.h/2)*b.height/c.height]
  },id)
  assert(client,'Missing menu card '+id)
  const previous=(await page.evaluate(()=>__harness.state())).gameState
  for(let attempt=0;attempt<5;attempt++) {
    await page.mouse.move(...client)
    await page.waitForTimeout(120)
    await page.mouse.click(...client,{delay:35})
    await page.waitForTimeout(280)
    if((await page.evaluate(()=>__harness.state())).gameState!==previous)break
  }
}
async function universe() {
  const index=await page.evaluate(()=>__harness.kevinTest.universeIndex())
  assert(index>=0,'Ben 10 universe is selectable')
  await page.evaluate(index=>{
    __harness.padNav({up:true})
    for(let i=0;i<12;i++){__harness.padNav({up:true});__harness.padNav({left:true})}
    for(let i=0;i<Math.floor(index/3);i++)__harness.padNav({down:true})
    for(let i=0;i<index%3;i++)__harness.padNav({right:true})
  },index)
  const state=await menuStatus()
  assert.equal(state.idx,index)
  await page.evaluate(()=>__harness.padNav({confirm:true}))
  await waitState('selectCharacter')
}
async function pickKevin() {
  await universe()
  await click('kevin_levin')
  await waitState('selectSkin')
  assert.equal((await menuStatus()).count,12)
}

async function titleToVs() {
  await page.goto(url+'?harness=1',{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>window.__harness?.kevinTest,null,{timeout:25000})
  await page.evaluate(async()=>{const {ensureDefaultAccount}=await import('./account.js');ensureDefaultAccount()})
  await page.waitForTimeout(400)
  await page.evaluate(()=>__harness.padNav({confirm:true}))
  await waitState('mainMenu')
  await click('play')
  await waitState('gameplaySelect')
  await click('pvp')
  await waitState('selectUniverse')
}
async function selectMirror(stage, checkPersistence=false) {
  await titleToVs()
  await pickKevin()
  if(checkPersistence)assert.equal(await page.evaluate(()=>__harness.kevinTest.preferredSkin()),'event_horizon')
  await click('skin1')
  await waitState('selectUniverse')
  await pickKevin()
  if(checkPersistence)assert.equal(await page.evaluate(()=>__harness.kevinTest.preferredSkin()),'glitterstorm')
  await click('skin11')
  await waitState('selectStage')
  const idx=await page.evaluate(stage=>__harness.kevinTest.stages().indexOf(stage),stage)
  assert(idx>=0)
  await click('stage'+idx)
  await page.waitForFunction(()=>__harness.kevinTest.raw()?._lastSpriteAction==='intro',null,{timeout:18000})
  if (process.argv.includes('--screenshots')) await page.screenshot({path:'/tmp/kevin-menu-intro.png'})
  await waitFight()
  const live=await page.evaluate(()=>{
    const H=__harness.kevinTest
    return ['p1','p2'].map(side=>{const f=H.raw(side);return {side,key:f.rosterKey,skin:f.skinId,sheet:f._skinAnim.idle.sheet,drawH:f._lastDrawH}})
  })
  assert.deepEqual(live.map(f=>f.skin),['event_horizon','glitterstorm'])
  assert(live.every(f=>f.key==='kevin_levin'&&f.drawH>0))
  return live
}
async function ko() {
  await page.evaluate(()=>{
    const H=__harness.kevinTest,a=H.raw(),b=H.raw('p2')
    a.energy=0;a.x=1320;b.x=1378
    for (const f of [a,b]) {
      f.y=H.world.floor()-f.h;f.groundY=H.world.floor();f.onGround=f.grounded=true
      f.hitstun=f.blockstun=f.hitstop=f.invulnTimer=f.attackCooldown=0
      f.attacking=false;f.currentAttack=null;f.currentMove=null;f.vx=f.vy=0
    }
    b.health=1
  })
  await page.keyboard.press('k',{delay:100})
}

try {
  report.bright=await selectMirror('Jujutsu High Courtyard')
  if (process.argv.includes('--screenshots')) await page.screenshot({path:'/tmp/kevin-menu-bright.png'})
  await page.evaluate(()=>{const H=__harness.kevinTest;H.raw().energy=100;H.raw().x=1360;H.raw('p2').x=1535})
  await page.keyboard.press('u',{delay:95})
  await page.waitForFunction(()=>{const s=__harness.kevinTest.raw()._kevin;return s?.formUntil>s.tick})
  const pacing=page.evaluate(()=>new Promise(resolve=>{
    const gaps=[]
    let last
    const sample=now=>{
      if(last!=null)gaps.push(now-last)
      last=now
      if(gaps.length<180)requestAnimationFrame(sample)
      else {
        gaps.sort((a,b)=>a-b)
        resolve({samples:gaps.length,median:gaps[90],p95:gaps[170],max:gaps.at(-1),above25:gaps.filter(x=>x>25).length})
      }
    }
    requestAnimationFrame(sample)
  }))
  await page.keyboard.down('d')
  await page.keyboard.press('l',{delay:90})
  await page.keyboard.up('d')
  await page.waitForFunction(()=>{const a=__harness.kevinTest.raw().currentAttack;return a?.name==='kArc'&&a.total-a.timer>=22})
  if (process.argv.includes('--screenshots')) await page.screenshot({path:'/tmp/kevin-menu-arc.png'})
  report.pacing=await pacing
  await ko()
  for(let i=0;i<2;i++) {
    await page.waitForFunction(()=>['battle','victory'].includes(__harness.state().gameState),null,{timeout:30000})
    await page.waitForTimeout(3500)
    if((await page.evaluate(()=>__harness.state())).gameState==='victory')break
    await waitFight()
    await ko()
  }
  await waitState('victory')
  await page.keyboard.press('r')
  await waitFight()
  report.rematch=await page.evaluate(()=>{const H=__harness.kevinTest,f=H.raw();return {skin:f.skinId,hp:f.health,temp:f._kevin?.formUntil || 0}})
  assert.deepEqual(report.rematch,{skin:'event_horizon',hp:1050,temp:0})
  report.dark=await selectMirror('Null Void',true)
  if (process.argv.includes('--screenshots')) await page.screenshot({path:'/tmp/kevin-menu-dark.png'})
  assert.deepEqual(errors,[])
  console.log('PASS browser title, real selection, both mirror palettes, bright/dark stages, morph, KO, rematch, and reload')
} catch(error) {
  report.state=await page.evaluate(()=>__harness?.state())
  await page.screenshot({path:'/tmp/kevin-menu-failure.png'})
  report.menu=await menuStatus()
  throw error
} finally {
  report.errors=errors
  console.log(JSON.stringify(report,null,2))
  if (process.env.KEVIN_MENU_REPORT) fs.writeFileSync(process.env.KEVIN_MENU_REPORT,JSON.stringify(report,null,2)+'\n')
  await browser.close()
}
