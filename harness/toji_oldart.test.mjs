// harness/toji_oldart.test.mjs — the "old row-sheet" actions (block→guard, dash, grab) must
// render at correct human-scale proportion (not ~1.35x oversized at spriteScale 2.3). Uses
// the rendered cell height (renderInfo.dstH) vs idle as a scale metric, plus real screenshots.
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
const ri=w=>page.evaluate(x=>window.__harness.renderInfo(x),w);
const p1=()=>page.evaluate(()=>window.__harness.p1());
const p2=()=>page.evaluate(()=>window.__harness.p2());
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}
async function shot(n){await page.screenshot({path:path.join(OUT,`TOJI_oldart_${n}.png`)});}
const near=(a,b,tol)=>Math.abs(a-b)<=tol;

try{
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=toji`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());await wf(6);
  await page.evaluate(()=>window.__harness.setP2X(2100));

  const idle=await ri("p1");
  console.log(`  idle: action=${idle.action} dstH=${idle.dstH?.toFixed(1)} (baseline scale reference)`);
  check("idle renders (baseline)", idle.action==="idle" && idle.dstH>0, `dstH=${idle.dstH?.toFixed(1)}`);
  const cap=idle.dstH*1.15;   // "oversized" threshold — old art at 2.3 unc­orrected is ~1.3x idle

  section("BLOCK → guard (was named 'block' → never rendered; now renders scale-corrected)");
  await page.keyboard.down("s"); await wf(5);
  const g=await ri("p1"); await shot("guard"); await page.keyboard.up("s");
  check("blocking resolves to the GUARD sprite (not idle)", g.action==="guard", `action=${g.action}`);
  check("guard renders at correct scale (not oversized)", g.dstH>0 && g.dstH<cap, `guard dstH=${g.dstH?.toFixed(1)} vs idle ${idle.dstH?.toFixed(1)} (cap ${cap.toFixed(0)})`);
  await wf(6);

  section("DASH/locomotion — now reuses the NEW walk sheet (correct scale)");
  // Hold forward to build run speed (vx>10 → 'run', which reuses the walk sheet — same fix as
  // 'dash'). Toji is a teleport-dasher, so plain locomotion is the reliable scale probe.
  await page.keyboard.down("d");
  let dash=null; for(let i=0;i<20;i++){const r=await ri("p1"); if(["walk","run","dash"].includes(r.action)){dash=r;break;} await wf(1);}
  await shot("dash"); await page.keyboard.up("d");
  // dash/run/walk all reuse ./toji_walk.png now — any locomotion frame proves the scale.
  check("locomotion resolves to a walk-sheet action (walk/run/dash)", !!dash, dash?`action=${dash.action}`:"none");
  if(dash) check("locomotion renders at correct scale (not oversized)", dash.dstH>0 && dash.dstH<cap, `dstH=${dash.dstH?.toFixed(1)} (cap ${cap.toFixed(0)})`);
  await wf(8);

  section("GRAB — FINDING: the throw plays no grab animation (row02 unused)");
  const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),Math.round(a.x+a.w+6)); await page.evaluate(()=>window.__harness.healP2()); await wf(1);
  const hp=(await p2()).health;
  await page.keyboard.down("o"); await wf(2); await page.keyboard.up("o");
  let sawGrab=false; for(let i=0;i<16;i++){ if((await ri("p1")).action==="grab"){sawGrab=true;break;} await wf(1);}
  await shot("grab"); await wf(20);
  check("grab THROW works functionally (connects / damages)", (await p2()).health<hp, `p2 hp ${hp}→${(await p2()).health}`);
  check("grab plays NO 'grab' sprite (row02 unused — resolveGrab sets no sprite action → not oversized)", sawGrab===false, `sawGrab=${sawGrab}; scale-corrected preemptively anyway`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await shot("ERROR");}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
