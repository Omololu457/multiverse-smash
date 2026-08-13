// harness/hashirama_spec_glow_shot.mjs — REAL in-match capture of the 4 Hashirama spec GLOW skins
// (Golden Sage Eyes / Ashen Reanimation / White Binding / Void-green). The glowing eyes + green Wood-
// Release aura are a game.js draw-overlay (drawHashiramaSpecOverlay), so they only exist in-canvas —
// this captures a centred, head-tight crop per skin proving the overlay renders + is gated by skinId.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=hashirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const cam = await page.evaluate(() => window.__harness.camera());
await page.evaluate(cx => { window.__harness.setP1X(cx - 30); window.__harness.setP2X(cx + 220); }, cam.x);   // same framing as the confirmed capture (camera auto-frames both)
await sleep(400);

const SKINS = ["hashiramaGoldensage", "hashiramaAshenreanim", "hashiramaWhitebinding", "hashiramaVoidgreen", "hashiramaSenjuspiral"];
const CLIP = { x: 452, y: 288, width: 120, height: 150 };   // tight on p1 head+torso (from the confirmed full-frame position)
for (const id of SKINS) {
  const applied = await page.evaluate(s => window.__harness.setSkin?.("p1", s), id);
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, `hashi_${id}.png`), clip: CLIP });
  check(`${id} applied`, applied === id, `applied=${applied}`);
}
console.log(`\n${PASS} PASS / ${FAIL} FAIL`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
