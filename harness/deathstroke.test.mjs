// harness/deathstroke.test.mjs — CANONICAL Deathstroke (Slade Wilson, DC) suite (mirrors onoki.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// "Adrenaline" label, movement/state (distinct walk vs run + real knockdown+getup art), 5 normals + the
// crouch-stab variant, the 5 directional specials (sword/draw-cut/gun-projectile/running-slash + air spin),
// the promoted "Killing Stroke" ULTIMATE (guaranteed sure-hit), a STATIC every-sheet+portrait sweep, and a
// RUNTIME fallback-box sweep over every animationData action. Honest reuses (dash=run/fall=jump/guard=idle/
// down_air=air) + the win-pose gap (repurposed row_11 ready-stance) are asserted explicitly.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait is a real, non-empty file. ──
section("STATIC — every animationData sheet + portrait exists on disk");
const ds = characters.deathstroke;
const ad = ds.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, ds.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (deathstroke_portrait.png — the mask icon)", (ds.portrait || "").includes("deathstroke_portrait"), `portrait=${ds.portrait}`);
check("stats HP1150/EN120/atk92/def86/spd92 + energyType adrenaline + universe dc + scale1.3",
  ds.stats.maxHealth === 1150 && ds.stats.maxEnergy === 120 && ds.stats.attack === 92 && ds.stats.defense === 86 &&
  ds.stats.speed === 92 && ds.traits.energyType === "adrenaline" && ds.universe === "dc" && Math.abs(ds.spriteScale - 1.3) < 0.01,
  JSON.stringify(ds.stats));
// HONEST-REUSE contract (documented gaps): dash=run, fall=jump, guard=idle, down_air=air.
check("honest reuses wired (dash=run / fall=jump / guard=idle / down_air=air)",
  ad.dash.sheet === ad.run.sheet && ad.fall.sheet === ad.jump.sheet && ad.guard.sheet === ad.idle.sheet && ad.down_air.sheet === ad.air.sheet, "");
check("win pose present (repurposed row_11 ready-stance — no unique win art, flagged)", (ad.win?.sheet || "").includes("deathstroke_win_uniform"), `win=${ad.win?.sheet}`);

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
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

