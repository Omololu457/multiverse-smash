// harness/ult_zoomcrop_live.mjs — STAGE 3: panel-style HARD zoom-crop at the instant an ultimate connects.
// A one-frame snap to a tight crop (distinct from the eased ultimate punch-in), held briefly, then released
// so the two-shot eases back. Verifies the SNAP is hard (zoom jumps in a single frame, not ramped) on 2+
// direct-hit ultimates, and screenshots the tight crop. Camera-only; no balance/damage touched.
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
const uc=()=>page.evaluate(()=>window.__harness.ultCrop())
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{})}
async function boot(p1="naruto"){
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p1}`,{waitUntil:"load"})
  await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360)
  await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle())
  try{await page.waitForFunction(()=>window.__harness.spriteReady("p1")?.ready===true,null,{timeout:15000,polling:50})}catch(_){}
  await page.evaluate(()=>window.__harness.setDummyBehavior?.("stand"))
  const px=await page.evaluate(()=>window.__harness.p1().x); await page.evaluate(x=>window.__harness.setP2X(x+52),px)
  await wf(4)
}
// Fire the ultimate; return the snap event {before, snapZoom, active, snapDelta} if the crop fired.
async function fireUlt(){
  const before = (await uc()).zoom
  let prevZoom = before, snap = null
  await page.evaluate(()=>window.__harness.p1Ultimate?.() ?? window.__harness.p1Ult?.())
  for (let i=0;i<80;i++){
    const s = await uc()
    if (s.active && !snap){ snap = { before, prevZoom, snapZoom: s.zoom, cropZoom: s.cropZoom, jump: s.zoom - prevZoom } }
    prevZoom = s.zoom
    if (snap && !s.active) break     // crop released
    await wf(1)
  }
  return snap
}

try {
  const candidates = ["ippo","bardock","byakuya","yamamoto"]   // direct-hit ults that apply ultimate-tier hitstop
  const worked = []
  for (const ch of candidates){
    if (worked.length >= 2) break
    await boot(ch)
    const snap = await fireUlt()
    if (snap){
      worked.push({ ch, ...snap })
      console.log(`  ✔ ${ch}: ult crop fired — zoom ${snap.before.toFixed(2)} → ${snap.snapZoom.toFixed(2)} (1-frame jump +${snap.jump.toFixed(2)}), cropZoom=${snap.cropZoom.toFixed(2)}`)
      // re-fire + hold a screenshot of the tight crop
      await boot(ch)
      await page.evaluate(()=>{ window.__ucPin=setInterval(()=>{ const s=window.__harness.ultCrop(); if(!s.active) window.__harness.p1Ultimate?.(); },40) })
      await page.waitForFunction(()=>window.__harness.ultCrop().active,null,{timeout:4000,polling:8}).catch(()=>{})
      await wf(2)
      await page.screenshot({ path: path.join(OUT, `ULTCROP_${ch}.png`) })
      await page.evaluate(()=>clearInterval(window.__ucPin))
    } else {
      console.log(`  – ${ch}: no crop (likely a cinematic-freeze ult or didn't connect)`)
    }
  }

  console.log("")
  check("ultimate zoom-crop fired on ≥ 2 characters", worked.length >= 2, `fired on: ${worked.map(w=>w.ch).join(", ")}`)
  for (const w of worked){
    check(`${w.ch}: snap is a TIGHT crop (zoom ≈ max ~1.14)`, w.snapZoom >= 1.10, `snapZoom=${w.snapZoom.toFixed(2)}`)
    check(`${w.ch}: snap is HARD (single-frame jump, not an eased ramp of ~0.02/frame)`, w.jump >= 0.15, `1-frame Δzoom=${w.jump.toFixed(2)}`)
  }
  check("no page JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} ult-zoomcrop-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
