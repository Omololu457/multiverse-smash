// harness/vegeta.test.mjs
// ---------------------------------------------------------------------------
// Vegeta (Base Form) — STAGE 1 verification (real Chromium, real code path).
// Proves the box→sprite flip and the core kit that Stage 1 wires:
//   • sprite gate (Vegeta renders as sprites, not a procedural box)
//   • the 5 basic normals connect + damage: light (J), heavy (K), up (I),
//     air (J airborne), down_air (S+J airborne)
//   • movement/state actions resolve: run (forward), walk (backpedal),
//     guard (hold Down), charge (hold P → universal charge-lockout + aura)
//   • two-part intro sequence: _introVariant cycles intro → intro2 (real menu flow)
// DEFERRED (not tested here): command chain, energy specials, ultimate, free pokes.
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
const intro = () => page.evaluate(() => window.__harness.introState());

// Place the dummy just in front of Vegeta and heal it, so each move starts from a clean adjacent state.
async function setupAdjacent(gap = 52) {
  await waitGrounded();
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap);
  await waitFrames(2);
}
// Release any keys that a section may have left held.
async function releaseAll() {
  for (const k of ["a", "d", "s", "w", "j", "k", "i", "l", "u", "p"]) { await page.keyboard.up(k).catch(() => {}); }
}

