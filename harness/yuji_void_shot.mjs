// harness/yuji_void_shot.mjs — REAL in-match screenshots of Yuji's "Void" skin: idle + AIR COMBO + ULTIMATE
// (the motion-heavy stress cases the brief calls out), confirming the full-form near-black base + the
// procedural white-dust/violet-cluster overlay both render and stay ATTACHED to the sprite across poses.
// Reads the yujiVoidFX hook at each pose to prove the overlay is seeded + its tracked bbox follows the sprite.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fxState = () => page.evaluate(() => window.__harness.yujiVoidFX?.());
const cam = () => page.evaluate(() => window.__harness.camera?.());
// _lastDraw* are in the pre-camera-transform (world) space (sprite + overlay draw INSIDE camera.applyTransform).
// Convert to screen: screen = (world - cam.{x,y})*zoom + canvas/2.
async function cropShot(name) {
  const r = await fxState(); const c = await cam(); const rr = r?.rect || {};
  let clip;
  if (rr.x != null && c) {
    const sx = (rr.x - c.x) * c.zoom + 640, sy = (rr.y - c.y) * c.zoom + 360;
    const sw = rr.w * c.zoom, sh = rr.h * c.zoom, pad = 40;
    const x0 = Math.max(0, sx - pad), y0 = Math.max(0, sy - pad);
    clip = { x: x0, y: y0, width: Math.min(1280 - x0, sw + pad * 2), height: Math.min(720 - y0, sh + pad * 2) };
  }
  await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) });
  return r;
}

await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await page.evaluate(() => window.__harness.setSession?.({ dummyBehavior: "stand" }));
await sleep(300);
const applied = await page.evaluate(() => window.__harness.setSkin?.("p1", "yujiVoid"));
await sleep(400);
// frame the fighters together inside the camera's view so p1 stays on-screen for every shot
await page.evaluate(() => { window.__harness.setP1X?.(520); window.__harness.setP2X?.(636); });
await sleep(700);

// ── IDLE ──
await sleep(300);
const idle = await cropShot("yuji_void_idle.png");
console.log(`applied=${applied}`);
console.log("IDLE  fx=", JSON.stringify(idle));

// ── AIR COMBO (Jump+Special airborne) ──
await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 60); window.__harness.liftP1?.(64); });
await sleep(60);
await page.keyboard.down("l"); await sleep(90);
const air = await cropShot("yuji_void_aircombo.png");
await page.keyboard.up("l");
console.log("AIR   fx=", JSON.stringify(air));
await sleep(600);

// ── ULTIMATE (buildup cinematic → Koma) ──
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 56); });
await sleep(120);
await page.keyboard.down("u"); await sleep(40); await page.keyboard.up("u");
await sleep(250);                                   // mid-buildup (ultimateAction pose)
const ultBuild = await cropShot("yuji_void_ultimate_build.png");
console.log("ULT-B fx=", JSON.stringify(ultBuild));
await sleep(500);                                   // let freeze lift into Koma, then mash
for (let i = 0; i < 5; i++) { await page.keyboard.down("j"); await sleep(40); await page.keyboard.up("j"); await sleep(40); }
const ultKoma = await cropShot("yuji_void_ultimate_koma.png");
console.log("ULT-K fx=", JSON.stringify(ultKoma));

console.log("shots → harness/shots/yuji_void_{idle,aircombo,ultimate_build,ultimate_koma}.png");
await browser.close(); server.close();
