// harness/combo_break_prompt_verify.mjs
// ---------------------------------------------------------------------------
// LIVE verification of the in-match COMBO-BREAK PROMPT (Stage 2 UI/UX task).
// Drives a real training match, forces the "being combo'd + can afford a break"
// state, and confirms the flashing ⛓ BREAK! prompt:
//   (A) APPEARS near the player's HUD when a break is available, and
//   (B) DISAPPEARS the moment the resource (meter) is gone.
// Assertion is twofold: the logical break-condition (via breakerProbe) AND a
// visual pixel check of the prompt region on the live canvas. Screenshots saved.
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
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".csv": "text/csv" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("nf"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const probe = () => page.evaluate(() => window.__harness.breakerProbe("p1"));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

// Count bright-amber prompt pixels in P1's HUD prompt region (canvas backing-store space).
// The prompt draws a dark pill with an amber stroke + bright #ffe08a text just below the BREAK pips.
async function amberCountInPromptBand() {
  return await page.evaluate(() => {
    const cv = document.getElementById("gameCanvas");
    const ctx = cv.getContext("2d");
    // sample the left-HUD band where drawBreakPrompt renders (x≈14.., y≈64..90 in canvas coords)
    const x0 = 10, y0 = 62, w = 260, h = 34;
    const img = ctx.getImageData(x0, y0, w, h).data;
    let amber = 0;
    for (let i = 0; i < img.length; i += 4) {
      const r = img[i], g = img[i + 1], b = img[i + 2];
      if (r > 200 && g > 165 && g < 235 && b < 175) amber++;   // #fbbf24 / #ffe08a family
    }
    return amber;
  });
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness);
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());   // training match (mode="training"); dummy is frozen
  await waitFrames(6);

  // Baseline (neutral, no combo): prompt must NOT be drawn.
  section("BASELINE — neutral, not being combo'd → prompt HIDDEN");
  const amberNeutral = await amberCountInPromptBand();
  await page.screenshot({ path: path.join(OUT, "CBP_1_neutral.png") });
  console.log(`   amber pixels (neutral band, includes BREAK label+pips) = ${amberNeutral}`);

  // ── (A) AVAILABLE: force the exact "being combo'd + can break" state ─────────────────
  section("(A) being combo'd WITH resource → prompt VISIBLE");
  const me = (await p1()).maxEnergy || 100;
  await page.evaluate((e) => window.__harness.setEnergy(e), me);          // full meter (>= energyCost 40)
  const armed = await page.evaluate(() => window.__harness.armBreakerScenario("p1", 120));  // P1 hitstun=120, attacker combo=4
  await waitFrames(2);
  const pr = await probe();
  check("P1 is in hitstun (being hit)", (pr.hitstun || 0) > 0, `hitstun=${pr.hitstun}`);
  check("attacker is at a REAL combo (>=3)", (armed?.atkCombo || 0) >= 3, `atkCombo=${armed?.atkCombo}`);
  check("P1 has a BREAK stock", (pr.stocks || 0) > 0, `stocks=${pr.stocks}`);
  check("P1 can afford the meter cost (energy >= 40)", (pr.energy || 0) >= 40, `energy=${pr.energy}`);
  const amberAvail = await amberCountInPromptBand();
  await page.screenshot({ path: path.join(OUT, "CBP_2_break_available.png") });
  console.log(`   amber pixels (available) = ${amberAvail}`);
  check("BREAK! prompt is drawn (amber pixels jump vs neutral)", amberAvail > amberNeutral + 80, `avail=${amberAvail} vs neutral=${amberNeutral}`);

  // ── (B) UNAVAILABLE: same combo state, but drain the meter → prompt must vanish ──────
  section("(B) being combo'd but NO resource (meter drained) → prompt HIDDEN");
  await page.evaluate(() => window.__harness.armBreakerScenario("p1", 120));   // re-arm hitstun + combo
  await page.evaluate(() => window.__harness.setEnergy(0));                     // energy < 40 → cannot break
  await waitFrames(2);
  const pr2 = await probe();
  check("still in hitstun (combo ongoing)", (pr2.hitstun || 0) > 0, `hitstun=${pr2.hitstun}`);
  check("meter now below cost", (pr2.energy || 0) < 40, `energy=${pr2.energy}`);
  const amberGone = await amberCountInPromptBand();
  await page.screenshot({ path: path.join(OUT, "CBP_3_break_unavailable.png") });
  console.log(`   amber pixels (unavailable) = ${amberGone}`);
  check("BREAK! prompt is GONE (amber back near baseline)", amberGone < amberAvail - 80, `gone=${amberGone} vs avail=${amberAvail}`);

  // ── (C) REAL vs-CPU match (no training overlay) — the scenario the task asks for ─────
  section("(C) REAL vs-CPU match → prompt VISIBLE mid-combo (clean HUD)");
  await page.evaluate(() => window.__harness.bootVs());
  await waitFrames(6);
  const me2 = (await p1()).maxEnergy || 100;
  await page.evaluate((e) => window.__harness.setEnergy(e), me2);
  await page.evaluate(() => window.__harness.armBreakerScenario("p1", 120));
  await waitFrames(2);
  const pr3 = await probe();
  const amberReal = await amberCountInPromptBand();
  await page.screenshot({ path: path.join(OUT, "CBP_4_real_match.png") });
  console.log(`   amber pixels (real match) = ${amberReal}`);
  check("prompt visible in a real match while combo'd + resourced", (pr3.hitstun || 0) > 0 && amberReal > 80, `hitstun=${pr3.hitstun} amber=${amberReal}`);

  // ── (D) HOW-TO-PLAY: the DEFENSE page now teaches the combo breaker ───────────────────
  section("(D) How-To-Play DEFENSE page documents the combo breaker");
  await page.evaluate(() => window.__harness.ui.goto("TUTORIAL"));
  await waitFrames(3);
  await page.keyboard.press("d"); await waitFrames(4);   // MOVEMENT → ATTACKS
  await page.keyboard.press("d"); await waitFrames(4);   // ATTACKS  → DEFENSE
  await page.screenshot({ path: path.join(OUT, "CBP_5_howto_defense.png") });
  console.log("   captured How-To-Play DEFENSE page → CBP_5_howto_defense.png");

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) {
  FAIL++; console.log("  ❌ FAIL  harness threw:", e.message);
} finally {
  console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
