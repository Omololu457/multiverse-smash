// harness/toji_chain.test.mjs — Phase 3: Chain-stance real normals.
// Verifies each Chain normal fires + connects for damage, the anti-air launches, and 5B/6B
// are distinct moves. Chain content only (Gun deferred). attack_4 (running variant) NOT wired.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const OUT=path.join(ROOT,"harness","shots");fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".mp4":"video/mp4",".json":"application/json",".csv":"text/csv"};
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const server=await srv();const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[];page.on("pageerror",e=>jsErrors.push(String(e)));
const ts=()=>page.evaluate(()=>window.__harness.tojiState("p1"));
const p1=()=>page.evaluate(()=>window.__harness.p1());
const p2=()=>page.evaluate(()=>window.__harness.p2());
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}
async function tapKey(k){await page.keyboard.down(k);await wf(2);await page.keyboard.up(k);}
async function tapDownKey(k){await page.keyboard.down("s");await wf(1);await page.keyboard.down(k);await wf(2);await page.keyboard.up(k);await page.keyboard.up("s");}
async function waitIdle(){for(let i=0;i<200;i++){if((await ts()).canAct)return;await wf(1);}}
async function placeClose(){const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),Math.round(a.x+a.w+40));await page.evaluate(()=>window.__harness.healP2());await wf(1);}

try{
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=toji`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());await wf(5);
  // switch to CHAIN stance
  await page.keyboard.down("p");await wf(2);await page.keyboard.up("p");await wf(3);
  check("switched to CHAIN stance", (await ts()).stance==="chain", `stance=${(await ts()).stance}`);

  section("Chain normals — each fires + connects for damage");
  // 5A Short Lash (J)
  await placeClose(); let hp=(await p2()).health; await waitIdle(); await tapKey("j"); await wf(1);
  check("5A Short Lash fires (J → shortLash)", (await ts()).move==="shortLash", `move=${(await ts()).move}`);
  await wf(20); check("Short Lash connects for damage", (await p2()).health<hp, `hp ${hp}→${(await p2()).health}`);
  // 5B Wide Arc (K, not down)
  await placeClose(); hp=(await p2()).health; await waitIdle(); await tapKey("k"); await wf(1);
  check("5B Wide Arc fires (K → wideArc)", (await ts()).move==="wideArc", `move=${(await ts()).move}`);
  await wf(28); check("Wide Arc connects for damage", (await p2()).health<hp, `hp ${hp}→${(await p2()).health}`);
  // 6B Low Sweep Lash (down+K)
  await placeClose(); hp=(await p2()).health; await waitIdle(); await tapDownKey("k"); await wf(1);
  check("6B Low Sweep fires (down+K → lowSweep), DISTINCT from 5B", (await ts()).move==="lowSweep", `move=${(await ts()).move}`);
  await wf(26); check("Low Sweep connects for damage", (await p2()).health<hp, `hp ${hp}→${(await p2()).health}`);
  // 2B Rising Coil (I) — anti-air launcher
  await placeClose(); hp=(await p2()).health; await waitIdle(); await tapKey("i"); await wf(1);
  check("2B Rising Coil fires (I → risingCoil)", (await ts()).move==="risingCoil", `move=${(await ts()).move}`);
  await wf(16); const pv=await p2();
  check("Rising Coil connects for damage", pv.health<hp, `hp ${hp}→${pv.health}`);
  check("Rising Coil LAUNCHES (anti-air: airborne/upward)", pv.grounded===false || (pv.vy||0)<0, `grounded=${pv.grounded} vy=${(pv.vy||0).toFixed(1)}`);
  await page.screenshot({path:path.join(OUT,"TOJI_chain.png")});
  await wf(40);

  section("stance-cancel still works from a Chain normal (Phase-1 mechanic)");
  await placeClose(); await waitIdle();
  await tapKey("k");   // wideArc (long recovery)
  for(let i=0;i<60;i++){ if((await ts()).phase==="recovery")break; await wf(1); }
  const before=(await ts()).stance;
  await page.keyboard.down("p");await wf(2);await page.keyboard.up("p");await wf(2);
  check("charge during Chain-normal recovery cancels + switches stance", (await ts()).stance!==before, `${before}→${(await ts()).stance}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"TOJI_chain_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
