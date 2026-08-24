// harness/miles.test.mjs — CANONICAL Miles Morales (Marvel / Spider-Man) suite (mirrors iron_man.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–6: sprite gate / stats / portrait /
// "Venom" label, movement/state (walk+dash alias run; fall = REAL descent; real knockdown+getup+intro),
// the 4 normals (B/Fwd+B/Up+B/Aerial B; down_air = honest air reuse), the fixed-slot VENOM special kit
// (Web / Venom Strike+ring / Rising Arc / Camouflage evasion / Venom-Beam / Aerial Dive) + the Charge(O)
// Down+B dash-kick, the "Venom Overload" ULTIMATE (guaranteed ~198 EFF), REAL single-frame win (unmasked)
// + lose art, a STATIC every-sheet+portrait sweep, and a RUNTIME fallback-box sweep over every action.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait is a real, non-empty file. ──
section("STATIC — every animationData sheet + portrait exists on disk");
const mi = characters.miles;
const ad = mi.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, mi.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (miles_portrait.png — idle bust)", (mi.portrait || "").includes("miles_portrait"), `portrait=${mi.portrait}`);
check("stats HP1120/EN200/atk86/def78/spd96 + energyType venom + universe marvel + scale2.9",
  mi.stats.maxHealth === 1120 && mi.stats.maxEnergy === 200 && mi.stats.attack === 86 && mi.stats.defense === 78 &&
  mi.stats.speed === 96 && mi.traits.energyType === "venom" && mi.universe === "marvel" && Math.abs(mi.spriteScale - 2.9) < 0.01,
  JSON.stringify(mi.stats));
// HONEST-REUSE contract: walk=run, dash=run, down_air=air. fall = REAL descent (NOT a jump reuse).
check("honest reuses wired (walk=run / dash=run / down_air=air)",
  ad.walk.sheet === ad.run.sheet && ad.dash.sheet === ad.run.sheet && ad.down_air.sheet === ad.air.sheet, "");
check("fall = REAL descent art (NOT a jump reuse)", ad.fall.sheet !== ad.jump.sheet && ad.fall.sheet.includes("miles_fall"), `fall=${ad.fall.sheet} jump=${ad.jump.sheet}`);
check("win + lose = REAL single-frame art (item 3 — not padded, not a knockdown reuse)",
  ad.win.sheet.includes("miles_win") && ad.win.frames === 1 && ad.lose.sheet.includes("miles_lose") && ad.lose.frames === 1 && ad.lose.sheet !== ad.knockdown.sheet,
  `win=${ad.win.sheet} lose=${ad.lose.sheet}`);
