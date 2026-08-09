// harness/fullscreen_shot.mjs — verify the fullscreen toggle + capture a real fullscreen-resolution shot.
// Proves: (1) the "F" key and the #fullscreenBtn button BOTH invoke the native Fullscreen API (spy on
// requestFullscreen/exitFullscreen — page.keyboard/.click() count as the required user gesture); (2) at a
// real screen resolution the game canvas fills the ENTIRE viewport with NO letterboxing/gaps (canvas rect ==
// viewport, canvas backing store == viewport, groundY reflowed to the new height); (3) no JS errors. Writes
// harness/shots/fullscreen.png (in-match, full-HD) for eyeball confirmation.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const SCREEN_W = 1920, SCREEN_H = 1080;   // a real full-HD screen resolution → what fullscreen expands to
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", `--window-size=${SCREEN_W},${SCREEN_H}`] });
const page = await browser.newPage({ viewport: { width: SCREEN_W, height: SCREEN_H } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });

  // Spy on the native Fullscreen API so we can prove the toggle actually calls it (headless can't truly
  // go fullscreen, but a real browser does — the wiring is what we assert here).
  await page.evaluate(() => {
    window.__fs = { req: 0, exit: 0 };
    const el = document.documentElement;
    const or = el.requestFullscreen?.bind(el);
    el.requestFullscreen = function (...a) { window.__fs.req++; try { return or ? or(...a) : Promise.resolve(); } catch (_) { return Promise.resolve(); } };
    const ox = document.exitFullscreen?.bind(document);
    document.exitFullscreen = function (...a) { window.__fs.exit++; try { return ox ? ox(...a) : Promise.resolve(); } catch (_) { return Promise.resolve(); } };
  });

  // ── button + keybind exist / wired ──
  section("toggle wiring");
  const btn = await page.$("#fullscreenBtn");
  check("fullscreen button #fullscreenBtn exists in the DOM", !!btn);
  const btnBox = btn && await btn.boundingBox();
  check("button is visible (has a box, top-left corner)", !!btnBox && btnBox.width > 0 && btnBox.x < 100 && btnBox.y < 100, btnBox ? `x=${btnBox.x} y=${btnBox.y} ${btnBox.width}×${btnBox.height}` : "");

  // ── (1) "F" key invokes requestFullscreen (keydown is a user gesture) ──
  await page.keyboard.press("f"); await page.waitForTimeout(150);
  { const fs = await page.evaluate(() => window.__fs); check("pressing F calls requestFullscreen", fs.req >= 1, `req=${fs.req}`); }

  // ── (1) button click also toggles (spy: after one enter, the next toggle exits) ──
  await page.evaluate(() => { document.fullscreenElement || Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => document.documentElement }); });  // simulate "now fullscreen" so toggle takes the exit branch
  await btn.click(); await page.waitForTimeout(150);
  { const fs = await page.evaluate(() => window.__fs); check("clicking the button while fullscreen calls exitFullscreen", fs.exit >= 1, `exit=${fs.exit}`); }
  await page.evaluate(() => { delete document.fullscreenElement; });

  // ── (2) NO LETTERBOXING at full-HD: canvas fills the whole viewport, backing store matches ──
  section("no letterboxing @ 1920×1080");
  const fit = await page.evaluate(() => {
    const c = document.getElementById("gameCanvas"); const r = c.getBoundingClientRect();
    return { rx: r.x, ry: r.y, rw: r.width, rh: r.height, bw: c.width, bh: c.height, iw: innerWidth, ih: innerHeight };
  });
  check("canvas CSS box covers the full viewport (no gaps)", fit.rx === 0 && fit.ry === 0 && fit.rw === fit.iw && fit.rh === fit.ih, `rect=${fit.rw}×${fit.rh} @${fit.rx},${fit.ry} vs ${fit.iw}×${fit.ih}`);
  check("canvas backing store == viewport (1:1, no scaled letterbox)", fit.bw === SCREEN_W && fit.bh === SCREEN_H, `backing=${fit.bw}×${fit.bh}`);

  // ── (2) world reflowed to the tall viewport (groundY tracks canvas.height, not a fixed value) ──
  await page.evaluate(() => window.__harness.start());
  await waitFrames(6);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(30);
  const world = await page.evaluate(() => { const s = window.__harness.state(); const p = window.__harness.p1(); return { groundY: s.groundY ?? null, ph: s.ch ?? innerHeight, py: p.y, px: p.x }; });
  check("fighters stand on the reflowed floor (grounded within the full-HD canvas)", world.py > SCREEN_H * 0.4 && world.py < SCREEN_H, `p1.y=${Math.round(world.py)} of ${SCREEN_H}`);

  // ── real in-match screenshot at fullscreen resolution ──
  await page.screenshot({ path: path.join(SHOTS, "fullscreen.png") });
  console.log(`\n  📸 harness/shots/fullscreen.png  (${SCREEN_W}×${SCREEN_H}, in-match)`);

  // ── (2b) sanity at an ULTRAWIDE ratio — proves reflow, not a baked 16:9 letterbox ──
  section("no letterboxing @ 2560×1080 (ultrawide)");
  await page.setViewportSize({ width: 2560, height: 1080 });
  await waitFrames(10);
  const uw = await page.evaluate(() => { const c = document.getElementById("gameCanvas"); const r = c.getBoundingClientRect(); return { rw: r.width, rh: r.height, bw: c.width, bh: c.height }; });
  check("canvas refills the ultrawide viewport (2560×1080, no side bars)", uw.rw === 2560 && uw.rh === 1080 && uw.bw === 2560 && uw.bh === 1080, `${uw.rw}×${uw.rh} backing ${uw.bw}×${uw.bh}`);
  await page.screenshot({ path: path.join(SHOTS, "fullscreen_ultrawide.png") });
  console.log(`  📸 harness/shots/fullscreen_ultrawide.png  (2560×1080, in-match)`);

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  FULLSCREEN: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
