// harness/speed_lines_live.mjs — STAGE 1: manga speed-lines behind a fast dash/rush.
// Confirms: (a) a real forward DASH pushes |vx| past the threshold and the speed-line gate goes active
// (walking/running does NOT), on 2+ characters; (b) the lines actually render (in-canvas pixel proof +
// a held-velocity frame-exact screenshot). Purely visual — velocity-gated, drawn behind the body.
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
const section=t=>console.log(`\n── ${t} ─────────────────────────────`)
const H=(f,...a)=>page.evaluate(([fn,args])=>window.__harness[fn](...args),[f,a])
const sl=(who="p1")=>page.evaluate(w=>window.__harness.speedLines(w),who)
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{})}
// Count NEAR-WHITE pixels in the fighter-level band (above the ground, below the sky). The additive
// white speed-line streaks are the only thing that paints near-white there (fighter=orange, road=gray),
// so a big jump vs the standing baseline proves the streaks rendered — robust to the fighter/camera moving.
const countWhite = () => page.evaluate(() => {
  const c = document.querySelector("canvas"), cx = c.getContext("2d", { willReadFrequently: true })
  const x = Math.floor(c.width * 0.12), y = Math.floor(c.height * 0.44), w = Math.floor(c.width * 0.76), h = Math.floor(c.height * 0.22)
  const d = cx.getImageData(x, y, w, h).data; let white = 0
  for (let i = 0; i < d.length; i += 4) { if (d[i] > 226 && d[i+1] > 226 && d[i+2] > 226) white++ }
  return white
})
async function boot(p1="goku"){
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p1}`,{waitUntil:"load"})
  await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360)
  await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle())
  try{await page.waitForFunction(()=>window.__harness.spriteReady("p1")?.ready===true,null,{timeout:15000,polling:50})}catch(_){}
  await page.evaluate(()=>window.__harness.setDummyBehavior?.("stand")); await wf(4)
}
// Trigger a REAL dash and sample the peak over its window; returns the fastest gate reading seen.
async function realDash(who="p1"){
  await H("mayuriDash", 1, who)   // deterministic dash tap → physics gives a real dashTimer next frame
  let peak = { spd: 0, active: false, dashing: false, intensity: 0 }
  for (let i=0;i<16;i++){ const s = await sl(who); if (s.active && (!peak.active || s.intensity > peak.intensity)) peak = s; if (s.spd > peak.spd) peak.spd = s.spd; await wf(1) }
  return peak
}
// hold a dash (re-tap each frame the dashTimer expires) so a frame-exact screenshot lands mid-streak
async function heldShot(who, name){
  await page.evaluate((w)=>{ window.__slPin = setInterval(()=>{ const s=window.__harness.speedLines(w); if(!s?.dashing) window.__harness.mayuriDash(1, w) }, 10) }, who)
  await wf(4)
  const g = await sl(who)
  const behind = await countWhite()
  await page.screenshot({ path: path.join(OUT, name) })
  await page.evaluate(()=>clearInterval(window.__slPin))
  return { active: g.active, white: behind }
}

try {
  section("CHARACTER 1 (goku) — real forward dash trips the speed-line gate")
  await boot("goku")
  const still = await sl("p1")
  check("standing still → speed lines OFF", still.active === false, `vx=${still.vx?.toFixed(1)} dashing=${still.dashing}`)
  const baseB = await countWhite()   // near-white pixels while standing (no streaks)
  const peak = await realDash("p1")
  check("a real dash arms the dash state", peak.dashing === true, `dashing=${peak.dashing} |vx|=${peak.spd?.toFixed(1)}`)
  check("speed-line gate ACTIVE during the dash", peak.active === true, `active=${peak.active} intensity=${peak.intensity?.toFixed(2)}`)
  const g1 = await heldShot("p1", "SPEEDLINES_goku.png")
  check("goku: lines render (gate active + band brighter than baseline behind the body)", g1.active && g1.white > baseB * 1.5 + 30, `white ${baseB} → ${g1.white}`)

  section("CHARACTER 2 (sasuke) — same, a different fighter")
  await boot("sasuke")
  const b2 = await countWhite()
  const peak2 = await realDash("p1")
  check("sasuke: a real dash trips the gate (dashing + active)", peak2.dashing && peak2.active, `dashing=${peak2.dashing} active=${peak2.active}`)
  const g2 = await heldShot("p1", "SPEEDLINES_sasuke.png")
  check("sasuke: lines render (band brighter than baseline)", g2.active && g2.white > b2 * 1.5 + 30, `white ${b2} → ${g2.white}`)

  check("no page JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} speed-lines-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
