// harness/gon.test.mjs — CANONICAL full-kit test for Gon Freecss (Stages 1-4 in one run), plus a
// fallback-box sweep (every exercised action must resolve to a real gon sheet) + portrait presence.
// Stage-4 detail also lives in gon_stage4.test.mjs; this is the single regression gate.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
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
const projs = () => page.evaluate(() => window.__harness.projectiles());
const adult = (who = "p1") => page.evaluate(w => window.__harness.gonAdultForm(w), who);
const cine = () => page.evaluate(() => window.__harness.adultFormCine());
const flow = () => page.evaluate(() => window.__harness.matchFlow());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function prep(gap, refillEnergy = true) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(re => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); if (re) window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); }, refillEnergy);
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function dmgFrom(pressFn, settle = 26) { const hp0 = (await p2()).health; await pressFn(); await waitFrames(settle); return hp0 - (await p2()).health; }
async function reboot() { await page.evaluate(() => window.__harness.boot()); await waitFrames(6); await waitGrounded(); }
async function enterAdultForm() {
  await page.evaluate(() => window.__harness.fillEnergy());
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
  const during = await cine(); await record();
  await page.waitForFunction(() => !window.__harness.adultFormCine().active, null, { timeout: 12000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  return { during, form: await adult() };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── registration + stats ──
  section("registration + stats");
  const g = await record();
  check("P1 is Gon", g.key === "gon", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet = gon_idle_uniform", (g.spriteSheet || "").includes("gon_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("balanced HP 1150", g.maxHealth === 1150, `HP=${g.maxHealth}`);
  check("Nen pool 160", g.maxEnergy === 160, `EN=${g.maxEnergy}`);

  // ── STAGE 1: movement/state ──
  section("movement + state");
  await page.keyboard.down("d"); await waitFrames(14); await record(); await page.keyboard.up("d"); await waitFrames(4);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); await record();
  await page.waitForFunction(() => window.__harness.p1().vy > 6 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {}); await record(); await page.keyboard.up("w");
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(14); const bk = await record(); await page.keyboard.up("s"); await waitFrames(4);
  check("guard resolves to a gon guard sheet", bk.action === "guard" && (bk.spriteSheet || "").includes("gon_guard_uniform"), `action=${bk.action} sheet=${bk.spriteSheet}`);
  await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); const h = await record();
  check("hurt resolves to a gon hit sheet", h.action === "hurt" && (h.spriteSheet || "").includes("gon_hit_uniform"), `action=${h.action} sheet=${h.spriteSheet}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── STAGE 2: 5 normals ──
  section("5 normals connect");
  for (const [name, key, gap] of [["light", "j", 46], ["heavy", "k", 52], ["up", "i", 48]]) {
    await prep(gap); const d = await dmgFrom(async () => { await page.keyboard.down(key); await waitFrames(4); await record(); await page.keyboard.up(key); });
    check(`${name} connects`, d > 0, `−${d.toFixed(0)}`);
  }
  await prep(44); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(42)); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); }); check("air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded(); await prep(30); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await page.keyboard.up("s"); }); check("down_air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded();

  // ── STAGE 2: Rush command chain (Down+Heavy rekka, cancel-on-hit) ──
  section("Rush command chain (Down+Heavy rekka)");
  await prep(40);
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  const seq = []; { await record(); const m = (await p1()).currentMove; if (m) seq.push(m); }
  for (const want of ["rush2"]) {
    let rec = false; for (let i = 0; i < 40; i++) { const p = await record(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec = true; break; } await waitFrames(1); }
    if (!rec) break; await tapKey("k"); await record(); const m = (await p1()).currentMove; if (m && seq[seq.length - 1] !== m) seq.push(m); if (m !== want) break;
  }
  check("rush chains 1→2 (cancel-on-hit)", seq.join("→") === "rush1→rush2", `seq=${seq.join("→")}`);
  await waitFrames(20); await waitGrounded();

  // ── STAGE 3: Jajanken — 3 direction-branched specials ──
  section("Jajanken (Rock / Scissors / Paper)");
  await prep(58); { const d = await dmgFrom(async () => { await page.keyboard.down("l"); await waitFrames(4); await record(); await page.keyboard.up("l"); }, 34);
    check("ROCK (neutral+Special) connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded(); await prep(50); { const d = await dmgFrom(async () => { await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await record(); await page.keyboard.up("l"); await waitFrames(14); await page.keyboard.up("d"); }, 30);
    check("SCISSORS (Fwd+Special) connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded(); await prep(54); { const d = await dmgFrom(async () => { await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await record(); await page.keyboard.up("l"); await page.keyboard.up("s"); }, 28);
    check("PAPER (Down+Special) connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded();

  // sudden-death must be GATED to Adult Form: a normal Special is still Jajanken, not the finisher.
  await prep(200);
  await tapKey("l"); await waitFrames(3);
  const outside = await adult();
  check("sudden-death NOT armed outside Adult Form", outside.suddenDeathWatch === false && outside.action !== "finalblow", `watch=${outside.suddenDeathWatch} action=${outside.action}`);
  check("normal Special does not force a match end", (await flow()).victoryActive === false, "");
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await waitGrounded();

  // ── STAGE 4: Adult Form — activation, lockout, drain, sudden-death ──
  section("Adult Form — activation + movement lockout");
  const act = await enterAdultForm();
  check("activation cinematic played", act.during.active === true || act.during.frame > 0, `cine=${JSON.stringify(act.during)}`);
  check("Adult Form is active", act.form.active === true && act.form.currentForm === "adult", `active=${act.form.active} form=${act.form.currentForm}`);
  check("cannot jump (canJump=false)", act.form.canJump === false, `canJump=${act.form.canJump}`);
  check("cannot dash (noDash=true)", act.form.noDash === true, `noDash=${act.form.noDash}`);
  check("lumber speed (walk clamped)", act.form.speed === 40, `speed=${act.form.speed}`);
  await page.keyboard.down("w"); await waitFrames(10); const jt = await adult(); await page.keyboard.up("w"); await waitFrames(4);
  check("jump input leaves Gon grounded", jt.onGround === true && Math.abs(jt.vy) < 1.5, `onGround=${jt.onGround} vy=${jt.vy?.toFixed?.(2)}`);
  // drain → auto-revert when the meter empties
  await page.evaluate(() => window.__harness.setP1Energy(0.02)); await waitFrames(3);
  const drained = await adult();
  check("Adult Form auto-reverts when Nen empties", drained.active === false && drained.canJump === true && drained.noDash === false, `active=${drained.active} canJump=${drained.canJump}`);

  section("sudden-death HIT → INSTANT WIN (at 0-0)");
  await reboot();
  await page.evaluate(() => window.__harness.setRoundWins(0, 0));
  await enterAdultForm();
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP2Invuln(0); });
  { const gp = await p1(); await page.evaluate(x => window.__harness.setP2X(x), gp.x + 34); }
  await waitFrames(2);
  const before = await flow();
  check("round score 0-0 before the finisher", before.roundWins.p1 === 0 && before.roundWins.p2 === 0, JSON.stringify(before.roundWins));
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.matchFlow().victoryActive === true, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const win = await flow();
  check("clean hit → match ended", win.victoryActive === true, `victoryActive=${win.victoryActive}`);
  check("winner is Gon (p1) despite 0-0", win.winnerSide === "p1", `winnerSide=${win.winnerSide} rounds=${JSON.stringify(win.roundWins)}`);
  check("override fired with neither side at 2 wins", win.roundWins.p1 < 2 && win.roundWins.p2 < 2, JSON.stringify(win.roundWins));

  section("sudden-death WHIFF → INSTANT LOSS (while leading 1-0)");
  await reboot();
  await page.evaluate(() => window.__harness.setRoundWins(1, 0));
  await enterAdultForm();
  await page.evaluate(() => window.__harness.setP2Invuln(600));
  { const gp = await p1(); await page.evaluate(x => window.__harness.setP2X(x), gp.x + 380); }
  await waitFrames(2);
  const lead = await flow();
  check("Gon leads 1-0 before the finisher", lead.roundWins.p1 === 1 && lead.roundWins.p2 === 0, JSON.stringify(lead.roundWins));
  await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l");
  const strike = await record();
  check("Final Blow plays the finalblow sprite", strike.action === "finalblow" && /gon_finalblow_uniform\.png$/.test(strike.spriteSheet || ""), `action=${strike.action} sheet=${strike.spriteSheet}`);
  await page.waitForFunction(() => window.__harness.matchFlow().victoryActive === true, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const loss = await flow();
  check("whiff → match ended", loss.victoryActive === true, `victoryActive=${loss.victoryActive}`);
  check("winner is the OPPONENT (p2) despite Gon leading 1-0", loss.winnerSide === "p2", `winnerSide=${loss.winnerSide} rounds=${JSON.stringify(loss.roundWins)}`);
  check("override fired with neither side at 2 wins", loss.roundWins.p1 < 2 && loss.roundWins.p2 < 2, JSON.stringify(loss.roundWins));

  // ── fallback-box sweep + portrait + integrity ──
  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("gon"));
  check(`all ${seenActions.size} exercised actions use a gon sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("portrait file present", await page.evaluate(async () => { try { const r = await fetch("./gon_portrait.png"); return r.ok; } catch { return false; } }), "");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  GON full kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
