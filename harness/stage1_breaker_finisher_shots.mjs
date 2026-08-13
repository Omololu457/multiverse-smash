// harness/stage1_breaker_finisher_shots.mjs — STAGE 1 LIVE PROOF (screenshots) for the
// COMBO BREAKER hybrid cost + COMEBACK FINISHER pilot. Drives the REAL game loop with REAL keyboard input.
//   A. Breaker interrupts hitstun mid-combo — METER cost (Naruto: energy drops).
//   B. Breaker interrupts hitstun mid-combo — COOLDOWN cost (Zenitsu: comboBreakerCd set).
//   C. Comeback finisher fires < 30% HP, real damage on the opponent (Naruto / Superman / Killua).
// Shots → harness/shots/stage1_cbf/. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "stage1_cbf");
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
const breakerProbe = (who = "p1") => page.evaluate(w => window.__harness.breakerProbe(w), who);
const finisherProbe = (who = "p1") => page.evaluate(w => window.__harness.finisherProbe(w), who);
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}
async function settle() {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
}

// ── BREAKER: HOLD BLOCK(;)+SPECIAL(l) FIRST, then arm a mid-combo hitstun so the game loop's
//    tryComboBreaker fires on the very next frames (avoids a real-time race that ticks hitstun away).
//    Capture the cost the INSTANT the break lands (before the still-held Special can cast a follow-up).
async function breakerCase(charKey, label, expect) {
  console.log(`\n── ${label} (${charKey}) ──`);
  await boot(charKey);
  await settle();
  const before = await breakerProbe("p1");                        // CLEAN baseline: stocks 2, full energy, hitstun 0
  const oppBefore = await p2();
  await page.keyboard.down(";"); await page.keyboard.down("l");   // hold the break combo up-front
  await page.evaluate(() => window.__harness.armBreakerScenario("p1", 55));
  await shot(`${charKey}_breaker_caught.png`);
  let broke = false, after = before, oppAfter = oppBefore;
  for (let i = 0; i < 14; i++) {
    await waitFrames(1);
    const pr = await breakerProbe("p1");
    if ((pr.stocks || 0) < (before.stocks || 0)) {   // the stock spend is the unambiguous "break fired" signal
      broke = true; after = pr; oppAfter = await p2(); break;
    }
    if (i === 13) { after = pr; console.log(`     [debug ${charKey}] last probe:`, JSON.stringify(pr)); }
  }
  await shot(`${charKey}_breaker_fired.png`);
  await page.keyboard.up(";"); await page.keyboard.up("l");
  check(`${charKey}: broke out of hitstun (i-frames granted)`, broke && (after.hitstun || 0) === 0 && (after.invuln || 0) > 0, `hitstun ${before.hitstun}→${after.hitstun}, invuln=${after.invuln}`);
  check(`${charKey}: spent a break stock`, after.stocks === before.stocks - 1, `stocks ${before.stocks}→${after.stocks}`);
  check(`${charKey}: attacker knocked away / interrupted`, Math.abs((oppAfter.vx || 0)) >= 6 || (oppAfter.hitstun || 0) >= 8, `oppVx=${oppAfter.vx}, oppHitstun=${oppAfter.hitstun}`);
  // meter Δ ≥ the 40 break cost (the held Special casts a follow-up Rasengan too → Δ can exceed 40; the
  // EXACT-40 break cost is proven deterministically by test:stage2d-breaker §G).
  if (expect === "meter") check(`${charKey}: METER cost paid (energy dropped ≥ the 40 break cost)`, (before.energy - after.energy) >= 38, `energy ${before.energy}→${after.energy} (Δ${before.energy - after.energy})`);
  if (expect === "cooldown") check(`${charKey}: COOLDOWN cost paid (comboBreakerCd set)`, after.cd > 0, `cd=${after.cd}`);
}

// ── FINISHER: drive P1 below 30% HP, park the opponent in range, hold BLOCK(;)+GRAB(o) ──
async function finisherCase(charKey) {
  console.log(`\n── COMEBACK FINISHER (${charKey}) ──`);
  await boot(charKey);
  await settle();
  const me0 = await p1();
  await page.evaluate(hp => window.__harness.setP1Health(hp), Math.round((me0.maxHealth || 1180) * 0.20));   // 20% HP → below the 30% gate
  await page.evaluate(() => window.__harness.setP2Health(1000));
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + (a.facing >= 0 ? 95 : -95));   // in strike range
  await waitFrames(2);
  const fp0 = await finisherProbe("p1");
  const oppHp0 = (await p2()).health;
  await shot(`${charKey}_finisher_ready.png`);
  check(`${charKey}: finisher READY below 30% HP`, fp0.ready === true && fp0.used === false, `hpPct=${fp0.hpPct}, dmg=${fp0.dmg}`);
  // fire: hold block+grab
  await page.keyboard.down(";"); await page.keyboard.down("o");
  await waitFrames(4);
  await shot(`${charKey}_finisher_cast.png`);
  let oppHp1 = oppHp0;
  for (let i = 0; i < 14; i++) { await waitFrames(3); oppHp1 = (await p2()).health; if (oppHp1 < oppHp0) break; }
  await page.keyboard.up(";"); await page.keyboard.up("o");
  await waitFrames(6);
  await shot(`${charKey}_finisher_hit.png`);
  const fp1 = await finisherProbe("p1");
  const dropped = oppHp0 - oppHp1;
  check(`${charKey}: finisher dealt real damage on screen (~${fp0.dmg})`, dropped >= fp0.dmg - 5 && dropped <= fp0.dmg + 5, `opp HP ${Math.round(oppHp0)}→${Math.round(oppHp1)} (drop ${Math.round(dropped)}, expected ${fp0.dmg})`);
  check(`${charKey}: once-per-match token consumed`, fp1.used === true, `used=${fp1.used}`);
  // second attempt must NOT fire (already used this match)
  const oppHp2a = (await p2()).health;
  await page.keyboard.down(";"); await page.keyboard.down("o"); await waitFrames(10); await page.keyboard.up(";"); await page.keyboard.up("o");
  const oppHp2b = (await p2()).health;
  check(`${charKey}: cannot fire twice per match`, Math.abs(oppHp2b - oppHp2a) < 5, `opp HP ${Math.round(oppHp2a)}→${Math.round(oppHp2b)}`);
}

try {
  await breakerCase("naruto", "A. BREAKER — meter cost", "meter");
  await breakerCase("zenitsu", "B. BREAKER — cooldown cost", "cooldown");
  await finisherCase("naruto");
  await finisherCase("superman");
  await finisherCase("killua");
  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 1 breaker+finisher proof: ${fails} failed check(s). Shots → harness/shots/stage1_cbf/`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
