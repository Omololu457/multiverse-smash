// harness/stage3_finisher_roster.mjs — STAGE 3 LIVE PROOF: the Comeback Finisher is now ROSTER-WIDE.
// Samples eligible characters across HP tiers/universes, drives the REAL game loop (drop P1 < 30% HP,
// park P2 in range, hold BLOCK+GRAB), and confirms EACH deals its computed fixed damage on screen:
//   dmg = round(min(maxHealth*0.32, 360))  — frail chars sub-cap (~307-346), ≥1125 HP capped at 360.
// Also confirms the 3 EXCLUDED chars (toji/maki/gon) CANNOT fire (they keep their bespoke comeback).
// A few representative screenshots → harness/shots/stage3_finisher/. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "stage3_finisher");
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
const finisherProbe = () => page.evaluate(() => window.__harness.finisherProbe("p1"));
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
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); });
}

// eligible sample across HP tiers/universes; excluded trio must NOT fire
const ELIGIBLE = ["shinobu", "nezuko", "flash", "rick", "gojo", "ichigo", "sasuke", "hashirama", "zaraki", "sukuna", "omniman", "vegeta", "batman", "rengoku", "zenitsu"];
const EXCLUDED = ["toji", "maki", "gon"];
const SHOT_KEYS = new Set(["shinobu", "omniman", "toji"]);   // sub-cap frail / capped tank / excluded

async function eligibleCase(charKey) {
  await boot(charKey);
  const me0 = await p1();
  await page.evaluate(hp => window.__harness.setP1Health(hp), Math.round((me0.maxHealth || 1180) * 0.20));   // 20% HP
  await page.evaluate(() => window.__harness.setP2Health(1000));
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + (a.facing >= 0 ? 95 : -95));
  await waitFrames(2);
  const fp0 = await finisherProbe();
  const oppHp0 = (await p2()).health;
  await page.keyboard.down(";"); await page.keyboard.down("o");
  let oppHp1 = oppHp0;
  for (let i = 0; i < 16; i++) { await waitFrames(3); oppHp1 = (await p2()).health; if (oppHp1 < oppHp0) break; }
  if (SHOT_KEYS.has(charKey)) await shot(`${charKey}_finisher.png`);
  await page.keyboard.up(";"); await page.keyboard.up("o");
  const drop = Math.round(oppHp0 - oppHp1);
  check(`${charKey} (HP ${fp0.maxHealth}): READY + dealt ~${fp0.dmg} on screen`, fp0.ready === true && drop >= fp0.dmg - 5 && drop <= fp0.dmg + 5, `hpPct=${fp0.hpPct} dmg=${fp0.dmg} drop=${drop}`);
}

async function excludedCase(charKey) {
  await boot(charKey);
  const me0 = await p1();
  await page.evaluate(hp => window.__harness.setP1Health(hp), Math.round((me0.maxHealth || 1100) * 0.15));   // 15% HP
  await page.evaluate(() => window.__harness.setP2Health(1000));
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + (a.facing >= 0 ? 95 : -95));
  await waitFrames(2);
  const fp0 = await finisherProbe();
  const oppHp0 = (await p2()).health;
  await page.keyboard.down(";"); await page.keyboard.down("o");
  await waitFrames(30);
  if (SHOT_KEYS.has(charKey)) await shot(`${charKey}_excluded_no_finisher.png`);
  await page.keyboard.up(";"); await page.keyboard.up("o");
  const oppHp1 = (await p2()).health;
  const drop = Math.round(oppHp0 - oppHp1);
  // The generic finisher must NOT be eligible; a small normal-grab drop (< 60) is fine, a ~300+ finisher hit is NOT.
  check(`${charKey} (excluded): finisher NOT eligible (no ~${fp0.dmg} finisher hit)`, fp0.ready === false && drop < 100, `ready=${fp0.ready} drop=${drop}`);
}

try {
  console.log("── ELIGIBLE (roster-wide) — finisher fires, real damage on screen ──");
  for (const k of ELIGIBLE) await eligibleCase(k);
  console.log("\n── EXCLUDED (keep bespoke comeback) — finisher must NOT fire ──");
  for (const k of EXCLUDED) await excludedCase(k);
  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 3 roster-wide finisher: ${fails} failed check(s). Shots → harness/shots/stage3_finisher/`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
