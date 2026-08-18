// harness/baki.test.mjs — CANONICAL full-kit test for Baki Hanma (Baki the Grappler).
// Covers: registration + real portrait; HP-only HUD (no resource meter, like Toji/Maki); grounded (NOT
// teleport-tier, spd 96 < 98); all 5 base normals; the Fwd+Heavy "Combination" 2-stage rekka; all 5
// specials (Mach-Punch Barrage multi-hit / Rushing Combination gap-closer / Rising Rush launcher / Impact
// Shockwave AOE / Defensive Read counter+riposte); the Demon Back ultimate (timed empowered form); balance sanity.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function bootTraining(gap = 84) {
  await page.goto(`${base}/index.html?harness=1&p1=baki&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(200);
  await page.evaluate(g => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); }, gap);
  await waitFrames(2);
}
const tap = async (k) => { await page.keyboard.down(k); await waitFrames(2); await page.keyboard.up(k); };
const specialDir = (dir = null) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const ult = (opts = {}) => page.evaluate(o => window.__harness.p1Ultimate(o), opts);
const p2Heavy = () => page.evaluate(() => window.__harness.p2Heavy());

// ════════ REGISTRATION + HUD + GROUNDED TIER ════════
section("registration · HP-only HUD · grounded (not teleport tier)");
await bootTraining();
{ const s = await p1();
  check("fighter is Baki", s.key === "baki");
  check("idle → own repacked sheet", has(s, "baki_idle_uniform"), s.spriteSheet);
  check("ZERO energy (HP-only, hideResourceMeter)", s.maxEnergy <= 1, `maxEnergy=${s.maxEnergy}`);
  check("speed 96 — UNDER the 98 teleport-blur gate (grounded)", s.baseSpeed === 96 && s.baseSpeed < 98, `baseSpeed=${s.baseSpeed}`);
  const portraitOK = await page.evaluate(async () => { try { const r = await fetch("./baki_portrait.png"); return r.ok; } catch { return false; } });
  check("real portrait file present", portraitOK); }

// ════════ BASE NORMALS ════════
section("base normals (light / heavy / up-launcher / air / down_air)");
await bootTraining(78); { const h = (await p2()).health; await tap("j"); await waitFrames(10); check("light connects", (await p2()).health < h); }
await bootTraining(78); { const h = (await p2()).health; await tap("k"); await waitFrames(14); check("heavy connects", (await p2()).health < h); }
await bootTraining(68); { await tap("i"); await waitFrames(6); const d = await p2(); check("up-attack LAUNCHES", d.isLaunched || d.vy < -1 || !d.grounded, `vy=${d.vy?.toFixed?.(1)}`); }
await bootTraining(78); { await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w"); await waitFrames(2); await tap("j"); check("aerial light → air pose", (await p1()).action === "air" || has(await p1(), "baki_air")); }
await bootTraining(78); { await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w"); await waitFrames(2); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); const s = await p1(); await page.keyboard.up("j"); await page.keyboard.up("s"); check("down-air → down_air sheet/pose", has(s, "baki_downair") || s.action === "down_air", s.spriteSheet); }

// ════════ Fwd+Heavy "COMBINATION" REKKA ════════
section("Fwd+Heavy Combination rekka (bakiG1 → bakiG2) + whiff interrupt");
await bootTraining(78);
{ const h = (await p2()).health; const chain = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 60; i++) { const c = await p1(); const mv = c.currentMove; if (mv && (!chain.length || chain[chain.length-1] !== mv)) chain.push(mv); if (chain.includes("bakiG2")) break; if (c.rekkaNext && c.cmdHitLanded && c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(12);
  check("chain opens bakiG1 → continues to bakiG2", chain[0] === "bakiG1" && chain.includes("bakiG2"), chain.join(" → "));
  check("full Combination deals real damage", (await p2()).health < h - 20, `Δ=${h-(await p2()).health}`); }
await bootTraining(52);
{ await page.evaluate(() => window.__harness.setP2X(99999)); const w = [];
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 18; i++) { const m = (await p1()).currentMove; if (m && !w.includes(m)) w.push(m); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); }
  await page.keyboard.up("d");
  check("whiffed opener does NOT chain (cancel-on-hit gate)", w.includes("bakiG1") && !w.includes("bakiG2"), w.join(",")); }

// ════════ SPECIALS (deterministic p1SpecialDir) ════════
section("specials — Barrage / Rush / Rising / Shockwave / Defensive Read");
// Neutral — Mach-Punch Barrage (multi-hit)
await bootTraining(74);
{ const r = await specialDir(null); check("neutral Special = Mach-Punch Barrage", r.move === "bakiBarrage", r.move);
  let last = (await p2()).health, ticks = 0;
  for (let i = 0; i < 44; i++) { const hp = (await p2()).health; if (hp < last - 1) { ticks++; last = hp; } await waitFrames(1); }
  check("Barrage MULTI-hits (≥3 ticks)", ticks >= 3, `${ticks} ticks`); }
// Forward — Rushing Combination (gap-closer)
await bootTraining(150);
{ const x0 = (await p1()).x; const h = (await p2()).health;
  const r = await specialDir("F"); check("Fwd Special = Rushing Combination", r.move === "bakiRush", r.move);
  let lunged = false, hit = false;
  for (let i = 0; i < 26; i++) { if ((await p1()).x - x0 > 10) lunged = true; if ((await p2()).health < h) hit = true; await waitFrames(1); }
  check("Rushing Combination lunges forward (gap-closer)", lunged, `Δx=${((await p1()).x - x0).toFixed(0)}`);
  check("Rushing Combination connects", hit); }
// Up — Rising Rush (launcher)
await bootTraining(66);
{ const r = await specialDir("U"); check("Up Special = Rising Rush", r.move === "bakiRising", r.move);
  await waitFrames(6); const d = await p2();
  check("Rising Rush LAUNCHES", d.isLaunched || d.vy < -1 || !d.grounded, `vy=${d.vy?.toFixed?.(1)}`); }
// Down — Impact Shockwave (wide AOE)
await bootTraining(120);
{ const h = (await p2()).health; const r = await specialDir("D"); check("Down Special = Impact Shockwave", r.move === "bakiShockwave", r.move);
  let hit = false; for (let i = 0; i < 20; i++) { if ((await p2()).health < h) hit = true; await waitFrames(1); }
  check("Impact Shockwave connects at wide range", hit); }
// Back — Defensive Read (counter + riposte)
await bootTraining(58);
{ const r = await specialDir("B"); check("Back Special = Defensive Read (brace pose)", r.cast === "guard", `cast=${r.cast}`);
  const p1h0 = (await p1()).health, p2h0 = (await p2()).health;
  await p2Heavy();                       // opponent swings INTO the counter window
  await waitFrames(14);
  const p1h1 = (await p1()).health, p2h1 = (await p2()).health;
  check("Defensive Read NEGATES the incoming hit (Baki unharmed)", p1h1 === p1h0, `${p1h0}→${p1h1}`);
  check("Defensive Read RIPOSTES (attacker takes damage)", p2h1 < p2h0, `${p2h0}→${p2h1}`); }

// ════════ ULTIMATE — DEMON BACK (timed empowered form) ════════
section("ultimate — Demon Back (Oni no Se) empowered form");
await bootTraining(84);
{ const d0 = (await p1()).damageMult;
  const r = await ult();
  check("Demon Back casts", r.cast === true);
  check("holds the flex pose on activation", r.castMove === "bakiDemonBack", `castMove=${r.castMove}`);
  await waitFrames(2); const s = await p1();
  check("empowered: damage ×1.30", Math.abs(s.damageMult - 1.30 * (d0 || 1)) < 0.02, `damageMult=${s.damageMult}`);
  const r2 = await ult();
  check("re-cast is a no-op while the form is active", r2.cast === false); }

// ════════ BALANCE SANITY ════════
section("stat / balance sanity");
{ const s = await p1();
  check("HP in-band (1160, no record)", s.maxHealth === 1160, `HP=${s.maxHealth}`);
  check("speed 96 (grounded, under the 98 teleport gate)", s.baseSpeed === 96);
  check("no energy meter (meterless, cooldown-gated)", s.maxEnergy <= 1); }

console.log(`\n${PASS} passed, ${FAIL} failed` + (jsErrors.length ? `\nJS ERRORS:\n${jsErrors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
