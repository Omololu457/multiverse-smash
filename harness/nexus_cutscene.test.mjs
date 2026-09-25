// harness/nexus_cutscene.test.mjs — Story Mode cutscene engine + THE NEXUS FRACTURE (Prologue + Act 1).
// Plays the whole scene start→finish: verifies narration-only / one-char / two-char beats, camera zoom,
// input-advance, the TWO real fights launch + return to the aftermath beat, and the end lands on the map.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const br=await chromium.launch(); const pg=await br.newPage({viewport:{width:1280,height:720}})
const errs=[]; pg.on("pageerror",e=>errs.push(String(e).slice(0,140)))
let P=0,F=0; const ck=(n,c,d="")=>{(c?P++:F++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`)}
async function wf(n){const s=await pg.evaluate(()=>window.__harness.state().frame);await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:12000,polling:16}).catch(()=>{})}
const cs = () => pg.evaluate(()=>window.__harness.ui.cutscene())
const adv = () => pg.evaluate(()=>window.__harness.ui.cutsceneAdvance())
const gs = () => pg.evaluate(()=>window.__harness.ui.state())
const shot = f => pg.screenshot({ path: path.join(OUT, f) })

try {
  await pg.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness); await pg.mouse.click(640,360)
  await pg.evaluate(()=>window.__harness.ui.startNexus()); await wf(3)
  let c = await cs()
  ck("cutscene started at beat 0", c.active && c.idx===0 && c.gameState==="cutscene", JSON.stringify({idx:c.idx,gs:c.gameState}))
  ck("beat 0 is NARRATION-only (no speaker, no character)", c.speaker==="" && !c.left && !c.right, JSON.stringify({speaker:c.speaker,left:c.left}))
  await adv(); await wf(30); await shot("NEXUS_beat0_narration.png")   // let it fully reveal, capture narration-only

  // Walk the whole thing, capturing key beat types + handling the 2 fights.
  const seen = { narration:0, oneChar:0, twoChar:0, zoom:0, fights:0 }
  let capturedZoom=false, capturedTwo=false, fightShotDone=false, guard=0
  while (guard++ < 120) {
    const g = await gs()
    if (g === "storyMode") break                                   // reached the end → chapter map
    if (g !== "cutscene") {                                        // a cutscene FIGHT launched (intro → battle)
      seen.fights++
      await pg.evaluate(()=>window.__harness.skipToBattle?.())      // collapse intro/countdown → battle
      await pg.waitForFunction(()=>window.__harness.ui.state()==="battle",null,{timeout:9000,polling:30}).catch(()=>{})
      const p1 = await pg.evaluate(()=>window.__harness.p1()?.key), p2 = await pg.evaluate(()=>window.__harness.p2()?.key)
      ck(`fight ${seen.fights} launched a REAL match (${p1} vs ${p2})`, !!p1 && !!p2, `p1=${p1} p2=${p2}`)
      await wf(16)
      if (!fightShotDone) { await shot("NEXUS_fight_genos_ichigo.png"); fightShotDone=true }
      await pg.evaluate(()=>{ window.__harness.damageP2(99999) })   // KO the opponent → single-round match over
      await pg.waitForFunction(()=>window.__harness.ui.state()==="victory",null,{timeout:9000,polling:30}).catch(()=>{})
      await pg.keyboard.press("r")                                   // victory "continue" → resume cutscene
      await pg.waitForFunction(()=>window.__harness.ui.state()==="cutscene",null,{timeout:9000,polling:30}).catch(()=>{})
      const back = await cs()
      ck(`fight ${seen.fights} RETURNED to a cutscene aftermath beat`, back.active && back.gameState==="cutscene" && back.idx===back.fightReturnIdx, JSON.stringify({idx:back.idx,ret:back.fightReturnIdx}))
      continue
    }
    // cutscene beat: classify + capture
    c = await cs()
    if (c.speaker==="" && !c.left && !c.right) seen.narration++
    else if (c.left && c.right) seen.twoChar++
    else if (c.left || c.right) seen.oneChar++
    if (c.cam==="zoom") seen.zoom++
    // capture a two-character beat + a zoom beat once (with full text)
    if (c.left && c.right && !capturedTwo) { await adv(); await wf(20); await shot("NEXUS_two_character.png"); capturedTwo=true; await adv(); await wf(2); continue }
    if (c.cam==="zoom" && (c.left||c.right) && !capturedZoom) { await adv(); await wf(60); await shot("NEXUS_camera_zoom.png"); capturedZoom=true; await adv(); await wf(2); continue }
    // advance this beat (reveal, then next)
    await adv(); await wf(2); await adv(); await wf(3)
  }
  ck("playthrough reached the end (→ chapter map)", (await gs())==="storyMode", `final=${await gs()}`)
  ck("saw beat variety: narration + one-char + two-char", seen.narration>=3 && seen.oneChar>=3 && seen.twoChar>=3, JSON.stringify(seen))
  ck("BOTH real fights triggered + returned", seen.fights===2, `fights=${seen.fights}`)
  ck("captured a zoom beat + a two-character beat", capturedZoom && capturedTwo)
  ck("no page errors across the whole playthrough", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} nexus-cutscene: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
