// harness/light_stage4.mjs
// STAGE 4 evidence: Light Yagami — the 7 special-tier call-ins (Y family + reclassified B+Up). Asserts the
// dir-branched dispatch (ground N/F/U/B/D + air F/else), the shared cast poses (lightCast / lightAirCast),
// energy spend from the Kira pool, and that each move spawns its named summon projectile (Ryuk / L / vortex /
// violet / gunman / air-figure) as a real hitbox — the Ghostface phantom idiom (no persistent assist).
// Screenshots → harness/shots/light_stage4_*.png.
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
const fx = () => page.evaluate(() => window.__harness.lightFx("p1"));
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=light`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `light_stage4_${tag}.png`) }); }
const setEnergy = (v) => page.evaluate((e) => window.__harness.setEnergy(e), v);
const liftP1 = (dy) => page.evaluate((d) => window.__harness.liftP1(d), dy);
const castDir = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
// fire a special, then poll a few frames for its summon projectile (sheet substring) + capture a clip
async function fireGround(tag, dir, sheetSub, wantCast) {
  await setEnergy(200); await waitFrames(2);
  const before = (await p1()).energy ?? 0;
  const res = await castDir(dir);
  let seenSheet = false, seenCast = false, best = [];
  for (let i = 0; i < 16; i++) { const ps = await projs(); const s = await fx(); if (s?.castMove === wantCast) seenCast = true; best = ps.map(p => p.sheet).filter(Boolean); if (ps.some(p => (p.sheet || "").includes(sheetSub))) { seenSheet = true; if (i >= 3) { await shot(tag); break; } } await waitFrames(1); }
  if (!seenSheet) await shot(tag);
  const after = (await p1()).energy ?? 0;
  return { seenSheet, seenCast, spent: before - after, castRes: res, sheets: [...new Set(best)] };
}
async function clearProj() { await page.evaluate(() => window.__harness.forceAction(null, "p1")); await waitFrames(30); }

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);
  const g = await p1();
  check("P1 is Light", g.key === "light", `key=${g.key}`);

  const GROUND = [
    { tag: "vortex_neutral", dir: null, sheet: "light_vortex",    cast: "lightCast", label: "N → Y vortex (widest)" },
    { tag: "divekick_fwd",   dir: "F",  sheet: "light_ldivekick", cast: "lightCast", label: "F → L diving kick" },
    { tag: "ryuk_up",        dir: "U",  sheet: "light_ryuk",      cast: "lightCast", label: "U → Ryuk anti-air" },
    { tag: "rising_back",    dir: "B",  sheet: "light_lrising",   cast: "lightCast", label: "B → L rising burst" },
    { tag: "violet_down",    dir: "D",  sheet: "light_violet",    cast: "lightCast", label: "D → violet burst" },
  ];
  console.log("\n── GROUND specials (dir + Special) ──");
  for (const m of GROUND) {
    const r = await fireGround(m.tag, m.dir, m.sheet, m.cast);
    check(`${m.label}: summon projectile spawns (${m.sheet})`, r.seenSheet, `sheets=[${r.sheets.join(", ")}]`);
    check(`${m.label}: cast pose = ${m.cast}`, r.seenCast, `cast=${r.castRes?.cast}`);
    check(`${m.label}: spent Kira energy`, r.spent > 0, `spent=${r.spent}`);
    await clearProj();
  }

  console.log("\n── AIR specials (airborne via liftP1) ──");
  // jump+Y air punch (Fwd) + jump+B gunman rocket (neutral)
  const AIR = [
    { tag: "airpunch_fwd", dir: "F",  sheet: "light_airfigure", label: "air F → air punch" },
    { tag: "gunman_air",   dir: null, sheet: "light_gunman",    label: "air neutral → gunman rocket" },
  ];
  for (const m of AIR) {
    await setEnergy(200); await liftP1(60); await waitFrames(1);
    const before = (await p1()).energy ?? 0;
    const res = await castDir(m.dir);
    let seen = false, seenCast = false, sheets = [];
    for (let i = 0; i < 16; i++) { const ps = await projs(); const s = await fx(); if (s?.castMove === "lightAirCast") seenCast = true; sheets = [...new Set(ps.map(p => p.sheet).filter(Boolean))]; if (ps.some(p => (p.sheet || "").includes(m.sheet))) { seen = true; if (i >= 3) { await shot(m.tag); break; } } await liftP1(6); await waitFrames(1); }
    if (!seen) await shot(m.tag);
    const spent = before - ((await p1()).energy ?? 0);
    check(`${m.label}: summon projectile spawns (${m.sheet})`, seen, `sheets=[${sheets.join(", ")}]`);
    check(`${m.label}: air cast pose = lightAirCast`, seenCast, `cast=${res?.cast}`);
    check(`${m.label}: spent Kira energy`, spent > 0, `spent=${spent}`);
    await clearProj();
  }

  console.log("\n── energy gate (broke → no special) ──");
  await setEnergy(0); await waitFrames(2);
  const beforeN = (await projs()).length;
  await castDir(null); await waitFrames(6);
  const afterN = (await projs()).length;
  check("no energy → vortex does not spawn", afterN <= beforeN, `before=${beforeN} after=${afterN}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
