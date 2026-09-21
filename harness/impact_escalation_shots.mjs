// Frame-exact before/after capture of the Black Flash impact frame at level 0 (base) and level 3 (max).
// Usage: node harness/impact_escalation_shots.mjs <label>   (label = before | after)
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const LABEL = process.argv[2] || "shot"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}})
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{})}
await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360)
await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle())
try{await page.waitForFunction(()=>window.__harness.spriteReady("p1")?.ready===true,null,{timeout:9000,polling:50})}catch(_){}
await page.evaluate(()=>window.__harness.setDummyBehavior?.("stand"))
await page.evaluate(()=>{ window.__harness.setP1X(1500); window.__harness.setP2X(1548); }); await wf(40)  // centre + let intro fade
for (const [lvl,name] of [[0,"base"],[3,"max"]]) {
  await page.evaluate(()=>{ window.__harness.setImpactFlash(-1); window.__harness.setCombo && window.__harness.setCombo("p1", 0); }); await wf(30)
  await page.evaluate((l)=>window.__harness.setImpactFlash(l, 600), lvl); await wf(3)
  const st = await page.evaluate(()=>{ const f=window.__harness.impactFrame(); return { p1Filter: f.p1Filter, active: !!f.active, level: f.active?.level } })
  await page.screenshot({ path: path.join(OUT, `IMPACT_${LABEL}_${name}.png`) })
  console.log(`${LABEL} ${name} (lvl ${lvl}): filter=${st.p1Filter}`)
}
await page.evaluate(()=>window.__harness.setImpactFlash(-1))
await browser.close(); server.close()
