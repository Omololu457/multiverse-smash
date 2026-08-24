// harness/superman_fighter_stage4.mjs
// STAGE 4 evidence: Superman (Fighter) directional/air SPECIALS — ALL REAL baked-FX long-DISJOINT melee.
// (1) WIRING — each special action → a real superman_fighter_ sheet (no box).
// (2) neutral=Heat Vision beam / Fwd=X red blast / U=Frost Breath / Down=Ice Beam / air=Aerial Ice each FIRE
//     their move, render their sprite, and CONNECT (all via GLOBAL_DAMAGE_SCALE ×0.60).
// (3) Back=Flying Retreat grants i-frames + repositions backward.
// Screenshots → harness/shots/superman_fighter_stage4_*.png.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `superman_fighter_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman_fighter`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("superman_fighter").animationData);

  console.log("\n── (1) wiring: special actions → real superman_fighter_ sheets ──");
  for (const [k, tag] of [["supFtrHeat","superman_fighter_heatvision_uniform"],["supFtrX","superman_fighter_xblast_uniform"],["supFtrFrost","superman_fighter_frost_uniform"],["supFtrIce","superman_fighter_ice_uniform"],["supFtrAerIce","superman_fighter_aerice_uniform"]])
    check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  const disjoint = async (name, dir, move, tag, gap) => {
    await prep(gap);
    const h0 = (await p2()).health;
    const r = await fireDir(dir);
    let saw = false, dealt = 0;
    for (let f = 0; f < 16; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes(tag)) saw = true; dealt = Math.max(dealt, h0 - (await p2()).health); await waitFrames(1); }
    await shot(name);
    check(`${name}: fires ${move} + renders + connects (dmg ${dealt.toFixed(0)})`, r?.move === move && saw && dealt > 0, `move=${r?.move} saw=${saw} dmg=${dealt.toFixed(0)}`);
    await waitGrounded();
  };

  console.log("\n── (2) directional disjoint specials fire + connect ──");
  await disjoint("heatvision", null, "supFtrHeat",  "superman_fighter_heatvision_uniform", 140);
  await disjoint("xblast",     "F",  "supFtrX",     "superman_fighter_xblast_uniform",     130);
  await disjoint("frost",      "U",  "supFtrFrost", "superman_fighter_frost_uniform",       70);
  await disjoint("ice",        "D",  "supFtrIce",   "superman_fighter_ice_uniform",        150);

  console.log("\n── (2b) Aerial Ice (air) fires + connects ──");
  await prep(40); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(1);
  { const h0=(await p2()).health; const r=await fireDir(null); let saw=false,dealt=0; for(let f=0;f<16;f++){const mv=await p1(); if((mv.spriteSheet||"").includes("superman_fighter_aerice_uniform")) saw=true; dealt=Math.max(dealt,h0-(await p2()).health); await waitFrames(1);} await shot("aerice");
    check(`Aerial Ice fires supFtrAerIce + renders + connects (dmg ${dealt.toFixed(0)})`, r?.move==="supFtrAerIce" && saw && dealt>0, `move=${r?.move} saw=${saw} dmg=${dealt.toFixed(0)}`); }
  await waitGrounded();

  console.log("\n── (3) Flying Retreat (Back) — i-frames + backward reposition ──");
  await prep(60); const rx0 = (await p1()).x; const facing = (await p1()).facing || 1;
  await fireDir("B");
  check(`Flying Retreat grants i-frames (invulnTimer ${(await p1()).invulnTimer || 0})`, ((await p1()).invulnTimer || 0) > 0, "");
  let backDx = 0; for (let f = 0; f < 12; f++) { backDx = Math.min(backDx, ((await p1()).x - rx0) * facing); await waitFrames(1); }
  check(`Flying Retreat moves backward (Δx·facing ${backDx.toFixed(0)})`, backDx < -8, "");
  await shot("retreat");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("HARNESS ERROR", e); fail++; }
finally { console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0); }
