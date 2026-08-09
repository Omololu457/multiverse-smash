// harness/miwa.test.mjs — CANONICAL Kasumi Miwa suite. Covers: registration + real portrait; balance (no
// stat outliers); all 5 base normals; the "Battojutsu Rush" chain + mid-chain interrupt; the 3 specials
// (Iai Dash / Rapid Slash Vortex + separate FX overlay / cursed-energy charge); the "Blade of the Neophyte"
// Ultimate (freeze-cinematic, guaranteed range-independent slash); and a FALLBACK-BOX SWEEP (every wired
// animation sheet exists + decodes → no character renders as an unsliced box).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.miwaCmd());
const fx = () => page.evaluate(() => window.__harness.miwaFx());
const cine = () => page.evaluate(() => window.__harness.miwaUltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitSheet(needle, maxF = 26) { for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; await waitFrames(1); } return await p1(); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function reset(gap = 48) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── REGISTRATION + PORTRAIT ──
section("registration · real portrait");
let a = await p1();
check("Miwa loads in the roster", a && a.key === "miwa", `key=${a?.key}`);
const st = await page.evaluate(async () => (await import("./characters.js")).characters.miwa.stats);
const portrait = await page.evaluate(() => window.__harness.charPortrait?.("miwa"));
check("portrait wired → ./kasumi_portrait.png", portrait === "./kasumi_portrait.png", `portrait=${portrait}`);
const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./kasumi_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
check("portrait art decodes (master-extracted bust)", imgOk.ok, `${imgOk.w}×${imgOk.h}`);

// ── BALANCE: no stat outliers (JJK cursed-energy sword user, mid-tier) ──
section("balance — stats sit inside roster bands");
check("HP 1150 (Megumi 1120 < 1150 < Gojo 1160)", st.maxHealth === 1150, `hp=${st.maxHealth}`);
check("Energy 160 cursed (below big-3 ~210; ≥ Netero/Hisoka nen 150/170 band)", st.maxEnergy === 160, `en=${st.maxEnergy}`);
check("ATK 86 · DEF 84 · SPD 93 all mid-band (no ceiling/floor)", st.attack === 86 && st.defense === 84 && st.speed === 93, `atk=${st.attack} def=${st.defense} spd=${st.speed}`);

// ── FALLBACK-BOX SWEEP: every wired animation sheet exists + decodes ──
section("fallback-box sweep — every animationData sheet exists + decodes");
const sheets = await page.evaluate(async () => {
  const ad = (await import("./characters.js")).characters.miwa.animationData;
  return [...new Set(Object.values(ad).map(x => x.sheet).filter(Boolean))];
});
let sweepBad = [];
for (const sh of sheets) {
  const ok = await page.evaluate(async (s) => { const i = new Image(); i.src = s; try { await i.decode(); return i.naturalWidth > 0; } catch { return false; } }, sh);
  if (!ok) sweepBad.push(sh);
}
check(`all ${sheets.length} wired sheets decode (no fallback box)`, sweepBad.length === 0, sweepBad.length ? `MISSING: ${sweepBad.join(", ")}` : `${sheets.length} sheets OK`);
check("idle renders a real sheet at rest", has(await p1(), "kasumi_idle_uniform"), `sheet=${(await p1()).spriteSheet}`);

// ── BASE NORMALS ──
section("base normals — light / heavy / up / air / down_air");
for (const [nm, key, sheet] of [["light", "j", "kasumi_attack_2_uniform"], ["heavy", "k", "kasumi_attack_1_uniform"], ["up", "i", "kasumi_up_attack_uniform"]]) {
  await reset(nm === "heavy" ? 54 : 44);
  const hp0 = (await p2()).health; await page.keyboard.down(key);
  const mv = await waitSheet(sheet); await page.keyboard.up(key); await waitFrames(14);
  check(`${nm} → ${sheet} + connects`, has(mv, sheet) && hp0 - (await p2()).health > 0, `sheet=${mv.spriteSheet}`);
}
await reset(40);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("j");
  const mv = await waitSheet("kasumi_air_attack_1_uniform"); await page.keyboard.up("j"); await waitFrames(14);
  check("air → kasumi_air_attack_1_uniform + connects", has(mv, "kasumi_air_attack_1_uniform") && hp0 - (await p2()).health > 0); }
