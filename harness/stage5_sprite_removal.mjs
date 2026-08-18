// MK-feel Stage 5 — SPRITE-FLAG REMOVAL verification. goku was flag-removed
// (hasSprites:false + manifest entry gone) → they render on the PROCEDURAL box renderer, but their
// GAMEPLAY is intact (the flag only gates rendering, not logic). Proves, in a live match:
//   • the flip took effect at runtime (hasSprites === false),
//   • each is GENUINELY PLAYABLE as a box (moves + lands a damaging attack, no JS errors).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg", ".mp3":"audio/mpeg", ".mp4":"video/mp4", ".json":"application/json", ".csv":"text/csv" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}

let PASS=0, FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true}); const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const p1=()=>page.evaluate(()=>window.__harness.p1());
const p2=()=>page.evaluate(()=>window.__harness.p2());
async function frame(){return page.evaluate(()=>window.__harness.state().frame);}
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}
async function boot(k){ await page.goto(`${base}/index.html?harness=1&p1=${k}&p2=${k}`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot()); await wf(4); }

try{
  // ── A. each flag-removed char renders procedurally + is playable ──
  for (const key of ["goku"]) {
    section(`${key.toUpperCase()} — flag-removed → procedural box, still playable`);
    await boot(key);
    const a = await p1();
    check(`${key}: hasSprites === false at runtime (flip took effect)`, a.hasSprites === false, `hasSprites=${a.hasSprites}`);
    check(`${key}: NOT sprite-rendered (procedural box)`, a.hasSpriteHandler === false, `hasSpriteHandler=${a.hasSpriteHandler}`);
    // playable: walk forward, then land a light on the mirror dummy
    await page.evaluate(x=>window.__harness.setP2X(x), Math.round(a.x + a.w + 24));
    await page.evaluate(()=>window.__harness.healP2?.());
    const x0 = (await p1()).x;
    await page.keyboard.down("d"); await wf(8); const moved = (await p1()).x !== x0; await page.keyboard.up("d"); await wf(2);
    check(`${key}: MOVES as a box (walk works)`, moved, `x ${x0}→${(await p1()).x}`);
    const hp0 = (await p2()).health;
    for (let i=0;i<3 && (await p2()).health>=hp0;i++){ await page.keyboard.down("j"); await wf(3); await page.keyboard.up("j"); await wf(6); }
    check(`${key}: lands a damaging attack (genuinely playable, not just visible)`, (await p2()).health < hp0, `hp ${hp0}→${(await p2()).health}`);
  }

  section("errors");
  check("no uncaught JS exceptions across all flag-removed chars", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
