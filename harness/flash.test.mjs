// harness/flash.test.mjs — CANONICAL full-kit test for The Flash (Stages 1-4 in one run) plus a
// fallback-box sweep (every exercised action must resolve to a real flash_* sheet). This is the
// single regression gate for the character.
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
const ftCine = () => page.evaluate(() => window.__harness.flashTimeCine());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function dmgFrom(pressFn) { const hp0 = (await p2()).health; await pressFn(); await waitFrames(22); return hp0 - (await p2()).health; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=flash`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);

  // ── STAGE 1: registration + stats ──
  section("registration + stats");
  const g = await record();
  check("P1 is Flash", g.key === "flash", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet = flash_idle_uniform", (g.spriteSheet || "").includes("flash_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("glass-cannon HP 1020", g.maxHealth === 1020, `HP=${g.maxHealth}`);
  check("Speed Force pool 100", g.maxEnergy === 100, `EN=${g.maxEnergy}`);

  // ── STAGE 1: movement/state ──
  section("movement + state");
  await page.keyboard.down("d"); await waitFrames(14); const rn = await record(); await page.keyboard.up("d"); await waitFrames(4);
  check("run/walk resolves to flash_run_uniform", (rn.spriteSheet || "").includes("flash_run_uniform"), `sheet=${rn.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); await record(); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {}); const jm = await record();
  check("jump resolves to flash_jump_uniform", (jm.spriteSheet || "").includes("flash_jump_uniform"), `sheet=${jm.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(14); const bk = await record(); await page.keyboard.up("s"); await waitFrames(4);
  check("guard resolves (idle-frame fallback, flagged)", bk.action === "guard" && (bk.spriteSheet || "").includes("flash_idle_uniform"), `action=${bk.action} sheet=${bk.spriteSheet}`);
  await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); const h = await record();
  check("hurt resolves to flash_hit_uniform", h.action === "hurt" && (h.spriteSheet || "").includes("flash_hit_uniform"), `action=${h.action}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── STAGE 2: 5 normals ──
  section("normals (light/heavy/up/air/down_air)");
  for (const [name, key, gap] of [["light", "j", 60], ["heavy", "k", 66], ["up", "i", 60]]) {
    await prep(gap); const d = await dmgFrom(async () => { await page.keyboard.down(key); await waitFrames(3); await record(); await page.keyboard.up(key); });
    check(`${name} connects`, d > 0, `−${d.toFixed(0)}`);
  }
  await waitGrounded(); await prep(56); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(44)); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); }); check("air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded(); await prep(34); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(50)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await page.keyboard.up("s"); }); check("down_air connects", d > 0, `−${d.toFixed(0)}`); }

  // ── STAGE 2: Speed Rush command chain (Down+Heavy rekka) ──
  section("Speed Rush command chain (Down+Heavy rekka)");
  await waitGrounded(); await prep(46);
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  const seq = []; { const m = (await p1()).currentMove; if (m) seq.push(m); }
  for (const want of ["rush2"]) {
    let rec = false; for (let i = 0; i < 40; i++) { const p = await record(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec = true; break; } await waitFrames(1); }
    if (!rec) break; await tapKey("k"); const m = (await p1()).currentMove; if (m && seq[seq.length - 1] !== m) seq.push(m);
  }
  check("chain sequences rush1→rush2", seq.join("→") === "rush1→rush2", `seq=${seq.join("→")}`);
  // mid-chain interrupt: an opener that lands NO clean hit (dummy invulnerable → no hitstun latched) must
  // NOT allow a re-tap to continue the rekka (cancel-on-hit gate). Sample continuously (an invuln whiff has
  // no hitstop to freeze the transient move) tracking `attacking`(rush1 fired) + `cmdHitLanded`(gate) + rush2.
  await page.keyboard.up("k"); await page.keyboard.up("s"); await page.keyboard.up("j"); await waitFrames(6);  // FLUSH stale heavy edge (_cmdPrevHeavy) from the prior chain
  await waitGrounded(); await prep(46);
  await page.evaluate(() => window.__harness.setP2Invuln(600));   // opener lands no clean hit → _cmdHitLanded stays false
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  // The opener whiffs (no hitstop → the sprite blazes past async polling), so assert on the DURABLE gate
  // state: `attacking` (rush1 fired) + `cmdHitLanded` stays FALSE (no clean connect → the rekka can't
  // continue) + rush2 never appears. Re-tap Heavy mid-window to prove the whiff still refuses to advance.
  let firedOpener = false, sawRush2 = false, gateEverOpened = false;
  for (let i = 0; i < 26; i++) { const a = await p1(); if (a.attacking) firedOpener = true; if (a.currentMove === "rush2") sawRush2 = true; if (a.cmdHitLanded) gateEverOpened = true; if (i === 12) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); } await waitFrames(1); }
  await page.keyboard.up("s");
  check("mid-chain interrupt: whiff keeps the cancel-gate closed → no advance to rush2", firedOpener && !gateEverOpened && !sawRush2, `fired=${firedOpener} gateOpened=${gateEverOpened} rush2=${sawRush2}`);
  await page.evaluate(() => window.__harness.setP2Invuln(0));
  await waitFrames(16);

  // ── STAGE 3: melee multi-hit specials ──
  section("specials — Spin Attack (neutral) / Tornado (forward)");
  await waitGrounded(); await prep(52);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  let smv = null; for (let i = 0; i < 8; i++) { const a = await record(); if (a.currentMove === "spinAttack") { smv = a; break; } await waitFrames(1); }
  { let prev = (await p2()).health, hits = 0; for (let i = 0; i < 34; i++) { const hh = (await p2()).health; if (hh < prev - 0.01) hits++; prev = hh; await waitFrames(1); }
    check("Spin Attack sprite + multi-hit", smv && (smv.spriteSheet || "").includes("flash_spin_uniform") && hits >= 2, `sheet=${smv?.spriteSheet} hits=${hits}`); }
  await waitGrounded(); await prep(58);
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  let tmv = null; for (let i = 0; i < 8; i++) { const a = await record(); if (a.currentMove === "tornado") { tmv = a; break; } await waitFrames(1); }
  { let prev = (await p2()).health, hits = 0, launched = false; for (let i = 0; i < 40; i++) { const q = await p2(); if (q.health < prev - 0.01) hits++; prev = q.health; if (q.vy < -3 || q.knockdownState) launched = true; await waitFrames(1); }
    await page.keyboard.up("d");
    check("Tornado sprite + multi-hit + launch", tmv && (tmv.spriteSheet || "").includes("flash_tornado_uniform") && hits >= 3 && launched, `sheet=${tmv?.spriteSheet} hits=${hits} launch=${launched}`); }
  const pj = await page.evaluate(() => window.__harness.projectiles?.() || []);
  check("pure melee — no projectiles from any move", pj.length === 0, `count=${pj.length}`);

  // ── STAGE 4: Flash Time ultimate ──
  section("Flash Time (ultimate): cinematic · differential · overshoot · block-lockout");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2(); });
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  let sawCine = false, sawPush = false, sawBurst = false;
  for (let i = 0; i < 170; i++) { const c = await ftCine(); if (c.active) { sawCine = true; if (c.phase === "push") sawPush = true; if (c.burst) sawBurst = true; } else if (sawCine) break; await waitFrames(1); }
  check("activation cinematic plays (Godspeed architecture: push→burst)", sawCine && sawPush && sawBurst, "");
  const on = await record();
  check("Flash Time buff live + snappier attacks", on.flashTimeActive === true && (on.attackSpeedMultiplier || 1) > 1.1, `form=${on.currentForm} atkSpd=${on.attackSpeedMultiplier}`);
  // 3×/⅓× differential
  let p2ran = 0, p1frozen = false; const N = 48;
  for (let i = 0; i < N; i++) { const q = await p2(), pp = await p1(); if (!q.timeSlowFrozen) p2ran++; if (pp.timeSlowFrozen) p1frozen = true; await waitFrames(1); }
  check("opponent time-slowed to ~⅓ + Flash full speed", p2ran / N >= 0.15 && p2ran / N <= 0.50 && !p1frozen, `${((p2ran / N) * 100).toFixed(0)}% opp frames ran`);
  // opponent RETAINS block during the slow (blockstun spike while forced to guard)
  await page.evaluate(() => { window.__harness.healP2(); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 76); window.__harness.setP2Invuln(0); });
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  let blockedAHit = false; for (let i = 0; i < 40; i++) { await page.evaluate(() => window.__harness.setP2Blocking(true)); if (((await p2()).blockstun || 0) > 0) blockedAHit = true; await waitFrames(1); }
  check("opponent RETAINS block during the slow", blockedAHit, "");
  // overshoot / skid
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 520); });
  await page.keyboard.down("d"); await waitFrames(8); const vMove = Math.abs((await p1()).vx); await page.keyboard.up("d");
  for (let i = 0; i < 6; i++) await waitFrames(1); const vAfter = Math.abs((await p1()).vx);
  check("overshoot: zips >9 clamp while held, skids on release", vMove > 9 && vAfter > 2.5, `vx ${vMove.toFixed(1)}→${vAfter.toFixed(1)} after 6f`);
  // Flash CANNOT block — opponent lands a hit
  await waitGrounded();
  await page.evaluate(() => { window.__harness.healP2(); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 60); window.__harness.healP1(); });
  await page.keyboard.down("s"); await waitFrames(3);
  const flashBlocking = (await p1()).isBlocking; const ph0 = (await p1()).health;
  // NOTE: the opponent is time-slowed to ⅓ during Flash Time, so ITS attack resolves ~3× slower in real
  // frames — wait generously (up to ~60f) for the hit to land, and re-issue if it lapses.
  await page.evaluate(() => window.__harness.p2Attack());
  let landed = false; for (let i = 0; i < 60; i++) { const pp = await p1(); if (pp.hitstun > 0 || pp.health < ph0 - 0.5) { landed = true; break; } if (i === 30) await page.evaluate(() => window.__harness.p2Attack()); await waitFrames(1); }
  await page.keyboard.up("s");
  const flashDmg = ph0 - (await p1()).health;
  check("Flash CANNOT block (input ignored + opponent's hit lands)", flashBlocking === false && flashDmg > 20, `isBlocking=${flashBlocking} −${flashDmg.toFixed(0)}`);
  // auto-revert when the meter empties
  await page.evaluate(() => window.__harness.setP1Energy(0.05)); await waitFrames(3);
  const off = await p1();
  check("Flash Time auto-reverts when Speed Force empties", off.flashTimeActive === false && (off.attackSpeedMultiplier || 1) === 1, `active=${off.flashTimeActive}`);

  // ── fallback-box sweep + integrity ──
  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("flash"));
  check(`all ${seenActions.size} exercised actions use a flash sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("portrait file present", await page.evaluate(async () => { try { const r = await fetch("./flash_portrait.png"); return r.ok; } catch { return false; } }), "");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  FLASH full kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
