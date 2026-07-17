// harness/toji.test.mjs
// ---------------------------------------------------------------------------
// Toji core re-wire verification (staged pass — NOT the attack tree):
//   1. NEW transparent-bg sheets render for idle / walk / jump / hurt (grounded
//      + airborne) at the corrected roster-normal scale (spriteScale 2.3).
//   2. Two-part intro plays in FIXED ORDER (introWalkIn → introReady), not random.
//   3. Curse-spirit projectile (down,forward + special) spawns, travels, connects,
//      deals damage — and costs NO energy.
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
const missing = [];
page.on("response", r => { if (r.status() === 404) missing.push(r.url().replace(base, "")); });

const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) {
  const s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }

const base_ = f => (f || "").split("/").pop();

try {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // ───────────────────────────────────────────────────────────────────────
  section("2) SIZE FIX + core idle sheet");
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(4);
  let s = await p1();
  check("Toji renders from a sprite sheet (not the box fallback)", !!s.spriteSheet, `sheet=${base_(s.spriteSheet)}`);
  check("idle uses the NEW transparent-bg sheet", base_(s.spriteSheet) === "toji_stance_idle.png", `sheet=${base_(s.spriteSheet)}`);
  check("idle frame count re-verified = 6 (not the stated 5)", s.spriteFrames === 6, `frames=${s.spriteFrames}`);
  check("spriteScale corrected to roster-normal 2.3 (was 1.7)", s.spriteScale === 2.3, `spriteScale=${s.spriteScale}`);
  check("action resolves to idle", s.action === "idle", `action=${s.action}`);
  await page.screenshot({ path: path.join(OUT, "TOJI_idle_scale.png") });

  // ───────────────────────────────────────────────────────────────────────
  section("1) core movement sheets — walk / jump / hurt / air-hurt");
  await page.evaluate(() => { window.__harness.healP2(); });

  // WALK: hold forward
  await page.keyboard.down("d"); await waitFrames(6);
  s = await p1(); await page.keyboard.up("d");
  check("walk uses toji_walk.png", base_(s.spriteSheet) === "toji_walk.png", `sheet=${base_(s.spriteSheet)} action=${s.action}`);
  check("walk/run action while moving", (s.action === "walk" || s.action === "run"), `action=${s.action}`);
  check("walk re-verified 7 frames (was mis-sliced as 6)", s.spriteFrames === 7, `frames=${s.spriteFrames}`);
  await page.screenshot({ path: path.join(OUT, "TOJI_walk.png") });
  await waitFrames(6);

  // JUMP
  await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
  await waitFrames(2);
  s = await p1();
  check("jump leaves the ground", s.grounded === false, `grounded=${s.grounded} vy=${s.vy?.toFixed?.(1)}`);
  check("jump/fall uses toji_jump.png", base_(s.spriteSheet) === "toji_jump.png", `sheet=${base_(s.spriteSheet)} action=${s.action}`);
  check("jump slices airborne frames only (5, crouch excluded → no shrink glitch)", s.spriteFrames === 5, `frames=${s.spriteFrames}`);
  await page.screenshot({ path: path.join(OUT, "TOJI_jump.png") });
  // wait to land
  await page.waitForFunction(() => window.__harness.p1().grounded === true, null, { timeout: 8000, polling: 16 });

  // GROUNDED HURT
  await page.evaluate(() => window.__harness.hurtP1(24));
  await waitFrames(2);
  s = await p1();
  check("grounded hurt uses toji_hit.png", base_(s.spriteSheet) === "toji_hit.png", `sheet=${base_(s.spriteSheet)} action=${s.action}`);
  check("grounded hurt action = hurt", s.action === "hurt", `action=${s.action}`);
  await page.screenshot({ path: path.join(OUT, "TOJI_hurt_grounded.png") });
  await page.waitForFunction(() => window.__harness.p1().grounded === true, null, { timeout: 8000, polling: 16 });

  // AIRBORNE HURT: lift P1 into the air, then apply hitstun → hurt_air
  await page.evaluate(() => { window.__harness.liftP1(60); window.__harness.hurtP1(30); });
  await waitFrames(1);
  s = await p1();
  check("airborne + in hitstun", s.grounded === false, `grounded=${s.grounded}`);
  check("airborne hurt uses the dedicated toji_air_hit.png", base_(s.spriteSheet) === "toji_air_hit.png", `sheet=${base_(s.spriteSheet)} action=${s.action}`);
  check("airborne hurt action = hurt_air", s.action === "hurt_air", `action=${s.action}`);
  check("air-hurt frame count = 6", s.spriteFrames === 6, `frames=${s.spriteFrames}`);
  await page.screenshot({ path: path.join(OUT, "TOJI_hurt_air.png") });
  await page.waitForFunction(() => window.__harness.p1().grounded === true, null, { timeout: 8000, polling: 16 });

  // ───────────────────────────────────────────────────────────────────────
  section("1) two-part intro — FIXED ORDER (walk-in → ready-up)");
  await page.evaluate(() => window.__harness.start());   // stay in INTRO (no skipToBattle)
  await waitFrames(2);
  const introTimeline = [];   // record (variant, sheet) transitions during INTRO
  let sawWalkIn = -1, sawReady = -1;
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => ({ g: window.__harness.state().gameState, p: window.__harness.p1() }));
    if (st.g !== "intro") break;
    const v = st.p.introVariant, sh = base_(st.p.spriteSheet);
    if (!introTimeline.length || introTimeline[introTimeline.length - 1].v !== v) introTimeline.push({ v, sh, frame: st.p ? i : i });
    if (v === "introWalkIn" && sawWalkIn < 0) sawWalkIn = i;
    if (v === "introReady" && sawReady < 0) sawReady = i;
    if (i === 1) await page.screenshot({ path: path.join(OUT, "TOJI_intro_part1_walkin.png") });
    if (v === "introReady") { await page.screenshot({ path: path.join(OUT, "TOJI_intro_part2_ready.png") }); }
    await waitFrames(2);
  }
  check("intro STARTS on part 1 (introWalkIn)", introTimeline[0]?.v === "introWalkIn", `first=${introTimeline[0]?.v}`);
  check("part 1 renders toji_intro_first_part.png", introTimeline[0]?.sh === "toji_intro_first_part.png", `sheet=${introTimeline[0]?.sh}`);
  check("intro ADVANCES to part 2 (introReady)", sawReady > 0, `sawReady@${sawReady}`);
  const readyStep = introTimeline.find(t => t.v === "introReady");
  check("part 2 renders toji_intro_second_part.png", readyStep?.sh === "toji_intro_second_part.png", `sheet=${readyStep?.sh}`);
  check("FIXED ORDER — part 1 plays BEFORE part 2 (not random-pick)", sawWalkIn >= 0 && sawReady > sawWalkIn, `walkIn@${sawWalkIn} < ready@${sawReady}`);
  check("exactly two ordered steps, no back-and-forth cycling", introTimeline.map(t => t.v).join(">") === "introWalkIn>introReady", `timeline=${introTimeline.map(t => t.v).join(">")}`);

  // ───────────────────────────────────────────────────────────────────────
  section("3) curse-spirit projectile — free ranged special");
  await page.evaluate(() => { window.__harness.boot(); });
  await waitFrames(4);
  // Drain energy to ZERO first: a normal costed special could NOT fire at 0 energy,
  // so a successful cast here is the proof the curse is FREE. (Toji's stats.maxEnergy=0
  // is clamped to 1 by the engine's div-by-zero guard, so energy lives in [0,1].)
  await page.evaluate(() => { window.__harness.setEnergy(0); window.__harness.healP2(); });
  await waitFrames(1);
  const before = await p1();
  const hpBefore = (await p2()).health;
  check("Toji is a NO-energy character (stats.maxEnergy 0 → clamped to 1)", before.maxEnergy === 1, `maxEnergy=${before.maxEnergy}`);
  check("energy drained to ~0 before the cast", before.energy <= 1, `energy=${before.energy}`);

  // down, forward, special  (qcf + l)
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d");
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");

  const projA = await projectiles();
  const curse = projA.find(p => p.name === "curseSpirit");
  check("curse fires even at 0 energy → it is FREE (a costed special couldn't)", !!curse, `projectiles=${JSON.stringify(projA.map(p => p.name))} energy=${before.energy}`);
  check("projectile uses the curse-creature sprite (curse_effect_2)", !!curse && base_(curse.sheet) === "toji_curse_effect_2.png", curse ? `sheet=${base_(curse.sheet)}` : "");
  check("aimed toward the opponent (vx>0)", !!curse && curse.vx > 0, curse ? `vx=${curse.vx.toFixed(1)}` : "");
  const x0 = curse ? curse.x : null;
  await page.screenshot({ path: path.join(OUT, "TOJI_curse_spawn.png") });

  // TRAVELS: x advances toward the opponent
  await waitFrames(6);
  const projB = await projectiles();
  const curse2 = projB.find(p => p.name === "curseSpirit");
  check("projectile TRAVELS (x advanced right)", (curse2 == null && x0 != null) || (curse2 && curse2.x > x0), curse2 ? `x ${x0?.toFixed(0)}→${curse2.x.toFixed(0)}` : "already resolved (connected)");

  // CONNECTS + deals damage
  await waitFrames(40);
  const hpAfter = (await p2()).health;
  check("curse projectile CONNECTS and deals damage", hpAfter < hpBefore, `p2 hp ${hpBefore.toFixed(0)} → ${hpAfter.toFixed(0)} (−${(hpBefore - hpAfter).toFixed(0)})`);

  // FREE: casting never DEDUCTED energy (it stayed at the drained floor, never went negative)
  const after = await p1();
  check("cast deducted NO energy (stayed at drained floor, not negative)", after.energy >= before.energy && after.energy >= 0, `energy ${before.energy} → ${after.energy}`);

  // ───────────────────────────────────────────────────────────────────────
  // PIXEL-LEVEL jitter guard — the shipped bug (frames sliced at sheetWidth/N instead
  // of the true padded pitch) made the body drift ~30px horizontally per idle cycle,
  // which STATE checks can't see. Measure the dark-navy body center-of-mass across the
  // idle cycle with a settled camera; a stable slice keeps it within a few px.
  section("VISUAL: idle horizontal jitter (regression guard for the slicing bug)");
  await page.evaluate(() => { window.__harness.boot(); window.__harness.setP2X(2200); });
  await waitFrames(150);   // let the camera fully settle so any COM swing is sprite-only
  const bodyCOM = () => page.evaluate(() => {
    const cv = document.querySelector("canvas"), g = cv.getContext("2d");
    const CX = 60, CY = 250, CW = 520, CH = 220;
    const d = g.getImageData(CX, CY, CW, CH).data;
    let sx = 0, n = 0;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const i = (y * CW + x) * 4, r = d[i], gg = d[i + 1], bb = d[i + 2];
      if (r < 85 && gg < 80 && bb < 115 && (r + gg + bb) < 230) { sx += x; n++; }
    }
    return n < 50 ? null : sx / n + CX;
  });
  const seenCom = new Map();
  for (let i = 0; i < 50 && seenCom.size < 6; i++) {
    const sp = await p1(), c = await bodyCOM();
    if (c != null && !seenCom.has(sp.frameIndex)) seenCom.set(sp.frameIndex, c);
    await waitFrames(1);
  }
  const comVals = [...seenCom.values()];
  const comSwing = comVals.length ? Math.max(...comVals) - Math.min(...comVals) : 999;
  check("idle body does NOT jitter horizontally (COM swing < 8px across the cycle)", comSwing < 8, `swing=${comSwing.toFixed(1)}px over ${comVals.length} frames`);
  await page.screenshot({ path: path.join(OUT, "TOJI_idle_jittercheck.png") });

  // ───────────────────────────────────────────────────────────────────────
  section("asset load / errors");
  const tojiMissing = [...new Set(missing)].filter(u => /toji_(stance_idle|walk|jump|hit|air_hit|intro_first_part|intro_second_part|curse_effect_2)\.png/.test(u));
  check("no 404 on any NEW Toji core/curse sheet", tojiMissing.length === 0, tojiMissing.join(", "));
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "TOJI_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
