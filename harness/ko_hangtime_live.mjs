// harness/ko_hangtime_live.mjs — STAGE 2: a brief HARD freeze-frame on a normal (non-Brutality)
// match-ending KO, held BEFORE the existing slow-mo ragdoll. Verifies the freeze arms, is short,
// holds the sim (combat frozen while it counts down), and hands off to the slow-mo hang (no double-stack).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" }
const server = await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width:1280,height:720}})
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)))
let PASS=0,FAIL=0
const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`) }
const H=(f,...a)=>page.evaluate(([fn,args])=>window.__harness[fn](...args),[f,a])
const ko=()=>page.evaluate(()=>window.__harness.koBeat())
const p2x=()=>page.evaluate(()=>{const p=window.__harness.p2&&window.__harness.p2();return p?.x})
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{})}

try {
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"})
  await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360)
  await page.evaluate(()=>window.__harness.bootVs())   // real VS match (training mode skips checkRoundEnd → no KO)
  try{await page.waitForFunction(()=>window.__harness.spriteReady("p1")?.ready===true,null,{timeout:15000,polling:50})}catch(_){}
  await wf(4)

  console.log("── Drive a real match-ending KO (finishing blow) ──")
  const b0 = await ko()
  check("no KO beat mid-fight (freeze idle)", b0.freeze === 0 && b0.beatFired === false, JSON.stringify(b0))
  await page.evaluate(()=>{ const h=window.__harness.p2().health; window.__harness.damageP2(Math.max(0, h-6)); })   // leave a sliver — one clean hit finishes it
  const px = await page.evaluate(()=>window.__harness.p1().x)
  await page.evaluate((x)=>window.__harness.setP2X(x+44), px)       // adjacent so the light connects
  // land light hits until p2 drops (AI may guard a couple); capture the freeze PEAK the instant it arms
  // (before any blocking screenshot, which would eat several frames of the ~5-frame hold).
  let koFired=false, peakFreeze=0
  for (let i=0;i<10 && !koFired;i++){ await page.evaluate(()=>window.__harness.p1ForceLight()); for(let j=0;j<6;j++){ const s=await ko(); if(s.freeze>0){peakFreeze=Math.max(peakFreeze,s.freeze); koFired=true; break} await wf(1) } if(!koFired){ const hp=await page.evaluate(()=>window.__harness.p2().health); if(hp<=0){koFired=true} } }
  if(!koFired){ await page.evaluate(()=>window.__harness.forceP1Win()); const s=await ko(); peakFreeze=Math.max(peakFreeze,s.freeze) }   // fallback: guarantee the KO event

  // Sample the KO beat timeline frame-by-frame; snapshot the frozen frame on the first freeze sample.
  const timeline=[]; let shotTaken=false
  for (let i=0;i<40;i++){ const s=await ko(); timeline.push({ f:s.freeze, sd:s.slowdown }); peakFreeze=Math.max(peakFreeze,s.freeze); if (s.freeze>0 && !shotTaken){ await page.screenshot({path:path.join(OUT,"KO_freeze_frame.png")}); shotTaken=true } await wf(1) }
  const maxFreeze = peakFreeze
  const freezeFrames = timeline.filter(t=>t.f>0)
  const sdDuringFreeze = freezeFrames.map(t=>t.sd)
  const afterFreeze = timeline.slice(timeline.findIndex(t=>t.f>0)).filter(t=>t.f===0 && t.sd>0)
  console.log(`  freeze timeline: [${timeline.map(t=>t.f).join(",")}]`)
  console.log(`  slowdown timeline: [${timeline.map(t=>t.sd).join(",")}]`)

  check("KO freeze armed to ~its max (hard hold on the finishing frame)", maxFreeze >= b0.freezeMax - 1, `peak=${maxFreeze} configured=${b0.freezeMax}`)
  check("freeze is SHORT (a beat, ≤ 6 frames)", freezeFrames.length <= 6 && freezeFrames.length >= 1, `heldFrames=${freezeFrames.length}`)
  check("slow-mo is HELD (not consumed) during the freeze — no double-stack", sdDuringFreeze.length > 0 && sdDuringFreeze.every(v => v === Math.max(...sdDuringFreeze)), `sd@freeze=[${sdDuringFreeze.join(",")}]`)
  check("slow-mo ragdoll hang plays AFTER the freeze clears", afterFreeze.length > 0, `slowmo-after-freeze frames=${afterFreeze.length}`)
  check("captured a frame-exact screenshot during the freeze", shotTaken)
  check("no page JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} ko-hangtime-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
