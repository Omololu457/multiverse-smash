// harness/round4.test.mjs
// ---------------------------------------------------------------------------
// Live verification of round-4 changes:
//   1) Susanoo can't jump (canJump=false)
//   2) Susanoo attacks auto-aim DOWN at the opponent (arrow/grab velocity vector)
//   3) two-strike lightning special via qcf (down,forward)+special; dash-strike unchanged
//   4) Naruto/Kurama ultimate has a premium (2400f/40s = 2× universal) recast cooldown
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

async function waitFrames(n) {
  const s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}
async function tapKey(k, holdFrames = 3) { await page.keyboard.down(k); await waitFrames(holdFrames); await page.keyboard.up(k); await waitFrames(2); }
// Poll (fast) for a projectile by name to appear — robust to brief lifetimes vs fixed waits.
async function sawProjectile(name, timeout = 4000) {
  return page.waitForFunction(n => window.__harness.projectiles().some(p => p.name === n), name, { timeout, polling: 8 }).then(() => true).catch(() => false);
}
async function waitGrounded() {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
}
async function bootAs(p1key) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1key}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
}
async function enterSusanoo() {
  await tapKey("u"); await waitFrames(4);   // Stage 1
}
async function escalateSusanoo() {
  await waitFrames(20); await tapKey("u");                        // triggers the Sharingan cinematic
  // Wait for the cinematic to FULLY end (combat frozen until then; Lv2 + attackCooldown apply at resolve).
  await page.waitForFunction(() => !window.__harness.sasukeCine().active && window.__harness.p1().susanooStage === 2, null, { timeout: 9000, polling: 16 });
  await waitFrames(6);
}
// qcf = down, forward, then special. Movement keys feed directionHistory (recordDirectionInput).
async function qcfSpecial() {
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d");
  await tapKey("l");
}

