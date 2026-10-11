import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json" };
const server = await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const P=(fn,...a)=>page.evaluate(fn,...a); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness&&!!window.__harness.spawnP1Clones,null,{timeout:15000});
  await page.mouse.click(640,360); await P(()=>window.__harness.boot()); await sleep(600);
  await P(()=>window.__harness.setCloneAggro(true));          // opt into active lunge-strike (Path B attack art)
  await P(()=>window.__harness.spawnP1Clones(1)); await sleep(400);
  // sample states + strike FX across ~2.5s; grab a shot when a clone is mid-attack (non-idle → Path B)
  let shots=0, sawAttack=false;
  for(let i=0;i<12;i++){
    const st=await P(()=>window.__harness.p1CloneStates());
    const metrics=await P(()=>window.__harness.cloneRenderMetrics());
    const atk=st.some(s=>s.atk);
    console.log(`t${i}: states=${JSON.stringify(st)} mirror=${metrics.mirrorRenders} cloneRenderH=${metrics.clones.map(c=>c.renderH)}`);
    if(atk && !sawAttack){ sawAttack=true; await page.locator("canvas").first().screenshot({path:path.join(OUT,"NARUTO_CLONE_PATHB_attack.png")}); console.log("  -> captured attack-state shot"); shots++; }
    await sleep(220);
  }
  await page.locator("canvas").first().screenshot({path:path.join(OUT,"NARUTO_CLONE_PATHB_final.png")});
  console.log("sawAttack(Path B):",sawAttack,"shots:",shots);
}catch(e){console.log("CRASH",String(e&&e.stack||e));}finally{await browser.close();server.close();}
