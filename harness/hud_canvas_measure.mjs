// harness/hud_canvas_measure.mjs — DIAGNOSTIC ONLY (measure, don't patch)
// Loads the game at several viewport widths, boots a Hashirama match, and reports the
// canvas drawing-buffer size vs the visible viewport/CSS size, plus a screenshot, to
// pin down the right-anchored-HUD cutoff cause.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "hud_canvas_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

for (const vp of [{ w: 1000, h: 700 }, { w: 1280, h: 720 }, { w: 820, h: 640 }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=hashirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(t => window.__harness.state().frame >= t, s0 + 8, { timeout: 8000, polling: 16 });
  const m = await page.evaluate(() => {
    const c = document.getElementById("gameCanvas");
    const cs = getComputedStyle(c);
    const r = c.getBoundingClientRect();
    return {
      innerW: window.innerWidth, innerH: window.innerHeight, dpr: window.devicePixelRatio,
      bufW: c.width, bufH: c.height,
      cssW: cs.width, cssH: cs.height,
      clientW: c.clientWidth, clientH: c.clientHeight,
      rectW: Math.round(r.width), rectH: Math.round(r.height),
      transform: cs.transform,
    };
  });
  console.log(`\nviewport ${vp.w}x${vp.h}`);
  console.log(`  window.inner   = ${m.innerW} x ${m.innerH}  (dpr ${m.dpr})`);
  console.log(`  canvas.buffer  = ${m.bufW} x ${m.bufH}   <-- what cw/ch report to the HUD`);
  console.log(`  canvas CSS box = ${m.cssW} x ${m.cssH}  (client ${m.clientW}x${m.clientH}, rect ${m.rectW}x${m.rectH})`);
  console.log(`  ctx/canvas transform = ${m.transform}`);
  console.log(`  MISMATCH buffer-vs-visible: ${m.bufW !== m.rectW ? "YES (" + (m.bufW - m.rectW) + "px wider buffer)" : "no"}`);
  await page.screenshot({ path: path.join(OUT, `measure_${vp.w}x${vp.h}.png`) });
  await page.close();
}
await browser.close();
server.close();
process.exit(0);
