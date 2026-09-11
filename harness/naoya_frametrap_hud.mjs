// harness/naoya_frametrap_hud.mjs — the Projection Sorcery "24-frame" HUD (redesign: now the PLANNED ROUTE).
// Proves the above-head HUD that makes the route's execution pressure legible. Boots the real game and asserts:
//   1. Arming the route (Fwd+Heavy) feeds the HUD data contract (ftWindowMax > 0, ftSeq = the heavy→light plan).
//   2. The HUD actually RENDERS while armed (naoyaHudRenders climbs), and the per-beat window ticks down.
//   3. A clean H→H→L completion raises the gold "FRAMES SET" flash (ftFlash === "freeze").
//   4. A missed window raises the red "DROP" flash (ftFlash === "drop") + self-freezes Naoya + registers the drop.
//   5. No JS page errors (the HUD draws safely). Screenshots → harness/shots/naoya_hud_*_crop.png.
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
const fx = () => page.evaluate(() => window.__harness.naoyaFx("p1"));
const hudRenders = () => page.evaluate(() => window.__harness.naoyaHudRenders());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `naoya_hud_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.5, padBot = 34;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `naoya_hud_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 50) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
const specialDir = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
async function tap(key) { await page.keyboard.down(key); await waitFrames(1); await page.keyboard.up(key); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=naoya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // arm the Planned Route (Fwd+Heavy) — the HUD now visualises the route's follow-up pips + window countdown
  async function armRoute() {
    await page.evaluate(() => window.__harness.naoyaClear?.());
    await setupAdjacent(50);
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && (p.hitstun || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await waitFrames(1); await tap("k");
    return fwd;
  }

  // ── 1 & 2. Arm the route → HUD data contract + the HUD renders + window ticks ──
  console.log("\n── Arm Planned Route → HUD renders + data contract ──");
  const rendersBefore = await hudRenders();
  const fwd0 = await armRoute();
  const armed = await fx();
  check("Planned Route armed (step 0, committed)", armed.routeArmed && armed.ftStep === 0 && armed.rooted, `armed=${armed.routeArmed} step=${armed.ftStep} rooted=${armed.rooted}`);
  check("HUD data contract: windowMax > 0", (armed.ftWindowMax || 0) > 0, `windowMax=${armed.ftWindowMax}`);
  check("HUD data contract: seq is the follow-up plan (heavy→light)", JSON.stringify(armed.ftSeq) === JSON.stringify(["heavy", "light"]), JSON.stringify(armed.ftSeq));
  const w0 = armed.ftWindow;
  await waitFrames(3);
  const armed2 = await fx();
  check("per-beat window TICKS DOWN while armed", (armed2.ftWindow || 0) < w0 || !armed2.routeArmed, `w0=${w0} w1=${armed2.ftWindow}`);
  const rendersDuring = await hudRenders();
  check("the Projection HUD actually RENDERS while armed", rendersDuring > rendersBefore, `renders ${rendersBefore}→${rendersDuring}`);
  await crop("armed");
  await page.keyboard.up(fwd0);
  await page.waitForFunction(() => { const f = window.__harness.naoyaFx("p1"); return !f.routeArmed && (f.selfFrozen || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});

  // ── 3. Clean H→H→L → gold "FRAMES SET" flash (the plan executed) ──
  console.log("\n── Clean route (H→H→L) → FRAMES-SET flash ──");
  let clean = null;
  for (let attempt = 0; attempt < 6 && !clean; attempt++) {
    const fwd = await armRoute();
    let done = null, lastStep = -1;
    for (let i = 0; i < 24; i++) {
      const a = await fx();
      if ((a.selfFrozen || 0) > 0) { done = a; break; }
      if (!a.routeArmed) { done = a; break; }
      const want = a.ftSeq ? a.ftSeq[a.ftStep] : null;
      if (want && a.ftStep !== lastStep) { lastStep = a.ftStep; await tap(want === "heavy" ? "k" : "j"); }
      await waitFrames(1);
    }
    await waitFrames(3); if (!done) done = await fx();
    await page.keyboard.up(fwd);
    if (done && !done.routeArmed && done.ftFlash === "freeze") { clean = done; await crop("frames_set"); }
    await waitGrounded();
  }
  check("clean route completed (not dropped)", clean != null && (clean.selfFrozen || 0) === 0, clean ? "" : "route never completed clean");
  check('clean finish raised the "FRAMES SET" HUD flash', clean?.ftFlash === "freeze", `flash=${clean?.ftFlash}`);

  // ── 4. Drop a window → red "DROP" flash + Naoya self-freeze ──
  console.log("\n── Miss a window → DROP flash + self-freeze ──");
  let dropped = null;
  for (let attempt = 0; attempt < 4 && !dropped; attempt++) {
    const dropsBefore = (await fx()).ftDropped || 0;
    const fwd = await armRoute();
    let sawDropFlash = false, midDrop = null;
    for (let i = 0; i < 40; i++) { const a = await fx(); if (a.ftFlash === "drop") { sawDropFlash = true; if (!midDrop) { midDrop = a; await crop("drop"); } } await waitFrames(1); }   // do NOTHING → window elapses
    const after = await fx();
    await page.keyboard.up(fwd);
    if (sawDropFlash && (after.ftDropped || 0) > dropsBefore) dropped = { midDrop, after };
    await waitGrounded();
  }
  check("missing a window registered a DROP (telemetry)", dropped != null, dropped ? "" : "no drop registered");
  check('drop raised the red "DROP" HUD flash + self-freeze', dropped != null && (dropped.midDrop?.selfFrozen || 0) > 0, dropped ? `selfFrozen=${dropped.midDrop?.selfFrozen}` : "");

  check("no JS page errors across the whole run", jsErrors.length === 0, jsErrors[0] || "");
} catch (e) {
  check("harness ran without throwing", false, String(e));
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"} Naoya Frame-Trap HUD: ${PASS} passed, ${FAIL} failed — shots in harness/shots/naoya_hud_*_crop.png`);
await browser.close(); server.close();
process.exit(FAIL === 0 ? 0 : 1);
