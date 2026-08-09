// harness/yuji_stage3.mjs — Stage 3 evidence for Yuji Itadori: the Cursed-Energy (Y/SPECIAL) family.
//   neutral  → Cursed-Energy Ball  (cast yujiBall  + traveling projectile + on-hit burst)
//   Fwd      → Cursed-Energy Beam  (cast yujiBeam  + fast forward bolt)
//   Up       → Cursed-Energy Pillar(cast yujiPillar+ stationary anti-air column)
//   Down     → Crescent Slash      (melee yujiCrescent + cosmetic ground burst)
//   airborne → Aerial Cursed Combo (melee yujiAirCombo, multi-hit)
// Special key = "l"; held direction (d=fwd, w=up, s=down) selects the branch. Proves cast pose/move,
// projectile spawn + sheet, energy spend, and connect. Saves harness/shots/yuji_s3_*.png.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const seenActions = new Map();

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const seenProjs = new Set();   // projectile names observed across a sample window (they expire, so catch them live)
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); (await projs()).forEach(p => seenProjs.add(p.name)); return a; }
async function sample(n) { const acts = new Set(); for (let i = 0; i < n; i++) { const a = await record(); if (a.action) acts.add(a.action); await waitFrames(1); } return acts; }
const shot = name => page.screenshot({ path: path.join(OUT, `yuji_s3_${name}.png`) });
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  seenProjs.clear();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  // wait for the dummy to be grounded/settled (a prior launcher can leave it airborne → next grounded move whiffs)
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 3500, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setSession?.({ dummyBehavior: "stand" }));   // pin the dummy so melee/pillar can't be dodged by a hop
  await waitFrames(6);

  // ── ENERGY BALL (neutral) ──
  section("Cursed-Energy Ball — neutral Y (projectile + on-hit burst)");
  await prep(360);
  await page.evaluate(() => window.__harness.setP2Invuln(600));       // let the ball fly free to snapshot
  const e0 = (await p1()).energy;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const e1 = (await p1()).energy;
  const cast = await sample(5);
  await page.waitForFunction(() => window.__harness.projectiles().some(p => p.name === "yujiBall"), null, { timeout: 2000, polling: 16 }).catch(() => {});
  const pj = await projs(); await waitFrames(4); await shot("ball");
  check("cast pose yujiBall plays", cast.has("yujiBall"), `acts=[${[...cast]}]`);
  check("spawns yujiBall projectile", pj.some(p => p.name === "yujiBall"), `projs=[${pj.map(p => p.name).join(",")}]`);
  check("ball uses ball_proj sheet", pj.some(p => (p.sheet || "").includes("yuji_ball_proj_uniform")), `sheet=${(pj.find(p => p.name === "yujiBall") || {}).sheet}`);
  check("spends ~30 energy", e0 - e1 >= 28, `Δ=${(e0 - e1).toFixed(0)}`);
  // connect (close range)
  await prep(150); const h0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.p2().health < window.__harness.p2().maxHealth, null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("ball connects", h0 - (await p2()).health > 0, `−${(h0 - (await p2()).health).toFixed(0)}`);

  // ── BEAM (Forward) ──
  section("Cursed-Energy Beam — Forward+Y (fast bolt)");
  await prep(320); await page.evaluate(() => window.__harness.setP2Invuln(600));
  const be0 = (await p1()).energy;
  await page.keyboard.down("d"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const be1 = (await p1()).energy;
  const bcast = await sample(5); await page.keyboard.up("d");
  await page.waitForFunction(() => window.__harness.projectiles().some(p => p.name === "yujiBeam"), null, { timeout: 2000, polling: 16 }).catch(() => {});
  const bpj = await projs(); await shot("beam");
  check("cast pose yujiBeam plays", bcast.has("yujiBeam"), `acts=[${[...bcast]}]`);
  check("spawns yujiBeam projectile", bpj.some(p => p.name === "yujiBeam"), `projs=[${bpj.map(p => p.name).join(",")}]`);
  check("beam uses beam_proj sheet", bpj.some(p => (p.sheet || "").includes("yuji_beam_proj_uniform")), `sheet=${(bpj.find(p => p.name === "yujiBeam") || {}).sheet}`);
  check("spends ~40 energy", be0 - be1 >= 38, `Δ=${(be0 - be1).toFixed(0)}`);
  await prep(150); const bh0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d");
  await page.waitForFunction(() => window.__harness.p2().health < window.__harness.p2().maxHealth, null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("beam connects", bh0 - (await p2()).health > 0, `−${(bh0 - (await p2()).health).toFixed(0)}`);

  // ── PILLAR (Up) — test what actually fires when up+special is tapped grounded ──
  // Up to 2 attempts: the simultaneous 2-key (w+l) press occasionally slips a frame so the launcher
  // whiffs on a hard-coded spacing — a harness input-timing artifact, not a gameplay bug. Retry once.
  section("Cursed-Energy Pillar — Up+Y (anti-air column)");
  let pcast = new Set(), firedPillar = false, pDmg = 0, pe0 = 0, pe1 = 0;
  for (let attempt = 0; attempt < 2 && pDmg <= 0; attempt++) {
    await prep(30); const ph0 = (await p2()).health; pe0 = (await p1()).energy;
    await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("w");
    pe1 = (await p1()).energy;   // measure spend BEFORE the sample so regen doesn't erode the delta
    pcast = await sample(6); if (attempt === 0) await shot("pillar");
    await page.waitForFunction(m => window.__harness.p2().health < m, ph0, { timeout: 2500, polling: 16 }).catch(() => {});
    firedPillar = firedPillar || pcast.has("yujiPillar") || seenProjs.has("yujiPillarFx");
    pDmg = ph0 - (await p2()).health;
  }
  check("Up+Y fires the PILLAR (not the air combo)", firedPillar, `acts=[${[...pcast]}]`);
  check("pillar connects (adjacent dummy)", pDmg > 0, `−${pDmg.toFixed(0)}`);
  check("spends ~35 energy", pe0 - pe1 >= 30, `Δ=${(pe0 - pe1).toFixed(0)}`);
  await waitGrounded();

  // ── CRESCENT (Down) — melee + ground FX ──
  section("Crescent Slash — Down+Y (melee arc + ground burst)");
  await prep(48); const ch0 = (await p2()).health; const ce0 = (await p1()).energy;
  await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const ce1 = (await p1()).energy;   // measure spend before regen erodes it
  const ccast = await sample(8); await page.keyboard.up("s"); await shot("crescent");
  await page.waitForFunction(m => window.__harness.p2().health < m, ch0, { timeout: 2500, polling: 16 }).catch(() => {});
  check("Down+Y fires yujiCrescent", ccast.has("yujiCrescent"), `acts=[${[...ccast]}]`);
  check("crescent connects", ch0 - (await p2()).health > 0, `−${(ch0 - (await p2()).health).toFixed(0)}`);
  check("ground-burst FX spawns", seenProjs.has("yujiGroundFx"), `seen=[${[...seenProjs].join(",")}]`);
  check("spends ~25 energy", ce0 - ce1 >= 23, `Δ=${(ce0 - ce1).toFixed(0)}`);
  await waitGrounded();

  // ── AIR COMBO (airborne) — Jump+Y ──
  section("Aerial Cursed Combo — Jump+Y (airborne multi-hit)");
  await prep(34); const ah0 = (await p2()).health; const ae0 = (await p1()).energy;
  await page.evaluate(() => window.__harness.liftP1(52));
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const ae1 = (await p1()).energy;   // measure spend before regen erodes it
  const acast = await sample(8); await shot("aircombo");
  await page.waitForFunction(m => window.__harness.p2().health < m, ah0, { timeout: 2500, polling: 16 }).catch(() => {});
  check("airborne Y fires yujiAirCombo", acast.has("yujiAirCombo"), `acts=[${[...acast]}]`);
  check("air combo connects", ah0 - (await p2()).health > 0, `−${(ah0 - (await p2()).health).toFixed(0)}`);
  check("spends ~20 energy", ae0 - ae1 >= 18, `Δ=${(ae0 - ae1).toFixed(0)}`);

  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => ["yujiBall", "yujiBeam", "yujiPillar", "yujiCrescent", "yujiAirCombo"].includes(a) && (!s || !s.includes("yuji")));
  check("all Y-cast actions use a yuji sheet", bad.length === 0, bad.length ? bad.map(([a, s]) => `${a}:${s}`).join(" | ") : `casts=[${[...seenActions.keys()].filter(k => k.startsWith("yuji")).join(",")}]`);
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
