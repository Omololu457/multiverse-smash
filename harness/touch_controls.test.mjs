// harness/touch_controls.test.mjs — on-screen touch controls drive the SAME pipeline as the keyboard.
//
// Boots a real match, forces touch mode ON, and drives the overlay through its REAL touchstart/move/end logic
// (which dispatches synthetic KeyboardEvents). Asserts each touch action produces the expected in-game effect
// — i.e. touch input is indistinguishable from the equivalent keyboard input to combat/movement/blocking.
// Also screenshots the overlay layout.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function server() {
  const s = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    const fp = path.join(ROOT, p === "/" ? "/index.html" : p);
    if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end("nf"); return; } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d); });
  });
  return new Promise(r => s.listen(0, "127.0.0.1", () => r(s)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };

const srv = await server();
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️ pageerror:", e.message));
const st = () => page.evaluate(() => window.__harness.touch.p1state());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.net.frame()); await page.waitForFunction(([a, b]) => window.__harness.net.frame() >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const T = (fn, ...a) => page.evaluate(fn, ...a);

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.touch, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(3);

  // Enable touch mode.
  await page.evaluate(() => window.__harness.touch.setMode("on"));
  check("touch mode active after setMode('on')", await page.evaluate(() => window.__harness.touch.isActive()));
  check("overlay should render (active + in battle)", await page.evaluate(() => window.__harness.touch.shouldShow()));
  const layout = await page.evaluate(() => window.__harness.touch.layout());
  const btnIds = layout.buttons.map(b => b.id).sort();
  check("overlay has joystick + 8 buttons (L/H/SP/ULT/BLK/GRB/CHG/UP)",
    !!layout.joystick && JSON.stringify(btnIds) === JSON.stringify(["block", "charge", "grab", "heavy", "light", "special", "ultimate", "upAttack"]), btnIds.join(","));

  // ── MOVEMENT (joystick right → walk right) ──────────────────────────────────
  const x0 = (await st()).x;
  await T(() => window.__harness.touch.joyStart("right"));
  await waitFrames(16);
  const moving = await st();
  check("joystick RIGHT moves the fighter right", moving.x > x0 + 5 || moving.vx > 0, `Δx=${moving.x - x0} vx=${moving.vx}`);
  await T(() => window.__harness.touch.joyEnd());
  await waitFrames(10);
  check("releasing the joystick stops movement", Math.abs((await st()).vx) < 0.5, `vx=${(await st()).vx}`);

  // ── LIGHT ATTACK (press button → attack). A real tap spans several frames (finger down ~100ms), so the
  //    game loop can SAMPLE keys[j]; hold across a couple frames like a real touch would. ─────────────────
  await T(() => window.__harness.touch.pressBtn("light"));
  await waitFrames(3);
  const light = await st();
  await T(() => window.__harness.touch.releaseBtn("light"));
  check("pressing LIGHT triggers an attack (same as pressing J)", light.attacking === true, `move=${light.move}`);
  await waitFrames(30);

  // ── BLOCK (hold button → guarding) ──────────────────────────────────────────
  await T(() => window.__harness.touch.pressBtn("block"));
  await waitFrames(3);
  check("holding BLOCK guards (isBlocking, same as holding ;)", (await st()).blocking === true);
  await T(() => window.__harness.touch.releaseBtn("block"));
  await waitFrames(3);
  check("releasing BLOCK stops guarding", (await st()).blocking === false);

  // ── DASH via DOUBLE-TAP a direction (event-driven path proven over touch) ────
  await waitFrames(20);
  await T(() => { window.__harness.touch.joyTap("right"); });
  await T(() => { window.__harness.touch.joyTap("right"); });
  await waitFrames(3);
  check("double-tapping a direction DASHES (keydown-event path works via touch)", (await st()).dashTimer > 0, `dashTimer=${(await st()).dashTimer}`);
  await waitFrames(20);

  // ── DIRECTIONAL SPECIAL (hold direction + tap Special) ──────────────────────
  await T(() => window.__harness.touch.joyStart("right"));
  await waitFrames(2);
  const heldRight = await page.evaluate(() => window.__harness.touch.p1keys());   // right bit should be set
  await T(() => window.__harness.touch.pressBtn("special"));
  await waitFrames(4);
  const spec = await st();
  await T(() => window.__harness.touch.releaseBtn("special"));
  check("hold-direction + SPECIAL fires a special while the direction is held", spec.attacking === true && (heldRight & 0b10) !== 0, `move=${spec.move} keys=${heldRight.toString(2)}`);
  await T(() => window.__harness.touch.joyEnd());
  await waitFrames(20);

  // ── SCREENSHOT the overlay ──────────────────────────────────────────────────
  await T(() => window.__harness.touch.joyStart("left"));      // show an active direction + a pressed button
  await T(() => window.__harness.touch.pressBtn("special"));
  await waitFrames(2);
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, "TOUCH_controls_overlay.png") });
  check("overlay screenshot captured → harness/shots/TOUCH_controls_overlay.png", fs.existsSync(path.join(OUT, "TOUCH_controls_overlay.png")));
  await T(() => { window.__harness.touch.joyEnd(); window.__harness.touch.releaseBtn("special"); });

  // ── OFF = inert (parity with keyboard-only) ─────────────────────────────────
  await T(() => window.__harness.touch.setMode("off"));
  check("touch OFF → overlay inert (shouldShow false)", (await page.evaluate(() => window.__harness.touch.shouldShow())) === false);

} catch (e) {
  check("no unexpected error", false, e.stack || e.message);
} finally {
  await browser.close();
  srv.close();
}

console.log(`\nTOUCH CONTROLS: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
