// harness/vegito_stage4.mjs
// STAGE 4 evidence: Vegito's directional/air SPECIALS (fixed-slot large ki kit; 6 named specials).
// (1) WIRING — each special cast-pose action points at a real reslice'd sheet (no box).
// (2) BIG BANG ATTACK (neutral) — big slow procedural sphere (w≥70) + connect.
// (3) GALICK GUN (Fwd) — thin PIERCING purple beam projectile + connect.
// (4) BANSHEE BLAST (Back) — rapid-fire VOLLEY (≥2 gold bolts coexist) + connect.
// (5) SPREAD FINGER BEAM (Down) — FAN (≥3 bolts at spread vy) + connect.
// (6) AIR KI BLAST (Up) — fast rising cyan dart + connect.
// (7) PERFECT SHOT (air) — cyan dart pair + connect.
// All projectile damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Screenshots → harness/shots/vegito_stage4_*.png.
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `vegito_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function seeProj(nameFrag, maxF = 24) { let seen = 0, maxW = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase())); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || p.width || 0)); } await waitFrames(1); } return { seen, maxW }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegito&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("vegito").animationData);

  console.log("\n── (1) wiring: special cast poses → real vegito_ sheets (no box) ──");
  for (const [k, tag] of [
    ["vegitoBigbang", "vegito_bigbang_uniform"], ["vegitoGalick", "vegito_galick_uniform"],
    ["vegitoBanshee", "vegito_banshee_uniform"], ["vegitoSpread", "vegito_spread_uniform"],
    ["vegitoAirki", "vegito_airki_uniform"], ["vegitoPerfect", "vegito_perfect_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) Big Bang Attack (neutral) — big slow sphere + connect ──");
  await prep(150);
  let h0 = (await p2()).health;
  const bb = await fireDir(null);
  check(`Big Bang casts vegitoBigbang`, bb?.cast === "vegitoBigbang", `cast=${bb?.cast}`);
  const sph = await seeProj("vegitoBigbang", 30);
  check(`Big Bang spawns a large sphere (w=${sph.maxW})`, sph.seen >= 1 && sph.maxW >= 70, `seen=${sph.seen} w=${sph.maxW}`);
  await shot("bigbang");
  await waitFrames(26);
  check(`Big Bang connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Galick Gun (Fwd) — piercing purple beam + connect ──");
  await prep(150);
  h0 = (await p2()).health;
  const gg = await fireDir("F");
  check(`Galick Gun casts vegitoGalick`, gg?.cast === "vegitoGalick", `cast=${gg?.cast}`);
  const beam = await seeProj("vegitoGalick", 22);
  check(`Galick Gun spawns a beam projectile`, beam.seen >= 1, `seen=${beam.seen}`);
  await shot("galick");
  await waitFrames(20);
  check(`Galick Gun connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Banshee Blast (Back) — rapid-fire volley (≥2 coexist at range) + connect ──");
  await prep(460);   // FAR — bolts fly without hitting so the staggered volley coexists in-flight
  const bn = await fireDir("B");
  check(`Banshee casts vegitoBanshee`, bn?.cast === "vegitoBanshee", `cast=${bn?.cast}`);
  const vol = await seeProj("vegitoBanshee", 30);
  check(`Banshee fires a VOLLEY (peak coexisting ${vol.seen})`, vol.seen >= 2, `seen=${vol.seen}`);
  await shot("banshee");
  await waitGrounded(); await waitFrames(6);
  await prep(120);   // close — prove the volley connects
  h0 = (await p2()).health;
  await fireDir("B");
  await waitFrames(20);
  check(`Banshee connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Spread Finger Beam (Down) — FAN (≥3 bolts, spread vy) + connect ──");
  await prep(110);
  h0 = (await p2()).health;
  const sp = await fireDir("D");
  check(`Spread casts vegitoSpread`, sp?.cast === "vegitoSpread", `cast=${sp?.cast}`);
  let fanMax = 0, sawVy = false;
  for (let f = 0; f < 22; f++) { const pr = (await projectiles()).filter(p => (p.name || "").toLowerCase().includes("vegitospread")); fanMax = Math.max(fanMax, pr.length); if (pr.some(p => Math.abs(p.vy || 0) > 0.5)) sawVy = true; await waitFrames(1); }
  check(`Spread fires a FAN (peak ${fanMax} bolts)`, fanMax >= 3, `peak=${fanMax}`);
  check(`Spread bolts travel at spread angles (nonzero vy present)`, sawVy, "");
  await shot("spread");
  await waitFrames(14);
  check(`Spread connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) Air Ki Blast (Up) — fast rising cyan dart + connect ──");
  await prep(120);
  h0 = (await p2()).health;
  const ak = await fireDir("U");
  check(`Air Ki casts vegitoAirki`, ak?.cast === "vegitoAirki", `cast=${ak?.cast}`);
  const dart = await seeProj("vegitoAirki", 22);
  check(`Air Ki spawns a dart projectile`, dart.seen >= 1, `seen=${dart.seen}`);
  await shot("airki");
  await waitFrames(18);
  check(`Air Ki connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (7) Perfect Shot (air) — cyan dart pair + connect ──");
  await prep(80);
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(1);   // fire while still LOW so darts reach the grounded dummy
  h0 = (await p2()).health;
  const ps = await fireDir(null);
  check(`air Special casts vegitoPerfect`, ps?.cast === "vegitoPerfect", `cast=${ps?.cast}`);
  const pd = await seeProj("vegitoPerfect", 22);
  check(`Perfect Shot spawns dart(s)`, pd.seen >= 1, `seen=${pd.seen}`);
  await shot("perfect");
  await waitFrames(16);
  check(`Perfect Shot connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded();

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
