// harness/orochimaru_stage2_shots.mjs — Stage 2 CONNECT test + VISUAL capture: all 5 normals + the
// throw-weapon grab + the two bonus directional strongs (Forward Strong = Fwd+Heavy command normal,
// Aerial Strong = air+Heavy). Verifies each deals damage and renders its real orochimaru sheet, and
// confirms the confirmed strong_forward/special_move_01 duplicate is sourced from one file.
// Writes PNGs to /tmp/orochimaru_s2/. Keys: light=j heavy=k up=i grab=o forward=d.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/orochimaru_s2"; fs.mkdirSync(OUT, { recursive: true });
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
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1"));
  const cb = await page.locator("#gameCanvas").boundingBox();
  if (r && cb) { const pad = 80; const x = Math.max(0, cb.x + r.x - pad), y = Math.max(0, cb.y + r.y - pad * 1.8); const w = Math.min(cb.width - (r.x - pad), r.w + pad * 2.4), h = Math.min(cb.height - (r.y - pad * 1.8), r.h + pad * 2.6); try { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x, y, width: Math.max(80, w), height: Math.max(80, h) } }); return; } catch (_) {} }
  await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") });
}
// ground normal (single key), captures peak damage + the attacking sheet, screenshots mid-swing
async function normal(key, gap, name, { lift = 0, down = false } = {}) {
  await prep(gap);
  if (lift) await page.evaluate(dy => window.__harness.liftP1(dy), lift);
  if (down) { await page.keyboard.down("s"); await wf(1); }
  const hp0 = (await p2()).health; let sheet = null, shotDone = false;
  await page.keyboard.down(key);
  for (let i = 0; i < 9; i++) { const a = await p1(); if (a.attacking && a.spriteSheet) { sheet = a.spriteSheet; if (!shotDone && i >= 1) { await shot(name); shotDone = true; } } await wf(1); }
  await page.keyboard.up(key); if (down) await page.keyboard.up("s");
  return { dmg: hp0 - (await p2()).health, sheet };
}
async function airNormal(key, gap, name, opts, tries = 5) { let best = { dmg: 0, sheet: null }; for (let i = 0; i < tries; i++) { const r = await normal(key, gap, name, opts); if (r.dmg > best.dmg) best = r; if (r.dmg > 0) break; } return best; }
// Forward Strong: hold forward (d) then press heavy (k) — the Fwd+Heavy command normal
async function fwdStrong(gap, name) {
  await prep(gap);
  const hp0 = (await p2()).health; let sheet = null, shotDone = false;
  await page.keyboard.down("d"); await wf(2);
  await page.keyboard.down("k");
  for (let i = 0; i < 10; i++) { const a = await p1(); if (a.attacking && a.spriteSheet) { sheet = a.spriteSheet; if (!shotDone && i >= 1) { await shot(name); shotDone = true; } } await wf(1); }
  await page.keyboard.up("k"); await page.keyboard.up("d");
  return { dmg: hp0 - (await p2()).health, sheet };
}
// Grab (throw-weapon): press grab (o), wait out the throw, capture the cast pose
async function grab(gap, name) {
  await prep(gap);
  const hp0 = (await p2()).health; let castSheet = null;
  await page.keyboard.down("o"); await wf(2);
  for (let i = 0; i < 4; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("orochimaru_throw")) { castSheet = a.spriteSheet; break; } await wf(1); }
  await shot(name); await page.keyboard.up("o");
  for (let i = 0; i < 40; i++) await wf(1);   // wait for grabTimer → throw damage
  return { dmg: hp0 - (await p2()).health, castSheet };
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=orochimaru&p2=orochimaru`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("5 normals connect + render real sheets");
  const L = await normal("j", 60, "n1_light");
  check("light connects → orochimaru_light_uniform (snake-whip)", L.dmg > 0 && (L.sheet || "").includes("orochimaru_light_uniform"), `dmg=${L.dmg.toFixed(0)} sheet=${L.sheet}`);
  const H = await normal("k", 90, "n2_heavy");
  check("heavy connects → orochimaru_heavy_uniform (Kusanagi thrust) + ≥ light", H.dmg > 0 && H.dmg >= L.dmg && (H.sheet || "").includes("orochimaru_heavy_uniform"), `L=${L.dmg.toFixed(0)} H=${H.dmg.toFixed(0)} sheet=${H.sheet}`);
  const U = await normal("i", 64, "n3_up");
  check("up connects → orochimaru_up_uniform (launcher)", U.dmg > 0 && (U.sheet || "").includes("orochimaru_up_uniform"), `dmg=${U.dmg.toFixed(0)} sheet=${U.sheet}`);
  const A = await airNormal("j", 72, "n4_air", { lift: 68 });
  check("air connects → orochimaru_air_uniform", A.dmg > 0 && (A.sheet || "").includes("orochimaru_air_uniform"), `dmg=${A.dmg.toFixed(0)} sheet=${A.sheet}`);
  const D = await airNormal("j", 60, "n5_downair", { lift: 72, down: true });
  check("down_air connects → orochimaru_downair_uniform", D.dmg > 0 && (D.sheet || "").includes("orochimaru_downair_uniform"), `dmg=${D.dmg.toFixed(0)} sheet=${D.sheet}`);

  section("bonus directional strongs");
  const FS = await fwdStrong(80, "s1_forward_strong");
  check("Forward Strong (Fwd+Heavy) connects → orochimaru_fwdstrong_uniform", FS.dmg > 0 && (FS.sheet || "").includes("orochimaru_fwdstrong_uniform"), `dmg=${FS.dmg.toFixed(0)} sheet=${FS.sheet}`);
  const AS = await airNormal("k", 76, "s2_aerial_strong", { lift: 70 });
  check("Aerial Strong (air+Heavy) connects → orochimaru_airstrong_uniform", AS.dmg > 0 && (AS.sheet || "").includes("orochimaru_airstrong_uniform"), `dmg=${AS.dmg.toFixed(0)} sheet=${AS.sheet}`);

  section("grab (throw-weapon)");
  const G = await grab(46, "g1_grab");
  check("grab shows throw-weapon cast pose (orochimaru_throw)", (G.castSheet || "").includes("orochimaru_throw"), `castSheet=${G.castSheet}`);
  check("grab throw connects (damage dealt)", G.dmg > 0, `dmg=${G.dmg.toFixed(0)}`);

  section("duplicate resolution (strong_forward vs special_move_01)");
  const files = fs.readdirSync(ROOT).filter(f => f.startsWith("orochimaru_") && f.endsWith(".png"));
  check("Forward Strong sourced from p1_strong_attack_forward ONLY (no special_move_01 import)", fs.existsSync(path.join(ROOT, "orochimaru_fwdstrong_uniform.png")) && !files.some(f => f.includes("special_move_01") || f.includes("specialmove01")), `fwdstrong sheet present, no dup sheet`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ OROCHIMARU Stage 2: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
