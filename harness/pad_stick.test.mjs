// harness/pad_stick.test.mjs — in-battle stick processing (input quick-wins Phase 3).
// Radial deadzone 0.28 → 8-way angular gate (cardinals ±30°, diagonals ±15°) → 8° hysteresis → SOCD merge with
// the d-pad → ONE numpad direction (1-9, 5 = neutral). Part A: pure padStick.js + input.js padDirections.
// Part B: a fake pad in a real match (the live loop's own readers).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { stickToNumpad, combineStickDpad, STICK_RADIAL_DEADZONE, STICK_HYSTERESIS_DEG } from "../padStick.js";
import { padDirections } from "../input.js";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const at = (deg, mag = 1) => [Math.cos(deg * Math.PI / 180) * mag, -Math.sin(deg * Math.PI / 180) * mag];   // Gamepad Y is negative-up
const dirAt = (deg, prev = 5, mag = 1) => { const [x, y] = at(deg, mag); return stickToNumpad(x, y, prev); };

section("A1) angle table from neutral (0° = right, 90° = up)");
for (const [deg, want] of [[0, 6], [20, 6], [35, 9], [50, 9], [70, 8], [90, 8]]) check(`${deg}° → ${want}`, dirAt(deg) === want, `got ${dirAt(deg)}`);
for (const [deg, want] of [[135, 7], [180, 4], [225, 1], [270, 2], [315, 3], [340, 6], [200, 4], [250, 2]]) check(`${deg}° → ${want}`, dirAt(deg) === want, `got ${dirAt(deg)}`);

section("A2) sector boundaries (no hysteresis): cardinal owns its ±30° edge");
check("30° → 6 (cardinal edge)", dirAt(30) === 6, `got ${dirAt(30)}`);
check("30.5° → 9", dirAt(30.5) === 9, `got ${dirAt(30.5)}`);
check("60° → 8 (cardinal edge)", dirAt(60) === 8, `got ${dirAt(60)}`);
check("59.5° → 9", dirAt(59.5) === 9, `got ${dirAt(59.5)}`);
check("120° → 8, 120.5° → 7", dirAt(120) === 8 && dirAt(120.5) === 7);
check("-30° (330°) → 6, 329.5° → 3", dirAt(330) === 6 && dirAt(329.5) === 3);

section(`A3) hysteresis ${STICK_HYSTERESIS_DEG}°: a direction must be left by more than ${STICK_HYSTERESIS_DEG}° to change`);
check("holding 6, 38° stays 6", dirAt(38, 6) === 6, `got ${dirAt(38, 6)}`);
check("holding 6, 38.5° → 9", dirAt(38.5, 6) === 9, `got ${dirAt(38.5, 6)}`);
check("holding 9, 22° stays 9", dirAt(22, 9) === 9, `got ${dirAt(22, 9)}`);
check("holding 9, 21.5° → 6", dirAt(21.5, 9) === 6, `got ${dirAt(21.5, 9)}`);
check("holding 9, 68° stays 9", dirAt(68, 9) === 9, `got ${dirAt(68, 9)}`);
check("holding 9, 68.5° → 8", dirAt(68.5, 9) === 8, `got ${dirAt(68.5, 9)}`);
check("holding 8, 52° stays 8", dirAt(52, 8) === 8, `got ${dirAt(52, 8)}`);
check("holding 8, 51.5° → 9", dirAt(51.5, 8) === 9, `got ${dirAt(51.5, 8)}`);
check("holding 2, 308° stays 2; 308.5° → 3", dirAt(308, 2) === 2 && dirAt(308.5, 2) === 3);
{
  let prev = 6, edges = 0;
  for (let i = 0; i < 200; i++) { const n = dirAt(i % 2 ? 29 : 31, prev); if (n !== prev) edges++; prev = n; }
  check("jitter 29°↔31° while holding 6 produces NO direction changes (no false press edges)", edges === 0, `${edges} changes`);
  prev = 5; const seq = [];
  for (const d of [0, 25, 33, 38, 39, 45, 30, 23, 21, 0]) { prev = dirAt(d, prev); seq.push(prev); }
  check("sweep 0→45→0 changes direction exactly twice (6→9→6)", seq.join("") === "6666999966", seq.join(""));
}

