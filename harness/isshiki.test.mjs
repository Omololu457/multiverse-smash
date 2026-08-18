// harness/isshiki.test.mjs — CANONICAL Isshiki Otsutsuki suite (mirrors jason.test.mjs / yuji.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate: sprite gate / stats / portrait / Karma label,
// movement/state + hit_sheet's 5 split sub-actions, both auto-combo strings advancing (cancel-on-hit),
// all 4 core specials + both bonus finishers + the Ultimate cinematic firing/connecting, a STATIC sheet
// sweep (every animationData sheet + portrait on disk), and a RUNTIME fallback-box sweep (no 128² box).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait is a real, non-empty file. ──
section("STATIC — every animationData sheet + portrait exists on disk");
const isshiki = characters.isshiki;
const ad = isshiki.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
// FX/projectile sheets are referenced in abilities.js (not animationData) — assert them explicitly too.
const fxSheets = ["./isshiki_suku_rings_uniform.png", "./isshiki_rod_fx_uniform.png", "./isshiki_cube_fx_uniform.png", "./isshiki_fire_fx_uniform.png", "./isshiki_ult_rods_uniform.png"];
let missing = [];
for (const s of [...sheets, ...fxSheets, isshiki.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + ${fxSheets.length} FX sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (isshiki_portrait.png)", (isshiki.portrait || "").includes("isshiki_portrait"), `portrait=${isshiki.portrait}`);
check("elite top-tier stats, NO new roster record (HP1300/EN200/atk96/def90/spd92)",
  isshiki.stats.maxHealth === 1300 && isshiki.stats.maxEnergy === 200 && isshiki.stats.attack === 96 && isshiki.stats.defense === 90 && isshiki.stats.speed === 92,
  `HP${isshiki.stats.maxHealth}/atk${isshiki.stats.attack}/def${isshiki.stats.defense}/spd${isshiki.stats.speed}/en${isshiki.stats.maxEnergy}`);

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function prep(gap) {
  await ready();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await wf(2);
}
// Wait server-side for a projectile matching name|sheet to exist (deterministic; fast projectiles too).
async function waitProj(name, tag) {
  return await page.waitForFunction(([nm, tg]) => window.__harness.projectiles().some(p => p.name === nm || (p.sheet || "").includes(tg)),
    [name, tag], { timeout: 2500, polling: 16 }).then(() => true).catch(() => false);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  // ── REGISTRATION / GATE / STATS / PORTRAIT ──
  section("registration + sprite gate + stats + Karma label");
  const g = await p1();
  check("P1 is Isshiki", g.key === "isshiki", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = isshiki_idle_uniform", (g.spriteSheet || "").includes("isshiki_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.40", Math.abs((g.spriteScale || 0) - 1.40) < 0.01, `${g.spriteScale}`);
  check("HP 1300 / EN 200", g.maxHealth === 1300 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("isshiki"));
  check("portrait wired to ./isshiki_portrait.png", (portrait || "").includes("isshiki_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.("p1") ?? null);
  check("energy label = Karma", energyLabel === "Karma", `label=${energyLabel}`);

  // ── MOVEMENT / STATE + hit_sheet's 5 sub-actions ──
  section("movement / state + hit_sheet's 5 split sub-actions");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = isshiki_dash_uniform (no walk art)", (rn.spriteSheet || "").includes("isshiki_dash_uniform"), `sheet=${rn.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w"); await wf(6); const jp = await p1();
  check("jump = isshiki_jump_uniform", (jp.spriteSheet || "").includes("isshiki_jump_uniform"), `sheet=${jp.spriteSheet}`);
  await waitGrounded();
  for (const [act, tag] of [["hurt", "isshiki_hurt_uniform"], ["hurt_air", "isshiki_hurt_air_uniform"], ["knockdown", "isshiki_knockdown_uniform"], ["getup", "isshiki_getup_uniform"], ["sukunahikonaShrink", "isshiki_sukunahikona_uniform"], ["guard", "isshiki_block_uniform"], ["win", "isshiki_win_uniform"]]) {
    await force(act); await wf(3); const r = await p1();
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
    await force(null); await wf(2);
  }

  // ── COMBO STRINGS advance cancel-on-hit (deterministic mechanism proof) ──
  section("ground + air auto-combo strings advance cancel-on-hit");
  const tapLight = async () => { await page.keyboard.down("j"); await wf(2); await page.keyboard.up("j"); };
  // GROUND: opener connects → queues Ground2 (the shared rekka mechanism), + multi-hit damage.
  let gQueued = false, gDmg = 0;
  for (let a = 0; a < 8 && !(gQueued && gDmg >= 30); a++) {
    await prep(54); await page.keyboard.down("d"); const hp0 = (await p2()).health;
    await tapLight(); await wf(2);
    await page.waitForFunction(() => window.__harness.p1().cmdHitLanded, null, { timeout: 1500, polling: 16 }).catch(() => {});
    const s1 = await p1(); if (s1.cmdHitLanded && s1.rekkaNext === "isshikiGround2") gQueued = true;
    await tapLight(); await wf(3); await tapLight(); await wf(20);
    gDmg = Math.max(gDmg, hp0 - (await p2()).health); await page.keyboard.up("d");
  }
  check("ground opener connects → queues isshikiGround2 (cancel-on-hit)", gQueued, "");
  check("ground string multi-hit damage (≥ 30)", gDmg >= 30, `dmg=${gDmg.toFixed(1)}`);
  // AIR: opener connects → queues Air2 (mechanism), + multi-hit damage. P1 falls between taps, so re-lift
  // EVERY frame across the string (the Stage-2-proven pattern) to keep the aerial hits in range.
  const relift = async (h) => { if ((await p1()).grounded) await page.evaluate(hh => window.__harness.liftP1(hh), h); };
  let aQueued = false, aDmg = 0;
  for (let a = 0; a < 14 && !(aQueued && aDmg >= 24); a++) {
    await prep(38); await page.evaluate(() => window.__harness.liftP1(46)); const hp0 = (await p2()).health;
    await tapLight(); await wf(2);
    await page.waitForFunction(() => window.__harness.p1().cmdHitLanded, null, { timeout: 1500, polling: 16 }).catch(() => {});
    const s1 = await p1(); if (s1.cmdHitLanded && s1.rekkaNext === "isshikiAir2") aQueued = true;
    await relift(44);
    await tapLight(); for (let i = 0; i < 8; i++) { await relift(44); await wf(1); }
    await relift(40);
    await tapLight(); for (let i = 0; i < 8; i++) { await relift(40); await wf(1); }
    aDmg = Math.max(aDmg, hp0 - (await p2()).health);
  }
  check("air opener connects → queues isshikiAir2 (cancel-on-hit)", aQueued, "");
  check("air string multi-hit damage (≥ 24)", aDmg >= 24, `dmg=${aDmg.toFixed(1)}`);

  // ── 4 CORE SPECIALS + 2 FINISHERS fire, cast, spawn FX, connect ──
  section("4 core specials + 2 bonus finishers");
  // (Daikokuten cubes = a shrink-TRAP, checked separately below — full mechanic in test:isshiki-cube-*.)
  const SPECIALS = [
    { name: "Sukunahikona (neutral)",    dir: null, gap: 56,  cast: "isshikiSukuCast", proj: "isshikiSukuRings", tag: "isshiki_suku_rings_uniform", cost: 25, dmgMin: 25 },
    { name: "Daikokuten rods (Fwd)",     dir: "F",  gap: 130, cast: "isshikiRodCast",  proj: "isshikiRods",      tag: "isshiki_rod_fx_uniform",   cost: 30, dmgMin: 30 },
    { name: "Gokashin Ensen fire (Up)",  dir: "U",  gap: 150, cast: "isshikiFireCast", proj: "isshikiFire",      tag: "isshiki_fire_fx_uniform",  cost: 45, dmgMin: 40 },
    { name: "Finisher 1 rod barrage (Back)", dir: "B", gap: 140, cast: "isshikiFin1Cast", proj: "isshikiFin1", tag: "isshiki_rod_fx_uniform", cost: 50, dmgMin: 40 },
  ];
  for (const S of SPECIALS) {
    let castOK = null, spent = 0, fx = false, dmg = 0;
    for (let a = 0; a < 6 && !(fx && dmg >= S.dmgMin); a++) {
      await prep(S.gap);
      const en0 = (await p1()).energy, hp0 = (await p2()).health;
      const res = await page.evaluate(d => window.__harness.p1SpecialDir(d), S.dir);
      const en1 = (await p1()).energy; castOK = res?.cast; spent = en0 - en1;
      fx = fx || await waitProj(S.proj, S.tag);
      for (let i = 0; i < 44; i++) await wf(1);
      dmg = Math.max(dmg, hp0 - (await p2()).health);
    }
    check(`${S.name}: cast=${S.cast}`, castOK === S.cast, `cast=${castOK}`);
    check(`${S.name}: spent ~${S.cost} Karma`, Math.abs(spent - S.cost) <= 2.5, `Δ=${spent.toFixed(1)}`);
    check(`${S.name}: FX/projectile spawned`, fx, "");
    check(`${S.name}: connects (dmg ≥ ${S.dmgMin})`, dmg >= S.dmgMin, `dmg=${dmg.toFixed(1)}`);
  }
  // Daikokuten cubes (Down) — the shrink-TRAP: spawns a cube trap on the foe + auto-ticks damage.
  await prep(80);
  const cKarma0 = (await p1()).energy, cHp0 = (await p2()).health;
  const cres = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  const cSpent = cKarma0 - (await p1()).energy;
  await page.waitForFunction(() => window.__harness.cubeTrap() != null, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const trap = await page.evaluate(() => window.__harness.cubeTrap());
  for (let i = 0; i < 60; i++) await wf(1);
  check("Daikokuten cubes (Down): cast=isshikiSukuCast", cres?.cast === "isshikiSukuCast", `cast=${cres?.cast}`);
  check("Daikokuten cubes (Down): spent ~45 Karma", Math.abs(cSpent - 45) <= 2.5, `Δ=${cSpent.toFixed(1)}`);
  check("Daikokuten cubes (Down): spawns a cube TRAP", !!trap, `trap=${JSON.stringify(trap)}`);
  check("Daikokuten cubes (Down): trap auto-ticks damage", cHp0 - (await p2()).health > 0, `dmg=${(cHp0 - (await p2()).health).toFixed(1)}`);

  // Finisher 2 — airborne Special (aerial dash-slash).
  let f2Move = null, f2Spent = 0, f2Dmg = 0;
  for (let a = 0; a < 6 && f2Dmg < 30; a++) {
    await prep(58); await page.evaluate(() => window.__harness.liftP1(50));
    const en0 = (await p1()).energy, hp0 = (await p2()).health;
    const res = await page.evaluate(() => window.__harness.p1SpecialDir(null));
    f2Move = res?.cast || (await p1()).castMove; f2Spent = en0 - (await p1()).energy;
    for (let i = 0; i < 18; i++) await wf(1);
    f2Dmg = Math.max(f2Dmg, hp0 - (await p2()).health);
  }
  check("Finisher 2 (airborne): move=isshikiFin2", f2Move === "isshikiFin2", `move=${f2Move}`);
  check("Finisher 2: spent ~45 Karma", Math.abs(f2Spent - 45) <= 2.5, `Δ=${f2Spent.toFixed(1)}`);
  check("Finisher 2: connects (dmg ≥ 30)", f2Dmg >= 30, `dmg=${f2Dmg.toFixed(1)}`);

  // ── ULTIMATE — Daikokuten Barrage cinematic (LIVE fighter, guaranteed nuke) ──
  section("Ultimate: Daikokuten Barrage (inline camera-focus cinematic)");
  await prep(120);
  const uEn0 = (await p1()).energy, uHp0 = (await p2()).health;
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
  const uEn1 = (await p1()).energy;
  let ultCast = null, ultRods = false, minHp = uHp0;
  for (let i = 0; i < 60; i++) {
    const a = await p1();
    if (a.castMove === "isshikiUltCast" && (a.spriteSheet || "").includes("isshiki_ult_cast_uniform")) ultCast = a.spriteSheet;
    if ((await projs()).some(p => p.name === "isshikiUltRods" || (p.sheet || "").includes("isshiki_ult_rods_uniform"))) ultRods = true;
    minHp = Math.min(minHp, (await p2()).health); await wf(1);
  }
  check("ult cost spent (~100)", uEn0 - uEn1 >= 95, `spent=${(uEn0 - uEn1).toFixed(0)}`);
  check("LIVE fighter renders the ult windup cast (no dup instance)", (ultCast || "").includes("isshiki_ult_cast_uniform"), `sheet=${ultCast}`);
  check("Daikokuten rod-rain payoff spawned (effects.png)", ultRods, "");
  check("ultimate dealt heavy GUARANTEED damage (≥ 120)", uHp0 - minHp >= 120, `dmg=${(uHp0 - minHp).toFixed(1)}`);

  // ── RUNTIME FALLBACK-BOX SWEEP — force EVERY animationData action; none may render null/box ──
  section("fallback-box sweep — every action renders a real isshiki_ sheet (no 128² box)");
  await prep(80);
  const boxes = [];
  for (const act of Object.keys(ad)) {
    await force(act); await wf(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("isshiki_")) boxes.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await wf(1);
  }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Isshiki canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
