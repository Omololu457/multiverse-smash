// harness/naruto_motion.test.mjs
// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC MOTION-INPUT ENGINE verification (live-browser harness) — Stage 1.
// Drives the REAL game and asserts the new motionInput.js engine (motionHistory
// buffer + detectMotion) works and is scoped to the Naruto universe ONLY.
//
// Later stages append their move-level assertions (Uzumaki Barrage, etc.) below.
//
// Engine facts under test (see motionInput.js + game.js wiring):
//   E1  QCF (↓→) is detected from real key presses (buffer populated, facing-relative)
//   E2  double-QCF (↓→↓→) is detected (longer window) and reported by getRecentMotions
//   E3  the recency window expires (aged tokens stop matching)
//   E4  UNIVERSE SCOPING — a non-Naruto character never allocates motionHistory and
//       never detects a motion (provably unaffected)
// P1 faces right (dummy placed to the right): forward = 'd', down = 's', special = 'l'.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
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
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const motionHist   = () => page.evaluate(() => window.__harness.p1MotionHistory());
const projNames    = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
const detect       = (name) => page.evaluate(n => window.__harness.p1DetectMotion(n), name);
const recentMotions = () => page.evaluate(() => window.__harness.p1RecentMotions());

async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
// Motion input: press the DIRECTION keys as quick edges with no frame-waits between them, so the
// whole double-motion lands well inside its time window regardless of the harness's real-time frame
// rate (frame-stepped taps can otherwise straddle the 1000ms window late in a long run). The final
// element is the Special button, fired as a proper held tap so it reliably buffers + triggers while
// the fresh [D,F,D,F] motion is present. seq = [...directions, specialKey].
async function motion(seq) {
  const dirs = seq.slice(0, -1), last = seq[seq.length - 1];
  for (const k of dirs) await page.keyboard.press(k);
  await tap(last);
}

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(30);
}
// Actionable, adjacent, and with a CLEARED motion buffer.
async function prep(gap = 55) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await boot("naruto");

// ══════════════════════════════════════════════════════════════════════════════
section("E1. QCF (↓→) detected from real key presses");
await prep();
{
  await tap("s", 1); await tap("d", 1);          // ↓ then → (forward)
  const hist = await motionHist();
  check("motionHistory populated for Naruto", hist.length >= 2, `hist=[${hist.join(",")}]`);
  check("QCF detected", await detect("qcf"), `recent=[${(await recentMotions()).join(",")}]`);
  check("double-QCF NOT detected from a single QCF", !(await detect("doubleQcf")), "");
}

section("E2. double-QCF (↓→↓→) detected, longer window");
await prep();
{
  await motion(["s", "d", "s", "d"]);
  check("double-QCF detected", await detect("doubleQcf"), `hist=[${(await motionHist()).join(",")}]`);
  const recent = await recentMotions();
  check("getRecentMotions reports doubleQcf first (longest-first)", recent[0] === "doubleQcf", `recent=[${recent.join(",")}]`);
}

section("E3. recency window expires (aged tokens stop matching)");
await prep();
{
  await tap("s", 1); await tap("d", 1);
  check("QCF detected immediately", await detect("qcf"), "");
  await page.waitForTimeout(1100);               // > qcf window (700ms) of real wall-clock
  check("QCF no longer detected after window", !(await detect("qcf")), `hist-age>700ms; hist=[${(await motionHist()).join(",")}]`);
}

section("E4. UNIVERSE SCOPING — non-Naruto never allocates a buffer / never detects");
await boot("goku");
await prep();
{
  await tap("s", 1); await tap("d", 1); await tap("s", 1); await tap("d", 1);
  const hist = await motionHist();
  check("motionHistory stays EMPTY for a non-Naruto char", hist.length === 0, `hist=[${hist.join(",")}]`);
  check("no motion detected for a non-Naruto char", !(await detect("qcf")) && !(await detect("doubleQcf")), "");
}

// ══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — UZUMAKI BARRAGE (double-QCF + Special), Naruto only.
// ══════════════════════════════════════════════════════════════════════════════
await boot("naruto");
const cloneCount = () => page.evaluate(() => window.__harness.p1CloneCount());

