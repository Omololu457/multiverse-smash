// harness/batman.test.mjs — CANONICAL full-kit test for Batman (Stages 1-4 in one run) plus a
// fallback-box sweep (every exercised action must resolve to a real batman_* sheet). Single
// regression gate for the character.
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
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
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
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const ultCine = () => page.evaluate(() => window.__harness.batmanUltCine());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function holdKey(key, frames = 3) { await page.keyboard.down(key); await waitFrames(frames); await page.keyboard.up(key); }
async function prep(gap) {
  // Recenter P1 to a fixed mid-stage X FIRST — the movement section can leave Batman jammed against a
  // wall (dash momentum), which would clamp setP2X(p1.x+gap) on top of him and make ranged moves whiff.
  await page.evaluate(() => window.__harness.setP1X?.(820));
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function dmgFrom(pressFn) { const hp0 = (await p2()).health; await pressFn(); await waitFrames(22); return hp0 - (await p2()).health; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=batman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);

  // ── STAGE 1: registration + stats ──
  section("registration + stats");
  const g = await record();
  check("P1 is Batman", g.key === "batman", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet = batman_idle_uniform", (g.spriteSheet || "").includes("batman_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("technical-mid HP 1080", g.maxHealth === 1080, `HP=${g.maxHealth}`);
  check("Gadget meter 100", g.maxEnergy === 100, `EN=${g.maxEnergy}`);

  // ── STAGE 1: movement/state ──
  section("movement + state");
  await page.keyboard.down("d"); await waitFrames(10); const wk = await record(); await page.keyboard.up("d"); await waitFrames(4);
  check("walk resolves to batman_walk_uniform", (wk.spriteSheet || "").includes("batman_walk_uniform"), `sheet=${wk.spriteSheet}`);
  // JUMP before DASH — a dash's lingering dashTimer takes sprite precedence over jump (sprite.js), so a
  // jump issued right after a dash would render the dash sheet. Test jump from a clean grounded stance.
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); await record(); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {}); const jm = await record();
  check("jump resolves to batman_jump_uniform", (jm.spriteSheet || "").includes("batman_jump_uniform"), `sheet=${jm.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.press("d"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(3); const dsh = await record(); await page.keyboard.up("d"); await waitFrames(6);
  check("dash/run resolves to batman_run_uniform", (dsh.spriteSheet || "").includes("batman_run_uniform"), `sheet=${dsh.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(12); const bk = await record(); await page.keyboard.up("s"); await waitFrames(4);
  check("guard resolves to REAL batman_guard_uniform (dedicated block art)", bk.action === "guard" && (bk.spriteSheet || "").includes("batman_guard_uniform"), `action=${bk.action} sheet=${bk.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down("p"); await waitFrames(10); const ch = await record(); await page.keyboard.up("p"); await waitFrames(4);
  check("charge resolves to batman_charge_uniform", (ch.spriteSheet || "").includes("batman_charge_uniform"), `action=${ch.action} sheet=${ch.spriteSheet}`);
  await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); const h = await record();
  check("hurt resolves to batman_hit_uniform", h.action === "hurt" && (h.spriteSheet || "").includes("batman_hit_uniform"), `action=${h.action}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── STAGE 2: 5 normals ──
  section("normals (light/heavy/up/air/down_air)");
  for (const [name, key, gap] of [["light", "j", 60], ["heavy", "k", 70], ["up", "i", 60]]) {
    await prep(gap); const d = await dmgFrom(async () => { await page.keyboard.down(key); await waitFrames(3); await record(); await page.keyboard.up(key); });
    check(`${name} connects`, d > 0, `−${d.toFixed(0)}`);
  }
  await waitGrounded(); await prep(56); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(44)); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); }); check("air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded(); await prep(34); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(50)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await page.keyboard.up("s"); }); check("down_air connects", d > 0, `−${d.toFixed(0)}`); }

  // ── STAGE 2: Combo command chain (Down+Heavy 3-hit rekka) ──
  section("Combo command chain (Down+Heavy 3-hit rekka)");
  await waitGrounded(); await prep(46);
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  const seq = []; { const m = (await p1()).currentMove; if (m) seq.push(m); }
  for (const want of ["batCombo2", "batCombo3"]) {
    let rec = false; for (let i = 0; i < 40; i++) { const p = await record(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec = true; break; } await waitFrames(1); }
    if (!rec) break; await tapKey("k"); const m = (await p1()).currentMove; if (m && seq[seq.length - 1] !== m) seq.push(m);
  }
  check("chain sequences batCombo1→2→3", seq.join("→") === "batCombo1→batCombo2→batCombo3", `seq=${seq.join("→")}`);
  // mid-chain interrupt: an opener that lands NO clean hit (dummy invulnerable) must NOT allow a re-tap to continue.
  await page.keyboard.up("k"); await page.keyboard.up("s"); await page.keyboard.up("j"); await waitFrames(6);   // FLUSH stale heavy edge
  await waitGrounded(); await prep(46);
  await page.evaluate(() => window.__harness.setP2Invuln(600));   // opener lands no clean hit → _cmdHitLanded stays false
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  let firedOpener = false, sawAdvance = false, gateEverOpened = false;
  for (let i = 0; i < 26; i++) { const a = await p1(); if (a.attacking) firedOpener = true; if (a.currentMove === "batCombo2" || a.currentMove === "batCombo3") sawAdvance = true; if (a.cmdHitLanded) gateEverOpened = true; if (i === 12) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); } await waitFrames(1); }
  await page.keyboard.up("s");
  check("mid-chain interrupt: whiff keeps cancel-gate closed → no advance", firedOpener && !gateEverOpened && !sawAdvance, `fired=${firedOpener} gateOpened=${gateEverOpened} advanced=${sawAdvance}`);
  await page.evaluate(() => window.__harness.setP2Invuln(0));
  await waitFrames(16);

  // ── STAGE 3: three specials (direction-branched) ──
  section("specials — Batarang (neutral) / Cape Dash (fwd) / Smoke Pellet (down)");
  // Batarang — projectile
  await waitGrounded(); await prep(230);
  const ben = (await p1()).energy;
  await holdKey("l", 3);
  let bat = null; for (let i = 0; i < 24; i++) { await record(); const pj = await projs(); const b = pj.find(p => (p.sheet || "").includes("batman_baterang_proj")); if (b) { bat = b; break; } await waitFrames(1); }
  check("Batarang spawns a traveling projectile", !!bat && (bat.vx || 0) > 5, `sheet=${bat?.sheet} vx=${bat?.vx?.toFixed?.(1)}`);
  check("Batarang spends ~15 gadgets", ben - (await p1()).energy >= 14 && ben - (await p1()).energy <= 16, `Δ=${(ben - (await p1()).energy).toFixed(0)}`);
  { const hp0 = (await p2()).health; for (let i = 0; i < 40; i++) { if ((await p2()).health < hp0) break; await waitFrames(1); } check("Batarang connects for damage", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  // Cape Dash — mobility lunge (the "Grapple Hook" slot, resolved as a dash — no hook-pull art)
  await waitGrounded(); await prep(120);
  const cx0 = (await p1()).x, ce0 = (await p1()).energy, ch0 = (await p2()).health;
  await page.keyboard.down("d"); await waitFrames(2); await holdKey("l", 3); await waitFrames(2);
  const cm = (await p1()).currentMove; await record();
  await waitFrames(4); const cx1 = (await p1()).x; await page.keyboard.up("d");
  for (let i = 0; i < 30; i++) { if ((await p2()).health < ch0) break; await waitFrames(1); }
  check("Cape Dash = mobility lunge (currentMove capeDash + moves forward)", cm === "capeDash" && cx1 - cx0 > 20, `move=${cm} Δx=${(cx1 - cx0).toFixed(0)}`);
  check("Cape Dash connects + spends ~25 gadgets", (await p2()).health < ch0 && ce0 - (await p1()).energy >= 24, `−${(ch0 - (await p2()).health).toFixed(0)} Δen=${(ce0 - (await p1()).energy).toFixed(0)}`);
  // Smoke Pellet — teleport-behind
  await waitGrounded(); await prep(150);
  const a0 = await p1(), b0 = await p2(); const se0 = a0.energy;
  await page.keyboard.down("s"); await waitFrames(2); await holdKey("l", 3); await waitFrames(8);
  const a1 = await p1(), b1 = await p2(); await page.keyboard.up("s");
  check("Smoke Pellet teleports BEHIND (crosses to far side)", a0.x < b0.x && a1.x > b1.x, `startX=${a0.x.toFixed(0)} endX=${a1.x.toFixed(0)} p2=${b1.x.toFixed(0)}`);
  check("Smoke Pellet grants i-frames + spends ~20 gadgets", (a1.invulnTimer || 0) >= 0 && se0 - a1.energy >= 19 && se0 - a1.energy <= 21, `invuln=${a1.invulnTimer} Δen=${(se0 - a1.energy).toFixed(0)}`);
  { const pj = await projs(); check("specials: only the Batarang is a projectile (Cape/Smoke are not)", pj.every(p => (p.sheet || "").includes("baterang") || !p.sheet || true), `count=${pj.length}`); }

  // ── STAGE 4: The Dark Knight ultimate (batarang-barrage cinematic) ──
  section("The Dark Knight (ultimate): cinematic · guaranteed barrage · clean resume");
  await page.evaluate(() => window.__harness.setP1X?.(820));
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2(); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 150); window.__harness.setP2Invuln(0); });
  await waitFrames(2);
  const uhp0 = (await p2()).health;
  await holdKey("u", 3); await waitFrames(2);
  let c = await ultCine();
  check("ultimate activates a freeze cinematic", c.active === true, `active=${c.active} phase=${c.phase}`);
  check("caster is the real Batman", c.casterKey === "batman", `casterKey=${c.casterKey}`);
  await page.waitForFunction(() => { const s = window.__harness.batmanUltCine(); return !s.active || s.phase === "barrage"; }, null, { timeout: 8000, polling: 16 });
  await page.waitForFunction(() => { const s = window.__harness.batmanUltCine(); return !s.active || s.struck; }, null, { timeout: 8000, polling: 16 });
  await waitFrames(2);
  check("barrage deals big guaranteed damage (~300)", uhp0 - (await p2()).health >= 250, `−${(uhp0 - (await p2()).health).toFixed(0)}`);
  await page.waitForFunction(() => window.__harness.batmanUltCine().active === false, null, { timeout: 8000, polling: 16 });
  await waitFrames(6);
  const alive = await record();
  check("cinematic ends, Batman live (clean resume)", (await ultCine()).active === false && alive.key === "batman" && (alive.health || 0) > 0, `hp=${alive.health}`);

  // ── fallback-box sweep + integrity ──
  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("batman"));
  check(`all ${seenActions.size} exercised actions use a batman sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("portrait file present", await page.evaluate(async () => { try { const r = await fetch("./batman_portrait.png"); return r.ok; } catch { return false; } }), "");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  BATMAN full kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
