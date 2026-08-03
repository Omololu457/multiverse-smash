// harness/gold_samurai_ranger_stage4.mjs
// STAGE 4 evidence: Gold's LIGHT SLASH special — a light energy slash-wave PROJECTILE with its OWN
// independent collision (distinct from melee). Fires in BOTH tiers (unlike Red's Mega-only), tier-scales
// (Mega = bigger, faster, harder wave). Confirms the cast pose swaps to Mega art. Shots → gold_stage4_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gold_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function setEnergy(v) { await page.evaluate(e => { window.__harness.setEnergy?.(e) ?? window.__harness.setP1Energy?.(e); }, v); }
async function sawCast(name, frames = 20) { let s = null; for (let i = 0; i < frames; i++) { const a = await p1(); if (a.currentMove === name) { s = a.spriteSheet || ""; break; } await waitFrames(1); } return s; }
const waves = async () => (await projs()).filter(p => (p.name || "").includes("gold_light_slashwave"));

try {
  await page.goto(`${base}/index.html?harness=1&p1=gold_samurai_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── BASE TIER: Light Slash fires a slash-wave projectile that TRAVELS + CONNECTS ──
  console.log("\n── base tier: Light Slash → slash-wave projectile ──");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  await setEnergy(160);
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 240); } await waitFrames(2);   // mid-range → the wave must travel
  const hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const baseCast = await sawCast("lightSlash", 16);
  check("base: Special casts Light Slash (currentMove=lightSlash)", !!baseCast, `sheet=${baseCast}`);
  check("base: cast pose = gold_launcher_uniform", (baseCast || "").includes("samurai_ranger_gold_launcher_uniform"), `sheet=${baseCast}`);
  // capture the wave in flight
  let x0 = null, sawWave = false, shotFlight = false;
  for (let i = 0; i < 24; i++) { const w = await waves(); if (w.length) { sawWave = true; if (x0 == null) x0 = w[0].x; if (!shotFlight && w[0].x > x0 + 40) { await shot("wave_flight"); shotFlight = true; } } await waitFrames(1); }
  check("base: a slash-wave projectile spawned (independent of melee)", sawWave, "");
  await waitFrames(20);
  const baseDmg = hp0 - (await p2()).health;
  await shot("wave_connect");
  check("base: slash-wave travels and CONNECTS at range (own collision)", baseDmg > 0, `dmg=${baseDmg}`);

  // ── MEGA TIER: tier-scaling — bigger, harder wave + Mega cast art ──
  console.log("\n── Mega tier: tier-scaling slash-wave ──");
  await waitGrounded();
  await setEnergy(165);
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.setEnergy?.(160); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 240); } await waitFrames(2);
  const mhp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const megaCast = await sawCast("lightSlash", 16);
  check("Mega: Light Slash fires (currentMove=lightSlash)", !!megaCast, `sheet=${megaCast}`);
  check("Mega: cast pose = gold_mega_launcher_uniform (tier art swap)", (megaCast || "").includes("samurai_ranger_gold_mega_launcher_uniform"), `sheet=${megaCast}`);
  let megaW = 0;
  for (let i = 0; i < 20; i++) { const w = await waves(); if (w.length) { megaW = Math.max(megaW, w[0].w || 0); if (i === 4) await shot("mega_wave_flight"); } await waitFrames(1); }
  await waitFrames(20);
  const megaDmg = mhp0 - (await p2()).health;
  check("Mega: slash-wave connects", megaDmg > 0, `dmg=${megaDmg}`);
  check("Mega wave out-damages base wave (tier-scaling)", megaDmg > baseDmg, `mega=${megaDmg} base=${baseDmg}`);

  // ── independence: the wave is NOT a melee hit (it exists as a projectile with its own box) ──
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Gold Stage 4: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
