// harness/susanoo.test.mjs
// ---------------------------------------------------------------------------
// Live in-game verification of Sasuke's Susanoo using a REAL Chromium instance
// driven by Playwright. Closes the two gaps from the last round:
//   (1) synthetic keypress delivery — we use page.keyboard.* (real events to the
//       focused document, which is where input.js listens) and PROVE delivery by
//       reading input.js's `keys` state back out before trusting anything.
//   (2) temporal smoothness — we sample the giant's drawn Y / bob offset / frame
//       index across ~150 animation frames and assert the motion is continuous.
//
// The game is served over HTTP (ES-module imports are unreliable over file://)
// and driven via the ?harness=1 hook added to game.js (inert without the param).
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

// ── tiny static file server ────────────────────────────────────────────────
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg",
  ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4",
  ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv"
};
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found: " + urlPath); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ── assertions ──────────────────────────────────────────────────────────────
let PASS = 0, FAIL = 0;
const results = [];
function check(name, cond, detail = "") {
  (cond ? PASS++ : FAIL++);
  results.push({ name, ok: !!cond, detail });
  console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

// ── main ─────────────────────────────────────────────────────────────────────
const server = await startServer();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({
  headless: !HEADED,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--autoplay-policy=no-user-gesture-required"
  ]
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];      // uncaught JS exceptions — real failures
const missing = [];       // 404 asset loads — logged, not fatal
page.on("pageerror", e => jsErrors.push(String(e)));
page.on("response", r => { if (r.status() === 404) missing.push(r.url().replace(base, "")); });

// helper: wait until globalFrameCount advances by n (fps-throttle-proof)
async function waitFrames(n) {
  const start = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(
    ([s, need]) => window.__harness.state().frame >= s + need,
    [start, n], { timeout: 15000, polling: 16 }
  );
}

// Press the ultimate the way a player does: the input buffer is POLLED from
// keys[ctrl.ultimate] once per frame (input.js getFighterInput), so the key must
// stay DOWN across at least one poll — a fast press() would be missed. The keyup
// also flips _ultReleasedSinceStage1 (game.js), satisfying the Stage-2 gate.
async function tapUltimate() {
  await page.keyboard.down("u");
  await waitFrames(3);
  await page.keyboard.up("u");
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);   // focus canvas + satisfy any audio gesture gate
  console.log("harness ready:", await page.evaluate(() => window.__harness.state()));

  // ── TEST 0 — KEY DELIVERY (the thing that broke last time) ────────────────
  section("TEST 0 — key delivery to input.js `keys`");
  await page.keyboard.down("u");
  const uDown = await page.evaluate(() => window.__harness.keys()["u"] === true);
  check("keydown 'u' reaches input.js keys['u']===true", uDown);
  await page.keyboard.up("u");
  const uUp = await page.evaluate(() => window.__harness.keys()["u"] === false);
  check("keyup 'u' clears keys['u']===false", uUp);
  await page.keyboard.down("d");
  const dDown = await page.evaluate(() => window.__harness.keys()["d"] === true);
  check("keydown 'd' (move-right) reaches keys['d']===true", dDown);
  await page.keyboard.up("d");

  // ── boot into a live battle with full energy ──────────────────────────────
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  const st = await page.evaluate(() => window.__harness.state());
  const p1_0 = await page.evaluate(() => window.__harness.p1());
  check("in BATTLE state after boot", st.gameState === "battle", `gameState=${st.gameState} countdown=${st.countdown}`);
  check("P1 is Sasuke, not yet in Susanoo", p1_0.key === "sasuke" && p1_0.susanooStage === 0, `key=${p1_0.key} stage=${p1_0.susanooStage} energy=${p1_0.energy}/${p1_0.maxEnergy}`);
  await page.screenshot({ path: path.join(OUT, "00_battle_start.png") });

  // ── TEST 1 — SUSANOO DOUBLE-PRESS (Lv1 → escalate → Lv2) ──────────────────
  section("TEST 1 — Susanoo double-press escalation");

  // Press 1: enter Stage 1 (Susanoo Lv1)
  await tapUltimate();
  await waitFrames(4);
  const s1 = await page.evaluate(() => window.__harness.p1());
  check("press #1 → Susanoo Stage 1", s1.susanooStage === 1, `stage=${s1.susanooStage}`);
  check("Stage 1 attaches giant _skinAnim body-swap", s1.hasSkinAnim === true);
  check("Stage 1 canvas-relative giant sizing = 0.95", s1.canvasHeightFrac === 0.95, `frac=${s1.canvasHeightFrac}`);
  check("Stage 1 spent ~50% energy (95 of 190)", s1.energy <= s1.maxEnergy * 0.5 + 1 && s1.energy > 0, `energy=${s1.energy}`);
  check("Stage 1 latched a half-arena lock", s1.arenaHalfLock === "left" || s1.arenaHalfLock === "right", `lock=${s1.arenaHalfLock}`);
  await page.screenshot({ path: path.join(OUT, "01_susanoo_lv1.png") });

  // wait out the 15f Stage-1 recovery so triggerUltimate's atkCd gate won't swallow press #2
  await waitFrames(20);

  // ── TEST 1b — TIER-1 COMMAND-GRAB (Lv1 special = the ribcage arm as a REAL resolveGrab) ──
  // At Stage 1 the special button offers ONLY the grab, and it must be a genuine command-grab
  // (isGrabbed state → pop-up-and-drop throw), NOT a strike hitbox. Unified with Madara's Tier-1
  // grab through the shared combat.resolveGrab pipeline (see UCHIHA_SUSANOO_TIER_MODEL.md).
  section("TEST 1b — Tier-1 Susanoo command-grab (Lv1 special)");
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 120); window.__harness.healP2(); });
  await waitFrames(2);
  const grabHp0 = (await page.evaluate(() => window.__harness.p2())).health;
  let sasukeGrabbed = false;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  for (let i = 0; i < 20; i++) { if ((await page.evaluate(() => window.__harness.p2())).isGrabbed) { sasukeGrabbed = true; break; } await waitFrames(1); }
  check("Lv1 special enters real grab state (isGrabbed, not a strike hitbox)", sasukeGrabbed);
  await page.screenshot({ path: path.join(OUT, "01b_susanoo_lv1_grab.png") });
  await waitFrames(30);   // let the throw resolve + clear grab recovery
  const grabHp1 = (await page.evaluate(() => window.__harness.p2())).health;
  check("Lv1 grab throw deals its tuned damage (120)", grabHp1 < grabHp0, `${grabHp0}→${grabHp1}`);
  await page.evaluate(() => window.__harness.healP2());
  await waitFrames(30);   // clear P1 grab recovery so the Stage-2 press isn't swallowed

  // Press 2: escalate to Stage 2 (Susanoo Lv2) — requires release since Stage 1 (satisfied by tapUltimate's up).
  // The escalation now plays a Sharingan cinematic first (~134f); Lv2 lands when it resolves.
  await tapUltimate();
  await page.waitForFunction(() => !window.__harness.sasukeCine().active && window.__harness.p1().susanooStage === 2, null, { timeout: 9000, polling: 16 });
  await waitFrames(4);
  const s2 = await page.evaluate(() => window.__harness.p1());
  check("press #2 → Susanoo Stage 2 (escalation, after cinematic)", s2.susanooStage === 2, `stage=${s2.susanooStage}`);
  // energy is set to 0 on escalation; passive regen (~0.06/frame) ticks it up a hair before we read.
  check("Stage 2 drains energy to ~0 (drain-to-zero risk/reward)", s2.energy < 2, `energy=${s2.energy.toFixed(2)}`);
  // Lv2 must loom LARGER than Lv1, but both stay fully framed on-screen (the camera's giant
  // zoom-to-fit + snap frame the whole figure — see camera.js). Lowered from 1.20 (which ran the
  // head off the top of the screen) to 1.08-ish; assert the ordering, not a magic number.
  check("Stage 2 is BIGGER than Stage 1 (frac > 0.95)", s2.canvasHeightFrac > s1.canvasHeightFrac, `frac=${s2.canvasHeightFrac} vs ${s1.canvasHeightFrac}`);
  check("Stage 2 keeps the SAME half-arena lock", s2.arenaHalfLock === s1.arenaHalfLock, `${s2.arenaHalfLock} vs ${s1.arenaHalfLock}`);
  await page.screenshot({ path: path.join(OUT, "02_susanoo_lv2.png") });

  // ── TEST 2 — TEMPORAL SMOOTHNESS (idle bob + slow frame cadence) ──────────
  section("TEST 2 — temporal smoothness of the idle (bob + cadence)");
  // Sample per animation frame for ~150 rAF ticks while the giant idles.
  const samples = await page.evaluate(() => new Promise(resolve => {
    const out = [];
    let n = 0;
    function tick() {
      const p = window.__harness.p1();
      out.push({ frame: window.__harness.state().frame, y: p.lastDrawY, bob: p.lastBobUp, fi: p.frameIndex, clock: p.bobClock });
      if (++n >= 150) return resolve(out);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));

  const bobs = samples.map(s => s.bob).filter(v => typeof v === "number");
  const ys = samples.map(s => s.y).filter(v => typeof v === "number");
  const fis = samples.map(s => s.fi);
  const distinctBob = new Set(bobs.map(v => v.toFixed(3))).size;
  const bobMin = Math.min(...bobs), bobMax = Math.max(...bobs);
  const maxBobStep = Math.max(...bobs.slice(1).map((v, i) => Math.abs(v - bobs[i])));
  const maxYStep = Math.max(...ys.slice(1).map((v, i) => Math.abs(v - ys[i])));
  // frame-index transitions: how many times fi changed, and the distinct fi values
  const fiChanges = fis.slice(1).filter((v, i) => v !== fis[i]).length;
  const distinctFi = [...new Set(fis)].sort((a, b) => a - b);
  // spacing between fi changes (should be the slow ~40-frame hold, not fast snapping)
  const changeFrames = [];
  for (let i = 1; i < samples.length; i++) if (samples[i].fi !== samples[i - 1].fi) changeFrames.push(samples[i].frame);
  const holdGaps = changeFrames.slice(1).map((f, i) => f - changeFrames[i]);
  const avgHold = holdGaps.length ? (holdGaps.reduce((a, b) => a + b, 0) / holdGaps.length) : Infinity;

  console.log(`  bob: ${bobs.length} samples, ${distinctBob} distinct, range [${bobMin.toFixed(2)}, ${bobMax.toFixed(2)}], maxStep ${maxBobStep.toFixed(3)}`);
  console.log(`  drawY maxStep between frames: ${maxYStep.toFixed(3)}`);
  console.log(`  frameIndex: distinct=${JSON.stringify(distinctFi)}, changes=${fiChanges}, avgHoldFrames≈${avgHold.toFixed(1)}`);

  check("bob is continuous (many distinct values, not a step)", distinctBob >= 20, `${distinctBob} distinct`);
  check("bob stays within the rise-only band [0, ~+18px]", bobMin >= -0.01 && bobMax <= 24, `[${bobMin.toFixed(2)}, ${bobMax.toFixed(2)}]`);
  check("bob moves smoothly (per-frame step small, no jump)", maxBobStep < 3.0, `maxStep=${maxBobStep.toFixed(3)}`);
  check("drawY has no large discontinuity (feet don't teleport)", maxYStep < 8, `maxYStep=${maxYStep.toFixed(3)}`);
  check("idle uses exactly the 2-pose calm window", distinctFi.length <= 2 && Math.max(...distinctFi) <= 1, `frames=${JSON.stringify(distinctFi)}`);
  check("cadence is SLOW (holds ≳ 25 frames, not the old speed-8 flail)", avgHold >= 25, `avgHold≈${avgHold.toFixed(1)}f`);

  // ── TEST 3 — MOVEMENT LOCK still intact after the sprite refactor ─────────
  section("TEST 3 — half-arena movement lock (Susanoo confined)");
  const before = await page.evaluate(() => window.__harness.p1());
  // hold RIGHT for ~90 frames and track the max x reached
  await page.keyboard.down("d");
  let maxX = before.x;
  for (let i = 0; i < 6; i++) { await waitFrames(15); const p = await page.evaluate(() => window.__harness.p1()); maxX = Math.max(maxX, p.x); }
  await page.keyboard.up("d");
  await waitFrames(10);
  const after = await page.evaluate(() => window.__harness.p1());
  const arena = await page.evaluate(() => window.__harness.arena());
  const fW = after.w;   // physics clamps the HITBOX (x + w), not the giant sprite
  check("half-arena lock present while in Susanoo", after.arenaHalfLock != null, `lock=${after.arenaHalfLock}`);
  // Spawned on the left → locked "left" → clamped so the hitbox right edge (x+w) stops at the arena mid.
  check("giant confined to its half — hitbox never crossed the arena midline",
    after.arenaHalfLock === "left"
      ? (maxX + fW) <= arena.mid + 5
      : maxX >= arena.mid - 5,
    `maxX=${maxX.toFixed(0)} w=${fW} (right edge≈${(maxX + fW).toFixed(0)}) mid=${arena.mid} lock=${after.arenaHalfLock}`);
  await page.screenshot({ path: path.join(OUT, "03_after_move.png") });

  // ── page errors ───────────────────────────────────────────────────────────
  section("page errors");
  if (missing.length) console.log(`  (note: ${missing.length} missing asset(s) 404'd — non-fatal: ${[...new Set(missing)].slice(0, 5).join(", ")})`);
  const fatalMissing = [...new Set(missing)].filter(u => /\.js$|\.mjs$/.test(u));
  check("no uncaught JS exceptions during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  check("no missing JS modules (404)", fatalMissing.length === 0, fatalMissing.join(", "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e);
  FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`  screenshots → harness/shots/`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