section(`A4) radial deadzone ${STICK_RADIAL_DEADZONE}`);
check("magnitude 0.27 → neutral", dirAt(0, 5, 0.27) === 5);
check("magnitude 0.29 → 6", dirAt(0, 5, 0.29) === 6);
check("diagonal magnitude 0.25 → neutral (radial, not per-axis)", dirAt(45, 5, 0.25) === 5);
check("holding 6 then released to 0.2 → neutral", dirAt(0, 6, 0.2) === 5);

section("A5) the reported bugs");
{ const [x, y] = at(-25); check("right with a natural 25° downward tilt reads RIGHT only (old: RIGHT+DOWN)", stickToNumpad(x, y) === 6 && y > 0.4, `y=${y.toFixed(2)} got ${stickToNumpad(x, y)}`); }
{ const [x, y] = at(25); check("right with a 25° upward tilt does NOT read UP (old: jump)", stickToNumpad(x, y) === 6 && -y > 0.4, `y=${y.toFixed(2)}`); }
check("stick resting down-forward-ish (295°) reads pure DOWN (2) — down+Special no longer needs perfect straight down", dirAt(295) === 2);

section("A6) SOCD with the d-pad");
check("stick left + d-pad right → horizontal neutral (5)", combineStickDpad(4, { right: true }) === 5);
check("d-pad left + right → 5", combineStickDpad(5, { left: true, right: true }) === 5);
check("stick up + d-pad down → up (8)", combineStickDpad(8, { down: true }) === 8);
check("stick down + d-pad up → up (8)", combineStickDpad(2, { up: true }) === 8);
check("stick down-left + d-pad right → down (2)", combineStickDpad(1, { right: true }) === 2);
check("agreeing stick + d-pad unchanged (6 + right → 6)", combineStickDpad(6, { right: true }) === 6);
check("d-pad alone: down + right → 3", combineStickDpad(5, { down: true, right: true }) === 3);

section("A7) input.js padDirections: per-player state, idempotent within a frame");
{
  const gp = (deg, mag = 1, btns = []) => { const [x, y] = at(deg, mag); const b = Array.from({ length: 17 }, (_, i) => ({ pressed: btns.includes(i) })); return { axes: [x, y, 0, 0], buttons: b }; };
  padDirections(1, gp(0)); const r1 = padDirections(1, gp(38));
  check("P1 holding right, 38° → still right (hysteresis via input.js)", r1.numpad === 6, `got ${r1.numpad}`);
  const r2 = padDirections(2, gp(38));
  check("P2 from neutral at 38° → up-right (P1's state does not leak)", r2.numpad === 9, `got ${r2.numpad}`);
  const a = padDirections(1, gp(38)), b = padDirections(1, gp(38));
  check("re-reading the same stick in one frame is stable", a.numpad === b.numpad && a.numpad === 6);
  const d = padDirections(1, gp(0, 0, [13]));
  check("d-pad down with a centred stick → 2 / down=true", d.numpad === 2 && d.down && !d.left && !d.right);
}

section("B) real match: fake pad, live loop readers");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg", ".webp": "image/webp" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=goku&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => {
    window.__pad = { index: 0, id: "DualSense 054c", connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad];
    window.dispatchEvent(new Event("gamepadconnected"));
    window.__harness.boot(); window.__harness.setInputType(1, "controller");
  });
  const fr = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); };
  await fr(20);
  const stick = (deg, mag = 1) => page.evaluate(([x, y]) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, deg == null ? [0, 0] : at(deg, mag));
  const snap = () => page.evaluate(() => ({ s: window.__harness.ui.inputSnapshot("p1"), n: window.__harness.ui.padNumpad(1) }));
  for (const [deg, want] of [[0, 6], [20, 6], [35, 9], [50, 9], [70, 8], [90, 8], [295, 2]]) {
    await page.evaluate(() => window.__harness.setHitstun(40, "p1"));   // hold still; directions are still read
    await stick(null); await fr(3); await stick(deg); await fr(3);
    const { s, n } = await snap();
    const exp = { up: want >= 7, down: want <= 3, left: [1, 4, 7].includes(want), right: [3, 6, 9].includes(want) };
    check(`live ${deg}° → numpad ${want}, up/down/left/right match`, n === want && s.up === exp.up && s.down === exp.down && s.left === exp.left && s.right === exp.right, `numpad=${n} up=${s.up} down=${s.down} left=${s.left} right=${s.right}`);
  }
  await stick(null); await fr(3);
  check("no page errors", errs.length === 0, errs[0] || "");
  await page.close();
} finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════════`);
console.log(`  PAD STICK (radial + 8-way + hysteresis + SOCD): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
