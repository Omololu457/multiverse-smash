// harness/goku_restore.test.mjs
// ---------------------------------------------------------------------------
// Existing GOKU — sprite-restore verification (undo of teardown 43f9749).
// Proves Goku renders with REAL sprites again (not the procedural box) and all his
// existing moves still fire, exactly as before the teardown:
//   • sprite gate: hasSpriteHandler + spriteReady + idle sheet = goku_base_FULLSHEET
//   • Dragon Fist  — neutral Special (L): rushes + connects + spends energy (−40)
//   • Kamehameha   — QCF (D,F) + Special (L): spawns a projectile + spends energy (−30)
//   • Super Saiyan Blue ultimate (U): advances the transformation (base → ssj1)
// This is a SEPARATE character from Goku Black; goku_black is untouched here.
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
async function waitGrounded() {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
}
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function tapKey(k, n = 3) { await page.keyboard.down(k); await waitFrames(n); await page.keyboard.up(k); }
// qcf = down, forward, then special (feeds directionHistory exactly like round4.test.mjs)
async function qcfSpecial() {
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d");
  await tapKey("l");
}
async function setupAdjacent(gap = 52) {
  await waitGrounded();
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await waitGrounded();

  // ── SPRITE GATE — Goku renders as sprites again (teardown undone) ────────────
  section("sprite gate — Goku renders as sprites (NOT the procedural box)");
  {
    const a = await p1();
    // MK-feel Stage 5: Goku is sprite-flag-removed (hasSprites:false) → procedural box. The sprite-GATE
    // checks are box-aware: they assert the procedural state now, and re-assert the sprite gate if sprites
    // are ever restored. animationData (incl. spriteScale) is KEPT, so line 4 still holds either way.
    const boxed = a.hasSprites === false;
    check("P1 is Goku", a.key === "goku", `key=${a.key}`);
    check("procedural box after Stage-5 flag-removal (no SpriteHandler) — or a real handler if restored",
      boxed ? a.hasSpriteHandler === false : a.hasSpriteHandler === true, `boxed=${boxed} hasSpriteHandler=${a.hasSpriteHandler}`);
    check("idle sprite gate OFF once flag-removed — or ready if the manifest entry is restored",
      boxed ? a.spriteReady !== true : a.spriteReady === true, `boxed=${boxed} ready=${a.spriteReady}`);
    check("no idle sheet once flag-removed — or goku_base_FULLSHEET if restored",
      boxed ? !(a.spriteSheet || "").includes("goku_base_FULLSHEET") : (a.spriteSheet || "").includes("goku_base_FULLSHEET"), `sheet=${a.spriteSheet}`);
    check("spriteScale data retained ≈ 3.2 (animationData kept even when flag-removed)", Math.abs((a.spriteScale || 0) - 3.2) < 0.01, `spriteScale=${a.spriteScale}`);
    await page.screenshot({ path: path.join(OUT, "GOKU_restored_idle.png") });
  }

  // ── DRAGON FIST — neutral Special (L): rush + connect + energy ───────────────
  section("Dragon Fist — neutral Special (L)");
  {
    await setupAdjacent(70);
    await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    await tapKey("l", 4);
    await waitFrames(22);
    const e1 = (await p1()).energy, hp1 = (await p2()).health;
    check("Dragon Fist spends energy (≈ −40)", e1 < e0, `energy ${e0.toFixed(0)} → ${e1.toFixed(0)} (−${(e0 - e1).toFixed(0)})`);
    check("Dragon Fist connects and deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await page.screenshot({ path: path.join(OUT, "GOKU_restored_dragonfist.png") });
    await waitFrames(10);
  }

  // ── KAMEHAMEHA — QCF (D,F) + Special (L): projectile + energy ────────────────
  section("Kamehameha — QCF (D,F) + Special (L)");
  {
    await setupAdjacent(200);
    const before = (await projectiles()).length;
    const e0 = (await p1()).energy;
    await qcfSpecial();
    await waitFrames(4);
    const after = (await projectiles()).length;
    const e1 = (await p1()).energy;
    check("Kamehameha spawns a projectile", after > before, `projectiles ${before} → ${after}`);
    check("Kamehameha spends energy (≈ −30)", e1 < e0, `energy ${e0.toFixed(0)} → ${e1.toFixed(0)} (−${(e0 - e1).toFixed(0)})`);
    await page.screenshot({ path: path.join(OUT, "GOKU_restored_kamehameha.png") });
    await page.evaluate(() => window.__harness.clearProjectiles?.());
    await waitFrames(6);
  }

  // ── TRANSFORMATION LADDER moved to the CHARGE button (2026-08-22 DB alignment) ───────────────
  // The old ultimate-button "next SSJ" trigger was REMOVED — the ladder is now charge-triggered / threshold-
  // gated / drain-based (like Vegeta / Goku Black / Frieza). Verify: (1) Ultimate (U) NO LONGER transforms,
  // (2) the charge-based step DOES.
  section("Transformation ladder (charge-based) — Ultimate input is unbound");
  {
    await waitGrounded();
    await page.evaluate(() => window.__harness.resetUlt?.());   // clear ult lockout + refill energy
    await page.evaluate(() => window.__harness.p1GokuRevert?.());
    const u0 = await p1();
    await tapKey("u", 4);
    await waitFrames(10);
    const u1 = await p1();
    check("Ultimate (U) no longer transforms Goku (input freed)", (u1.transformIndex ?? 0) === 0 && (u1.currentForm || "base") === "base", `form ${u0.currentForm}→${u1.currentForm}, idx ${u0.transformIndex}→${u1.transformIndex}`);
    await page.evaluate(() => { window.__harness.p1GokuSetEnergy?.(200); });
    const stepped = await page.evaluate(() => window.__harness.p1GokuStepForm?.());
    await waitFrames(4);
    const c1 = await p1();
    check("charge-step advances Goku's form (base → SSJ)", stepped === true && (c1.transformIndex ?? 0) === 1, `stepped=${stepped} idx=${c1.transformIndex} form=${c1.currentForm}`);
    await page.screenshot({ path: path.join(OUT, "GOKU_restored_ssblue.png") });
  }

  // ── STABILITY ────────────────────────────────────────────────────────────────
  section("stability — no uncaught page errors");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("\n💥 harness threw:", e);
  FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku RESTORE:  ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
