// ─────────────────────────────────────────────────────────────────────────────
// Goku Black hit-reaction SOFT-LOCK repro + fix guard.
// Theory (to prove/disprove with evidence): the melee hit path (resolveAttackHit)
// does NOT check defender.invulnTimer — only the projectile loop does — so a
// knockdown-class hit (heavy/special/ultimate) landing WHILE Goku Black is already
// knocked down RE-SETS knockdownTimer to 52. Rapid successive knockdown hits then
// pin him in the down/hit reaction indefinitely (he can't act during knockdownState).
//
// This test drives REAL p2 heavy attacks (p2AttackCat) into GB and records the raw
// timers each frame. It asserts:
//   • a knockdown-class hit during GB's i-frames does NOT reset knockdownTimer (whiffs)
//   • under a rapid heavy barrage GB still RECOVERS (knockdownState clears) in a bounded
//     time — i.e. NO soft-lock
//   • the opponent (p2) can always act
//   • the normal single-hit knockdown→getup chain still works (no regression)
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(REPO, u === "/" ? "/index.html" : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 8, timeout: 20000 }); };
const gb = () => page.evaluate(() => window.__harness.gbHitState());
const p2act = () => page.evaluate(() => window.__harness.p2Actable());
// Reset for a CLEAN single hit: fully heal + clear GB state, realign p2 adjacent.
const resetAdjacent = () => page.evaluate(() => { window.__harness.healP1(); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 60); window.__harness.healP2?.(); });
// Keep p2 in range + GB alive WITHOUT clearing the knockdown/hitstun under test (health-only top-up).
const realignAlive = () => page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 60); window.__harness.topUpP1Health(); });
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

// Land one knockdown-class p2 heavy on GB; return the frame it connected (knockdownState true).
async function landHeavy() {
  await page.evaluate(() => window.__harness.p2AttackCat("heavy"));
  const hit = await page.waitForFunction(() => window.__harness.gbHitState()?.knockdownState === true, null, { timeout: 1500, polling: 8 }).then(() => true).catch(() => false);
  return hit;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  // ── EVIDENCE 1: does a 2nd heavy during i-frames reset the knockdown timer? ──
  section("EVIDENCE — 2nd knockdown-class hit during i-frames");
  await resetAdjacent();
  check("1st heavy knocks GB down", await landHeavy(), "");
  await wf(16);   // wait PAST the hit's hitstop so knockdownTimer has actually counted DOWN from 52
  const before = await gb();
  await realignAlive();   // realign (GB got pushed) + health-only top-up — do NOT clear the knockdown
  await page.evaluate(() => window.__harness.p2AttackCat("heavy"));
  // sample the timer across the 2nd swing's active frames — a jump ABOVE the pre-hit value = re-trigger
  let peak = before.knockdownTimer;
  for (let i = 0; i < 16; i++) { await wf(1); const s = await gb(); if (s.knockdownTimer > peak) peak = s.knockdownTimer; }
  const reset = peak > before.knockdownTimer + 2;
  console.log(`     knockdownTimer before 2nd hit=${before.knockdownTimer} (invuln=${before.invulnTimer}), peak after 2nd hit=${peak}`);
  check("2nd hit during i-frames does NOT reset knockdownTimer (whiffs on invuln)", !reset, reset ? `timer jumped ${before.knockdownTimer}→${peak} = RE-TRIGGER BUG` : `timer stayed ≤${peak}, kept counting down`);

  // ── EVIDENCE 2: rapid heavy barrage → GB must still recover (no soft-lock) ──
  section("SOFT-LOCK — sustained rapid heavy barrage (health-only top-up, knockdown NOT cleared by test)");
  await actionable().catch(() => {});
  await resetAdjacent();
  await landHeavy();
  // Spam heavies as fast as the hook allows for a long window; GB must NOT stay locked.
  let downStreak = 0, maxDownStreak = 0, freeFrames = 0;
  for (let i = 0; i < 220; i++) {
    if (i % 4 === 0) { await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 60); window.__harness.topUpP1Health(); window.__harness.p2AttackCat("heavy"); }); }
    await wf(1);
    const s = await gb();
    if (i % 20 === 0) console.log(`     f${i}: kdState=${s.knockdownState} kdTimer=${s.knockdownTimer} hitstop=${s.hitstop} invuln=${s.invulnTimer} hitstun=${s.hitstun} act=${s.action}`);
    if (s.knockdownState) { downStreak++; maxDownStreak = Math.max(maxDownStreak, downStreak); }
    else { downStreak = 0; freeFrames++; }
  }
  console.log(`     longest continuous knockdown streak under barrage = ${maxDownStreak} frames; free frames = ${freeFrames}/220`);
  // A single knockdown is 52f. If invuln is ignored, every landed heavy RE-ARMS 52 → the streak
  // runs the whole barrage (soft-lock). Bounded streak + real free frames = fixed.
  check("GB is NOT pinned in knockdown for the whole barrage (no soft-lock)", maxDownStreak < 100, `maxStreak=${maxDownStreak} (one knockdown ≈ 52f)`);
  check("GB gets real escape windows even under a max-rate mash", freeFrames > 25, `freeFrames=${freeFrames}/220`);
  const p2 = await p2act();
  check("opponent (p2) can act during the barrage", !!p2, `p2=${JSON.stringify(p2)}`);

  // ── EVIDENCE 3: after the barrage stops, GB fully frees up ──
  section("RECOVERY — GB frees up after the barrage");
  const freed = await page.waitForFunction(() => { const s = window.__harness.gbHitState(); return s && !s.knockdownState && (s.hitstun || 0) <= 0 && (s.hitstop || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  check("GB is fully free (no knockdown/hitstun/hitstop) shortly after hits stop", freed, "");

  // ── OPPONENT can ALWAYS act: after the barrage, p2 returns to actable regardless of GB's state ──
  section("OPPONENT — p2 is never permanently frozen");
  const p2Free = await page.waitForFunction(() => window.__harness.p2Actable()?.canAct === true, null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  check("opponent (p2) returns to a fully actable state", p2Free, "");

  // ── REGRESSION: single-hit knockdown→getup chain still works ──
  section("REGRESSION — single-hit knockdown→getup chain intact");
  await actionable().catch(() => {});
  await resetAdjacent();
  await landHeavy();
  const sawKnockdown = await page.waitForFunction(() => window.__harness.gbHitState()?.action === "knockdown", null, { timeout: 1500, polling: 8 }).then(() => true).catch(() => false);
  const sawGetup = await page.waitForFunction(() => window.__harness.gbHitState()?.action === "getup", null, { timeout: 2500, polling: 8 }).then(() => true).catch(() => false);
  const backToIdle = await page.waitForFunction(() => { const s = window.__harness.gbHitState(); return s && !s.knockdownState && (s.hitstun || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  check("plays the knockdown (FALL) pose", sawKnockdown, "");
  check("chains into the getup (RISE) pose", sawGetup, "");
  check("returns to a free/idle state", backToIdle, "");

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku Black soft-lock: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
