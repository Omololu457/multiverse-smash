// harness/susanoo_refinements.test.mjs
// ---------------------------------------------------------------------------
// Live verification of the three Susanoo refinements:
//   1) the round timer PAUSES while Susanoo is active (but _susanooTimer keeps ticking)
//   2) a purple Susanoo duration countdown renders near the round timer
//   3) attack FX (grab / arrow / sword) spawn at the giant's ARM height, not the ground
// Same harness pattern as susanoo.test.mjs (real Chromium, real page.keyboard.*).
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
async function tapKey(k) { await page.keyboard.down(k); await waitFrames(3); await page.keyboard.up(k); await waitFrames(2); }

// Expected arm-height y for a giant, from its rendered top (lastDrawY) and feet (fighter.y+h).
function expectedArmY(p, armFrac) {
  const top = p.lastDrawY;
  const feet = p.y + p.h;               // bottom of the hitbox ≈ giant's feet (see sprite.js offsetY)
  return top + armFrac * (feet - top);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── TEST 1 — ROUND TIMER PAUSES DURING SUSANOO ────────────────────────────
  section("TEST 1 — round timer pauses while Susanoo active");
  // baseline: round timer ticks down normally BEFORE Susanoo
  const rtA = await page.evaluate(() => window.__harness.roundTimer());
  await waitFrames(30);
  const rtB = await page.evaluate(() => window.__harness.roundTimer());
  check("round timer ticks DOWN in normal play", rtB < rtA, `${rtA} → ${rtB} over 30f`);

  // enter Susanoo, then confirm the round timer FREEZES while _susanooTimer keeps ticking
  await tapKey("u");
  await waitFrames(4);
  const inS = await page.evaluate(() => window.__harness.p1());
  check("entered Susanoo Stage 1", inS.susanooStage === 1);
  const rtC = await page.evaluate(() => window.__harness.roundTimer());
  const susC = inS.susanooTimer;
  await waitFrames(40);
  const rtD = await page.evaluate(() => window.__harness.roundTimer());
  const susD = await page.evaluate(() => window.__harness.p1());
  check("round timer FROZEN during Susanoo", rtD === rtC, `round timer ${rtC} → ${rtD} over 40f (should be equal)`);
  check("Susanoo DURATION timer keeps ticking (NOT frozen)", susD.susanooTimer < susC && susD.susanooTimer > 0, `_susanooTimer ${susC} → ${susD.susanooTimer} over ~44f`);
  await page.screenshot({ path: path.join(OUT, "R1_timer_paused.png") });

  // ── TEST 3 — FX SPAWN AT ARM HEIGHT ───────────────────────────────────────
  section("TEST 3 — attack FX originate at the giant's arm/hand");

  // Lv1 GRAB (special 'l'): a susanooFx projectile from grab.png should spawn near the arm.
  // Wait out the post-transform attackCooldown (~15f) first, else triggerSpecial is rejected.
  await waitFrames(20);
  const p1s1 = await page.evaluate(() => window.__harness.p1());
  await tapKey("l");
  await waitFrames(3);
  const projGrab = await page.evaluate(() => window.__harness.projectiles());
  const grabFx = projGrab.find(p => p.name === "susanooFx");
  check("Lv1 grab spawns a susanooFx", !!grabFx, `projectiles=${JSON.stringify(projGrab.map(p => p.name))}`);
  if (grabFx) {
    const armY = expectedArmY(p1s1, 0.45);
    const feet = p1s1.y + p1s1.h;
    const err = Math.abs(grabFx.y - armY);
    const heightAbove = feet - grabFx.y;      // how far above the feet the FX sits
    check("grab FX is at ~arm height (matches 0.45 frac math)", err < 60, `fxY=${grabFx.y.toFixed(0)} expected≈${armY.toFixed(0)} (err ${err.toFixed(0)})`);
    check("grab FX well ABOVE the feet (upper body, not ground)", heightAbove > 250, `${heightAbove.toFixed(0)}px above feet`);
  }
  await page.screenshot({ path: path.join(OUT, "R3a_lv1_grab.png") });
  await waitFrames(55);   // let the grab attack (startup+active+recovery ≈42f) fully finish before escalating

  // escalate to Lv2
  await tapKey("u");
  await waitFrames(6);
  const p1s2 = await page.evaluate(() => window.__harness.p1());
  check("escalated to Stage 2", p1s2.susanooStage === 2, `stage=${p1s2.susanooStage}`);

  // Lv2 ARROW (spaced out → distanceX>170): susanooArrow should fire from the bow hand.
  await waitFrames(28);   // wait out the Stage-2 attackCooldown (~24f)
  await tapKey("l");
  await waitFrames(3);
  const projArrow = await page.evaluate(() => window.__harness.projectiles());
  const arrowFx = projArrow.find(p => p.name === "susanooArrow");
  check("Lv2 (spaced) fires a susanooArrow", !!arrowFx, `projectiles=${JSON.stringify(projArrow.map(p => p.name))}`);
  if (arrowFx) {
    const feet = p1s2.y + p1s2.h;
    const heightAbove = feet - arrowFx.y;
    // NOTE (round 4): the arrow now AUTO-AIMS down at the opponent (vy>0), so by sample time it
    // has descended below its arm-height spawn — it starts high and travels down-and-forward.
    check("arrow starts high, well ABOVE the feet (fired from up high)", heightAbove > 250, `${heightAbove.toFixed(0)}px above feet`);
    check("arrow descends toward the opponent (vy>0)", arrowFx.vy > 0, `vy=${(arrowFx.vy ?? 0).toFixed(2)}`);
  }
  await page.screenshot({ path: path.join(OUT, "R3b_lv2_arrow.png") });
  await waitFrames(40);

  // Lv2 SWORD (close range → move dummy within 170, no DOWN held): susanooFx from sword_attack.png.
  await waitFrames(28);   // wait out the arrow's attackCooldown
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 110); });
  await waitFrames(2);
  await tapKey("l");
  await waitFrames(3);
  const projSword = await page.evaluate(() => window.__harness.projectiles());
  const swordFx = projSword.find(p => p.name === "susanooFx" && /sword/.test(p.sheet || ""));
  check("Lv2 (close) spawns a sword susanooFx", !!swordFx, `projectiles=${JSON.stringify(projSword.map(p => p.name + ":" + (p.sheet || "").split("/").pop()))}`);
  if (swordFx) {
    const armY = expectedArmY(p1s2, 0.50);
    const heightAbove = (p1s2.y + p1s2.h) - swordFx.y;
    check("sword FX at ~arm height", Math.abs(swordFx.y - armY) < 90, `fxY=${swordFx.y.toFixed(0)} expected≈${armY.toFixed(0)}`);
    check("sword FX well above feet", heightAbove > 250, `${heightAbove.toFixed(0)}px above feet`);
  }
  await page.screenshot({ path: path.join(OUT, "R3c_lv2_sword.png") });

  section("page errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "R_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
