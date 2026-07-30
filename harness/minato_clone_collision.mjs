// Realistic "blink then clone" sequences — reproduces the dashTeleport→attackCooldown collision
// that makes the Shadow Clone Special do nothing right after a Flying Raijin blink.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));
const stateF = () => page.evaluate(() => window.__harness.state());
const cloneCount = () => page.evaluate(() => window.__harness.p1CloneCount());
const dbg = () => page.evaluate(() => window.__cloneDbg || []);
const clearDbg = () => page.evaluate(() => { window.__cloneDbg = []; });
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }

await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(40);

// NON-BETA realistic sequence: blink (double-tap Forward) then clone (D→F + Special) shortly after.
console.log("═══ NON-BETA: Flying Raijin blink (F,F), then clone D→F+Special right after ═══");
await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); window.__harness.dispelP1Clones?.(); });
await waitFrames(60);
await clearDbg();
console.log("  clones before:", await cloneCount());
await tap("d", 2); await tap("d", 2);   // double-tap Forward → Flying Raijin blink
await waitFrames(3);                     // ~3 frames later the player goes for a clone
await tap("s", 1); await tap("d", 1); await tap("l");   // D→F + Special
await waitFrames(6);
console.log("  clones after blink+clone:", await cloneCount(), "  (expect ≥1 if collision fixed)");
console.log("  trace:", JSON.stringify(await dbg()));
{
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  const clip = r ? { x: Math.max(0, Math.round(r.x - 240)), y: Math.max(0, Math.round(r.y - r.h * 0.9)), width: 560, height: Math.round(r.h + r.h * 0.9 + 40) } : undefined;
  if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; }
  await page.screenshot({ path: path.join(ROOT, "harness", "shots", "minato_fix_blink_then_clone.png"), ...(clip ? { clip } : {}) });
  console.log("  screenshot → harness/shots/minato_fix_blink_then_clone.png");
}

await browser.close(); server.close();
