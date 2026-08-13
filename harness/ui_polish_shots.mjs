// harness/ui_polish_shots.mjs — reusable capture for the UI-polish pass (Stages 1-10).
// Usage: node harness/ui_polish_shots.mjs <outdir> <SCREEN> [hoverA,hoverB,...]
//   Captures the screen at rest, then a small hover clip cycling the given hover rows.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [, , outDir = "ui_polish_out", SCREEN = "MAIN_MENU", hoversCsv = "0,1,2,3"] = process.argv;
const OUT = path.join(ROOT, "harness", outDir);
fs.mkdirSync(OUT, { recursive: true });
const hovers = hoversCsv.split(",").map(s => parseInt(s, 10)).filter(x => !Number.isNaN(x));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
async function frames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 10000, polling: 16 }).catch(() => {}); }

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(s => window.__harness.showMenu(s, 0), SCREEN);
await frames(10);
await page.screenshot({ path: path.join(OUT, `${SCREEN}_rest.png`) });

let n = 0;
for (const hv of hovers) {
  await page.evaluate(([s, h]) => window.__harness.showMenu(s, h), [SCREEN, hv]);
  await frames(2); await page.screenshot({ path: path.join(OUT, `${SCREEN}_hover${String(++n).padStart(2, "0")}_row${hv}_mid.png`) });
  await frames(7); await page.screenshot({ path: path.join(OUT, `${SCREEN}_hover${String(n).padStart(2, "0")}_row${hv}_settled.png`) });
}
console.log(errors.length ? `❌ ERRORS:\n${errors.join("\n")}` : `✅ ${SCREEN}: no page errors, ${n} hover steps`);
await browser.close(); server.close(); process.exit(errors.length ? 1 : 0);
