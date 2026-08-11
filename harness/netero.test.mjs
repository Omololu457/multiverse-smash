// harness/netero.test.mjs
// ---------------------------------------------------------------------------
// ISAAC NETERO (Hunter x Hunter) — full-kit verification (real Chromium, real code path).
//   • sprite gate + stats + clean intro/win/lose/getup fallbacks (no 128² box)
//   • movement/state: idle / run / jump / fall / guard / hurt
//   • 5 normals connect (up launches, down_air spikes, down_air reuses the air sheet)
//   • down_attck command cancel chain: opener → cancel-on-HIT → follow-up (+ whiff interrupt rule)
//   • Barrage Punches special — one continuous concatenated 8-frame sequence
//   • 100-Type Guanyin Bodhisattva ultimate: charge cast → giant materialises → idle → lunge travels;
//     giant hurtbox matches the drawn giant (not the tiny base box)
//   • 4 avatar attacks (leg / arm-sweep / combo-slash=2-hit / punch-burst=frames-3-6-only), each
//     out-hitting the base kit; borrowed upscaled guard/hit render at giant scale
//   • fallback-box sweep: every exercised action resolves to a netero_*/guanyin_* sheet
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
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
const hbx = who => page.evaluate(w => window.__harness.hurtbox(w), who);
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function tap(key, hold = 1) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function sample(n) { const acts = new Set(); const maxIdx = {}; for (let i = 0; i < n; i++) { const a = await record(); if (a.action) { acts.add(a.action); maxIdx[a.action] = Math.max(maxIdx[a.action] || 0, a.frameIndex || 0); } await waitFrames(1); } return { acts, maxIdx }; }
async function fireSampleDmg(key, n) {
  const h0 = (await p2()).health; let prev = h0, drops = 0, firstDrop = -1, sheet = null; const acts = new Set();
  await page.keyboard.down(key);
  for (let i = 0; i < n; i++) { const a = await record(); acts.add(a.action); if ((a.action || "").startsWith("guanyin")) sheet = a.spriteSheet; if (i === 2) await page.keyboard.up(key); const h = (await p2()).health; if (h < prev - 0.01) { drops++; if (firstDrop < 0) firstDrop = i; } prev = h; await waitFrames(1); }
  await page.keyboard.up(key).catch(() => {});
  return { acts, drops, firstDrop, totalDmg: h0 - prev, sheet };
}

