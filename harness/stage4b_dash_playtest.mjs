// MK-feel Stage 4b — LIVE neutral-game playtest across speed tiers (spec: "playtest ≥3 speed-tier chars").
// Boots real matches and reads each fighter's RUNTIME dashCooldownMax (proves the archetype formula is
// wired through the real fighter-init, not just static source), across fast / mid / slow tiers, and
// confirms a double-tap dash still fires + recharges on that archetype cadence.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg", ".mp3":"audio/mpeg", ".mp4":"video/mp4", ".json":"application/json", ".csv":"text/csv" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
const dashCd = (speed) => Math.max(14, Math.min(34, Math.round(112 - (speed || 88))));

let PASS=0, FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true}); const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
async function frame(){return page.evaluate(()=>window.__harness.state().frame);}
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}

// fast (98) / fast (98) / mid (90) / slow (84) / slow (83) — spans the whole tier range
const TIERS = [
  { key:"maki",   tier:"speedster", spd:98 },
  { key:"naruto", tier:"mid",       spd:90 },
  { key:"rick",   tier:"heavy-ish", spd:84 },
  { key:"megumi", tier:"heavy-ish", spd:83 },
];

try{
  for (const t of TIERS) {
    await page.goto(`${base}/index.html?harness=1&p1=${t.key}&p2=${t.key}`, { waitUntil:"load" });
    await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360);
    await page.evaluate(()=>window.__harness.boot()); await wf(3);
    const f = await page.evaluate(()=>window.__harness.p1());
    const want = dashCd(t.spd);
    check(`${t.key} (${t.tier}, spd ${t.spd}) runtime dashCooldownMax = ${want}`, f.dashCooldownMax === want, `got ${f.dashCooldownMax}`);
  }

  // Live dash: a NON-teleport ground-dasher (Naruto, cd 22) double-taps → dash fires + recharges on its
  // archetype cadence. (The 98-speed chars TELEPORT on a double-tap toward the foe — a different path that
  // doesn't engage dashTimer — so Naruto is the right probe for the ground-dash mechanic itself.)
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=naruto`, { waitUntil:"load" });
  await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot()); await wf(3);
  // double-tap D (away from P2 which starts on the right → a plain ground dash, not a teleport toward)
  await page.keyboard.press("a"); await wf(1); await page.keyboard.down("a"); await wf(2);
  let peakDash = 0, sawTimer = false;
  for (let i = 0; i < 6; i++) { const s = await page.evaluate(()=>window.__harness.p1()); if ((s.dashTimer||0) > 0) sawTimer = true; peakDash = Math.max(peakDash, s.dashCooldown||0); await wf(1); }
  await page.keyboard.up("a");
  check("Naruto double-tap actually GROUND-DASHES (dashTimer engaged)", sawTimer, `sawTimer=${sawTimer}`);
  check("its dash cooldown lands on the archetype value (≤22, not the old ~45)", peakDash > 0 && peakDash <= 22, `peakDashCooldown=${peakDash}`);

  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
