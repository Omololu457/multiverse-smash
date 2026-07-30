// harness/combo_flow_roster_recent.mjs — RE-VERIFICATION (2026-07-29) that the unified combo-flow
// layer (hit-stop / cancel windows / combo decay / momentum) engages CONSISTENTLY across characters
// BUILT SINCE the layer shipped (2026-07-23, commit 7f11cdf) — not just the 6 it was developed against
// (saiki/sasuke/vegeta/netero/itachi/killua, covered by combo_flow_roster.mjs).
//
// For each character it boots the real game vs a pinned dummy and reads SHARED telemetry:
//   • hit-stop WEIGHT SCALING: peak freeze on a LIGHT connect (~4) < peak on a HEAVY connect (~8)
//   • combo decay: later hits in a light string deal less than the first
//   • cancel window: getCancelWindow() reports the same frame-defined {startup,active,recovery} shape
//   • momentum: forward drift while attacking > idle brake (shared physics gate)
// Kit spread: simple (batman/superman) · transformation (ben10/gon) · giant-form ult (minato) ·
// most-recent (rengoku/hisoka/zenitsu) · flight-toggle (omniman).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const frame = async () => (await page.evaluate(() => window.__harness.state().frame));
async function waitFrames(n) { const s = await frame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cw = () => page.evaluate(() => window.__harness.cancelWindow("p1"));

let PASS = 0, FAIL = 0;
const results = [];
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); return c; };

// pin the dummy directly in front, kill its knockback drift + invuln, so a mashed string reliably lands
const pin = () => page.evaluate(() => { const p = window.__harness.p1(); if (window.__harness.setP2X) window.__harness.setP2X(p.x + (p.facing === 1 ? 46 : -46)); const q = window.__harness.p2(); if (q) q.vx = 0; if (window.__harness.setP2Invuln) window.__harness.setP2Invuln(0); });
const canAct = () => page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0 && (p.hitstop || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});

// press one attack button, let it reach active + connect, return the PEAK hitstop seen on p1 + dmg dealt.
// sampleFrames must exceed the move's (startup+active); heavies can have startup ~13 (Omni-Man), so
// sample generously — under-sampling a slow heavy reads 0 hit-stop before it ever connects.
async function oneHit(key, sampleFrames = 26) {
  await pin(); await canAct(); await pin();
  const before = (await p2()).health;
  await page.keyboard.down(key); await waitFrames(1); await page.keyboard.up(key);
  let peak = 0, sawCancelShape = false;
  for (let k = 0; k < sampleFrames; k++) {
    await pin();
    const s = await p1(); const w = await cw();
    if ((s.hitstop || 0) > peak) peak = s.hitstop || 0;
    if (w && typeof w.startup === "number" && typeof w.recovery === "number") sawCancelShape = true;
    await waitFrames(1);
  }
  const dealt = before - (await p2()).health;
  return { peak, dealt, sawCancelShape };
}

async function verify(char, kit) {
  console.log(`\n──────── ${char.toUpperCase()}  (${kit}) ────────`);
  await page.goto(`${base}/index.html?harness=1&p1=${char}&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 56); });
  await page.evaluate(() => window.__harness.healP2());

  // ── light string: decay + light hit-stop peak + cancel-window shape ──
  const dmgs = []; let lightPeak = 0, sawCancelShape = false;
  for (let i = 0; i < 6; i++) {
    const r = await oneHit("j");
    if (r.peak > lightPeak) lightPeak = r.peak;
    if (r.sawCancelShape) sawCancelShape = true;
    if (r.dealt > 0) dmgs.push(Math.round(r.dealt * 10) / 10);
  }
  // ── heavy hit: weight-scaled hit-stop peak (wide sample window for slow-startup heavies) ──
  await page.evaluate(() => window.__harness.healP2());
  let heavyPeak = 0, heavyDealt = 0;
  for (let i = 0; i < 3; i++) { const r = await oneHit("k"); if (r.peak > heavyPeak) heavyPeak = r.peak; if (r.dealt > heavyDealt) heavyDealt = r.dealt; }

  // NOTE: momentum preservation is shared physics (physics.attackMomentumFriction, gated
  // attacking && vx*facing>0 — no per-character code, only Sasuke's handseal special sets _rooted),
  // so it is universal by construction and asserted separately via `npm run test:momentum`.
  console.log(`  light string dmg: ${dmgs.join(" → ") || "(none landed)"}`);
  console.log(`  hit-stop peaks: light=${lightPeak}  heavy=${heavyPeak} (heavy dealt=${Math.round(heavyDealt)})`);
  const decayed = dmgs.length >= 3 && dmgs[dmgs.length - 1] < dmgs[0];
  const c1 = check(`${char}: light hit-stop engages (peak ${lightPeak})`, lightPeak > 0);
  const c2 = check(`${char}: hit-stop scales by weight (heavy ${heavyPeak} > light ${lightPeak})`, heavyPeak > lightPeak, `L${lightPeak}/H${heavyPeak}`);
  const c3 = check(`${char}: combo damage decays across string`, decayed, dmgs.join(">"));
  const c4 = check(`${char}: cancel window reports shared frame-defined shape`, sawCancelShape);
  results.push({ char, kit, lightPeak, heavyPeak, dmgs, decayed, ok: c1 && c2 && c3 && c4 });
}

await verify("batman",  "simple DC kit");
await verify("superman", "simple DC / flight");
await verify("ben10",   "transformation (Omnitrix)");
await verify("gon",     "transformation ultimate");
await verify("minato",  "giant-form Kurama ultimate");
await verify("rengoku", "most-recent (Demon Slayer)");
await verify("hisoka",  "recent (HxH card zoner)");
await verify("zenitsu", "recent (Demon Slayer)");
await verify("omniman", "flight-toggle (Invincible)");

console.log(`\n════════════════════════════════════════════`);
console.log(`  RECENT-ROSTER COMBO-FLOW RE-VERIFICATION: ${PASS} passed, ${FAIL} failed`);
for (const r of results) console.log(`   ${r.ok ? "✅" : "⚠ "} ${r.char.padEnd(9)} L${r.lightPeak}/H${r.heavyPeak} decay=${r.decayed ? "Y" : "n"} dmg[${r.dmgs.join(">")}]`);
console.log(`════════════════════════════════════════════`);
await browser.close();
server.close();
process.exit(FAIL ? 1 : 0);