try {
  // ── SPRITE GATE + STATS + INTRO FALLBACK ──
  await page.goto(`${base}/index.html?harness=1&p1=netero`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  section("intro/presentation fallback — clean (no box)");
  await page.evaluate(() => window.__harness.start());
  await waitFrames(6);
  const intro = await record();
  check("intro renders a netero sheet (idle fallback, no box)", (intro.spriteSheet || "").includes("netero"), `sheet=${intro.spriteSheet} action=${intro.action}`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  section("sprite gate + stats");
  const g = await record();
  check("P1 is Netero", g.key === "netero", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet = netero_idle_uniform", (g.spriteSheet || "").includes("netero_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.85", Math.abs((g.spriteScale || 0) - 1.85) < 0.001, `scale=${g.spriteScale}`);
  check("HP 980 / EN 150 (glass-cannon speedster)", g.maxHealth === 980 && g.maxEnergy === 150, `HP=${g.maxHealth} EN=${g.maxEnergy}`);

  // ── MOVEMENT / STATE ──
  section("movement / state — run / jump / fall / guard / hurt");
  await page.keyboard.down("d"); await waitFrames(16); const rn = await record(); await page.keyboard.up("d"); await waitFrames(4);
  check("run uses netero_run_uniform", (seenActions.get("run") || seenActions.get("walk") || "").includes("netero_run_uniform"), `action=${rn.action}`);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); const jp = await record(); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__harness.p1().vy > 6, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const fl = await record();
  check("jump + fall use netero_jump_uniform", (jp.spriteSheet || "").includes("netero_jump_uniform") && (fl.spriteSheet || "").includes("netero_jump_uniform"), `jump=${jp.action} fall=${fl.action}`);
  await waitGrounded();
  await page.keyboard.down(";"); await waitFrames(18); const bk = await record(); await page.keyboard.up(";"); await waitFrames(4);
  check("guard uses netero_block_uniform", bk.action === "guard" && (bk.spriteSheet || "").includes("netero_block_uniform"), `action=${bk.action}`);
  await page.evaluate(() => window.__harness.hurtP1(26)); await waitFrames(3); const h = await record();
  check("hurt uses netero_hit_uniform", h.action === "hurt" && (h.spriteSheet || "").includes("netero_hit_uniform"), `action=${h.action}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── NORMALS ──
  section("5 normals — connect + launch/spike");
  for (const [name, key, gap] of [["light", "j", 46], ["heavy", "k", 52], ["up", "i", 48]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); await record(); await page.keyboard.up(key); await waitFrames(18);
    const after = await p2();
    check(`${name} connects`, hp0 - after.health > 0, `−${(hp0 - after.health).toFixed(0)}`);
    if (key === "i") check("up launches", after.grounded === false || after.vy < 0, `vy=${after.vy.toFixed(1)}`);
    await waitFrames(16);
  }
  await prep(44);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(42)); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await waitFrames(14);
    check("air connects (netero_air_down_attack)", hp0 - (await p2()).health > 0 && (seenActions.get("air") || "").includes("netero_air_down_attack"), `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  await waitGrounded(); await waitFrames(6);
  await prep(32);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    check("down_air spike connects (reuses air sheet)", hp0 - (await p2()).health > 0 && (seenActions.get("down_air") || "").includes("netero_air_down_attack"), `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  await waitGrounded(); await waitFrames(6);

  // ── COMMAND CHAIN + INTERRUPT ──
  section("down_attck cancel chain — Forward+Heavy opener (+ whiff interrupt)");   // combo-string standardization Stage B: opener was Down+Heavy (move keys keep the down_attck name)
  // Retry the whole opener→cancel sequence with a FRESH reposition each attempt — in the long combined
  // session p2 can carry residual drift into this section; a clean re-prep per attempt removes that
  // variance. (The isolated Stage 3 test is the deterministic single-shot proof.)
  let openerOk = false, followOk = false, followDmg = 0;
  for (let attempt = 0; attempt < 6 && !(openerOk && followOk); attempt++) {
    await prep(40);   // well inside the opener's rangeX (78)
    const h0 = (await p2()).health;
    await page.keyboard.down("d");
    await tap("k", 2);
    let seen1 = false; for (let i = 0; i < 4; i++) { const a = await record(); if (a.action === "down_attck_1") seen1 = true; await waitFrames(1); }
    const hOpener = (await p2()).health;
    if (seen1 && h0 - hOpener > 0) {
      openerOk = true;
      await page.waitForFunction(() => window.__harness.p2().hitstun > 0, null, { timeout: 1500, polling: 16 }).catch(() => {});
      let seen2 = false;
      for (let att = 0; att < 4 && !seen2; att++) { await tap("k", 2); for (let i = 0; i < 4; i++) { const a = await record(); if (a.action === "down_attck_2") seen2 = true; await waitFrames(1); } }
      followDmg = hOpener - (await p2()).health;
      if (seen2 && followDmg > 0) followOk = true;
    }
    await page.keyboard.up("d");
  }
  check("opener down_attck_1 connects", openerOk, "");
  check("cancels into down_attck_2 on hit (+dmg)", followOk, `follow=${followOk} −${followDmg.toFixed(0)}`);
  await prep(420);
  const wp0 = (await p2()).health;
  await page.keyboard.down("d"); await tap("k", 2); await sample(6); await waitFrames(4); await tap("k", 2); const wi = await sample(8); await page.keyboard.up("d");
  check("whiffed opener does NOT chain", !wi.acts.has("down_attck_2") && Math.abs(wp0 - (await p2()).health) < 1, `acts=[${[...wi.acts]}]`);

  // ── BARRAGE PUNCHES ──
  section("Barrage Punches — one continuous 8-frame sequence + connect");
  await prep(70);
  const bE0 = (await p1()).energy, bH0 = (await p2()).health;
  await tap("l", 2); const bE1 = (await p1()).energy; const bs = await sample(34);
  check("Barrage uses the concat 8-frame sheet", (seenActions.get("barragePunches") || "").includes("netero_barrage_full_uniform"), `sheet=${seenActions.get("barragePunches")}`);
  check("plays the full 8-frame sequence", (bs.maxIdx.barragePunches || 0) >= 6, `maxFrame=${bs.maxIdx.barragePunches}`);
  check("spends 30 energy + connects", bE0 - bE1 >= 28 && bH0 - (await p2()).health > 0, `Δen=${(bE0 - bE1).toFixed(0)} −hp=${(bH0 - (await p2()).health).toFixed(0)}`);

  // ── GUANYIN ULTIMATE — transform + giant ──
  section("100-Type Guanyin Bodhisattva — charge cast → giant → idle → lunge → hurtbox");
  await prep(300);
  // Park P1 at a known spot with room to the right BEFORE transforming — the giant's arena-half-lock is
  // computed at transform time, so the lunge-travel check needs P1 not pinned near the wall by whatever
  // forward drift the earlier base-form chain sub-tests left behind (combo-flow step-in glide).
  await page.evaluate(() => window.__harness.setP1X?.(700)); await waitFrames(2);
  const baseHb = await hbx("p1");
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  await tap("u", 2); await waitFrames(3);
  const cast = await record();
  check("charge cast plays first (guanyinCast)", cast.action === "guanyinCast" && (cast.spriteSheet || "").includes("netero_charge_guanyin"), `action=${cast.action}`);
  await page.waitForFunction(() => !!window.__harness.p1().canvasHeightFrac, null, { timeout: 4000, polling: 16 });
  await waitFrames(6);
  const giant = await record();
  check("giant materialises (canvasHeightFrac + guanyin_idle)", !!giant.canvasHeightFrac && (giant.spriteSheet || "").includes("guanyin_idle_uniform"), `frac=${giant.canvasHeightFrac} sheet=${giant.spriteSheet}`);
  const gHb = await hbx("p1");
  check("giant drawn large (drawH > 400)", (gHb.drawH || 0) > 400, `drawH=${(gHb.drawH || 0).toFixed(0)}`);
  check("giant hurtbox matches the drawn giant (>>base, within extent)", gHb.h > baseHb.h * 2.5 && gHb.y >= gHb.drawTop - 4 && (gHb.y + gHb.h) <= (gHb.drawTop + gHb.drawH + 4), `gh=${gHb.h.toFixed(0)} base=${baseHb.h.toFixed(0)}`);
  const gx0 = (await p1()).x;
  await page.keyboard.down("d"); let lungeSeen = false, lungeSheet = null;
  for (let i = 0; i < 16; i++) { const a = await record(); if (["run", "walk", "dash"].includes(a.action)) { lungeSeen = true; lungeSheet = a.spriteSheet; } await waitFrames(1); }
  await page.keyboard.up("d");
  check("lunge travels + uses guanyin_run_lunge", lungeSeen && (lungeSheet || "").includes("guanyin_run_lunge") && Math.abs((await p1()).x - gx0) > 5, `seen=${lungeSeen} Δx=${((await p1()).x - gx0).toFixed(0)}`);

  // ── AVATAR ATTACKS ──
  section("4 avatar attacks — connect, combo=2-hit, burst frame-gated, out-hit base kit");
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  async function prepG(gap) { await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP2Invuln?.(0); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }
  // Reset the combo so the first avatar hit measures at FULL (un-decayed) ultimate-tier damage —
  // otherwise getComboScale decays late-combo hits (the strict per-move 1.6× proof is in Stage 5).
  await page.evaluate(() => window.__harness.healP2()); await waitFrames(95);
  await prepG(150); const leg = await fireSampleDmg("j", 24);
  check("leg strike connects (guanyin_leg_strike)", leg.totalDmg > 0 && (leg.sheet || "").includes("guanyin_leg_strike"), `−${leg.totalDmg.toFixed(0)}`);
  await prepG(180); const arm = await fireSampleDmg("k", 28);
  check("arm sweep connects (guanyin_arm_sweep)", arm.totalDmg > 0 && (arm.sheet || "").includes("guanyin_arm_sweep"), `−${arm.totalDmg.toFixed(0)}`);
  await prepG(150); const combo = await fireSampleDmg("l", 34);
  check("combo slash = 2 distinct hits (guanyin_combo_slash)", combo.drops >= 2 && (combo.sheet || "").includes("guanyin_combo_slash"), `hits=${combo.drops} −${combo.totalDmg.toFixed(0)}`);
  await prepG(160); const burst = await fireSampleDmg("i", 30);
  check("punch burst connects (guanyin_punch_burst)", burst.totalDmg > 0 && (burst.sheet || "").includes("guanyin_punch_burst"), `−${burst.totalDmg.toFixed(0)}`);
  check("punch burst windup (frames 1-2) non-damaging", burst.firstDrop >= 2, `firstHit@${burst.firstDrop}`);
  check("leg strike (fresh) is ultimate-tier — out-hits base heavy (~57 eff)", leg.totalDmg > 55, `leg=${leg.totalDmg.toFixed(0)}`);
  check("all 4 avatar attacks connect", [leg, arm, combo, burst].every(r => r.totalDmg > 0), `leg=${leg.totalDmg.toFixed(0)} arm=${arm.totalDmg.toFixed(0)} combo=${combo.totalDmg.toFixed(0)} burst=${burst.totalDmg.toFixed(0)}`);
  // borrowed giant guard/hit
  await page.evaluate(() => window.__harness.hurtP1?.(24)); await waitFrames(3); const gh = await record();
  check("borrowed giant hurt renders at giant scale (netero_guanyin_hurt_big)", gh.action === "hurt" && (gh.spriteSheet || "").includes("netero_guanyin_hurt_big") && !!gh.canvasHeightFrac, `action=${gh.action} sheet=${gh.spriteSheet}`);

  // ── PORTRAIT + ROSTER ──
  section("character-select — Netero on HxH roster (portrait: procedural-box fallback, no file shipped)");
  const cs = await page.evaluate(() => window.__harness.showCharSelect("hunter_x_hunter", "training"));
  check("Netero on the Hunter x Hunter roster", (cs.roster || []).includes("netero"), `roster=${(cs.roster || []).join(",")}`);

  // ── FALLBACK SWEEP + INTEGRITY ──
  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !(s.includes("netero") || s.includes("guanyin")));
  check(`all ${seenActions.size} exercised actions use a netero/guanyin sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  NETERO full-kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
