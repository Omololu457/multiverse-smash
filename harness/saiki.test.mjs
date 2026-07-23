// harness/saiki.test.mjs
// Full-kit live verification for Saiki Kusuo (rosterKey "saiki") — the projectile zoner.
// Covers: registration + movement + the teleport→intro dissolve sequence; all 5 normals with the
// heavy/down_air split proof; the 4-hit projectile rekka (Fwd+Heavy) incl. a mid-chain interrupt; the
// Basic Burst point-blank poke (Fwd+Light); the Lightning special's dual layered bolts; the Ultimate's
// delayed screen-filling explosion; the wired portrait; and a fallback sweep (blocking/knockdown resolve
// to real generic sprites, never the 128² box). Mirrors the netero/rick/beerus harness precedent.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const introState = () => page.evaluate(() => window.__harness.introState());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(OUT, name) }); }

// ───────────────────────────────────────────────────────────────────────────
// INTRO — observe the teleport→intro dissolve BEFORE skipping to battle.
// ───────────────────────────────────────────────────────────────────────────
await page.goto(`${base}/index.html?harness=1&p1=saiki&p2=saiki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.start());
await waitFrames(2);
section("INTRO (teleport dissolve → walk-in)");
let sawTele = false, sawIntro = false;
for (let i = 0; i < 260; i++) {
  const s = await introState();
  if (s.stage === "p1" && s.p1Variant === "teleport") sawTele = true;
  if (s.stage === "p1" && s.p1Variant === "intro") sawIntro = true;
  if (s.gameState === "battle" || s.stage === "done") break;
  await waitFrames(2);
}
check("intro plays teleport dissolve variant", sawTele);
check("intro plays walk-in variant, after teleport", sawIntro);

// ───────────────────────────────────────────────────────────────────────────
// Boot to battle for the rest.
// ───────────────────────────────────────────────────────────────────────────
await page.goto(`${base}/index.html?harness=1&p1=saiki&p2=gojo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(8);

async function reset(gap) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

// ── REGISTRATION + MOVEMENT ────────────────────────────────────────────────
section("REGISTRATION + MOVEMENT");
let a = await p1();
check("boots as saiki, sprite renderer active (not box)", a.key === "saiki" && a.hasSpriteHandler && a.spriteReady, `key=${a.key} handler=${a.hasSpriteHandler}`);
check("spriteScale 2.2", a.spriteScale === 2.2, String(a.spriteScale));
check("idle → saiki_idle_u", a.action === "idle" && /saiki_idle_u/.test(a.spriteSheet || ""), `${a.action} ${a.spriteSheet}`);
await page.keyboard.down("d"); await waitFrames(16); a = await p1(); await page.keyboard.up("d");
check("run → saiki_run_u", /run|walk|dash/.test(a.action || "") && /saiki_run_u/.test(a.spriteSheet || ""), `${a.action} ${a.spriteSheet}`);
await waitFrames(4);
await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); a = await p1();
check("jump → saiki_jump_u (airborne)", /jump|fall/.test(a.action || "") && /saiki_jump_u/.test(a.spriteSheet || ""), `${a.action}`);
await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 6000, polling: 16 }).catch(() => {});
await page.evaluate(() => window.__harness.hurtP1(30)); await waitFrames(3); a = await p1();
check("hit → hurt on saiki_hit_u", /hurt|hit/.test(a.action || "") && /saiki_hit_u/.test(a.spriteSheet || ""), `${a.action}`);