try {
  await page.goto(`${base}/index.html?harness=1&p1=deathstroke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Deathstroke", g.key === "deathstroke", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = deathstroke_idle_uniform", (g.spriteSheet || "").includes("deathstroke_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.3", Math.abs((g.spriteScale || 0) - 1.3) < 0.01, `${g.spriteScale}`);
  check("HP 1150 / EN 120", g.maxHealth === 1150 && g.maxEnergy === 120, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Adrenaline", energyLabel === "Adrenaline", `label=${energyLabel}`);

  section("movement / state — distinct walk vs run + real knockdown/getup art");
  await page.keyboard.down("d"); await wf(16); const wk = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = deathstroke_walk_uniform (dedicated, not aliased to run)", (wk.spriteSheet || "").includes("deathstroke_walk_uniform"), `sheet=${wk.spriteSheet}`);
  await grounded();
  await force("run"); await wf(3); const rn = await p1(); await force(null);
  check("run = deathstroke_run_uniform (distinct sprint)", (rn.spriteSheet || "").includes("deathstroke_run_uniform"), `sheet=${rn.spriteSheet}`);
  for (const [act, tag] of [["knockdown", "deathstroke_knockdown_uniform"], ["getup", "deathstroke_getup_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} = real ${tag} art (row_06 death/wakeup)`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 normals connect + crouch-stab variant");
  for (const [name, key, tag] of [["light", "j", "deathstroke_light_uniform"], ["heavy", "k", "deathstroke_heavy_uniform"], ["upAttack", "i", "deathstroke_up_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(50); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); const mv = await p1(); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true; await page.keyboard.up(key); await wf(12);
      dealt = Math.max(dealt, h0 - (await p2()).health);
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `dmg=${dealt}`);
  }
  // air normal (J airborne) — timing-sensitive; retry (Stage-2 harness is the authoritative connect check)
  let airOk = false, airDmg = 0;
  for (let attempt = 0; attempt < 4 && !(airOk && airDmg > 0); attempt++) {
    await prep(44); const h0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(38)); await page.keyboard.down("j");
    for (let i = 0; i < 8; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("deathstroke_air_uniform")) airOk = true; await wf(1); }
    await page.keyboard.up("j"); await wf(6);
    airDmg = Math.max(airDmg, h0 - (await p2()).health);
    await grounded(); await wf(3);
  }
  check("air → deathstroke_air_uniform + connects", airOk && airDmg > 0, `dmg=${airDmg.toFixed(0)}`);
  await grounded();
  // crouch-stab variant (Down+light)
  let csOk = false, csDmg = 0;
  for (let attempt = 0; attempt < 4 && !(csOk && csDmg > 0); attempt++) {
    await prep(46); const h0 = (await p2()).health;
    await page.keyboard.down("s"); await wf(3); await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
    for (let i = 0; i < 10; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("deathstroke_crouchstab_uniform")) csOk = true; await wf(1); }
    csDmg += Math.max(0, h0 - (await p2()).health); await page.keyboard.up("s"); await grounded(); await wf(3);
  }
  check("Down+light → crouch-stab variant + connects", csOk && csDmg > 0, `dmg=${csDmg}`);

  section("5 directional specials (sword / draw-cut / gun-projectile / running-slash + air spin)");
  for (const [dir, move, tag] of [[null, "dsSwordSlash", "deathstroke_swordslash_uniform"], ["F", "dsDrawCut", "deathstroke_drawcut_uniform"], ["D", "dsRunSlash", "deathstroke_runslash_uniform"]]) {
    await prep(54); const h0 = (await p2()).health; const res = await specialDir(dir); let sh = "";
    for (let i = 0; i < 18; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sh = a.spriteSheet; await wf(1); }
    check(`${dir ?? "neutral"} → ${move} renders + connects`, res?.move === move && (sh || "").includes(tag) && (h0 - (await p2()).health) > 0, `move=${res?.move} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  // Back = Gun Shot (projectile)
  await prep(150); const gunH0 = (await p2()).health; const gunRes = await specialDir("B");
  let sawBullet = false; for (let i = 0; i < 20; i++) { if ((await projs()).some(p => (p.name || "").includes("deathstrokeBullet"))) sawBullet = true; await wf(1); }
  await wf(20);
  check("Back → Gun Shot (dsGun) spawns deathstrokeBullet + connects", gunRes?.cast === "dsGun" && sawBullet && (gunH0 - (await p2()).health) > 0, `cast=${gunRes?.cast} bullet=${sawBullet}`);
  await grounded();
  // Air = Aerial Spin
  await prep(46); const airH0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(46)); const airRes = await specialDir(null);
  let airSh = ""; for (let i = 0; i < 12; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("deathstroke_aerialspin_uniform")) airSh = a.spriteSheet; await wf(1); }
  check("air → Aerial Spin (dsAerialSpin) renders + connects", airRes?.move === "dsAerialSpin" && airSh.includes("deathstroke_aerialspin_uniform") && (airH0 - (await p2()).health) > 0, `move=${airRes?.move}`);
  await grounded();

  section("promoted ULTIMATE — Killing Stroke (guaranteed sure-hit, no dup)");
  await prep(150);   // out of melee range → proves range-independence
  const ultH0 = (await p2()).health;
  const ultRes = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires (Killing Stroke) + casts dsUlt", !!ultRes?.cast && ultRes?.castMove === "dsUlt", `cast=${ultRes?.cast} castMove=${ultRes?.castMove}`);
  let ultCast = false; for (let i = 0; i < 20 && !ultCast; i++) { await wf(1); if (((await p1()).spriteSheet || "").includes("deathstroke_ult_uniform")) ultCast = true; }
  check("ultimate cast pose (deathstroke_ult_uniform)", ultCast, "");
  await wf(52);
  const ultDealt = ultH0 - (await p2()).health;
  check("ultimate lands guaranteed ~198 EFF from out of range (150–240)", ultDealt >= 150 && ultDealt <= 240, `dealt=${ultDealt.toFixed(0)}`);

  section("fallback-box sweep — every animationData action renders a real deathstroke_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("deathstroke_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Deathstroke canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
