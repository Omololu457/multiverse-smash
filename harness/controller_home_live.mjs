// harness/controller_home_live.mjs — DIAGNOSTIC: drive the REAL live loop with a fake gamepad and prove
// (or disprove) that pressing Cross on the HOME/title PLAY option actually activates it. Unlike
// controller_menu.test.mjs (which injected a nav object and called the dispatch functions directly), this
// overrides navigator.getGamepads and lets the game's OWN requestAnimationFrame loop poll the pad — the
// exact path a real controller hits. Nothing here calls padNav/handleMenuClicks manually.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const gs = () => page.evaluate(() => window.__harness.state().gameState);
async function frames(n = 6) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 8000, polling: 16 }); }
// Install a fake standard-mapping pad the LIVE loop will poll via navigator.getGamepads().
async function installPad() {
  await page.evaluate(() => {
    window.__pad = { index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad];
  });
}
// Press a button for `hold` real frames, then release — exactly what a real tap looks like to the loop.
async function tap(idx, hold = 3) {
  await page.evaluate(i => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1; }, idx);
  await frames(hold);
  await page.evaluate(i => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0; }, idx);
  await frames(2);
}
const CROSS = 0, CIRCLE = 1, DOWN = 13;

try {
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await installPad();
  await frames(4);

  check("starts on the home/title screen", await gs() === "start", await gs());

  // THE reported case: press Cross on the home screen — does PLAY activate?
  await tap(CROSS);
  check("Cross on the HOME screen activates PLAY → MAIN MENU (live loop)", await gs() === "mainMenu", `gameState=${await gs()}`);

  // Navigate the main menu with the d-pad (real poll), then confirm PLAY → mode select.
  const before = await page.evaluate(() => window.__harness.padMenuState().selId);
  await tap(DOWN);
  const afterDown = await page.evaluate(() => window.__harness.padMenuState().selId);
  check("d-pad DOWN moves the highlight on the live main menu", afterDown && afterDown !== before, `${before} → ${afterDown}`);

  // Back up to PLAY and confirm into GAMEPLAY SELECT.
  await tap(13 /*down*/); // move again to exercise repeat-free stepping
  // re-seat on PLAY: press UP until selId === 'play'
  for (let i = 0; i < 12; i++) { if ((await page.evaluate(() => window.__harness.padMenuState().selId)) === "play") break; await tap(12 /*up*/); }
  check("can return the highlight to PLAY", await page.evaluate(() => window.__harness.padMenuState().selId) === "play");
  await tap(CROSS);
  check("Cross on PLAY opens GAMEPLAY SELECT (live loop)", await gs() === "gameplaySelect", await gs());

  // Confirm a real match launches end-to-end from the home flow: pick TRAINING (top row) → into select.
  const sel = await page.evaluate(() => window.__harness.padMenuState().selId);
  check("mode select highlights TRAINING first", sel === "training", `selId=${sel}`);
  await tap(CROSS);
  const g = await gs();
  check("Cross on TRAINING advances into the match-setup flow", g === "selectUniverse" || g === "selectCharacter", `gameState=${g}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  CONTROLLER-HOME-LIVE: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
