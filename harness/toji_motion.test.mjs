// harness/toji_motion.test.mjs
// ---------------------------------------------------------------------------
// MOTION-OVER-TIME evidence for the "intro too fast / Toji jitter / multiple
// sprites at once" reports that persisted after the fixed-timestep fix (afa5584).
//
// A single screenshot proves a pose at ONE instant; it CANNOT prove absence of
// jitter or a momentary dual-render — both are motion bugs. So this test:
//
//   1. Drives the REAL menu-flow match (__harness.start() → real introSequence,
//      NOT skipToBattle / forceIntro shortcuts) for Toji.
//   2. Runs an in-page per-rAF collector recording, every real animation frame:
//        · wall-clock t (performance.now)
//        · tojiDraws  — # of drawImage() calls hitting a Toji sheet SINCE the last
//          rAF. Steady state = 0 or 1. A value ≥2 == the render pass ran twice in
//          one frame == the old dual-render signature. This is the direct test.
//        · x / lastDrawY / frameIndex / action  — for jitter analysis.
//   3. Measures the intro's REAL-SECOND duration (introWalkIn→introReady→idle
//      transitions) to confirm the STEP-2 re-pace (~2.4s, was ~1.3s).
//   4. Captures screenshot bursts every ~50ms for 2s during idle and during walk.
//   5. Analyses the telemetry for jitter (erratic frame-to-frame position deltas)
//      and dual-render (any frame with tojiDraws ≥ 2).
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
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 });
}
async function state() { return page.evaluate(() => window.__harness.state()); }

