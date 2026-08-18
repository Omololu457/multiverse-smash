// harness/l_ryuuzaki_stage5.mjs — STAGE 5: L "Ryuuzaki" — Ryuk cameo-attack (Up special).
//
// Ryuk is L's ONLY offensive summon (audit constraint: idle/laugh art only, no attack frames). Mechanics
// reuse Light's LIGHT_SUMMONS.ryuk VERBATIM in shape (cost 30, dmg 66, w62×h92, speed 3, ky -7, life 28,
// delay 10, launcher) but point at L's OWN Ryuk art (l_ryuuzaki_ryuk_uniform, NOT light_ryuk_uniform).
// We assert (Light Stage-4 / p1SpecialDir idiom):
//   Up → Ryuk : plays lRyuuzakiRyukCast, spawns l_ryuuzaki_ryuk_uniform projectile (real sheet, no box),
//               spends 30 Deduction, connects for damage, and LAUNCHES the dummy (vy < 0).
//   Regression: neutral Nova / Fwd Bazooka / Back Rising (launcher) / Down Analysis all still work
//               (binding Up must not break the other directions).
// Shots → harness/shots/l_ryuuzaki_s5_*.png.
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
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const setEnergy = (v) => page.evaluate((e) => window.__harness.setEnergy(e), v);
const castDir = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_s5_${tag}.png`) }); }
async function cropShot(tag) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await shot(tag); return; }
  const padX = 260, padTop = r.h * 1.4, padBot = 40;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_s5_${tag}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
// Fire a dir-special TWICE (Stage-4 idiom):
//   PASS A (dummy FAR) — the projectile lives its lifetime → catchable in projectiles() for sheet + cast.
//   PASS B (dummy ADJACENT) — the projectile connects → damage (+ launch vy) + energy spend.
async function fireDirSpecial(tag, dir, sheetSub, wantCast, { damageGap = 40, capture = false } = {}) {
  await setupAdjacent(560);
  await setEnergy(200); await waitFrames(2);
  const res = await castDir(dir);
  let seenSheet = false, seenCast = false, sheets = [], shotDone = false;
  for (let i = 0; i < 26; i++) {
    const ps = await projs();
    const cur = await p1();
    if (cur.castMove === wantCast) seenCast = true;
    const found = ps.filter(p => (p.sheet || "").includes(sheetSub));
    if (found.length) { seenSheet = true; sheets = ps.map(p => (p.sheet || "").split("/").pop()).filter(Boolean); if (!shotDone) { await cropShot(tag); shotDone = true; } }
    await waitFrames(1);
  }
  if (!shotDone) await cropShot(tag);
  await setupAdjacent(damageGap);
  await setEnergy(200); await waitFrames(2);
  const before = (await p1()).energy ?? 0;
  const hp0 = (await p2()).health;
  await castDir(dir);
  let dmg = 0, minVy = 0, hitShot = false;
  for (let i = 0; i < 22; i++) {
    const hpNow = (await p2()).health; const d = hp0 - hpNow; dmg = Math.max(dmg, d);
    const vy = (await p2()).vy; if (vy < minVy) minVy = vy;
    if (capture && d > 0 && !hitShot) { await cropShot(tag + "_hit"); hitShot = true; }
    await waitFrames(1);
  }
  const after = (await p1()).energy ?? 0;
  return { seenSheet, seenCast, spent: before - after, castRes: res, dmg, minVy, sheets: [...new Set(sheets)] };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=l_ryuuzaki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  const g = await p1();
  check("P1 is L (rosterKey l_ryuuzaki)", g.key === "l_ryuuzaki", `key=${g.key}`);

  // ── 1) RYUK cameo-attack (Up) — the Stage-5 move ──
  console.log("\n── Up → Ryuk cameo-attack (anti-air launcher) ──");
  {
    const r = await fireDirSpecial("ryuk_up", "U", "l_ryuuzaki_ryuk", "lRyuuzakiRyukCast", { damageGap: 30, capture: true });
    check("Ryuk: cast pose = lRyuuzakiRyukCast (L summon gesture)", r.seenCast, `cast=${r.castRes?.cast}`);
    check("Ryuk: spawns l_ryuuzaki_ryuk_uniform projectile (real sheet, no box, NOT Light's)", r.seenSheet && r.sheets.every(s => !s.includes("light_ryuk")), `sheets=[${r.sheets.join(", ")}]`);
    check("Ryuk: deals damage (connects)", r.dmg > 0, `dmg=${r.dmg}`);
    check("Ryuk: LAUNCHES the dummy (p2 vy < 0)", r.minVy < -0.5, `minVy=${r.minVy.toFixed(1)}`);
    // cost 30 nets ~27 spent after ~1 frame of passive Deduction regen (same offset every dir); assert the
    // 30-cost band, not an exact figure (regen makes exact-30 flaky, matching the other directions' checks).
    check("Ryuk: spends 30-cost Deduction band (>25, net of regen)", r.spent > 25 && r.spent <= 31, `spent=${r.spent.toFixed(1)}`);
  }

  // ── 2..5) The OTHER special directions must still work (binding Up didn't break them) ──
  console.log("\n── Regression: neutral Nova ──");
  {
    const r = await fireDirSpecial("nova_neutral", null, "l_ryuuzaki_nova", "lRyuuzakiNovaCast", { damageGap: 30 });
    check("Nova: spawns l_ryuuzaki_nova_uniform (real sheet)", r.seenSheet, `sheets=[${r.sheets.join(", ")}]`);
    check("Nova: deals damage", r.dmg > 0, `dmg=${r.dmg}`);
    check("Nova: spends Deduction energy", r.spent > 0, `spent=${r.spent}`);
  }
  console.log("\n── Regression: Forward Bazooka ──");
  {
    const r = await fireDirSpecial("bazooka_fwd", "F", "l_ryuuzaki_bazooka_proj", "lRyuuzakiBazookaCast", { damageGap: 90 });
    check("Bazooka: spawns l_ryuuzaki_bazooka_proj_uniform (real sheet)", r.seenSheet, `sheets=[${r.sheets.join(", ")}]`);
    check("Bazooka: deals damage (long-range)", r.dmg > 0, `dmg=${r.dmg}`);
    check("Bazooka: spends Deduction energy", r.spent > 0, `spent=${r.spent}`);
  }
  console.log("\n── Regression: Back Rising Burst (launcher) ──");
  {
    const r = await fireDirSpecial("rising_back", "B", "l_ryuuzaki_rising_proj", "lRyuuzakiRisingCast", { damageGap: 30 });
    check("Rising: spawns l_ryuuzaki_rising_proj_uniform (real sheet)", r.seenSheet, `sheets=[${r.sheets.join(", ")}]`);
    check("Rising: deals damage", r.dmg > 0, `dmg=${r.dmg}`);
    check("Rising: LAUNCHES the dummy (p2 vy < 0)", r.minVy < -0.5, `minVy=${r.minVy.toFixed(1)}`);
    check("Rising: spends Deduction energy", r.spent > 0, `spent=${r.spent}`);
  }
  console.log("\n── Regression: Down Investigation / Analysis (non-lethal buff) ──");
  {
    await setupAdjacent(60);
    await setEnergy(200); await waitFrames(2);
    const before = (await p1()).energy ?? 0;
    const hp0 = (await p2()).health;
    const res = await castDir("D");
    let castSeen = false, dmgMult = 1;
    for (let i = 0; i < 16; i++) {
      const cur = await p1();
      if (cur.castMove === "lRyuuzakiAnalysis") castSeen = true;
      dmgMult = Math.max(dmgMult, cur.dmgMult ?? cur.damageMult ?? 1);
      await waitFrames(1);
    }
    const hp1 = (await p2()).health;
    const after = (await p1()).energy ?? 0;
    check("Analysis: cast pose = lRyuuzakiAnalysis", castSeen, `cast=${res?.cast}`);
    check("Analysis: NON-LETHAL (deals NO damage)", (hp0 - hp1) === 0, `dmgDealt=${(hp0 - hp1)}`);
    check("Analysis: raises damageMultiplier (self-buff)", dmgMult > 1, `dmgMult=${dmgMult}`);
    check("Analysis: spends Deduction energy", (before - after) > 0, `spent=${before - after}`);
  }

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} L Ryuuzaki Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/l_ryuuzaki_s5_*`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
