// harness/onoki.test.mjs — CANONICAL Onoki (Third Tsuchikage, Naruto) suite (mirrors saitama.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// "Particle" label, ground↔flight movement (dedicated fly art), 5 normals + Fwd+Heavy command normal,
// the 6 Dust Release specials (dir-branch + the dual-use P-hold jutsu), the flight-mode air specials +
// Rock Platform Ride, the persistent GOLEM summon ultimate, a STATIC sheet+portrait sweep (incl. the golem
// + projectile sheets referenced outside animationData), and a RUNTIME fallback-box sweep.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait + golem/projectile art is a real file. ──
section("STATIC — every animationData sheet + portrait + golem/projectile art exists on disk");
const onoki = characters.onoki;
const ad = onoki.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
// Referenced in summons.js / abilities.js (NOT animationData) — assert explicitly too.
const extra = [
  "./onoki_golem_idle_uniform.png", "./onoki_golem_transition_uniform.png",
  "./onoki_golem_swing_uniform.png", "./onoki_golem_punch_uniform.png",
  "./onoki_rock_proj_uniform.png",
];
const missing = [];
for (const s of [...sheets, ...extra, onoki.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + ${extra.length} golem/proj + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (onoki_portrait.png)", (onoki.portrait || "").includes("onoki_portrait"), `portrait=${onoki.portrait}`);
check("stats HP1120/EN200/atk88/def82/spd84 + canFly + energyType particle + scale1.55",
  onoki.stats.maxHealth === 1120 && onoki.stats.maxEnergy === 200 && onoki.stats.attack === 88 && onoki.stats.defense === 82 &&
  onoki.stats.speed === 84 && onoki.traits.canFly === true && onoki.traits.energyType === "particle" && Math.abs(onoki.spriteScale - 1.55) < 0.01,
  JSON.stringify(onoki.stats));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const summons = () => page.evaluate(() => window.__harness.summons());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const flightToggle = () => page.evaluate(() => window.__harness.onokiFlightToggle("p1"));
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1)); await wf(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=onoki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Onoki", g.key === "onoki", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = onoki_idle_uniform", (g.spriteSheet || "").includes("onoki_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.55", Math.abs((g.spriteScale || 0) - 1.55) < 0.01, `${g.spriteScale}`);
  check("HP 1120 / EN 200", g.maxHealth === 1120 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("onoki"));
  check("portrait wired to ./onoki_portrait.png", (portrait || "").includes("onoki_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Particle", energyLabel === "Particle", `label=${energyLabel}`);

  section("movement / state + ground↔flight toggle (dedicated flight art)");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = onoki_walk_uniform", (rn.spriteSheet || "").includes("onoki_walk_uniform"), `sheet=${rn.spriteSheet}`);
  await grounded();
  const t1 = await flightToggle(); await wf(4); const fh = await p1();
  check("flight ON → _flightActive + onoki_hover_idle (dedicated fly art)", t1.flightActive === true && (fh.spriteSheet || "").includes("onoki_hover_idle_uniform"), `flight=${fh.flightActive} sheet=${fh.spriteSheet}`);
  await page.keyboard.down("d"); await wf(6); const fm = await p1(); await page.keyboard.up("d");
  check("flight move → onoki_flight_glide (flyMove art)", (fm.spriteSheet || "").includes("onoki_flight_glide_uniform"), `sheet=${fm.spriteSheet}`);
  await flightToggle(); await grounded();

  section("normals connect + Fwd+Heavy command normal");
  for (const [name, key] of [["light", "j"], ["heavy", "k"]]) {
    let dealt = 0;
    for (let attempt = 0; attempt < 3 && dealt <= 0; attempt++) {
      await prep(48); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); await page.keyboard.up(key); await wf(10);
      dealt = h0 - (await p2()).health;
    }
    check(`${name} connects (${dealt.toFixed(0)} dmg)`, dealt > 0, `dmg=${dealt}`);
  }
  let cmdMove = "", cmdDmg = 0;
  for (let attempt = 0; attempt < 4 && !(cmdMove === "onokiCombo" && cmdDmg > 0); attempt++) {
    await prep(50); const h0 = (await p2()).health;
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await wf(2);
    let mv = await p1(); for (let r = 0; r < 5 && mv.currentMove !== "onokiCombo"; r++) { await page.keyboard.down("k"); await wf(1); await page.keyboard.up("k"); await wf(2); mv = await p1(); }
    if (mv.currentMove === "onokiCombo") cmdMove = "onokiCombo";
    await wf(14); await page.keyboard.up(fwd);
    cmdDmg += Math.max(0, h0 - (await p2()).health);
  }
  check("Fwd+Heavy command normal (onokiCombo) fires + connects", cmdMove === "onokiCombo" && cmdDmg > 0, `move=${cmdMove} dmg=${cmdDmg}`);

  section("6 Dust Release specials (dir-branch + P-hold jutsu)");
  for (const [dir, tag, name] of [[null, "onoki_rockfist_uniform", "Rock Fist Transform"], ["F", "onoki_lunge_uniform", "Rock Fist Lunge"], ["B", "onoki_armswing_uniform", "Rock Arm Swing"], ["U", "onoki_tauntfin_uniform", "Taunt Finisher"]]) {
    await prep(58); const h0 = (await p2()).health; const res = await specialDir(dir); let sh = "";
    for (let i = 0; i < 20; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sh = a.spriteSheet; await wf(1); }
    check(`${dir ?? "neutral"} → ${name} renders + connects`, (sh || "").includes(tag) && (h0 - (await p2()).health) > 0, `move=${res?.move} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  // Down = Spinning Cape → rock projectiles
  await prep(120); const capeH0 = (await p2()).health; await specialDir("D");
  let sawRock = false; for (let i = 0; i < 20; i++) { if ((await projs()).some(p => p.name === "onokiRock")) sawRock = true; await wf(1); }
  check("Down → Cape Spin spawns rock projectiles + connects", sawRock && (capeH0 - (await p2()).health) > 0, `sawRock=${sawRock}`);
  // Charge jutsu (P-hold release → Dust blast; P-tap stays flight)
  await prep(150); const jH0 = (await p2()).health; const flightBefore = (await p1()).flightActive;
  await page.keyboard.down("p"); await wf(22); await page.keyboard.up("p");
  let sawBlast = false; for (let i = 0; i < 18; i++) { if ((await projs()).some(p => p.name === "onokiJutsuBlast")) sawBlast = true; await wf(1); }
  check("P-HOLD jutsu fires Dust blast (and P-hold ≠ flight toggle)", sawBlast && (await p1()).flightActive === flightBefore && (jH0 - (await p2()).health) > 0, `blast=${sawBlast}`);

  section("air / flight-mode specials + Rock Platform Ride");
  await prep(44); await page.evaluate(() => window.__harness.liftP1(30)); await wf(1);
  const dv = await specialDir("D"); let dvSheet = ""; for (let i = 0; i < 8; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("onoki_fast_dive_uniform")) dvSheet = a.spriteSheet; await wf(1); }
  check("air Down → Fast Dive (onoki_fast_dive)", dv.move === "onokiFastDive" && dvSheet.includes("onoki_fast_dive_uniform"), `move=${dv.move}`);
  await grounded();
  await prep(46); await page.evaluate(() => window.__harness.liftP1(20)); await wf(1);
  const before = await p1(); const pr = await specialDir("U"); await wf(2); const after = await p1();
  check("air Up → Rock Platform Ride (rises + i-frames)", pr.cast === "onokiPlatformRide" && after.y < before.y - 40 && (after.invulnTimer || 0) > 0, `cast=${pr.cast} dy=${(before.y - after.y).toFixed(0)}`);
  await grounded();

  section("GOLEM SUMMON ULTIMATE (persistent entity)");
  await prep(200); await grounded();
  const ultRes = await page.evaluate(() => window.__harness.p1Ultimate());   // deterministic trigger
  check("ultimate fires (Detachment of the Primitive World)", !!ultRes?.cast, `cast=${ultRes?.cast} castMove=${ultRes?.castMove}`);
  let castSeen = false; for (let i = 0; i < 20 && !castSeen; i++) { await wf(1); if (((await p1()).spriteSheet || "").includes("onoki_ult_cast_uniform")) castSeen = true; }
  check("ultimate cast pose (onoki_ult_cast)", castSeen, "");
  let golem = null; for (let i = 0; i < 40 && !golem; i++) { await wf(2); golem = (await summons()).find(s => s.id === "onokiGolem"); }
  check("persistent golem spawns (onokiGolem, lifetime > 200)", !!golem && golem.lifetime > 200, golem ? `lifetime=${golem.lifetime}` : "none");
  await page.evaluate(() => window.__harness.healP2?.());
  const golemH0 = (await p2()).health; const golemSheets = new Set();
  for (let i = 0; i < 70; i++) { await wf(2); const gg = (await summons()).find(s => s.id === "onokiGolem"); if (gg) golemSheets.add((gg.sheet || "").split("/").pop()); }
  check("golem deals repeated damage over its life", (golemH0 - (await p2()).health) > 0, `dmg=${(golemH0 - (await p2()).health).toFixed(0)}`);
  check("golem pose swaps (≥2 distinct golem sheets)", [...golemSheets].filter(s => s.includes("onoki_golem")).length >= 2, [...golemSheets].join(", "));

  section("fallback-box sweep — every animationData action renders a real onoki_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("onoki_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Onoki canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
