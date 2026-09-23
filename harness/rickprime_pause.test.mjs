// harness/rickprime_pause.test.mjs — Rick Prime "Pause Time" SPECIAL (Down+Special). Rick freezes the opponent
// in place for ~2.2s (a time stop) while he keeps acting; cooldown-gated; NOT the ultimate. Proof of the freeze:
// pop the opponent AIRBORNE, then pause → they must hang frozen mid-air (no fall) while Rick is NOT frozen; then
// the pause ends and they resume falling. Also verifies the meter cost + cooldown.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}})
const errs=[]; page.on("pageerror",e=>errs.push(String(e)))
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`)}
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{})}
const H=(f,...a)=>page.evaluate(([fn,args])=>window.__harness[fn](...args),[f,a])

try {
  await page.goto(`${base}/index.html?harness=1&p1=rickPrime&p2=gohan`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness)
  await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle?.())
  await page.waitForFunction(()=>window.__harness.spriteReady?.("p1")?.ready===true,null,{timeout:12000,polling:50}).catch(()=>{})
  await page.evaluate(()=>{ window.__harness.setDummyBehavior?.("stand"); window.__harness.fillEnergy(); window.__harness.setP1X(1500); window.__harness.setP2X(1700); }); await wf(20)

  // Pop the opponent AIRBORNE (they now have downward physics), then PAUSE TIME.
  await page.evaluate(()=>window.__harness.setP2Air())
  const en0 = (await H("rickPause")).energy
  await H("p1SpecialDir","D")
  const p0 = await H("rickPause")
  check("Pause Time ACTIVE after Down+Special", p0.active===true && p0.timer>0, JSON.stringify({active:p0.active,timer:p0.timer}))
  check("meter spent (−55) + cooldown armed", Math.round(en0 - p0.energy)===55 && p0.cd>0, `en ${en0}→${p0.energy}, cd ${p0.cd}`)
  await wf(1)   // the freeze flag is applied on the next _updateGodspeedTimeSlow tick
  const pf = await H("rickPause")
  check("opponent is FROZEN (time-stopped) + Rick is NOT frozen", pf.oppFrozen===true && pf.selfFrozen===false, JSON.stringify({opp:pf.oppFrozen,self:pf.selfFrozen}))

  // Across the freeze window the airborne opponent must NOT fall (y + vy stay locked), and stay frozen every frame.
  const yFrozen = pf.oppY, vyFrozen = pf.oppVy
  let stayedFrozen = true, yHeld = true
  for (let i=0;i<18;i++){ await wf(1); const s=await H("rickPause"); if (!s.oppFrozen) stayedFrozen=false; if (Math.abs(s.oppY - yFrozen) > 1) yHeld=false }
  check("opponent stays FROZEN every frame during the pause", stayedFrozen)
  check("airborne opponent HANGS in place — no fall (y + vy locked)", yHeld, `y ${yFrozen} (vy ${vyFrozen} held)`)

  // Rick can still act during the pause (not time-slowed).
  check("Rick keeps acting during the pause (self not frozen)", (await H("rickPause")).selfFrozen===false)

  // Let the pause expire → opponent unfreezes and resumes falling.
  await page.waitForFunction(()=>window.__harness.rickPause().active===false,null,{timeout:8000,polling:16}).catch(()=>{})
  const after = await H("rickPause")
  check("Pause Time ENDS after its duration", after.active===false && after.oppFrozen===false, JSON.stringify({active:after.active,frozen:after.oppFrozen}))
  const yEnd0 = after.oppY; await wf(10); const yEnd1 = (await H("rickPause")).oppY
  check("opponent RESUMES (physics restart — falls/moves after time resumes)", Math.abs(yEnd1 - yEnd0) > 1 || (await H("rickPause")).oppY !== yFrozen, `y ${yEnd0}→${yEnd1}`)
  check("cooldown still ticking (can't be spammed)", (await H("rickPause")).cd > 0)

  check("no page JS errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION",e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} rickprime-pause: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
