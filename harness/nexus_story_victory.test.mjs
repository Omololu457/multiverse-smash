// harness/nexus_story_victory.test.mjs — REAL-PLAYER-PATH regression for the story fight→next-beat handoff.
// The original suites pressed "r" (the one key mapped to "rematch"); a real player presses Enter / Space /
// clicks the primary button — which used to drop them to the title. This drives the ACTUAL player inputs:
// enter Story from the main menu, advance with real keys, and after each of the first 3 fights proceed via a
// DIFFERENT real input (Enter, click CONTINUE, Space), confirming the story continues every time.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1280,height:720}})
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,140)))
let P=0,F=0; const ck=(n,c,d="")=>{(c?P++:F++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`)}
async function wf(n){const s=await pg.evaluate(()=>window.__harness.state().frame);await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:12000,polling:16}).catch(()=>{})}
const gs = () => pg.evaluate(()=>window.__harness.ui.state())
const cs = () => pg.evaluate(()=>window.__harness.ui.cutscene())
const vlabel = () => pg.evaluate(()=>window.__harness.ui.victoryLabel())
const waitState = s => pg.waitForFunction(x=>window.__harness.ui.state()===x, s, {timeout:9000,polling:30}).catch(()=>{})

// Reach the victory screen of the next story fight by advancing beats with REAL key presses.
async function advanceToVictoryAndKO() {
  let guard=0
  while (guard++<120) { const g=await gs(); if (g!=="cutscene") break; await pg.keyboard.press("Space"); await wf(3) }
  await pg.evaluate(()=>window.__harness.skipToBattle?.()); await waitState("battle")
  const p1=await pg.evaluate(()=>window.__harness.p1()?.key), p2=await pg.evaluate(()=>window.__harness.p2()?.key)
  await wf(10); await pg.evaluate(()=>window.__harness.damageP2(99999)); await waitState("victory")
  // wait for the victory screen to finish fading in — clicks are ignored while fadeAlpha < 0.5
  await pg.waitForFunction(()=>window.__harness.ui.victoryLabel().fadeAlpha>=0.6,null,{timeout:6000,polling:16}).catch(()=>{})
  return { p1, p2 }
}

try {
  await pg.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness)
  await pg.mouse.click(640,360); await wf(2)
  await pg.evaluate(()=>{ try{ window.__harness.ui.goto && window.__harness.ui.goto("mainMenu") }catch(_){} }); await wf(2)
  ck("booted to the main menu", (await gs())==="mainMenu", `state=${await gs()}`)

  // REAL click on the STORY MODE button
  const rect = await pg.evaluate(()=>window.__harness.ui.mainMenuRects().find(r=>r.id==="story")||null)
  await pg.mouse.click(rect.x+rect.w/2, rect.y+rect.h/2); await wf(4)
  ck("clicking STORY launches the opening cutscene", (await gs())==="cutscene", `state=${await gs()}`)

  // The three real "proceed" inputs a player might use, one per fight.
  const proceed = [
    { how: "ENTER key",        act: async () => { await pg.keyboard.press("Enter") } },
    { how: "click CONTINUE",   act: async () => { await pg.mouse.click(540, 616) } },   // primary button center (cw/2-180-10 + 90, ch*0.82 + 26)
    { how: "SPACE key",        act: async () => { await pg.keyboard.press("Space") } },
  ]
  for (let i=0;i<3;i++){
    const { p1, p2 } = await advanceToVictoryAndKO()
    const vl = await vlabel()
    ck(`fight ${i+1} (${p1} vs ${p2}) victory shows a CONTINUE prompt (not REMATCH)`, vl.primary==="CONTINUE" && vl.csFight, JSON.stringify(vl))
    const before = await cs()
    await proceed[i].act(); await waitState("cutscene"); await wf(2)
    const after = await cs()
    ck(`fight ${i+1}: proceeding via ${proceed[i].how} returns to the cutscene (story continues)`, (await gs())==="cutscene" && after.active, `state=${await gs()} idx=${after.idx}`)
  }
  ck("story kept progressing across 3 fights (didn't drop out once)", (await gs())==="cutscene")
  // (Non-story victory screens are gated by matchConfig._cutsceneFight in the fix, and are covered directly
  //  by the matchflow / tower / arcade / story-live victory suites in the STAGE-5 regression.)
  ck("no page errors across the real playthrough", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} nexus-story-victory: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
