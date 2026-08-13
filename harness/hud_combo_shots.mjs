// harness/hud_combo_shots.mjs
// ---------------------------------------------------------------------------
// Stage 2 visual proof for the MK1/Tekken-8 combo-counter redesign
// (_drawComboCounters in game.js). Boots a REAL match and drives P1's live
// comboCounter up a string (2 → 27), capturing the REAL on-screen counter at
// each step to show it ESCALATING in size + heat + the per-hit scale punch.
//   node harness/hud_combo_shots.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "hud_combo_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };

const server = await new Promise(r => {
  const s = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); });
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// Crop around P1's combo counter (baseX ≈ 0.22*cw, baseY ≈ 0.38*ch).
const CLIP = { x: 40, y: 150, width: 520, height: 300 };

async function waitFrames(n) {
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(target => window.__harness.state().frame >= target, s0 + n, { timeout: 8000, polling: 16 });
}

await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.boot());
await waitFrames(10);

// Walk a real combo string. Keep re-arming the counter each step so its comboTimer
// doesn't decay, then capture the POP frame (right after the increment) to show the punch.
const STEPS = [2, 3, 4, 6, 8, 11, 15, 20, 27];
let i = 0;
for (const n of STEPS) {
  await page.evaluate(c => window.__harness.setCombo("p1", c), n);
  await waitFrames(2);   // opacity fades in + pop plays
  await page.screenshot({ path: path.join(OUT, `combo_${String(++i).padStart(2, "0")}_x${n}.png`), clip: CLIP });
}

// A couple of full-frame shots for context (mid + peak of the string).
await page.evaluate(() => window.__harness.setCombo("p1", 8));
await waitFrames(2);
await page.screenshot({ path: path.join(OUT, "full_mid_x8.png") });
await page.evaluate(() => window.__harness.setCombo("p1", 27));
await waitFrames(2);
await page.screenshot({ path: path.join(OUT, "full_peak_x27.png") });

console.log("Combo-counter shots written to", OUT);
await browser.close();
server.close();
process.exit(0);
