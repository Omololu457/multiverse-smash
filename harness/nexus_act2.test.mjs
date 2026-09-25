// harness/nexus_act2.test.mjs — Story Mode ACT 2 (THE SHRINKING GROUND) specific verification.
// Walks Prologue→Act 1→Act 2, KOing each fight, and confirms Act 2's beats + its 7 real fights fire in
// order with the right matchups (gojo/sukuna, toji/sukuna, vegeta/frieza, saitama/beerus, genos/deathstroke,
// ichigo/frieza, omololu/rickPrime). Captures 2 Act-2 fights + 2 Act-2 cutscene beats for the report.
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
const settle = () => pg.waitForFunction(()=>{const c=window.__harness.ui.cutscene();return c.fade<=0.02 && c.fullyRevealed},null,{timeout:8000,polling:16}).catch(()=>{})

const EXPECT = [["genos","ichigo"],["omololu","obito"],["gojo","sukuna"],["toji","sukuna"],["vegeta","frieza"],["saitama","beerus"],["genos","deathstroke"],["ichigo","frieza"],["omololu","rickPrime"]]
try {
  await pg.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness); await pg.mouse.click(640,360)
  await pg.evaluate(()=>window.__harness.ui.startNexus()); await wf(3)

  const seen = []            // matchups in order
  let capA2Dialogue=false, capA2Narr=false, guard=0
  while (guard++ < 340) {
    const g = await gs()
    if (g === "storyMode") break
    if (g !== "cutscene") {                                   // a fight launched
      await pg.evaluate(()=>window.__harness.skipToBattle?.())
      await pg.waitForFunction(()=>window.__harness.ui.state()==="battle",null,{timeout:9000,polling:30}).catch(()=>{})
      const p1 = await pg.evaluate(()=>window.__harness.p1()?.key), p2 = await pg.evaluate(()=>window.__harness.p2()?.key)
      seen.push([p1,p2])
      await wf(16)
      // capture two of the NEW Act 2 fights for the report
      if (p1==="gojo" && p2==="sukuna") await shot("NEXUS_A2_fight_gojo_sukuna.png")
      if (p1==="vegeta" && p2==="frieza") await shot("NEXUS_A2_fight_vegeta_frieza.png")
      await pg.evaluate(()=>{ window.__harness.damageP2(99999) })
      await pg.waitForFunction(()=>window.__harness.ui.state()==="victory",null,{timeout:9000,polling:30}).catch(()=>{})
      await pg.keyboard.press("r")
      await pg.waitForFunction(()=>window.__harness.ui.state()==="cutscene",null,{timeout:9000,polling:30}).catch(()=>{})
      continue
    }
    const c = await cs()
    // capture an Act 2 dialogue two-char beat (idx≥33 = after "ACT II" title) + an Act 2 narration/character beat
    if (!capA2Dialogue && c.idx>=33 && c.left && c.right) { await adv(); await settle(); await shot("NEXUS_A2_beat_dialogue.png"); capA2Dialogue=true; await adv(); await wf(2); continue }
    if (!capA2Narr && c.idx>=33 && c.speaker==="RICK PRIME" && c.left==="rickPrime" && !c.right) { await adv(); await settle(); await shot("NEXUS_A2_beat_rickprime.png"); capA2Narr=true; await adv(); await wf(2); continue }
    await adv(); await wf(2); await adv(); await wf(2)
  }

  ck("reached the end (→ chapter map)", (await gs())==="storyMode", `final=${await gs()}`)
  ck("exactly 9 fights fired (Act 1: 2 + Act 2: 7)", seen.length===9, `count=${seen.length}`)
  const order = seen.map(m=>m.join("/")).join(", ")
  const matchOk = seen.length===EXPECT.length && EXPECT.every((e,i)=>seen[i] && seen[i][0]===e[0] && seen[i][1]===e[1])
  ck("fights fired in the right matchups + order", matchOk, order)
  ck("Act 2 fight gojo vs sukuna captured", fs.existsSync(path.join(OUT,"NEXUS_A2_fight_gojo_sukuna.png")))
  ck("Act 2 fight vegeta vs frieza captured", fs.existsSync(path.join(OUT,"NEXUS_A2_fight_vegeta_frieza.png")))
  ck("Act 2 two-character dialogue beat captured", capA2Dialogue)
  ck("Act 2 Rick Prime beat captured", capA2Narr)
  ck("no page errors across the Act 2 playthrough", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} nexus-act2: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
