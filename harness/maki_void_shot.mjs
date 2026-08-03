// harness/maki_void_shot.mjs — REAL in-match screenshots of Maki's "Void Hunter" skin: idle + an attack
// pose, confirming the full-form near-black base + the procedural starfield/nebula overlay both render and
// stay attached to the sprite across poses. Crops tight to the drawn sprite bbox for a clear look.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const drawRect = () => page.evaluate(() => { const f = window.__harness.p1?.(); return { x: f?._lastDrawX, y: f?._lastDrawY, w: f?._lastDrawW, h: f?._lastDrawH, sheet: f?.spriteSheet, skinId: f?.skinId }; });
async function cropShot(name) {
  const r = await drawRect();
  if (r.x == null) { await page.screenshot({ path: path.join(OUT, name) }); return r; }
  const pad = 46;
  const clip = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: Math.min(1280, r.w + pad * 2), height: Math.min(720, r.h + pad * 2) };
  await page.screenshot({ path: path.join(OUT, name), clip });
  return r;
}

await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const applied = await page.evaluate(() => window.__harness.setSkin?.("p1", "makiVoidHunter"));
await sleep(500);
// let the overlay clock advance a bit so the drift/swirl is mid-motion
await sleep(400);
const rIdle = await cropShot("maki_voidhunter_idle.png");
const fx = await page.evaluate(() => { const f = window.__harness.p1?.(); return { hasFX: !!f?._voidFX, stars: f?._voidFX?.stars?.length, nebulae: f?._voidFX?.nebulae?.length, clock: f?._voidHunterClock }; });
console.log(`applied=${applied} idle=`, JSON.stringify(rIdle), "fx=", JSON.stringify(fx));

// attack: heavy (k) — hold, capture mid-swing
await page.keyboard.down("k");
await sleep(130);
const rAtk = await cropShot("maki_voidhunter_attack.png");
await page.keyboard.up("k");
console.log("attack=", JSON.stringify(rAtk));
console.log("shots → harness/shots/maki_voidhunter_{idle,attack}.png");
await browser.close(); server.close();
