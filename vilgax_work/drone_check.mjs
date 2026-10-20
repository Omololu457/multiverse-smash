import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "vilgax_work", "drone_shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".txt":"text/plain"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:960,height:540}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
let PASS=0,FAIL=0; const ck=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?` — ${d}`:""}`);};
const state=()=>page.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
const droneState=()=>page.evaluate(()=>{const p=window.__harness.rawP1?.()||null; return p&&p._vilgaxDrone?{state:p._vilgaxDrone.state,shots:p._vilgaxDrone.shotsLeft}:null;});

await page.goto(`${base}/index.html?harness=1&p1=vilgax&p2=gojo`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(480,270);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{timeout:15000,polling:32}).catch(()=>{});
await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.fillEnergy?.();});
await wf(3);

// Summon: hold charge (p) then tap heavy (k)
await page.keyboard.down("p"); await wf(4);
await page.keyboard.down("k"); await wf(3); await page.keyboard.up("k");
await wf(2); await page.keyboard.up("p");
await wf(10);
await page.screenshot({path:path.join(OUT,"01_flyin.png")});
await wf(18);
await page.screenshot({path:path.join(OUT,"02_fire.png")});
await wf(18);
await page.screenshot({path:path.join(OUT,"03_fire2.png")});

await wf(40); await page.screenshot({path:path.join(OUT,"04_death.png")});
ck("no JS page errors during summon", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
console.log(`\n${FAIL===0?"✅":"❌"} VILGAX DRONE CHECK: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close(); process.exit(FAIL===0?0:1);
