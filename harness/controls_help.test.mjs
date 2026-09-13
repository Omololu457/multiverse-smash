// Temp smoke: prove the Track A Controls overlay opens from pause (device-aware) and backs out.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const H = fn => page.evaluate(fn);
const padNav = opts => page.evaluate(o => window.__harness.padNav(o), opts);
try {
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.padNav, null, { timeout: 15000 });
  await H(() => window.__harness.boot());
  await page.waitForTimeout(200);
  // Open pause via Start (Options), then d-pad down to "controls".
  await padNav({ start: true }); await page.waitForTimeout(50);
  const st0 = await H(() => window.__harness.pauseSel());
  check("pause menu opened", st0.gameState === "paused", `gs=${st0.gameState} item=${st0.item}`);
  // Walk down until item === controls (max 8 steps).
  let found = null;
  for (let i = 0; i < 8; i++) { const s = await H(() => window.__harness.pauseSel()); if (s.item === "controls") { found = s; break } await padNav({ down: true }); await page.waitForTimeout(20); }
  check("'controls' item reachable in pause", !!found, found ? `idx=${found.index}` : "not found");
  await padNav({ confirm: true }); await page.waitForTimeout(60);
  const gs = await H(() => window.__harness.state?.().gameState ?? window.__harness.padMenuState().gameState);
  check("selecting Controls opens the overlay", gs === "controlsHelp", `gs=${gs}`);
  await page.screenshot({ path: path.join(SHOTS, "controls_help.png") });
  // Back out (Circle).
  await padNav({ back: true }); await page.waitForTimeout(60);
  const gs2 = await H(() => window.__harness.padMenuState().gameState);
  check("Circle backs out to pause", gs2 === "paused", `gs=${gs2}`);
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); }
console.log(`\n  CONTROLS-HELP SMOKE: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
