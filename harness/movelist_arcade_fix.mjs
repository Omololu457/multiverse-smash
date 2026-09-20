// harness/movelist_arcade_fix.mjs — two playtest bug fixes:
//  (1) MOVE LIST ("controls") screen: the BACK button was unclickable (off-screen fighter rows overlapped
//      it and swallowed the click → players stuck) and the roster/kit didn't scroll. Now BACK is tested
//      first, rows are hit-tested only within the scrolled viewport, and the list + kit panel scroll.
//  (2) ARCADE energy: a leftover match modifier (e.g. Tower's "Meter Drain") persisted onto every arcade
//      fight because applyArcadeFight never cleared modifiers → 0.5/frame drain ≫ regen ("lose all energy,
//      can't regain"). applyArcadeFight now clears modifiers, so arcade always runs clean.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" }
const server = await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720}})
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)))
let PASS=0,FAIL=0
const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`) }
const section=t=>console.log(`\n── ${t} ─────────────────────────────`)
const H=(f,...a)=>page.evaluate(([fn,args])=>window.__harness[fn](...args),[f,a])
const gs=()=>page.evaluate(()=>window.__harness.state().gameState)
const mls=()=>page.evaluate(()=>window.__harness.moveListState())
const modifiers=()=>page.evaluate(()=>window.__harness.modifiers())
const energy=()=>page.evaluate(()=>{const s=window.__harness.p1&&window.__harness.p1();return s?.energy})
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{})}
const canvasSize=()=>page.evaluate(()=>{const c=document.querySelector("canvas");return {w:c.width,h:c.height}})
// click a CANVAS-space point (maps through the canvas' displayed rect so scaling doesn't matter)
async function clickCanvas(cx,cy){
  const b=await page.evaluate(()=>{const c=document.querySelector("canvas");const r=c.getBoundingClientRect();return{left:r.left,top:r.top,dw:r.width,dh:r.height,cw:c.width,ch:c.height}})
  await page.mouse.click(b.left+(cx/b.cw)*b.dw, b.top+(cy/b.ch)*b.dh)
}
async function moveCanvas(cx,cy){
  const b=await page.evaluate(()=>{const c=document.querySelector("canvas");const r=c.getBoundingClientRect();return{left:r.left,top:r.top,dw:r.width,dh:r.height,cw:c.width,ch:c.height}})
  await page.mouse.move(b.left+(cx/b.cw)*b.dw, b.top+(cy/b.ch)*b.dh)
}
async function toBattle(){ for(let i=0;i<40;i++){ const g=await gs(); if(g==="arcadeRivalIntro"){await H("arcadeAdvance");await wf(2);continue} if(g==="intro"){await page.evaluate(()=>{try{window.__harness.skipToBattle()}catch(e){}});await wf(2);continue} if(g==="battle")return true; await wf(3) } return false }

try {
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"})
  await page.waitForFunction(()=>!!window.__harness)
  await page.mouse.click(640,360)
  const { h } = await canvasSize()
  const backCx = 24+75, backCy = h-64+22   // BACK button center (getMoveListButtons: x24 y h-64 w150 h44)

  section("MOVE LIST — BACK button is clickable (was stuck)")
  await H("showMoveList",0,false); await wf(4)
  check("entered MOVE LIST", (await gs())==="moveList", `state=${await gs()}`)
  const st0 = await mls()
  check("roster overflows the viewport → list is scrollable (listMax > 0)", st0.listMax > 0, `listMax=${st0.listMax} count=${st0.fighterCount}`)
  await clickCanvas(backCx, backCy); await wf(3)
  check("clicking BACK returns to the MAIN MENU (no longer stuck)", (await gs())==="mainMenu", `state=${await gs()}`)

  section("MOVE LIST — scrollable, and BACK still works after scrolling")
  await H("showMoveList",0,false); await wf(4)
  await moveCanvas(180, 300)            // pointer over the fighter list column
  await page.mouse.wheel(0, 600); await wf(3)
  const st1 = await mls()
  check("wheel scrolls the fighter list down", st1.scroll > 0, `scroll=${st1.scroll}`)
  check("scroll is clamped to listMax", st1.scroll <= st1.listMax + 0.5, `scroll=${st1.scroll} max=${st1.listMax}`)
  await clickCanvas(backCx, backCy); await wf(3)
  check("BACK still works while scrolled (off-screen rows don't eat the click)", (await gs())==="mainMenu", `state=${await gs()}`)

  section("MOVE LIST — CONTROLS panel (how-to-specials) reachable + BACK works there too")
  await H("showMoveList",0,false); await wf(3)
  const ctlCx = 1280-24-100, ctlCy = h-64+22   // CONTROLS button center (right side)
  await clickCanvas(ctlCx, ctlCy); await wf(3)
  check("CONTROLS toggle shows the controls panel", (await mls()).showControls === true, `showControls=${(await mls()).showControls}`)
  await clickCanvas(backCx, backCy); await wf(3)
  check("BACK from the controls view returns to MAIN MENU", (await gs())==="mainMenu")

  section("ARCADE — a leftover modifier no longer drains energy across fights")
  await H("arcadeStart","naruto","adaptive"); await wf(3); await toBattle()
  await H("setModifiers",["meterDrain"])   // simulate a leftover Tower modifier on the run
  check("fight 1: meterDrain is (artificially) active", (await modifiers()).p1?.meterDrain === true)
  await H("forceP1Win"); await wf(6); await H("arcadeContinue"); await wf(3); await toBattle()
  const m2 = await modifiers()
  check("fight 2: applyArcadeFight CLEARED the modifier (no leak)", (m2.active||[]).length === 0 && m2.p1?.meterDrain === false, `active=${JSON.stringify(m2.active)} drain=${m2.p1?.meterDrain}`)
  const eA = await energy(); await wf(180); const eB = await energy()
  check("fight 2: energy REGENERATES (no drain)", (eB - eA) > 5, `${eA?.toFixed(1)} → ${eB?.toFixed(1)} (Δ ${((eB||0)-(eA||0)).toFixed(1)})`)

  check("no page JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} movelist-arcade-fix: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
