// harness/brutality_airborne_verify.mjs — regression guard for the "sprite halves MISSING on an airborne KO"
// bug. The bug: at match-over the loser is force-posed to "lose", but _captureLoserSprite sized/anchored its
// offscreen from the STALE _lastDraw* (the previous airborne launch frame) while draw() rendered the shorter
// "lose" pose at a different offset — so the body landed OUTSIDE the offscreen → the halves sliced empty pixels
// (bone/blood still drew). Fixed by drawing into an oversized scratch, reading the ACTUAL drawn rect, cropping.
//
// We drive the REAL KO flow (koTestAirborne → real KO beat/hang → _checkMatchOver → _tryStartBrutality), NOT
// the trigger bypass (which never force-posed "lose", so it always looked fine). We assert the captured canvas
// is NON-EMPTY (the halves have pixels) across a range of launch heights AND a grounded KO — the exact matrix
// that was broken. Also spot-checks that the capture is tightly sized to the real pose (not the stale frame).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

// [dy launch height, vy, label]. dy=0 → grounded KO (no-regression). Larger dy → higher airborne launch.
const CASES = [
  [0,   0,  "grounded"],
  [150, -4, "airborne_low"],
  [300, -8, "airborne_mid"],
  [520, -2, "airborne_high"],
];
const MIN_PX = 1500;   // a real Goku body is ~8000 non-transparent px; the bug produced ~0. 1500 = comfy floor.

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const errs=[];
  for (const [dy, vy, label] of CASES) {
    const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", e => errs.push(String(e)));
    await page.goto(`${base}/index.html?harness=1&p1=mayuri&p2=goku`, { waitUntil: "load" });
    await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__harness.brutality.setBrutality(true));
    await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
    await page.waitForTimeout(450);
    await page.evaluate(([d,v]) => window.__harness.brutality.koTestAirborne(d,v), [dy,vy]);
    // Wait through the real KO beat/hang until the brutality actually starts.
    let active=false;
    for (let i=0;i<50;i++){ await page.waitForTimeout(80); const st=await page.evaluate(()=>window.__harness.brutality.state()); if (st.active){active=true;break;} }
    const probe = active ? await page.evaluate(() => window.__harness.brutality.captureProbe()) : null;
    const px = probe ? probe.nonEmptyPx : -1;
    check(`NEUROTOXIN ${label}: brutality started + captured`, active && !!probe && !!probe.sp,
      probe ? `spriteH=${probe.sp?probe.sp.h:"?"} action=${probe.diag?.action}` : "never started");
    check(`NEUROTOXIN ${label}: captured body is NON-EMPTY (halves visible)`, px >= MIN_PX, `nonEmptyPx=${px} (min ${MIN_PX})`);
    // THE discriminating invariant: the offscreen must be sized to the pose that was ACTUALLY drawn, not the
    // stale pre-capture _lastDraw* (the launch frame). The bug sized the canvas from the tall launch frame while
    // draw() rendered the short "lose" pose → the body landed off-canvas. So the canvas height must track the
    // post-draw drawn height (diag.lastDrawH) within a pad's slack, NOT the stale launch height.
    if (probe && probe.sp && probe.diag && probe.diag.lastDrawH) {
      const expected = probe.diag.lastDrawH + 24;   // +2*pad(12); the crop adds a pad each side
      check(`NEUROTOXIN ${label}: canvas sized to the ACTUAL drawn pose (not the stale launch frame)`,
        Math.abs(probe.sp.ch - expected) <= 32, `canvasH=${probe.sp.ch} vs drawnPose≈${expected.toFixed(0)} (lastDrawH=${probe.diag.lastDrawH.toFixed(0)})`);
    }
    await page.close();
  }
  check("no page errors", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }
console.log(`\n  AIRBORNE-CAPTURE VERIFY: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
