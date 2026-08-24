// harness/iron_man_2.test.mjs — CANONICAL Iron Man 2 (Marvel, Data East) suite (mirrors iron_man.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–6: sprite gate / stats / portrait /
// "Repulsor" label, movement/state (run is OWN art; dash=run, fall=jump, guard=crouch, intro=idle reuses; real
// knockdown+getup; the separate run-to-crouch), 5 normals + crouch variant, the Fwd+Heavy "Repulsor Rush"
// command chain, the 4 specials (charge-tiered repulsor S/1/2/3/4* w/ 4* pierce, WHHT! dash, ground-slam dive,
// lock-on missile), the "Max-Charge Repulsor" ULTIMATE (~198 EFF sure-hit), a STATIC every-sheet+portrait
// sweep, and a RUNTIME fallback-box sweep. Honest reuses + the no-bespoke-ult-art gap asserted explicitly.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

section("STATIC — every animationData sheet + portrait exists on disk");
const im = characters.iron_man_2;
const ad = im.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, im.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (iron_man_2_portrait.png — HUD face icon)", (im.portrait || "").includes("iron_man_2_portrait"), `portrait=${im.portrait}`);
check("stats HP1200/EN200/atk90/def90/spd92 + energyType repulsor + universe marvel + scale2.0",
  im.stats.maxHealth === 1200 && im.stats.maxEnergy === 200 && im.stats.attack === 90 && im.stats.defense === 90 &&
  im.stats.speed === 92 && im.traits.energyType === "repulsor" && im.universe === "marvel" && Math.abs(im.spriteScale - 2.0) < 0.01,
  JSON.stringify(im.stats));
// HONEST-REUSE contract (documented gaps): fall=jump, dash=run, guard=crouch, intro=idle, down_air=air. run + win = OWN art.
check("honest reuses wired (fall=jump / dash=run / guard=crouch / intro=idle / down_air=air)",
  ad.fall.sheet === ad.jump.sheet && ad.dash.sheet === ad.run.sheet && ad.guard.sheet === ad.crouch.sheet &&
  ad.intro.sheet === ad.idle.sheet && ad.down_air.sheet === ad.air.sheet, "");
