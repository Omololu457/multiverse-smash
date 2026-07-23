// harness/goku_walk.test.mjs — verify base Goku's walk resolves to the new
// re-sliced strip (goku_base_walk_uniform.png), not the procedural fallback box.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".csv":"text/csv" };
const server = await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errs=[];page.on("pageerror",e=>errs.push(String(e)));
const p1=()=>page.evaluate(()=>window.__harness.p1());
async function waitFrames(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
try{
  await page.goto(`${base}/index.html?harness=1&p1=goku`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await waitFrames(6);
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:8000,polling:16}).catch(()=>{});
  const idle=await p1();
  check("P1 is Goku",idle.key==="goku",`key=${idle.key}`);
  // hold walk-right and sample mid-stride
  await page.keyboard.down("d");
  await waitFrames(10);
  const w=await p1();
  await page.screenshot({path:path.join(OUT,"GOKU_walk.png")});
  await page.keyboard.up("d");
  check("action resolves to walk/run",["walk","run"].includes(w.action),`action=${w.action}`);
  check("walk sheet = goku_base_walk_uniform.png (NOT the box)",(w.spriteSheet||"").includes("goku_base_walk_uniform"),`sheet=${w.spriteSheet}`);
  check("no JS page errors",errs.length===0,errs.join("; "));
}catch(e){check("harness ran",false,String(e));}
console.log(`\n${FAIL===0?"✅ ALL":"❌ SOME"}  ${PASS} passed, ${FAIL} failed`);
await browser.close();server.close();
process.exit(FAIL===0?0:1);
