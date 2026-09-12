// harness/samurai_mega_auto.test.mjs — regression test for the SAMURAI RANGERS auto-Mega-Mode transform.
// Feature (game.js): while HOLDING Charge, the instant Symbol Power crosses the threshold (>= 90) a Samurai
// Ranger auto-transforms to Mega Mode — no release needed (enterSamuraiMega in updateMovementInput) — and a
// release right after does NOT insta-revert (the _megaAutoPress guard in handleChargeRelease). Scoped to the
// 3 Mega-capable samurai; omega_ranger / red_ranger_mmpr are single-form by design and must NOT transform.
// This guards the feature that previously shipped with no test.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ──`);
const p1=()=>page.evaluate(()=>window.__harness.p1());
async function wf(n){const s=(await page.evaluate(()=>window.__harness.state().frame));await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
async function boot(key){
  await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=${key}`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await wf(6);
}

try{
  // ── the 3 Mega-capable samurai — auto-transform mid-charge-hold, no insta-revert ──
  for(const key of ["samurai_red_ranger","gold_samurai_ranger","green_samurai_ranger"]){
    section(`${key} — auto-Mega on charge-hold past Symbol Power 90`);
    await boot(key);
    check(`${key}: starts in base form`, (await p1()).currentForm !== "megaMode", `form=${(await p1()).currentForm}`);
    await page.evaluate(()=>window.__harness.setEnergy(80));   // just below the 90 threshold
    await page.keyboard.down("p");                              // HOLD Charge — Symbol Power builds, should cross 90 and auto-transform WITHOUT release
    let becameMega=false;
    for(let i=0;i<180;i++){ if((await p1()).currentForm==="megaMode"){becameMega=true;break;} await wf(1); }
    const mid=await p1();
    check(`${key}: auto-transforms to Mega WHILE holding Charge (no release)`, becameMega, `form=${mid.currentForm} energy=${Math.round(mid.energy)}`);
    await page.keyboard.up("p"); await wf(4);                   // release right after
    check(`${key}: release does NOT insta-revert (stays Mega)`, (await p1()).currentForm==="megaMode", `form=${(await p1()).currentForm}`);
  }
  // ── single-form rangers — a charge-hold must NEVER transform ──
  for(const key of ["omega_ranger","red_ranger_mmpr"]){
    section(`${key} — single-form by design (charge-hold must NOT transform)`);
    await boot(key);
    await page.evaluate(()=>window.__harness.setEnergy(200));   // well past any threshold
    await page.keyboard.down("p"); await wf(90); const held=await p1(); await page.keyboard.up("p");
    check(`${key}: holding Charge does NOT transform to Mega`, held.currentForm!=="megaMode", `form=${held.currentForm}`);
  }
  section("stability");
  check("no JS errors during the run", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
}catch(e){console.error("threw:",e);FAIL++;}
finally{
  console.log(`\n${FAIL===0?"✅":"❌"} Samurai auto-Mega: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL?1:0);
}
