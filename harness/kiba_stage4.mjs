// harness/kiba_stage4.mjs — STAGE 4: Kiba's Beast-Fusion (Four Legs → Two-Headed Wolf).
// Uses the deterministic __harness.p1SpecialDir(dir):
//   Down Special → Four Legs (Shikyaku no Jutsu) = timed SELF-BUFF transform (offense + speed up)
//   Up   Special → Two-Headed Wolf = committed horizontal twin-drill rush (bigger than Strong Gatsuga)
// Four Legs: plays the kiba_fourlegs_uniform transform cast, spends ~28 energy, sets fourLegsActive +
// damageMult 1.25, and PROVES the buff by landing a light that hits HARDER than the un-buffed baseline;
// then confirms the buff auto-reverts. Two-Headed Wolf: fires kibaTwoHeaded, renders its drill sheet,
// spends ~40, and connects for big damage. Plus a data-contract check.
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `kiba_s4_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.3, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `kiba_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 44) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
// land a neutral light on the adjacent dummy, return the damage dealt
async function landLight() {
  await setupAdjacent(40);
  const hp0 = (await p2()).health;
  await page.keyboard.down("j");
  for (let f = 0; f < 12 && !((await p1()).spriteSheet || "").includes("kiba_light_uniform"); f++) await waitFrames(1);
  await page.keyboard.up("j"); await waitFrames(20);
  return Math.max(0, hp0 - (await p2()).health);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=kiba`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── baseline light damage (un-buffed) ──
  console.log("\n── Four Legs (Down Special) — timed transform buff ──");
  const dmgBase = await landLight();
  await waitReady();

  // ── FOUR LEGS transform ──
  await setupAdjacent(60);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  const e0 = (await p1()).energy;
  const res = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  await waitFrames(3);
  let mv = await p1();
  for (let f = 0; f < 16 && !((mv.spriteSheet || "").includes("kiba_fourlegs_uniform")); f++) { await waitFrames(1); mv = await p1(); }
  await crop("fourlegs");
  check("Down Special → Four Legs cast (kibaFourLegs)", res?.cast === "kibaFourLegs", `cast=${res?.cast}`);
  check("Four Legs → kiba_fourlegs_uniform sprite", (mv.spriteSheet || "").includes("kiba_fourlegs_uniform"), `sheet=${mv.spriteSheet}`);
  check("Four Legs sets fourLegsActive + damageMult 1.25", mv.fourLegsActive === true && Math.abs(mv.damageMult - 1.25) < 0.01, `active=${mv.fourLegsActive} mult=${mv.damageMult}`);
  check("Four Legs spends ~28 energy", (e0 - mv.energy) >= 24 && (e0 - mv.energy) <= 32, `spent=${(e0 - mv.energy).toFixed(0)}`);

  // wait out the transform cast, then land a light while BUFFED
  await waitReady(); await waitFrames(4);
  const dmgBuffed = await landLight();
  check("buffed light hits HARDER than baseline (~1.25×)", dmgBuffed > dmgBase, `base=${dmgBase.toFixed(0)} buffed=${dmgBuffed.toFixed(0)}`);

  // buff has a live countdown that ticks down (auto-reverts at 0)
  const midT = (await p1()).fourLegsTimer;
  check("Four Legs buff has an active countdown", midT > 0, `timer=${midT}`);
  await waitFrames(30);
  const laterT = (await p1()).fourLegsTimer;
  check("Four Legs timer ticks down", laterT < midT, `t0=${midT} → t1=${laterT}`);

  // ── TWO-HEADED WOLF (Up Special) ──
  console.log("\n── Two-Headed Wolf (Up Special) — twin-drill rush ──");
  await waitReady(); await waitFrames(4);
  await setupAdjacent(60);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  const e1 = (await p1()).energy, hp0 = (await p2()).health;
  const res2 = await page.evaluate(() => window.__harness.p1SpecialDir("U"));
  await waitFrames(3);
  let mv2 = await p1();
  for (let f = 0; f < 16 && !((mv2.spriteSheet || "").includes("kiba_twoheaded_uniform")); f++) { await waitFrames(1); mv2 = await p1(); }
  await crop("twoheaded");
  await waitFrames(24);
  const dmg2 = Math.max(0, hp0 - (await p2()).health);
  check("Up Special → currentMove kibaTwoHeaded", res2?.move === "kibaTwoHeaded", `move=${res2?.move}`);
  check("Two-Headed Wolf → kiba_twoheaded_uniform sprite", (mv2.spriteSheet || "").includes("kiba_twoheaded_uniform"), `sheet=${mv2.spriteSheet}`);
  check("Two-Headed Wolf spends ~40 energy", (e1 - mv2.energy) >= 34 && (e1 - mv2.energy) <= 46, `spent=${(e1 - mv2.energy).toFixed(0)}`);
  check("Two-Headed Wolf connects (dmg)", dmg2 > 0, `dmg=${dmg2.toFixed(0)}`);

  // ── data-level contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("kiba")?.animationData || {});
  const keys = ["kibaFourLegs", "kibaTwoHeaded"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("kiba"));
  check("Four Legs + Two-Headed Wolf wired to real kiba sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kiba Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/kiba_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
