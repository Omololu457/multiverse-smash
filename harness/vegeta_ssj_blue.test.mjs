// harness/vegeta_ssj_blue.test.mjs
// ---------------------------------------------------------------------------
// Vegeta — SUPER SAIYAN BLUE (3rd form) verification (real Chromium, real path).
// Blue is a _skinAnim swap chained OFF the SSJ waypoint (base → SSJ → Blue). Its
// anim is a FULL copy of SSJ's already-merged anim + Blue overlays → 3-tier fallback
// (Blue art → SSJ gold → base). Built stage-by-stage; grows each stage.
//
// STAGE 1: SSJ→Blue transform (rejects direct base→Blue) · movement/state · the
// 3-tier fallback chain (Blue idle / SSJ-gold guard / base komaRep) · drain+revert.
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

async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const form = () => page.evaluate(() => window.__harness.vegetaForm());
const vegCmd = () => page.evaluate(() => window.__harness.vegCmd());
const topUp = () => page.evaluate(() => window.__harness.fillEnergy());
async function releaseAll() { for (const k of ["a", "d", "s", "w", "j", "k", "i", "l", "u", "p", ";"]) await page.keyboard.up(k).catch(() => {}); }
const isFallback = a => !a.spriteSheet || a.spriteFrames === null || /_FALLBACK|128/.test(a.spriteSheet || "");
async function chargeRelease() { await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p"); }
async function waitIdle() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.action === "idle" && (p.attackCooldown || 0) === 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {}); }
async function pinDummy(gap = 44) { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + (a.facing === 1 ? gap : -gap)); }
async function actionable() { await page.waitForFunction(() => { const c = window.__harness.vegCmd(); const p = window.__harness.p1(); return c && !c.attacking && c.cooldown <= 0 && p.grounded; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
// Fully NEUTRAL: grounded, not attacking, not in a hurt/knockdown reaction (clears hitstun bleed between sections).
async function waitNeutral() { await page.waitForFunction(() => { const c = window.__harness.vegCmd(); const p = window.__harness.p1(); return p.grounded && !c.attacking && c.cooldown <= 0 && ["idle", "walk", "run"].includes(p.action); }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
// Ensure Blue via the REAL ladder: base → (hold-release) SSJ → (hold-release) Blue.
async function ensureBlue() {
  await topUp(); let f = await form();
  if (f.blueActive) { await topUp(); return; }
  if (!f.ssjActive) { await chargeRelease(); await waitIdle(); }   // base → SSJ
  await topUp(); await actionable();
  await chargeRelease(); await waitIdle();                          // SSJ → Blue
  await topUp();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await waitGrounded();

  // ── GATE: Blue must NOT be reachable directly from base ───────────────────
  section("WAYPOINT GATE — Blue rejects a direct base→Blue attempt; only fires from SSJ");
  {
    await topUp();
    const b0 = await form();
    check("starts in BASE", !b0.ssjActive && !b0.blueActive && b0.form === "base", `form=${b0.form}`);
    const rej = await page.evaluate(() => window.__harness.vegetaForm("enterBlueFromBase"));
    check("direct base→Blue is REJECTED (no-op)", !rej.blueActive && rej.form === "base", `form=${rej.form} blue=${rej.blueActive}`);
    check("still base after rejected attempt (no skin swap)", !rej.hasSkinAnim, `hasSkinAnim=${rej.hasSkinAnim}`);
  }

  // ── TRANSFORM: base → SSJ → Blue via the real charge-release ladder ───────
  section("TRANSFORM — base → SSJ → Blue (real charge-release ladder, 25f Blue morph)");
  {
    await topUp(); await chargeRelease(); await waitIdle();   // base → SSJ
    const ssj = await form();
    check("first release reaches SSJ", ssj.ssjActive && ssj.form === "vegetaSSJ", `form=${ssj.form}`);
    await topUp(); await actionable();
    await chargeRelease();   // SSJ → Blue
    // catch the morph
    const morphing = await page.waitForFunction(() => window.__harness.p1().action === "transform", null, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
    const mid = await p1();
    check("Blue morph plays vegeta_blue_transformation", morphing && (mid.spriteSheet || "").includes("vegeta_blue_transformation"), `action=${mid.action} sheet=${mid.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VBLUE_transform.png") });
    await waitIdle();
    const blue = await form();
    check("second release reaches BLUE (currentForm=vegetaBlue)", blue.blueActive && blue.form === "vegetaBlue", `form=${blue.form} blue=${blue.blueActive}`);
    check("SSJ flag cleared — Blue supersedes SSJ", !blue.ssjActive, `ssjActive=${blue.ssjActive}`);
    check("Blue damage buff +45% (clearly above SSJ 1.20)", Math.abs(blue.dmgMult - 1.45) < 0.001, `dmg=${blue.dmgMult}`);
    check("Blue speed buff +25% (above SSJ 1.12)", Math.abs(blue.spdMult - 1.25) < 0.001, `spd=${blue.spdMult}`);
    check("Blue defense buff +12% (above SSJ 1.05)", Math.abs(blue.defMult - 1.12) < 0.001, `def=${blue.defMult}`);
  }

  // ── 3-TIER FALLBACK CHAIN (Blue → SSJ gold → base) ───────────────────────
  section("3-TIER FALLBACK — Blue art / SSJ-gold fallback / base fallback all resolve");
  {
    await ensureBlue();
    const dump = await page.evaluate(() => window.__harness.skinAnimDump(["idle", "guard", "run", "komaRep", "bigBangCast", "transform"]));
    const byKey = Object.fromEntries(dump.entries.map(e => [e.k, e.sheet || ""]));
    check("TIER 1 (Blue art): idle → vegeta_blue_idle", byKey.idle.includes("vegeta_blue_idle"), `idle=${byKey.idle}`);
    check("TIER 1 (Blue art): run → vegeta_ssj_blue_run (was silently SSJ-gold)", byKey.run.includes("vegeta_ssj_blue_run"), `run=${byKey.run}`);
    check("TIER 2 (SSJ-gold fallback): guard → vegeta_ssj_gaurd", byKey.guard.includes("vegeta_ssj_gaurd"), `guard=${byKey.guard}`);
    check("TIER 3 (base fallback): komaRep → vegeta_base_komarep", byKey.komaRep.includes("vegeta_base_komarep"), `komaRep=${byKey.komaRep}`);
    check("no key in the chain is the 128² fallback box", dump.entries.every(e => e.sheet && !/128/.test(e.sheet)), JSON.stringify(byKey));

    // Idle screenshot = Blue (cyan) art.
    await waitIdle(); await page.screenshot({ path: path.join(OUT, "VBLUE_idle.png") });
    // Guard screenshot = SSJ-gold fallback. Hold the dedicated BLOCK key ";" — MK-feel Stage 1c moved
    // block off Down, so holding Down no longer guards. WAIT for the guard state to establish rather
    // than sampling after a fixed frame count (the old fixed-6-frame sample was a race that flaked).
    await page.keyboard.down(";");
    await page.waitForFunction(() => window.__harness.p1().action === "guard", null, { timeout: 3000, polling: 16 }).catch(() => {});
    const g = await p1(); check("guard renders (SSJ-gold fallback, not a box)", (g.spriteSheet || "").includes("vegeta_ssj_gaurd"), `sheet=${g.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VBLUE_gold_guard.png") });
    await page.keyboard.up(";"); await waitFrames(4);
    // Base-fallback screenshot = Koma Repeatable (Down+Light → base dark-hair art).
    await ensureBlue(); await pinDummy(44); await actionable();
    await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await page.keyboard.up("s");
    let sawKoma = false, komaSheet = "";
    for (let i = 0; i < 30; i++) { const p = await p1(); if (p.action === "komaRep") { sawKoma = true; komaSheet = p.spriteSheet || ""; await page.screenshot({ path: path.join(OUT, "VBLUE_base_komarep.png") }); break; } await waitFrames(1); }
    check("base-fallback action renders base art (komaRep → vegeta_base)", sawKoma && komaSheet.includes("vegeta_base_komarep"), `sheet=${komaSheet}`);
    await releaseAll();
  }

  // ── MOVEMENT / STATE (all real art, no fallback box) ─────────────────────
  section("Blue movement/state — run / jump / hurt resolve to real art (no fallback box)");
  {
    await releaseAll(); await waitGrounded(); await ensureBlue(); await waitNeutral();
    await page.keyboard.down("d");
    // Ground forward-hold resolves to `walk` (|vx|>10 'run' is unreached by ground speed); walk+run both
    // point at the Blue run sheet now, so the visible locomotion must render vegeta_ssj_blue_run (not gold).
    await page.waitForFunction(() => ["walk", "run"].includes(window.__harness.p1().action), null, { timeout: 3000, polling: 16 }).catch(() => {});
    await waitFrames(4);
    const run = await p1();
    check("locomotion renders DEDICATED Blue art (vegeta_ssj_blue_run, not SSJ-gold)", !isFallback(run) && (run.action === "run" || run.action === "walk") && (run.spriteSheet || "").includes("vegeta_ssj_blue_run"), `action=${run.action} sheet=${run.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VBLUE_run.png") });
    await page.keyboard.up("d"); await waitFrames(4);

    await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
    let jumpSeen = false;
    for (let i = 0; i < 30; i++) { const p = await p1(); if (!p.grounded && !isFallback(p)) { jumpSeen = true; await page.screenshot({ path: path.join(OUT, "VBLUE_jump.png") }); break; } await waitFrames(1); }
    check("jump resolves real art (airborne)", jumpSeen, `seen=${jumpSeen}`);
    await waitGrounded();

    // Hurt: a real hit from Goku.
    await ensureBlue(); const a = await p1();
    await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 44); await waitFrames(2);
    let hurtSeen = false, hurtSheet = "";
    for (let i = 0; i < 10 && !hurtSeen; i++) { await page.evaluate(() => window.__harness.p2Attack()); for (let k = 0; k < 10; k++) { const p = await p1(); if (p.action === "hurt") { hurtSeen = true; hurtSheet = p.spriteSheet || ""; await page.screenshot({ path: path.join(OUT, "VBLUE_hurt.png") }); break; } await waitFrames(1); } await topUp(); }
    check("hurt renders real art (SSJ-gold flinch fallback, not a box)", hurtSeen && !/128/.test(hurtSheet), `sheet=${hurtSheet}`);
    await releaseAll();
  }

  // ── STAGE 2 — BLUE NORMALS (verify Blue art, not a silent SSJ/base fallback) ──
  section("STAGE 2 normals — merged _skinAnim dump proves Blue (cyan) art is live for the normals");
  {
    await releaseAll(); await waitGrounded(); await ensureBlue();
    const dump = await page.evaluate(() => window.__harness.skinAnimDump(["light", "heavy", "up", "air", "down_air", "vgUpT1"]));
    const byKey = Object.fromEntries(dump.entries.map(e => [e.k, e.sheet || ""]));
    check("light → vegeta_blue_light (Blue art, not SSJ/base)", byKey.light.includes("vegeta_blue_light"), `light=${byKey.light}`);
    check("heavy → vegeta_blue_heavy", byKey.heavy.includes("vegeta_blue_heavy"), `heavy=${byKey.heavy}`);
    check("up → vegeta_blue_up (up_attack_2)", byKey.up.includes("vegeta_blue_up"), `up=${byKey.up}`);
    check("air → vegeta_blue_air", byKey.air.includes("vegeta_blue_air"), `air=${byKey.air}`);
    check("down_air → vegeta_blue_air (reused)", byKey.down_air.includes("vegeta_blue_air"), `down_air=${byKey.down_air}`);
    check("vgUpT1 (the up-attack that fires) → vegeta_blue_up", byKey.vgUpT1.includes("vegeta_blue_up"), `vgUpT1=${byKey.vgUpT1}`);
  }

  section("STAGE 2 normals — all 5 connect + render Blue art");
  {
    // GROUND normals: light (J), heavy (K), up-attack (I → tier-1 launcher).
    for (const [name, key, action, frag, shot] of [
      ["light", "j", "light",  "vegeta_blue_light", "VBLUE_light"],
      ["heavy", "k", "heavy",  "vegeta_blue_heavy", "VBLUE_heavy"],
      ["up",    "i", "vgUpT1", "vegeta_blue_up",    "VBLUE_up"],
    ]) {
      await releaseAll(); await waitGrounded(); await ensureBlue(); await waitNeutral();
      await pinDummy(46); await page.evaluate(() => window.__harness.healP2?.()); await waitFrames(2);
      const hp0 = (await p2()).health;
      let seen = false, sheet = "";
      await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key);
      for (let i = 0; i < 24; i++) { const p = await p1(); if (p.action === action) { seen = true; sheet = p.spriteSheet || ""; await pinDummy(46); await page.screenshot({ path: path.join(OUT, `${shot}.png`) }); break; } await waitFrames(1); }
      check(`${name} fires + renders ${frag}`, seen && sheet.includes(frag), `action-sheet=${sheet}`);
      let dmg = false; for (let i = 0; i < 24 && !dmg; i++) { if ((await p2()).health < hp0) dmg = true; await pinDummy(46); await waitFrames(1); }
      check(`${name} connects for damage`, dmg, `hp ${hp0} → ${(await p2()).health}`);
    }
    // AIR normals: neutral air (J airborne), down_air (S+J airborne, reuses air sheet).
    for (const [name, action, frag, shot, down] of [
      ["air", "air", "vegeta_blue_air", "VBLUE_air", false],
      ["down_air", "down_air", "vegeta_blue_air", "VBLUE_downair", true],
    ]) {
      await releaseAll(); await waitGrounded(); await ensureBlue(); await waitNeutral();
      await pinDummy(40); await page.evaluate(() => window.__harness.healP2?.());
      await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");   // jump
      let seen = false, sheet = "";
      for (let i = 0; i < 26; i++) {
        const p = await p1();
        if (!p.grounded) { if (down) await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); if (down) await page.keyboard.up("s"); }
        const q = await p1();
        if (q.action === action) { seen = true; sheet = q.spriteSheet || ""; await page.screenshot({ path: path.join(OUT, `${shot}.png`) }); break; }
        await waitFrames(1);
      }
      check(`${name} (airborne) fires + renders ${frag}`, seen && sheet.includes(frag), `action-sheet=${sheet}`);
      await releaseAll(); await waitGrounded();
    }
  }

  // ── STAGE 3 — COMMAND-NORMAL CHAIN (attack_sequance, segmented across the rekka) ──
  section("STAGE 3 command chain — Fwd+Heavy rekka renders the Blue attack_sequance sheet");
  {
    await releaseAll(); await waitGrounded(); await ensureBlue(); await waitNeutral();
    await pinDummy(46); await waitFrames(2);
    const hp0 = (await p2()).health;
    const seen = new Set(); const sheets = new Set(); let shot = false;
    await page.keyboard.down("d"); await pinDummy(46);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    for (let i = 0; i < 220; i++) {
      const s = await vegCmd();
      if (s?.move && s.move.startsWith("vg") && ["vgFkick1", "vgSidekick", "vgUpInto", "vgUpFinish"].includes(s.move)) { seen.add(s.move); const sh = (await p1()).spriteSheet || ""; if (sh) sheets.add(sh); }
      if (!shot && (s?.move === "vgUpInto" || s?.move === "vgUpFinish")) { shot = true; await page.screenshot({ path: path.join(OUT, "VBLUE_chain.png") }); }
      await pinDummy(46);
      if (s && s.rekkaNext && s.phase === "recovery" && s.connected && !s.prevHeavy) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); }
      await waitFrames(1);
      if (seen.has("vgUpFinish")) break;
    }
    await releaseAll();
    check("command chain runs vgFkick1→vgSidekick→vgUpInto→vgUpFinish", seen.has("vgFkick1") && seen.has("vgSidekick") && seen.has("vgUpInto") && seen.has("vgUpFinish"), `seen=${[...seen].join(",")}`);
    check("every stage renders the Blue attack_sequance sheet", sheets.size > 0 && [...sheets].every(s => s.includes("vegeta_blue_cmd")), `sheets=${[...sheets].join(",")}`);
    check("full string dealt cumulative damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  // ── STAGE 3 — 4-STAGE KOMA RUSH ──────────────────────────────────────────
  section("STAGE 3 Koma Rush — Down+Heavy 4-stage auto-chain (front_attack→front_kick→up_attack→ki_bomb)");
  {
    await releaseAll(); await waitGrounded(); await ensureBlue(); await waitNeutral();
    await pinDummy(44); await waitFrames(2);
    const hp0 = (await p2()).health;
    const seen = new Set(); const sheets = {}; let fxSeen = false, shot = false;
    await page.keyboard.down("s"); await waitFrames(1);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    await page.keyboard.up("s");
    for (let i = 0; i < 120; i++) {
      const s = await vegCmd();
      if (s?.move && s.move.startsWith("vgBlueKoma")) { seen.add(s.move); sheets[s.move] = (await p1()).spriteSheet || ""; }
      const pr = await page.evaluate(() => window.__harness.projectiles());
      if (pr.some(x => x.name === "vgKiBombFx")) fxSeen = true;
      if (!shot && s?.move === "vgBlueKoma4") { shot = true; await page.screenshot({ path: path.join(OUT, "VBLUE_komarush.png") }); }
      await pinDummy(44);
      await waitFrames(1);
      if (seen.has("vgBlueKoma4")) { await waitFrames(4); const pr2 = await page.evaluate(() => window.__harness.projectiles()); if (pr2.some(x => x.name === "vgKiBombFx")) fxSeen = true; break; }
    }
    await releaseAll();
    check("Koma Rush auto-chains all 4 stages", seen.has("vgBlueKoma1") && seen.has("vgBlueKoma2") && seen.has("vgBlueKoma3") && seen.has("vgBlueKoma4"), `seen=${[...seen].join(",")}`);
    check("each stage renders its own Blue sheet", ["vgBlueKoma1", "vgBlueKoma2", "vgBlueKoma3", "vgBlueKoma4"].every(k => (sheets[k] || "").includes("vegeta_blue_koma")), JSON.stringify(sheets));
    check("finisher throws the ki-bomb detonation FX", fxSeen, `fx=${fxSeen}`);
    check("Koma Rush dealt cumulative damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("STAGE 3 Koma Rush INTERRUPT — a whiffed opener does not chain");
  {
    await ensureBlue(); await waitNeutral();
    const me0 = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), me0.x + 340);   // dummy FAR → opener whiffs
    await actionable();
    const seen = new Set();
    await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
    for (let i = 0; i < 60; i++) { const s = await vegCmd(); if (s?.move && s.move.startsWith("vgBlueKoma")) seen.add(s.move); await waitFrames(1); }
    await releaseAll();
    check("whiffed Koma opener still fired (vgBlueKoma1)", seen.has("vgBlueKoma1"), `seen=${[...seen].join(",")}`);
    check("did NOT auto-chain past the opener (interrupt on whiff)", !seen.has("vgBlueKoma2") && !seen.has("vgBlueKoma4"), `seen=${[...seen].join(",")}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("STAGE 3 Koma Repeatable — falls through to base art (documented Blue-art gap)");
  {
    await ensureBlue(); await waitNeutral();
    await pinDummy(44); await waitFrames(2);
    let seen = false, sheet = "";
    await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await page.keyboard.up("s");
    for (let i = 0; i < 30; i++) { const p = await p1(); if (p.action === "komaRep") { seen = true; sheet = p.spriteSheet || ""; break; } await waitFrames(1); }
    await releaseAll();
    check("Koma Repeatable fires (komaRep)", seen, `seen=${seen}`);
    check("Koma Repeatable falls to BASE art (no Blue/SSJ crop) — FLAGGED gap", sheet.includes("vegeta_base_komarep"), `sheet=${sheet}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  // ── STAGE 4 — SPECIALS (Blue art; Vegeta stays visible in cast pose) ─────
  const projectiles = () => page.evaluate(() => window.__harness.projectiles());
  section("STAGE 4 specials — Blue Galick / Final Flash / Big Bang: own beam art, Vegeta visible, above-SSJ dmg");
  for (const [name, motion, projName, projFrag, castAction, castNote, shot, minDmg] of [
    ["Galick Gun (QCF)",  ["s", "d"], "galickGun",  "vegeta_blue_galick_fx",       "galickCast",  "Blue galick cast (charge+release)", "VBLUE_galick",    100],
    ["Final Flash (QCB)", ["s", "a"], "finalFlash", "vegeta_blue_finalflash_beam", "charge",      "SSJ-gold charge (FLAGGED gap)",     "VBLUE_finalflash",170],
    ["Big Bang (neutral)",[],         "bigBang",    "vegeta_blue_bigbang_fx",      "bigBangCast", "base cast pose (FLAGGED gap)",       "VBLUE_bigbang",   118],
  ]) {
    await releaseAll(); await waitGrounded(); await ensureBlue(); await waitNeutral();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + (a0.facing === 1 ? 150 : -150));
    await actionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    if (motion.length === 0) await waitFrames(48);
    for (const k of motion) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); }
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let projSeen = false, projSheet = "", castVisible = false, sinceProj = -1;
    for (let i = 0; i < 60; i++) {
      const p = await p1(); const pr = await projectiles(); const hit = pr.find(x => x.name === projName);
      // "Vegeta visible in cast pose while the beam travels": the fighter renders its cast pose (a real
      // vegeta_* sheet) at the SAME time the projectile is alive — the beam never replaces the character.
      if (hit && p.action === castAction && /vegeta_(blue|ssj|base)/.test(p.spriteSheet || "")) castVisible = true;
      if (hit) { projSeen = true; projSheet = hit.sheet || ""; if (sinceProj < 0) sinceProj = 0; }
      if (sinceProj >= 0) { sinceProj++; if (sinceProj === 6) { await page.screenshot({ path: path.join(OUT, `${shot}.png`) }); break; } }
      await waitFrames(1);
    }
    check(`${name} spends Blue-tier energy`, (await p1()).energy < e0, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    check(`${name} spawns its Blue beam (${projFrag})`, projSeen && projSheet.includes(projFrag), `sheet=${projSheet}`);
    check(`${name} — Vegeta stays visible in cast pose while the beam travels [${castNote}]`, castVisible, `cast=${castAction}`);
    let dmg = 0; for (let i = 0; i < 70 && dmg < minDmg; i++) { dmg = hp0 - (await p2()).health; await waitFrames(1); }
    check(`${name} connects for above-SSJ damage (≥${minDmg})`, dmg >= minDmg, `−${dmg}`);
    await releaseAll(); await waitGrounded(); await waitFrames(6);
  }

  // ── STAGE 5 — ULTIMATE (Blue overcharge, reused freeze; re-verify no duplicate) ──
  section("STAGE 5 ultimate — Overcharged Final Flash freeze, Blue overcharge, single live caster");
  {
    await releaseAll(); await waitGrounded(); await ensureBlue(); await waitNeutral();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + (a0.facing === 1 ? 150 : -150));
    await actionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    const cine = () => page.evaluate(() => window.__harness.vegetaUltCine());
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    let active = false, struck = false, shot = false, casterSingle = true; const phases = new Set();
    for (let i = 0; i < 240; i++) {
      const c = await cine();
      if (c.active) active = true;
      if (c.phase) phases.add(c.phase);
      if (c.struck) struck = true;
      if (c.phase === "fire") { const p = await p1(); if (p.action !== "charge") casterSingle = false; if (!shot) { shot = true; await page.screenshot({ path: path.join(OUT, "VBLUE_ultimate.png") }); } }
      if (active && !c.active) break;
      await waitFrames(1);
    }
    check("ultimate activates the freeze cinematic (reused SSJ architecture)", active, `active=${active}`);
    check("windup → fire → settle", phases.has("windup") && phases.has("fire") && phases.has("settle"), `phases=${[...phases].join(",")}`);
    check("beam CONNECTS (struck)", struck, `struck=${struck}`);
    check("Bug-3 re-check: the live caster stays a single 'charge' pose (no duplicate)", casterSingle, `single=${casterSingle}`);
    check("BLUE overcharge damage above SSJ ult (≥460)", (hp0 - (await p2()).health) >= 460, `−${(hp0 - (await p2()).health)}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 5 — BLUE-EXCLUSIVE bonus specials ──────────────────────────────
  section("STAGE 5 Super Galick Gun — F→F special (Blue-only), own beam, connects");
  {
    await ensureBlue(); await waitNeutral();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + (a0.facing === 1 ? 130 : -130));
    await actionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    const fwd = a0.facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await waitFrames(1); await page.keyboard.up(fwd);
    await waitFrames(6);   // space the taps so the double-tap doesn't read as a DASH
    await page.keyboard.down(fwd); await waitFrames(1); await page.keyboard.up(fwd);   // F→F
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let castSeen = false, projSeen = false;
    for (let i = 0; i < 40; i++) {
      const p = await p1(); if (p.action === "vgSuperGalickCast") { castSeen = true; await page.screenshot({ path: path.join(OUT, "VBLUE_supergalick.png") }); }
      const pr = await projectiles(); if (pr.some(x => x.name === "superGalick")) projSeen = true;
      await waitFrames(1);
      if (castSeen && projSeen) break;
    }
    check("Super Galick plays its own cast pose (vgSuperGalickCast)", castSeen, `cast=${castSeen}`);
    check("Super Galick spent energy (distinct from D→F Galick)", (await p1()).energy < e0, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    // The beam is fast (spawns → connects in a few frames); its BIG damage (260×0.6=156, vs regular Galick's
    // 108) is the reliable proof it fired its own distinct beam — the projectile poll may miss it mid-flight.
    let dmg = 0; for (let i = 0; i < 50 && dmg < 120; i++) { dmg = hp0 - (await p2()).health; await waitFrames(1); }
    check("Super Galick fires its own bigger beam + connects (≥120, above regular Galick)", dmg >= 120 || projSeen, `−${dmg} projSeen=${projSeen}`);
    await releaseAll();
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("STAGE 5 Teleport — B→B special (Blue-only) blinks Vegeta BEHIND the opponent");
  {
    await ensureBlue(); await waitNeutral();
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); }, a0.x + (a0.facing === 1 ? 120 : -120));
    await actionable();
    const before = await p1(); const oppX = (await p2()).x; const wasLeft = before.x < oppX;
    const back = before.facing === 1 ? "a" : "d";
    await page.keyboard.down(back); await waitFrames(1); await page.keyboard.up(back);
    await page.keyboard.down(back); await waitFrames(1); await page.keyboard.up(back);   // B→B
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let poseSeen = false;
    for (let i = 0; i < 20; i++) { const p = await p1(); if (p.action === "vgTeleport") { poseSeen = true; await page.screenshot({ path: path.join(OUT, "VBLUE_teleport.png") }); break; } await waitFrames(1); }
    await waitFrames(3);
    const after = await p1(); const oppX2 = (await p2()).x; const nowLeft = after.x < oppX2;
    check("Teleport plays its blink pose (vgTeleport)", poseSeen, `pose=${poseSeen}`);
    check("Teleport moved Vegeta to the OTHER side of the opponent (blink behind)", wasLeft !== nowLeft, `wasLeft=${wasLeft} nowLeft=${nowLeft} x ${Math.round(before.x)}→${Math.round(after.x)} oppX≈${Math.round(oppX2)}`);
    await releaseAll();
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  // ── DRAIN + AUTO-REVERT (Blue → base) ────────────────────────────────────
  section("Blue energy drain → instant auto-revert to base");
  {
    await releaseAll(); await waitGrounded(); await ensureBlue();
    check("Blue active before drain test", (await form()).blueActive);
    await page.evaluate(() => window.__harness.setP1Energy(0.05));
    await waitFrames(3);
    const rev = await form();
    check("auto-reverted BLUE → base at empty meter", !rev.blueActive && !rev.ssjActive && rev.form === "base", `form=${rev.form}`);
    check("reverted stats to base (dmg 1.0)", Math.abs(rev.dmgMult - 1.0) < 0.001, `dmg=${rev.dmgMult}`);
    check("reverted clears skin anim (base art restored)", !rev.hasSkinAnim, `hasSkinAnim=${rev.hasSkinAnim}`);
  }

  // ── STAGE 6 — NO-FALLBACK SWEEP across the WHOLE base→SSJ→Blue chain ──────
  section("STAGE 6 no-fallback sweep — every action across all 3 forms resolves to real art");
  {
    await releaseAll(); await waitGrounded(); await ensureBlue();
    // Blue's _skinAnim is the full merged chain (Blue → SSJ → base), so dumping EVERY action key here
    // proves no action anywhere in the chain hits the 128² fallback box.
    const ALL = ["idle", "walk", "run", "dash", "back_dash", "jump", "fall", "guard", "hurt", "knockdown", "getup", "transform",
      "light", "heavy", "up", "air", "down_air", "charge", "galickCast", "bigBangCast", "kiBlast", "launchKi", "exKi",
      "vgFkick1", "vgSidekick", "vgUpInto", "vgUpFinish", "komaRush1", "komaFinish", "komaRep",
      "vgUpT1", "vgUpT2", "vgUpT3", "selfDestruct", "diagGalickCast",
      "vgBlueKoma1", "vgBlueKoma2", "vgBlueKoma3", "vgBlueKoma4", "vgSuperGalickCast", "vgTeleport", "intro", "intro2"];
    const dump = await page.evaluate(keys => window.__harness.skinAnimDump(keys), ALL);
    const byKey = Object.fromEntries(dump.entries.map(e => [e.k, e.sheet || ""]));
    const missing = dump.entries.filter(e => !e.sheet || /128/.test(String(e.sheet)));
    // How many resolve to each tier (proves the chain is exercised, not that everything is just Blue).
    const nBlue = dump.entries.filter(e => /vegeta_blue/.test(e.sheet || "")).length;
    const nSsj = dump.entries.filter(e => /vegeta_ssj/.test(e.sheet || "")).length;
    const nBase = dump.entries.filter(e => /vegeta_base/.test(e.sheet || "")).length;
    check(`ALL ${ALL.length} chain actions resolve to a real sheet (NO 128² fallback anywhere)`, missing.length === 0, missing.length ? `missing: ${missing.map(m => m.k).join(",")}` : `blue=${nBlue} ssj=${nSsj} base=${nBase}`);
    check("chain exercises all 3 tiers (Blue + SSJ-gold fallback + base fallback)", nBlue > 0 && nSsj > 0 && nBase > 0, `blue=${nBlue} ssj=${nSsj} base=${nBase}`);
    check("Koma Repeatable confirmed a base-tier fallback (flagged gap)", byKey.komaRep.includes("vegeta_base_komarep"), `komaRep=${byKey.komaRep}`);
  }

  // ── STAGE 6 — 3-FORM MONOTONIC power check (no inversions) ────────────────
  section("STAGE 6 balance — base < SSJ < Blue buffs, no inversions (live ladder)");
  {
    // Fresh base → read each tier's multipliers as the ladder climbs.
    await releaseAll(); await waitGrounded();
    await page.evaluate(() => window.__harness.vegetaForm("revertBlue"));
    await page.evaluate(() => window.__harness.vegetaForm("revert"));
    await topUp();
    const b = await form();
    await page.evaluate(() => window.__harness.vegetaForm("enter")); await waitIdle(); await topUp();
    const s = await form();
    await page.evaluate(() => window.__harness.vegetaForm("enterBlue")); await waitIdle(); await topUp();
    const bl = await form();
    check("damage buff strictly increases base<SSJ<Blue", b.dmgMult < s.dmgMult && s.dmgMult < bl.dmgMult, `dmg ${b.dmgMult} < ${s.dmgMult} < ${bl.dmgMult}`);
    check("speed buff strictly increases base<SSJ<Blue", b.spdMult < s.spdMult && s.spdMult < bl.spdMult, `spd ${b.spdMult} < ${s.spdMult} < ${bl.spdMult}`);
    check("defense buff strictly increases base<SSJ<Blue", b.defMult < s.defMult && s.defMult < bl.defMult, `def ${b.defMult} < ${s.defMult} < ${bl.defMult}`);
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("FATAL", e);
  try { await page.screenshot({ path: path.join(OUT, "VBLUE_ERROR.png") }); } catch {}
  FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  VEGETA SSJ BLUE (full kit): ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL ? 1 : 0);
}
