// harness/yuta.test.mjs — CANONICAL Yuta Okkotsu (Jujutsu Kaisen) suite (mirrors deathstroke.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// "Cursed Energy" label, movement/state (real knockdown+getup art), 5 normals, the Fwd+Heavy sword-combo
// opener, the 5 directional specials (CEM beam / Strong Attack / Kick 4 launcher / Cursed Speech stun-shout /
// RCT self-heal), the "Rika's Invocation" AI-assist ULTIMATE (persistent Rika summon), a STATIC every-sheet+
// portrait sweep, and a RUNTIME fallback-box sweep over every animationData action. Honest reuses
// (run=walk / dash=walk / jump=idle / fall=idle / down_air=air / combo1=heavy / lose=knockdown) + the win-pose
// gap (repurposed row_16 stance) are asserted explicitly.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait is a real, non-empty file. ──
section("STATIC — every animationData sheet + portrait exists on disk");
const y = characters.yuta;
const ad = y.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const rikaSheets = ["./rika_idle_uniform.png", "./rika_reach_uniform.png", "./rika_screech_uniform.png", "./rika_spawn_uniform.png"];
const missing = [];
for (const s of [...sheets, ...rikaSheets, y.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + 4 Rika assist sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (yuta_portrait.png — carved header bust)", (y.portrait || "").includes("yuta_portrait"), `portrait=${y.portrait}`);
check("stats HP1150/EN200/atk90/def84/spd94 + energyType cursed_energy + universe jujutsu_kaisen + scale1.9",
  y.stats.maxHealth === 1150 && y.stats.maxEnergy === 200 && y.stats.attack === 90 && y.stats.defense === 84 &&
  y.stats.speed === 94 && y.traits.energyType === "cursed_energy" && y.universe === "jujutsu_kaisen" && Math.abs(y.spriteScale - 1.9) < 0.01,
  JSON.stringify(y.stats));
// HONEST-REUSE contract (documented gaps): run=walk, dash=walk, jump=idle, fall=idle, down_air=air, combo1=heavy, lose=knockdown.
check("honest reuses wired (run=walk / dash=walk / jump=idle / fall=idle / down_air=air / combo1=heavy / lose=knockdown)",
  ad.run.sheet === ad.walk.sheet && ad.dash.sheet === ad.walk.sheet && ad.jump.sheet === ad.idle.sheet &&
  ad.fall.sheet === ad.idle.sheet && ad.down_air.sheet === ad.air.sheet && ad.yutaCombo1.sheet === ad.heavy.sheet &&
  ad.lose.sheet === ad.knockdown.sheet, "");
check("win pose present (repurposed row_16 stance — no unique win art, flagged)", (ad.win?.sheet || "").includes("yuta_win_uniform"), `win=${ad.win?.sheet}`);
check("ultimate defined: Rika's Invocation, cost 100", y.ultimate?.name === "Rika's Invocation" && y.ultimate?.cost === 100, JSON.stringify(y.ultimate));

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
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.setP1Energy?.(200); }, a.x + gap * (a.facing || 1)); await wf(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuta`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Yuta", g.key === "yuta", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = yuta_idle_uniform", (g.spriteSheet || "").includes("yuta_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.9", Math.abs((g.spriteScale || 0) - 1.9) < 0.01, `${g.spriteScale}`);
  check("HP 1150 / EN 200", g.maxHealth === 1150 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Cursed Energy", energyLabel === "Cursed Energy", `label=${energyLabel}`);

  section("movement / state — walk + real knockdown/getup art");
  await page.keyboard.down("d"); await wf(16); const wk = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = yuta_walk_uniform", (wk.spriteSheet || "").includes("yuta_walk_uniform"), `sheet=${wk.spriteSheet}`);
  await grounded();
  for (const [act, tag] of [["knockdown", "yuta_knockdown_uniform"], ["getup", "yuta_getup_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} = real ${tag} art (row_04 KO seq)`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 normals connect");
  for (const [name, key, tag] of [["light", "j", "yuta_light_uniform"], ["heavy", "k", "yuta_heavy_uniform"], ["upAttack", "i", "yuta_up_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(48); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); const mv = await p1(); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true; await page.keyboard.up(key); await wf(12);
      dealt = Math.max(dealt, h0 - (await p2()).health);
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `dmg=${dealt}`);
  }
  let airOk = false, airDmg = 0;
  for (let attempt = 0; attempt < 5 && !(airOk && airDmg > 0); attempt++) {
    await prep(42); const h0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(44)); await wf(2);   // ensure airborne before the aerial input (else a ground light fires)
    await page.keyboard.down("j");
    for (let i = 0; i < 12; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("yuta_air_uniform")) airOk = true; await wf(1); }
    await page.keyboard.up("j"); await wf(6);
    airDmg = Math.max(airDmg, h0 - (await p2()).health);
    await grounded(); await wf(3);
  }
  check("air → yuta_air_uniform + connects", airOk && airDmg > 0, `airSheet=${airOk} dmg=${airDmg.toFixed(0)}`);
  await grounded();

  section("sword-combo opener (Fwd+Heavy → yutaCombo1, cancel-on-hit chain is authoritative in stage3)");
  {
    let comboOk = false, dealt = 0;
    for (let attempt = 0; attempt < 3 && !(comboOk && dealt > 0); attempt++) {
      await prep(46); const h0 = (await p2()).health;
      await page.keyboard.down("d"); await page.keyboard.down("k"); await wf(2); await page.keyboard.up("k");
      for (let i = 0; i < 10; i++) { const c = await page.evaluate(() => window.__harness.yutaCmd()); if (c?.move === "yutaCombo1") comboOk = true; await wf(1); }
      await page.keyboard.up("d"); await wf(6);
      dealt = Math.max(dealt, h0 - (await p2()).health);
    }
    check("Fwd+Heavy opens yutaCombo1 + connects", comboOk && dealt > 0, `dmg=${dealt.toFixed(0)}`);
  }
  await grounded();

  section("5 directional specials (CEM beam / Strong / Kick 4 launcher / Cursed Speech stun / RCT heal)");
  // F = Strong Attack, D = Kick 4 (melee)
  for (const [dir, move, tag] of [["F", "yutaStrong", "yuta_strong_uniform"], ["D", "yutaKick4", "yuta_kick4_uniform"]]) {
    await prep(52); const h0 = (await p2()).health; const res = await specialDir(dir); let sh = "";
    for (let i = 0; i < 18; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sh = a.spriteSheet; await wf(1); }
    check(`${dir} → ${move} renders + connects`, res?.move === move && (sh || "").includes(tag) && (h0 - (await p2()).health) > 0, `move=${res?.move} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  // neutral = CEM beam (projectile)
  await prep(150); const cemH0 = (await p2()).health; const cemRes = await specialDir(null);
  let sawBeam = false; for (let i = 0; i < 20; i++) { if ((await projs()).some(p => (p.name || "").includes("yutaCem"))) sawBeam = true; await wf(1); }
  await wf(16);
  check("neutral → CEM (yutaCem) spawns beam + connects", cemRes?.cast === "yutaCem" && sawBeam && (cemH0 - (await p2()).health) > 0, `cast=${cemRes?.cast} beam=${sawBeam}`);
  await grounded();
  // Up = Cursed Speech (short shout, heavy stun)
  await prep(112); const spH0 = (await p2()).health; const spRes = await specialDir("U");
  let sawShout = false, stun = 0; for (let i = 0; i < 24; i++) { if ((await projs()).some(p => (p.name || "").includes("yutaSpeech"))) sawShout = true; stun = Math.max(stun, (await p2()).hitstun || 0); await wf(1); }
  check("Up → Cursed Speech (yutaSpeech) spawns shout + heavy stun + connects", spRes?.cast === "yutaSpeech" && sawShout && stun >= 30 && (spH0 - (await p2()).health) > 0, `cast=${spRes?.cast} stun=${stun}`);
  await grounded();
  // Back = RCT self-heal
  await page.evaluate(() => { window.__harness.setP1Health(500); window.__harness.setP1Energy?.(200); }); await wf(2);
  const rctH0 = (await p1()).health; const rctRes = await specialDir("B");
  let healed = rctH0; for (let i = 0; i < 40; i++) { healed = Math.max(healed, (await p1()).health); await wf(1); }
  check("Back → RCT (yutaRct) self-heals (HP rises)", rctRes?.cast === "yutaRct" && healed > rctH0, `+${(healed - rctH0).toFixed(0)}`);
  await grounded();

  section("Rika's Invocation ULTIMATE — persistent AI assist (range-independent)");
  await prep(200); await page.evaluate(() => window.__harness.setP1Energy?.(200)); await wf(1);
  const ultRes = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires (Rika's Invocation) + casts yutaUltCast", !!ultRes?.cast && ultRes?.castMove === "yutaUltCast", `cast=${ultRes?.cast} castMove=${ultRes?.castMove}`);
  let rika = null; for (let i = 0; i < 40 && !rika; i++) { await wf(2); rika = (await summons()).find(s => s.id === "rikaAssist") || null; }
  check("Rika assist spawns (persistent, lifetime > 200)", !!rika && rika.lifetime > 200, rika ? `lifetime=${rika.lifetime}` : "none");
  const ultH0 = (await p2()).health;
  for (let i = 0; i < 90; i++) await wf(2);
  const ultDealt = ultH0 - (await p2()).health;
  check("Rika deals persistent damage over her life (≥ 2 strikes worth)", ultDealt > 50, `dealt=${ultDealt.toFixed(0)}`);

  section("fallback-box sweep — every animationData action renders a real yuta_ sheet (no 128² box)");
  await grounded(); await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("yuta_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Yuta canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