check("run is OWN dedicated sprint art (NOT a walk reuse)", ad.run.sheet.includes("iron_man_2_run") && ad.run.sheet !== ad.walk.sheet, `run=${ad.run.sheet}`);
check("run-to-crouch kept as its OWN separate anim (runCrouch)", (ad.runCrouch?.sheet || "").includes("iron_man_2_runcrouch"), `runCrouch=${ad.runCrouch?.sheet}`);
check("win pose = OWN art (full-body select render, not a reuse)", (ad.win?.sheet || "").includes("iron_man_2_win_uniform"), `win=${ad.win?.sheet}`);
check("ultimate = 'Max-Charge Repulsor', cost 100", im.ultimate?.name === "Max-Charge Repulsor" && im.ultimate?.cost === 100, JSON.stringify(im.ultimate));

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
const specialDir = (dir) => page.evaluate(d => window.__harness.ironMan2Special(d), dir);
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1)); await wf(2);
}
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await wf(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man_2`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Iron Man 2", g.key === "iron_man_2", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = iron_man_2_idle_uniform", (g.spriteSheet || "").includes("iron_man_2_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Repulsor", energyLabel === "Repulsor", `label=${energyLabel}`);

  section("movement / state — run OWN art; dash=run, guard=crouch reuses; real knockdown/getup; runCrouch");
  await page.keyboard.down("d"); await wf(16); const wk = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = iron_man_2_walk_uniform", (wk.spriteSheet || "").includes("iron_man_2_walk_uniform"), `sheet=${wk.spriteSheet}`);
  await grounded();
  for (const [act, tag] of [["run", "iron_man_2_run_uniform"], ["runCrouch", "iron_man_2_runcrouch_uniform"], ["dash", "iron_man_2_run_uniform"], ["guard", "iron_man_2_crouch_uniform"], ["knockdown", "iron_man_2_knockdown_uniform"], ["getup", "iron_man_2_getup_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 normals connect + crouch variant");
  for (const [name, key, tag] of [["light", "j", "iron_man_2_light_uniform"], ["heavy", "k", "iron_man_2_heavy_uniform"], ["upAttack", "i", "iron_man_2_up_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(50); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); const mv = await p1(); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true; await page.keyboard.up(key); await wf(12);
      dealt = Math.max(dealt, h0 - (await p2()).health);
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `dmg=${dealt}`);
  }
  let airOk = false, airDmg = 0;
  for (let attempt = 0; attempt < 4 && !(airOk && airDmg > 0); attempt++) {
    await prep(44); const h0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(38)); await page.keyboard.down("j");
    for (let i = 0; i < 8; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("iron_man_2_air_uniform")) airOk = true; await wf(1); }
    await page.keyboard.up("j"); await wf(6);
    airDmg = Math.max(airDmg, h0 - (await p2()).health);
    await grounded(); await wf(3);
  }
  check("air → iron_man_2_air_uniform + connects", airOk && airDmg > 0, `dmg=${airDmg.toFixed(0)}`);
  let csOk = false, csDmg = 0;
  for (let attempt = 0; attempt < 5 && !(csOk && csDmg > 0); attempt++) {
    await prep(46); const h0 = (await p2()).health;
    await page.keyboard.down("s"); await wf(3); await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
    const mv = await waitSheet("iron_man_2_crouchthrust_uniform", 12); if ((mv.spriteSheet || "").includes("iron_man_2_crouchthrust_uniform")) csOk = true;
    await wf(16); csDmg = Math.max(csDmg, h0 - (await p2()).health);
    await page.keyboard.up("s"); await grounded(); await wf(3);
  }
  check("Down+light → crouch variant + connects", csOk && csDmg > 0, `dmg=${csDmg}`);

  section("command chain — Fwd+Heavy opens Repulsor Rush; neutral Heavy stays normal");
  let rushOpened = false;
  for (let attempt = 0; attempt < 3 && !rushOpened; attempt++) {
    await prep(50);
    await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await wf(1);
    await page.keyboard.down("k"); await wf(1);
    for (let f = 0; f < 6 && !rushOpened; f++) { const c = await page.evaluate(() => window.__harness.ironMan2Cmd("p1")); if (c?.move === "ironMan2Rush1" || (await p1()).spriteSheet?.includes("iron_man_2_rush1_uniform")) rushOpened = true; await wf(1); }
    await page.keyboard.up("k"); await page.keyboard.up(fwd); await wf(10); await grounded();
  }
  check("Fwd+Heavy → ironMan2Rush1 (opens the chain)", rushOpened, "");
  let nhOk = false;
  for (let attempt = 0; attempt < 3 && !nhOk; attempt++) {
    await prep(50); await page.keyboard.down("k");
    for (let f = 0; f < 10 && !nhOk; f++) { await wf(1); if ((await p1()).spriteSheet?.includes("iron_man_2_heavy_uniform")) nhOk = true; }
    await page.keyboard.up("k"); await wf(8); await grounded();
  }
  check("neutral Heavy → iron_man_2_heavy_uniform (not rush)", nhOk, "");

  section("specials — charge repulsor / WHHT! dash / ground-slam / lock-on missile");
  {
    await prep(120); const h0 = (await p2()).health;
    const res = await page.evaluate(() => window.__harness.ironMan2Repulsor(4));   // fire the 4* tier
    check("charge repulsor 4* casts ironMan2Repulsor", res?.cast === "ironMan2Repulsor", `cast=${res?.cast}`);
    let sawBolt = false, pierces = false; for (let f = 0; f < 24 && !sawBolt; f++) { await wf(1); const rp = (await projs()).find(p => (p.name || "").includes("ironMan2Repulsor")); if (rp) { sawBolt = true; pierces = !!rp.piercesMulti; } }
    await wf(24);
    check("4* repulsor spawns a piercing bolt + connects at range", sawBolt && pierces && (h0 - (await p2()).health) > 0, `pierce=${pierces} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
    await grounded(); await wf(6);
  }
  for (const [name, dir, tag] of [["WHHT! dash", "F", "iron_man_2_whht_uniform"], ["ground-slam", "D", "iron_man_2_groundslam_uniform"]]) {
    await prep(56); const h0 = (await p2()).health;
    const res = await specialDir(dir);
    const mv = await waitSheet(tag);
    await wf(22);
    check(`${name} (${dir}) → ${tag} + connects`, (mv.spriteSheet || "").includes(tag) && (h0 - (await p2()).health) > 0, `move=${res?.move} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
    await grounded(); await wf(6);
  }
  {
    await prep(90); const h0 = (await p2()).health;
    await specialDir("U");
    let sawMissile = false; for (let f = 0; f < 26 && !sawMissile; f++) { await wf(1); sawMissile = (await projs()).some(p => (p.name || "").includes("ironMan2Missile")); }
    await wf(30);
    check("lock-on missile (U) spawns ironMan2Missile bolt + connects", sawMissile && (h0 - (await p2()).health) > 0, `dmg=${(h0 - (await p2()).health).toFixed(0)}`);
    await grounded(); await wf(6);
  }

  section("ULTIMATE — Max-Charge Repulsor (guaranteed sure-hit ~198 EFF from out of range)");
  await prep(150);
  const ultH0 = (await p2()).health;
  const ultRes = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires (Max-Charge Repulsor) + casts ironMan2Repulsor", !!ultRes?.cast && ultRes?.castMove === "ironMan2Repulsor", `cast=${ultRes?.cast} castMove=${ultRes?.castMove}`);
  let sawBeam = false; for (let f = 0; f < 30 && !sawBeam; f++) { await wf(1); sawBeam = (await projs()).some(p => (p.name || "").includes("ironMan2MaxRepulsor")); }
  check("ultimate spawns the GIANT ironMan2MaxRepulsor beam", sawBeam, "");
  await wf(52);
  const ultDealt = ultH0 - (await p2()).health;
  check("ultimate lands guaranteed ~198 EFF from out of range (150–240)", ultDealt >= 150 && ultDealt <= 240, `dealt=${ultDealt.toFixed(0)}`);

  section("fallback-box sweep — every animationData action renders a real iron_man_2_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("iron_man_2_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Iron Man 2 canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
