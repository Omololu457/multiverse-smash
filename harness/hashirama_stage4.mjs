// harness/hashirama_stage4.mjs — STAGE 4: Wood Release Punch (CHARGE tap/hold) + Mokuton arm eruption.
//  • TAP the CHARGE key (P, <200ms) → woodPunch (base wood-spear punch) connects.
//  • HOLD P (≥200ms) → the hold plays the "charge" hand-seals pose, RELEASE → woodPunchSuper (larger
//    branching eruption) connects, and deals MORE damage than the tap.
//  • Fwd+Special → mokutonArm (arm-eruption) connects.
// Tap/hold split is real-time (200ms), so timing uses waitForTimeout for determinism; results are also
// re-checked by currentMove so a mistimed press is retried rather than mis-asserted.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `hashirama_s4_${tag}.png`) }); }
async function park(gap) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitMove(move, maxF = 22) { for (let f = 0; f < maxF; f++) { const s = await p1(); if (s.currentMove === move) return s; await waitFrames(1); } return await p1(); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=hashirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── WOOD PUNCH — TAP (base) ──
  console.log("\n── Wood Release Punch: TAP (base) ──");
  let tapDmg = 0, tapSheet = "";
  for (let attempt = 0; attempt < 4 && tapDmg <= 0; attempt++) {
    await page.waitForFunction(() => (window.__harness.p1().woodPunchCd || 0) === 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
    await park(110);
    const hp0 = (await p2()).health;
    await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p");   // quick tap (<200ms)
    const mv = await waitMove("woodPunch");
    if (mv.currentMove === "woodPunch") { await waitFrames(3); const tm = await p1(); if (tm.currentMove === "woodPunch") tapSheet = tm.spriteSheet || mv.spriteSheet || ""; await shot("tap"); }   // read a few frames in (past any charge-pose overlap)
    await waitFrames(16);
    tapDmg = Math.max(tapDmg, hp0 - (await p2()).health);
  }
  check("TAP → woodPunch pose (wood_rellese_punch, not super)", tapSheet.includes("wood_rellese_punch_uniform"), `sheet=${tapSheet}`);
  check("TAP connects (dmg)", tapDmg > 0, `−${tapDmg.toFixed(0)}`);
  await waitGrounded();

  // ── WOOD PUNCH — HOLD (Super) + charge pose ──
  console.log("\n── Wood Release Punch: HOLD (Super) + charge pose ──");
  let superDmg = 0, superSheet = "", sawChargePose = false;
  for (let attempt = 0; attempt < 4 && superDmg <= 0; attempt++) {
    await page.waitForFunction(() => (window.__harness.p1().woodPunchCd || 0) === 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
    await park(140);   // super has longer reach
    const hp0 = (await p2()).health;
    await page.keyboard.down("p");
    // sample the charge pose across the wind-up (isCharging + hand-seals sheet)
    for (let f = 0; f < 8; f++) { await waitFrames(1); const cs = await p1(); if (cs.isCharging && (cs.spriteSheet || "").includes("hand_signs_uniform")) { sawChargePose = true; if (!superSheet && attempt === 0) await shot("charge_pose"); } }
    await page.waitForTimeout(350);                      // hold ≥200ms → strong tier
    await page.keyboard.up("p");
    const mv = await waitMove("woodPunchSuper");
    if (mv.currentMove === "woodPunchSuper") { await waitFrames(3); const sm = await p1(); if (sm.currentMove === "woodPunchSuper") superSheet = sm.spriteSheet || mv.spriteSheet || ""; await shot("super"); }   // read a few frames in (past any charge-pose overlap)
    await waitFrames(18);
    superDmg = Math.max(superDmg, hp0 - (await p2()).health);
  }
  check("HOLD plays the charge (hand-seals) pose while winding up", sawChargePose, "");
  check("HOLD → woodPunchSuper pose (wood_rellese_punch_super)", superSheet.includes("wood_rellese_punch_super_uniform"), `sheet=${superSheet}`);
  check("HOLD connects (dmg)", superDmg > 0, `−${superDmg.toFixed(0)}`);
  check("Super out-damages the base tap", superDmg > tapDmg, `super −${superDmg.toFixed(0)} vs tap −${tapDmg.toFixed(0)}`);
  await waitGrounded();

  // ── MOKUTON ARM ERUPTION — Fwd+Special ──
  console.log("\n── Mokuton arm eruption (Fwd+Special) ──");
  let armDmg = 0, armSheet = "";
  for (let attempt = 0; attempt < 4 && armDmg <= 0; attempt++) {
    await park(90);
    const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(3);            // hold forward
    await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l");
    const mv = await waitMove("mokutonArm");
    if (mv.currentMove === "mokutonArm") { armSheet = mv.spriteSheet || ""; await shot("mokuton_arm"); }
    await waitFrames(16);
    await page.keyboard.up("d");
    armDmg = Math.max(armDmg, hp0 - (await p2()).health);
    await waitGrounded();
  }
  check("Fwd+Special → mokutonArm pose (mokuton_lul_4)", armSheet.includes("mokuton_lul_4_uniform"), `sheet=${armSheet}`);
  check("Mokuton arm connects (dmg)", armDmg > 0, `−${armDmg.toFixed(0)}`);

  // ── DATA CONTRACT ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("hashirama")?.animationData || {});
  const map = { charge: "hand_signs", woodPunch: "wood_rellese_punch_uniform", woodPunchSuper: "wood_rellese_punch_super_uniform", mokutonArm: "mokuton_lul_4" };
  const allWired = Object.entries(map).every(([k, tok]) => (ad[k]?.sheet || "").includes(tok));
  check("charge/woodPunch/woodPunchSuper/mokutonArm wired to real sheets", allWired, JSON.stringify(Object.fromEntries(Object.keys(map).map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Hashirama Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/hashirama_s4_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
