// harness/naoya_stage4.mjs — STAGE 4: Naoya's specials (Projection Sorcery).
//  neutral = Energy Dart spread (row_11)  ·  Fwd = Pitch Throw (row_09 → fast single dart)
//  Back = Frame-Skip retreat blink  ·  Up = Frame-Skip advance blink (row_02 dash art, i-frames, NO attack)
//  Down = FRAME-TRAP: telegraph (row_03) → fixed L→H→L strict-link string → row_07 white-wing FREEZE finish.
// Proves: each cast pose resolves, projectiles connect, blink repositions + engages i-frames + deals no dmg,
// and BOTH a clean Frame-Trap (3 steps land + opponent FROZEN) and a DROPPED one (halts, punishable, only
// step-1 dmg, no freeze). Screenshots → harness/shots/naoya_s4_*_crop.png.
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

  // ── neutral: Energy Dart spread ──
  console.log("\n── neutral: Energy Dart spread (row_11) ──");
  await setupAdjacent(150);
  const en0 = (await fx()).energy, dhp0 = (await p2()).health;
  await specialDir(null); await waitFrames(2);
  const dart = await fx(); await crop("energydart");
  check("Energy Dart → castMove naoyaEnergyDart", dart.castMove === "naoyaEnergyDart", `cast=${dart.castMove}`);
  check("Energy Dart spends cursed energy (18)", en0 - dart.energy >= 16 && en0 - dart.energy <= 20, `energy ${en0} → ${dart.energy}`);
  await waitFrames(30);
  check("Energy Dart projectile connects at range", (await p2()).health < dhp0, `hp ${dhp0} → ${(await p2()).health}`);

  // ── Fwd: Pitch Throw (fast single dart) ──
  console.log("\n── Fwd: Pitch Throw (row_09 → fast dart) ──");
  await setupAdjacent(150);
  const php0 = (await p2()).health;
  await specialDir("F"); await waitFrames(2);
  const pitch = await fx(); await crop("pitch");
  check("Pitch Throw → castMove naoyaPitch", pitch.castMove === "naoyaPitch", `cast=${pitch.castMove}`);
  await waitFrames(30);
  check("Pitch Throw dart connects at range", (await p2()).health < php0, `hp ${php0} → ${(await p2()).health}`);

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

  // ── Down: FRAME-TRAP telegraph ──
  console.log("\n── Down: Frame-Trap telegraph opens (row_03) ──");
  await setupAdjacent(52);
  const tEn0 = (await fx()).energy;
  await specialDir("D"); await waitFrames(1);
  const tel = await fx(); await crop("frametrap_open");
  check("Frame-Trap → armed state machine (step 0)", tel.ftArmed && tel.ftStep === 0, `armed=${tel.ftArmed} step=${tel.ftStep}`);
  check("Frame-Trap telegraph pose = naoyaFrameTrap (row_03)", tel.castMove === "naoyaFrameTrap", `cast=${tel.castMove}`);
  check("Frame-Trap opening spends cursed energy (20)", tEn0 - tel.energy >= 18 && tEn0 - tel.energy <= 22, `energy ${tEn0} → ${tel.energy}`);

  // ── Frame-Trap CLEAN execution: L → H → L inside the windows ──
  console.log("\n── Frame-Trap CLEAN execution (L→H→L → white-wing FREEZE finish) ──");
  let clean = null;
  for (let attempt = 0; attempt < 4 && !(clean && clean.oppFrozen > 0); attempt++) {
    await setupAdjacent(50);
    const hp0 = (await p2()).health;
    await specialDir("D"); await waitFrames(2);           // open
    await tap("j"); await waitFrames(2);                  // step 1 (Light)
    await tap("k"); await waitFrames(2);                  // step 2 (Heavy)
    await tap("j"); await waitFrames(2);                  // step 3 (Light) → finish
    const st = await fx();
    if (st.oppFrozen > 0) { clean = { ...st, dealt: hp0 - st.oppHealth }; await crop("frametrap_clean"); }
    await waitFrames(20); await waitGrounded(); await waitFrames(4);
  }
  check("clean Frame-Trap completed all 3 steps (sequence cleared)", clean != null && !clean.ftArmed, `armed=${clean?.ftArmed}`);
  check("clean finish FREEZES the opponent (distinct set-duration lock)", (clean?.oppFrozen || 0) >= 60, `oppFrozen=${clean?.oppFrozen}`);
  check("clean finish carries a big hitstun lock", (clean?.oppHitstun || 0) >= 60, `oppHitstun=${clean?.oppHitstun}`);
  check("clean Frame-Trap dealt full-chain damage", (clean?.dealt || 0) > 40, `dealt=${clean?.dealt}`);

  // ── Frame-Trap DROPPED: open, press step 1, then MISS the window ──
  console.log("\n── Frame-Trap DROPPED (miss a window → halt, punishable, no freeze) ──");
  await setupAdjacent(50);
  // wait for the opponent to fully THAW from the clean-test freeze before probing the drop path
  await page.waitForFunction(() => (window.__harness.naoyaFx("p1")?.oppFrozen || 0) === 0, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const dhp = (await p2()).health;
  await specialDir("D"); await waitFrames(2);   // open
  await tap("j");                                // step 1 only
  await waitFrames(20);                          // then WAIT OUT the window (miss step 2)
  const dropped = await fx(); await crop("frametrap_dropped");
  check("dropped Frame-Trap halted (no longer armed)", !dropped.ftArmed, `armed=${dropped.ftArmed}`);
  check("dropped Frame-Trap registered a drop (telemetry)", dropped.ftDropped > 0, `dropped=${dropped.ftDropped}`);
  check("dropped Frame-Trap leaves punishable recovery", dropped.cooldown > 0, `cooldown=${dropped.cooldown}`);
  check("dropped Frame-Trap did NOT freeze the opponent", dropped.oppFrozen === 0, `oppFrozen=${dropped.oppFrozen}`);
  check("dropped Frame-Trap dealt only partial (≤ step-1) damage", (dhp - dropped.oppHealth) < 40, `dealt=${dhp - dropped.oppHealth}`);

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
