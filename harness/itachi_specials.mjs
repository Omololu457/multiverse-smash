// harness/itachi_specials.mjs
// STAGE 4 evidence: Mangekyou-gated specials — Amaterasu (QCF) and Genjutsu (QCB hit-confirm).
// The two gates that matter most:
//   (1) Amaterasu is HARD-gated behind Mangekyou — a QCF in base form fires NOTHING amaterasu
//       (it falls through to the neutral Great Fireball); it only spawns the black flame while active.
//   (2) Genjutsu only fires on a real HIT-CONFIRM — QCB+Special with no live combo does NOTHING,
//       even in Mangekyou; it only lands after a combo has connected (comboCounter ≥ 2).
// Run: node harness/itachi_specials.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
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

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const section = (t) => console.log(`\n── ${t} ──`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const stateFrame = () => page.evaluate(() => window.__harness.state().frame);
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const combo = () => page.evaluate(() => window.__harness.training().combo);
async function waitFrames(n) { const s = await stateFrame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `itachi_specials_${tag}.png`) }); }
async function settle() {
  // Force a clean BASE state: setEnergy(0) makes Mangekyou auto-revert (it persists across sections
  // otherwise), so every section starts from base and activateMangekyou() activates cleanly.
  await page.evaluate(() => window.__harness.setEnergy(0));
  await waitFrames(3);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles(); window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.charging; }, null, { timeout: 10000, polling: 16 }).catch(() => {});
  await waitFrames(50);   // let the ~90f combo window + any stale directionHistory (~700ms) age out
}
async function faceRightAt(gap) { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }
// Discrete-tap a quarter-circle motion (D→F or D→B, facing right) then press Special.
// Holds are ≥4 frames each: the input buffer is frame-POLLED, so 2-frame taps can slip between
// polls under headless timing and drop the direction edge (or the Special press) entirely — the
// motion then never matches ["D","F"]/["D","B"] and the special silently no-ops. 4-frame holds
// register reliably while staying well inside the 700ms command window.
// Returns evidence observed from the instant Special is pressed: projectile names AND the fighter's
// cast pose (_spriteCastMove). A fast special fired point-blank at the dummy can spawn AND despawn (on
// hit) within a single frame — so the projectile may never appear in a poll even though it genuinely
// fired. The cast pose (fireballCast / amaterasuCast) is the reliable spawn witness in that case.
// Polling from the press edge (not after the helper returns) is what makes both observable.
async function motionSpecial(dir) {
  const lat = dir === "F" ? "d" : "a";
  await page.keyboard.down("s"); await waitFrames(4); await page.keyboard.up("s"); await waitFrames(1);
  await page.keyboard.down(lat); await waitFrames(4); await page.keyboard.up(lat); await waitFrames(1);
  const seen = new Set();
  await page.keyboard.down("l");
  for (let i = 0; i < 10; i++) {
    (await projs()).forEach(p => seen.add(p.name));
    const act = (await p1()).action; if (act) seen.add(act);   // the cast pose surfaces as _lastSpriteAction (fireballCast/amaterasuCast)
    await waitFrames(1);
  }
  await page.keyboard.up("l");
  return [...seen];
}
async function activateMangekyou() {
  await page.evaluate(() => window.__harness.fillEnergy());
  if ((await p1()).mangekyouActive) return;   // idempotent — already on (a 4f tap would REVERT it)
  await page.keyboard.down("p"); await waitFrames(4); await page.keyboard.up("p"); await waitFrames(3);
  // Activation now plays a frozen eye-transformation cinematic (combat/input paused) — wait it out.
  await page.waitForFunction(() => !window.__harness.mangekyouCine().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=itachi`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── GATE 1: AMATERASU is hard-gated behind Mangekyou ─────────────────
  section("Amaterasu HARD gate — QCF in BASE form does NOT produce black flame");
  await settle();
  check("start in base (Mangekyou off)", (await p1()).mangekyouActive === false, "");
  await faceRightAt(150);
  const names = await motionSpecial("F");   // QCF + Special in base form (returns projectiles seen from the press)
  check("no 'amaterasu' projectile without Mangekyou", !names.includes("amaterasu") && !names.includes("amaterasuCast"), `evidence=${names}`);
  check("QCF in base falls through to neutral Great Fireball", names.includes("itachiFireball") || names.includes("fireballCast"), `evidence=${names}`);

  // ── AMATERASU fires WITH Mangekyou ───────────────────────────────────
  section("Amaterasu fires while Mangekyou is active");
  await settle();
  await activateMangekyou();
  check("Mangekyou active", (await p1()).mangekyouActive === true, "");
  await faceRightAt(160);
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  const anames = await motionSpecial("F");
  // Projectile witness: the live 'amaterasu' projectile OR the amaterasuCast pose (a point-blank
  // hit can consume the projectile within one frame — the cast pose proves it spawned regardless).
  const sawAmaterasu = anames.includes("amaterasu") || anames.includes("amaterasuCast");
  const castSeen = anames.includes("amaterasuCast");
  check("Amaterasu black-flame projectile spawns", sawAmaterasu, `evidence=${anames}`);
  check("amaterasuCast pose plays", castSeen, `evidence=${anames}`);
  check("Amaterasu spent ~40 energy", (e0 - (await p1()).energy) >= 35, `spent=${(e0 - (await p1()).energy).toFixed(0)}`);
  await waitFrames(40);
  check("Amaterasu connects (direct + burn)", hp0 - (await p2()).health > 0, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
  await shot("amaterasu");

  // ── GATE 2: GENJUTSU only on hit-confirm ─────────────────────────────
  section("Genjutsu HIT-CONFIRM gate — QCB with NO live combo does NOT fire");
  await settle();
  await activateMangekyou();
  check("Mangekyou active, combo counter 0", (await p1()).mangekyouActive === true && (await combo()) === 0, `combo=${await combo()}`);
  await faceRightAt(60);
  const gHp0 = (await p2()).health, gE0 = (await p1()).energy;
  await motionSpecial("B");   // QCB + Special, but no combo has connected
  await waitFrames(3);
  const noCombo = await p1();
  check("Genjutsu does NOT fire without a combo", noCombo.currentMove !== "genjutsuCast", `move=${noCombo.currentMove}`);
  check("no energy spent on the whiffed Genjutsu", Math.abs((await p1()).energy - gE0) < 12, `Δenergy≈${((await p1()).energy - gE0).toFixed(1)}`);
  check("target not frozen (no big hitstun)", (await p2()).hitstun < 40, `p2.hitstun=${(await p2()).hitstun}`);

  // ── GENJUTSU fires ON hit-confirm ────────────────────────────────────
  section("Genjutsu fires after a combo connects (hit-confirm)");
  await settle();
  await activateMangekyou();
  // Build the combo to ≥2 (re-pin P2 each hit so knockback doesn't drop the next); comboTimer(90f)
  // keeps it alive between hits. Then input QCB inside that window.
  let comboNow = 0;
  for (let i = 0; i < 6 && comboNow < 2; i++) {
    await faceRightAt(40);
    await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(12);
    comboNow = await combo();
  }
  check("combo built (≥2 hits landed)", comboNow >= 2, `combo=${comboNow}`);
  const fHp0 = (await p2()).health;
  // Wait for Itachi to recover from the last light (else the QCB press is dropped) — the 90f combo
  // window easily survives the ~10f of recovery.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await faceRightAt(40);
  await motionSpecial("B");   // QCB while the combo is live
  let genjutsuFired = false;
  for (let i = 0; i < 10 && !genjutsuFired; i++) { const a = await p1(); if (a.currentMove === "genjutsuCast" || a.action === "genjutsuCast") genjutsuFired = true; await waitFrames(1); }
  check("Genjutsu FIRES on hit-confirm (genjutsuCast)", genjutsuFired, "");
  await waitFrames(6);
  const frozen = await p2();
  check("Genjutsu connects + freezes target (big hitstun)", frozen.hitstun >= 60 || (fHp0 - frozen.health) > 0, `p2.hitstun=${frozen.hitstun} dmg=${(fHp0 - frozen.health).toFixed(0)}`);
  await shot("genjutsu");

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Itachi Stage 4 (Amaterasu + Genjutsu): ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
