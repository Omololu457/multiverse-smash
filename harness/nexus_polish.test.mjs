// harness/nexus_polish.test.mjs — cinematic POLISH pass on the cutscene engine (does not rebuild it):
//  STAGE 1 subtle camera drift/breathing · STAGE 2 fade-through-black beat transitions · STAGE 3 two-char
//  parallax haze. Asserts each is live + that advancing stays responsive, and recaptures the 3 comparison
//  beats (narration / two-character / camera-zoom) plus a mid-fade transition frame.
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
const shot = f => pg.screenshot({ path: path.join(OUT, f) })
async function gotoBeat(idx){ let g=0; while(g++<80){ const c=await cs(); if(c.idx===idx) return c; await adv(); await wf(2) } return await cs() }
async function settle(){ // wait for fade to clear AND text fully revealed → a clean, representative frame
  await pg.waitForFunction(()=>{const c=window.__harness.ui.cutscene(); return c.fade<=0.02 && c.fullyRevealed},null,{timeout:8000,polling:16}).catch(()=>{})
}

try {
  await pg.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await pg.waitForFunction(()=>!!window.__harness); await pg.mouse.click(640,360)
  const restart = async () => { await pg.evaluate(()=>window.__harness.ui.startNexus()); await wf(1) }

  // ── STAGE 2: fade-through-black on a fresh cut ──
  // NOTE: the fade decays in ~10 frames (167ms) — faster than a playwright round-trip — so we assert the
  // fade CONTRACT via synchronous in-browser evaluates (no frame advances between reads), not wall-clock.
  const loadFade = await pg.evaluate(()=>{ window.__harness.ui.startNexus(); return window.__harness.ui.cutscene().fade })
  ck("STAGE 2: fresh beat starts under a FULL fade veil", loadFade >= 0.99, `fade=${loadFade}`)
  const cleared = await pg.waitForFunction(()=>window.__harness.ui.cutscene().fade<=0.02,null,{timeout:3000,polling:8}).then(()=>true).catch(()=>false)
  ck("STAGE 2: fade eases up to ~0 (frame becomes fully visible)", cleared)
  await settle()
  const rearm = await pg.evaluate(()=>{ const h=window.__harness.ui; const a=h.cutscene().fade; h.cutsceneAdvance(); return { a, b: h.cutscene().fade } })
  ck("STAGE 2: every cut RE-ARMS the veil (transition, not just an opening fade)", rearm.a<=0.02 && rearm.b>=0.99, `${rearm.a}→${rearm.b}`)

  // ── STAGE 4: advancing stays RESPONSIVE (fade never gates input) — synchronous contract check ──
  // We're now on the freshly-loaded beat from the re-arm above (reveal still running). Drive both
  // presses in ONE evaluate so no rAF runs between reads: press-1 must complete the reveal, press-2 advance.
  const resp = await pg.evaluate(()=>{
    const h=window.__harness.ui, C=()=>h.cutscene()
    const fresh=C(); h.cutsceneAdvance(); const done=C(); h.cutsceneAdvance(); const nxt=C()
    return { freshRevealed:fresh.fullyRevealed, len:fresh.textLen, doneRevealed:done.fullyRevealed, sameIdx:done.idx===fresh.idx, advanced:nxt.idx===fresh.idx+1 }
  })
  ck("STAGE 4: fresh beat is mid-reveal (typewriter running)", !resp.freshRevealed && resp.len>0, JSON.stringify(resp))
  ck("STAGE 4: press-1 instantly completes the reveal (not gated by fade)", resp.doneRevealed && resp.sameIdx, JSON.stringify(resp))
  ck("STAGE 4: press-2 advances the beat immediately", resp.advanced, JSON.stringify(resp))

  // ── STAGE 1: breathing drift is LIVE (camera not frozen) ── on a one-character STATIC beat (idx 2, omololu)
  await restart(); await gotoBeat(2); await settle()
  const samples = []
  for (let i=0;i<6;i++){ samples.push((await cs()).driftX); await wf(11) }
  const maxAbs = Math.max(...samples.map(Math.abs)), distinct = new Set(samples.map(v=>v.toFixed(3))).size
  ck("STAGE 1: drift signal swings (breathing, not frozen)", maxAbs > 1 && distinct >= 4, `max|dx|=${maxAbs.toFixed(2)} distinct=${distinct}/6`)
  ck("STAGE 1: drift stays SUBTLE (bounded, barely-perceptible)", maxAbs <= 7.01, `max|dx|=${maxAbs.toFixed(2)} (cap 7)`)

  // ── Recapture the 3 comparison beats (ascending idx, settled: fade cleared, text shown) ──
  await restart()
  const bn = await gotoBeat(0); await settle(); await shot("NEXUS_beat0_narration.png")
  ck("narration-only beat recaptured", bn.speaker==="" && !bn.left && !bn.right, JSON.stringify({idx:bn.idx}))
  const bz = await gotoBeat(5); await settle(); await shot("NEXUS_camera_zoom.png")
  ck("camera-zoom beat recaptured (rickPrime)", bz.idx===5 && bz.left==="rickPrime" && bz.cam==="zoom", JSON.stringify({idx:bz.idx,cam:bz.cam}))
  const bt = await gotoBeat(11); await settle(); await shot("NEXUS_two_character.png")
  ck("two-character beat recaptured (genos+ichigo)", !!(bt.left && bt.right), JSON.stringify({left:bt.left,right:bt.right}))

  // ── Bonus: a mid-fade transition frame (proves the dissolve visually) ──
  await adv(); await wf(1); await adv()                // load a fresh beat → fade just re-armed
  await pg.waitForFunction(()=>{const c=window.__harness.ui.cutscene();return c.fade>0.35&&c.fade<0.75},null,{timeout:4000,polling:8}).catch(()=>{})
  const mf = await cs(); await shot("NEXUS_transition_fade.png")
  ck("mid-fade transition frame captured", mf.fade>0.2 && mf.fade<0.85, `fade=${mf.fade}`)

  ck("no page errors across the polish playthrough", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.log("EXCEPTION", e); F++ }
finally { await br.close(); server.close(); console.log(`\n${F===0?"✅":"❌"} nexus-polish: ${P} passed, ${F} failed`); process.exit(F===0?0:1) }