// ── 5 NORMALS + SPLIT PROOF ─────────────────────────────────────────────────
section("NORMALS (5 slots + heavy/down_air split)");
async function groundNormal(keys, gap, frames = 24) {
  await reset(gap);
  const before = (await p2()).health;
  for (const k of keys) await page.keyboard.down(k);
  let sheet = null, action = null;
  for (let i = 0; i < frames; i++) { const s = await p1(); if (s.attacking && s.action) { sheet = s.spriteSheet; action = s.action; } await waitFrames(1); }
  for (const k of keys) await page.keyboard.up(k);
  return { sheet, action, dmg: before - (await p2()).health };
}
let r = await groundNormal(["j"], 70);
check("light connects → saiki_light_u", r.dmg > 0 && /saiki_light_u/.test(r.sheet || ""), `dmg=${r.dmg} ${r.sheet}`);
r = await groundNormal(["k"], 76);
const heavySheet = r.sheet;
check("heavy connects → saiki_heavy_u (blade swipe)", r.dmg > 0 && /saiki_heavy_u/.test(r.sheet || ""), `dmg=${r.dmg} ${r.sheet}`);
// up (launcher): sheet on whiff, launch at close range
await reset(400); await page.evaluate(() => window.__harness.setP2Invuln?.(600));
await page.keyboard.down("i"); let upSheet = null;
for (let i = 0; i < 12; i++) { const s = await p1(); if (s.attacking && s.action === "up") upSheet = s.spriteSheet; await waitFrames(1); }
await page.keyboard.up("i");
check("up → saiki_up_u", /saiki_up_u/.test(upSheet || ""), upSheet);
await reset(60); await page.keyboard.down("i"); let launched = false;
for (let i = 0; i < 22; i++) { const t = await p2(); if (t.vy < -2 || !t.grounded) launched = true; await waitFrames(1); }
await page.keyboard.up("i");
check("up-attack LAUNCHES (juggle)", launched);
// air (reuses light sheet)
await reset(64); await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(4);
await page.keyboard.down("j"); let airSheet = null, airAction = null;
for (let i = 0; i < 12; i++) { const s = await p1(); if (s.attacking && s.action) { airSheet = s.spriteSheet; airAction = s.action; } await waitFrames(1); }
await page.keyboard.up("j");
check("air = action 'air', reuses saiki_light_u", airAction === "air" && /saiki_light_u/.test(airSheet || ""), `${airAction} ${airSheet}`);
await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 5000, polling: 16 }).catch(() => {});
// down_air (spin kick, split half)
await reset(30); await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w"); await waitFrames(3);
await page.keyboard.down("s"); await page.keyboard.down("j"); let daSheet = null, daAction = null;
for (let i = 0; i < 14; i++) { const s = await p1(); if (s.attacking && s.action) { daSheet = s.spriteSheet; daAction = s.action; } await waitFrames(1); }
await page.keyboard.up("s"); await page.keyboard.up("j");
check("down_air = action 'down_air' → saiki_downair_u (spin kick)", daAction === "down_air" && /saiki_downair_u/.test(daSheet || ""), `${daAction} ${daSheet}`);
check("SPLIT PROOF — heavy & down_air are DIFFERENT sheets", heavySheet && daSheet && heavySheet !== daSheet, `heavy=${heavySheet} downair=${daSheet}`);

// ── 4-HIT PROJECTILE REKKA (Fwd+Heavy) ──────────────────────────────────────
section("4-HIT PROJECTILE REKKA (Fwd+Heavy)");
const seenBolts = new Set(); let lastBoltVx = 0;
async function snapBolt() { const b = (await projs()).find(p => /bolt/i.test(p.name)); if (b) { seenBolts.add(b.sheet); lastBoltVx = b.vx; } }
async function pinP2() { const aa = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.setP2Invuln?.(0); }, aa.x + 150); }
async function waitContinueReady() { await page.waitForFunction(() => { const c = window.__harness.orCmd(); return c && c.attacking && c.phase === "recovery" && c.connected; }, null, { timeout: 3000, polling: 16 }).catch(() => {}); }
await reset(150);
const seenMoves = [];
await page.keyboard.down("d"); await waitFrames(1);
await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
await page.keyboard.up("d");
await snapBolt();
let stp = await page.evaluate(() => window.__harness.p1().currentMove); seenMoves.push(stp);
check("step1 spawns a TRAVELING bolt (vx≠0)", seenBolts.size >= 1 && Math.abs(lastBoltVx) > 1, `vx=${lastBoltVx}`);
for (const expect of ["saikiChain2", "saikiChain3", "saikiChainFin"]) {
  await waitContinueReady();
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  await snapBolt();
  stp = await page.evaluate(() => window.__harness.p1().currentMove); seenMoves.push(stp);
  await pinP2();
}
check("4 steps fire distinct poses in order", JSON.stringify(seenMoves) === JSON.stringify(["saikiChain1", "saikiChain2", "saikiChain3", "saikiChainFin"]), seenMoves.join("→"));
check("each step uses its own bolt FX (≥3 distinct sheets)", seenBolts.size >= 3, `${seenBolts.size} sheets`);
// cumulative damage
await reset(120);
let hp = (await p2()).health;
await page.keyboard.down("d"); await waitFrames(1);
for (let i = 0; i < 4; i++) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(10); }
await page.keyboard.up("d"); await waitFrames(16);
check("full chain deals cumulative damage", hp - (await p2()).health > 60, `dmg=${hp - (await p2()).health}`);
// interrupt: whiff → no continue
await reset(120);
await page.keyboard.down("d"); await waitFrames(1);
await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1);
await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.setP2Invuln?.(600); });
await page.evaluate(x => window.__harness.setP2X(x), (await p1()).x + 900);
await waitFrames(4);
await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(2);
const afterInterrupt = await page.evaluate(() => window.__harness.p1().currentMove);
await page.keyboard.up("d");
check("mid-chain interrupt — whiffed step does NOT continue", afterInterrupt !== "saikiChain2", `move=${afterInterrupt}`);

