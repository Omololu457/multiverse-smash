// harness/green_lantern_stage5.mjs — STAGE 5: Green Lantern's 6 fixed-slot CONSTRUCT specials
// (executeGreenLanternSpecial, direction-branched). Each = a hard-light construct projectile carrying its
// own construct sprite, fired from the shared arms-forward cast pose (glBeam). Asserts per construct:
//   (1) fires (cast pose = glBeam), (2) spawns its named projectile (glFist/glLion/glBlade/glTentacle/
//   glSpike/glSphere), (3) the horizontally-traveling ones CONNECT on the dummy (dmg). Spike Crown
//   (anti-air, rises) + Sphere (air) are verified on spawn. Finally: all spend Willpower, data contract.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `green_lantern_s5_${name}.png`) }); return; }
  const padX = 240, padTop = r.h * 1.2, padBot = 40;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2.6), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `green_lantern_s5_${name}_crop.png`), clip });
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function setup(gap = 110) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.32);
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

  // ── GROUND constructs that travel horizontally (connect on dummy) ──
  console.log("\n── ground constructs (fire → projectile → connect) ──");
  const ground = [
    [null, "glFist",     "Emerald Fist",     100],
    ["F",  "glLion",     "Lion-Head Ram",    130],
    ["B",  "glBlade",    "Blade",            150],
    ["D",  "glTentacle", "Binding Tentacle", 90],
  ];
  for (const [dir, name, label, gap] of ground) {
    await setup(gap);
    const en0 = (await p1()).energy ?? 0; const hp0 = (await p2()).health;
    const res = await fireDir(dir);
    check(`${label}: fires (cast=glBeam)`, res.cast === "glBeam", `move=${res.move} cast=${res.cast}`);
    let saw = false;
    for (let i = 0; i < 14 && !saw; i++) { await waitFrames(1); const ps = await projs(); if (ps.some(p => p.name === name)) { saw = true; if (name === "glFist") await crop("constructs"); } }
    check(`${label}: spawns ${name} projectile`, saw, "");
    await waitFrames(20);
    const hp1 = (await p2()).health; const en1 = (await p1()).energy ?? 0;
    check(`${label}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    check(`${label}: spends Willpower`, en1 < en0, `en ${en0.toFixed(0)} → ${en1.toFixed(0)}`);
    await waitGrounded(); await waitFrames(4);
  }

  // ── Up = Spike Crown (anti-air, rises) — verify spawn + upward travel ──
  // Dummy placed FAR (the wide w82 crown would otherwise collide with an adjacent foe on the spawn frame
  // and despawn instantly — correct hitbox behavior, but we want to observe the rising trajectory here).
  console.log("\n── Up: Spike Crown (anti-air launcher) ──");
  await setup(440);
  {
    const res = await fireDir("U");
    check("Spike Crown: fires (cast=glBeam)", res.cast === "glBeam", `cast=${res.cast}`);
    let sp = null;
    for (let i = 0; i < 14 && !sp; i++) { await waitFrames(1); const ps = await projs(); sp = ps.find(p => p.name === "glSpike") || null; }
    check("Spike Crown: spawns glSpike projectile", !!sp, "");
    check("Spike Crown: rises (vy < 0, anti-air)", !!sp && sp.vy < 0, `vy=${sp?.vy}`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── AIR = Wrecking Sphere — lift P1, fire, verify spawn + downward drop ──
  // Dummy placed FAR (same reason as Spike Crown — the wide sphere would collide instantly if adjacent).
  console.log("\n── air: Wrecking Sphere ──");
  await setup(440);
  {
    await page.evaluate(() => window.__harness.liftP1(70));
    await waitFrames(1);
    const res = await fireDir(null);
    check("Wrecking Sphere: fires airborne (cast=glBeam)", res.cast === "glBeam", `cast=${res.cast}`);
    let sp = null;
    for (let i = 0; i < 14 && !sp; i++) { await waitFrames(1); const ps = await projs(); sp = ps.find(p => p.name === "glSphere") || null; }
    check("Wrecking Sphere: spawns glSphere projectile", !!sp, "");
    check("Wrecking Sphere: drops (vy > 0)", !!sp && sp.vy > 0, `vy=${sp?.vy}`);
  }
  await waitGrounded(); await waitFrames(4);

  // ── DATA contract ──
  console.log("\n── data contract ──");
  const projSheets = ["gl_fist", "gl_lion", "gl_blade", "gl_tentacle", "gl_spike", "gl_sphere"];
  const allSheets = projSheets.every(s => fs.existsSync(path.join(ROOT, `${s}_uniform.png`)));
  check("all 6 construct projectile sheets exist on disk", allSheets, "");
  const ad = await page.evaluate(() => window.__harness.charDef("green_lantern")?.animationData || {});
  check("construct casts reuse glBeam arms-forward pose", (ad.glBeam?.sheet || "").includes("gl_beam_uniform"), "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Green Lantern Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/green_lantern_s5_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
