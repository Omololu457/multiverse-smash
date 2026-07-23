// harness/vegeta_ssj.test.mjs
// ---------------------------------------------------------------------------
// Vegeta — SUPER SAIYAN (regular) verification (real Chromium, real code path).
// A _skinAnim form-swap on the SAME rosterKey "vegeta". Built stage-by-stage;
// this file grows with each stage.
//
// STAGE 1 (transform hook + movement/state):
//   • real charge-RELEASE input transforms base Vegeta → SSJ (27f morph plays)
//   • the form swap: currentForm=vegetaSSJ, _skinAnim set, +20/+12/+5 buffs
//   • SSJ idle / run / jump / guard / hurt / knockdown all render GOLD ssj_* art
//     (NONE fall through to the 128² fallback box)
//   • continuous energy drain + instant auto-revert at 0
//   • the MANDATORY-WAYPOINT seam (ensureVegetaSSJWaypoint) fires SSJ as a real
//     intermediate step and can't be bypassed
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

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv" };
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
const form = () => page.evaluate(() => window.__harness.vegetaForm());
const vegCmd = () => page.evaluate(() => window.__harness.vegCmd());
const topUp = () => page.evaluate(() => window.__harness.fillEnergy());
async function releaseAll() { for (const k of ["a", "d", "s", "w", "j", "k", "i", "l", "u", "p"]) await page.keyboard.up(k).catch(() => {}); }

