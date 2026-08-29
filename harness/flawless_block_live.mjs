// harness/flawless_block_live.mjs — LIVE before/after for FLAWLESS BLOCK on the sample cast
// (bardock/gohan/ippo/madara). For each char, P1 lands a normal on a guarding dummy two ways:
//   • HELD guard (force-guard on early)  → NORMAL block: chip > 0, blockstun ~10
//   • FRESH guard (force-guard on as the swing arrives) → FLAWLESS: chip 0, blockstun 2, lastFlawless
// Before/after: `git stash push combat.js game.js` → the FRESH-guard case behaves like a normal block
// (flawless didn't exist), proving the mechanic is what's new.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = process.env.BUF_TAG || "after";
const OUT = path.join(ROOT, "harness", "shots", "flawless_block", TAG);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const Fr = async () => page.evaluate(() => window.__harness.state().frame);
const wf = async n => { const s = await Fr(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 9000, polling: 4 }).catch(() => {}); };
const place = () => page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + (p.facing === 1 ? 40 : -40)); });
const probe = () => page.evaluate(() => window.__harness.blockProbe("p2"));
const phase = () => page.evaluate(() => window.__harness.attackPhase("p1"));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const SAMPLE = ["bardock", "gohan", "ippo", "madara"];

async function reset() {
  // Re-anchor P1 to a fixed x each attempt — a lunging light marches P1 across the stage over the sweep,
  // so without this later attempts whiff.
  await page.evaluate(() => { window.__harness.setForceGuard(false, "p2"); window.__harness.healP2(); window.__harness.setP1X(1200); const p = window.__harness.p1(); p.attacking = false; p.currentAttack = null; p.attackCooldown = 0; p.vx = 0; });
  await place(); await wf(3); await place();
}
// Poll for a block to register (blockstun set THIS frame); capture chip via a P2 health delta.
async function awaitBlock(hp0) {
  for (let i = 0; i < 24; i++) {
    await place();
    const b = await probe();
    if (b.blockstun > 0 || b.lastFlawless) { b.chip = hp0 - b.health; return b; }
    await wf(1);
  }
  const b = await probe(); b.chip = hp0 - b.health; return b;
}
async function heldGuardHit() {              // NORMAL block: guard held long before the hit
  await reset();
  await page.evaluate(() => window.__harness.setForceGuard(true, "p2"));
  await wf(14);                              // hold the guard for a while → large _blockHeldFrames
  const hp0 = (await probe()).health;
  await place();
  await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
  const r = await awaitBlock(hp0);
  await page.evaluate(() => window.__harness.setForceGuard(false, "p2"));
  return r;
}
// One fresh-guard attempt: arm the guard `delay` frames after the swing first enters STARTUP, so the guard
// is only a few frames old at connect. Different chars have different startup lengths → we sweep `delay`.
async function freshGuardAttempt(delay, shot) {
  await reset();
  const hp0 = (await probe()).health;
  await place();
  await page.keyboard.down("j");             // start the swing with the dummy NOT guarding
  for (let i = 0; i < 24; i++) {
    await place();                           // keep the dummy pinned as a lunging swing develops (don't whiff)
    const ph = await phase();
    if (ph === "startup" || ph === "active") break;
    await wf(1);
  }
  for (let d = 0; d < delay; d++) { await place(); await wf(1); }   // arm progressively later in startup
  await page.evaluate(() => window.__harness.setForceGuard(true, "p2"));
  await page.keyboard.up("j");
  const r = await awaitBlock(hp0);
  if (shot) await page.screenshot({ path: shot });
  await page.evaluate(() => window.__harness.setForceGuard(false, "p2"));
  return r;
}
async function freshGuardHit(shot) {          // sweep the arm-delay until the fresh guard actually CONNECTS
  let best = null;
  for (let delay = 0; delay <= 9; delay++) {
    const r = await freshGuardAttempt(delay, null); r.delay = delay;
    if (!best) best = r;
    // first delay where the fresh guard is up at connect (a real guarded hit registered). AFTER the fix
    // this is flawless; BEFORE (no flawless) the SAME timing is a normal block — a clean A/B.
    if (r.blockstun > 0) { if (shot) await freshGuardAttempt(delay, shot); return r; }
  }
  return best;
}

async function verify(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.blockProbe), null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(8);
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 40); });

  const held = await heldGuardHit();
  const fresh = await freshGuardHit(path.join(OUT, `${charKey}_flawless.png`));
  console.log(`  ${charKey.padEnd(9)} HELD: chip=${held.chip ?? "?"} blockstun=${held.blockstun} flawless=${held.lastFlawless} (held=${held.blockHeld})   FRESH: chip=${fresh.chip ?? "?"} blockstun=${fresh.blockstun} flawless=${fresh.lastFlawless} (held=${fresh.blockHeld})`);
  return { key: charKey, held, fresh };
}

console.log(`\n══ FLAWLESS BLOCK — LIVE (TAG=${TAG}) ══`);
const results = [];
for (const c of SAMPLE) { try { results.push(await verify(c)); } catch (e) { console.log(`  ${c} ERROR ${e.message}`); results.push({ key: c, error: String(e.message) }); } }
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n  results.json + shots → harness/shots/flawless_block/${TAG}/`);
await browser.close(); server.close();
process.exit(0);
