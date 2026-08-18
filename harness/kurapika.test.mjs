// harness/kurapika.test.mjs — CANONICAL Kurapika (Hunter x Hunter) suite (mirrors onoki.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// "Nen" label, movement, 5 normals + Fwd+Heavy windmill command normal, the 3 canon Nen specials (Judgment /
// Chain Jail bind / Steal Chain counter) + the Shock status special, the Emperor Time transformation ultimate
// (Set B __emperor whole-moveset swap + buff + post-revert vulnerability), a STATIC sheet+portrait sweep (incl.
// the Emperor-Time art + the jailfx projectile referenced outside base animationData), and a RUNTIME box sweep.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet (base + Emperor Time) + portrait + jailfx exists. ──
section("STATIC — every animationData + Emperor Time sheet + portrait + jailfx exists on disk");
const kurapika = characters.kurapika;
const ad = kurapika.animationData;
const emp = kurapika.emperorAnim;
const sheets = [...new Set([...Object.values(ad), ...Object.values(emp)].map(e => e.sheet).filter(Boolean))];
const extra = ["./kurapika_jailfx_uniform.png"];   // Chain Jail bind FX (spawned as a projectile, not an animationData action)
const missing = [];
for (const s of [...sheets, ...extra, kurapika.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim/emperor sheets + jailfx + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("Emperor Time art is the scarlet Set B (__emperor sheets)", Object.values(emp).every(e => (e.sheet || "").includes("__emperor")), "");
check("stats HP1080/EN200/atk88/def84/spd92 + energyType nen + scale2.1",
  kurapika.stats.maxHealth === 1080 && kurapika.stats.maxEnergy === 200 && kurapika.stats.attack === 88 && kurapika.stats.defense === 84 &&
  kurapika.stats.speed === 92 && kurapika.traits.energyType === "nen" && Math.abs(kurapika.spriteScale - 2.1) < 0.01,
  JSON.stringify(kurapika.stats));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
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
async function sawSheet(tag, frames = 20) { let seen = ""; for (let i = 0; i < frames; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) seen = a.spriteSheet; await wf(1); } return seen; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kurapika`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Kurapika", g.key === "kurapika", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = kurapika_idle_uniform", (g.spriteSheet || "").includes("kurapika_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.1", Math.abs((g.spriteScale || 0) - 2.1) < 0.01, `${g.spriteScale}`);
  check("HP 1080 / EN 200", g.maxHealth === 1080 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("kurapika"));
  check("portrait wired to ./kurapika_portrait.png", (portrait || "").includes("kurapika_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Nen", energyLabel === "Nen", `label=${energyLabel}`);
  const univ = await page.evaluate(() => window.__harness.charDef("kurapika")?.universe);
  check("universe = hunter_x_hunter", univ === "hunter_x_hunter", `universe=${univ}`);

  section("movement / state");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk/run uses a kurapika walk/run sheet", /kurapika_(walk|run)_uniform/.test(rn.spriteSheet || ""), `sheet=${rn.spriteSheet}`);
  await grounded();

  section("5 normals connect + Fwd+Heavy windmill command normal");
  for (const [name, key] of [["light", "j"], ["heavy", "k"], ["upAttack", "i"]]) {
    let dealt = 0;
    for (let attempt = 0; attempt < 3 && dealt <= 0; attempt++) {
      await prep(46); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); await page.keyboard.up(key); await wf(12);
      dealt = h0 - (await p2()).health;
    }
    check(`${name} connects (${dealt.toFixed(0)} dmg)`, dealt > 0, `dmg=${dealt}`);
  }
  let cmdMove = "", cmdDmg = 0;
  for (let attempt = 0; attempt < 4 && !(cmdMove === "kurapikaWindmill" && cmdDmg > 0); attempt++) {
    await prep(48); const h0 = (await p2()).health;
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await wf(2);
    await page.keyboard.down("k"); await wf(1); await page.keyboard.up("k");
    let mv = await p1(); for (let r = 0; r < 8 && mv.currentMove !== "kurapikaWindmill"; r++) { await wf(1); mv = await p1(); }
    if (mv.currentMove === "kurapikaWindmill") cmdMove = "kurapikaWindmill";
    await wf(16); await page.keyboard.up(fwd);
    cmdDmg += Math.max(0, h0 - (await p2()).health);
  }
  check("Fwd+Heavy windmill (kurapikaWindmill) fires + connects", cmdMove === "kurapikaWindmill" && cmdDmg > 0, `move=${cmdMove} dmg=${cmdDmg}`);

  section("3 canon Nen specials + Shock status special");
  // Judgment Chain (neutral) — long-reach multi-hit
  await prep(70); { const h0 = (await p2()).health; const res = await specialDir(null); const sh = await sawSheet("kurapika_judgment_uniform"); await wf(8);
    check("neutral → Judgment Chain (renders + connects at range)", res.cast === "kurapikaJudgment" && sh.includes("kurapika_judgment_uniform") && (h0 - (await p2()).health) > 0, `cast=${res.cast}`); }
  await grounded(); await wf(6);
  // Chain Jail (Down) — bind. Interleave sheet-detect + PEAK-hitstun capture in ONE loop (hitstun decays from
  // 55 each frame, so a separate post-loop sample can catch the decayed tail → flaky).
  await prep(38); { const h0 = (await p2()).health; const res = await specialDir("D"); let sh = "", peak = 0;
    for (let i = 0; i < 20; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("kurapika_chainjail_uniform")) sh = a.spriteSheet; peak = Math.max(peak, (await p2()).hitstun || 0); if (peak >= 40 && sh) break; await wf(1); }
    check("Down → Chain Jail (renders + BINDS: high hitstun)", res.cast === "kurapikaChainJail" && sh.includes("kurapika_chainjail_uniform") && peak >= 40 && (h0 - (await p2()).health) > 0, `cast=${res.cast} peakStun=${peak}`); }
  await grounded(); await wf(6);
  // Shock (Fwd) — stun
  await prep(46); { const h0 = (await p2()).health; const res = await specialDir("F"); const sh = await sawSheet("kurapika_shock_uniform");
    check("Fwd → Shock Strike (renders + connects)", res.cast === "kurapikaShock" && sh.includes("kurapika_shock_uniform") && (h0 - (await p2()).health) > 0, `cast=${res.cast}`); }
  await grounded(); await wf(6);
  // Steal Chain (Back) — counter
  await prep(52); { await page.evaluate(() => window.__harness.setP1Energy(120)); const res = await specialDir("B"); await wf(1);
    const before = await page.evaluate(() => ({ p1: window.__harness.p1().health, p2: window.__harness.p2().health, en: window.__harness.p1().energy }));
    await page.evaluate(() => window.__harness.p2Attack()); await wf(16);
    const after = await page.evaluate(() => ({ p1: window.__harness.p1().health, p2: window.__harness.p2().health, en: window.__harness.p1().energy }));
    check("Back → Steal Chain (counter: negate + riposte + Nen steal)", res.cast === "kurapikaSteal" && after.p1 === before.p1 && after.p2 < before.p2 && after.en > before.en, `p1 ${before.p1}→${after.p1} p2 ${before.p2}→${after.p2} en ${before.en.toFixed(0)}→${after.en.toFixed(0)}`); }
  await grounded(); await wf(6);

  section("Emperor Time ultimate (Set B transformation + buff + post-revert vulnerability)");
  await prep(80); await grounded();
  await page.evaluate(() => window.__harness.fillEnergy());
  const ult = await page.evaluate(() => window.__harness.p1Ultimate()); await wf(3);
  let em = await p1();
  check("Emperor Time activates (buff ×1.30 + timer)", !!ult.cast && em.emperorActive && Math.abs(em.damageMultiplier - 1.30) < 0.001 && em.emperorTimer > 0, `active=${em.emperorActive} mult=${em.damageMultiplier}`);
  await force("idle"); const es = await sawSheet("kurapika_idle_uniform__emperor", 8);
  check("whole-moveset swaps to scarlet Set B (__emperor)", es.includes("kurapika_idle_uniform__emperor"), `sheet=${es}`);
  await force(null);
  await page.evaluate(() => window.__harness.p1EmperorExpire()); await wf(4); em = await p1();
  check("auto-reverts + arms post-revert vulnerability (canon memory-gap)", !em.emperorActive && em.currentForm === "base" && em.emperorRevertVuln > 0, `active=${em.emperorActive} vuln=${em.emperorRevertVuln}`);

  section("fallback-box sweep — every base animationData action renders a real kurapika_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("kurapika_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kurapika canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
