// harness/itachi_susanoo.mjs
// STAGE 5 evidence: single-tier creature-only Susanoo ULTIMATE. Verifies the energy gate,
// the sustained giant state (generic _canvasHeightFrac giant scale + _susanooActive half-arena
// lock + _skinAnim body-swap), a canvas-relative giant hurtbox, the SPECIAL sword slash, and
// the timer auto-revert (armed 20s cooldown). Screenshots → harness/shots/itachi_susanoo_*.png.
// Run: node harness/itachi_susanoo.mjs
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
async function waitFrames(n) { const s = await stateFrame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `itachi_susanoo_${tag}.png`) }); }
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles(); window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=itachi`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── ENERGY GATE ──────────────────────────────────────────────────────
  section("ultimate gates on energy");
  await settle();
  await page.evaluate(() => { window.__harness.setEnergy(10); window.__harness.resetUlt?.(); window.__harness.setEnergy(10); });
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
  check("Susanoo does NOT fire under-energy", (await p1()).itachiSusanoo === false, `active=${(await p1()).itachiSusanoo}`);

  // ── ACTIVATION ───────────────────────────────────────────────────────
  section("Ultimate summons the Susanoo giant");
  // Flush any buffered `u` from the gate section (it can fire the ult during settle → contaminating
  // the energy-spend measurement). Force base + clear cooldown, THEN capture a clean baseline.
  await page.evaluate(() => window.__harness.expireItachiSusanoo());
  await waitFrames(3);
  await settle();
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.fillEnergy(); });
  await waitFrames(4);   // let any stale buffered ult resolve before we baseline
  await page.evaluate(() => window.__harness.expireItachiSusanoo());   // if it did fire, drop it
  await waitFrames(3);
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.fillEnergy(); });
  await waitFrames(2);
  const e0 = (await p1()).energy;
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(6);
  const on = await p1();
  check("Susanoo active", on.itachiSusanoo === true, `active=${on.itachiSusanoo}`);
  check("spent ~50% energy", (e0 - on.energy) >= (on.maxEnergy * 0.4), `spent=${(e0 - on.energy).toFixed(0)} of ${on.maxEnergy}`);
  check("giant scale engaged (canvasHeightFrac)", (on.canvasHeightFrac || 0) > 0.5, `frac=${on.canvasHeightFrac}`);
  check("body-swapped to creature skinAnim", on.hasSkinAnim === true, "");
  check("damage buff applied (1.6)", Math.abs(on.damageMultiplier - 1.6) < 0.001, `mult=${on.damageMultiplier}`);
  await waitFrames(4);
  const giant = await p1();
  check("giant renders creature idle sheet", (giant.spriteSheet || "").includes("itachi_susano_creature_idle"), `sheet=${giant.spriteSheet}`);
  check("giant hurtbox scales to drawn body (lastDrawY set)", giant.lastDrawY != null, `lastDrawY=${giant.lastDrawY}`);
  await shot("giant");

  // ── HALF-ARENA MOVEMENT LOCK ─────────────────────────────────────────
  section("half-arena movement lock");
  await page.keyboard.down("d"); await waitFrames(20); await page.keyboard.up("d"); await waitFrames(2);
  check("arena half latched (movement confined)", (await p1()).arenaHalfLock != null, `half=${(await p1()).arenaHalfLock}`);

  // ── SWORD SLASH (SPECIAL while giant) ────────────────────────────────
  section("SPECIAL swings the giant sword");
  await page.evaluate(() => { window.__harness.healP2(); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 120); });
  await waitFrames(2);
  const hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); const sw = await p1(); await page.keyboard.up("l");
  let sawSwordFx = false;
  for (let i = 0; i < 8 && !sawSwordFx; i++) { const pj = await projs(); sawSwordFx = pj.some(p => (p.sheet || "").includes("sword_effect")); await waitFrames(1); }
  check("sword move = susanooSword (creature_sword body)", sw.currentMove === "susanooSword", `move=${sw.currentMove}`);
  check("sword-effect FX spawns", sawSwordFx, "");
  await waitFrames(12);
  check("giant sword connects big", hp0 - (await p2()).health >= 120, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
  await shot("sword");

  // ── TIMER AUTO-REVERT ────────────────────────────────────────────────
  section("timer auto-revert → back to base + cooldown armed");
  await page.evaluate(() => window.__harness.expireItachiSusanoo());
  await waitFrames(4);
  const off = await p1();
  check("reverts to base when timer runs out", off.itachiSusanoo === false, `active=${off.itachiSusanoo}`);
  check("giant scale released", !off.canvasHeightFrac, `frac=${off.canvasHeightFrac}`);
  check("skinAnim cleared", off.hasSkinAnim === false, "");
  check("half-arena lock released", off.arenaHalfLock == null, `half=${off.arenaHalfLock}`);
  check("ultimate cooldown armed after revert", off.ultCooldown > 0, `cd=${off.ultCooldown}`);
  check("back to normal sprite (creature sheet gone)", !(off.spriteSheet || "").includes("creature"), `sheet=${off.spriteSheet}`);

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Itachi Susanoo (Stage 5): ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
