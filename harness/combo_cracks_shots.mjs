// Frame-exact capture of the STAGE 2 cracking-glass combo overlay at low/mid/high combo tiers (5/9/15).
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"}
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))})
const base=`http://127.0.0.1:${server.address().port}`; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}})
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{})}
// count near-white pixels in a band around p2 (the crack lines are bright) — proves density climbs
const whiteBand = () => page.evaluate(() => { const c=document.querySelector("canvas"),x=c.getContext("2d",{willReadFrequently:true}); const bx=Math.floor(c.width*0.52),by=Math.floor(c.height*0.40),bw=Math.floor(c.width*0.22),bh=Math.floor(c.height*0.30); const d=x.getImageData(bx,by,bw,bh).data; let w=0; for(let i=0;i<d.length;i+=4){ if(d[i]>200&&d[i+1]>220&&d[i+2]>235) w++; } return w; })
await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360)
await page.evaluate(()=>window.__harness.boot()); await page.evaluate(()=>window.__harness.skipToBattle())
try{await page.waitForFunction(()=>window.__harness.spriteReady("p1")?.ready===true,null,{timeout:9000,polling:50})}catch(_){}
await page.evaluate(()=>window.__harness.setDummyBehavior?.("stand"))
await page.evaluate(()=>{ window.__harness.setP1X(1470); window.__harness.setP2X(1560); }); await wf(40)
for (const [combo,name] of [[6,"low"],[10,"mid"],[16,"high"]]) {
  await page.evaluate(()=>{ window.__harness.setImpactFlash(-1); window.__harness.setCombo("p1",0); }); await wf(20)
  const wb0 = await whiteBand()
  await page.evaluate((n)=>window.__harness.setCombo("p1",n), combo); await wf(16)   // let the impact flash fade; cracks persist
  await page.evaluate(()=>{ window.__harness.setP2X(1560); })
  const cc = await page.evaluate(()=>window.__harness.comboCracks("p2"))
  const wb = await whiteBand()
  await page.screenshot({ path: path.join(OUT, `CRACKS_${name}.png`) })
  console.log(`${name}: combo=${cc.combo} tier=${cc.tier} cracks=${cc.cracks}  whitePixels ${wb0}→${wb}`)
}
await page.evaluate(()=>{ window.__harness.setCombo("p1",0); })
await browser.close(); server.close()
