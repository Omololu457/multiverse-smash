// harness/clone_render_diag.mjs — DIAGNOSTIC (no fix): measure the owner's rendered size vs a clone's, in the
// same frame, per character, and capture a side-by-side screenshot. Answers:
//   Reading A — scale mismatch: does a clone render at the SAME on-screen size as the owner? (The owner path
//               multiplies by GLOBAL_SPRITE_SCALE=1.18 at sprite.js:867; the clone path (drawSummons) does NOT.)
//   Reading B — render path: clones draw via drawSummons (single curated sheet, no sourceY/anchorY), NOT the
//               fighter's drawFighter/SpriteHandler pipeline. (Confirmed structurally; noted per char.)
// Prints measured heights + the clone/owner ratio, and screenshots owner + clones together.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });

const CHARS = ["naruto", "tobirama", "hashirama"];
const rows = [];

for (const char of CHARS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", e => console.log(`  ⚠️  [${char}] pageerror:`, e.message));
  const stateF = () => page.evaluate(() => window.__harness.state());
  const waitFrames = async n => { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); };

  await page.goto(`${base}/index.html?harness=1&p1=${char}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(40);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  // idle the owner a beat so its _lastDrawH reflects the idle pose, then spawn 2 clones
  await waitFrames(10);
  await page.keyboard.press(","); await waitFrames(8);
  await page.keyboard.press(","); await waitFrames(30);   // clones materialize + draw at least once

  const m = await page.evaluate(() => window.__harness.cloneRenderMetrics());
  const ownerH = m.owner?.lastDrawH || 0;
  const cl = (m.clones || [])[0] || {};
  const cloneH = cl.renderH || 0;
  const ratio = ownerH ? +(cloneH / ownerH).toFixed(3) : 0;
  rows.push({ char, ownerH, ownerScale: m.owner?.effectiveScale, cloneH, cloneScale: cl.spriteScale, ratio });

  console.log(`\n═══ ${char} ═══`);
  console.log(`  OWNER  rendered height = ${ownerH}px   (spriteScale ${m.owner?.spriteScale} × 1.18 = ${m.owner?.effectiveScale})`);
  console.log(`  CLONE  rendered height = ${cloneH}px   (CLONE_BODY_SETS scale ${cl.spriteScale} × 1.18 to match owner)   sheet cellH ${cl.spriteH}`);
  console.log(`  CLONE / OWNER size ratio = ${ratio}   ${Math.abs(ratio - 1) <= 0.08 ? "≈ MATCH" : ratio < 1 ? "→ CLONE IS SMALLER" : "→ CLONE IS LARGER"}`);

  // screenshot the owner + clones together
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  const clip = r ? { x: Math.max(0, Math.round(r.x - 300)), y: Math.max(0, Math.round(r.y - r.h * 0.7)), width: 640, height: Math.round(r.h * 2.0) } : undefined;
  if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; }
  await page.screenshot({ path: path.join(OUT, `clone_render_diag_${char}.png`), ...(clip ? { clip } : {}) });
  await page.close();
}

console.log("\n\n════════════ SUMMARY — clone vs owner rendered size ════════════");
console.log("  char        ownerH   cloneH   ratio   verdict");
for (const r of rows) {
  const v = Math.abs(r.ratio - 1) <= 0.08 ? "match" : r.ratio < 1 ? `clone ${Math.round((1 - r.ratio) * 100)}% SMALLER` : `clone ${Math.round((r.ratio - 1) * 100)}% larger`;
  console.log(`  ${r.char.padEnd(11)} ${String(r.ownerH).padStart(5)}   ${String(r.cloneH).padStart(5)}   ${String(r.ratio).padStart(5)}   ${v}`);
}
console.log("\n  (Reading A = a size ratio ≠ ~1.0.  Reading B = the render PATH: clones use drawSummons, not drawFighter — structural, independent of the ratio.)");
console.log("  shots → harness/shots/clone_render_diag_<char>.png");
await browser.close(); server.close();
