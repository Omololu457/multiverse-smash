// harness/hud_match_entry_shots.mjs
// ---------------------------------------------------------------------------
// Stage 3 visual proof for the MK1/Tekken-8 MATCH-ENTRY STING (matchEntryTransition.js).
// Drives the REAL match-start flow (character-select → INTRO → BATTLE countdown) — NOT the
// boot() intro-skip — so the sting fires exactly where it ships: at the ROUND-1 countdown.
// Captures a filmstrip of the directional wipe revealing the stage and landing on ROUND 1.
// The sting is stretched (capture-only) so the ~0.5s reveal samples densely; it SHIPS at 30f.
//   node harness/hud_match_entry_shots.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "hud_match_entry_out");
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

await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });

// Stretch the sting so the filmstrip can sample the reveal cleanly (ships at 30f), then start
// a REAL match — do NOT call boot()/skipToBattle (those collapse the intro + countdown).
await page.evaluate(() => window.__harness.setMatchEntryDuration(90));
await page.evaluate(() => window.__harness.start({ mode: "vs", difficulty: "easy" }));

// Run through the INTRO (namecalls + intro anims) until the sting arms at the ROUND-1 countdown.
await page.waitForFunction(() => window.__harness.matchEntryTransition().active === true, null, { timeout: 20000, polling: 4 });

// Sample the reveal across its progress. The loop trails real time, so we key off progress buckets.
const wanted = [0.05, 0.18, 0.32, 0.46, 0.60, 0.74, 0.88, 0.99];
let shotIdx = 0;
const seen = new Set();
const t0 = Date.now();
while (shotIdx < wanted.length && Date.now() - t0 < 8000) {
  const st = await page.evaluate(() => window.__harness.matchEntryTransition());
  if (!st.active && st.plays > 0 && st.progress >= 0.99) {
    // sting finished — grab the final "landed on ROUND 1" frame if not yet captured
    if (!seen.has("end")) { seen.add("end"); await page.screenshot({ path: path.join(OUT, `entry_${String(++shotIdx).padStart(2, "0")}_p100.png`) }); }
    break;
  }
  const target = wanted[shotIdx];
  if (st.progress >= target) {
    await page.screenshot({ path: path.join(OUT, `entry_${String(++shotIdx).padStart(2, "0")}_p${Math.round(st.progress * 100)}.png`) });
  }
}

// A settled shot a moment later (ROUND 1 banner, no overlay) for the "after landing" reference.
await page.waitForFunction(() => window.__harness.state().frame > 0, null, { timeout: 3000 }).catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "entry_99_landed_round1.png") });

console.log("Match-entry sting shots written to", OUT, "— captured", shotIdx, "frames");
await browser.close();
server.close();
process.exit(0);
