// harness/naoya_stage4.mjs — Naoya's REDESIGNED specials + the two signature mechanics (Projection Sorcery).
//  neutral = 24FPS SNARE (palm, row_07 white-wing) → applies the "hold neutral or freeze" rule on contact
//  Fwd = Pitch Throw (row_09 → fast single dart)  ·  Down = Energy Dart spread (row_11, moved from neutral)
//  Back = Frame-Skip retreat blink  ·  Up = Frame-Skip advance blink (row_02 dash art, i-frames, NO attack)
// Proves: each special resolves + spends meter + connects; the Snare freezes on a rule-break and expires on a
// clean hold; and the PLANNED ROUTE (Fwd+Heavy) both COMPLETES on clean H→H→L (launcher reward) and SELF-
// FREEZES Naoya on a missed window. (The old free Down+Special Frame-Trap is retired.) Shots → naoya_s4_*_crop.
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
const fx = () => page.evaluate(() => window.__harness.naoyaFx("p1"));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `naoya_s4_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.2, padBot = 34;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `naoya_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
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

  // ── neutral: 24FPS SNARE (palm, white-wing pose) ──
  console.log("\n── neutral: 24FPS Snare (palm rule, row_07 white-wing) ──");
  { let s = null;
    for (let attempt = 0; attempt < 4 && !s; attempt++) {
      await page.evaluate(() => window.__harness.naoyaClear?.());
      await setupAdjacent(46); const en0 = (await fx()).energy;
      let cast = "", applied = false, spent = 0;
      await specialDir(null);
      for (let i = 0; i < 24; i++) { const a = await fx(); if (a.castMove === "naoyaFtFinish") cast = a.castMove; if ((a.oppSnare || 0) > 0 && !applied) { applied = true; spent = en0 - a.energy; } await waitFrames(1); }
      if (applied) { s = { cast, applied, spent }; await crop("snare"); }
      await waitGrounded();
    }
    check("Snare (neutral) → white-wing palm pose (naoyaFtFinish)", s && s.cast === "naoyaFtFinish", `cast=${s?.cast}`);
    check("Snare lands the rule on the opponent (_naoyaSnare)", !!s?.applied, `applied=${s?.applied}`);
    check("Snare spends cursed energy (24)", s && s.spent >= 20 && s.spent <= 28, `spent=${s?.spent}`); }

  // ── SNARE COUNTERPLAY: acting = freeze / holding neutral = harmless expire ──
  console.log("\n── Snare enforcement: rule-break freezes / clean hold expires ──");
  { // BROKEN: land snare, opponent acts → freeze
    let froze = false;
    for (let attempt = 0; attempt < 4 && !froze; attempt++) {
      await page.evaluate(() => window.__harness.naoyaClear?.());
      await setupAdjacent(46); await specialDir(null);
      let applied = false; for (let i = 0; i < 24; i++) { if (((await fx()).oppSnare || 0) > 0) { applied = true; break; } await waitFrames(1); }
      if (!applied) { await waitGrounded(); continue; }
      await page.waitForFunction(() => (window.__harness.p2().hitstun || 0) <= 0, null, { timeout: 2000, polling: 16 }).catch(() => {});
      await page.evaluate(() => window.__harness.p2Attack());
      for (let i = 0; i < 8; i++) { if (((await fx()).oppFrozen || 0) >= 50) { froze = true; break; } await waitFrames(1); }
      await waitGrounded();
    }
    check("acting while snared → opponent hard-freezes (~1s, punishable)", froze, `froze=${froze}`);
    // HELD: land snare, opponent holds neutral → no freeze, expires
    await page.evaluate(() => window.__harness.naoyaClear?.());
    await setupAdjacent(46); await specialDir(null);
    let maxWin = 0; for (let i = 0; i < 24; i++) { const a = await fx(); if ((a.oppSnare || 0) > maxWin) maxWin = a.oppSnare; if ((a.oppSnare || 0) > 0) break; await waitFrames(1); }
    let everFroze = false; const start = (await fx()).oppFrozen || 0;
    for (let i = 0; i < maxWin + 40; i++) { const a = await fx(); if ((a.oppFrozen || 0) > start + 4) everFroze = true; if ((a.oppSnare || 0) === 0) break; await waitFrames(1); }
    const after = await fx();
    check("holding neutral the full window → snare expires harmlessly (no freeze)", (after.oppSnare || 0) === 0 && !everFroze, `oppSnare=${after.oppSnare} everFroze=${everFroze}`); }

  // ── Fwd: Pitch Throw (fast single dart) ──
  console.log("\n── Fwd: Pitch Throw (row_09 → fast dart) ──");
  await page.evaluate(() => window.__harness.naoyaClear?.());
  await setupAdjacent(150);
  const php0 = (await p2()).health;
  await specialDir("F"); await waitFrames(2);
  const pitch = await fx(); await crop("pitch");
  check("Pitch Throw → castMove naoyaPitch", pitch.castMove === "naoyaPitch", `cast=${pitch.castMove}`);
  await waitFrames(30);
  check("Pitch Throw dart connects at range", (await p2()).health < php0, `hp ${php0} → ${(await p2()).health}`);

  // ── Down: Energy Dart spread (moved from neutral) ──
  console.log("\n── Down: Energy Dart spread (row_11) ──");
  await setupAdjacent(150);
  const en0 = (await fx()).energy, dhp0 = (await p2()).health;
  await specialDir("D"); await waitFrames(2);
  const dart = await fx(); await crop("energydart");
  check("Energy Dart (Down) → castMove naoyaEnergyDart", dart.castMove === "naoyaEnergyDart", `cast=${dart.castMove}`);
  check("Energy Dart spends cursed energy (18)", en0 - dart.energy >= 16 && en0 - dart.energy <= 20, `energy ${en0} → ${dart.energy}`);
  await waitFrames(30);
  check("Energy Dart projectile connects at range", (await p2()).health < dhp0, `hp ${dhp0} → ${(await p2()).health}`);

  // ── Back: Frame-Skip retreat blink ──
  console.log("\n── Back: Frame-Skip retreat blink (row_02, i-frames, no attack) ──");
  await setupAdjacent(70);
  const bx0 = (await fx()).x, bhp0 = (await p2()).health;
  await specialDir("B"); await waitFrames(1);
  const blinkB0 = await fx();
  await waitFrames(5);
  const blinkB = await fx(); await crop("frameskip_back");
  check("Frame-Skip → castMove naoyaFrameSkip", blinkB0.castMove === "naoyaFrameSkip" || blinkB.castMove === "naoyaFrameSkip", `cast=${blinkB0.castMove}/${blinkB.castMove}`);
  check("Frame-Skip engages i-frames (the evade)", (blinkB0.invuln || blinkB.invuln) > 0, `invuln=${blinkB0.invuln}/${blinkB.invuln}`);
  check("Frame-Skip retreat repositions BACKWARD (away from foe)", blinkB.x < bx0 - 60, `x ${bx0} → ${blinkB.x}`);
  check("Frame-Skip deals NO damage (pure mobility)", (await p2()).health === bhp0, `hp ${bhp0} → ${(await p2()).health}`);
  await waitFrames(10);

  // ── Up: Frame-Skip advance blink ──
  console.log("\n── Up: Frame-Skip advance blink (toward foe) ──");
  await setupAdjacent(220);
  const ux0 = (await fx()).x;
  await specialDir("U"); await waitFrames(6);
  const blinkU = await fx(); await crop("frameskip_up");
  check("Frame-Skip advance repositions FORWARD (toward foe)", blinkU.x > ux0 + 60, `x ${ux0} → ${blinkU.x}`);
  await waitFrames(10);

  // ── PLANNED ROUTE (Fwd+Heavy): clean H→H→L completes / a missed window self-freezes Naoya ──
  console.log("\n── Planned Route CLEAN (Fwd+Heavy → H → L → launcher finish) ──");
  async function armRoute() {
    await page.evaluate(() => window.__harness.naoyaClear?.());
    await setupAdjacent(50);
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && (p.hitstun || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await waitFrames(1); await tap("k");
    return fwd;
  }
  let clean = null;
  for (let attempt = 0; attempt < 6 && !clean; attempt++) {
    const hp0 = (await p2()).health;
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
    await waitFrames(4); if (!done) done = await fx();
    const dealt = hp0 - (await p2()).health;
    await page.keyboard.up(fwd);
    if (done && !done.routeArmed && done.ftFlash === "freeze" && (done.selfFrozen || 0) === 0 && dealt > 40) { clean = { done, dealt }; await crop("route_clean"); }
    await waitGrounded();
  }
  check("clean route completes the string (FRAMES SET, not dropped)", clean != null, clean ? `flash=${clean.done.ftFlash}` : "route never completed clean");
  check("clean route = strong reward damage + NO self-freeze", clean != null && clean.dealt > 40 && (clean.done.selfFrozen || 0) === 0, clean ? `dealt=${clean.dealt.toFixed(0)}` : "");

  console.log("\n── Planned Route DROPPED (miss a window → Naoya self-freezes 1s, punishable) ──");
  let dropped = null;
  for (let attempt = 0; attempt < 4 && !dropped; attempt++) {
    const fwd = await armRoute();
    let sawSelf = false, sawDrop = false;
    for (let i = 0; i < 40; i++) { const a = await fx(); if ((a.selfFrozen || 0) > 0) sawSelf = true; if (a.ftFlash === "drop") sawDrop = true; await waitFrames(1); }   // do NOTHING → window elapses
    const after = await fx();
    await page.keyboard.up(fwd);
    if (sawSelf && sawDrop && !after.routeArmed) { dropped = { sawSelf, sawDrop, after }; await crop("route_dropped"); }
    await waitGrounded();
  }
  check("missing a window DROPS the route (red DROP)", dropped != null && dropped.sawDrop, dropped ? "" : "no drop observed");
  check("a dropped route FREEZES Naoya himself (~1s, punishable)", dropped != null && dropped.sawSelf, dropped ? "" : "no self-freeze");
  check("route cleared after drop (not stuck armed/rooted)", dropped != null && !dropped.after.routeArmed && !dropped.after.rooted, dropped ? `armed=${dropped.after.routeArmed} rooted=${dropped.after.rooted}` : "");

  // ── data contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("naoya")?.animationData || {});
  const keys = ["naoyaEnergyDart", "naoyaPitch", "naoyaFrameSkip", "naoyaFrameTrap", "naoyaFtStep1", "naoyaFtStep2", "naoyaFtFinish"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("naoya"));
  check("all special cast poses wired to real naoya sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Naoya Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/naoya_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
