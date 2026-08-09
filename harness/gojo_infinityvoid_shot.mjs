// harness/gojo_infinityvoid_shot.mjs — REAL in-match capture of Gojo "Infinity Void": the full near-black base
// + the procedural blue-white overlay (drawGojoInfinityVoidOverlay): slow cool motes + expanding barrier-ring
// pulses. Confirms the FX seeds, renders, and stays attached to the sprite bbox across poses. Tight crop.
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
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const fx = () => page.evaluate(() => window.__harness.gojoInfinityFX("p1"));
async function cropShot(name) {
  const r = await fx();
  const cam = await page.evaluate(() => window.__harness.camera());
  if (!r.rect || r.rect.x == null) { await page.screenshot({ path: path.join(OUT, name) }); return r; }
  const VW = 1280, VH = 720, z = cam.zoom, R = r.rect;
  const sx = (R.x - cam.x) * z + VW / 2, sy = (R.y - cam.y) * z + VH / 2, sw = R.w * z, sh = R.h * z;
  const pad = 46;
  const x = Math.max(0, Math.min(VW - 1, sx - pad));
  const y = Math.max(0, Math.min(VH - 1, sy - pad));
  const width = Math.max(1, Math.min(VW - x, sw + pad * 2));
  const height = Math.max(1, Math.min(VH - y, sh + pad * 2));
  await page.screenshot({ path: path.join(OUT, name), clip: { x, y, width, height } });
  return r;
}
await page.goto(`${base}/index.html?harness=1&p1=gojo&p2=gojo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const cam = await page.evaluate(() => window.__harness.camera());
await page.evaluate(cx => { window.__harness.setP1X(cx - 30); window.__harness.setP2X(cx + 150); }, cam.x);
await sleep(400);
const applied = await page.evaluate(() => window.__harness.setSkin?.("p1", "gojoInfinityVoid"));
await sleep(500);
// advance several frames so a barrier-ring pulse is mid-expansion in at least one capture
let idle;
for (let i = 0; i < 8; i++) { idle = await cropShot(`gojo_infinityvoid_idle_${i}.png`); await sleep(120); }
check("skin applied = gojoInfinityVoid", applied === "gojoInfinityVoid", `applied=${applied}`);
check("overlay seeded (22 motes + 3 ring emitters)", idle.seeded && idle.motes === 22 && idle.rings === 3, `motes=${idle.motes} rings=${idle.rings}`);
check("overlay clock advancing (animated)", idle.clock > 5, `clock=${idle.clock}`);
check("overlay tracks a valid sprite bbox", idle.rect && idle.rect.x != null && idle.rect.w > 0, JSON.stringify(idle.rect));
await page.keyboard.down("k"); await sleep(140);
const atk = await cropShot("gojo_infinityvoid_attack.png");
await page.keyboard.up("k");
check("overlay still gated + tracking on attack pose", atk.skinId === "gojoInfinityVoid" && atk.rect.x != null, JSON.stringify(atk.rect));
await page.keyboard.down("w"); await sleep(120);
const jmp = await cropShot("gojo_infinityvoid_jump.png");
await page.keyboard.up("w");
check("overlay follows the sprite in the air (bbox y moved)", jmp.rect.y != null && jmp.rect.y !== idle.rect.y, `idleY=${idle.rect.y} jumpY=${jmp.rect.y}`);
console.log(`\nshots → harness/shots/gojo_infinityvoid_*.png`);
console.log(`RESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
