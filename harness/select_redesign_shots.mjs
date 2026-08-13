// harness/select_redesign_shots.mjs
// ---------------------------------------------------------------------------
// MK1/Tekken character-select redesign — screenshot proof.
//   Stage 1: grid AT REST — angular beveled cards + per-character accent cursor glow.
// Usage: node harness/select_redesign_shots.mjs [stage]
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "select_redesign_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
async function frames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 10000, polling: 16 }).catch(() => {}); }

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });

for (const u of ["dragon_ball", "jujutsu_kaisen", "naruto", "rick_and_morty"]) {
  await page.evaluate(uu => window.__harness.showCharSelect(uu, "training"), u);
  await frames(6);
  // Report the accent the cursor card (index 0) actually pulls — proves REAL per-character values.
  const info = await page.evaluate(() => {
    const r = window.__harness.activeGridRects?.() || [];
    const acc = window.__harness.cardAccent?.(0);
    return { count: r.length, accent: acc };
  });
  await page.screenshot({ path: path.join(OUT, `s1_rest_${u}.png`) });
  console.log(`Stage1 rest — ${u}: ${info.count} cards, cursor accent = ${info.accent}`);
}

console.log(errors.length ? `\n❌ ERRORS:\n${errors.join("\n")}` : "\n✅ no page errors");
console.log("Shots →", OUT);
await browser.close(); server.close(); process.exit(errors.length ? 1 : 0);
