// harness/naoya.test.mjs — CANONICAL Naoya Zenin (Jujutsu Kaisen) suite.
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// "Cursed Energy" label, movement/state (idle/walk/crouch + REAL hurt/knockdown/lose art), the 5 normals +
// the Fwd+Heavy PLANNED ROUTE opener, the REDESIGNED specials (24FPS Snare neutral / Pitch Throw F / Energy
// Dart D / Frame-Skip blink B,U), new-mechanics smoke (route arms + snare freezes on a rule-break), the
// enhanced guaranteed-Frame-Trap ultimate, a STATIC sheet+portrait sweep, and a RUNTIME fallback-box sweep.
// (Deep Snare/Route success-vs-fail timing lives in test:naoya-redesign.) Orange dart is procedural — NOT a sheet.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait is a real file. ──
section("STATIC — every animationData sheet + portrait exists on disk");
const naoya = characters.naoya;
const ad = naoya.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, naoya.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (naoya_portrait.png)", (naoya.portrait || "").includes("naoya_portrait"), `portrait=${naoya.portrait}`);
check("stats HP1050/EN180/atk90/def80/spd96 + energyType cursed_energy + universe jujutsu_kaisen + scale1.6",
  naoya.stats.maxHealth === 1050 && naoya.stats.maxEnergy === 180 && naoya.stats.attack === 90 && naoya.stats.defense === 80 &&
  naoya.stats.speed === 96 && naoya.traits.energyType === "cursed_energy" && naoya.universe === "jujutsu_kaisen" && Math.abs(naoya.spriteScale - 1.6) < 0.01,
  JSON.stringify(naoya.stats));
