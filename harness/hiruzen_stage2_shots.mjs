// harness/hiruzen_stage2_shots.mjs — Stage 2: punch COMBO string (light/heavy) connecting, the up/air/
// down_air fallback normals connecting, and the SPIN evasive dodge (i-frames + no damage taken). PNGs → /tmp/hiruzen_s2/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/hiruzen_s2"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1"));
  const cb = await page.locator("#gameCanvas").boundingBox();
  if (r && cb) { const pad = 70; const x = Math.max(0, cb.x + r.x - pad), y = Math.max(0, cb.y + r.y - pad * 1.6); try { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x, y, width: Math.max(90, Math.min(cb.width - x, r.w + pad * 2)), height: Math.max(90, Math.min(cb.height - y, r.h + pad * 2.6)) } }); return; } catch (_) {} }
  await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") });
}
// fire a normal, capture peak-attack sheet + damage
async function normal(key, gap, { lift = 0, down = false } = {}) {
  await prep(gap);
  if (lift) await page.evaluate(dy => window.__harness.liftP1(dy), lift);
  if (down) { await page.keyboard.down("s"); await wf(1); }
  const hp0 = (await p2()).health;
  let sheet = null, sx = null, act = null;
  await page.keyboard.down(key);
  for (let i = 0; i < 8; i++) { const a = await p1(); if (a.attacking && a.spriteSheet) { sheet = a.spriteSheet; sx = a.spriteSourceX; act = a.spriteAction; } await wf(1); }
  await page.keyboard.up(key);
  if (down) await page.keyboard.up("s");
  return { dmg: hp0 - (await p2()).health, sheet, sx, act };
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=hiruzen&p2=hiruzen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  console.log(`\n── punch COMBO string (light/heavy off one 7-frame sheet) ──`);
  const L = await normal("j", 64);
  await shot("light_combo");
  check("light connects (punch combo string)", L.dmg > 0 && (L.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${L.dmg.toFixed(0)} sheet=${(L.sheet||"").split("/").pop()} act=${L.act}`);
  const H = await normal("k", 64);
  await shot("heavy_finisher");
  check("heavy connects (wide finisher, sourceX 300)", H.dmg > 0 && (H.sheet || "").includes("hiruzen_punches_uniform") && H.sx === 300, `dmg=${H.dmg.toFixed(0)} sx=${H.sx}`);
  check("heavy hits harder than light", H.dmg > L.dmg, `L=${L.dmg.toFixed(0)} H=${H.dmg.toFixed(0)}`);

  console.log(`\n── up / air / down_air (ART GAPS → fallback punch poses; still connect) ──`);
  const U = await normal("i", 60);
  await shot("up_fallback");
  check("up connects (fallback pose)", U.dmg > 0 && (U.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${U.dmg.toFixed(0)} sx=${U.sx}`);
  const A = await normal("j", 70, { lift: 66 });
  await shot("air_fallback");
  check("air connects (fallback pose)", A.dmg > 0 && (A.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${A.dmg.toFixed(0)} sx=${A.sx}`);
  const D = await normal("j", 60, { lift: 70, down: true });
  await shot("downair_fallback");
  check("down_air connects (fallback pose)", D.dmg > 0 && (D.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${D.dmg.toFixed(0)} sx=${D.sx}`);

  console.log(`\n── SPIN — evasive dodge (neutral Special): i-frames + spin pose + no damage taken ──`);
  await prep(48);
  const en0 = (await p1()).energy, hp0 = (await p1()).health;
  const res = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  await wf(1);
  const spun = await p1();
  await shot("spin_dodge");
  check("SPIN cast pose = hiruzenSpin", res?.cast === "hiruzenSpin", `cast=${res?.cast}`);
  check("SPIN grants i-frames (invulnTimer>0)", (spun.invulnTimer || 0) > 0, `invuln=${spun.invulnTimer}`);
  check("SPIN spends ~15 chakra", Math.abs((en0 - spun.energy) - 15) <= 3, `spent=${(en0 - spun.energy).toFixed(0)}`);
  // prove the DODGE: p2 attacks into the i-frame window → Hiruzen takes ZERO damage
  await page.evaluate(() => window.__harness.p2Attack());
  for (let i = 0; i < 14; i++) await wf(1);
  const after = await p1();
  check("SPIN dodges the incoming hit (0 dmg taken)", after.health >= hp0 - 0.01, `hp ${hp0.toFixed(0)}→${after.health.toFixed(0)}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ HIRUZEN Stage 2: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
