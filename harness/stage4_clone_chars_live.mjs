// harness/stage4_clone_chars_live.mjs — STAGE 4 live boot smoke for Kakashi, Itachi, Hiruzen. Boots each in
// the REAL game and confirms the shared clone controls work end-to-end (binds gated on isCloneCapable, now
// true): "," creates clones (capped) rendered with THAT char's own body sheet, "/" swaps (count preserved),
// "." dispels — with no JS page errors. Run: `npm run test:stage4-clone-live`.
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

let PASS = 0, FAIL = 0, PAGE_ERRORS = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };

const CHARS = [
  { key: "kakashi", cap: 2, hint: "kakashi" },
  { key: "itachi",  cap: 3, hint: "itachi" },
  { key: "hiruzen", cap: 3, hint: "hiruzen" },
  { key: "madara",  cap: 3, hint: "madara" },
];

for (const { key, cap, hint } of CHARS) {
  console.log(`\n═══ ${key} clone rollout (live) ═══`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", e => { PAGE_ERRORS++; console.log("  ⚠️  pageerror:", e.message); });
  const stateF = () => page.evaluate(() => window.__harness.state());
  const waitFrames = async n => { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); };

  await page.goto(`${base}/index.html?harness=1&p1=${key}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(40);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });

  // "," create — capped, own body sheet
  for (let i = 0; i < cap + 1; i++) { await page.keyboard.press(","); await waitFrames(6); }
  await waitFrames(24);
  const spots = await page.evaluate(() => window.__harness.cloneSpots());
  check(`${key}: ',' created clones, capped at ${cap}`, spots.length === cap, `count=${spots.length}`);
  check(`${key}: clones render ${key}'s own body sheet`, spots.length > 0 && spots.every(s => (s.sheet || "").includes(hint)), `sheet=${spots[0]?.sheet}`);

  // "/" swap — count preserved
  const probe = await page.evaluate(() => window.__harness.swapProbeAtomic());
  check(`${key}: consciousness-swap succeeds (count preserved)`, !!probe?.r && probe.r.cloneCountBefore === probe.r.cloneCountAfter, JSON.stringify(probe?.r));

  // "." dispel
  await page.keyboard.press(".");
  await waitFrames(6);
  const after = await page.evaluate(() => window.__harness.p1CloneCount());
  check(`${key}: '.' dispels all clones`, after === 0, `count=${after}`);

  await page.close();
}

check("no JS page errors across all three boots", PAGE_ERRORS === 0);
console.log(`\n${FAIL === 0 && PAGE_ERRORS === 0 ? "✅" : "❌"}  stage4_clone_chars_live: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close();
process.exit(FAIL === 0 && PAGE_ERRORS === 0 ? 0 : 1);