// Enter SSJ via the REAL input path: hold the charge key (build/settle) then release → transform.
async function transformViaInput() {
  await page.keyboard.down("p");
  await waitFrames(14);
  await page.keyboard.up("p");
  // wait for the morph to begin
  await page.waitForFunction(() => window.__harness.p1().action === "transform", null, { timeout: 6000, polling: 16 }).catch(() => {});
}
const isFallback = a => !a.spriteSheet || a.spriteFrames === null || /_FALLBACK|128/.test(a.spriteSheet || "");
// Ensure Vegeta is in SSJ (re-transform if a prior section reverted him). Uses the fast harness enter.
async function ensureSSJ() { await topUp(); const f = await form(); if (!f.ssjActive) { await page.evaluate(() => window.__harness.vegetaForm("enter")); await page.waitForFunction(() => window.__harness.p1().action === "idle" && (window.__harness.p1().attackCooldown||0)===0, null, { timeout: 6000, polling: 16 }).catch(()=>{}); } await topUp(); }
async function actionable() { await page.waitForFunction(() => { const c = window.__harness.vegCmd(); const p = window.__harness.p1(); return c && !c.attacking && c.cooldown <= 0 && p.grounded; }, null, { timeout: 5000, polling: 16 }).catch(()=>{}); }
async function pinDummy(gap = 42) { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + (a.facing === 1 ? gap : -gap)); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await waitGrounded();

  // ── TRANSFORM: base Vegeta → SSJ via real charge-release ──────────────────
  section("TRANSFORM — hold-charge → release morphs base Vegeta into SSJ (27f transform.png)");
  {
    const before = await form();
    check("starts in BASE form (no skin anim)", !before.ssjActive && !before.hasSkinAnim, `form=${before.form}`);
    await transformViaInput();
    const mid = await p1();
    check("morph plays the SSJ transformation sheet", (mid.spriteSheet || "").includes("vegeta_ssj_transformation"), `action=${mid.action} sheet=${mid.spriteSheet}`);
    check("morph is NOT the fallback box", !isFallback(mid), `sheet=${mid.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VGS_transform.png") });
    // let the morph finish and settle to SSJ idle
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.action === "idle" && (p.attackCooldown || 0) === 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    const after = await form();
    check("now in SSJ form (currentForm=vegetaSSJ)", after.ssjActive && after.form === "vegetaSSJ", `form=${after.form} active=${after.ssjActive}`);
    check("_skinAnim applied (art form-swap)", after.hasSkinAnim, `hasSkinAnim=${after.hasSkinAnim}`);
    check("SSJ damage buff +20% (1.20)", Math.abs(after.dmgMult - 1.20) < 0.001, `dmgMult=${after.dmgMult}`);
    check("SSJ speed buff +12% (1.12)", Math.abs(after.spdMult - 1.12) < 0.001, `spdMult=${after.spdMult}`);
    check("SSJ defense buff +5% (1.05)", Math.abs(after.defMult - 1.05) < 0.001, `defMult=${after.defMult}`);
    check("waypoint flag set on entering SSJ", after.waypointReached, `reached=${after.waypointReached}`);
  }

  // ── IDLE (SSJ art, not the base blue sprite) ──────────────────────────────
  section("SSJ movement/state — every action renders GOLD ssj_* art, never the fallback box");
  {
    await topUp();
    const idle = await p1();
    check("SSJ idle renders vegeta_ssj_idle sheet", (idle.spriteSheet || "").includes("vegeta_ssj_idle"), `sheet=${idle.spriteSheet}`);
    check("SSJ idle NOT the fallback box", !isFallback(idle), `sheet=${idle.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VGS_idle.png") });

    // RUN — hold forward
    await page.keyboard.down("d"); await waitFrames(10);
    const run = await p1();
    check("SSJ run renders vegeta_ssj_run sheet", (run.spriteSheet || "").includes("vegeta_ssj_run") && (run.action === "run" || run.action === "walk"), `action=${run.action} sheet=${run.spriteSheet}`);
    check("SSJ run NOT the fallback box", !isFallback(run), `sheet=${run.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VGS_run.png") });
    await page.keyboard.up("d"); await waitFrames(4);

    // JUMP — tap up, catch airborne
    await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
    let jumpSeen = false;
    for (let i = 0; i < 30; i++) { const p = await p1(); if (!p.grounded && /vegeta_ssj_jump/.test(p.spriteSheet || "")) { jumpSeen = true; await page.screenshot({ path: path.join(OUT, "VGS_jump.png") }); break; } await waitFrames(1); }
    check("SSJ jump renders vegeta_ssj_jump sheet (airborne)", jumpSeen, `seen=${jumpSeen}`);
    await waitGrounded();

    // GUARD — hold Down (blocks)
    await topUp();
    await page.keyboard.down("s"); await waitFrames(6);
    const guard = await p1();
    check("SSJ guard renders vegeta_ssj_gaurd sheet", (guard.spriteSheet || "").includes("vegeta_ssj_gaurd") && guard.action === "guard", `action=${guard.action} sheet=${guard.spriteSheet}`);
    check("SSJ guard NOT the fallback box", !isFallback(guard), `sheet=${guard.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VGS_guard.png") });
    await page.keyboard.up("s"); await waitFrames(4);
  }

  // ── HURT — a real connect renders the SSJ flinch ──────────────────────────
  section("SSJ hurt — a real hit renders vegeta_ssj_hit (not base art, not the box)");
  {
    await topUp();
    const a = await p1();
    await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 44);
    await waitFrames(2);
    let hurtSeen = false, sheet = "";
    for (let i = 0; i < 10 && !hurtSeen; i++) {
      await page.evaluate(() => window.__harness.p2Attack());
      for (let k = 0; k < 10; k++) { const p = await p1(); if (p.action === "hurt") { hurtSeen = true; sheet = p.spriteSheet || ""; await page.screenshot({ path: path.join(OUT, "VGS_hurt.png") }); break; } await waitFrames(1); }
      await topUp();
    }
    check("SSJ rendered the 'hurt' flinch", hurtSeen, `sawHurt=${hurtSeen}`);
    check("hurt uses the vegeta_ssj_hit sheet (form-correct)", hurtSeen && sheet.includes("vegeta_ssj_hit"), `sheet=${sheet}`);
  }

  // ── KNOCKDOWN — forced state (combat only sets it for goku_black) ──────────
  section("SSJ knockdown — forced state resolves vegeta_ssj_knock_down (render-only proof)");
  {
    await topUp();
    await page.evaluate(() => window.__harness.p1Knockdown());
    // Wait for the forced knockdown to resolve on-screen rather than a fixed frame count: a lingering
    // hitstop from the preceding HURT section could otherwise freeze the sprite on "hurt" at read time.
    await page.waitForFunction(() => window.__harness.p1().action === "knockdown", null, { timeout: 4000, polling: 16 }).catch(() => {});
    const kd = await p1();
    check("SSJ knockdown renders vegeta_ssj_knock_down sheet", (kd.spriteSheet || "").includes("vegeta_ssj_knock_down") && kd.action === "knockdown", `action=${kd.action} sheet=${kd.spriteSheet}`);
    check("SSJ knockdown NOT the fallback box", !isFallback(kd), `sheet=${kd.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VGS_knockdown.png") });
    // let the knockdown fully clear back to idle (knockdown→getup→idle) before the revert test
    await page.waitForFunction(() => window.__harness.p1().action === "idle", null, { timeout: 5000, polling: 16 }).catch(() => {});
  }

  // ── DRAIN + AUTO-REVERT ───────────────────────────────────────────────────
  section("SSJ energy drain → instant auto-revert at 0");
  {
    await topUp();
    let stillUp = await form();
    check("SSJ still active before drain test", stillUp.ssjActive, `active=${stillUp.ssjActive}`);
    // starve the meter → the per-frame drain hook must revert on the next tick
    await page.evaluate(() => window.__harness.setP1Energy(0.05));
    await waitFrames(3);
    const reverted = await form();
    check("auto-reverted to BASE at empty meter", !reverted.ssjActive && reverted.form === "base", `form=${reverted.form} active=${reverted.ssjActive}`);
    check("reverted stats back to base (dmg 1.0)", Math.abs(reverted.dmgMult - 1.0) < 0.001, `dmgMult=${reverted.dmgMult}`);
    check("reverted clears the skin anim (base art restored)", !reverted.hasSkinAnim, `hasSkinAnim=${reverted.hasSkinAnim}`);
    const idle = await p1();
    check("base art restored after revert (vegeta_base_idle)", (idle.spriteSheet || "").includes("vegeta_base_idle"), `sheet=${idle.spriteSheet}`);
  }

  // ── MANDATORY-WAYPOINT CHAIN (the SSJ Blue prerequisite seam) ─────────────
  section("MANDATORY WAYPOINT — Blue's prerequisite seam fires SSJ as a real intermediate step");
  {
    await releaseAll();
    await topUp();
    const base0 = await form();
    check("in BASE form to start", !base0.ssjActive, `form=${base0.form}`);
    // Simulate the future Blue activation: it MUST route through ensureVegetaSSJWaypoint FIRST.
    const w = await page.evaluate(() => window.__harness.vegetaForm("waypoint"));
    check("waypoint seam ENTERED SSJ as the intermediate step", w.ssjActive && w.form === "vegetaSSJ", `form=${w.form} active=${w.ssjActive}`);
    check("waypoint recorded it FORCED the SSJ pass-through", w.waypointForced && w.waypointReached, `forced=${w.waypointForced} reached=${w.waypointReached}`);
    check("waypoint pass-through applied the real SSJ skin + buffs", w.hasSkinAnim && Math.abs(w.dmgMult - 1.20) < 0.001, `hasSkinAnim=${w.hasSkinAnim} dmg=${w.dmgMult}`);
    // Calling it again while already SSJ is idempotent (does not re-morph / double-apply).
    const w2 = await page.evaluate(() => window.__harness.vegetaForm("waypoint"));
    check("waypoint is idempotent once SSJ (no re-transform)", w2.ssjActive && w2.form === "vegetaSSJ", `form=${w2.form}`);
  }

  // ── STAGE 3 — COMMAND-NORMAL CHAIN (combo_attack, one continuous string) ──
  section("STAGE 3 command chain — Fwd+Heavy 4-stage rekka renders the SSJ combo_attack sheet");
  {
    await releaseAll(); await waitGrounded(); await ensureSSJ();
    await pinDummy(46); await waitFrames(2);
    const hp0 = (await p2()).health;
    const seen = new Set(); const sheets = new Set(); let shot = false;
    await actionable();
    await page.keyboard.down("d"); await pinDummy(46);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener Fwd+Heavy
    for (let i = 0; i < 220; i++) {
      const s = await vegCmd();
      if (s?.move && s.move.startsWith("vg")) { seen.add(s.move); const sh = (await p1()).spriteSheet || ""; if (sh) sheets.add(sh); }
      if (!shot && (s?.move === "vgUpInto" || s?.move === "vgUpFinish")) { shot = true; await page.screenshot({ path: path.join(OUT, "VGS_chain.png") }); }
      await pinDummy(46);
      if (s && s.rekkaNext && s.phase === "recovery" && s.connected && !s.prevHeavy) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); }
      await waitFrames(1);
      if (seen.has("vgUpFinish")) break;
    }
    await releaseAll();
    check("opener vgFkick1 fires (Fwd+Heavy)", seen.has("vgFkick1"), `seen=${[...seen].join(",")}`);
    check("cancels through vgSidekick → vgUpInto → vgUpFinish", seen.has("vgSidekick") && seen.has("vgUpInto") && seen.has("vgUpFinish"), `seen=${[...seen].join(",")}`);
    check("every stage rendered the SSJ combo_attack sheet (one continuous string)", sheets.size > 0 && [...sheets].every(s => s.includes("vegeta_ssj_combo_attack")), `sheets=${[...sheets].join(",")}`);
    check("full string dealt cumulative damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  section("STAGE 3 command chain INTERRUPT — a whiffed opener does NOT continue");
  {
    await ensureSSJ();
    const me0 = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), me0.x + 360);   // dummy FAR → opener whiffs
    await actionable();
    const seen = new Set();
    await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2);
    await page.keyboard.up("k"); await page.keyboard.up("d");
    for (let i = 0; i < 44; i++) {
      const s = await vegCmd(); if (s?.move && s.move.startsWith("vg")) seen.add(s.move);
      if (s && s.phase === "recovery" && !s.prevHeavy) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); }
      await waitFrames(1);
    }
    await releaseAll();
    check("whiffed opener still fired", seen.has("vgFkick1"), `seen=${[...seen].join(",")}`);
    check("string did NOT advance (interrupt on no-connect)", !seen.has("vgSidekick") && !seen.has("vgUpInto") && !seen.has("vgUpFinish"), `seen=${[...seen].join(",")}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 3 — KOMA RUSH (super_kick_special, auto-chain) ──────────────────
  section("STAGE 3 Koma Rush — Down+Heavy auto-chains komaRush1 → komaFinish on a clean hit");
  {
    await ensureSSJ();
    await pinDummy(44); await waitFrames(2);
    const hp0 = (await p2()).health;
    const seen = new Set(); const sheets = new Set(); let shot = false;
    await actionable();
    await page.keyboard.down("s"); await waitFrames(1);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Down+Heavy
    await page.keyboard.up("s");
    for (let i = 0; i < 80; i++) {
      const s = await vegCmd();
      if (s?.move === "komaRush1" || s?.move === "komaFinish") { seen.add(s.move); const sh = (await p1()).spriteSheet || ""; if (sh) sheets.add(sh); }
      if (!shot && s?.move === "komaFinish") { shot = true; await page.screenshot({ path: path.join(OUT, "VGS_komarush.png") }); }
      await pinDummy(44);
      await waitFrames(1);
      if (seen.has("komaFinish")) break;
    }
    await releaseAll();
    check("Koma Rush opener fires (komaRush1)", seen.has("komaRush1"), `seen=${[...seen].join(",")}`);
    check("auto-chains into komaFinish on clean hit", seen.has("komaFinish"), `seen=${[...seen].join(",")}`);
    check("both stages render the SSJ super_kick sheet (one continuous sequence)", sheets.size > 0 && [...sheets].every(s => s.includes("vegeta_ssj_super_kick")), `sheets=${[...sheets].join(",")}`);
    check("Koma Rush dealt cumulative damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  section("STAGE 3 Koma Rush INTERRUPT — a whiffed opener does not chain to the finisher");
  {
    await ensureSSJ();
    const me0 = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), me0.x + 340);   // dummy FAR → opener whiffs
    await actionable();
    const seen = new Set();
    await page.keyboard.down("s"); await waitFrames(1);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    await page.keyboard.up("s");
    for (let i = 0; i < 60; i++) { const s = await vegCmd(); if (s?.move === "komaRush1" || s?.move === "komaFinish") seen.add(s.move); await waitFrames(1); }
    await releaseAll();
    check("whiffed Koma opener still fired", seen.has("komaRush1"), `seen=${[...seen].join(",")}`);
    check("did NOT auto-chain to komaFinish (interrupt on whiff)", !seen.has("komaFinish"), `seen=${[...seen].join(",")}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 3 — KOMA REPEATABLE (Down+Light, reuses base art) ───────────────
  section("STAGE 3 Koma Repeatable — Down+Light connects (reuses base koma_attack_repeatabl art)");
  {
    await ensureSSJ();
    await pinDummy(44); await waitFrames(2);
    const hp0 = (await p2()).health;
    await actionable();
    let seen = false, sheet = "";
    await page.keyboard.down("s"); await waitFrames(1);
    await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");   // Down+Light
    await page.keyboard.up("s");
    for (let i = 0; i < 40; i++) { const s = await vegCmd(); if (s?.move === "komaRep") { seen = true; sheet = (await p1()).spriteSheet || ""; await page.screenshot({ path: path.join(OUT, "VGS_komarep.png") }); break; } await waitFrames(1); }
    await releaseAll();
    check("Koma Repeatable fires (komaRep)", seen, `seen=${seen}`);
    check("Koma Repeatable reuses the base koma sheet (merge inheritance)", sheet.includes("vegeta_base_komarep"), `sheet=${sheet}`);
    let dmg = false; for (let i = 0; i < 30 && !dmg; i++) { if ((await p2()).health < hp0) dmg = true; await pinDummy(44); await waitFrames(1); }
    check("Koma Repeatable connects for damage", dmg, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 4 — SPECIALS (gold SSJ Galick / Final Flash / Big Bang) ─────────
  const projectiles = () => page.evaluate(() => window.__harness.projectiles());
  section("STAGE 4 specials — gold Galick Gun / Final Flash (+impact) / Big Bang, above-base damage");
  // Damage thresholds account for GLOBAL_DAMAGE_SCALE (0.60): SSJ 150/250/175 → 90/150/105 dealt,
  // clearly above base's 72/120/84. Thresholds sit between the two.
  for (const [name, motion, projName, sheetFrag, shot, minDmg] of [
    ["Galick Gun (QCF)",  ["s", "d"], "galickGun",  "vegeta_ssj_galick_fx",        "VGS_galick",    85],
    ["Final Flash (QCB)", ["s", "a"], "finalFlash", "vegeta_ssj_finalflash_beam",  "VGS_finalflash",140],
    ["Big Bang (neutral)",[],         "bigBang",    "vegeta_ssj_bigbang_fx",       "VGS_bigbang",   100],
  ]) {
    await releaseAll(); await waitGrounded(); await ensureSSJ();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + (a0.facing === 1 ? 150 : -150));
    await actionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    if (motion.length === 0) await waitFrames(48);   // let stale direction taps age out for the NEUTRAL special
    for (const k of motion) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); }
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let projSeen = false, projSheet = "", sinceProj = -1;
    for (let i = 0; i < 60; i++) {
      const pr = await projectiles(); const hit = pr.find(x => x.name === projName);
      if (hit) { projSeen = true; projSheet = hit.sheet || ""; if (sinceProj < 0) sinceProj = 0; }
      if (sinceProj >= 0) { sinceProj++; if (sinceProj === 6) { await page.screenshot({ path: path.join(OUT, `${shot}.png`) }); break; } }
      await waitFrames(1);
    }
    check(`${name} spent energy (SSJ cost)`, (await p1()).energy < e0, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    check(`${name} spawns its projectile`, projSeen, `sawProj=${projSeen}`);
    check(`${name} uses the gold SSJ FX sheet`, projSheet.includes(sheetFrag), `sheet=${projSheet}`);
    // Watch damage AND (for Final Flash) the on-connect impact sheet in the SAME loop, so the
    // impact is observed while it's still alive (lifetime 40) rather than after it decays.
    let dmg = 0, impactSeen = false;
    for (let i = 0; i < 70 && (dmg < minDmg || (projName === "finalFlash" && !impactSeen)); i++) {
      dmg = hp0 - (await p2()).health;
      if (projName === "finalFlash") { const pr = await projectiles(); if (pr.some(x => (x.sheet || "").includes("finalflash_impact"))) impactSeen = true; }
      await waitFrames(1);
    }
    check(`${name} connects for above-base damage (≥${minDmg})`, dmg >= minDmg, `−${dmg}`);
    if (projName === "finalFlash") check("Final Flash impact explosion fires ON CONNECT (not at cast)", impactSeen, `impact=${impactSeen}`);
    await releaseAll(); await waitGrounded(); await waitFrames(6);
  }

  // ── STAGE 5 — ULTIMATE (Overcharged Final Flash, SSJ overcharge) ──────────
  section("STAGE 5 ultimate — Overcharged Final Flash freeze cinematic, SSJ overcharge damage");
  {
    await releaseAll(); await waitGrounded(); await ensureSSJ();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + (a0.facing === 1 ? 150 : -150));
    await actionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    const cine = () => page.evaluate(() => window.__harness.vegetaUltCine());
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    let active = false, struck = false, shot = false; const phases = new Set();
    for (let i = 0; i < 240; i++) {
      const c = await cine();
      if (c.active) active = true;
      if (c.phase) phases.add(c.phase);
      if (c.struck) struck = true;
      if (c.phase === "fire" && c.struck && !shot) { shot = true; await page.screenshot({ path: path.join(OUT, "VGS_ultimate.png") }); }
      if (active && !c.active) break;
      await waitFrames(1);
    }
    check("ultimate activates the freeze cinematic (reused architecture)", active, `active=${active}`);
    check("cinematic runs windup → fire → settle", phases.has("windup") && phases.has("fire") && phases.has("settle"), `phases=${[...phases].join(",")}`);
    check("beam CONNECTS at the impact beat (struck)", struck, `struck=${struck}`);
    check("near-max meter cost (~100)", (e0 - (await p1()).energy) >= 95, `spent ${(e0 - (await p1()).energy).toFixed(0)}`);
    check("SSJ OVERCHARGE damage clearly above base ult (≥400)", (hp0 - (await p2()).health) >= 400, `−${(hp0 - (await p2()).health)}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 5 — SSJ-EXCLUSIVE bonus specials ────────────────────────────────
  section("STAGE 5 Self-Destruct — B→F special, engulfs Vegeta (self_explosion), big proximity AOE");
  {
    await ensureSSJ();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + (a0.facing === 1 ? 70 : -70));   // inside blast radius
    await actionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    const back = a0.facing === 1 ? "a" : "d", fwd = a0.facing === 1 ? "d" : "a";
    await page.keyboard.down(back); await waitFrames(1); await page.keyboard.up(back);   // B
    await page.keyboard.down(fwd);  await waitFrames(1); await page.keyboard.up(fwd);    // →F
    await page.keyboard.down("l");  await waitFrames(2); await page.keyboard.up("l");    // Special
    let seen = false, sheet = "";
    for (let i = 0; i < 30; i++) { const p = await p1(); if (p.action === "selfDestruct") { seen = true; sheet = p.spriteSheet || ""; await waitFrames(12); await page.screenshot({ path: path.join(OUT, "VGS_selfdestruct.png") }); break; } await waitFrames(1); }
    await releaseAll();
    check("Self-Destruct fires + renders self_explosion", seen && sheet.includes("vegeta_ssj_self_explosion"), `action-sheet=${sheet}`);
    check("Self-Destruct spent its big energy cost", (await p1()).energy < e0 - 50, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    check("Self-Destruct dealt big proximity AOE damage", (hp0 - (await p2()).health) >= 150, `−${(hp0 - (await p2()).health)}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  section("STAGE 5 Diagonal Galick Gun — F→B special (its own input), downward-angled gold beam connects");
  {
    await ensureSSJ();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + (a0.facing === 1 ? 100 : -100));
    await actionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    const back = a0.facing === 1 ? "a" : "d", fwd = a0.facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd);  await waitFrames(1); await page.keyboard.up(fwd);    // F
    await page.keyboard.down(back); await waitFrames(1); await page.keyboard.up(back);   // →B
    await page.keyboard.down("l");  await waitFrames(2); await page.keyboard.up("l");
    let castSeen = false, projSeen = false, projSheet = "", sinceProj = -1;
    for (let i = 0; i < 60; i++) {
      const p = await p1(); if (p.action === "diagGalickCast") castSeen = true;
      const pr = await projectiles(); const hit = pr.find(x => x.name === "diagGalick");
      if (hit) { projSeen = true; projSheet = hit.sheet || ""; if (sinceProj < 0) sinceProj = 0; }
      if (sinceProj >= 0) { sinceProj++; if (sinceProj === 8) { await page.screenshot({ path: path.join(OUT, "VGS_diaggalick.png") }); } }
      await waitFrames(1);
    }
    check("Diagonal Galick plays its own cast pose (diagGalickCast)", castSeen, `cast=${castSeen}`);
    check("Diagonal Galick spawns its own diagonal beam", projSeen && projSheet.includes("vegeta_ssj_diag_galick_fx"), `sheet=${projSheet}`);
    check("Diagonal Galick spent energy (distinct from the D→F Galick)", (await p1()).energy < e0, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    let dmg = 0; for (let i = 0; i < 50 && dmg < 70; i++) { dmg = hp0 - (await p2()).health; await waitFrames(1); }
    check("Diagonal Galick connects for damage", dmg >= 70, `−${dmg}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 6 — 3-TIER UP-ATTACK (re-press escalation) ──────────────────────
  section("STAGE 6 up-attack tiers — UP escalates T1→T2→T3 on re-press, each its own SSJ sheet");
  {
    await releaseAll(); await waitGrounded(); await ensureSSJ();
    await pinDummy(46); await waitFrames(2); await actionable();
    const seen = new Set(); const sheets = {};
    await page.keyboard.down("i"); await waitFrames(2); await page.keyboard.up("i");   // T1 opener (tap)
    for (let i = 0; i < 140; i++) {
      const s = await vegCmd();
      if (s?.move && s.move.startsWith("vgUpT")) { seen.add(s.move); sheets[s.move] = (await p1()).spriteSheet || ""; }
      await pinDummy(46);
      if (s && s.phase === "recovery" && (s.move === "vgUpT1" || s.move === "vgUpT2")) { await page.keyboard.down("i"); await waitFrames(2); await page.keyboard.up("i"); }
      await waitFrames(1);
      if (seen.has("vgUpT3")) { await page.screenshot({ path: path.join(OUT, "VGS_uptiers.png") }); break; }
    }
    await releaseAll();
    check("tier 1 (tap) fires — vgUpT1 (up_attack)", seen.has("vgUpT1"), `seen=${[...seen].join(",")}`);
    check("tier 2 (2nd press) fires — vgUpT2 (up_attack_special)", seen.has("vgUpT2") && (sheets.vgUpT2 || "").includes("vegeta_ssj_up_special"), `sheet=${sheets.vgUpT2}`);
    check("tier 3 (super) fires — vgUpT3 (super_up_attack, launcher)", seen.has("vgUpT3") && (sheets.vgUpT3 || "").includes("vegeta_ssj_super_up"), `sheet=${sheets.vgUpT3}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  // ── STAGE 6 — NO-FALLBACK SWEEP: every SSJ action resolves to REAL art (never the 128² box) ──
  section("STAGE 6 no-fallback sweep — every SSJ action key resolves to a real sheet");
  {
    await ensureSSJ();
    const ALL = ["idle","walk","run","dash","back_dash","jump","fall","guard","hurt","knockdown","getup","transform",
      "light","heavy","up","air","down_air","charge","galickCast","bigBangCast","kiBlast","launchKi","exKi",
      "vgFkick1","vgSidekick","vgUpInto","vgUpFinish","komaRush1","komaFinish","komaRep",
      "selfDestruct","diagGalickCast","vgUpT1","vgUpT2","vgUpT3","intro","intro2"];
    const dump = await page.evaluate(keys => window.__harness.skinAnimDump(keys), ALL);
    const missing = dump.entries.filter(e => !e.sheet || /128/.test(String(e.sheet)));
    check("SSJ _skinAnim is live", dump.has, `has=${dump.has}`);
    check(`ALL ${ALL.length} SSJ actions resolve to a real sheet (no 128² fallback)`, missing.length === 0, missing.length ? `missing: ${missing.map(m => m.k).join(",")}` : `all ${ALL.length} OK`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("FATAL", e);
  try { await page.screenshot({ path: path.join(OUT, "VGS_ERROR.png") }); } catch {}
  FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  VEGETA SSJ (full kit): ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL ? 1 : 0);
}
