// harness/select_hover_shots.mjs
// ---------------------------------------------------------------------------
// Stage 2 clip: the character-select CURSOR moving across several cards, proving the
// hover scale-up + accent glow-pulse ANIMATE smoothly (eased) rather than snapping.
// Samples 2 mid-ease frames per move so the transition (not just the settled state) shows.
//   node harness/select_hover_shots.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "select_hover_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
async function frames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 10000, polling: 16 }).catch(() => {}); }

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
// Naruto — 10 cards, several unlocked, distinct chakra-blue accent.
await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
await frames(8);

let n = 0;
async function grab(tag) { await page.screenshot({ path: path.join(OUT, `hover_${String(++n).padStart(2, "0")}_${tag}.png`), clip: { x: 0, y: 60, width: 1280, height: 260 } }); }

// Walk the cursor across cards 0→4, sampling MID-EASE (2 frames after each move) then SETTLED (8 frames)
// so the scale/glow is caught animating, not only at rest.
for (const idx of [0, 1, 2, 3, 4]) {
  await page.evaluate(i => window.__harness.setCharHover(i), idx);
  await frames(2); await grab(`x${idx}_mid`);
  await frames(6); await grab(`x${idx}_settled`);
}

console.log(errors.length ? `\n❌ ERRORS:\n${errors.join("\n")}` : `\n✅ no page errors — ${n} frames`);
console.log("Shots →", OUT);
await browser.close(); server.close(); process.exit(errors.length ? 1 : 0);
