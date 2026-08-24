// harness/iron_man_2_stage5.mjs — STAGE 5: Iron Man 2's ULTIMATE "Max-Charge Repulsor" (executeIronMan2Ultimate).
// Owner-locked E* max-charge promotion. INLINE freeze-cinematic on the LIVE fighter (no duplicate): the fighter
// holds the repulsor aim pose while the foe is frozen and a GIANT cyan beam fires. Asserts: (1) casts + spends
// 100 meter, (2) cast pose = ironMan2Repulsor → iron_man_2_repulsor_uniform (no box), (3) a GIANT
// ironMan2MaxRepulsor visual spawns, (4) GUARANTEED scaled damage (~198 EFF from 330 raw) even OUT of melee
// range (sure-hit), (5) foe frozen mid-cinematic, (6) data contract (ultimate name/cost). No bespoke ult art (flag).
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `iron_man_2_s5_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.3, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `iron_man_2_s5_${name}_crop.png`), clip });
}
async function waitSheet(sheet, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man_2`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());   // boot() fills p1.energy to max
  await waitFrames(5);
  await waitGrounded();

  // Position the dummy OUT of melee range → proves the ult is a guaranteed sure-hit (range-independent).
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 150); await waitFrames(2);

  console.log("\n── ULTIMATE: Max-Charge Repulsor ──");
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  const en1 = (await p1()).energy;   // capture immediately — before passive regen ticks during the sprite poll
  check("ult casts", res?.cast === true, `cast=${res?.cast}`);
  check("cast pose = ironMan2Repulsor (aim-forward, promoted E* trigger)", res?.castMove === "ironMan2Repulsor", `castMove=${res?.castMove}`);
  check("spends ~100 meter", Math.round(en0 - en1) >= 98, `energy ${Math.round(en0)} → ${Math.round(en1)}`);

  const mv = await waitSheet("iron_man_2_repulsor_uniform");
  check("sprite → iron_man_2_repulsor_uniform (repulsor aim pose, no box)", (mv.spriteSheet || "").includes("iron_man_2_repulsor_uniform"), `sheet=${mv.spriteSheet}`);

  // the GIANT repulsor beam visual spawns at fireAt (~26f) — clip AT the beam so the crop shows the blast + fire pose
  let sawBeam = false;
  for (let f = 0; f < 32 && !sawBeam; f++) { await waitFrames(1); const pr = await projectiles(); sawBeam = pr.some(p => (p.name || "").includes("ironMan2MaxRepulsor")); }
  check("spawns the GIANT ironMan2MaxRepulsor beam visual", sawBeam, "");
  await waitFrames(2); await crop("ult");   // capture with the beam on-screen (past the windup)

  // freeze check mid-cinematic: the target should be held (hitstop)
  const oppMid = await p2();
  check("target frozen mid-cinematic (hitstop > 0)", (oppMid.hitstop || 0) > 0, `hitstop=${oppMid.hitstop}`);

  // let the 3 guaranteed beats resolve
  await waitFrames(52);
  const hp1 = (await p2()).health;
  const dealt = hp0 - hp1;
  check("guaranteed damage lands from out of melee range (sure-hit)", dealt > 0, `hp ${hp0} → ${hp1} (−${dealt.toFixed(0)})`);
  check("payoff in top-ult band (~198 EFF; 150–240)", dealt >= 150 && dealt <= 240, `dealt=${dealt.toFixed(0)}`);

  console.log("\n── data contract ──");
  const def = await page.evaluate(() => window.__harness.charDef("iron_man_2"));
  check("ultimate = 'Max-Charge Repulsor', cost 100", def?.ultimate?.name === "Max-Charge Repulsor" && def?.ultimate?.cost === 100, `ult=${JSON.stringify(def?.ultimate)}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Iron Man 2 Stage 5: ${PASS} passed, ${FAIL} failed — shot in harness/shots/iron_man_2_s5_ult_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