// ── BASIC BURST (Fwd+Light) ─────────────────────────────────────────────────
section("BASIC BURST (Fwd+Light, stationary point-blank)");
await reset(400); await page.evaluate(() => window.__harness.setP2Invuln?.(600));
await page.keyboard.down("d"); await waitFrames(1);
await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");
let burst = null, castOk = false;
for (let i = 0; i < 8; i++) { const b = (await projs()).find(p => /burst/i.test(p.name)); if (b) burst = b; if ((await p1()).action === "saikiBurst") castOk = true; await waitFrames(1); }
await page.keyboard.up("d");
check("Basic Burst = saikiBurst pose + burst_fx sheet", castOk && /saiki_burst_fx_u/.test(burst?.sheet || ""), `${castOk} ${burst?.sheet}`);
check("Basic Burst is NON-TRAVELING (vx≈0)", burst && Math.abs(burst.vx) < 0.5, `vx=${burst?.vx}`);
await reset(66);
hp = (await p2()).health;
await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await waitFrames(8); await page.keyboard.up("d");
check("Basic Burst connects point-blank", hp - (await p2()).health > 0, `dmg=${hp - (await p2()).health}`);

// ── LIGHTNING SPECIAL (dual layered bolts) ──────────────────────────────────
section("LIGHTNING SPECIAL (two simultaneous layered bolts)");
await reset(520); await page.evaluate(() => window.__harness.setP2Invuln?.(600));
const enBefore = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
const enAfter = (await p1()).energy;
let both = null, botP = null, topP = null, castSeen = false;
for (let i = 0; i < 20; i++) {
  if ((await p1()).action === "saikiLightning") castSeen = true;
  const pr = await projs();
  const bot = pr.find(p => p.name === "saikiLightning_bot"), top = pr.find(p => p.name === "saikiLightning_top");
  if (bot) botP = bot; if (top) topP = top;
  if (bot && top && !both) { both = { bot, top }; await shot("SAIKI_test_lightning.png"); }
  await waitFrames(1);
}
check("channeling cast pose = saikiLightning", castSeen);
check("energy cost 30", Math.abs((enBefore - enAfter) - 30) < 2, `Δ${(enBefore - enAfter).toFixed(1)}`);
check("BOTH layers exist simultaneously", !!both);
check("bottom = damaging, top = visualOnly overlay", botP && botP.visualOnly === false && topP && topP.visualOnly === true, `bot=${botP?.visualOnly} top=${topP?.visualOnly}`);
if (both) {
  check("layers share velocity + are Y-offset (thicker combined bolt)", Math.abs(both.bot.vx - both.top.vx) < 0.01 && both.top.y < both.bot.y, `Δvx=${(both.bot.vx - both.top.vx).toFixed(2)} ΔY=${(both.bot.y - both.top.y).toFixed(1)}`);
  check("correct sheets (bolt_bot / bolt_top)", /saiki_bolt_bot_u/.test(both.bot.sheet || "") && /saiki_bolt_top_u/.test(both.top.sheet || ""));
}
await reset(220);
hp = (await p2()).health;
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(26);
const lightDmg = hp - (await p2()).health;
check("lightning deals special-tier damage (single hit)", lightDmg > 50 && lightDmg < 140, `dmg=${lightDmg}`);

