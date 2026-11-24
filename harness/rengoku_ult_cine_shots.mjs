// harness/rengoku_ult_cine_shots.mjs — render check of Rengoku's ultimate cinematic (Flame Breathing · Ultimate Technique ·
// Ninth Form: Rengoku): one screenshot per beat → docs/rengoku/ult_cinematic/. Usage: node harness/rengoku_ult_cine_shots.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/rengoku/ult_cinematic"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res) }); s.listen(0, () => r(s)) });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
await page.goto(`${base}/index.html?harness=1&p1=rengoku&p2=spd_red`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness?.start, null, { timeout: 90000 });
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.() });
await page.waitForFunction(() => window.__harness.state?.().frame > 60, null, { timeout: 60000, polling: 50 });
const a = await page.evaluate(() => window.__harness.p1()); await page.evaluate(x => window.__harness.setP2X(x), a.x + 300);
await page.waitForTimeout(500);
await page.keyboard.down("u"); await page.waitForTimeout(40); await page.keyboard.up("u");
const SHOTS = [[40, "01_zoom_in"], [100, "02_inhale"], [140, "03_exhale"], [180, "04_ogi"], [228, "05_ku_no_kata"], [280, "06_rengoku_engulfed"], [304, "07_dash_through"], [320, "08_stillness"], [336, "09_the_cut"], [370, "10_pull_back"]];
let ok = 0
for (const [fr, name] of SHOTS) {
  await page.waitForFunction(fr => { const c = window.__harness.rengokuUltCine(); return !c.active || c.frame >= fr }, fr, { timeout: 20000, polling: 4 }).catch(() => {});
  const c = await page.evaluate(() => ({ ...window.__harness.rengokuUltCine(), cam: window.__harness.ultCrop?.() }));
  await page.screenshot({ path: path.join(OUT, name + ".png") }); if (c.active) ok++
  console.log(`  ${name}: frame ${c.frame} phase ${c.phase} zoom ${c.cam?.zoom?.toFixed(2)} max ${c.cam?.maxZoom}`)
}
console.log(`RENGOKU ULT CINEMATIC SHOTS: ${ok}/${SHOTS.length} captured mid-cinematic; page errors: ${errs.length}`, errs.slice(0, 3));
await browser.close(); server.close();