// Install the in-page per-rAF collector + Toji-sheet drawImage tally.
async function installCollector() {
  await page.evaluate(() => {
    if (window.__cap) return;
    window.__cap = { frames: [], on: true };
    let tojiDraws = 0;
    const proto = CanvasRenderingContext2D.prototype;
    const orig = proto.drawImage;
    proto.drawImage = function (img, ...rest) {
      try { const s = (img && (img.currentSrc || img.src)) || ""; if (/toji/i.test(s)) tojiDraws++; } catch (_) {}
      return orig.apply(this, [img, ...rest]);
    };
    function tick() {
      if (window.__cap.on) {
        let p = null; try { p = window.__harness.p1(); } catch (_) {}
        window.__cap.frames.push({
          t: performance.now(),
          draws: tojiDraws,
          x: p ? p.x : null,
          drawY: p ? p.lastDrawY : null,
          fi: p ? p.frameIndex : null,
          action: p ? p.action : null,
          variant: p ? p.introVariant : null,
          gs: (window.__harness.state() || {}).gameState,
        });
        tojiDraws = 0;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
async function grabFrames() { return page.evaluate(() => window.__cap.frames.slice()); }
async function clearFrames() { await page.evaluate(() => { window.__cap.frames.length = 0; }); }

// Burst of screenshots every ~intervalMs for durMs, real wall-clock (NOT frame-gated).
async function screenshotBurst(tag, durMs = 2000, intervalMs = 50) {
  const n = Math.floor(durMs / intervalMs);
  const shots = [];
  for (let i = 0; i < n; i++) {
    const file = path.join(OUT, `MOTION_${tag}_${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
    await page.waitForTimeout(intervalMs);
  }
  return shots;
}

try {
  // p2 = a NON-Toji char on purpose: the Toji sheet is then drawn exactly ONCE per
  // frame (by p1), so the drawImage tally cleanly isolates p1. (With two Tojis the
  // count is 2/frame legitimately — one per fighter — and can't prove a dual-render.)
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);   // user-gesture unlock (audio)
  await installCollector();

  // ── REAL menu-flow match: start() runs startMatch() → the genuine round-1 INTRO
  //    phase with Toji's introSequence [introWalkIn, introReady]. NO skipToBattle.
  section("REAL intro flow (no shortcut) — timing in real seconds");
  await page.evaluate(() => window.__harness.start());
  await waitFrames(2);
  let st = await state();
  check("entered INTRO via real start() (not skipToBattle)", st.gameState === "intro", `gameState=${st.gameState}`);

  // Let the real flow run all the way into BATTLE, collecting continuously.
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 16 });
  await waitFrames(30);   // settle a moment of idle

  // Analyse intro pacing from the continuous telemetry: real-time span each intro
  // action was on screen (first→last sample carrying that variant).
  let frames = await grabFrames();
  const span = (pred) => {
    const ts = frames.filter(pred).map(f => f.t);
    return ts.length ? (ts[ts.length - 1] - ts[0]) : 0;
  };
  const walkSpan  = span(f => f.variant === "introWalkIn");
  const readySpan = span(f => f.variant === "introReady");
  const introSpan = span(f => f.variant === "introWalkIn" || f.variant === "introReady");
  console.log(`  intro real-time: walkIn=${(walkSpan / 1000).toFixed(2)}s  ready=${(readySpan / 1000).toFixed(2)}s  total=${(introSpan / 1000).toFixed(2)}s`);
  // Post STEP-2 target ~2.4s (was ~1.3s). Allow slack for rAF sampling + namecall overlap.
  check("intro reads as a deliberate 2-3s entrance (not a ~1.3s blink)", introSpan >= 1800, `total=${(introSpan / 1000).toFixed(2)}s`);
  check("walk-in is the dominant, weighty part (longer than ready-up)", walkSpan >= readySpan * 0.9, `walkIn=${(walkSpan / 1000).toFixed(2)}s ready=${(readySpan / 1000).toFixed(2)}s`);

  // ── IDLE motion: telemetry + screenshot burst ────────────────────────────
  section("IDLE — jitter + dual-render over 2 real seconds");
  await clearFrames();
  const idleShots = await screenshotBurst("idle", 2000, 50);
  const idle = await grabFrames();
  const idleDraws = idle.map(f => f.draws).filter(d => d != null);
  const idleDualMax = Math.max(0, ...idleDraws);
  const idleDualFrames = idleDraws.filter(d => d >= 2).length;
  const idleDrawYs = idle.map(f => f.drawY).filter(v => typeof v === "number");
  // Jitter metric: idle should either hold or bob SMOOTHLY. Flag large erratic
  // frame-to-frame vertical jumps (> 6px, which a 60Hz idle bob never produces).
  let idleMaxDy = 0;
  for (let i = 1; i < idleDrawYs.length; i++) idleMaxDy = Math.max(idleMaxDy, Math.abs(idleDrawYs[i] - idleDrawYs[i - 1]));
  console.log(`  idle: samples=${idle.length} tojiDraws max/frame=${idleDualMax} (frames≥2: ${idleDualFrames})  maxΔdrawY=${idleMaxDy.toFixed(1)}px`);
  check("IDLE: no dual-render (no frame drew the Toji sheet ≥2×)", idleDualMax < 2, `max draws/frame=${idleDualMax}`);
  check("IDLE: no position jitter (max frame-to-frame ΔdrawY < 6px)", idleMaxDy < 6, `maxΔ=${idleMaxDy.toFixed(1)}px`);
  check("IDLE: sprite actually rendered each frame (draws mostly ≥1)", idleDraws.filter(d => d >= 1).length >= idleDraws.length * 0.8, `rendered ${idleDraws.filter(d => d >= 1).length}/${idleDraws.length}`);

  // ── WALK motion: hold 'd', telemetry + screenshot burst ──────────────────
  section("WALK — jitter + dual-render + monotonic travel over 2 real seconds");
  await clearFrames();
  await page.keyboard.down("d");
  const walkShots = await screenshotBurst("walk", 2000, 50);
  await page.keyboard.up("d");
  const walk = await grabFrames();
  const walkDraws = walk.map(f => f.draws).filter(d => d != null);
  const walkDualMax = Math.max(0, ...walkDraws);
  const walkXs = walk.map(f => f.x).filter(v => typeof v === "number");
  // Travel should be smooth & one-directional. Jitter = direction reversals or
  // wildly uneven per-frame step sizes. Compute per-frame dx stats.
  const dxs = [];
  for (let i = 1; i < walkXs.length; i++) dxs.push(walkXs[i] - walkXs[i - 1]);
  const movingDxs = dxs.filter(d => Math.abs(d) > 0.01);
  const reversals = (() => { let r = 0; for (let i = 1; i < movingDxs.length; i++) if (Math.sign(movingDxs[i]) !== Math.sign(movingDxs[i - 1])) r++; return r; })();
  const totalTravel = walkXs.length ? (walkXs[walkXs.length - 1] - walkXs[0]) : 0;
  const maxStep = movingDxs.length ? Math.max(...movingDxs.map(Math.abs)) : 0;
  const meanStep = movingDxs.length ? movingDxs.reduce((a, b) => a + Math.abs(b), 0) / movingDxs.length : 0;
  console.log(`  walk: samples=${walk.length} tojiDraws max/frame=${walkDualMax}  travel=${totalTravel.toFixed(1)}px  reversals=${reversals}  step mean=${meanStep.toFixed(2)} max=${maxStep.toFixed(2)}`);
  check("WALK: no dual-render (no frame drew the Toji sheet ≥2×)", walkDualMax < 2, `max draws/frame=${walkDualMax}`);
  check("WALK: sprite travelled (real menu-flow movement wired)", Math.abs(totalTravel) > 20, `travel=${totalTravel.toFixed(1)}px`);
  check("WALK: smooth one-directional travel (no jitter reversals)", reversals === 0, `reversals=${reversals}`);
  check("WALK: even stride (max step < 4× mean, no teleport jumps)", maxStep <= meanStep * 4 + 0.5, `max=${maxStep.toFixed(2)} mean=${meanStep.toFixed(2)}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

  console.log(`\n  screenshot bursts written: ${idleShots.length} idle + ${walkShots.length} walk → harness/shots/MOTION_*`);

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "MOTION_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