check("SHIPS real hit art (hurt + knockdown) + lose pose (row_12); win/intro genuinely absent (OPEN GAPS)",
  !!ad.hurt && !!ad.knockdown && !!ad.lose && !ad.win && !ad.intro, `hurt=${!!ad.hurt} kd=${!!ad.knockdown} lose=${!!ad.lose} win=${!!ad.win} intro=${!!ad.intro}`);

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const fx = () => page.evaluate(() => window.__harness.naoyaFx("p1"));
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1)); await wf(2);
}
async function waitSheet(sheet, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await wf(1); mv = await p1(); } return mv; }
async function tap(key) { await page.keyboard.down(key); await wf(1); await page.keyboard.up(key); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=naoya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Naoya", g.key === "naoya", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = naoya_idle_uniform", (g.spriteSheet || "").includes("naoya_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.6", Math.abs((g.spriteScale || 0) - 1.6) < 0.01, `${g.spriteScale}`);
  check("HP 1050 / EN 180", g.maxHealth === 1050 && g.maxEnergy === 180, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("naoya"));
  check("portrait wired to ./naoya_portrait.png", (portrait || "").includes("naoya_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Cursed Energy", energyLabel === "Cursed Energy", `label=${energyLabel}`);

  section("movement / state (walk + REAL hurt / knockdown / lose art)");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = naoya_walk_uniform", (rn.spriteSheet || "").includes("naoya_walk_uniform"), `sheet=${rn.spriteSheet}`);
  await grounded();
  for (const [act, tag] of [["crouch", "naoya_crouch_uniform"], ["dash", "naoya_dash_uniform"], ["hurt", "naoya_hurt_uniform"], ["knockdown", "naoya_knockdown_uniform"], ["lose", "naoya_lose_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} = ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 normals connect + Fwd+Heavy command normal (naoyaCombo)");
  for (const [name, key, tag] of [["light", "j", "naoya_light_uniform"], ["heavy", "k", "naoya_heavy_uniform"], ["up", "i", "naoya_heavy_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(50); const h0 = (await p2()).health;
      await page.keyboard.down(key); const mv = await waitSheet(tag, 12); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true;
      await page.keyboard.up(key); await wf(12); dealt = h0 - (await p2()).health;
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `sheetOk=${sheetOk} dmg=${dealt}`);
  }
  { let sheetOk = false, dealt = 0;
    for (let a = 0; a < 4 && !(sheetOk && dealt > 0); a++) { await grounded(); await prep(44); const h0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(64)); await page.keyboard.down("j"); const mv = await waitSheet("naoya_air_uniform", 8); if ((mv.spriteSheet || "").includes("naoya_air_uniform")) sheetOk = true; await page.keyboard.up("j"); await wf(12); dealt = h0 - (await p2()).health; }
    check("air → naoya_air_uniform + connects", sheetOk && dealt > 0, `sheetOk=${sheetOk} dmg=${dealt}`); }
  { let sheetOk = false, dealt = 0;
    for (let a = 0; a < 4 && !(sheetOk && dealt > 0); a++) { await grounded(); await prep(30); const h0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(64)); await page.keyboard.down("s"); await page.keyboard.down("j"); const mv = await waitSheet("naoya_air_uniform", 8); if ((mv.spriteSheet || "").includes("naoya_air_uniform")) sheetOk = true; await page.keyboard.up("j"); await page.keyboard.up("s"); await wf(12); dealt = h0 - (await p2()).health; }
    check("down_air → naoya_air_uniform (reused spike) + connects", sheetOk && dealt > 0, `sheetOk=${sheetOk} dmg=${dealt}`); }
  await grounded();
  // Fwd+Heavy → naoyaCombo. currentMove is a brief single-frame window (flaky to single-poll back-to-back —
  // see project note); poll the SPRITE SHEET (naoya_combo_uniform) across the active window instead, which the
  // per-stage harness proved authoritative for the currentMove identity.
  let cmdHit = false, cmdDmg = 0;
  for (let attempt = 0; attempt < 5 && !(cmdHit && cmdDmg > 0); attempt++) {
    await prep(48); const h0 = (await p2()).health;
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await wf(2);
    let mv = await p1();
    for (let r = 0; r < 5 && !(mv.currentMove === "naoyaCombo" || (mv.spriteSheet || "").includes("naoya_combo_uniform")); r++) {
      await page.keyboard.down("k"); await wf(1); await page.keyboard.up("k");
      mv = await waitSheet("naoya_combo_uniform", 8);
    }
    if (mv.currentMove === "naoyaCombo" || (mv.spriteSheet || "").includes("naoya_combo_uniform")) cmdHit = true;
    await wf(18); await page.keyboard.up(fwd); cmdDmg += Math.max(0, h0 - (await p2()).health);
  }
  check("Fwd+Heavy command normal (naoyaCombo) fires + connects", cmdHit && cmdDmg > 0, `hit=${cmdHit} dmg=${cmdDmg}`);

  section("Projection Sorcery specials — 24FPS Snare (neutral) / Pitch (F) / Energy Dart (D) / Frame-Skip (B,U)");
  // neutral = 24FPS SNARE palm (white-wing pose) → applies the snare rule on contact (redesign)
  { let applied = false, cast = "";
    for (let attempt = 0; attempt < 4 && !applied; attempt++) {
      await prep(46); await specialDir(null);
      for (let i = 0; i < 24; i++) { const a = await fx(); if (a.castMove === "naoyaFtFinish") cast = a.castMove; if ((a.oppSnare || 0) > 0) applied = true; await wf(1); }
      await grounded();
    }
    check("neutral → 24FPS Snare (palm) casts + applies the snare rule", cast === "naoyaFtFinish" && applied, `cast=${cast} oppSnare-applied=${applied}`); }
  // F = Pitch Throw, D = Energy Dart spread — both orange projectiles that connect (dart moved neutral→Down)
  for (const [dir, tag, name] of [["F", "naoyaPitch", "Pitch Throw"], ["D", "naoyaEnergyDart", "Energy Dart"]]) {
    await prep(150); const h0 = (await p2()).health; const res = await specialDir(dir);
    let cast = ""; for (let i = 0; i < 8; i++) { const a = await fx(); if (a.castMove === tag) cast = a.castMove; await wf(1); }
    await wf(24);
    check(`${dir} → ${name} (${tag}) casts + projectile connects`, cast === tag && (h0 - (await p2()).health) > 0, `cast=${res?.cast} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  { await prep(70); const x0 = (await fx()).x; await specialDir("B"); await wf(1); const a = await fx(); await wf(5); const b = await fx();
    check("Back → Frame-Skip retreat blink (i-frames + backward reposition, no dmg)", (a.invuln || b.invuln) > 0 && b.x < x0 - 60, `invuln=${a.invuln} x ${x0}→${b.x}`); }
  { await prep(220); const x0 = (await fx()).x; await specialDir("U"); await wf(6); const b = await fx();
    check("Up → Frame-Skip advance blink (forward reposition)", b.x > x0 + 60, `x ${x0}→${b.x}`); }

  section("★ NEW MECHANICS smoke — Planned Route ARMS (committed) + Snare freezes on a rule-break (deep coverage → test:naoya-redesign)");
  // PLANNED ROUTE: Fwd+Heavy locks Naoya into the committed timing string (rooted). Full success/fail-timing
  // verification lives in the dedicated harness; here we only gate that the route arms + roots.
  { let armed = null;
    for (let attempt = 0; attempt < 5 && !armed; attempt++) {
      await page.evaluate(() => window.__harness.naoyaClear());
      await prep(50);
      await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && (p.hitstun || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
      const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
      await page.keyboard.down(fwd); await wf(1); await tap("k");
      for (let i = 0; i < 4 && !armed; i++) { const a = await fx(); if (a.routeArmed && a.rooted) armed = a; await wf(1); }
      await page.keyboard.up(fwd);
      await page.waitForFunction(() => { const f = window.__harness.naoyaFx("p1"); return !f.routeArmed && (f.selfFrozen || 0) === 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
      await grounded();
    }
    check("Fwd+Heavy ARMS the Planned Route (committed + rooted)", !!armed, armed ? `step=${armed.ftStep} seq=${JSON.stringify(armed.ftSeq)}` : "route never armed"); }
  // 24FPS SNARE: land it, then force the opponent to ACT → they hard-freeze (~1s). Held-neutral counterplay is
  // covered in the dedicated harness.
  { let froze = false;
    for (let attempt = 0; attempt < 4 && !froze; attempt++) {
      await page.evaluate(() => window.__harness.naoyaClear());
      await prep(46); await specialDir(null);
      let applied = false; for (let i = 0; i < 24; i++) { if (((await fx()).oppSnare || 0) > 0) { applied = true; break; } await wf(1); }
      if (!applied) { await grounded(); continue; }
      await page.waitForFunction(() => (window.__harness.p2().hitstun || 0) <= 0, null, { timeout: 2000, polling: 16 }).catch(() => {});
      await page.evaluate(() => window.__harness.p2Attack());   // opponent acts → breaks the rule
      for (let i = 0; i < 8; i++) { if (((await fx()).oppFrozen || 0) >= 50) { froze = true; break; } await wf(1); }
      await grounded();
    }
    check("24FPS Snare: acting while snared FREEZES the opponent (~1s)", froze, `froze=${froze}`); }

  section("ULTIMATE — promoted guaranteed Frame-Trap (inline, ~198 EFF + freeze, no dup)");
  check("ultimate declared: Projection Sorcery: Frame-Trap / cost 100", naoya.ultimate?.name === "Projection Sorcery: Frame-Trap" && naoya.ultimate?.cost === 100, `name=${naoya.ultimate?.name} cost=${naoya.ultimate?.cost}`);
  await prep(52); await grounded(); const hpU = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires (telegraph pose)", !!ult?.cast && ult?.castMove === "naoyaFrameTrap", `cast=${ult?.cast} castMove=${ult?.castMove}`);
  let sawFinish = false, frozenPeak = 0, snareReapplied = false;
  for (let i = 0; i < 22; i++) { await wf(2); const s = await fx(); if (s.castMove === "naoyaFtFinish") sawFinish = true; if (s.oppFrozen > frozenPeak) frozenPeak = s.oppFrozen; if ((s.oppSnare || 0) > 0) snareReapplied = true; }
  const dmgU = hpU - (await p2()).health;
  check("ultimate cinematic → white-wing finish + FREEZE + ~198 EFF + re-applies the Snare (enhancement), P1 still live", sawFinish && frozenPeak >= 55 && dmgU >= 150 && dmgU <= 240 && snareReapplied && (await p1()).key === "naoya", `finish=${sawFinish} frozen=${frozenPeak} dmg=${dmgU.toFixed(0)} snareReapplied=${snareReapplied}`);

  section("fallback-box sweep — every animationData action renders a real naoya_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("naoya_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Naoya canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
