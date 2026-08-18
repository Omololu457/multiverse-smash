// harness/jason.test.mjs — CANONICAL Jason Voorhees suite (mirrors ghostface.test.mjs / batman.test.mjs).
// Single-entry registration + integrity + full-kit gate: sprite gate / stats / portrait, movement/state
// (idle/walk/jump/hurt/knockdown), all 5 normals + both crouch swaps CONNECTING, the lone Relentless
// Slash special firing, and a fallback-state sweep (block/dash/grab/win/death all render a real sheet).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }
async function prep(gap) {
  await ready();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await wf(2);
}
// Fire a normal and return { dmg, sheet } — optionally holding Down first for a crouch swap.
async function normal(key, gap, { crouch = false, lift = 0 } = {}) {
  await prep(gap);
  if (lift) await page.evaluate(dy => window.__harness.liftP1(dy), lift);
  if (crouch) { await page.keyboard.down("s"); await wf(2); }
  const hp0 = (await p2()).health;
  let sheet = null;
  await page.keyboard.down(key);
  for (let i = 0; i < 6; i++) { const a = await p1(); if (a.attacking && a.spriteSheet) sheet = a.spriteSheet; await wf(1); }
  await page.keyboard.up(key);
  if (crouch) await page.keyboard.up("s");
  await wf(20);
  return { dmg: hp0 - (await p2()).health, sheet };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=jason`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  // ── REGISTRATION / GATE / STATS / PORTRAIT ──
  section("registration + sprite gate + stats");
  const g = await p1();
  check("P1 is Jason", g.key === "jason", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = jason_idle_uniform", (g.spriteSheet || "").includes("jason_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.15", Math.abs((g.spriteScale || 0) - 1.15) < 0.01, `${g.spriteScale}`);
  check("HP 1250 / EN 80 (slow-tank slasher)", g.maxHealth === 1250 && g.maxEnergy === 80, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("jason"));
  check("portrait wired to ./jason_portrait.png", (portrait || "").includes("jason_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.(window.__harness.p1()) ?? null);
  check("energy label = Bloodlust", energyLabel === "Bloodlust", `label=${energyLabel}`);

  // ── MOVEMENT / STATE ──
  section("movement / state");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = jason_walk_uniform", (rn.spriteSheet || "").includes("jason_walk_uniform"), `sheet=${rn.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w"); await wf(6); const jp = await p1();
  check("jump = jason_jump_uniform", (jp.spriteSheet || "").includes("jason_jump_uniform"), `sheet=${jp.spriteSheet}`);
  await waitGrounded();
  await force("hurt"); await wf(3); const h = await p1();
  check("hurt = jason_hit_uniform frames 0-3 (sourceX 0)", (h.spriteSheet || "").includes("jason_hit_uniform") && h.spriteSourceX === 0, `sheet=${h.spriteSheet} sx=${h.spriteSourceX}`);
  await force("knockdown"); await wf(3); const k = await p1();
  check("knockdown = jason_hit_uniform frames 4-5 (sourceX 492)", (k.spriteSheet || "").includes("jason_hit_uniform") && k.spriteSourceX === 492, `sheet=${k.spriteSheet} sx=${k.spriteSourceX}`);
  await force(null); await wf(2);

  // ── 5 NORMALS CONNECT + CORRECT SHEET ──
  section("normals connect + correct sheet");
  const L = await normal("j", 70);       check("light connects + jason_light_uniform", L.dmg >= 18 && (L.sheet || "").includes("jason_light_uniform"), `dmg=${L.dmg.toFixed(0)} sheet=${L.sheet}`);
  const H = await normal("k", 90);       check("heavy connects + jason_heavy_uniform", H.dmg >= 40 && (H.sheet || "").includes("jason_heavy_uniform"), `dmg=${H.dmg.toFixed(0)} sheet=${H.sheet}`);
  const U = await normal("i", 70);       check("up connects + jason_up_uniform",       U.dmg >= 28 && (U.sheet || "").includes("jason_up_uniform"),    `dmg=${U.dmg.toFixed(0)} sheet=${U.sheet}`);
  const A = await normal("j", 48, { lift: 40 }); check("air connects + jason_air_uniform",       A.dmg >= 20 && (A.sheet || "").includes("jason_air_uniform"),   `dmg=${A.dmg.toFixed(0)} sheet=${A.sheet}`);
  // down_air (lift above, hold Down+Light)
  await prep(34); await page.evaluate(() => window.__harness.liftP1(54));
  const dHp = (await p2()).health; let daSheet = null;
  await page.keyboard.down("s"); await page.keyboard.down("j");
  for (let i = 0; i < 6; i++) { const a = await p1(); if (a.attacking && a.spriteSheet) daSheet = a.spriteSheet; await wf(1); }
  await page.keyboard.up("j"); await page.keyboard.up("s"); await wf(16);
  check("down_air connects + jason_down_air_uniform", dHp - (await p2()).health >= 25 && (daSheet || "").includes("jason_down_air_uniform"), `dmg=${(dHp - (await p2()).health).toFixed(0)} sheet=${daSheet}`);

  // ── CROUCH SWAPS ──
  section("crouch-context swaps");
  const CL = await normal("j", 70, { crouch: true }); check("crouch light → jason_crouch_light_uniform", CL.dmg >= 18 && (CL.sheet || "").includes("jason_crouch_light_uniform"), `dmg=${CL.dmg.toFixed(0)} sheet=${CL.sheet}`);
  const CH = await normal("k", 90, { crouch: true }); check("crouch heavy → jason_crouch_heavy_uniform", CH.dmg >= 40 && (CH.sheet || "").includes("jason_crouch_heavy_uniform"), `dmg=${CH.dmg.toFixed(0)} sheet=${CH.sheet}`);
  const CU = await normal("i", 70, { crouch: true }); check("crouch up falls back to standing jason_up_uniform", (CU.sheet || "").includes("jason_up_uniform"), `sheet=${CU.sheet}`);
  const SL = await normal("j", 70);                   check("standing light after crouch → jason_light_uniform (no lingering crouch)", (SL.sheet || "").includes("jason_light_uniform"), `sheet=${SL.sheet}`);

  // ── SPECIAL: Relentless Slash ──
  section("special — Relentless Slash");
  await prep(120);
  const en0 = (await p1()).energy, shp0 = (await p2()).health; let spSheet = null, spMove = null;
  await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");
  for (let i = 0; i < 16; i++) { const a = await p1(); if (a.currentMove === "jRelentless" || a.spriteAction === "jRelentless") { spSheet = a.spriteSheet; spMove = a.currentMove || a.spriteAction; } await wf(1); }
  await wf(18);
  const spDmg = shp0 - (await p2()).health, spSpent = en0 - (await p1()).energy;
  check("special renders jRelentless (heavy art)", spMove === "jRelentless" && (spSheet || "").includes("jason_heavy_uniform"), `move=${spMove} sheet=${spSheet}`);
  check("special connects for a big hit (dmg ≥ 70)", spDmg >= 70, `dmg=${spDmg.toFixed(0)}`);
  check("special out-damages the heavy", spDmg > H.dmg + 10, `special=${spDmg.toFixed(0)} heavy=${H.dmg.toFixed(0)}`);
  check("special spends ~35 Bloodlust", spSpent >= 30 && spSpent <= 45, `spent=${spSpent.toFixed(0)}`);
  // energy gate
  await prep(90); await page.evaluate(() => window.__harness.setEnergy?.(0)); await wf(2);
  const g0 = (await p2()).health;
  await page.keyboard.down("l"); await wf(6); await page.keyboard.up("l"); await wf(8);
  check("special is energy-gated (0 Bloodlust → no fire)", g0 - (await p2()).health === 0 && (await p1()).currentMove !== "jRelentless", "");

  // ── FALLBACK-STATE SWEEP (real code paths; none may render null/box) ──
  section("fallback states render a real sheet");
  await prep(200);
  await page.keyboard.down(";"); await wf(6); const bl = await p1(); await page.keyboard.up(";"); await wf(3);
  check("block (no guard art) → idle fallback (real sheet)", (bl.spriteSheet || "").includes("jason_") && bl.spriteSheet != null, `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);
  await force("dash"); await wf(3); const ds = await p1(); await force(null);
  check("dash → jason_walk_uniform (real sheet)", (ds.spriteSheet || "").includes("jason_walk_uniform"), `sheet=${ds.spriteSheet}`);
  await force("grab"); await wf(3); const gb = await p1(); await force(null);
  check("grab → jason_light_uniform (real pose)", (gb.spriteSheet || "").includes("jason_light_uniform"), `sheet=${gb.spriteSheet}`);
  await page.evaluate(() => window.__harness.forceMatchWin("p1")); await wf(8); const wn = await p1();
  check("win (no win art) → real sheet, not null/box", typeof wn.spriteSheet === "string" && wn.spriteSheet.includes("jason_"), `sheet=${wn.spriteSheet}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("SUITE ERROR", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  JASON canonical: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
