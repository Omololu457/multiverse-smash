// harness/stage2_breaker_roster.mjs — STAGE 2 LIVE PROOF: the hybrid combo-breaker cost is now
// ROSTER-WIDE. Samples characters across the energy spectrum + every meterless char, drives the REAL
// game loop (block+special during a mid-combo hitstun), and confirms EACH pays the right currency:
//   • energy chars → METER drops by COMBO_BREAKER.energyCost (40)
//   • meterless chars (traits.hasEnergy false) → comboBreakerCd is set (cooldown)
// A few representative screenshots → harness/shots/stage2_breaker/. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "stage2_breaker");
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
const breakerProbe = () => page.evaluate(() => window.__harness.breakerProbe("p1"));
const p2 = () => page.evaluate(() => window.__harness.p2());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) });
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
}

// energy chars (meter) across the range, + every meterless char (cooldown)
const METER = ["flash", "batman", "ghostface", "zaraki", "chrollo", "yuji", "naruto", "gojo", "superman"];
const COOLDOWN = ["zenitsu", "rengoku", "shinobu", "inosuke", "nezuko", "maki", "toji"];
const SHOT_KEYS = new Set(["flash", "gojo", "toji"]);   // low-energy meter, high-energy meter, meterless

async function sweep(charKey, kind) {
  await boot(charKey);
  const before = await breakerProbe();
  await page.keyboard.down(";"); await page.keyboard.down("l");
  await page.evaluate(() => window.__harness.armBreakerScenario("p1", 55));
  let broke = false, after = before;
  for (let i = 0; i < 16; i++) { await waitFrames(1); const pr = await breakerProbe(); if ((pr.stocks || 0) < (before.stocks || 0)) { broke = true; after = pr; break; } }
  if (SHOT_KEYS.has(charKey)) await shot(`${charKey}_breaker.png`);
  await page.keyboard.up(";"); await page.keyboard.up("l");
  const okBreak = broke && (after.hitstun || 0) === 0 && (after.invuln || 0) > 0 && after.stocks === before.stocks - 1;
  if (kind === "meter") {
    const drop = before.energy - after.energy;
    check(`${charKey} (energy ${before.maxEnergy}): breaks + pays METER (Δ≥40)`, okBreak && drop >= 38, `broke=${broke} energyΔ=${drop} stocks ${before.stocks}→${after.stocks}`);
  } else {
    check(`${charKey} (meterless): breaks + pays COOLDOWN`, okBreak && (after.cd || 0) > 0, `broke=${broke} cd=${after.cd} stocks ${before.stocks}→${after.stocks}`);
  }
}

try {
  console.log("── ENERGY chars → METER cost (across the 100–220 energy range) ──");
  for (const k of METER) await sweep(k, "meter");
  console.log("\n── METERLESS chars → COOLDOWN cost (all 7) ──");
  for (const k of COOLDOWN) await sweep(k, "cooldown");
  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 2 roster-wide breaker: ${fails} failed check(s). Shots → harness/shots/stage2_breaker/`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
