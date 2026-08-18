// harness/boruto_stage3.mjs — STAGE 3: Boruto's directional ninjutsu specials + authored FX.
// GROUND (via __harness.p1SpecialDir): neutral=Rasengan(orb projectile) / F=Lightning Shiden(melee arc
// thrust) / B=Wind-Water Cast(projectile) / U=Palm Blast(projectile) / D=Shadow Clone(assist hit + smoke).
// AIR (liftP1 then p1SpecialDir): neutral=Rasengan air / F=Throw Weapon(kunai) / B=Vanishing Rasengan.
// Each: correct cast/move key, its projectile/hit spawns, and (ground) it CONNECTS on the dummy.
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
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `boruto_s3_${name}.png`) }); return; }
  const padX = 220, padTop = r.h * 1.2, padBot = 40;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2.4), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `boruto_s3_${name}_crop.png`), clip });
}
async function setup(gap = 70) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.38);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.clearProjectiles?.(); }, a.x + gap); await waitFrames(1);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function connects(hp0, frames = 34) { for (let i = 0; i < frames; i++) { if ((await p2()).health < hp0) return true; await waitFrames(1); } return false; }
async function sawProj(name, frames = 26) { for (let i = 0; i < frames; i++) { if ((await projNames()).some(n => (n || "").includes(name))) return true; await waitFrames(1); } return false; }
// Robust evidence that a projectile fired: it either shows up in the active list OR it already connected
// (fast orb specials spawn-and-despawn on contact within 1-2 frames, too quick for a per-frame snapshot).
async function projOrHit(name, hp0, frames = 34) { for (let i = 0; i < frames; i++) { if ((await projNames()).some(n => (n || "").includes(name))) return true; if ((await p2()).health < hp0) return true; await waitFrames(1); } return false; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=boruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND neutral: Rasengan (orb projectile) ──
  console.log("\n── GROUND neutral: Rasengan (orb) ──");
  { await setup(60); const hp0 = (await p2()).health; const r = await fireDir(null);
    check("Rasengan cast pose = borutoRasengan", r?.cast === "borutoRasengan", `cast=${r?.cast}`);
    await crop("rasengan"); check("Rasengan orb fires (projectile/connect)", await projOrHit("borutoRasengan", hp0), `hp1=${(await p2()).health}`); }
  await waitFrames(6);

  // ── GROUND Fwd: Lightning Shiden (melee arc thrust) ──
  console.log("\n── GROUND Fwd: Lightning Shiden (arc FX melee thrust) ──");
  { await setup(56); const hp0 = (await p2()).health; const r = await fireDir("F");
    check("Shiden move = borutoShiden", r?.move === "borutoShiden", `move=${r?.move}`);
    await waitFrames(2); await crop("shiden");   // arc FX overlay visible mid-thrust
    check("Shiden connects (dmg)", await connects(hp0), `hp0=${hp0} hp1=${(await p2()).health}`); }
  await waitFrames(6);

  // ── GROUND Back: Wind/Water Cast (projectile) ──
  console.log("\n── GROUND Back: Wind/Water Cast (projectile) ──");
  { await setup(74); const hp0 = (await p2()).health; const r = await fireDir("B");
    check("Wind/Water cast pose = borutoWindWater", r?.cast === "borutoWindWater", `cast=${r?.cast}`);
    check("Wind/Water projectile fires", await projOrHit("windwater", hp0), "");
    await crop("windwater"); check("Wind/Water connects (dmg)", await connects(hp0), `hp0=${hp0} hp1=${(await p2()).health}`); }
  await waitFrames(6);

  // ── GROUND Up: Palm Blast (projectile) ──
  console.log("\n── GROUND Up: Palm Blast (projectile) ──");
  { await setup(70); const hp0 = (await p2()).health; const r = await fireDir("U");
    check("Palm Blast cast pose = borutoPalmBlast", r?.cast === "borutoPalmBlast", `cast=${r?.cast}`);
    check("Palm Blast projectile fires", await projOrHit("palmblast", hp0), "");
    await crop("palmblast"); check("Palm Blast connects (dmg)", await connects(hp0), `hp0=${hp0} hp1=${(await p2()).health}`); }
  await waitFrames(6);

  // ── GROUND Down: Shadow Clone (assist hit + smoke) ──
  console.log("\n── GROUND Down: Shadow Clone (assist hit + smoke puff) ──");
  { await setup(52); const hp0 = (await p2()).health; const r = await fireDir("D");
    check("Shadow Clone cast pose = borutoClone", r?.cast === "borutoClone", `cast=${r?.cast}`);
    check("Shadow Clone smoke puff spawns", await sawProj("borutoSmoke"), "");
    await crop("clone"); check("Shadow Clone assist connects (dmg)", await connects(hp0, 40), `hp0=${hp0} hp1=${(await p2()).health}`); }
  await waitFrames(6);

  // ── AIR neutral: Rasengan (air) ──
  console.log("\n── AIR neutral: Rasengan (air) ──");
  { await setup(46); const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(70)); const r = await fireDir(null);
    check("Rasengan (air) cast pose = borutoRasenganAir", r?.cast === "borutoRasenganAir", `cast=${r?.cast}`);
    check("Rasengan (air) orb fires (projectile/connect)", await projOrHit("borutoRasengan", hp0), ""); await crop("rasengan_air"); }
  await waitGrounded(); await waitFrames(6);

  // ── AIR Fwd: Throw Weapon (kunai) ──
  console.log("\n── AIR Fwd: Throw Weapon (kunai) ──");
  { await setup(80); await page.evaluate(() => window.__harness.liftP1(70)); const r = await fireDir("F");
    check("Throw Weapon cast pose = borutoThrowAir", r?.cast === "borutoThrowAir", `cast=${r?.cast}`);
    check("Throw Weapon kunai projectile spawns", await sawProj("boruto_throw"), ""); await crop("throw_air"); }
  await waitGrounded(); await waitFrames(6);

  // ── AIR Back: Vanishing Rasengan (faint orb) ──
  console.log("\n── AIR Back: Vanishing Rasengan (faint orb) ──");
  { await setup(50); const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(70)); const r = await fireDir("B");
    check("Vanishing Rasengan cast pose = borutoVanishing", r?.cast === "borutoVanishing", `cast=${r?.cast}`);
    check("Vanishing Rasengan orb fires (projectile/connect)", await projOrHit("borutoRasengan", hp0), ""); await crop("vanishing"); }
  await waitGrounded();

  // ── DATA-LEVEL contract: all 8 special cast poses wired to real boruto sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("boruto")?.animationData || {});
  const keys = ["borutoRasengan", "borutoRasenganAir", "borutoVanishing", "borutoShiden", "borutoWindWater", "borutoPalmBlast", "borutoClone", "borutoThrowAir"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("boruto"));
  check("all 8 special cast poses wired to real boruto sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Boruto Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/boruto_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
