// harness/vegeta_dark_stage4.mjs
// STAGE 4 evidence: Dark Vegeta's directional/air SPECIALS (fixed-slot; mirrors executeVilgaxSpecial).
// (1) WIRING — the cast-pose actions point at real reslice'd sheets (no 128² box).
// (2) KI BLAST (neutral, base) — procedural WHITE energy sphere + connect.
// (2b) KI BLAST AMPLIFIED (dark-aura form) — bigger (w≥70), piercing, purple, HARDER than base. THE item-2
//      "same attack, amplified" pair. Aura toggled via test hook (Stage 5 sets _darkAuraActive for real).
// (3) KNIFE SLASH (Fwd) — melee disjoint: renders vegeta_dark_knife + connect.
// (4) SICKLE THROW (Back) — procedural red crescent projectile + connect.
// (5) AIR KI BLAST (air) — ki sphere fired airborne + connect.
// All damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Shots → harness/shots/vegeta_dark_stage4_*.png.
// ★P2 = goku so a mirrored neutral-special can't confound reads.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `vegeta_dark_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const setAura = (on) => page.evaluate(v => window.__harness.vegetaDarkSetAura(v), on);
const energy = async () => (await p1()).energy;
async function seeProj(nameFrag, maxF = 22) { let seen = 0, maxW = 0, sheet = null; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase()) && !(p.name || "").includes("_impact")); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || 0)); if (hit[0].sheet) sheet = hit[0].sheet; } await waitFrames(1); } return { seen, maxW, sheet }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegeta_dark&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("vegeta_dark").animationData);

  console.log("\n── (1) wiring: special cast actions → real vegeta_dark_ sheets (no box) ──");
  check(`vdKiCast → vegeta_dark_kicast_uniform`, (ad.vdKiCast?.sheet || "").includes("vegeta_dark_kicast_uniform"), `sheet=${ad.vdKiCast?.sheet}`);
  check(`vdKnife → vegeta_dark_knife_uniform`, (ad.vdKnife?.sheet || "").includes("vegeta_dark_knife_uniform"), `sheet=${ad.vdKnife?.sheet}`);
  check(`vdSickle → vegeta_dark_sickle_uniform`, (ad.vdSickle?.sheet || "").includes("vegeta_dark_sickle_uniform"), `sheet=${ad.vdSickle?.sheet}`);

  console.log("\n── (2) Ki Blast (neutral, BASE white) — cast + procedural sphere + connect ──");
  await setAura(false);
  await prep(150);
  let e0 = await energy(); let h0 = (await p2()).health;
  const bres = await fireDir(null);
  check(`base ki blast casts vdKiCast`, bres?.cast === "vdKiCast", `cast=${bres?.cast}`);
  const baseBlast = await seeProj("vdKiBlast", 22);
  check(`base ki blast spawns a projectile`, baseBlast.seen >= 1, `seen=${baseBlast.seen}`);
  check(`base ki blast is procedural (no sheet)`, !baseBlast.sheet, `sheet=${baseBlast.sheet}`);
  const eBase = e0 - (await energy());
  await shot("kiblast_white");
  await waitFrames(24);
  const dBase = h0 - (await p2()).health;
  check(`base ki blast connects (dmg ${dBase.toFixed(0)})`, dBase > 0, "");
  const wBase = baseBlast.maxW;
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (2b) Ki Blast AMPLIFIED (dark-aura form) — bigger, piercing, HARDER than base ──");
  await setAura(true);
  await prep(150);
  e0 = await energy(); h0 = (await p2()).health;
  const ares = await fireDir(null);
  check(`amplified ki blast casts vdKiCast`, ares?.cast === "vdKiCast", `cast=${ares?.cast}`);
  const ampBlast = await seeProj("vdKiBlastAmped", 22);
  check(`amplified ki blast spawns a LARGE burst (w=${ampBlast.maxW})`, ampBlast.seen >= 1 && ampBlast.maxW >= 70, `seen=${ampBlast.seen} w=${ampBlast.maxW}`);
  check(`amplified is bigger than base (${ampBlast.maxW} > ${wBase})`, ampBlast.maxW > wBase, `amp=${ampBlast.maxW} base=${wBase}`);
  const eAmp = e0 - (await energy());
  check(`amplified costs more energy than base (${eAmp} > ${eBase})`, eAmp > eBase, `base=${eBase} amp=${eAmp}`);
  await shot("kiblast_purple");
  await waitFrames(24);
  const dAmp = h0 - (await p2()).health;
  check(`amplified connects HARDER than base (${dAmp.toFixed(0)} > ${dBase.toFixed(0)})`, dAmp > dBase, "");
  await setAura(false);
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Knife Slash (Fwd) — melee disjoint: renders sprite + connect ──");
  await prep(90);
  h0 = (await p2()).health;
  const sres = await fireDir("F");
  check(`Knife Slash fires vdKnife`, sres?.move === "vdKnife" || sres?.cast === "vdKnife", `move=${sres?.move} cast=${sres?.cast}`);
  let sawKnife = false; for (let f = 0; f < 12; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("vegeta_dark_knife_uniform")) sawKnife = true; await waitFrames(1); }
  check(`Knife Slash renders vegeta_dark_knife_uniform`, sawKnife, "");
  await shot("knife");
  await waitFrames(6);
  check(`Knife Slash connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Sickle Throw (Back) — procedural red crescent projectile + connect ──");
  await prep(150);
  h0 = (await p2()).health;
  const tres = await fireDir("B");
  check(`Sickle Throw casts vdSickle`, tres?.cast === "vdSickle", `cast=${tres?.cast}`);
  const sickle = await seeProj("vdSickle", 24);
  check(`Sickle Throw spawns a projectile`, sickle.seen >= 1, `seen=${sickle.seen}`);
  await shot("sickle");
  await waitFrames(20);
  check(`Sickle Throw connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Air Ki Blast (air) — ki sphere fired airborne + connect ──");
  await prep(120);
  h0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1?.(46));
  await waitFrames(1);
  const airres = await fireDir("air");
  check(`Air Ki Blast casts vdKiCast`, airres?.cast === "vdKiCast", `cast=${airres?.cast}`);
  const airBlast = await seeProj("vdKiBlast", 22);
  check(`Air Ki Blast spawns a projectile`, airBlast.seen >= 1, `seen=${airBlast.seen}`);
  await shot("air_kiblast");
  await waitFrames(20);
  check(`Air Ki Blast connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