try {
  // ═══ ITEM 1 — SUSANOO CAN'T JUMP ═══
  await bootAs("sasuke");
  section("ITEM 1 — Susanoo can't jump");
  // baseline: jump WORKS in normal form
  const g0 = await page.evaluate(() => window.__harness.p1());
  await tapKey("w", 2);
  const gj = await page.evaluate(() => window.__harness.p1());
  check("normal Sasuke CAN jump (vy goes negative / leaves ground)", gj.vy < 0 || !gj.grounded, `vy=${gj.vy?.toFixed(1)} grounded=${gj.grounded}`);
  await waitGrounded();  // fully land before continuing

  await enterSusanoo();
  await waitGrounded();  // let the giant settle on the floor before measuring
  const s1 = await page.evaluate(() => window.__harness.p1());
  check("in Susanoo, canJump flag is false", s1.canJump === false, `canJump=${s1.canJump} stage=${s1.susanooStage}`);
  const yBefore = s1.y;
  await tapKey("w", 3);   // try to jump
  await tapKey("w", 3);   // twice
  const s2 = await page.evaluate(() => window.__harness.p1());
  check("jump does NOTHING in Susanoo (stays grounded, vy≥0)", s2.grounded && s2.vy >= 0, `vy=${s2.vy?.toFixed(1)} grounded=${s2.grounded}`);
  check("Susanoo Y unchanged by jump attempts", Math.abs(s2.y - yBefore) < 2, `y ${yBefore.toFixed(0)} → ${s2.y.toFixed(0)}`);

  // ═══ ITEM 2 — ATTACKS AUTO-AIM DOWN AT OPPONENT ═══
  section("ITEM 2 — Susanoo attacks auto-aim down at the opponent");
  const oppRightOfMe = await page.evaluate(() => { const a = window.__harness.p1(), b = window.__harness.p2(); return (b.x > a.x); });
  // Lv1 grab first — its FX should drift down toward the opponent.
  await waitFrames(20);
  await tapKey("l");
  await waitFrames(2);
  const grabProj = (await page.evaluate(() => window.__harness.projectiles())).find(p => p.name === "susanooFx");
  check("Lv1 grab FX aims DOWNWARD (vy>0)", !!grabProj && grabProj.vy > 0, grabProj ? `vy=${grabProj.vy.toFixed(2)} vx=${grabProj.vx.toFixed(2)}` : "no FX");
  check("grab FX aims toward opponent (vx sign matches side)", !!grabProj && (oppRightOfMe ? grabProj.vx > 0 : grabProj.vx < 0), grabProj ? `vx=${grabProj.vx.toFixed(2)} oppRight=${oppRightOfMe}` : "");
  await waitFrames(55);

  // escalate + fire the ARROW (real projectile) at range → should travel diagonally DOWN.
  await escalateSusanoo();
  await waitFrames(28);
  await tapKey("l");
  await waitFrames(2);
  const arrow = (await page.evaluate(() => window.__harness.projectiles())).find(p => p.name === "susanooArrow");
  check("Lv2 arrow travels DOWNWARD (vy>0)", !!arrow && arrow.vy > 0, arrow ? `vy=${arrow.vy.toFixed(2)} vx=${arrow.vx.toFixed(2)}` : "no arrow");
  check("arrow speed preserved (|v|≈15)", !!arrow && Math.abs(Math.hypot(arrow.vx, arrow.vy) - 15) < 1.5, arrow ? `|v|=${Math.hypot(arrow.vx, arrow.vy).toFixed(2)}` : "");
  await page.screenshot({ path: path.join(OUT, "R4_item2_arrow.png") });

  // ═══ ITEM 3 — TWO-STRIKE LIGHTNING (qcf+special) vs DASH-STRIKE (plain special) ═══
  await bootAs("sasuke");   // fresh, stage 0
  section("ITEM 3 — lightning (qcf+special) vs dash-strike (plain special)");
  // plain special → dash-strike, NOT lightning
  await tapKey("l");
  await waitFrames(2);
  const dash = await page.evaluate(() => window.__harness.p1());
  check("plain special → dash-strike (currentMove=dashStrike), no lightning", dash.currentMove === "dashStrike" && !dash.lightningPhase, `move=${dash.currentMove} lp=${dash.lightningPhase}`);
  await waitFrames(40);

  // qcf+special → lightning: handseal → strikes
  const hpBefore = await page.evaluate(() => window.__harness.p2().health);
  await qcfSpecial();
  const lp1 = await page.evaluate(() => window.__harness.p1());
  check("qcf+special → lightning handseal phase", lp1.lightningPhase === "handseal", `lp=${lp1.lightningPhase}`);
  check("rooted during handseals", lp1.rooted === true, `rooted=${lp1.rooted}`);
  // handseal (30f) → strike1 → gap → strike2. The persistent visual bolts (…Fx) show the strike.
  const gotStrike1 = await sawProjectile("sasukeLightning1Fx");
  check("STRIKE 1 pillar-from-above bolt appears", gotStrike1);
  await page.screenshot({ path: path.join(OUT, "R4_item3_strike1.png") });
  const hpMid = await page.evaluate(() => window.__harness.p2().health);
  const gotStrike2 = await sawProjectile("sasukeLightning2Fx");
  check("STRIKE 2 ground-burst bolt appears", gotStrike2);
  if (gotStrike2) await page.screenshot({ path: path.join(OUT, "R4_item3_strike2.png") });
  await waitFrames(30);
  const done = await page.evaluate(() => window.__harness.p1());
  const hpAfter = done.health !== undefined ? await page.evaluate(() => window.__harness.p2().health) : 0;
  check("STRIKE 1 dealt damage (health dropped)", hpMid < hpBefore, `hp ${hpBefore} → ${hpMid}`);
  check("STRIKE 2 dealt a SECOND separate hit (health dropped again)", hpAfter < hpMid, `hp ${hpMid} → ${hpAfter}`);
  check("total lightning damage < a Susanoo attack (≈88 raw before scale)", (hpBefore - hpAfter) < 120, `dealt ${hpBefore - hpAfter}`);
  check("lightning resolves (phase cleared, un-rooted)", !done.lightningPhase && !done.rooted, `lp=${done.lightningPhase} rooted=${done.rooted}`);

  // cancel-on-hit during handseals
  await waitFrames(30);
  await page.evaluate(() => window.__harness.fillEnergy());
  await qcfSpecial();
  const cast = await page.evaluate(() => window.__harness.p1());
  check("lightning re-cast enters handseal", cast.lightningPhase === "handseal", `lp=${cast.lightningPhase}`);
  await page.evaluate(() => window.__harness.hurtP1(20));   // get hit during handseals
  await waitFrames(3);
  const cancelled = await page.evaluate(() => window.__harness.p1());
  const afterHit = await page.evaluate(() => window.__harness.projectiles());
  check("getting hit during handseals CANCELS the cast", !cancelled.lightningPhase && !cancelled.rooted, `lp=${cancelled.lightningPhase} rooted=${cancelled.rooted}`);
  check("cancelled cast spawns NO lightning strikes", !afterHit.some(p => /sasukeLightning/.test(p.name)), `projectiles=${JSON.stringify(afterHit.map(p => p.name))}`);

  // ═══ ITEM 4 — NARUTO/KURAMA ULTIMATE LONG RECAST ═══
  await bootAs("naruto");
  section("ITEM 4 — Naruto Tailed Beast Bomb long recast");
  const n0 = await page.evaluate(() => window.__harness.p1());
  check("Naruto starts with no ultimate cooldown", (n0.ultCooldown || 0) === 0, `cd=${n0.ultCooldown}`);
  await tapKey("u");
  await waitFrames(6);
  const n1 = await page.evaluate(() => window.__harness.p1());
  check("after Tailed Beast Bomb, cooldown ≈ 2400f (40s), NOT 1200", n1.ultCooldown >= 2300 && n1.ultCooldown <= 2400, `cd=${n1.ultCooldown} (universal is 1200)`);
  check("cooldown is a premium 2× the 1200 universal (retuned from 4× — see BALANCE_AUDIT §Naruto-ult-retune)", n1.ultCooldown / 1200 >= 1.8 && n1.ultCooldown / 1200 <= 2.2, `${(n1.ultCooldown / 1200).toFixed(1)}× universal`);

  section("page errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "R4_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
