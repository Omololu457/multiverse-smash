// harness/hud_canvas_measure2.mjs — DIAGNOSTIC: DPR=2 (Retina) + live-resize path.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "hud_canvas_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

async function measure(page, tag) {
  const m = await page.evaluate(() => { const c = document.getElementById("gameCanvas"); const r = c.getBoundingClientRect(); return { innerW: window.innerWidth, dpr: window.devicePixelRatio, bufW: c.width, bufH: c.height, rectW: Math.round(r.width) }; });
  console.log(`  [${tag}] inner=${m.innerW} dpr=${m.dpr} buffer=${m.bufW}x${m.bufH} visibleRect=${m.rectW}  mismatch=${m.bufW !== m.rectW ? "YES(+" + (m.bufW - m.rectW) + "px)" : "no"}`);
  return m;
}

// A) DPR=2 (Retina Mac), narrow width
console.log("A) DPR=2 fresh load @ 1000x700");
let page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=hashirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.boot());
const s0 = await page.evaluate(() => window.__harness.state().frame);
await page.waitForFunction(t => window.__harness.state().frame >= t, s0 + 8, { timeout: 8000, polling: 16 });
await measure(page, "after boot");
await page.screenshot({ path: path.join(OUT, "dpr2_1000x700.png") });

// B) LIVE RESIZE (no reload): shrink the window, see if canvas.buffer follows
console.log("B) live-resize 1280->900 (no reload), DPR=1");
await page.close();
page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=hashirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.boot());
const s1 = await page.evaluate(() => window.__harness.state().frame);
await page.waitForFunction(t => window.__harness.state().frame >= t, s1 + 8, { timeout: 8000, polling: 16 });
await measure(page, "loaded @1280");
await page.setViewportSize({ width: 900, height: 720 });
await page.waitForTimeout(300);
await measure(page, "after resize->900");
await page.screenshot({ path: path.join(OUT, "resized_900.png") });

await browser.close(); server.close(); process.exit(0);
