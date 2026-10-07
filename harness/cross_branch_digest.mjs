// harness/cross_branch_digest.mjs — prints a deterministic SIM digest for a forced-seed AI match.
// Run it against two repo roots (second-screen vs main) to PROVE the companion-OFF path is byte-identical:
//   node harness/cross_branch_digest.mjs /path/to/mv-second-screen
//   node harness/cross_branch_digest.mjs /path/to/mv-main
// Boots with NO companion (default OFF) so this measures exactly the standalone sim.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(process.argv[2] || path.dirname(fileURLToPath(import.meta.url)) + "/..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json", ".woff2": "font/woff2" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.aiVsAi && window.__harness.rng, null, { timeout: 15000 });
  const digest = await page.evaluate(() => {
    window.__harness.rng.forceSeed(1234567);
    window.__harness.aiVsAi.start({ p1: "netero", p2: "beerus", matches: 1, speed: 1 });
    const seed = window.__harness.rng.seed();
    window.__harness.aiVsAi.step(300);
    const r = n => Math.round(n * 1000) / 1000;
    const f = s => s ? `${r(s.x)},${r(s.y)},${r(s.health)},${r(s.energy)}` : "null";
    return { seed, p1: f(window.__harness.p1()), p2: f(window.__harness.p2()), draws: window.__harness.rng.draw(5).map(r).join(",") };
  });
  console.log(JSON.stringify(digest));
} catch (e) { console.log("ERR " + (e && e.stack || e)); }
finally { await browser.close(); server.close(); }
