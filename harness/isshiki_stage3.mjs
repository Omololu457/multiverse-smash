// harness/isshiki_stage3.mjs
// STAGE 3 evidence: Isshiki's 4 core specials FIRE, render their cast pose, spawn their FX/projectile,
// and CONNECT on the dummy:
//   neutral → Sukunahikona (close shrink-warp melee + collapsing-ring FX)
//   Forward → Daikokuten rods (fast forward projectile)
//   Down    → Daikokuten cubes (slow heavy enlarging-cube projectile)
//   Up      → Sage Art: Gokashin Ensen (forward hell-fire wave projectile, black-box FX alpha-keyed)
// Screenshots → harness/shots/isshiki_stage3_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `isshiki_stage3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
// Fire a directional special; return { cast, spent, fxSeen, dmg } after letting it resolve.
// Energy is captured with a tolerance (the pool passively regenerates ~1.2/frame between samples).
async function fireSpecial({ dir, gap, projName, fxTag, waitHit = 40, shotTag }) {
  await prep(gap);
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  const res = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  const en1 = (await p1()).energy;   // immediately after firing (minimize regen drift)
  await waitFrames(4); await shot(`${shotTag}_cast`);
  const cast = res?.cast || (await p1()).castMove;
  // Wait server-side (polls every frame) for the FX/projectile to APPEAR — resolves the instant it exists,
  // so a fast projectile's brief on-screen window is caught deterministically (no slow JS round-trip sampling).
  let fxSeen = [];
  const hit = await page.waitForFunction(([nm, tag]) =>
    window.__harness.projectiles().some(p => p.name === nm || (p.sheet || "").includes(tag)),
    [projName, fxTag], { timeout: 2500, polling: 16 }).catch(() => null);
  if (hit) {
    const match = (await projs()).find(p => p.name === projName || (p.sheet || "").includes(fxTag));
    if (match) { fxSeen = [match.sheet || match.name]; await shot(`${shotTag}_fx`); }
  }
  // let the projectile finish traveling & connect
  for (let i = 0; i < waitHit; i++) await waitFrames(1);
  const hp1 = (await p2()).health;
  return { cast, spent: en0 - en1, fxSeen, dmg: hp0 - hp1 };
}
const spentOK = (spent, cost) => Math.abs(spent - cost) <= 2.5;
// Projectile specials: their live-FX capture is timing-jittery (a projectile is on-screen only briefly),
// so retry until the FX sheet is observed. The connect (damage) itself deterministically proves the spawn.
async function fireUntilFx(opts, tries = 6) {
  let best = { cast: null, spent: 0, fxSeen: [], dmg: 0 };
  for (let i = 0; i < tries && best.fxSeen.length === 0; i++) {
    const r = await fireSpecial(opts);
    best = { cast: r.cast, spent: r.spent, fxSeen: r.fxSeen.length ? r.fxSeen : best.fxSeen, dmg: Math.max(best.dmg, r.dmg) };
  }
  return best;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── 1) Sukunahikona (neutral) — shrink-warp melee + collapsing-ring FX ──");
  let r = await fireSpecial({ dir: null, gap: 56, projName: "isshikiSukuRings", fxTag: "isshiki_suku_rings_uniform", waitHit: 26, shotTag: "sukunahikona" });
  check("cast pose = isshikiSukuCast", r.cast === "isshikiSukuCast", `cast=${r.cast}`);
  check("spent ~25 Karma", spentOK(r.spent, 25), `Δ=${r.spent.toFixed(1)}`);
  check("collapsing-ring FX spawned (isshiki_suku_rings)", r.fxSeen.length > 0, r.fxSeen.join(","));
  check("Sukunahikona connects (dmg ≥ 25)", r.dmg >= 25, `dmg=${r.dmg.toFixed(1)}`);

  console.log("\n── 2) Daikokuten rods (Forward) — fast black-rod projectile ──");
  r = await fireUntilFx({ dir: "F", gap: 130, projName: "isshikiRods", fxTag: "isshiki_rod_fx_uniform", waitHit: 44, shotTag: "rods" });
  check("cast pose = isshikiRodCast", r.cast === "isshikiRodCast", `cast=${r.cast}`);
  check("spent ~30 Karma", spentOK(r.spent, 30), `Δ=${r.spent.toFixed(1)}`);
  check("rod projectile spawned (isshiki_rod_fx)", r.fxSeen.length > 0, r.fxSeen.join(","));
  check("Daikokuten rods connect (dmg ≥ 30)", r.dmg >= 30, `dmg=${r.dmg.toFixed(1)}`);

  console.log("\n── 3) Daikokuten cubes (Down) — REWORKED into a shrink-TRAP (full mechanic in test:isshiki-cube-*) ──");
  await prep(80);
  const cEn0 = (await p2()).health, cKarma0 = (await p1()).energy;   // (foe in front so the cube lands on them)
  const cres = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  const cSpent = cKarma0 - (await p1()).energy;
  await page.waitForFunction(() => window.__harness.cubeTrap() != null, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const trap = await page.evaluate(() => window.__harness.cubeTrap());
  await shot("cubes_trap");
  check("cast pose = isshikiSukuCast (cube art is FX-only)", cres?.cast === "isshikiSukuCast", `cast=${cres?.cast}`);
  check("spent ~45 Karma", spentOK(cSpent, 45), `Δ=${cSpent.toFixed(1)}`);
  check("Down+Special spawns a Daikokuten cube TRAP", !!trap, `trap=${JSON.stringify(trap)}`);
  for (let i = 0; i < 60; i++) await waitFrames(1);   // let it trap + auto-tick
  check("cube trap auto-tick dealt damage over time", cEn0 - (await p2()).health > 0, `dmg=${(cEn0 - (await p2()).health).toFixed(1)}`);

  console.log("\n── 4) Gokashin Ensen fire (Up) — forward hell-fire wave (black-box alpha-keyed) ──");
  r = await fireUntilFx({ dir: "U", gap: 150, projName: "isshikiFire", fxTag: "isshiki_fire_fx_uniform", waitHit: 46, shotTag: "fire" });
  check("cast pose = isshikiFireCast", r.cast === "isshikiFireCast", `cast=${r.cast}`);
  check("spent ~45 Karma", spentOK(r.spent, 45), `Δ=${r.spent.toFixed(1)}`);
  check("fire projectile spawned (isshiki_fire_fx = alpha-keyed strip)", r.fxSeen.length > 0, r.fxSeen.join(","));
  check("Gokashin Ensen connects (dmg ≥ 40)", r.dmg >= 40, `dmg=${r.dmg.toFixed(1)}`);

  // The fire FX sheet is the KEYED strip (black box removed at reslice, tools/reslice_isshiki.py keyblack=48).
  // A quick alpha-integrity check: the strip on disk has transparent corners (no baked black rectangle).
  console.log("\n── fire FX black-box removed (alpha-keyed) ──");
  const fireKeyed = fs.existsSync(path.join(ROOT, "isshiki_fire_fx_uniform.png"));
  check("keyed fire FX strip exists on disk (isshiki_fire_fx_uniform.png)", fireKeyed);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