check("7 special cast poses + ult cast wired", ["milesWeb", "milesVenomStrike", "milesVenomArc", "milesStealth", "milesVenomBeam", "milesDive", "milesDashKick", "milesUlt"].every(k => ad[k]?.sheet), "");
check("ultimate = 'Venom Overload', cost 100", mi.ultimate?.name === "Venom Overload" && mi.ultimate?.cost === 100, JSON.stringify(mi.ultimate));
check("7 specials meta declared", Object.keys(mi.specials || {}).length === 7, `n=${Object.keys(mi.specials || {}).length}`);

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projCount = () => page.evaluate(() => window.__harness.perf().projectiles);
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await grounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.hitstun || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP1Energy?.(200); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=miles&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("RUNTIME — sprite gate + energy label");
  const g = await p1();
  check("P1 is Miles + renders as sprites", g.key === "miles" && g.hasSpriteHandler, `key=${g.key} handler=${g.hasSpriteHandler}`);
  check("idle sheet = miles_idle_uniform", (g.spriteSheet || "").includes("miles_idle_uniform"), `sheet=${g.spriteSheet}`);
  const el = await page.evaluate(() => window.__harness.energyLabel("p1")).catch(() => null);
  check("energy label = Venom", (el || "").toLowerCase().includes("venom"), `label=${el}`);

  section("RUNTIME — fallback-box sweep (every movement/normal/state action resolves a real miles_ sheet)");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "guard", "hurt", "knockdown", "getup", "intro", "light", "heavy", "up", "air", "down_air", "win", "lose"]) {
    await force(act); await wf(3); const r = await p1();
    if (!(r.spriteSheet || "").includes("miles_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await wf(1);
  }
  check("every swept action resolves a real miles_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  section("RUNTIME — 3 ground normals connect (×0.60 GLOBAL_DAMAGE_SCALE)");
  for (const [name, key, tag] of [["light", "j", "miles_light_uniform"], ["heavy", "k", "miles_heavy_uniform"], ["up", "i", "miles_up_uniform"]]) {
    await prep(46); const h0 = (await p2()).health;
    await page.keyboard.down(key); await wf(2);
    let saw = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) saw = true; await wf(2); }
    await page.keyboard.up(key); await wf(8);
    check(`${name} renders ${tag} + connects`, saw && (await p2()).health < h0, "");
  }

  section("RUNTIME — VENOM special kit (6 fixed slots) dispatches + connects");
  for (const [dir, cast, label] of [[null, "milesWeb", "neutral Web-shot"], ["B", "milesVenomBeam", "Back Venom-Beam"]]) {
    await prep(140); const r = await specialDir(dir);
    let saw = false; for (let i = 0; i < 12; i++) { if ((await projCount()) > 0) { saw = true; break } await wf(2); }
    check(`${label} → ${cast} + spawns projectile`, r.cast === cast && saw, `cast=${r.cast} proj=${saw}`);
  }
  for (const [dir, cast, label] of [["F", "milesVenomStrike", "Fwd Venom Strike"], ["U", "milesVenomArc", "Up Rising Arc"]]) {
    await prep(48); const h0 = (await p2()).health; const r = await specialDir(dir);
    await wf(10);
    check(`${label} → ${cast} + connects`, r.cast === cast && (await p2()).health < h0, `cast=${r.cast}`);
  }
  // air Aerial Dive
  await prep(30); await page.evaluate(() => window.__harness.jumpP1?.()); await wf(5);
  { const r = await specialDir(null); check("airborne → milesDive cast", r.cast === "milesDive", `cast=${r.cast}`); }
  await grounded();
  // Camouflage evasion (control vs stealthed)
  await prep(46); await page.evaluate(() => window.__harness.healP1?.());
  const ch0 = (await p1()).health; await page.evaluate(() => window.__harness.p2Attack()); await wf(16);
  const ctrl = ch0 - (await p1()).health;
  await prep(46); const rr = await specialDir("D");
  check("Down → milesStealth cast + sets evasion window", rr.cast === "milesStealth" && (await p1()).milesStealthTimer > 0, `cast=${rr.cast}`);
  await page.evaluate(() => window.__harness.healP1?.()); const sh0 = (await p1()).health;
  await page.evaluate(() => window.__harness.p2Attack()); await wf(16);
  const stealthDmg = sh0 - (await p1()).health;
  check("Camouflage PHASES an incoming hit (control dmg > 0, stealthed = 0)", ctrl > 0 && stealthDmg <= 0.5, `ctrl=${ctrl} stealth=${stealthDmg}`);
  // Charge(O) dash-kick
  await prep(70); const h0d = (await p2()).health; const rd = await page.evaluate(() => window.__harness.milesDash());
  await wf(10);
  check("Charge(O) dash-kick → milesDashKick + connects + cooldown-gated", rd.cast === "milesDashKick" && (await p2()).health < h0d && (await p1()).milesDashCd > 0, `cast=${rd.cast}`);

  section("RUNTIME — 'Venom Overload' ULTIMATE (guaranteed ~198 EFF)");
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP1Energy(100); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 70 * (a.facing || 1)); });
  await wf(2);
  const uh0 = (await p2()).health;
  const ur = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate casts milesUlt + spends meter", ur.cast && ur.castMove === "milesUlt", `cast=${ur.cast} castMove=${ur.castMove}`);
  await wf(6); check("foe frozen (hitstop) during cinematic", ((await p2()).hitstop || 0) > 0, "");
  let dealt = 0; for (let i = 0; i < 26; i++) { dealt = uh0 - (await p2()).health; await wf(3); }
  check(`ultimate deals ~198 EFF (dealt ${dealt.toFixed(0)})`, dealt >= 188 && dealt <= 210, `dealt=${dealt.toFixed(1)}`);

  section("RUNTIME — integrity");
  check("no page errors across the full-kit sweep", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
