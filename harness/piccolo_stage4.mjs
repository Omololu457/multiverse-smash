// harness/piccolo_stage4.mjs
// STAGE 4 evidence: Piccolo's directional/air SPECIALS (fixed-slot large ki-zoner kit).
// (1) WIRING — each special cast-pose / melee action points at a real reslice'd sheet (no box).
// (2) SPECIAL BEAM CANNON (neutral) — thin PIERCING procedural beam projectile + connect.
// (3) STRETCH-ARM STRIKE (Fwd) — LONG disjoint melee: connects from a far gap + renders its own sprite.
// (4) MASENKO (Down) — quick procedural ki bolt + connect (Up shares it).
// (5) EXPLOSIVE DEMON WAVE (Back) — big slow procedural sphere (w≥70) + connect.
// (6) FLYING DASH KICK (air) — i-frame gap-closer: invulnTimer + forward lunge + connect.
// All projectile/melee damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Screenshots → harness/shots/piccolo_stage4_*.png.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `piccolo_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function seeProj(nameFrag, maxF = 20) { let seen = 0, maxW = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase())); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || p.width || 0)); } await waitFrames(1); } return { seen, maxW }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("piccolo").animationData);

  console.log("\n── (1) wiring: special cast/melee actions → real piccolo_ sheets (no box) ──");
  for (const [k, tag] of [
    ["piccoloBeam", "piccolo_beam_uniform"], ["piccoloMasenko", "piccolo_masenko_uniform"],
    ["piccoloDemonwave", "piccolo_demonwave_uniform"], ["piccoloStretch", "piccolo_stretch_uniform"],
    ["piccoloFlykick", "piccolo_flykick_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) Special Beam Cannon (neutral) — cast + piercing beam projectile + connect ──");
  await prep(150);
  let h0 = (await p2()).health;
  const bres = await fireDir(null);
  check(`Special Beam Cannon casts piccoloBeam`, bres?.cast === "piccoloBeam", `cast=${bres?.cast}`);
  const beam = await seeProj("piccoloBeam", 20);
  check(`Special Beam Cannon spawns a beam projectile`, beam.seen >= 1, `seen=${beam.seen}`);
  await shot("beam");
  await waitFrames(22);
  check(`Special Beam Cannon connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Stretch-Arm Strike (Fwd) — LONG disjoint melee: connects from far + renders sprite ──");
  await prep(150);   // far gap — proves the elongated-arm reach (rangeX 168)
  h0 = (await p2()).health;
  const sres = await fireDir("F");
  check(`Stretch-Arm fires piccoloStretch`, sres?.move === "piccoloStretch", `move=${sres?.move}`);
  let sawStretch = false; for (let f = 0; f < 12; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("piccolo_stretch_uniform")) sawStretch = true; await waitFrames(1); }
  check(`Stretch-Arm renders piccolo_stretch_uniform`, sawStretch, "");
  await shot("stretch");
  await waitFrames(6);
  check(`Stretch-Arm connects from far (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Masenko (Down) — quick ki bolt + connect ──");
  await prep(140);
  h0 = (await p2()).health;
  const mres = await fireDir("D");
  check(`Masenko casts piccoloMasenko`, mres?.cast === "piccoloMasenko", `cast=${mres?.cast}`);
  const mk = await seeProj("piccoloMasenko", 22);
  check(`Masenko spawns a ki-bolt projectile`, mk.seen >= 1, `seen=${mk.seen}`);
  await shot("masenko");
  await waitFrames(20);
  check(`Masenko connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4b) Up also fires Masenko (shared) ──");
  await prep(140);
  const ures = await fireDir("U");
  check(`Up Special also casts piccoloMasenko`, ures?.cast === "piccoloMasenko", `cast=${ures?.cast}`);
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Explosive Demon Wave (Back) — big slow sphere + connect ──");
  await prep(120);
  h0 = (await p2()).health;
  const dres = await fireDir("B");
  check(`Demon Wave casts piccoloDemonwave`, dres?.cast === "piccoloDemonwave", `cast=${dres?.cast}`);
  const dw = await seeProj("piccoloDemonWave", 26);
  check(`Demon Wave spawns a large sphere (w=${dw.maxW})`, dw.seen >= 1 && dw.maxW >= 70, `seen=${dw.seen} w=${dw.maxW}`);
  await shot("demonwave");
  await waitFrames(24);
  check(`Demon Wave connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) Flying Dash Kick (air) — i-frames + forward lunge + connect ──");
  await prep(44);   // close gap so the forward lunge sweeps P1 THROUGH the grounded P2 during the active window
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(1);   // fire while still low so the kick's rangeY reaches P2
  h0 = (await p2()).health; const fx0 = (await p1()).x;
  const fres = await fireDir(null);
  check(`air Special fires piccoloFlykick`, fres?.move === "piccoloFlykick", `move=${fres?.move}`);
  const inv = (await p1()).invulnTimer || 0;
  check(`Flying Dash Kick grants i-frames (invulnTimer ${inv})`, inv > 0, `invulnTimer=${inv}`);
  let flyDealt = 0, maxDx = 0;
  for (let f = 0; f < 16; f++) { await waitFrames(1); const cx = (await p1()).x; maxDx = Math.max(maxDx, Math.abs(cx - fx0)); flyDealt = Math.max(flyDealt, h0 - (await p2()).health); }
  check(`Flying Dash Kick lunges forward (peak Δx ${maxDx.toFixed(0)})`, maxDx > 8, `fromX=${fx0.toFixed(0)}`);
  await shot("flykick");
  check(`Flying Dash Kick connects (dmg ${flyDealt.toFixed(0)})`, flyDealt > 0, "");
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
