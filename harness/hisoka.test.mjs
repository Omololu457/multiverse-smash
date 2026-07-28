// harness/hisoka.test.mjs
// CANONICAL full-kit regression for Hisoka Morrow (Hunter x Hunter). Covers registration/stats/portrait,
// movement/state, all 5 normals, the Card Flourish command chain, Bungee Gum (+reach), both Texture
// Surprise card variants, the full Bloodlust Overdrive ultimate (activation cinematic → body-swap → form
// attack → drain → revert), and a fallback-box sweep across every exercised action.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
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
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const cards = async () => (await projs()).filter(p => (p.name || "").includes("hisoka_card"));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function prep(gap, refillEnergy = true) {
  await waitReady();
  await page.evaluate(re => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); if (re) window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); }, refillEnergy);
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function dmgFrom(pressFn) { const hp0 = (await p2()).health; await pressFn(); await waitFrames(22); return hp0 - (await p2()).health; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=hisoka`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── registration + stats ──
  section("registration + stats");
  const g = await record();
  check("P1 is Hisoka", g.key === "hisoka", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet = hisoka_idle_uniform", (g.spriteSheet || "").includes("hisoka_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.001, `spriteScale=${g.spriteScale}`);
  check("technician HP 1080", g.maxHealth === 1080, `HP=${g.maxHealth}`);
  check("Nen pool 170", g.maxEnergy === 170, `EN=${g.maxEnergy}`);
  const portraitOk = await page.evaluate(async () => { try { const r = await fetch("./hisoka_portrait.png"); return r.ok; } catch { return false; } });
  check("portrait file present", portraitOk, "");

  // ── movement / state ──
  section("movement + state");
  await page.keyboard.down("d"); await waitFrames(14); const rn = await record(); await page.keyboard.up("d"); await waitFrames(4);
  check("run uses hisoka_run_uniform", (rn.spriteSheet || "").includes("hisoka_run_uniform"), `action=${rn.action}`);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); const jp = await record(); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__harness.p1().vy > 6, null, { timeout: 4000, polling: 16 }).catch(() => {}); const fl = await record();
  check("jump/fall use hisoka_jump_uniform", (jp.spriteSheet || "").includes("hisoka_jump_uniform") && (fl.spriteSheet || "").includes("hisoka_jump_uniform"), `jump=${jp.action} fall=${fl.action}`);
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(14); const bk = await record(); await page.keyboard.up("s"); await waitFrames(4);
  check("guard resolves to guard sheet", bk.action === "guard" && (bk.spriteSheet || "").includes("hisoka_guard_uniform"), `action=${bk.action}`);
  await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); const h = await record();
  check("hurt resolves to hit sheet", h.action === "hurt" && (h.spriteSheet || "").includes("hisoka_hit_uniform"), `action=${h.action}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);
  // DEDICATED charge aura (hold P) — must resolve to the dedicated charge sheet, NOT idle+generic aura.
  await waitReady();
  await page.keyboard.down("p"); await waitFrames(10); const ch = await record(); await page.keyboard.up("p"); await waitFrames(4);
  check("hold-charge resolves to hisoka_charge sheet (not idle)", ch.action === "charge" && (ch.spriteSheet || "").includes("hisoka_charge_uniform"), `action=${ch.action} sheet=${ch.spriteSheet}`);

  // ── 5 normals ──
  section("5 normals connect");
  for (const [name, key, gap] of [["light", "j", 52], ["heavy", "k", 58], ["up", "i", 50]]) {
    await prep(gap); const d = await dmgFrom(async () => { await page.keyboard.down(key); await waitFrames(4); await record(); await page.keyboard.up(key); });
    check(`${name} connects`, d > 0, `−${d.toFixed(0)}`);
  }
  await prep(44); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(46)); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); }); check("air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded(); await prep(30); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(52)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await page.keyboard.up("s"); }); check("down_air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded();

  // ── Card Flourish chain (Down+Heavy rekka) ──
  section("Card Flourish command chain (Down+Heavy → rekka1 → rekka2)");
  await prep(40);
  const hp0c = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  const moves = new Set(); let retapped = false;
  for (let i = 0; i < 70; i++) {
    const p = await record(); if (p.currentMove) moves.add(p.currentMove);
    if (!retapped && p.attacking && p.currentMove === "hisokaRekka1" && p.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); retapped = true; continue; }
    if (!p.attacking && i > 4) break; await waitFrames(1);
  }
  check("chains rekka1 → rekka2", moves.has("hisokaRekka1") && moves.has("hisokaRekka2"), `moves=${[...moves].join(",")}`);
  await waitFrames(4);
  check("full chain deals damage", (hp0c - (await p2()).health) > 40, `−${(hp0c - (await p2()).health).toFixed(0)}`);
  await waitFrames(16);

  // ── Bungee Gum (neutral Special) + reach ──
  section("Bungee Gum — extended-reach whip (neutral Special)");
  await prep(90);
  const bd = await dmgFrom(async () => { await page.keyboard.down("l"); await waitFrames(4); const r = await record(); check("whip plays hisoka_bungee_uniform", (r.spriteSheet || "").includes("hisoka_bungee_uniform"), `sheet=${r.spriteSheet}`); await page.keyboard.up("l"); });
  check("Bungee Gum connects", bd > 0, `−${bd.toFixed(0)}`);
  await prep(150); const ld = await dmgFrom(async () => { await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); });
  await prep(150); const bd2 = await dmgFrom(async () => { await page.keyboard.down("l"); await waitFrames(4); await record(); await page.keyboard.up("l"); });
  check("out-reaches a normal (light whiffs @150, Bungee connects)", ld === 0 && bd2 > 0, `light −${ld.toFixed(0)} vs bungee −${bd2.toFixed(0)}`);

  // ── Texture Surprise cards ──
  section("Texture Surprise — single (Down+Special) + rapid (Fwd+Special)");
  await prep(200);
  const sd = await dmgFrom(async () => { await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(3); const r = await record(); check("single plays hisoka_card_single", (r.spriteSheet || "").includes("hisoka_card_single"), `sheet=${r.spriteSheet}`); await page.keyboard.up("l"); await page.keyboard.up("s"); });
  check("single card connects", sd > 0, `−${sd.toFixed(0)}`);
  // rapid: count the fan against a far invulnerable target
  await prep(520); await page.evaluate(() => window.__harness.setP2Invuln?.(240));
  await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(3);
  const r = await record(); check("rapid plays hisoka_card_rapid", (r.spriteSheet || "").includes("hisoka_card_rapid"), `sheet=${r.spriteSheet}`);
  await page.keyboard.up("l"); await page.keyboard.up("d");
  let peak = 0; for (let i = 0; i < 22; i++) { peak = Math.max(peak, (await cards()).length); await waitFrames(1); }
  check("rapid spawns a multi-card spread (≥3)", peak >= 3, `peak=${peak}`);
  await prep(200); const rd = await dmgFrom(async () => { await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("d"); await waitFrames(10); });
  check("rapid spread connects", rd > 0, `−${rd.toFixed(0)}`);

  // ── Bloodlust Overdrive ultimate ──
  section("Bloodlust Overdrive — alternate-form ultimate");
  await prep(60);
  await waitReady(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); }); await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const on = await record();
  check("Overdrive activates", on.overdriveActive === true, `overdriveActive=${on.overdriveActive}`);
  check("buffs applied (×1.3 dmg, ×1.25 atkSpd)", Math.abs((on.damageMultiplier || 1) - 1.3) < 0.001 && Math.abs((on.attackSpeedMultiplier || 1) - 1.25) < 0.001, `dmg=${on.damageMultiplier} atk=${on.attackSpeedMultiplier}`);
  check("activation cinematic plays", (await page.evaluate(() => window.__harness.overdriveCine().active)) === true, "");
  check("holds transform pose", (await p1()).action === "transform", `action=${(await p1()).action}`);
  await page.waitForFunction(() => !window.__harness.overdriveCine().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(6);
  const fi = await record();
  check("body-swaps to golden power-up idle", (fi.spriteSheet || "").includes("hisoka_powerup_idle"), `sheet=${fi.spriteSheet}`);
  // form attack connects
  await page.evaluate(() => window.__harness.fillEnergy?.()); await prep(60); await page.evaluate(() => window.__harness.fillEnergy?.());
  const ud = await dmgFrom(async () => { await page.keyboard.down("i"); await waitFrames(3); const r2 = await record(); check("form up-attack plays hisoka_powerup_up", (r2.spriteSheet || "").includes("hisoka_powerup_up"), `sheet=${r2.spriteSheet}`); await page.keyboard.up("i"); });
  check("form attack connects", ud > 0, `−${ud.toFixed(0)}`);
  // drain + revert
  const enB = (await p1()).energy; await waitFrames(30); check("drains Nen while active", (await p1()).energy < enB, `${enB.toFixed(0)}→${(await p1()).energy.toFixed(0)}`);
  await page.evaluate(() => window.__harness.setP1Energy(0.03)); await waitFrames(3);
  const off = await record();
  check("auto-reverts at empty meter", off.overdriveActive === false && Math.abs((off.damageMultiplier || 1) - 1) < 0.001, `overdrive=${off.overdriveActive} dmg=${off.damageMultiplier}`);
  check("body-swap reverts to base idle", (off.spriteSheet || "").includes("hisoka_idle"), `sheet=${off.spriteSheet}`);

  // ── fallback-box sweep ──
  section("fallback-box sweep — every exercised action resolves to a hisoka sheet");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("hisoka"));
  check(`all ${seenActions.size} exercised actions use a hisoka sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("FATAL", e); FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  HISOKA full kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
