// harness/gon_reverify_shot.mjs — FRESH-BYTES re-verification of Gon's intro + speed +
// animation-utilization, with real rendered evidence (cache is irrelevant here: a fresh
// chromium context + this inline server serves current working-tree bytes, ignoring ?v=).
// Proves, LIVE:
//   1) intro renders a real idle-hold pose (not the garbled 128² fallback box),
//   2) Gon actually MOVES when forward is held (speed not broken/stuck), animation frames CYCLE,
//   3) the "wired" specials (Jajanken rock/scissors/paper + rekka) actually PLAY on press.
// Outputs harness/shots/gon_*.png. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const rinfo = () => page.evaluate(() => window.__harness.renderInfo("p1"));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));

await page.goto(`${base}/index.html?harness=1&p1=gon`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });

try {
  // ── 1. INTRO (idle-hold) renders a real pose, not the garbled 128² fallback box ──
  console.log("── 1. Intro (introPool:['idle'] idle-hold) ──");
  await page.evaluate(() => window.__harness.forceIntro?.("idle"));
  await waitFrames(10);
  const introR = await rinfo();
  check("intro plays the idle-hold pose (action=idle)", String(introR?.action || "").toLowerCase() === "idle", `action=${introR?.action}`);
  check("intro renders a real cell, NOT the 128² fallback box", (introR?.dstH || 0) > 30 && (introR?.dstH || 0) < 128 * 1.6, `dstH=${introR?.dstH}`);
  await shot("gon_intro_idlehold.png");

  // ── 2. SPEED: hold forward, measure px/frame, confirm animation frames CYCLE ──
  console.log("── 2. Speed + frame-cycling (hold forward) ──");
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(3);
  const xStart = (await p1()).x;
  const N = 30;
  await page.keyboard.down("d");
  const frames = [];
  for (let i = 0; i < 3; i++) { await waitFrames(N / 3); const s = await p1(); frames.push({ x: Math.round(s.x), fi: s.frameIndex, action: s.action }); }
  await page.keyboard.up("d");
  const xEnd = frames[frames.length - 1].x;
  const dist = xEnd - xStart;
  const pxPerFrame = (dist / N).toFixed(2);
  const framesCycled = new Set(frames.map(f => f.fi)).size > 1;
  console.log(`  x: ${Math.round(xStart)} → ${xEnd}  (Δ${dist}px over ${N}f = ${pxPerFrame} px/f);  frameIndex samples: ${frames.map(f => f.fi).join(",")};  action=${frames[0].action}`);
  check("Gon MOVES forward when forward is held (speed not stuck)", dist > 40, `Δ${dist}px`);
  check("movement speed is in a sane band (not frozen / not teleporting)", Number(pxPerFrame) > 1 && Number(pxPerFrame) < 12, `${pxPerFrame} px/f`);
  check("run animation frames CYCLE while moving (not frozen on one cell)", framesCycled, `frameIndex=[${frames.map(f => f.fi).join(",")}]`);
  await page.keyboard.down("d"); await waitFrames(6); await shot("gon_running.png"); await page.keyboard.up("d");

  // ── 3. WIRED specials actually PLAY on press (live utilization proof) ──
  console.log("── 3. Jajanken specials + rekka play on press ──");
  // Jajanken variant = the direction HELD at the instant Special is pressed (_specialHeldDir).
  // So the direction key must be DOWN while pressing Special — a bare tap-then-special reads neutral.
  // wait until Gon is actionable (grounded, not mid-attack) so the next special press isn't dropped.
  async function waitActionable() {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  }
  async function fireSpecial(label, holdDir, expected, shotName) {
    await waitActionable();
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
    await waitFrames(4);
    if (holdDir) { await page.keyboard.down(holdDir); await waitFrames(2); }
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    if (holdDir) await page.keyboard.up(holdDir);
    let seen = null;
    for (let i = 0; i < 8; i++) { const a = String((await rinfo())?.action || "").toLowerCase(); if (a === expected) { seen = a; break; } await waitFrames(2); }
    check(`${label} plays its own animation (action=${expected})`, seen === expected, `saw=${seen || (await rinfo())?.action}`);
    if (shotName) await shot(shotName);
    await waitFrames(20);
  }
  // Rekka opener = Down HELD + Heavy pressed.
  async function fireRekka(label, expected) {
    await waitActionable();
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
    await waitFrames(4);
    await page.keyboard.down("s"); await waitFrames(2);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    await page.keyboard.up("s");
    let seen = null;
    for (let i = 0; i < 8; i++) { const a = String((await rinfo())?.action || "").toLowerCase(); if (a === expected) { seen = a; break; } await waitFrames(2); }
    check(`${label} plays its own animation (action=${expected})`, seen === expected, `saw=${seen || (await rinfo())?.action}`);
    await waitFrames(20);
  }
  await fireSpecial("Jajanken ROCK (neutral+Special)", null, "rock", "gon_jajanken_rock.png");
  await fireSpecial("Jajanken SCISSORS (Forward+Special)", "d", "scissors", "gon_jajanken_scissors.png");
  await fireSpecial("Jajanken PAPER (Down+Special)", "s", "paper", "gon_jajanken_paper.png");
  await fireRekka("Rush rekka opener (Down+Heavy)", "rush1");
} catch (e) {
  console.error("  ❌ harness error:", e.message);
  FAIL++;
} finally {
  console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
  await browser.close();
  server.close();
  process.exit(FAIL ? 1 : 0);
}
