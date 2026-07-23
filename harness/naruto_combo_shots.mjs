// harness/naruto_combo_shots.mjs — VISUAL evidence for the Naruto Shadow-Clone combo routes.
// Boots the REAL game headless (?harness=1&p1=naruto) and screenshots each confirmed route at
// its connect moment. Not a pass/fail gate — the deterministic gate is harness/naruto.test.mjs.
// Outputs to harness/shots/ (NARUTO_*.png). Run ALONE (concurrent Playwright inflates flakiness).
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
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }

await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
await waitFrames(30);

async function prep(gap = 55) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const stage = (n) => page.evaluate(k => window.__harness.spawnP1Clones(k), n);

// R1 — Pincer Rendan launcher
await prep(); await stage(2);
await shot("NARUTO_R1_pincer_setup.png");
await tap("a", 1); await tap("w", 1); await tap("l");
await page.waitForFunction(() => (window.__harness.p2().vy || 0) < -3, null, { timeout: 3000, polling: 16 }).catch(() => {});
await shot("NARUTO_R1_pincer_launch.png");

// R3 — Rasengan Barrage
await prep(); await stage(2);
await tap("l"); await waitFrames(6);
await shot("NARUTO_R3_barrage_connect.png");

// R4 — Clone Uzumaki Barrage FINISHER (opponent in hitstun)
await prep(); await stage(2);
await page.evaluate(() => window.__harness.hurtP2(40));
await tap("s", 1); await tap("l");
await page.waitForFunction(() => { const q = window.__harness.p2(); return (q.vy || 0) > 3 || Math.abs(q.vx || 0) > 2; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
await shot("NARUTO_R4_finisher_slam.png");

// R5 — Clone Rush / Kage Assault setplay
await prep(); await stage(2);
await tap("d", 1); await tap("d", 1); await tap("l"); await waitFrames(6);
await shot("NARUTO_R5_clonerush_launch.png");         // rushers spawned, closing in
await waitFrames(22);
await shot("NARUTO_R5_clonerush_connect.png");        // a rusher reaching the opponent

console.log("done — shots in harness/shots/NARUTO_*.png");
await browser.close();
server.close();
process.exit(0);
