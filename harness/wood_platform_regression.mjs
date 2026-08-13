// harness/wood_platform_regression.mjs — ROSTER-WIDE ground-collision regression for the shared physics.js
// change (Wood Release climbable terrain, Stage 3). The platform-aware floor + stick-branch release live in
// physics.applyGravity, which runs for EVERY character. This boots a diverse sample (standard, flight,
// triple-jump, fast/teleport, the portal char) and confirms — with NO platforms active — that each one:
//   • spawns resting on the ground (onGround, no platform id),
//   • jumps and leaves the ground,
//   • lands back on the SAME groundY (not floated, not teleported),
//   • never has a phantom platform under it.
// This is the empirical backstop for the "byte-for-byte identical when no platforms" gate in applyGravity.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
const floor = () => page.evaluate(() => window.__harness.fighterFloor("p1"));
const platCount = () => page.evaluate(() => window.__harness.platforms().length);
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }

// Diverse sample across physics edge cases: standard bruisers/zoners, triple-jump (gojo/sukuna),
// fast/teleport (flash/minato/maki), the portal char (rick), a flight char (omniman), + Hashirama himself.
const CHARS = ["naruto","sasuke","madara","toji","zaraki","ichigo","rick","gojo","sukuna","flash","minato","maki","omniman","hashirama"];

try {
  for (const c of CHARS) {
    await page.goto(`${base}/index.html?harness=1&p1=${c}&p2=${c}`, { waitUntil:"load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
    await page.evaluate(() => window.__harness.clearPlatforms?.());
    await page.evaluate(() => window.__harness.boot());
    await waitFrames(6);

    const spawn = await floor();
    const GY = spawn.feet;
    const pc0 = await platCount();
    const grounded = spawn.onGround && spawn.floorPlatformId === null && pc0 === 0;

    // jump and confirm it leaves the ground, then lands back on the same groundY
    await page.evaluate(() => window.__harness.jumpP1(0));
    let apex = Infinity;
    await page.waitForFunction(() => { const f = window.__harness.fighterFloor("p1"); return !f.onGround; }, null, { timeout: 2000, polling: 16 }).catch(()=>{});
    for (let i=0;i<20;i++){ const f = await floor(); apex = Math.min(apex, f.feet); await waitFrames(1); }
    const left = apex < GY - 40;
    await page.waitForFunction(gy => { const f = window.__harness.fighterFloor("p1"); return f.onGround && Math.abs(f.feet - gy) < 3; }, GY, { timeout: 5000, polling: 16 }).catch(()=>{});
    const landed = await floor();
    const pc1 = await platCount();
    const ok = grounded && left && landed.onGround && Math.abs(landed.feet - GY) < 3 && landed.floorPlatformId === null && pc1 === 0;
    check(`${c}: spawns grounded → jumps → lands back on groundY (no platform)`, ok,
          `spawnFeet=${GY.toFixed(0)} apex=${isFinite(apex)?apex.toFixed(0):"n/a"} landFeet=${landed.feet.toFixed(0)} onG=${landed.onGround} floorId=${landed.floorPlatformId} plats=${pc1}`);
  }
  check("no JS page errors across the whole sample", errs.length === 0, errs.slice(0,2).join(" | "));
} catch (e) { console.error("WOOD PLATFORM REGRESSION ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════`);
console.log(`  WOOD PLATFORM ROSTER REGRESSION: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
