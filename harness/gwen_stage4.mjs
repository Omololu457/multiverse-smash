// harness/gwen_stage4.mjs
// STAGE 4 evidence: Gwen's directional/air SPECIALS (fixed-slot mana zoner).
// (1) WIRING — the cast-pose actions (gwenCast / gwenCrescent) point at real reslice'd sheets (no box).
// (2) MANA BOLT (neutral) — procedural magenta bolt projectile + connect.
// (3) CRESCENT SLASH (Fwd) — wide disjoint MELEE arc: renders gwen_crescent + connects.
// (4) SPIKE-CROWN (Up) — mana CONSTRUCT (real sprite), spawns rising (anti-air, vy<0).
// (5) MANA SPHERE (Down) — mana CONSTRUCT (real sprite), ground advance + connect.
// (6) BLUE VORTEX (Back) — DISTINCT big slow cyan burst (w≥70) + connect.
// (7) OVAL-PORTAL BEAM (air) — fast piercing magenta capsule + connect.
// All projectile/melee damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Shots → harness/shots/gwen_stage4_*.png.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gwen_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
// NB: exclude `_impact` FX projectiles (Stage 6 on-connect blooms carry their own sheet) so sheet-checks
// read the MAIN projectile, not its impact bloom.
async function seeProj(nameFrag, maxF = 20) { let seen = 0, maxW = 0, sheet = null, vyMin = 0, vxAbs = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase()) && !(p.name || "").includes("_impact")); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || 0)); if (hit[0].sheet) sheet = hit[0].sheet; vyMin = Math.min(vyMin, ...hit.map(p => p.vy || 0)); vxAbs = Math.max(vxAbs, ...hit.map(p => Math.abs(p.vx || 0))); } await waitFrames(1); } return { seen, maxW, sheet, vyMin, vxAbs }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gwen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("gwen").animationData);

  console.log("\n── (1) wiring: special cast actions → real gwen_ sheets (no box) ──");
  check(`gwenCast wired → gwen_cast_uniform`, (ad.gwenCast?.sheet || "").includes("gwen_cast_uniform"), `sheet=${ad.gwenCast?.sheet}`);
  check(`gwenCrescent wired → gwen_crescent_uniform`, (ad.gwenCrescent?.sheet || "").includes("gwen_crescent_uniform"), `sheet=${ad.gwenCrescent?.sheet}`);

  console.log("\n── (2) Mana Bolt (neutral) — cast + procedural bolt + connect ──");
  await prep(140);
  let h0 = (await p2()).health;
  const bres = await fireDir(null);
  check(`Mana Bolt casts gwenCast`, bres?.cast === "gwenCast", `cast=${bres?.cast}`);
  const bolt = await seeProj("gwenBolt", 20);
  check(`Mana Bolt spawns a projectile`, bolt.seen >= 1, `seen=${bolt.seen}`);
  check(`Mana Bolt is procedural (no sheet)`, !bolt.sheet, `sheet=${bolt.sheet}`);
  await shot("bolt");
  await waitFrames(22);
  check(`Mana Bolt connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Crescent Slash (Fwd) — wide disjoint melee: renders sprite + connect ──");
  await prep(88);
  h0 = (await p2()).health;
  const cres = await fireDir("F");
  check(`Crescent fires gwenCrescent`, cres?.move === "gwenCrescent", `move=${cres?.move}`);
  let sawCres = false; for (let f = 0; f < 12; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("gwen_crescent_uniform")) sawCres = true; await waitFrames(1); }
  check(`Crescent renders gwen_crescent_uniform`, sawCres, "");
  await shot("crescent");
  await waitFrames(6);
  check(`Crescent connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Spike-Crown (Up) — mana CONSTRUCT, spawns rising (anti-air) ──");
  // Wide gap so the rising anti-air construct stays VISIBLE (a point-blank spike overlaps + despawns
  // same-frame). Then LIFT the dummy into the air and confirm the rising construct connects on it.
  await prep(120);
  const ures = await fireDir("U");
  check(`Spike-Crown casts gwenCast`, ures?.cast === "gwenCast", `cast=${ures?.cast}`);
  const spike = await seeProj("gwenSpike", 20);
  check(`Spike-Crown spawns a construct projectile`, spike.seen >= 1, `seen=${spike.seen}`);
  check(`Spike-Crown carries real construct sprite (gwen_spike)`, (spike.sheet || "").includes("gwen_spike"), `sheet=${spike.sheet}`);
  check(`Spike-Crown rises (anti-air, vy<0)`, spike.vyMin < 0, `vyMin=${spike.vyMin}`);
  await shot("spike");
  await waitGrounded(); await waitFrames(6);
  // anti-air connect: airborne dummy at close range
  await prep(50);
  let hs0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP2?.(70)); await waitFrames(1);
  await fireDir("U");
  await waitFrames(18);
  check(`Spike-Crown connects on airborne dummy (dmg ${((hs0 - (await p2()).health)).toFixed(0)})`, hs0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Mana Sphere (Down) — mana CONSTRUCT, ground advance + connect ──");
  await prep(96);
  h0 = (await p2()).health;
  const dres = await fireDir("D");
  check(`Mana Sphere casts gwenCast`, dres?.cast === "gwenCast", `cast=${dres?.cast}`);
  const sph = await seeProj("gwenSphere", 24);
  check(`Mana Sphere spawns a construct projectile`, sph.seen >= 1, `seen=${sph.seen}`);
  check(`Mana Sphere carries real construct sprite (gwen_sphere)`, (sph.sheet || "").includes("gwen_sphere"), `sheet=${sph.sheet}`);
  await shot("sphere");
  await waitFrames(20);
  check(`Mana Sphere connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) Blue Vortex (Back) — DISTINCT big slow cyan burst + connect ──");
  await prep(110);
  h0 = (await p2()).health;
  const vres = await fireDir("B");
  check(`Blue Vortex casts gwenCast`, vres?.cast === "gwenCast", `cast=${vres?.cast}`);
  const vtx = await seeProj("gwenVortex", 28);
  check(`Blue Vortex spawns a large burst (w=${vtx.maxW})`, vtx.seen >= 1 && vtx.maxW >= 70, `seen=${vtx.seen} w=${vtx.maxW}`);
  check(`Blue Vortex is procedural (no sheet)`, !vtx.sheet, `sheet=${vtx.sheet}`);
  await shot("vortex");
  await waitFrames(26);
  check(`Blue Vortex connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (7) Oval-Portal Beam (air) — fast magenta capsule (aerial) ──");
  // Airborne special (needs !grounded). SPAWN-check at long range (beam stays visible instead of
  // instant-hitting), then CONNECT-check with both lifted at close range.
  await prep(160);   // far → beam flies without an instant point-blank despawn
  await page.evaluate(() => window.__harness.liftP1?.(60)); await waitFrames(1);
  const ores = await fireDir(null);
  check(`air Special casts gwenCast (Oval-Portal Beam)`, ores?.cast === "gwenCast", `cast=${ores?.cast}`);
  const oval = await seeProj("gwenOval", 22);
  check(`Oval-Portal Beam spawns a projectile`, oval.seen >= 1, `seen=${oval.seen}`);
  check(`Oval-Portal Beam travels forward (vx≠0)`, (oval.vxAbs || 0) > 0, `vxAbs=${oval.vxAbs}`);
  await shot("oval");
  await waitGrounded(); await waitFrames(6);
  await prep(70);
  await page.evaluate(() => { window.__harness.liftP1?.(60); window.__harness.liftP2?.(60); }); await waitFrames(1);
  h0 = (await p2()).health;
  await fireDir(null);
  await waitFrames(18);
  check(`Oval-Portal Beam connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
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
