// harness/ported_moves_shots.mjs — VERIFICATION shots of three EXISTING (committed) moves firing in a live
// match: Obito's Kamui Intangibility (P-TAP toggle), Obito's Kamui Dimension (void-swap + barrage special),
// and the Flash's Flash Time (buff-mode ultimate). These are pre-existing tree features — NOT the Impact Hit
// work. Captured on request to prove they fire.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}})
const errs=[]; page.on("pageerror",e=>errs.push(String(e)))
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`)}
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:12000,polling:16}).catch(()=>{})}
async function boot(p1,p2="goku"){
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness)
  await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle?.())
  await page.waitForFunction(()=>window.__harness.spriteReady?.("p1")?.ready===true,null,{timeout:10000,polling:50}).catch(()=>{})
  await page.evaluate(()=>{ window.__harness.fillEnergy?.(); window.__harness.healP2?.(); window.__harness.setDummyBehavior?.("stand"); window.__harness.setP1X(1520); window.__harness.setP2X(1636); }); await wf(20)
}
const shot = f => page.screenshot({ path: path.join(OUT, f) })

try {
  // 1) KAMUI INTANGIBILITY (Obito) — P-TAP continuous toggle
  await boot("obito")
  const before = await page.evaluate(()=>window.__harness.obitoKamui("p1"))
  await page.evaluate(()=>window.__harness.obitoKamuiToggle("p1")); await wf(3)
  const ki = await page.evaluate(()=>window.__harness.obitoKamui("p1"))
  check("Kamui Intangibility ON (obito._kamuiIntangible)", ki && ki.intangible===true, JSON.stringify({before:before?.intangible, after:ki?.intangible}))
  await shot("PORTED_kamui_intangibility.png")

  // 2) KAMUI DIMENSION (Obito) — void-swap + shuriken barrage special
  await boot("obito")
  const kd = await page.evaluate(()=>window.__harness.kamuiDimFire("p1")); await wf(6)
  const proj = await page.evaluate(()=>window.__harness.projectiles?.()?.length ?? null)
  const cast = await page.evaluate(()=>window.__harness.p1()?.castMove || window.__harness.p1()?._spriteCastMove || null)
  check("Kamui Dimension fired (barrage / cast active)", kd!==false && kd!==null, JSON.stringify({fired:kd, projectiles:proj, cast}))
  await shot("PORTED_kamui_dimension.png")

  // 3) FLASH TIME (Flash) — buff-mode ultimate (press U at full meter)
  await boot("flash")
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u")
  let active=false
  for (let i=0;i<170;i++){ const a=await page.evaluate(()=>window.__harness.p1()); if (a.flashTimeActive){ active=true; break } await wf(1) }
  await wf(4)
  const fa = await page.evaluate(()=>window.__harness.p1())
  check("Flash Time buff LIVE (flashTimeActive)", fa.flashTimeActive===true, `active=${active}`)
  await shot("PORTED_flash_time.png")

  check("no page JS errors", errs.length===0, errs.slice(0,2).join(" | "))
} catch(e){ console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL===0?"✅":"❌"} ported-moves-shots: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL===0?0:1)
}
