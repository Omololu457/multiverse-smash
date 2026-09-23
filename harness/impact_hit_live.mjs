// harness/impact_hit_live.mjs — IMPACT HIT (obito prototype). Verifies the bidirectional trigger (exact
// killing-blow-move match), the black→red→white phase cascade, the tight zoom, the standalone/Brutality
// handoff, and captures frame-exact screenshots of each phase for BOTH directions (obito kills / is killed).
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}})
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)))
let PASS=0,FAIL=0
const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`) }
const section=t=>console.log(`\n── ${t} ─────────────────────────────`)
const H=(f,...a)=>page.evaluate(([fn,args])=>window.__harness.brutality[fn](...args),[f,a])   // Impact Hit hooks live under __harness.brutality.*
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{})}
async function boot(p1,p2){
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360)
  await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle())
  try{await page.waitForFunction(()=>window.__harness.spriteReady("p1")?.ready===true,null,{timeout:9000,polling:50})}catch(_){}
  await page.evaluate(()=>window.__harness.setDummyBehavior?.("stand"))
  await page.evaluate(()=>{ window.__harness.setP1X(1500); window.__harness.setP2X(1590); }); await wf(30)
}
async function shots(dirName){
  for (const ph of ["black","red","white","hold"]) {
    await H("debugImpactHit", "p1", ph); await page.evaluate(()=>{ window.__harness.setP1X(1500); window.__harness.setP2X(1590); }); await wf(2)
    const st = await H("impactHit")
    await page.screenshot({ path: path.join(OUT, `IMPACTHIT_${dirName}_${ph==="hold"?"final":ph}.png`) })
    console.log(`    ${dirName}/${ph}: active=${st.active} phase=${st.phase} liveZoom=${st.liveZoom}`)
  }
  await H("debugImpactHit","p1","off")
}

try {
  section("TRIGGER — bidirectional, EXACT move match (obito's Kamui Dimension)")
  await boot("obito","goku")
  const A = await H("impactHitTrigger", "p1", "obitoKamuiDimension")   // obito LANDS the kill with the trigger move
  check("obito LANDS Kamui Dimension kill → Impact Hit fires", A.impactHit === true && A.winnerSide === "p1", JSON.stringify(A))
  await H("debugImpactHit","p1","off")
  const wrong = await H("impactHitTrigger", "p1", "obitoRod1")         // obito kills with a DIFFERENT move
  check("obito kills with a NON-trigger move → NO Impact Hit (exact match)", wrong.impactHit === false, JSON.stringify(wrong))
  check("obito with no real Brutality entry → NO KLASSIC brutality either (standalone)", wrong.brutalityInstead === false)
  await H("debugImpactHit","p1","off")

  await boot("goku","obito")
  const B = await H("impactHitTrigger", "p1", "gokuKamehameha")        // obito is KILLED by the opponent
  check("obito IS KILLED (any move) → Impact Hit fires", B.impactHit === true && B.loserSide === "p2", JSON.stringify(B))
  await H("debugImpactHit","p1","off")

  await boot("goku","sasuke")
  const none = await H("impactHitTrigger", "p1", "gokuKamehameha")     // no obito involved
  check("no obito involved → NO Impact Hit", none.impactHit === false, JSON.stringify(none))
  await H("debugImpactHit","p1","off")

  section("PHASE CASCADE + tight zoom (frame-exact, held)")
  await boot("obito","goku")
  const zPre = (await H("impactHit")).liveZoom
  const phz = {}, spr = {}
  const readSprites = () => page.evaluate(() => { const f = window.__harness.impactFrame(); return { p1: f.p1, p2: f.p2, p1Filter: f.p1Filter, p2Filter: f.p2Filter } })
  for (const ph of ["black","red","white"]) { await H("debugImpactHit","p1",ph); await wf(2); phz[ph] = await H("impactHit"); spr[ph] = await readSprites() }
  check("black/red/white phases hold as set", phz.black.phase==="black" && phz.red.phase==="red" && phz.white.phase==="white")
  check("camera hard-zooms tight during Impact Hit (≥1.5, tighter than pre)", phz.black.liveZoom >= 1.5 && phz.black.liveZoom > zPre, `pre=${zPre} in=${phz.black.liveZoom}`)
  // FIX #1: the SPRITES (both fighters) recolor via the Black-Flash impact-frame system, phase-tagged, every phase.
  const bothTagged = ph => spr[ph].p1 && spr[ph].p2 && spr[ph].p1.phase === ph && spr[ph].p2.phase === ph && spr[ph].p1.tier === "impacthit"
  check("BOTH sprites carry the impact-frame recolor, phase-tagged, in black/red/white", bothTagged("black") && bothTagged("red") && bothTagged("white"), JSON.stringify(spr.red))
  check("sprite recolor routes through the posterize path (reused Black-Flash system)", /posterize/.test(spr.black.p1Filter||"") && /posterize/.test(spr.white.p2Filter||""), `p1=${spr.black.p1Filter} p2=${spr.white.p2Filter}`)
  await H("debugImpactHit","p1","off")
  const cleared = await readSprites()
  check("recolor CLEARS when Impact Hit ends (no bleed into victory/Brutality)", !cleared.p1 && !cleared.p2, JSON.stringify(cleared))

  section("FRAME-EXACT SCREENSHOTS — Obito LANDS the kill (obito = p1)")
  await boot("obito","goku"); await shots("kills")
  section("FRAME-EXACT SCREENSHOTS — Obito is KILLED (obito = p2)")
  await boot("goku","obito"); await shots("killed")

  check("no page JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} impact-hit-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
