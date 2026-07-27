// harness/flash_stage3_shots.mjs — STAGE 3: melee multi-hit specials.
//   neutral Special = Spin Attack (3-hit pin whirl)   ·   forward Special = Tornado (4-hit, launches)
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `flash_s3_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=flash`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

// count discrete health-drop events over the next ~`frames` frames (robust multi-hit proof vs combo-scaling)
async function countHits(frames, shotName) {
  let prev = (await p2()).health, hits = 0, shotDone = false;
  for (let i = 0; i < frames; i++) { const h = (await p2()).health; if (h < prev - 0.01) hits++; prev = h; if (!shotDone && (await p1()).attacking) { await shot(shotName); shotDone = true; } await waitFrames(1); }
  return hits;
}

console.log("\n── Spin Attack (neutral Special) — 3-hit pin whirl ──");
await prep(52);
const en0 = (await p1()).energy, sh0 = (await p2()).health;
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
let mv = null, sheet = null; for (let i = 0; i < 8; i++) { const a = await p1(); if (a.currentMove === "spinAttack") { mv = a.currentMove; sheet = a.spriteSheet; break; } await waitFrames(1); }
const spinHits = await countHits(34, "spin");
const spinDmg = sh0 - (await p2()).health, enSpin = en0 - (await p1()).energy;
check("Spin: sprite = flash_spin_uniform", mv === "spinAttack" && (sheet || "").includes("flash_spin_uniform"), `move=${mv} sheet=${sheet}`);
check("Spin: MULTI-hit (≥2 discrete hits)", spinHits >= 2, `${spinHits} hits, −${spinDmg.toFixed(0)} total`);
check("Spin: spends Speed Force", enSpin >= 14, `−${enSpin.toFixed(0)}`);

console.log("\n── Tornado (forward Special) — 4-hit advancing vortex, launches ──");
await waitGrounded(); await prep(58);
const th0 = (await p2()).health;
await page.keyboard.down("d"); await waitFrames(2);           // hold forward → _specialHeldDir "F"
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
let tmv = null, tsheet = null; for (let i = 0; i < 8; i++) { const a = await p1(); if (a.currentMove === "tornado") { tmv = a.currentMove; tsheet = a.spriteSheet; break; } await waitFrames(1); }
let prev = (await p2()).health, tornHits = 0, launched = false, tshot = false;
for (let i = 0; i < 40; i++) { const q = await p2(); if (q.health < prev - 0.01) tornHits++; prev = q.health; if (q.vy < -3 || q.knockdownState) launched = true; if (!tshot && (await p1()).attacking) { await shot("tornado"); tshot = true; } await waitFrames(1); }
await page.keyboard.up("d");
const tornDmg = th0 - (await p2()).health;
check("Tornado: sprite = flash_tornado_uniform", tmv === "tornado" && (tsheet || "").includes("flash_tornado_uniform"), `move=${tmv} sheet=${tsheet}`);
check("Tornado: MULTI-hit (≥3 discrete hits)", tornHits >= 3, `${tornHits} hits, −${tornDmg.toFixed(0)} total`);
check("Tornado: final hit LAUNCHES opponent", launched, "");

console.log("\n── no projectiles from either special (pure melee) ──");
const pj = await page.evaluate(() => window.__harness.projectiles?.() || []);
check("no projectiles spawned", pj.length === 0, `count=${pj.length}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/flash_s3_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
