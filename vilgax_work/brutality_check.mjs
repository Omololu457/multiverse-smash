import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const OUT=path.join(ROOT,"vilgax_work","brutality_shots"); fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".json":"application/json",".txt":"text/plain"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:960,height:540}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
let PASS=0,FAIL=0; const ck=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?` — ${d}`:""}`);};
const state=()=>page.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
await page.goto(`${base}/index.html?harness=1&p1=vilgax&p2=gojo`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(480,270);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{timeout:15000,polling:32}).catch(()=>{});
await wf(3);
async function variant(move, label, file, killFrame){
  await page.evaluate(()=>window.__harness.boot()); await wf(3);   // FRESH battle so the prior cinematic's end-state doesn't leak
  await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();});
  const r=await page.evaluate(m=>window.__harness.brutality.cineTrigger("p1", m), move);
  ck(`${label} (move='${move}') triggers`, r && r.started===true, `started=${r&&r.started}`);
  await wf(killFrame); await page.screenshot({path:path.join(OUT,file)});   // kill beat (variant-identifying)
  const err0=jsErrors.length;
  ck(`${label} no JS errors`, err0===0, jsErrors.slice(0,2).join(" | "));
}
await variant("ultimate",     "A CHIMERIAN ONSLAUGHT (eye lasers)", "A_onslaught.png", 92);
await variant("vilgaxDagon",  "C TEN WORLDS FALL (orbital)",        "C_tenworlds.png", 100);
await variant("light",        "B CONQUEROR'S EDGE (sword)",         "B_edge.png", 120);
console.log(`\n${FAIL===0?"✅":"❌"} VILGAX BRUTALITY CHECK: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close(); process.exit(FAIL===0?0:1);
