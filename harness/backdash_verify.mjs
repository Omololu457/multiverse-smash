// BACKDASH — roster-wide retreat dash (double-tap AWAY from the opponent).
// Before this change the ground dash ALWAYS ran toward the opponent (physics.js used facing·dashSpeed,
// and updateFacing pins facing at the foe every frame), so a double-tap-away just dashed you forward —
// no backdash existed for anyone. This proves, on the REAL keyboard double-tap path:
//   • double-tap AWAY  → moves AWAY from the opponent (x decreases for a left-side P1) while STILL
//     facing the foe, engages the real dashTimer, and reads as a WALK/backpedal pose (not the dash lunge).
//   • double-tap TOWARD (non-teleport char) → dashes FORWARD (x increases), dash pose.
//   • a TELEPORT-dasher (Gojo) is UNTOUCHED: toward double-tap still BLINKS behind the foe, and its
//     away double-tap now ALSO backdashes (retreats) — the blink path is not disturbed.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".png":"image/png", ".jpg":"image/jpeg", ".mp3":"audio/mpeg", ".mp4":"video/mp4", ".json":"application/json", ".csv":"text/csv" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}

let PASS=0, FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true}); const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}
const p1=()=>page.evaluate(()=>window.__harness.p1());

// A real double-tap: two keydowns of `k` a couple frames apart (well within DOUBLE_TAP_TIME=240ms),
// then observe the ensuing dash frames. Returns the peak |Δx| direction + whether dashTimer engaged +
// the sprite action seen during the dash. keyup between taps so the 2nd press is a fresh keydown edge.
async function doubleTap(k){
  const before = await p1();
  await page.keyboard.press(k); await wf(1);
  await page.keyboard.press(k);              // 2nd tap → double-tap detected on this keydown
  let sawTimer=false, dashPose=false, walkPose=false, maxStep=0;
  let prevX = before.x, after = before;
  for (let i=0;i<8;i++){
    const s = await p1();
    if ((s.dashTimer||0)>0) sawTimer=true;
    if (s.spriteAction==="dash") dashPose=true;
    if (s.spriteAction==="walk"||s.spriteAction==="run") walkPose=true;
    maxStep = Math.max(maxStep, Math.abs(s.x-prevX));   // biggest SINGLE-FRAME jump
    prevX = s.x;
    after = s;
    await wf(1);
  }
  // A teleport BLINK relocates ~a body-width+ in ONE frame; a ground dash steps ~18px/frame. 90px in a
  // single frame cleanly separates the two.
  const blinked = maxStep > 90;
  return { before, after, dx: after.x-before.x, facing: after.facing, sawTimer, blinked, dashPose, walkPose, maxStep:Math.round(maxStep) };
}

async function boot(p1key,p2key){
  await page.goto(`${base}/index.html?harness=1&p1=${p1key}&p2=${p2key}`, { waitUntil:"load" });
  await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot()); await wf(4);
}

try{
  // ── 1) NON-TELEPORT char (yuji, speed 90, dashTeleport:false, not in the speed-tier allowlist) ──
  await boot("yuji","yuji");
  let start = await p1(); let foe = await page.evaluate(()=>window.__harness.p2());
  check("P1 starts LEFT of the foe (facing +1 toward the right)", start.x < foe.x && start.facing===1, `p1.x=${Math.round(start.x)} p2.x=${Math.round(foe.x)} facing=${start.facing}`);

  // AWAY tap = LEFT ('a') since the foe is to the right. Expect a BACKDASH: moves -x, still facing +1.
  const back = await doubleTap("a");
  check("BACKDASH: double-tap away moves AWAY from the foe (Δx<0)", back.dx < -8, `Δx=${Math.round(back.dx)}`);
  check("BACKDASH: still faces the opponent (facing stays +1)", back.facing===1, `facing=${back.facing}`);
  check("BACKDASH: engages the real ground dashTimer", back.sawTimer, `sawTimer=${back.sawTimer}`);
  check("BACKDASH: reads as a retreat (walk pose, NOT the forward-dash lunge)", back.walkPose && !back.dashPose, `dashPose=${back.dashPose} walkPose=${back.walkPose}`);
  check("BACKDASH: no teleport blink", !back.blinked, `blinked=${back.blinked}`);

  await wf(30); // let dash cooldown clear
  // TOWARD tap = RIGHT ('d'). Non-teleport → forward ground dash: moves +x, dash pose.
  const fwd = await doubleTap("d");
  check("FORWARD dash: double-tap toward moves TOWARD the foe (Δx>0)", fwd.dx > 8, `Δx=${Math.round(fwd.dx)}`);
  check("FORWARD dash: engages dashTimer + shows the dash pose", fwd.sawTimer && fwd.dashPose, `sawTimer=${fwd.sawTimer} dashPose=${fwd.dashPose}`);
  check("FORWARD dash: no teleport blink for a non-teleport char", !fwd.blinked, `blinked=${fwd.blinked}`);

  // ── 2) TELEPORT-dasher (Gojo, dashTeleport:true) — the blink path must be UNTOUCHED ──
  await boot("gojo","gojo");
  start = await p1();
  const tp = await doubleTap("d");   // toward the foe → should BLINK behind them
  check("Gojo TOWARD double-tap still TELEPORTS (blink jump)", tp.blinked, `Δx=${Math.round(tp.dx)} blinked=${tp.blinked}`);

  await wf(60); // clear the 48f dashTeleport cooldown + dash cooldown
  const gback = await doubleTap("a");   // away → should BACKDASH (retreat), NOT blink
  check("Gojo AWAY double-tap BACKDASHES (retreats, no blink)", gback.dx < -8 && !gback.blinked && gback.facing===1, `Δx=${Math.round(gback.dx)} blinked=${gback.blinked} facing=${gback.facing}`);

  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
