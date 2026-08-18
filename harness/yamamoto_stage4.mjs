// harness/yamamoto_stage4.mjs — STAGE 4: Yamamoto's 5 Ryūjin Jakka specials (direction-branched).
//   neutral = Ground-Sweep Beam (REAL fire projectile — spawns + connects at range)
//   Fwd     = Large Ground-Stab (flagship 90px flame crescent)   Down = Ground Eruption Stab (launcher)
//   Up      = Overhead Slam                                       Back = Horizontal Thrust (long active)
// Each: fires (currentMove / _spriteCastMove), renders its real sheet, connects on the dummy. Data contract.
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
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `yamamoto_s4_${name}.png`) }); return; }
  const padX = 160, padTop = r.h * 1.2, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `yamamoto_s4_${name}_crop.png`), clip });
}
async function setup(gap = 60) {
  await waitGrounded();
  await page.evaluate(() => window.__harness.fillEnergy?.());
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(1);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=yamamoto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── neutral — Ground-Sweep Beam (projectile) ──
  console.log("\n── neutral: Ground-Sweep Beam (fire projectile) ──");
  await setup(180);   // wide gap so the BEAM (not a melee hitbox) is what connects
  {
    const hp0 = (await p2()).health;
    const res = await fireDir(null);
    check("beam: casts (yamamotoBeam)", res.cast === "yamamotoBeam" || res.move === "yamamotoBeam", `move=${res.move} cast=${res.cast}`);
    await waitFrames(3); const mv = await p1();
    check("beam: cast sprite → yamamoto_beam_cast_uniform", (mv.spriteSheet || "").includes("yamamoto_beam_cast_uniform"), `sheet=${mv.spriteSheet}`);
    let sawBeam = false;
    for (let f = 0; f < 30 && !sawBeam; f++) { await waitFrames(1); sawBeam = (await projs()).some(p => (p.name || "").toLowerCase().includes("yamamotobeam")); if (sawBeam) await crop("beam"); }
    check("beam: spawns a real travelling projectile", sawBeam, "");
    await page.waitForFunction(h0 => window.__harness.p2().health < h0, hp0, { timeout: 4000, polling: 16 }).catch(() => {});
    const hp1 = (await p2()).health;
    check("beam: connects at RANGE (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})  gap=180`);
  }
  await waitGrounded(); await waitFrames(6);

  // ── melee specials: Fwd/Down/Up/Back ──
  const melee = [
    ["F", "yamamotoStab",     "yamamoto_stab_uniform",     "Fwd — Large Ground-Stab (FLAGSHIP)", 60],
    ["D", "yamamotoEruption", "yamamoto_eruption_uniform", "Down — Ground Eruption Stab (launcher)", 56],
    ["U", "yamamotoOverhead", "yamamoto_overhead_uniform", "Up — Overhead Slam", 56],
    ["B", "yamamotoThrust",   "yamamoto_thrust_uniform",   "Back — Horizontal Thrust (long active)", 96],
  ];
  for (const [dir, move, sheet, label, gap] of melee) {
    console.log(`\n── ${label} ──`);
    await setup(gap);
    const hp0 = (await p2()).health;
    const before = await p2();
    const res = await fireDir(dir);
    check(`${move}: fires (currentMove)`, res.move === move, `move=${res.move}`);
    await waitFrames(3); const mv = await p1();
    check(`${move}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
    await crop(move);
    let launched = false;
    for (let f = 0; f < 26; f++) { await waitFrames(1); const t = await p2(); if (t.vy < -1) launched = true; }
    const hp1 = (await p2()).health;
    check(`${move}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    if (move === "yamamotoEruption") check("yamamotoEruption: LAUNCHES the opponent (vy<0)", launched, `launched=${launched}`);
    await waitGrounded(); await waitFrames(4);
  }

  // ── data contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("yamamoto")?.animationData || {});
  const keys = ["yamamotoBeam", "yamamotoStab", "yamamotoEruption", "yamamotoOverhead", "yamamotoThrust"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("yamamoto"));
  check("all 5 specials wired to real yamamoto sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Yamamoto Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/yamamoto_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
