// harness/zenitsu_double_attack_shots.mjs — render Zenitsu's Double Attack (Tanjiro / Inosuke variants)
// to inspect the PARTNER's on-screen size relative to Zenitsu (the "miniature partner" report). Boots
// Zenitsu, holds a direction + Special (F=Tanjiro, D=Inosuke), and screenshots across the summon window.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const frame = () => page.evaluate(() => window.__harness.state().frame);
async function waitFrames(n) { const s = await frame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

async function cast(variant, dirKey) {
  await page.goto(`${base}/index.html?harness=1&p1=zenitsu&p2=gojo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  // park the dummy at mid-range so both Zenitsu (left) and the far-side partner are on screen
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 150); });
  await waitFrames(2);
  // hold direction FIRMLY before Special so _specialHeldDir latches (omniman/killua gotcha)
  await page.keyboard.down(dirKey); await waitFrames(4);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const shots = [];
  for (const w of [4, 9, 14, 20]) {
    await waitFrames(w - (shots.length ? [4, 9, 14, 20][shots.length - 1] : 0));
    const info = await page.evaluate(() => ({ summons: window.__harness.summons ? window.__harness.summons() : null, variant: window.__harness.p1()?._doubleAtkVariant || null }));
    const out = path.join(ROOT, "harness", "shots", `zenitsu_double_${variant}_f${w}.png`);
    await page.screenshot({ path: out, clip: { x: 200, y: 220, width: 900, height: 400 } });
    shots.push(out);
  }
  await page.keyboard.up(dirKey);
  console.log(`  ${variant}: shots → ${shots.map(s => path.basename(s)).join(", ")}`);
}

await cast("tanjiro", "d");   // Forward + Special (facing right → 'd' is forward)
await cast("inosuke", "s");   // Down + Special
await browser.close();
server.close();
process.exit(0);
