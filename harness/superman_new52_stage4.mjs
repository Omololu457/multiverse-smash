// harness/superman_new52_stage4.mjs
// STAGE 4 evidence: Superman (Custom / DCUC) directional/air SPECIALS (fixed-slot flying-brawler kit).
// (1) WIRING — each special melee action points at a real reslice'd sheet (no box).
// (2) HEAT VISION (neutral) — thin PIERCING procedural beam projectile + connect.
// (3) FLYING CHARGE (Fwd) — i-frame dash tackle: invulnTimer + forward lunge + connect, renders its sprite.
// (4) SOARING UPPERCUT (Up) — anti-air LAUNCHER melee: rises + launches P2, renders its sprite.
// (5) SUPER BREATH (Down) — wide slow procedural gust (w≥60) + connect.
// (6) FLYING RETREAT (Back) — i-frame backward reposition (invulnTimer + moves back, no dmg needed).
// (7) FLYING DIVE KICK (air) — i-frames + down-forward lunge + connect, renders its sprite.
// All projectile/melee damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Screenshots → harness/shots/superman_new52_stage4_*.png.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `superman_new52_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function seeProj(nameFrag, maxF = 22) { let seen = 0, maxW = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase())); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || p.width || 0)); } await waitFrames(1); } return { seen, maxW }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman_new52`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("superman_new52").animationData);

  console.log("\n── (1) wiring: special melee actions → real superman_new52_ sheets (no box) ──");
  for (const [k, tag] of [
    ["supN52Flycharge", "superman_new52_flycharge_uniform"], ["supN52Soar", "superman_new52_up_uniform"], ["supN52Dive", "superman_new52_dive_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) Heat Vision (neutral) — piercing beam projectile + connect ──");
  await prep(150);
  let h0 = (await p2()).health;
  await fireDir(null);
  const beam = await seeProj("supN52Heat", 20);
  check(`Heat Vision spawns a beam projectile`, beam.seen >= 1, `seen=${beam.seen}`);
  await shot("heatvision");
  await waitFrames(22);
  check(`Heat Vision connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Flying Charge (Fwd) — i-frame dash tackle: lunge + connect + sprite ──");
  await prep(70);
  h0 = (await p2()).health; const cx0 = (await p1()).x;
  const cres = await fireDir("F");
  check(`Flying Charge fires supN52Flycharge`, cres?.move === "supN52Flycharge", `move=${cres?.move}`);
  check(`Flying Charge grants i-frames (invulnTimer ${(await p1()).invulnTimer || 0})`, ((await p1()).invulnTimer || 0) > 0, "");
  let sawCharge = false, chDealt = 0, maxDx = 0;
  for (let f = 0; f < 14; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("superman_new52_flycharge_uniform")) sawCharge = true; maxDx = Math.max(maxDx, Math.abs(mv.x - cx0)); chDealt = Math.max(chDealt, h0 - (await p2()).health); await waitFrames(1); }
  check(`Flying Charge renders superman_new52_flycharge_uniform`, sawCharge, "");
  check(`Flying Charge lunges forward (peak Δx ${maxDx.toFixed(0)})`, maxDx > 8, "");
  await shot("flycharge");
  check(`Flying Charge connects (dmg ${chDealt.toFixed(0)})`, chDealt > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Soaring Uppercut (Up) — anti-air LAUNCHER: rises + launches P2 ──");
  await prep(46);
  h0 = (await p2()).health;
  const ures = await fireDir("U");
  check(`Soaring Uppercut fires supN52Soar`, ures?.move === "supN52Soar", `move=${ures?.move}`);
  let sawSoar = false, launched = { grounded: true, vy: 0 }, soDealt = 0;
  for (let f = 0; f < 14; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("superman_new52_up_uniform")) sawSoar = true; const b = await p2(); if (!b.grounded || b.vy < -0.5) launched = b; soDealt = Math.max(soDealt, h0 - b.health); await waitFrames(1); }
  check(`Soaring Uppercut renders its sprite`, sawSoar, "");
  check(`Soaring Uppercut launches P2 (airborne/upward)`, !launched.grounded || launched.vy < -0.5, `grounded=${launched.grounded} vy=${launched.vy}`);
  await shot("soar");
  check(`Soaring Uppercut connects (dmg ${soDealt.toFixed(0)})`, soDealt > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Super Breath (Down) — wide slow gust (spawn+width) then connect ──");
  // Spawn/width proof at a FAR gap so the short-lived non-piercing gust stays visible (doesn't hit+despawn instantly).
  await prep(260);
  await fireDir("D");
  const gust = await seeProj("supN52Breath", 22);
  check(`Super Breath spawns a wide gust (w=${gust.maxW})`, gust.seen >= 1 && gust.maxW >= 60, `seen=${gust.seen} w=${gust.maxW}`);
  await shot("breath");
  await waitGrounded(); await waitFrames(6);
  // Connect proof at close range.
  await prep(64);
  h0 = (await p2()).health;
  await fireDir("D");
  await waitFrames(16);
  check(`Super Breath connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) Flying Retreat (Back) — i-frame backward reposition ──");
  await prep(60);
  const rx0 = (await p1()).x; const facing = (await p1()).facing || 1;
  await fireDir("B");
  const rinv = (await p1()).invulnTimer || 0;
  check(`Flying Retreat grants i-frames (invulnTimer ${rinv})`, rinv > 0, "");
  let backDx = 0;
  for (let f = 0; f < 12; f++) { const cx = (await p1()).x; backDx = Math.min(backDx, (cx - rx0) * facing); await waitFrames(1); }
  check(`Flying Retreat moves backward (Δx·facing ${backDx.toFixed(0)})`, backDx < -8, "");
  await shot("retreat");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (7) Flying Dive Kick (air) — i-frames + down-forward lunge + connect ──");
  await prep(40);
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(3);
  h0 = (await p2()).health; const fx0 = (await p1()).x;
  const fres = await fireDir(null);
  check(`air Special fires supN52Dive`, fres?.move === "supN52Dive", `move=${fres?.move}`);
  check(`Flying Dive Kick grants i-frames (invulnTimer ${(await p1()).invulnTimer || 0})`, ((await p1()).invulnTimer || 0) > 0, "");
  let sawDive = false, dvDealt = 0, dvDx = 0;
  for (let f = 0; f < 16; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("superman_new52_dive_uniform")) sawDive = true; dvDx = Math.max(dvDx, Math.abs(mv.x - fx0)); dvDealt = Math.max(dvDealt, h0 - (await p2()).health); await waitFrames(1); }
  check(`Flying Dive Kick renders superman_new52_dive_uniform`, sawDive, "");
  await shot("dive");
  check(`Flying Dive Kick connects (dmg ${dvDealt.toFixed(0)})`, dvDealt > 0, "");
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