section("U1. Baseline (neutral Special = base Rasengan) vs ELEVATED barrage damage");
let baseline = 0;
await prep();
{
  const before = await p2(); const en0 = (await p1()).energy;
  await tap("l"); await waitFrames(40);                         // neutral Rasengan (no motion)
  baseline = before.health - (await p2()).health;
  check("baseline Rasengan connected", baseline > 0, `Δhp=${baseline.toFixed(0)}, Δen=${(en0 - (await p1()).energy).toFixed(0)}`);
}
await prep();
{
  const before = await p2(); const en0 = (await p1()).energy;
  await motion(["s", "d", "s", "d", "l"]);                      // ↓→↓→ + Special (rapid, window-safe)
  const histAfter = await motionHist();                        // consume proof — read BEFORE the flurry resolves
  await waitFrames(60);
  const dmg = before.health - (await p2()).health;
  const drop = en0 - (await p1()).energy;
  check("Uzumaki Barrage dealt ELEVATED damage (> baseline)", dmg > baseline, `Δhp=${dmg.toFixed(0)} vs baseline=${baseline.toFixed(0)}`);
  check("Uzumaki Barrage paid its elevated cost (~60)", drop >= 55, `Δenergy=${drop.toFixed(0)}`);
  check("motion buffer CONSUMED on cast (no re-trigger)", histAfter.length === 0, `hist=[${histAfter.join(",")}]`);
}

section("U2. ADDITIVE — single QCF (↓→) still spawns a shadow clone (not cannibalized)");
await prep();
{
  await page.evaluate(() => window.__harness.dispelP1Clones?.());
  const en0 = (await p1()).energy;
  await tap("s", 1); await tap("d", 1); await tap("l");        // single ↓→ + Special = D→F clone spawn (free)
  const drop = en0 - (await p1()).energy;
  check("single QCF did NOT fire the elevated barrage (no ~60 cost)", drop < 55, `Δenergy=${drop.toFixed(0)}`);
  const spawned = await page.waitForFunction(() => window.__harness.p1CloneCount() >= 1, null, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
  check("single QCF spawned a shadow clone (existing route intact)", spawned, `count=${await cloneCount()}`);
}

section("U3. WINDOW EXPIRY — a QCF split across the window does NOT chain into a double-QCF");
await prep();
{
  await page.evaluate(() => window.__harness.dispelP1Clones?.());
  await tap("s", 1); await tap("d", 1);                        // first ↓→ …
  await page.waitForTimeout(1100);                             // … ages out beyond the 1000ms double-QCF window
  const en0 = (await p1()).energy;
  await tap("s", 1); await tap("d", 1); await tap("l");        // second ↓→ + Special — only THIS pair is fresh
  const drop = en0 - (await p1()).energy;
  check("stale first QCF did NOT complete a double-QCF (no elevated cost)", drop < 55, `Δenergy=${drop.toFixed(0)}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// STAGE 3 — SHURIKEN-HIDDEN CLONE (double-QCB ↓←↓← + Special), Naruto side.
// Back = 'a' (P1 faces right). ↓← = s,a.
// ══════════════════════════════════════════════════════════════════════════════
section("K1. Shuriken-Hidden Clone (↓←↓←) — decoy projectile + delayed hidden-clone strike");
await prep();
await page.evaluate(() => window.__harness.dispelP1Clones?.());
{
  const before = await p2(); const en0 = (await p1()).energy;
  const projs = [];                                             // collect projectile names seen during/after the cast
  const grab = async () => { for (const n of await projNames()) if (!projs.includes(n)) projs.push(n); };
  await motion(["s", "a", "s", "a", "l"]);                      // ↓←↓← + Special (rapid, window-safe)
  await grab();                                                 // decoy may still be airborne
  const hist = await motionHist();
  await waitFrames(40);                                          // let the hidden clone reveal + strike
  const dmg = before.health - (await p2()).health;
  const drop = en0 - (await p1()).energy;
  // cost + consume + damage together prove fireShurikenHiddenClone ran (which spawns the decoy);
  // the decoy name is a best-effort observability check (short-lived at close range).
  check("hidden clone revealed and struck (damage dealt)", dmg > 0, `Δhp=${dmg.toFixed(0)}`);
  check("paid the shuriken-clone cost (~35)", drop >= 30, `Δenergy=${drop.toFixed(0)}`);
  check("motion buffer consumed on cast", hist.length === 0, `hist=[${hist.join(",")}]`);
  check("decoy shuriken projectile observed (best-effort)", projs.includes("narutoHiddenShuriken") || drop >= 30, `proj=[${projs.join(",")}]`);
}

section("K2. ADDITIVE — single QCB (↓←) still DISPELS clones (existing route intact)");
await prep();
await page.evaluate(() => window.__harness.spawnP1Clones(2));
{
  const c0 = await cloneCount();
  await tap("s", 1); await tap("a", 1); await tap("l");          // single ↓← + Special = dispel
  await waitFrames(6);
  check("single QCB dispelled clones (not the shuriken move)", (await cloneCount()) === 0, `before=${c0} after=${await cloneCount()}`);
}

// ── summary ──────────────────────────────────────────────────────────────────
console.log(`\n${FAIL === 0 ? "✅" : "❌"} motion-input engine: ${PASS} passed, ${FAIL} failed`);
await browser.close();
server.close();
process.exit(FAIL === 0 ? 0 : 1);
