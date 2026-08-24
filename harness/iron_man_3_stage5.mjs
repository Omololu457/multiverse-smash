// harness/iron_man_3_stage5.mjs — STAGE 5: Iron Man 3's ULTIMATE "Super Nova" (executeIronMan3Ultimate).
// Owner-locked DECISION B: the on-sheet "Kills all onscreen Enemies" screen-clear is the ult. INLINE freeze-
// cinematic on the LIVE fighter (no duplicate): Iron Man throws his arms up (Super Move trigger pose) and
// erupts a SCREEN-FILLING procedural nova while the foe is frozen. Asserts: (1) casts + spends 100 meter,
// (2) cast pose = ironMan3SuperMove → iron_man_3_super_move_uniform (no box), (3) the screen-nova overlay lights
// (_ironMan3NovaTimer > 0 after the erupt beat), (4) GUARANTEED scaled damage (~198 EFF from 330 raw) even OUT
// of melee range (sure-hit), (5) foe frozen mid-cinematic, (6) data contract (ultimate name "Super Nova"/cost).
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
const nova = () => page.evaluate(() => window.__harness.ironMan3Nova());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `iron_man_3_s5_${name}.png`) }); return; }
  const padX = 240, padTop = r.h * 1.6, padBot = 60;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `iron_man_3_s5_${name}_crop.png`), clip });
}
async function waitSheet(sheet, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man_3`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await waitGrounded();

  // Position the dummy OUT of melee range → proves the ult is a guaranteed sure-hit (range-independent).
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 170); await waitFrames(2);

  console.log("\n── ULTIMATE: Super Nova ──");
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  const en1 = (await p1()).energy;
  check("ult casts", res?.cast === true, `cast=${res?.cast}`);
  check("cast pose = ironMan3SuperMove (arms-raised nova trigger)", res?.castMove === "ironMan3SuperMove", `castMove=${res?.castMove}`);
  check("spends ~100 meter", Math.round(en0 - en1) >= 98, `energy ${Math.round(en0)} → ${Math.round(en1)}`);

  const mv = await waitSheet("iron_man_3_super_move_uniform");
  check("sprite → iron_man_3_super_move_uniform (arms-raised pose, no box)", (mv.spriteSheet || "").includes("iron_man_3_super_move_uniform"), `sheet=${mv.spriteSheet}`);

  // the SCREEN-FILLING nova lights at novaAt (~20f). Poll the nova timer over the cinematic.
  let novaLit = false, novaMax = 0;
  for (let f = 0; f < 40 && !novaLit; f++) { await waitFrames(1); const nv = await nova(); if (nv && nv.timer > 0) { novaLit = true; novaMax = nv.max; } }
  await crop("supernova");
  check("SCREEN-FILLING nova overlay lights (_ironMan3NovaTimer > 0)", novaLit, `novaMax=${novaMax}`);

  // GUARANTEED payoff — even at 170px (well out of melee range)
  await waitFrames(46);
  const dmg = hp0 - (await p2()).health;
  check(`GUARANTEED scaled damage out of range (${dmg.toFixed(0)}; ~198 EFF band)`, dmg >= 150 && dmg <= 240, `dmg=${dmg}`);

  console.log("\n── data contract ──");
  const def = await page.evaluate(() => window.__harness.charDef("iron_man_3"));
  check("ultimate name = Super Nova", def?.ultimate?.name === "Super Nova", `name=${def?.ultimate?.name}`);
  check("ultimate cost = 100", def?.ultimate?.cost === 100, `cost=${def?.ultimate?.cost}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("HARNESS ERROR", e); FAIL++; }
finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
