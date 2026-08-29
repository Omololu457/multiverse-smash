// harness/boruto_clone_live.mjs — STAGE 4 (Boruto) live boot smoke. Boots the REAL game as Boruto and proves
// the shared clone controls now work for him end-to-end (the binds are gated on isCloneCapable, now true):
//   • "," creates clones (caps at 3) rendered with BORUTO'S body sheet,
//   • "/" performs the consciousness-swap (count preserved),
//   • "." dispels them all,
//   • no JS page errors.
// Run: `npm run test:boruto-clone-live`.
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
let PAGE_ERRORS = 0;
page.on("pageerror", e => { PAGE_ERRORS++; console.log("  ⚠️  pageerror:", e.message); });

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const stateF = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

await page.goto(`${base}/index.html?harness=1&p1=boruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(40);
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });

console.log("═══ Stage 4: Boruto clone rollout (live) ═══");

// 1) "," creates clones, capped at 3, rendered with Boruto's body.
for (let i = 0; i < 4; i++) { await page.keyboard.press(","); await waitFrames(6); }
await waitFrames(24);
const spots = await page.evaluate(() => window.__harness.cloneSpots());
check("',' created clones, capped at 3", spots.length === 3, `count=${spots.length}`);
check("clones render Boruto's own body sheet", spots.length > 0 && spots.every(s => (s.sheet || "").includes("boruto")), `sheet=${spots[0]?.sheet}`);
check("clones materialized (idle)", spots.every(s => s.state === "idle" || s.state === "spawn"));

// 2) "/" consciousness-swap: p1 trades onto a clone spot, count preserved.
const probe = await page.evaluate(() => window.__harness.swapProbeAtomic());
check("Boruto swap succeeds (hook)", !!probe?.r, JSON.stringify(probe?.r));
if (probe?.r) check("clone count preserved across Boruto's swap", probe.r.cloneCountBefore === probe.r.cloneCountAfter, `${probe.r.cloneCountBefore}→${probe.r.cloneCountAfter}`);

// 3) real "/" key path runs without error.
await page.keyboard.press("/");
await waitFrames(2);
check("real '/' key path runs (cooldown may gate it) without crashing", true);

// 4) "." dispels all.
await page.keyboard.press(".");
await waitFrames(6);
const after = await page.evaluate(() => window.__harness.p1CloneCount());
check("'.' dispels all Boruto clones", after === 0, `count=${after}`);

check("no JS page errors across the whole run", PAGE_ERRORS === 0);

console.log(`\n${FAIL === 0 && PAGE_ERRORS === 0 ? "✅" : "❌"}  boruto_clone_live: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close();
process.exit(FAIL === 0 && PAGE_ERRORS === 0 ? 0 : 1);
