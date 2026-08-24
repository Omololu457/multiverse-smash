// harness/vilgax_stage4.mjs
// STAGE 4 evidence: Vilgax's directional/air SPECIALS (fixed-slot sword/blast bruiser).
// (1) WIRING — the cast-pose actions point at real reslice'd sheets (no 128² box).
// (2) PLASMA BLAST (neutral) — base tier: procedural red spiky burst + connect.
// (2b) PLASMA BLAST HEAVY (hold tier) — bigger (w≥70), piercing, more dmg than base.
// (3) ENERGY-SWORD SLASH (Fwd) — wide disjoint MELEE: renders vilgax_slash + connect.
// (4) THROWN SPINNING SWORD (Back) — real 4-frame spinning-blade sprite projectile + connect.
// (5) TELEPORT (Up) — blink: repositions P1 (x jumps) + grants i-frames (invulnTimer>0).
// (6) AERIAL TUMBLE (air) — spinning aerial disjoint: renders vilgax_tumble + connect.
// All damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Shots → harness/shots/vilgax_stage4_*.png.
// ★P2 = goku (not the P1-mirror default) so a mirrored Vilgax neutral-special can't confound reads.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `vilgax_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const fireBlast = (tier) => page.evaluate(t => window.__harness.vilgaxBlast(t), tier);
async function seeProj(nameFrag, maxF = 22) { let seen = 0, maxW = 0, sheet = null, vyMin = 0, vxAbs = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase()) && !(p.name || "").includes("_impact")); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || 0)); if (hit[0].sheet) sheet = hit[0].sheet; vyMin = Math.min(vyMin, ...hit.map(p => p.vy || 0)); vxAbs = Math.max(vxAbs, ...hit.map(p => Math.abs(p.vx || 0))); } await waitFrames(1); } return { seen, maxW, sheet, vyMin, vxAbs }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vilgax&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("vilgax").animationData);

  console.log("\n── (1) wiring: special cast actions → real vilgax_ sheets (no box) ──");
  check(`vilgaxBlastCast → vilgax_blastcast_uniform`, (ad.vilgaxBlastCast?.sheet || "").includes("vilgax_blastcast_uniform"), `sheet=${ad.vilgaxBlastCast?.sheet}`);
  check(`vilgaxBlastXCast → vilgax_blastxcast_uniform`, (ad.vilgaxBlastXCast?.sheet || "").includes("vilgax_blastxcast_uniform"), `sheet=${ad.vilgaxBlastXCast?.sheet}`);
  check(`vilgaxSlash → vilgax_slash_uniform`, (ad.vilgaxSlash?.sheet || "").includes("vilgax_slash_uniform"), `sheet=${ad.vilgaxSlash?.sheet}`);
  check(`vilgaxThrow → vilgax_throw_uniform`, (ad.vilgaxThrow?.sheet || "").includes("vilgax_throw_uniform"), `sheet=${ad.vilgaxThrow?.sheet}`);
  check(`vilgaxTumble → vilgax_tumble_uniform`, (ad.vilgaxTumble?.sheet || "").includes("vilgax_tumble_uniform"), `sheet=${ad.vilgaxTumble?.sheet}`);
  check(`vilgaxVanish → vilgax_vanish_uniform`, (ad.vilgaxVanish?.sheet || "").includes("vilgax_vanish_uniform"), `sheet=${ad.vilgaxVanish?.sheet}`);

  console.log("\n── (2) Plasma Blast (neutral, base) — cast + procedural red burst + connect ──");
  await prep(150);
  let h0 = (await p2()).health;
  const bres = await fireBlast("S");
  check(`base blast casts vilgaxBlastCast`, bres?.cast === "vilgaxBlastCast", `cast=${bres?.cast}`);
  const blast = await seeProj("vilgaxBlast", 22);
  check(`base blast spawns a projectile`, blast.seen >= 1, `seen=${blast.seen}`);
  check(`base blast is procedural (no sheet)`, !blast.sheet, `sheet=${blast.sheet}`);
  await shot("blast_base");
  await waitFrames(24);
  const dBase = h0 - (await p2()).health;
  check(`base blast connects (dmg ${dBase.toFixed(0)})`, dBase > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (2b) Plasma Blast HEAVY (hold tier) — bigger, piercing, harder than base ──");
  await prep(150);
  h0 = (await p2()).health;
  const xres = await fireBlast("X");
  check(`heavy blast casts vilgaxBlastXCast`, xres?.cast === "vilgaxBlastXCast", `cast=${xres?.cast}`);
  const heavy = await seeProj("vilgaxBlastX", 22);
  check(`heavy blast spawns a LARGE burst (w=${heavy.maxW})`, heavy.seen >= 1 && heavy.maxW >= 70, `seen=${heavy.seen} w=${heavy.maxW}`);
  check(`heavy blast costs more energy than base (${xres?.spent} > ${bres?.spent})`, (xres?.spent || 0) > (bres?.spent || 0), `base=${bres?.spent} heavy=${xres?.spent}`);
  await shot("blast_heavy");
  await waitFrames(24);
  const dHeavy = h0 - (await p2()).health;
  check(`heavy blast connects HARDER than base (${dHeavy.toFixed(0)} > ${dBase.toFixed(0)})`, dHeavy > dBase, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Energy-Sword Slash (Fwd) — wide disjoint melee: renders sprite + connect ──");
  await prep(96);
  h0 = (await p2()).health;
  const sres = await fireDir("F");
  check(`Slash fires vilgaxSlash`, sres?.move === "vilgaxSlash" || sres?.cast === "vilgaxSlash", `move=${sres?.move} cast=${sres?.cast}`);
  let sawSlash = false; for (let f = 0; f < 12; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("vilgax_slash_uniform")) sawSlash = true; await waitFrames(1); }
  check(`Slash renders vilgax_slash_uniform`, sawSlash, "");
  await shot("slash");
  await waitFrames(6);
  check(`Slash connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Thrown Spinning Sword (Back) — real spinning-blade sprite projectile + connect ──");
  await prep(150);
  h0 = (await p2()).health;
  const tres = await fireDir("B");
  check(`Thrown Sword casts vilgaxThrow`, tres?.cast === "vilgaxThrow", `cast=${tres?.cast}`);
  const sword = await seeProj("vilgaxSword", 24);
  check(`Thrown Sword spawns a projectile`, sword.seen >= 1, `seen=${sword.seen}`);
  check(`Thrown Sword carries the real spinning-blade sprite (vilgax_sword)`, (sword.sheet || "").includes("vilgax_sword"), `sheet=${sword.sheet}`);
  await shot("sword");
  await waitFrames(20);
  check(`Thrown Sword connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Teleport (Up) — blink: repositions P1 + i-frames ──");
  await prep(120);
  const before = await p1();
  const upres = await fireDir("U");
  check(`Teleport casts vilgaxVanish`, upres?.cast === "vilgaxVanish", `cast=${upres?.cast}`);
  await waitFrames(12);
  const after = await p1();
  check(`Teleport repositions P1 (x moved ${Math.abs((after.x||0)-(before.x||0)).toFixed(0)}px)`, Math.abs((after.x || 0) - (before.x || 0)) > 40, `x ${before.x?.toFixed(0)} → ${after.x?.toFixed(0)}`);
  const inv = await page.evaluate(() => { const f = window.__harness.p1(); return f.invulnTimer || 0; });
  check(`Teleport grants i-frames (invulnTimer=${inv})`, inv > 0, "");
  await shot("teleport");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) Aerial Tumble (air) — spinning aerial disjoint: renders + connect ──");
  await prep(60);
  h0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1?.(46));
  await waitFrames(1);
  const ares = await fireDir("air");
  check(`Aerial Tumble fires vilgaxTumble`, ares?.move === "vilgaxTumble" || ares?.cast === "vilgaxTumble", `move=${ares?.move} cast=${ares?.cast}`);
  let sawTumble = false; for (let f = 0; f < 14; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("vilgax_tumble_uniform")) sawTumble = true; await waitFrames(1); }
  check(`Aerial Tumble renders vilgax_tumble_uniform`, sawTumble, "");
  await shot("tumble");
  check(`Aerial Tumble connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(4);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
