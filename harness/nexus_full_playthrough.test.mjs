// harness/nexus_full_playthrough.test.mjs — FULL Story Mode, REAL-PLAYER path, start to finish.
// Prologue → Act 1 → Act 2 → Act 3 → Epilogue/post-credits. Enters Story from the main menu with a real
// click, advances every beat with a real SPACE press, and proceeds past every victory with a real ENTER.
// The only harness shortcut is resolving each fight (skipToBattle + KO) — auto-winning 17 fights by hand is
// not feasible, and the transitions (advance + victory→next-beat) are exactly what's driven by real input.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1280,height:720}})
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,140)))
let P=0,F=0; const ck=(n,c,d="")=>{(c?P++:F++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`)}
async function wf(n){const s=await pg.evaluate(()=>window.__harness.state().frame);await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:12000,polling:16}).catch(()=>{})}
const gs = () => pg.evaluate(()=>window.__harness.ui.state())
const cs = () => pg.evaluate(()=>window.__harness.ui.cutscene())
const waitState = s => pg.waitForFunction(x=>window.__harness.ui.state()===x, s, {timeout:9000,polling:30}).catch(()=>{})
const shot = f => pg.screenshot({ path: path.join(OUT, f) })

try {
  await pg.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness)
  await pg.mouse.click(640,360); await wf(2)
  await pg.evaluate(()=>{ try{ window.__harness.ui.goto && window.__harness.ui.goto("mainMenu") }catch(_){} }); await wf(2)
  ck("booted to main menu", (await gs())==="mainMenu", `state=${await gs()}`)
  const rect = await pg.evaluate(()=>window.__harness.ui.mainMenuRects().find(r=>r.id==="story")||null)
  await pg.mouse.click(rect.x+rect.w/2, rect.y+rect.h/2); await wf(4)
  ck("STORY click → opening cutscene", (await gs())==="cutscene")
  const total = (await cs()).total
  ck("full scene loaded (129 beats)", total===129, `total=${total}`)

  const fights = []          // matchups in order
  let epilogueShot=false, bossShot=false, guard=0
  while (guard++ < 700) {
    const g = await gs()
    if (g === "storyMode") break                                   // reached the end (chapter map)
    if (g !== "cutscene") {                                         // a fight launched
      await pg.evaluate(()=>window.__harness.skipToBattle?.()); await waitState("battle")
      const p1=await pg.evaluate(()=>window.__harness.p1()?.key), p2=await pg.evaluate(()=>window.__harness.p2()?.key)
      fights.push([p1,p2]); await wf(14)
      if (!bossShot && fights.length===17 && p1==="omololu" && p2==="rickPrime") { await shot("NEXUS_final_boss.png"); bossShot=true }   // Scene 17 final boss
      await pg.evaluate(()=>window.__harness.damageP2(99999)); await waitState("victory")
      await pg.waitForFunction(()=>window.__harness.ui.victoryLabel().fadeAlpha>=0.5,null,{timeout:6000,polling:16}).catch(()=>{})
      await pg.keyboard.press("Enter"); await waitState("cutscene"); await wf(2)   // REAL proceed
      continue
    }
    const c = await cs()
    if (c.idx === total-1 && !epilogueShot) {                       // the closing "to be continued" beat
      await pg.keyboard.press("Space"); await wf(30); await shot("NEXUS_epilogue_closing.png"); epilogueShot=true
    }
    await pg.keyboard.press("Space"); await wf(3)                   // REAL advance
  }

  ck("played through to the end (→ chapter map)", (await gs())==="storyMode", `final=${await gs()}`)
  ck("all 17 fights fired via the real player path", fights.length===17, `count=${fights.length}`)
  const order = fights.map(m=>m.join("/")).join(", ")
  const act3 = ["vegeta/frieza","gojo/sukuna","batman/deathstroke","beerus/madara","naruto/madara","superman/frieza","saitama/goku_black","omololu/rickPrime"]
  const act3ok = act3.every((m,i)=>fights[9+i] && fights[9+i].join("/")===m)
  ck("Act 3 fights fired in the right matchups + order", act3ok, "Act3 = " + fights.slice(9).map(m=>m.join("/")).join(", "))
  ck("final boss is omololu vs rickPrime (17th)", fights[16] && fights[16].join("/")==="omololu/rickPrime")
  ck("captured the final boss fight", bossShot)
  ck("captured the epilogue closing beat", epilogueShot)
  ck("no page errors across the entire playthrough", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} nexus-full-playthrough: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
