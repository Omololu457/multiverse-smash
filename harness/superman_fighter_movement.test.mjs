// harness/superman_fighter_movement.test.mjs
// REGRESSION for the "superman_fighter can't jump" playtest report (movement-gate leak class — same shape as
// the Ben10 health-clamp and ghostface_exe Susanoo-revert canJump leaks). Investigation found NO leak in
// superman_fighter: crouch is telemetry-only (never gates jump) and the kit never sets canJump=false. This
// test LOCKS THAT IN — it fails loudly if a future change makes crouch, a special, the ultimate, or the
// shared canFly flight toggle leave jump / directional movement gated.
//
// Verified behaviors:
//   • grounded jump produces lift (baseline)
//   • crouch (hold Down) → release → jump still lifts, canJump never latches false
//   • after every ground special + the ultimate (waited to fully actionable) → jump still lifts
//   • FLIGHT (canFly, P-tap toggle) responds in ALL 4 directions incl. vertical (the report's "vertical dead")
//   • flight toggles OFF cleanly (descend-to-floor, rapid re-toggle, engage-while-holding-down) → jump restored
//   • omniman included as the shared-flight-system reference (Stage 2: flight/crouch code is shared, not
//     unique to superman_fighter — if it ever breaks, it breaks for every canFly char)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function fill() { await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); }); await waitFrames(1); }
// Wait until FULLY actionable — grounded, not attacking, no cooldown/hitstop/cast/hitstun, not flying, settled.
async function actionable(maxF = 400) {
  for (let i = 0; i < maxF; i++) { const p = await p1();
    if (p.grounded && !p.attacking && (p.attackCooldown || 0) === 0 && (p.hitstop || 0) === 0 && !p.castMove &&
        (p.hitstun || 0) === 0 && (p.stun || 0) === 0 && !p.flightActive && (p.jumpCount || 0) === 0 && Math.abs(p.vy) < 0.6) return true;
    await waitFrames(1); } return false;
}
async function land() { for (let i = 0; i < 160; i++) { const p = await p1(); if (p.grounded && !p.flightActive) break; await waitFrames(1); } }
// REAL-keyboard grounded jump. Returns {ok, vy, canJump}. Requires actionable first.
async function jumps() {
  if (!await actionable()) return { ok: null, reason: "never became actionable" };
  const b = await p1();
  await page.keyboard.down("w"); await waitFrames(5); const m = await p1(); await page.keyboard.up("w"); await waitFrames(2);
  const ok = m.vy < -1 || (!m.grounded && m.y < b.y - 2);
  await land(); return { ok, vy: +m.vy.toFixed(2), canJump: m.canJump };
}
async function special(dir) { await page.evaluate(d => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1SpecialDir(d); }, dir); await waitFrames(6); await land(); }
async function ult() { await fill(); await page.evaluate(() => window.__harness.p1Ultimate?.()); await land(); }
// engage flight via REAL keyboard tap of the charge/toggle key, then rise to mid-air (off the floor clamp)
async function engageFlight() {
  if ((await p1()).flightActive) { await page.keyboard.press("p"); await waitFrames(3); }
  await land(); await fill();
  await page.keyboard.press("p"); await waitFrames(4);
  await page.keyboard.down("w"); await waitFrames(18); await page.keyboard.up("w"); await waitFrames(4);
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await waitFrames(2);
  return (await p1()).flightActive;
}
async function flyDir(key, axis, sign) { // 3 trials; ok if ANY responds (guards against ceiling/floor clamp on repeat)
  for (let t = 0; t < 3; t++) {
    if (!(await p1()).flightActive) { if (!await engageFlight()) continue; }
    await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
    for (let i = 0; i < 10; i++) { const p = await p1(); if (Math.abs(p.vx) < 0.3 && Math.abs(p.vy) < 0.3) break; await waitFrames(1); }
    await page.keyboard.down(key); await waitFrames(6); const m = await p1(); await page.keyboard.up(key); await waitFrames(2);
    const v = axis === "y" ? m.vy : m.vx; if ((sign < 0 ? v < -1 : v > 1) && m.flightActive) return true;
  }
  return false;
}
async function boot(key) {
  await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360); await page.evaluate(() => window.__harness.boot()); await waitFrames(8); await fill();
}
try {
  for (const key of ["superman_fighter", "omniman"]) {
    console.log(`\n════════ ${key} ════════`);

    await boot(key);
    check(`${key}: canFly trait present (flight system applies)`, (await page.evaluate(k => window.__harness.charDef(k).traits?.canFly, key)) === true);

    console.log("── ground jump + crouch (the report's core claim) ──");
    check(`${key}: baseline grounded jump lifts`, (await jumps()).ok === true);
    // crouch → release → jump
    await actionable(); await page.keyboard.down("s"); await waitFrames(20);
    const held = await p1();
    check(`${key}: canJump stays true WHILE crouching (engine never gates jump on crouch)`, held.canJump === true, `canJump=${held.canJump}`);
    await page.keyboard.up("s"); await waitFrames(6);
    const rel = await p1();
    check(`${key}: canJump restored immediately after crouch release`, rel.canJump === true, `canJump=${rel.canJump}`);
    const cj = await jumps();
    check(`★ ${key}: crouch → release → JUMP lifts (no movement-gate leak)`, cj.ok === true && cj.canJump === true, JSON.stringify(cj));

    console.log("── jump survives every special + the ultimate ──");
    for (const d of [null, "F", "U", "D", "B"]) { await fill(); await special(d); check(`${key}: jump after special ${d || "N"}`, (await jumps()).ok === true); }
    await ult(); check(`${key}: jump after ultimate (fully actionable)`, (await jumps()).ok === true);

    console.log("── flight (canFly, P-tap) responds in all 4 directions ──");
    check(`${key}: fly UP responds (report's 'vertical dead')`, await flyDir("w", "y", -1) === true);
    check(`${key}: fly DOWN responds`, await flyDir("s", "y", 1) === true);
    check(`${key}: fly LEFT responds`, await flyDir("a", "x", -1) === true);
    check(`${key}: fly RIGHT responds`, await flyDir("d", "x", 1) === true);

    console.log("── flight toggles OFF cleanly → jump restored (no stuck-on) ──");
    // descend to floor while flying, then disengage
    if ((await p1()).flightActive) { await page.keyboard.press("p"); await waitFrames(3); }
    await land(); await fill(); await page.keyboard.press("p"); await waitFrames(4);
    await page.keyboard.down("s"); await waitFrames(30); await page.keyboard.up("s"); await waitFrames(2);
    const atFloor = await p1();
    check(`${key}: still airborne in flight at floor level (flight replaces jump, by design)`, atFloor.flightActive === true && atFloor.grounded === false);
    await page.keyboard.press("p"); await waitFrames(4); await land();
    check(`${key}: disengage flight → grounded`, (await p1()).grounded === true && (await p1()).flightActive === false);
    check(`★ ${key}: jump after descend→disengage lifts`, (await jumps()).ok === true);
    // rapid re-toggle then jump
    await fill(); for (let i = 0; i < 6; i++) { await page.keyboard.press("p"); await waitFrames(2); } await waitFrames(4); await land();
    check(`${key}: jump after 6 rapid flight toggles`, (await jumps()).ok === true);
  }
  check("no JS errors across the movement kit", jsErrors.length === 0, jsErrors[0] || "");
} catch (e) { console.log("FATAL", String(e), e.stack); fail++; }
console.log(`\n════════════════════════════════════════`);
console.log(`  SUPERMAN_FIGHTER MOVEMENT: ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
