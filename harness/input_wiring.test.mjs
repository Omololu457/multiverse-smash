// harness/input_wiring.test.mjs
// ---------------------------------------------------------------------------
// Control-system rewire verification:
//  1. getFighterInput() is the single per-frame input path — PROVE it's called
//     every frame for BOTH fighters (inputWiring counters advance).
//  2. Keyboard play is unregressed — P1 moves + the reconciled special bind ("l")
//     triggers a special end-to-end through getFighterInput.
//  3. Controller auto-activation: a gamepadconnected event flips the device type to
//     "controller" (so getFighterInput routes to pollGamepad) without a manual toggle.
//
// NOTE: this environment has NO physical gamepad, so real button input can't be
// pressed — we prove the WIRING is connected (call path + type activation), and that
// keyboard is unaffected. Real-pad button testing needs a physical controller.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".csv": "text/csv" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("nf"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const wiring = () => page.evaluate(() => window.__harness.inputWiring());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=zenitsu&p2=zenitsu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness);
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── 1. getFighterInput called every frame for BOTH fighters ──────────────
  section("1) getFighterInput() is the single per-frame path for BOTH fighters");
  const w0 = await wiring();
  await waitFrames(30);
  const w1 = await wiring();
  const d1 = w1[1] - w0[1], d2 = w1[2] - w0[2];
  check("getFighterInput called every frame for P1 (playerNumber 1)", d1 >= 28, `+${d1} calls over ~30 frames`);
  check("getFighterInput called every frame for P2 (playerNumber 2)", d2 >= 28, `+${d2} calls over ~30 frames`);
  check("both fighters advance in lockstep (one shared input path)", Math.abs(d1 - d2) <= 2, `P1 +${d1}, P2 +${d2}`);

  // ── 2. Keyboard unregressed: movement + reconciled special bind ("l") ────
  section("2) keyboard unregressed (device type defaults to keyboard, no phantom pad)");
  check("P1 device type = keyboard (no gamepad → no auto-activate)", w1.p1Type === "keyboard", `p1Type=${w1.p1Type}`);
  check("P2 device type = keyboard", w1.p2Type === "keyboard", `p2Type=${w1.p2Type}`);

  const xStart = (await p1()).x;
  await page.keyboard.down("d"); await waitFrames(10); await page.keyboard.up("d");
  const xAfter = (await p1()).x;
  check("keyboard MOVE works: holding 'd' moves P1 right", xAfter > xStart + 5, `x ${xStart.toFixed(0)} → ${xAfter.toFixed(0)}`);
  await waitFrames(20);

  // Reconciled default: special is "l" (was drifted to "o" in input.js). Press l → a special.
  const before = await p1();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  const during = await p1();
  check("reconciled special bind: 'l' triggers a special through getFighterInput", during.attacking || during.currentMove, `attacking=${during.attacking} move=${during.currentMove}`);
  await waitFrames(30);

  // ── 3. Controller auto-activation (synthetic connect; no real pad here) ───
  section("3) controller auto-activation on gamepadconnected (wiring, not real input)");
  const preType = (await wiring()).p1Type;
  await page.evaluate(() => {
    const ev = new Event("gamepadconnected");
    Object.defineProperty(ev, "gamepad", { value: { index: 0, id: "synthetic-test-pad" } });
    window.dispatchEvent(ev);
  });
  await waitFrames(2);
  const postType = (await wiring()).p1Type;
  check("gamepadconnected flips P1 device type keyboard → controller", preType === "keyboard" && postType === "controller", `${preType} → ${postType}`);
  check("with type=controller, getFighterInput still runs (routes to pollGamepad)", (await (async () => { const a = (await wiring())[1]; await waitFrames(10); return (await wiring())[1] - a; })()) >= 8, "P1 still polled each frame");

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

  console.log("\nNOTE: real controller BUTTON input was NOT testable (no physical pad in this");
  console.log("environment). Verified: the input PATH is connected for both fighters, keyboard");
  console.log("is unregressed, and a pad-connect auto-activates the controller device type.");
} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
