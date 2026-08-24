// harness/spiderman_webswing.mjs — WEB-SWING air-mobility mechanic.
// AIR + Up + Special → shoots a web to a sky anchor and PENDULUM-swings; Special again → releases (fling).
// Verifies: enters the swing (spiderSwing cast + _swinging), the position ARCS (pendulum, not a straight
// fall), it holds the swing over time, a manual release flings with real velocity, auto-release on the
// timer cap, and no JS errors. Deterministic via liftP1 + p1SpecialDir.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function startSwing() {
  await waitGrounded(); await page.evaluate(() => window.__harness.fillEnergy());
  await page.evaluate(() => window.__harness.liftP1(120)); await waitFrames(1);
  return page.evaluate(() => window.__harness.p1SpecialDir("U"));
}
try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── enter web-swing (AIR + Up + Special) ──");
  const res = await startSwing();
  check("casts spiderSwing", res?.cast === "spiderSwing", `cast=${res?.cast}`);
  await waitFrames(2); const s0 = await p1();
  check("_swinging active", s0.swinging === true, `swinging=${s0.swinging}`);
  check("renders spiderman_swing sprite", (s0.spriteSheet || "").includes("spiderman_swing"), `sheet=${s0.spriteSheet}`);

  console.log("\n── the swing ARCS (pendulum, not a straight fall) ──");
  const pathPts = [];
  for (let i = 0; i < 10; i++) { const p = await p1(); pathPts.push({ x: Math.round(p.x), y: Math.round(p.y), sw: p.swinging }); await waitFrames(2); }
  const xs = pathPts.map(p => p.x), ys = pathPts.map(p => p.y);
  const xMoved = Math.max(...xs) - Math.min(...xs), yRange = Math.max(...ys) - Math.min(...ys);
  check("swings horizontally (x travels)", xMoved > 30, `xMoved=${xMoved}`);
  check("arcs vertically (y changes, not a flat line)", yRange > 15, `yRange=${yRange}`);
  // ARC (not a fall): a straight fall is vertical-only (xMoved≈0). A pendulum couples large horizontal
  // travel WITH the height change → xMoved is a big fraction of (or exceeds) yRange, moving every frame.
  const monotonicX = xs.every((v, i) => i === 0 || Math.abs(v - xs[i - 1]) >= 1);   // keeps moving sideways (not a vertical fall that stalls in x)
  check("follows a swing ARC (large horizontal travel coupled with height change, not a vertical fall)", xMoved > yRange && monotonicX, `xMoved=${xMoved} yRange=${yRange}`);

  console.log("\n── manual release flings (Special while swinging) ──");
  const rel = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  await waitFrames(1); const r0 = await p1();
  check("release ends the swing", r0.swinging === false, `swinging=${r0.swinging}`);
  check("release imparts real velocity (fling)", Math.hypot(r0.vx, r0.vy) > 3, `|v|=${Math.hypot(r0.vx, r0.vy).toFixed(1)} vx=${r0.vx.toFixed(1)} vy=${r0.vy.toFixed(1)}`);
  await waitGrounded();

  console.log("\n── auto-release on the duration cap ──");
  await startSwing(); await waitFrames(2);
  check("swinging again", (await p1()).swinging === true);
  // never release manually → the ~1.7s cap (or floor) must end it on its own
  let ended = false;
  for (let f = 0; f < 130; f++) { await waitFrames(1); if (!(await p1()).swinging) { ended = true; break; } }
  check("auto-releases (timer cap / floor) — never swings forever", ended, "");
  await waitGrounded();

  console.log("\n── grounded Up+Special is still the Handstand (not a swing) ──");
  await waitGrounded();
  const gnd = await page.evaluate(() => window.__harness.p1SpecialDir("U"));
  check("ground Up = Handstand, not swing", (await p1()).swinging === false, `move=${gnd?.move} cast=${gnd?.cast}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man WEB-SWING: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