// ── ULTIMATE (Giant Bomb Throw) ─────────────────────────────────────────────
section("ULTIMATE — Giant Bomb Throw (delayed screen-filling explosion)");
await reset(200);
const enUB = (await p1()).energy;
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
const enUA = (await p1()).energy;
let throwSeen = false, blastFrame = -1;
const start = (await stateF()).frame;
for (let i = 0; i < 60; i++) {
  const s = await p1();
  if (s.action === "saikiBomb") throwSeen = true;
  const blast = (await projs()).find(p => /saikiBombBlast/i.test(p.name));
  if (blast && blastFrame < 0) { blastFrame = (await stateF()).frame - start; await shot("SAIKI_test_ultimate.png"); }
  await waitFrames(1);
}
check("throw pose = saikiBomb", throwSeen);
check("energy cost 150 (near-max)", Math.abs((enUB - enUA) - 150) < 4, `Δ${(enUB - enUA).toFixed(0)}`);
check("explosion is DELAYED until throw completes (~frame ≥22)", blastFrame >= 22, `blast@${blastFrame}`);
// damage + screen-filling visualOnly blast
await reset(200);
hp = (await p2()).health;
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
let blastProj = null;
for (let i = 0; i < 60; i++) { const b = (await projs()).find(p => /saikiBombBlast/i.test(p.name)); if (b) { blastProj = b; break; } await waitFrames(1); }
await waitFrames(6);
const ultDmg = hp - (await p2()).health;
check("explosion FX = bomb_fx sheet, pure-visual (visualOnly)", /saiki_bomb_fx_u/.test(blastProj?.sheet || "") && blastProj?.visualOnly === true, `${blastProj?.sheet} vo=${blastProj?.visualOnly}`);
check("ultimate is the biggest hit in the kit", ultDmg > 200 && ultDmg > lightDmg, `dmg=${ultDmg}`);
check("ultimate cooldown armed", (await p1()).ultCooldown > 0, `cd=${(await p1()).ultCooldown}`);

// ── PORTRAIT ────────────────────────────────────────────────────────────────
section("PORTRAIT");
const portraitField = await page.evaluate(() => window.__harness.charPortrait("saiki")).catch(() => null);
check("portrait field wired", /saiki_k_mug_shot/.test(portraitField || ""), portraitField || "none");
const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./saiki_k_mug_shot.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);

// ── FALLBACK SWEEP (missing states resolve to real generic sprites, not the box) ──
section("FALLBACK SWEEP (guard / knockdown → generic sprite, no 128² box)");
await reset(70);
// blocking with no guard art → engine falls back to idle sheet (never the box)
await page.evaluate(() => { const f = window.__harness; }); // noop anchor
await page.keyboard.down("s");   // crouch/block hold (down)
await page.evaluate(() => { window.__harness.p2Attack?.(); });   // give it a reason to be blocking-ish
await waitFrames(2);
let blk = await p1();
await page.keyboard.up("s");
check("blocking/guard state renders a real sheet (not procedural box)", !!blk.spriteSheet && blk.hasSpriteHandler, `sheet=${blk.spriteSheet}`);
// knockdown with no knockdown/getup art → hurt then idle (real sheets)
await reset(70);
await page.evaluate(() => window.__harness.knockdownP1?.(50));
await waitFrames(3);
let kd = await p1();
check("knockdown state renders a real sheet (hurt/idle fallback, not box)", !!kd.spriteSheet && /saiki_/.test(kd.spriteSheet || ""), `action=${kd.action} sheet=${kd.spriteSheet}`);
await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});

// ── ERRORS ──────────────────────────────────────────────────────────────────
section("ERRORS");
check("no JS page errors during the whole suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close();
process.exit(FAIL === 0 ? 0 : 1);