await reset(30);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j");
  const mv = await waitSheet("kasumi_down_air_attack_uniform", 14); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
  check("down_air → kasumi_down_air_attack_uniform + connects", has(mv, "kasumi_down_air_attack_uniform") && hp0 - (await p2()).health > 0); }

// ── COMMAND CHAIN + INTERRUPT ──
section("Battojutsu Rush chain (miwaG1→G2→G3) + mid-chain interrupt");
await reset(52);
{ const chain = []; await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 60; i++) { const c = await cmd(); if (c?.move && !chain.includes(c.move)) chain.push(c.move); if (chain.includes("miwaG3")) break;
    if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(16);
  check("chain advances miwaG1 → miwaG2 → miwaG3", chain[0] === "miwaG1" && chain.includes("miwaG2") && chain.includes("miwaG3"), `chain=[${chain.join(" → ")}]`); }
await reset(52);
{ await page.evaluate(() => window.__harness.setP2X(99999)); const w = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 20; i++) { const m = (await p1()).currentMove; if (m && !w.includes(m)) w.push(m); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); }
  await page.keyboard.up("d");
  check("interrupt: whiffed miwaG1 does NOT chain to miwaG2", w.includes("miwaG1") && !w.includes("miwaG2"), `chain=[${w.join(" → ")}]`); }

// ── SPECIALS ──
section("specials — Iai Dash / Rapid Slash Vortex (+FX overlay) / charge stance");
await reset(90);
{ const e0 = (await fx()).energy, hp0 = (await p2()).health;
  await page.keyboard.down("l"); const mv = await waitSheet("kasumi_ultimate_dash_attack_uniform"); await page.keyboard.up("l"); await waitFrames(14);
  check("Iai Dash: dash sheet + spends energy + connects", has(mv, "kasumi_ultimate_dash_attack_uniform") && (await fx()).energy < e0 && hp0 - (await p2()).health > 0, `sheet=${mv.spriteSheet}`); }
await reset(60);
{ const e0 = (await fx()).energy; await page.evaluate(() => window.__harness.liftP1(56));
  await page.keyboard.down("l"); const mv = await waitSheet("kasumi_super_rapid_air_attack_uniform", 14); await page.keyboard.up("l");
  const armed = await fx();
  check("Rapid Slash Vortex: char sub-clip + vortex FX overlay armed (separate layer)", has(mv, "kasumi_super_rapid_air_attack_uniform") && armed.vortex === true && armed.energy < e0, `sheet=${mv.spriteSheet} vortex=${armed.vortex}`);
  await waitFrames(30);
  check("vortex FX auto-expires (finite overlay)", (await fx()).vortex === false); }
await reset(120);
{ await page.evaluate(() => window.__harness.setEnergy?.(40)); const e0 = (await fx()).energy;
  await page.keyboard.down("p"); const mv = await waitSheet("kasumi_charg_uniform", 12); await waitFrames(18); const during = await fx(); await page.keyboard.up("p");
  check("charge stance renders kasumi_charg + builds cursed energy", has(mv, "kasumi_charg_uniform") && during.charging === true && during.energy > e0, `sheet=${mv.spriteSheet} energy ${e0}→${during.energy}`); }

// ── ULTIMATE ──
section("Ultimate — Blade of the Neophyte (freeze-cinematic, guaranteed slash)");
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(4);
{ const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 520); await waitFrames(2);   // FAR → prove guaranteed
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.miwaUltCine()?.active, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const on = await cine();
  check("ultimate activates the freeze-cinematic on the REAL caster", on.active === true && on.casterKey === "miwa", `active=${on.active} caster=${on.casterKey}`);
  check("ultimate spends 100 cursed energy", Math.round(e0 - (await p1()).energy) === 100, `energy ${e0}→${(await p1()).energy}`);
  check("plays Miwa's own continuous ult sprite", /kasumi_super_ultimate_uniform/.test((await p1()).spriteSheet || ""), `sheet=${(await p1()).spriteSheet}`);
  await page.waitForFunction(() => window.__harness.miwaUltCine()?.active === false, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const dmg = hp0 - (await p2()).health;
  check("GUARANTEED range-independent slash (~280 at 520px)", dmg >= 200, `dmg=${dmg}`);
  check("cinematic ends → combat resumes (not stuck)", (await cine()).active === false); }

check("no JS page errors across the full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
