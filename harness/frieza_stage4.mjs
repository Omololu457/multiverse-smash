// harness/frieza_stage4.mjs
// STAGE 4 evidence: Frieza's directional/air SPECIALS.
// (1) WIRING — each special cast-pose action points at a real reslice'd sheet (no box).
// (2) DEATH BEAM (neutral) — fast thin PIERCING procedural beam projectile + connect.
// (3) KI BLAST (Fwd) — a rapid VOLLEY of crystal-sprite shots (multiple projectiles) + connect.
// (4) DEATH BALL (Down) — a big slow procedural sphere projectile + connect.
// (5) PSYCHO TELEPORT (Back) — i-frame blitz dash-strike (invulnTimer + forward lunge + connect).
// (6) AIR neutral Special → Ki Blast (air).
// All projectile/melee damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Screenshots → harness/shots/frieza_stage4_*.png.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `frieza_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function seeProj(nameFrag, maxF = 20) { let seen = 0, maxW = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase())); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || p.width || 0)); } await waitFrames(1); } return { seen, maxW }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=frieza`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("frieza").animationData);

  console.log("\n── (1) wiring: special cast-pose actions → real frieza_ sheets (no box) ──");
  for (const [k, tag] of [
    ["friezaDeathbeam", "frieza_deathbeam_uniform"], ["friezaKiblast", "frieza_kiblast_uniform"],
    ["friezaDeathball", "frieza_deathball_uniform"], ["friezaTeleport", "frieza_dash_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) Death Beam (neutral) — cast + piercing beam projectile + connect ──");
  await prep(150);
  let h0 = (await p2()).health;
  const bres = await fireDir(null);
  check(`Death Beam casts friezaDeathbeam`, bres?.cast === "friezaDeathbeam", `cast=${bres?.cast}`);
  const beam = await seeProj("friezaDeathBeam", 18);
  check(`Death Beam spawns a beam projectile`, beam.seen >= 1, `seen=${beam.seen}`);
  await shot("deathbeam");
  await waitFrames(20);
  check(`Death Beam connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Ki Blast (Fwd) — crystal-sprite VOLLEY (multiple shots) + connect ──");
  await prep(240);   // far enough that the 3 staggered shots are all in flight together (don't despawn serially)
  h0 = (await p2()).health;
  const kres = await fireDir("F");
  check(`Ki Blast casts friezaKiblast`, kres?.cast === "friezaKiblast", `cast=${kres?.cast}`);
  const ki = await seeProj("friezaKiBlast", 26);
  check(`Ki Blast fires a multi-shot volley (${ki.seen} concurrent)`, ki.seen >= 2, `seen=${ki.seen}`);
  await shot("kiblast");
  await waitFrames(18);
  check(`Ki Blast connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Death Ball (Down) — big slow sphere projectile + connect ──");
  await prep(120);
  h0 = (await p2()).health;
  const dres = await fireDir("D");
  check(`Death Ball casts friezaDeathball`, dres?.cast === "friezaDeathball", `cast=${dres?.cast}`);
  const db = await seeProj("friezaDeathBall", 26);
  check(`Death Ball spawns a large sphere (w=${db.maxW})`, db.seen >= 1 && db.maxW >= 70, `seen=${db.seen} w=${db.maxW}`);
  await shot("deathball");
  await waitFrames(24);
  check(`Death Ball connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Psycho Teleport (Back) — i-frames + forward lunge + connect ──");
  await prep(84);
  h0 = (await p2()).health; const tx0 = (await p1()).x;
  const tres = await fireDir("B");
  check(`Psycho Teleport fires friezaTeleport`, tres?.move === "friezaTeleport", `move=${tres?.move}`);
  const inv = (await p1()).invulnTimer || 0;
  check(`Psycho Teleport grants i-frames (invulnTimer ${inv})`, inv > 0, `invulnTimer=${inv}`);
  await waitFrames(10);
  const tx1 = (await p1()).x;
  check(`Psycho Teleport lunges forward (Δx ${(tx1 - tx0).toFixed(0)})`, Math.abs(tx1 - tx0) > 8, `x ${tx0.toFixed(0)}→${tx1.toFixed(0)}`);
  await shot("teleport");
  await waitFrames(14);
  check(`Psycho Teleport connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) AIR neutral Special → Ki Blast (air) ──");
  await prep(120);
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  const ares = await fireDir(null);
  check(`air Special casts friezaKiblast`, ares?.cast === "friezaKiblast", `cast=${ares?.cast}`);
  const airki = await seeProj("friezaKiBlast", 16);
  check(`air Ki Blast spawns projectiles`, airki.seen >= 1, `seen=${airki.seen}`);
  await shot("air_kiblast");
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
