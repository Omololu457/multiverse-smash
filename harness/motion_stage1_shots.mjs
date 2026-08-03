// harness/motion_stage1_shots.mjs — STAGE 1 EVIDENCE for the classic motion-input detector.
// Boots the REAL game headless and shows, with input→output logs + screenshots:
//   (1) Naruto (pilot): a motion sequence (↓→ QCF, then ↓→↓→ double-QCF) is DETECTED, and the
//       detected double-QCF drives a real on-screen action.
//   (2) Scoping: a NON-Naruto character (goku) never records a motion buffer and never detects a
//       motion — AND its own normal Special still fires (its controls are completely untouched).
// Outputs harness/shots/motion_s1_*.png. Run ALONE (concurrent Playwright inflates flakiness).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const mh = () => page.evaluate(() => window.__harness.p1MotionHistory());
const det = (n) => page.evaluate(x => window.__harness.p1DetectMotion(x), n);
const recent = () => page.evaluate(() => window.__harness.p1RecentMotions());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function pressDirs(dirs) { for (const k of dirs) await page.keyboard.press(k); }   // rapid direction edges (window-safe)

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}
async function prep(gap = 90) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

try {
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── STAGE 1 · PILOT = NARUTO ─────────────────────────────────");
  await boot("naruto");
  await prep();
  await shot("motion_s1_naruto_live.png");
  console.log("  (P1 faces right → forward='d', down='s', special='l')");

  // INPUT: ↓→ (quarter-circle-forward)
  await prep();
  await pressDirs(["s", "d"]);
  console.log(`\n  INPUT  ↓→ (QCF)        →  motionHistory=[${(await mh()).join(",")}]`);
  console.log(`  OUTPUT detectMotion('qcf')       = ${await det("qcf")}`);
  console.log(`  OUTPUT detectMotion('doubleQcf') = ${await det("doubleQcf")}   (correctly NOT a double)`);
  check("single QCF detected", await det("qcf"));
  check("single QCF is NOT mis-read as a double", !(await det("doubleQcf")));

  // INPUT: ↓→↓→ (double-quarter-circle-forward)
  await prep();
  await pressDirs(["s", "d", "s", "d"]);
  console.log(`\n  INPUT  ↓→↓→ (double-QCF) →  motionHistory=[${(await mh()).join(",")}]`);
  console.log(`  OUTPUT detectMotion('doubleQcf') = ${await det("doubleQcf")}`);
  console.log(`  OUTPUT getRecentMotions()        = [${(await recent()).join(", ")}]`);
  check("double-QCF detected", await det("doubleQcf"));

  // The detected double-QCF drives a real on-screen action (Special press → the bound move).
  const hp0 = (await p2()).health;
  await prep();
  await pressDirs(["s", "d", "s", "d"]); await tap("l");   // ↓→↓→ + Special
  await waitFrames(18);
  await shot("motion_s1_naruto_detected_action.png");
  await waitFrames(22);
  const dmg = hp0 - (await p2()).health;
  console.log(`\n  END-TO-END  ↓→↓→ + Special  →  on-screen action, opponent Δhp=${dmg.toFixed(0)}`);
  check("detected motion drove a real action (damage on screen)", dmg > 0, `Δhp=${dmg.toFixed(0)}`);

  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── STAGE 1 · SCOPING — NON-NARUTO CHARACTER (goku) ──────────");
  await boot("goku");
  await prep();
  await pressDirs(["s", "d", "s", "d"]);   // same double-QCF input on a non-Naruto char
  const gmh = await mh();
  console.log(`\n  INPUT  ↓→↓→ on GOKU     →  motionHistory=[${gmh.join(",")}]   (never allocated)`);
  console.log(`  OUTPUT detectMotion('qcf')       = ${await det("qcf")}`);
  console.log(`  OUTPUT detectMotion('doubleQcf') = ${await det("doubleQcf")}`);
  check("non-Naruto never records a motion buffer", gmh.length === 0, `hist=[${gmh.join(",")}]`);
  check("non-Naruto never detects a motion", !(await det("qcf")) && !(await det("doubleQcf")));

  // Goku's OWN controls are untouched: his normal Special still fires normally.
  await prep();
  const ge0 = (await p1()).energy;
  await tap("l");   // plain Special (Goku's Kamehameha/normal special)
  await waitFrames(16);
  const gdrop = ge0 - (await p1()).energy;
  await shot("motion_s1_goku_scoping.png");
  console.log(`\n  Goku plain Special fired normally → energy Δ=${gdrop.toFixed(0)} (controls untouched)`);
  check("non-Naruto's own Special still fires (controls untouched)", gdrop > 0, `Δenergy=${gdrop.toFixed(0)}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 1 evidence: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
