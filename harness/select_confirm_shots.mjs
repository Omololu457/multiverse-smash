// harness/select_confirm_shots.mjs
// ---------------------------------------------------------------------------
// Stage 3 clip: a pick being CONFIRMED — the lock-in flourish (accent flash + zoom-punch)
// captured across its short beat, shown distinct from the passive Stage-2 hover state.
//   node harness/select_confirm_shots.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "select_confirm_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
async function frames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 10000, polling: 16 }).catch(() => {}); }
const CLIP = { x: 0, y: 60, width: 1280, height: 260 };
let n = 0;
const grab = async tag => page.screenshot({ path: path.join(OUT, `confirm_${String(++n).padStart(2, "0")}_${tag}.png`), clip: CLIP });

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));

// Hover Sasuke (card 1) and settle → the PASSIVE hover state (baseline to contrast against).
await page.evaluate(() => window.__harness.setCharHover(1));
await frames(10);
await grab("hover_baseline");

// CONFIRM P1's pick on the hovered card → kick the lock-in flourish; sample its short beat frame-by-frame.
await page.evaluate(() => window.__harness.confirmCharPick("p1", 1));
await frames(1);  await grab("flourish_f1");
await frames(2);  await grab("flourish_f3");
await frames(2);  await grab("flourish_f5");
await frames(3);  await grab("flourish_f8");
await frames(8);  await grab("settled_after");

console.log(errors.length ? `\n❌ ERRORS:\n${errors.join("\n")}` : `\n✅ no page errors — ${n} frames`);
console.log("Shots →", OUT);
await browser.close(); server.close(); process.exit(errors.length ? 1 : 0);
