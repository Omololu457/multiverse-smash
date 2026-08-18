// harness/green_lantern_stage4.mjs — STAGE 4: Green Lantern's ranged/mobility layer on the dual-use
// charge button (Onoki pattern). P-TAP = FLIGHT toggle (generic canFly path); P-HOLD→release = ENERGY
// BEAM (fireGreenLanternBeam → glBeam cast pose + glBeam projectile). Asserts:
//   (1) P-tap engages then disengages Flight (_flightActive), (2) P-hold fires the beam → gl_beam_uniform
//   cast pose, (3) it spawns a glBeam projectile that CONNECTS on the dummy, (4) beam spends Willpower,
//   (5) the P-hold did NOT toggle flight.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `green_lantern_s4_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2.4), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `green_lantern_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 120) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.30);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
  await page.evaluate(() => window.__harness.fillEnergy?.());
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=green_lantern`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await page.evaluate(() => window.__harness.fillEnergy?.());

  // ── P-TAP → FLIGHT toggle (generic canFly path) ──
  console.log("\n── P-tap flight toggle ──");
  await waitGrounded();
  const f0 = (await p1()).flightActive;
  await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p"); await waitFrames(3);
  const f1 = (await p1()).flightActive;
  check("P-tap engages Flight (_flightActive true)", f1 === true && f1 !== f0, `before=${f0} after=${f1}`);
  await crop("flight");
  await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p"); await waitFrames(3);
  const f2 = (await p1()).flightActive;
  check("P-tap again disengages Flight", f2 === false, `after2=${f2}`);
  await waitGrounded();

  // ── P-HOLD → ENERGY BEAM ──
  console.log("\n── P-hold Energy Beam ──");
  let firedCast = "", sawBolt = false, dmg = 0, enSpent = 0, flightUnchanged = true;
  for (let attempt = 0; attempt < 5 && !(sawBolt && dmg > 0); attempt++) {
    await setupAdjacent(120);
    const hp0 = (await p2()).health; const en0 = (await p1()).energy ?? 0; const flBefore = (await p1()).flightActive;
    await page.keyboard.down("p"); await waitFrames(20);            // real HOLD (wind-up)
    await page.keyboard.up("p");
    // catch the cast pose
    for (let i = 0; i < 8; i++) { const mv = await p1(); if (mv.castMove === "glBeam" || (mv.spriteSheet || "").includes("gl_beam_uniform")) { firedCast = mv.castMove || mv.spriteSheet; break; } await waitFrames(1); }
    await crop("beam");
    for (let i = 0; i < 16; i++) { await waitFrames(1); const ps = await projs(); if (ps.some(p => p.name === "glBeam")) { sawBolt = true; break; } }
    if ((await p1()).flightActive !== flBefore) flightUnchanged = false;
    await waitFrames(24);
    const hp1 = (await p2()).health; const en1 = (await p1()).energy ?? 0;
    dmg += Math.max(0, hp0 - hp1); enSpent += Math.max(0, en0 - en1);
    await waitGrounded(); await waitFrames(3);
  }
  check("P-hold fires Energy Beam (glBeam cast pose)", firedCast.includes("glBeam") || firedCast.includes("gl_beam_uniform"), `cast=${firedCast}`);
  check("beam spawns glBeam projectile", sawBolt, "");
  check("beam connects on dummy (dmg)", dmg > 0, `total dmg=${dmg.toFixed(0)}`);
  check("beam spends Willpower (energy)", enSpent > 0, `energy spent=${enSpent}`);
  check("P-hold did NOT toggle flight", flightUnchanged, `flightUnchanged=${flightUnchanged}`);

  // ── DATA contract ──
  console.log("\n── data contract ──");
  const def = await page.evaluate(() => window.__harness.charDef("green_lantern"));
  check("canFly trait enables flight", def?.traits?.canFly === true, `canFly=${def?.traits?.canFly}`);
  const ad = def?.animationData || {};
  check("glBeam cast pose wired to gl_beam_uniform", (ad.glBeam?.sheet || "").includes("gl_beam_uniform"), `sheet=${(ad.glBeam?.sheet||"MISSING").split("/").pop()}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Green Lantern Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/green_lantern_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
