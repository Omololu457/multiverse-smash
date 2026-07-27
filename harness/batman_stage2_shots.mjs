// harness/batman_stage2_shots.mjs — STAGE 2: 5 normals + "Combo" command chain (Down+Heavy 3-hit
// rekka batCombo1→batCombo2→batCombo3) with a mid-chain interrupt test. Captures each connect.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { return await p1(); }
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function dmgFrom(pressFn) { const hp0 = (await p2()).health; await pressFn(); await waitFrames(22); return hp0 - (await p2()).health; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `batman_s2_${name}.png`) }); }
const seen = new Set();

await page.goto(`${base}/index.html?harness=1&p1=batman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

console.log("\n── 5 normals ──");
for (const [name, key, gap, sheet] of [["light", "j", 60, "batman_light_uniform"], ["heavy", "k", 70, "batman_heavy_uniform"], ["up", "i", 60, "batman_up_uniform"]]) {
  await prep(gap);
  const d = await dmgFrom(async () => { await page.keyboard.down(key); await waitFrames(3); const a = await record(); if (a.spriteSheet) seen.add(a.spriteSheet); await shot(name); await page.keyboard.up(key); });
  const a = await record();
  check(`${name} connects & sheet → ${sheet}`, d > 0 && (a.spriteSheet?.includes(sheet) || seen.has(`./${sheet}.png`)), `−${d.toFixed(0)} sheet=${a.spriteSheet}`);
}
// air
await waitGrounded(); await prep(56);
{ const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(44)); await page.keyboard.down("j"); await waitFrames(3); const a = await record(); if (a.spriteSheet) seen.add(a.spriteSheet); await shot("air"); await page.keyboard.up("j"); }); check("air connects", d > 0, `−${d.toFixed(0)}`); check("air → batman_air_uniform", seen.has("./batman_air_uniform.png"), ""); }
// down_air
await waitGrounded(); await prep(34);
{ const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(50)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); const a = await record(); if (a.spriteSheet) seen.add(a.spriteSheet); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); }); check("down_air connects", d > 0, `−${d.toFixed(0)}`); check("down_air → batman_downair_uniform", seen.has("./batman_downair_uniform.png"), ""); }

console.log("\n── Combo command chain (Down+Heavy 3-hit rekka) ──");
await waitGrounded(); await prep(46);
const hp0 = (await p2()).health;
await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
const seq = []; { const m = (await p1()).currentMove; if (m) seq.push(m); }
await shot("combo1");
for (const want of ["batCombo2", "batCombo3"]) {
  let rec = false; for (let i = 0; i < 40; i++) { const p = await record(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec = true; break; } await waitFrames(1); }
  if (!rec) break; await tapKey("k"); const m = (await p1()).currentMove; if (m && seq[seq.length - 1] !== m) seq.push(m);
  await shot(want === "batCombo2" ? "combo2" : "combo3");
}
await waitFrames(22);
const chainDmg = hp0 - (await p2()).health;
check("chain sequences batCombo1→2→3", seq.join("→") === "batCombo1→batCombo2→batCombo3", `seq=${seq.join("→")}`);
check("chain deals combo damage", chainDmg > 0, `−${chainDmg.toFixed(0)}`);

console.log("\n── mid-chain interrupt (whiff → chain stops) ──");
await waitGrounded(); await prep(46);
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 600); });   // shove P2 far → opener WHIFFS
await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
const openMove = (await p1()).currentMove;
let rec = false; for (let i = 0; i < 40; i++) { const p = await record(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec = true; break; } await waitFrames(1); }
if (rec) await tapKey("k");
const afterMove = (await p1()).currentMove;
check("interrupt: opener fired (batCombo1)", openMove === "batCombo1", `open=${openMove}`);
check("interrupt: whiff does NOT advance to batCombo2", afterMove !== "batCombo2" && afterMove !== "batCombo3", `after=${afterMove || "(ended)"}`);

console.log("\n── no-projectile sweep (normals are pure melee) ──");
await waitGrounded(); await prep(60);
await page.evaluate(() => window.__harness.clearProjectiles?.());
for (const key of ["j", "k", "i"]) { await tapKey(key); await waitFrames(6); }
const pj = await projs();
check("no projectiles spawned by any normal (pure melee)", pj.length === 0, `count=${pj.length}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/batman_s2_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
