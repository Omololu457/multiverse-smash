// harness/round_transition_verify.mjs — ROUND-TRANSITION POLISH (Track C), LIVE proof.
// The "ROUND X" banner used to be a STATIC pop and the "FIGHT!" branch never rendered (the caller only
// invokes drawRoundCountdown while countdown > 0). This pass gives "ROUND X" an animated scale-in +
// fade + settle entrance and repurposes the final ~0.45s as an animated "FIGHT!" (combat still begins
// at countdown <= 0 — no timing/gating change). This runs the REAL match intro, spies on canvas
// fillText to capture each banner's live transform scale + alpha, and asserts:
//   • "ROUND X" scales IN (early frames scale<1 & alpha<1 → later ~1) instead of a static pop,
//   • the sequence reads ROUND → digits → FIGHT!,
//   • "FIGHT!" now actually renders (and animates in),
//   • combat still starts (countdown reaches 0) — the announcement did not stall the round.
// Run: `node harness/round_transition_verify.mjs`.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "round_trans_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16}).catch(()=>{}); }
const st = () => page.evaluate(()=>window.__harness.state());

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  // spy: record every banner fillText with its live transform scale (.a) + globalAlpha
  await page.evaluate(() => {
    window.__rc = [];
    const proto = CanvasRenderingContext2D.prototype; const orig = proto.fillText;
    proto.fillText = function(text, x, y, ...rest) {
      const s = String(text);
      if (/^ROUND |^FIGHT!$|^[0-9]$/.test(s)) {
        let a = 1; try { a = this.getTransform().a; } catch(_){}
        window.__rc.push({ t: s, a: +a.toFixed(3), alpha: +(this.globalAlpha||1).toFixed(3) });
      }
      return orig.call(this, text, x, y, ...rest);
    };
  });

  // start the REAL match (full intro + 3s countdown) — do NOT skipToBattle
  await page.evaluate(() => window.__harness.start());
  // run through intro + countdown until combat begins (countdown reaches 0), capturing spy data
  let reachedZero = false, guard = 0;
  while (!reachedZero && guard++ < 60) {
    const s = await st();
    if (s.countdown === 0) reachedZero = true;
    await waitFrames(8);
  }
  await waitFrames(4);

  const rc = await page.evaluate(() => window.__rc);
  const round = rc.filter(e => e.t.startsWith("ROUND "));
  const digits = rc.filter(e => /^[0-9]$/.test(e.t));
  const fight = rc.filter(e => e.t === "FIGHT!");

  console.log(`    captured: ROUND=${round.length} digits=${digits.length} FIGHT=${fight.length}`);

  // ── ROUND X animated entrance ──
  console.log("\n─── ROUND banner scale-in ───");
  check("ROUND banner rendered", round.length > 0, `frames=${round.length}`);
  const rMinScale = Math.min(...round.map(e => e.a)), rMaxScale = Math.max(...round.map(e => e.a));
  const rMinAlpha = Math.min(...round.map(e => e.alpha));
  check("ROUND banner SCALES IN (early scale <1, settles to ~1)", round.length>0 && rMinScale < 0.85 && rMaxScale >= 0.98, `scale ${rMinScale}→${rMaxScale}`);
  check("ROUND banner FADES IN (early alpha <1)", round.length>0 && rMinAlpha < 0.9, `minAlpha=${rMinAlpha}`);

  // ── FIGHT! now renders + animates (was dead code) ──
  console.log("\n─── FIGHT! banner ───");
  check("FIGHT! banner rendered (previously never shown)", fight.length > 0, `frames=${fight.length}`);
  const fMinScale = Math.min(...fight.map(e => e.a));
  check("FIGHT! SCALES IN (early scale <1)", fight.length>0 && fMinScale < 0.9, `minScale=${fMinScale}`);

  // ── sequence order ──
  console.log("\n─── announcement order ───");
  const firstRound = rc.findIndex(e => e.t.startsWith("ROUND "));
  const firstDigit = rc.findIndex(e => /^[0-9]$/.test(e.t));
  const firstFight = rc.findIndex(e => e.t === "FIGHT!");
  check("order: ROUND → digits → FIGHT!", firstRound >= 0 && firstDigit > firstRound && firstFight > firstDigit,
        `idx ROUND=${firstRound} digit=${firstDigit} FIGHT=${firstFight}`);

  // ── combat actually started (no stall) ──
  console.log("\n─── round starts (no delay) ───");
  const s2 = await st();
  check("countdown reached 0 → combat began", reachedZero && s2.countdown === 0, `countdown=${s2.countdown}`);

  // ── SECOND ROUND: the banner replays fresh with the correct number + animation ──
  console.log("\n─── round 2 replay ───");
  await page.evaluate(() => { window.__rc = []; });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.setRoundNumber(2));   // force the number the round-2 banner shows
  let z2 = false, g2 = 0;
  while (!z2 && g2++ < 60) { const s = await st(); if (s.countdown === 0) z2 = true; await waitFrames(8); }
  const rc2 = await page.evaluate(() => window.__rc);
  const round2 = rc2.filter(e => e.t === "ROUND 2");
  const fight2 = rc2.filter(e => e.t === "FIGHT!");
  check("round 2: 'ROUND 2' banner rendered", round2.length > 0, `frames=${round2.length}`);
  check("round 2: banner still SCALES IN", round2.length>0 && Math.min(...round2.map(e=>e.a)) < 0.85, `minScale=${round2.length?Math.min(...round2.map(e=>e.a)):"—"}`);
  check("round 2: FIGHT! still renders + combat starts", fight2.length > 0 && z2, `fight=${fight2.length} cd0=${z2}`);

  check("no JS errors", errs.length === 0, errs[0] || "");
} catch (e) {
  console.log("FATAL", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  ROUND TRANSITION (Track C): ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