try {
  // ═══ MAIN MATCH (boot = skip-to-battle) ═════════════════════════════════
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── SPRITE GATE ─────────────────────────────────────────────────────────
  section("sprite gate — Vegeta renders as sprites (not a procedural box)");
  {
    const a = await p1();
    check("P1 is Vegeta", a.key === "vegeta", `key=${a.key}`);
    check("idle sprite is ready (spritesheets.js gate)", a.spriteReady, `sheet=${a.spriteSheet}`);
    check("idle sheet is vegeta_base_idle.png", (a.spriteSheet || "").includes("vegeta_base_idle"), `sheet=${a.spriteSheet}`);
    check("spriteScale applied (skins.js gate) ≈ 2.1", Math.abs((a.spriteScale || 0) - 2.1) < 0.01, `spriteScale=${a.spriteScale}`);
    check("Vegeta has the DBZ ki energy pool (200)", a.maxEnergy === 200, `maxEnergy=${a.maxEnergy}`);
    await page.screenshot({ path: path.join(OUT, "VG_idle.png") });
  }

  // ── STAGE 2 GROUND NORMALS: light (J), heavy (K), up (I=launcher) ───────
  // Each connects for damage, renders its own re-sliced uniform sheet, and gets a
  // screenshot AT the active/contact frame. up-attack must LAUNCH the opponent up.
  section("STAGE 2 GROUND normals — connect + damage + correct sheet (+ launcher)");
  for (const [name, key, gap, sheet, shot] of [
    ["light (J)", "j", 48, "vegeta_base_light_uniform", "VG_light"],
    ["heavy (K)", "k", 48, "vegeta_base_heavy_uniform", "VG_heavy"],
    ["up-attack (I)", "i", 42, "vegeta_base_up_uniform", "VG_up"],
  ]) {
    await setupAdjacent(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4);
    const mid = await p1();
    check(`${name} renders its re-sliced sheet`, (mid.spriteSheet || "").includes(sheet), `sheet=${mid.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, `${shot}.png`) });
    await waitFrames(2); await page.keyboard.up(key);
    // For up-attack, sample the opponent's vertical velocity right after the hit → launcher check.
    let launched = false;
    if (key === "i") { for (let i = 0; i < 10 && !launched; i++) { const q = await p2(); if (q.vy < -3 || !q.grounded) launched = true; await waitFrames(1); } }
    await waitFrames(20);
    const hp1 = (await p2()).health;
    check(`${name} connects and deals damage`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    if (key === "i") check("up-attack LAUNCHES the opponent upward (juggle starter)", launched, `launched=${launched}`);
    await releaseAll(); await waitGrounded(); await waitFrames(12);
  }

  // ── STAGE 2 AIR NORMALS: neutral air (J airborne) + down-air spike (S+J) ─
  section("STAGE 2 AIR normals — air (J) and down_air (S+J) connect + correct sheet");
  await setupAdjacent(44);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j"); await waitFrames(3);
    const mv = await p1();
    check("air attack STARTS + renders air_uniform", mv.attacking && (mv.spriteSheet || "").includes("vegeta_base_air_uniform"), `attacking=${mv.attacking} sheet=${mv.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VG_air.png") });
    await page.keyboard.up("j");
    await waitFrames(14);
    check("air attack deals damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await waitGrounded(); await waitFrames(8);
  await setupAdjacent(40);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(70));   // higher lift → real air-time before landing
    await page.keyboard.down("s"); await page.keyboard.down("j");
    // Sample during the active spike (attacking), before he lands and holding-s reads as guard.
    let sheetSeen = "";
    for (let i = 0; i < 8; i++) { const m = await p1(); if (m.attacking && (m.spriteSheet || "").includes("down_air_uniform")) { sheetSeen = m.spriteSheet; await page.screenshot({ path: path.join(OUT, "VG_downair.png") }); break; } await waitFrames(1); }
    check("down_air renders down_air_uniform (reslice)", sheetSeen.includes("vegeta_base_down_air_uniform"), `sheet=${sheetSeen || (await p1()).spriteSheet}`);
    await page.keyboard.up("j"); await page.keyboard.up("s");
    await waitFrames(16);
    check("down-air spike deals damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 3 COMMAND-NORMAL CHAIN — Fwd+Heavy opener, cancel-on-hit rekka ─
  // Drive it realistically: tap Heavy, then re-tap during each hit's RECOVERY. The heavy
  // buffer (10f) must drain between taps to make a fresh edge, so we poll __harness.vegCmd()
  // and tap only when (recovery + connected + buffer drained). Reposition the dummy each
  // frame so every stage connects and the chain can continue.
  const vegCmd = () => page.evaluate(() => window.__harness.vegCmd());
  // Pin the dummy adjacent (X only — do NOT heal, healP2 zeroes hitstun which the cancel-on-hit
  // latch reads; the 1150-HP dummy easily survives the full ~170-dmg string).
  async function pinDummy() { const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); }, a.x + (a.facing === 1 ? 42 : -42)); }
  section("STAGE 3 command chain — Fwd+Heavy opener → cancel-on-hit 4-hit string");
  await releaseAll(); await waitGrounded();
  {
    await setupAdjacent(48);
    const hp0 = (await p2()).health;
    const seen = new Set();
    // Wait until Vegeta is actionable (no lingering attackCooldown from the prior section),
    // then fire the Fwd+Heavy opener.
    await page.waitForFunction(() => { const c = window.__harness.vegCmd(); return c && !c.attacking && c.cooldown <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    await page.keyboard.down("d"); await pinDummy();
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener (Fwd+Heavy)
    let shotChain = false;
    for (let i = 0; i < 220; i++) {
      const s = await vegCmd();
      if (s?.move && s.move.startsWith("vg")) seen.add(s.move);
      // Screenshot mid-string once we've reached the launcher stage (visible multi-hit combo).
      if (!shotChain && (s?.move === "vgUpInto" || s?.move === "vgUpFinish")) { shotChain = true; await page.screenshot({ path: path.join(OUT, "VG_chain.png") }); }
      await pinDummy();
      // Continue the string: press Heavy once we're in recovery, the hit connected, and the
      // buffer has drained (prevHeavy false → a fresh press makes an edge).
      if (s && s.rekkaNext && s.phase === "recovery" && s.connected && !s.prevHeavy) {
        await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
      }
      await waitFrames(1);
      if (seen.has("vgUpFinish")) break;
    }
    await releaseAll();
    check("opener vgFkick1 fires (Fwd+Heavy)", seen.has("vgFkick1"), `seen=${[...seen].join(",")}`);
    check("cancels into vgSidekick", seen.has("vgSidekick"), `seen=${[...seen].join(",")}`);
    check("cancels into vgUpInto (launcher)", seen.has("vgUpInto"), `seen=${[...seen].join(",")}`);
    check("cancels into vgUpFinish (finisher)", seen.has("vgUpFinish"), `seen=${[...seen].join(",")}`);
    check("full string dealt cumulative damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 3 INTERRUPT — a non-connecting opener must NOT chain (cancel-on-hit) ─
  // Whiff exercises the SAME _cmdHitLanded gate that a BLOCK does (block sets blockstun,
  // not hitstun → the latch never trips → the string ends), so this proves the interrupt path.
  section("STAGE 3 interrupt — whiffed opener does NOT continue the string");
  {
    const me0 = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), me0.x + 360);   // dummy FAR → opener whiffs
    await page.waitForFunction(() => { const c = window.__harness.vegCmd(); const p = window.__harness.p1(); return c && !c.attacking && c.cooldown <= 0 && p.grounded; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    const seen = new Set();
    await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2);   // Fwd+Heavy opener into empty air
    await page.keyboard.up("k"); await page.keyboard.up("d");            // release Forward so a later tap can't re-open
    for (let i = 0; i < 44; i++) {
      const s = await vegCmd(); if (s?.move && s.move.startsWith("vg")) seen.add(s.move);
      // Tap Heavy during recovery just like the connecting test — but nothing connected, so
      // _cmdHitLanded stays false and the string must NOT advance.
      if (s && s.phase === "recovery" && !s.prevHeavy) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); }
      await waitFrames(1);
    }
    await releaseAll();
    check("whiffed opener still fired", seen.has("vgFkick1"), `seen=${[...seen].join(",")}`);
    check("string did NOT advance past the opener (interrupt on no-connect)", !seen.has("vgSidekick") && !seen.has("vgUpInto") && !seen.has("vgUpFinish"), `seen=${[...seen].join(",")}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(8);

  // ── STAGE 4 ENERGY SPECIALS — motion → charge cast → beam → damage ──────
  section("STAGE 4 specials — Galick Gun (QCF) / Big Bang (neutral) / Final Flash (QCB)");
  const projectiles = () => page.evaluate(() => window.__harness.projectiles());
  for (const [name, motion, castAction, projName, shot] of [
    ["Galick Gun (QCF, D→F)",  ["s", "d"], "galickCast",  "galickGun",  "VG_galick"],
    ["Big Bang (neutral)",     [],         "bigBangCast", "bigBang",    "VG_bigbang"],
    ["Final Flash (QCB, D→B)", ["s", "a"], "charge",      "finalFlash", "VG_finalflash"],
  ]) {
    await releaseAll(); await waitGrounded();
    await page.evaluate(() => window.__harness.fillEnergy());
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + 130);
    await page.waitForFunction(() => { const c = window.__harness.vegCmd(); return c && !c.attacking && c.cooldown <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    // A NEUTRAL special must have an empty motion window — let any prior direction taps age out
    // of the ~700ms command window so a stale QCF/QCB doesn't fire the wrong special.
    if (motion.length === 0) await waitFrames(48);
    // Feed the motion (direction taps stamp directionHistory), then press Special (L).
    for (const k of motion) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); }
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let castSeen = false, projSeen = false, sinceProj = -1;
    for (let i = 0; i < 60; i++) {
      const p = await p1(); if (p.action === castAction) castSeen = true;
      const pr = await projectiles(); if (pr.some(x => x.name === projName)) { projSeen = true; if (sinceProj < 0) sinceProj = 0; }
      // Screenshot a few frames after spawn so the beam is mid-flight (clearer evidence).
      if (sinceProj >= 0) { sinceProj++; if (sinceProj === 5) { await page.screenshot({ path: path.join(OUT, `${shot}.png`) }); break; } }
      await waitFrames(1);
    }
    check(`${name} spent energy`, (await p1()).energy < e0, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    check(`${name} plays its charge/cast pose (${castAction})`, castSeen, `sawCast=${castSeen}`);
    check(`${name} spawns the ${projName} projectile`, projSeen, `sawProj=${projSeen}`);
    let dmg = false; for (let i = 0; i < 45 && !dmg; i++) { if ((await p2()).health < hp0) dmg = true; await waitFrames(1); }
    check(`${name} beam connects for damage`, dmg, `hp ${hp0} → ${(await p2()).health}`);
    await releaseAll(); await waitGrounded(); await waitFrames(6);
  }

  // ── STAGE 5 ULTIMATE — Overcharged Final Flash freeze cinematic ─────────
  section("STAGE 5 ultimate — Overcharged Final Flash cinematic (freeze + guaranteed big hit)");
  {
    await releaseAll(); await waitGrounded();
    await page.evaluate(() => window.__harness.fillEnergy());
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + 150);
    await page.waitForFunction(() => { const c = window.__harness.vegCmd(); return c && !c.attacking && c.cooldown <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    const cine = () => page.evaluate(() => window.__harness.vegetaUltCine());
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    let active = false, struck = false, shot = false; const phases = new Set();
    for (let i = 0; i < 240; i++) {
      const c = await cine();
      if (c.active) active = true;
      if (c.phase) phases.add(c.phase);
      if (c.struck) struck = true;
      if (c.phase === "fire" && c.struck && !shot) { shot = true; await page.screenshot({ path: path.join(OUT, "VG_ultimate.png") }); }
      if (active && !c.active) break;   // cinematic ended
      await waitFrames(1);
    }
    check("ultimate activates the freeze cinematic", active, `active=${active}`);
    check("cinematic runs windup → fire → settle", phases.has("windup") && phases.has("fire") && phases.has("settle"), `phases=${[...phases].join(",")}`);
    check("beam CONNECTS at the impact beat (struck)", struck, `struck=${struck}`);
    check("near-max meter cost (~100)", (e0 - (await p1()).energy) >= 95, `spent ${(e0 - (await p1()).energy).toFixed(0)}`);
    check("deals its big overcharged damage (≥300, biggest in kit)", (hp0 - (await p2()).health) >= 300, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  // ── STAGE 6 FREE / COOLDOWN POKES (no energy) ───────────────────────────
  const waitActionable = async () => { await page.waitForFunction(() => { const c = window.__harness.vegCmd(); const p = window.__harness.p1(); return c && !c.attacking && c.cooldown <= 0 && p.grounded; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); };

  section("STAGE 6 — Ki Blast (D+Special) is FREE, spawns a cyan blast + connects");
  {
    await releaseAll(); await waitGrounded(); await page.evaluate(() => window.__harness.fillEnergy());
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + 120);
    await waitActionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.up("s");   // brief Down = tap variant
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let cast = false, proj = false, shot = false;
    for (let i = 0; i < 40; i++) { const p = await p1(); if (p.action === "kiBlast") cast = true; const pr = await projectiles(); if (pr.some(x => x.name === "kiBlast")) { proj = true; if (!shot) { shot = true; await waitFrames(4); await page.screenshot({ path: path.join(OUT, "VG_kiblast.png") }); } } await waitFrames(1); if (cast && proj) break; }
    check("Ki Blast is FREE (no energy spent)", (await p1()).energy >= e0 - 1, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    check("Ki Blast plays its throw pose", cast, `cast=${cast}`);
    check("Ki Blast spawns a cyan projectile", proj, `proj=${proj}`);
    let dmg = false; for (let i = 0; i < 40 && !dmg; i++) { if ((await p2()).health < hp0) dmg = true; await waitFrames(1); }
    check("Ki Blast connects for damage", dmg, `hp ${hp0} → ${(await p2()).health}`);
  }

  section("STAGE 6 — Launch Ki Blast (U+Special) is FREE, spawns a rising cyan barrage");
  {
    await releaseAll(); await waitGrounded(); await page.evaluate(() => window.__harness.fillEnergy());
    const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + 90);
    await waitActionable();
    const e0 = (await p1()).energy;
    await page.keyboard.down("w"); await waitFrames(1); await page.keyboard.up("w");   // Up stamp
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let cast = false, count = 0, shot = false;
    for (let i = 0; i < 40; i++) { const p = await p1(); if (p.action === "launchKi") cast = true; const pr = await projectiles(); count = Math.max(count, pr.filter(x => x.name === "launchKi").length); if (count >= 1 && !shot) { shot = true; await page.screenshot({ path: path.join(OUT, "VG_launchki.png") }); } await waitFrames(1); if (cast && count >= 2) break; }
    check("Launch Ki Blast is FREE (no energy spent)", (await p1()).energy >= e0 - 1, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    check("Launch Ki Blast plays its pose", cast, `cast=${cast}`);
    check("Launch Ki Blast fires a multi-orb barrage (≥2)", count >= 2, `orbs=${count}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("STAGE 6 — EX Ki Punch: cancel-only out of a normal's recovery");
  {
    await setupAdjacent(46); await waitActionable();
    // Throw a light, then press Special during its RECOVERY → cancel into EX Ki Punch.
    await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");
    let exSeen = false;
    for (let i = 0; i < 30; i++) {
      const c = await vegCmd();
      if (c?.action === "light" && c.phase === "recovery") { await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); }
      const p = await p1(); if (p.action === "exKi") { exSeen = true; await page.screenshot({ path: path.join(OUT, "VG_exki.png") }); break; }
      await waitFrames(1);
    }
    check("EX Ki Punch reachable as a recovery-cancel from a normal", exSeen, `exSeen=${exSeen}`);
    // And NOT throwable from neutral (Special from neutral fires an energy special / free poke, never exKi).
    await releaseAll(); await waitGrounded(); await waitActionable();
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let neutralEx = false; for (let i = 0; i < 12; i++) { if ((await p1()).action === "exKi") neutralEx = true; await waitFrames(1); }
    check("EX Ki Punch NOT throwable from neutral", !neutralEx, `neutralEx=${neutralEx}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("STAGE 6 — Koma Rush (Down+Heavy): FREE auto-chain on clean hit");
  {
    await setupAdjacent(46); await waitActionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    const seen = new Set();
    await page.keyboard.down("s");                       // hold Down
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Down+Heavy opener
    let shot = false;
    for (let i = 0; i < 120; i++) {
      const c = await vegCmd(); if (c?.move && (c.move === "komaRush1" || c.move === "komaFinish")) seen.add(c.move);
      if (c?.move === "komaFinish" && !shot) { shot = true; await page.screenshot({ path: path.join(OUT, "VG_komarush.png") }); }
      await pinDummy();
      await waitFrames(1);
      if (seen.has("komaFinish")) break;
    }
    await releaseAll();
    check("Koma Rush is FREE (no energy spent)", (await p1()).energy >= e0 - 1, `energy ${e0.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
    check("Koma Rush opener fires (komaRush1)", seen.has("komaRush1"), `seen=${[...seen].join(",")}`);
    check("auto-chains into the finisher on clean hit (komaFinish)", seen.has("komaFinish"), `seen=${[...seen].join(",")}`);
    check("Koma Rush deals cumulative damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("STAGE 6 — Koma Rush INTERRUPT: a whiffed opener does not chain");
  {
    await waitActionable();
    const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 340);   // dummy FAR → opener whiffs
    await waitFrames(2);
    const seen = new Set();
    await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
    for (let i = 0; i < 50; i++) { const c = await vegCmd(); if (c?.move && c.move.startsWith("koma")) seen.add(c.move); await waitFrames(1); }
    check("whiffed Koma opener still fired", seen.has("komaRush1"), `seen=${[...seen].join(",")}`);
    check("did NOT auto-chain to the finisher (interrupt on whiff)", !seen.has("komaFinish"), `seen=${[...seen].join(",")}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  section("STAGE 6 — Koma Repeatable (Down+Light): FREE, connects");
  {
    await setupAdjacent(46); await waitActionable();
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    await page.keyboard.down("s");
    await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");
    let seen = false;
    for (let i = 0; i < 30; i++) { const p = await p1(); if (p.action === "komaRep") { seen = true; await page.screenshot({ path: path.join(OUT, "VG_komarep.png") }); break; } await waitFrames(1); }
    await releaseAll();
    check("Koma Repeatable fires (komaRep) and is FREE", seen && (await p1()).energy >= e0 - 1, `seen=${seen} energy=${(await p1()).energy.toFixed(0)}`);
    let dmg = false; for (let i = 0; i < 30 && !dmg; i++) { if ((await p2()).health < hp0) dmg = true; await waitFrames(1); }
    check("Koma Repeatable connects for damage", dmg, `hp ${hp0} → ${(await p2()).health}`);
  }
  await releaseAll(); await waitGrounded(); await waitFrames(6);

  // ── MOVEMENT / STATE actions resolve to the right sprite ────────────────
  section("MOVEMENT & STATE — run / walk / guard / charge resolve");
  {
    // Dummy far to the RIGHT → Vegeta faces right; d = forward, a = backpedal.
    const a0 = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), a0.x + 400);
    await waitFrames(2);

    // Walk speed (~7.9) is below the engine's |vx|>10 'run' threshold, so grounded
    // locomotion resolves to 'walk' — which reuses the run.png sheet (no separate walk
    // art, intentional). Assert forward motion renders the run sheet in the right dir.
    await page.keyboard.down("d"); await waitFrames(10);
    const fwd = await p1();
    check("holding forward → locomotion action renders run sheet + forward velocity", (fwd.action === "walk" || fwd.action === "run") && (fwd.spriteSheet || "").includes("vegeta_base_run") && fwd.vx > 5, `action=${fwd.action} sheet=${fwd.spriteSheet} vx=${fwd.vx.toFixed(1)}`);
    await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);

    await page.keyboard.down("a"); await waitFrames(6);
    const walkS = await p1();
    check("holding back → 'walk' action (backpedal), negative velocity", walkS.action === "walk" && walkS.vx < -5, `action=${walkS.action} vx=${walkS.vx.toFixed(1)}`);
    await page.screenshot({ path: path.join(OUT, "VG_walk.png") });
    await page.keyboard.up("a"); await waitGrounded(); await waitFrames(4);

    // JUMP — press up/jump, catch him airborne, screenshot the jump sprite.
    await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
    await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
    await waitFrames(4);
    const jumpS = await p1();
    check("airborne → jump/fall action renders the jump_uniform sheet", (jumpS.action === "jump" || jumpS.action === "fall") && (jumpS.spriteSheet || "").includes("vegeta_base_jump_uniform"), `action=${jumpS.action} grounded=${jumpS.grounded} sheet=${jumpS.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VG_jump.png") });
    await waitGrounded(); await waitFrames(4);

    await page.keyboard.down("s"); await waitFrames(4);
    const guardS = await p1();
    check("holding Down → blocking + 'guard' action", guardS.blocking && guardS.action === "guard", `blocking=${guardS.blocking} action=${guardS.action}`);
    await page.screenshot({ path: path.join(OUT, "VG_block.png") });
    await page.keyboard.up("s"); await waitFrames(4);

    await page.keyboard.down("p"); await waitFrames(6);
    const chargeS = await p1();
    check("holding P → isCharging (universal charge-lockout)", chargeS.charging || chargeS.isCharging, `charging=${chargeS.charging ?? chargeS.isCharging}`);
    check("charge renders the aura sheet (vegeta_base_charge)", chargeS.action === "charge" && (chargeS.spriteSheet || "").includes("vegeta_base_charge"), `action=${chargeS.action} sheet=${chargeS.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "VG_charge.png") });
    await page.keyboard.up("p"); await waitFrames(4);
  }
  await releaseAll();

  section("errors (main match)");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

  // ═══ HURT (role-swap: Goku on P1 lands a real hit on Vegeta on P2) ═══════
  section("TAKING A HIT — Vegeta (P2) renders 'hurt' from a real connect");
  {
    await page.goto(`${base}/index.html?harness=1&p1=goku&p2=vegeta`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.boot());
    await waitFrames(6);
    const v0 = await p2();
    check("P2 is Vegeta", v0.key === "vegeta", `key=${v0.key}`);
    // Park Vegeta right in front of Goku and swing until a hit lands.
    const g = await p1();
    await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, g.x + 46);
    await waitFrames(2);
    const hp0 = (await p2()).health;
    let hurtSeen = false;
    for (let i = 0; i < 8 && !hurtSeen; i++) {
      await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j");
      const v = await p2();
      if (v.action === "hurt" || v.health < hp0) {
        hurtSeen = v.action === "hurt";
        if (v.action === "hurt") await page.screenshot({ path: path.join(OUT, "VG_hurt.png") });
      }
      await waitFrames(3);
    }
    const vEnd = await p2();
    check("Vegeta took damage from the hit", vEnd.health < hp0, `hp ${hp0} → ${vEnd.health}`);
    check("Vegeta rendered the 'hurt' flinch (hurt_uniform sheet)", hurtSeen, `sawHurt=${hurtSeen}`);
    if (!hurtSeen) await page.screenshot({ path: path.join(OUT, "VG_hurt.png") });
  }

  // ═══ INTRO (start = real menu flow, NOT boot) ═══════════════════════════
  section("two-part intro — _introVariant cycles intro → intro2");
  {
    await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=goku`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.start());   // start() = INTRO (boot skips it)
    await waitFrames(2);

    const seen = new Set();
    let shot = false, shot2 = false, auraRenders = 0;
    for (let i = 0; i < 900; i++) {
      const s = await intro();
      if (s.stage === "p1" && s.p1Playing && s.p1Variant) seen.add(s.p1Variant);
      if (s.stage === "p1" && s.p1Playing && s.p1Variant === "intro" && !shot) { shot = true; await page.screenshot({ path: path.join(OUT, "VG_intro.png"), clip: { x: 0, y: 120, width: 1280, height: 470 } }); }
      // Screenshot the 2nd pose WITH the aura, and sample the aura render count.
      if (s.stage === "p1" && s.p1Playing && s.p1Variant === "intro2") {
        auraRenders = (await page.evaluate(() => window.__harness.introAura())).renders;
        if (!shot2 && auraRenders > 0) { shot2 = true; await page.screenshot({ path: path.join(OUT, "VG_intro2_aura.png"), clip: { x: 0, y: 120, width: 1280, height: 470 } }); }
      }
      if (s.gameState !== "intro") break;
      await waitFrames(1);
    }
    check("Vegeta's intro plays the 'intro' pose", seen.has("intro"), `variants=${[...seen].join(",")}`);
    check("intro sequence advances to the 'intro2' power-up flare", seen.has("intro2"), `variants=${[...seen].join(",")}`);
    check("intro_2_effects aura composited over the intro2 pose (real draws)", auraRenders > 0, `introAura.renders=${auraRenders}`);
    check("captured intro + intro2-with-aura screenshots", shot && shot2);
  }

  section("errors (intro)");
  check("no uncaught JS exceptions across both phases", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "VG_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  VEGETA Stage 1: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
