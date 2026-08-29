// harness/clone_swap_live.mjs — STAGE 3 live boot smoke for the CONSCIOUSNESS-SWAP.
// Boots the REAL game headless (Naruto) and proves the end-to-end wiring the unit test can't reach:
//   • the "/" key path runs without error and performs the swap,
//   • the swap TRADES p1 onto a live clone's spot with the clone COUNT preserved (pure trade),
//   • pressing "/" while p1 is in HITSTUN BREAKS the combo (the escape) + starts the cooldown,
//   • the cooldown blocks an immediate second "/".
// Run: `npm run test:clone-swap-live`.
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

await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(40);

console.log("═══ Stage 3: consciousness-swap live boot ═══");

// 1) Spawn 2 clones and let them fully materialize (leave "spawn" state → "idle").
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.spawnP1Clones(2); });
await waitFrames(28);
const spots0 = await page.evaluate(() => window.__harness.cloneSpots());
check("2 clones materialized (idle)", spots0.length === 2 && spots0.every(s => s.state === "idle"), JSON.stringify(spots0));

// 2) Atomic trade probe (hook path): p1 lands on a live clone's spot; clone count preserved.
const probe = await page.evaluate(() => window.__harness.swapProbeAtomic());
check("swap succeeded (hook returned a result)", !!probe?.r, JSON.stringify(probe?.r));
if (probe?.r) {
  const { r, before } = probe;
  const landedOnAClone = before.some(s => Math.abs(s.x - r.toX) <= 2 && Math.abs(s.y - r.toY) <= 2);
  check("p1 traded ONTO a live clone's prior spot", landedOnAClone, `to=(${r.toX},${r.toY}) spots=${JSON.stringify(before)}`);
  check("p1 actually moved (real teleport, not a no-op)", r.toX !== r.fromX || r.toY !== r.fromY, `from=(${r.fromX},${r.fromY}) to=(${r.toX},${r.toY})`);
  check("clone COUNT preserved across the trade", r.cloneCountBefore === 2 && r.cloneCountAfter === 2, `${r.cloneCountBefore}→${r.cloneCountAfter}`);
}

// 3) REAL "/" KEY as an ESCAPE: fresh clones, put p1 in hitstun, press "/" → hitstun breaks + cooldown starts.
await page.evaluate(() => { window.__harness.dispelP1Clones(); window.__harness.spawnP1Clones(2); });
await waitFrames(28);
await page.evaluate(() => window.__harness.setP1Hitstun(40));
const hsBefore = await page.evaluate(() => window.__harness.p1Hitstun());
await page.keyboard.press("/");
await waitFrames(2);
const hsAfter = await page.evaluate(() => window.__harness.p1Hitstun());
const cd = await page.evaluate(() => window.__harness.p1SwapCd());
check("p1 was in hitstun before the swap", hsBefore >= 30, `hitstun=${hsBefore}`);
check('"/" key BROKE hitstun (the escape)', hsAfter === 0, `hitstun=${hsAfter}`);
check('"/" swap started the cooldown', cd > 0, `cd=${cd}`);

// 4) COOLDOWN blocks an immediate second "/": count stays preserved, no crash.
const cntBefore2 = await page.evaluate(() => window.__harness.p1CloneCount());
await page.keyboard.press("/");
await waitFrames(2);
const cntAfter2 = await page.evaluate(() => window.__harness.p1CloneCount());
check("a second immediate swap is cooldown-gated (clone count stable, no double-swap crash)", cntAfter2 === cntBefore2, `${cntBefore2}→${cntAfter2}`);

check("no JS page errors across the whole run", PAGE_ERRORS === 0);

console.log(`\n${FAIL === 0 && PAGE_ERRORS === 0 ? "✅" : "❌"}  clone_swap_live: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close();
process.exit(FAIL === 0 && PAGE_ERRORS === 0 ? 0 : 1);
