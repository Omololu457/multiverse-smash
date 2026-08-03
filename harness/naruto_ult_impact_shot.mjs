// harness/naruto_ult_impact_shot.mjs — VISUAL + numeric evidence for the Kurama Avatar
// (Tailed Beast Bomb) ULTIMATE at its CURRENT live tuning: 600 guaranteed damage, 40s
// (2400f) Naruto-only recast lockout. Boots the REAL game headless (?harness=1&p1=naruto),
// fires the ult, screenshots the impact beat, and asserts the on-cast numbers match
// abilities.js/kurama.js. Backs BALANCE_AUDIT.md §Naruto-ult-retune re-verification (2026-08-02).
// Outputs harness/shots/naruto_ult_impact.png. Run ALONE (concurrent Playwright inflates flakiness).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);

  // Clean slate: full meter, opponent at full HP, in range, no lingering input.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
  const a0 = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a0.x + 120);
  await waitFrames(2);

  const hpBefore = (await p2()).health;
  const energyBefore = (await p1()).energy;
  console.log(`\n  Pre-cast: opponent HP=${hpBefore}, Naruto energy=${energyBefore}`);

  // FIRE the ultimate (Kurama Avatar / TBB) — "u" is the ultimate button.
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await waitFrames(2);

  // On-cast numbers are set immediately in executeNarutoUltimate.
  const casterAfterCast = await p1();
  const cd = casterAfterCast.ultCooldown;   // snapshot exposes ultimateCooldown as ultCooldown (game.js:7413)
  const energyAfter = casterAfterCast.energy;
  console.log(`  On cast: ultimateCooldown=${cd}f (${(cd / 60).toFixed(0)}s), energy ${energyBefore}→${energyAfter} (spent ${energyBefore - energyAfter})`);

  // Screenshot mid-cinematic (the giant Kurama + bomb are on screen through the FIRE beat).
  await waitFrames(30);
  await shot("naruto_ult_charge.png");

  // Let the bomb reach impact (T_IMPACT = 164f into the 220f cinematic) and settle, then read HP.
  await waitFrames(150);
  await shot("naruto_ult_impact.png");
  await page.waitForFunction((hp) => window.__harness.p2().health < hp, hpBefore, { timeout: 8000, polling: 16 }).catch(() => {});
  const hpAfter = (await p2()).health;
  const dealt = hpBefore - hpAfter;
  console.log(`  Impact: opponent HP ${hpBefore}→${hpAfter} (dealt ${dealt})\n`);

  // ── Assertions against the live tuning ──────────────────────────────────
  check("Recast lockout = 2400f / 40s (NARUTO_KURAMA_RECAST_FRAMES)", cd === 2400, `${cd}f`);
  check("Meter cost = 95 (50% of 190 maxEnergy)", (energyBefore - energyAfter) === 95, `spent ${energyBefore - energyAfter}`);
  check("TBB connects for 600 guaranteed damage (unblocked, clean hit)", dealt === 600, `dealt ${dealt}`);
  check("Impact screenshot captured", fs.existsSync(path.join(OUT, "naruto_ult_impact.png")), "naruto_ult_impact.png");
} catch (e) {
  console.error("  ❌ harness error:", e.message);
  fails++;
} finally {
  await browser.close();
  server.close();
}

console.log(fails === 0 ? "\n✅ naruto-ult-impact PASS — live tuning verified (40s / 600 / 95)\n" : `\n❌ naruto-ult-impact ${fails} FAIL\n`);
process.exit(fails === 0 ? 0 : 1);
