// harness/hud_redesign_shots.mjs
// ---------------------------------------------------------------------------
// Stage 1 visual proof for the MK1/Tekken-8 HUD redesign (drawHealthAndEnergyBars).
// Boots a REAL match in Chromium and captures, off the real render path:
//   1. NEW panel styling AT REST (full HP)
//   2. a health bar MID-DRAIN showing the damage-trail ghost segment (frames after a hit)
//   3. a BIG hit's sharper flash + shake reaction (captured on the flash-peak frame)
// Cropped top-strip shots isolate the health panels for a legible comparison.
//   node harness/hud_redesign_shots.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", process.argv[2] || "hud_redesign_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };

const server = await new Promise(r => {
  const s = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); });
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const TOP = { x: 0, y: 0, width: 1280, height: 92 };   // both health panels + round pips

async function waitFrames(n) {
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(target => window.__harness.state().frame >= target, s0 + n, { timeout: 8000, polling: 16 });
}
async function shot(name, clip) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), clip });
  await page.screenshot({ path: path.join(OUT, `${name}_full.png`) });
}

await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.boot());
await waitFrames(10);

// 1) AT REST — full HP, new metallic/angular panels
await shot("01_rest", TOP);

// 2) MID-DRAIN — land a big hit on P2, then sample the ghost catching up across frames.
await page.evaluate(() => window.__harness.hudHit("p2", 360, "big"));
await waitFrames(4);
await shot("02_middrain_early", TOP);   // front bar dropped, ghost still lagging
await waitFrames(8);
await shot("03_middrain_late", TOP);    // ghost most of the way caught up

// 3) BIG-HIT FLASH — fresh big hit, capture on the flash/shake peak (next frame).
await page.evaluate(() => window.__harness.hudHit("p1", 300, "big"));
await waitFrames(1);
await shot("04_bighit_flash", TOP);

// 4) LIGHT hit for contrast (drain only, minimal flash, no shake)
await page.evaluate(() => window.__harness.hudHit("p2", 70, "light"));
await waitFrames(1);
await shot("05_lighthit", TOP);

// 5) LOW-HP danger palette (battle-worn red) + settle
await page.evaluate(() => window.__harness.hudHit("p2", 300, "big"));
await waitFrames(30);
await shot("06_lowhp_settled", TOP);

console.log("HUD redesign shots written to", OUT);
await browser.close();
server.close();
process.exit(0);
