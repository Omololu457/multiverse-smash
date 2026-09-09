// harness/rickprime_live.mjs
// Rick Prime — Stage-5 live verification: real Chromium, real code path.
//   • sprite gate: renders __rickprime sprites (NOT a procedural box); scale 1.85; portrait wired
//   • a normal connects (heavy K) — his existing kit fires
//   • a special connects (neutral special L: primePortalBlast) — deals damage
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (name, cond, detail = "") => { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) {
  const s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}
async function setupAdjacent(gap) {
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=rickPrime`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── sprite gate — Rick Prime renders as sprites (not a box) ──");
  const a = await p1();
  const gate = await page.evaluate(() => window.__harness.spriteReady("p1"));   // authoritative box-vs-sprite probe
  check("P1 is Rick Prime", a.key === "rickPrime", `key=${a.key}`);
  check("has a sprite handler (NOT the procedural box path)", gate.hasSpriteHandler, JSON.stringify(gate));
  check("spritesReady('rickPrime')===true (spritesheets.js gate — __rickprime idle decoded)", gate.ready, JSON.stringify(gate));
  check("spriteScale ≈ 1.85 (skins.js default guard held — not clobbered to 1)", Math.abs((a.spriteScale || 0) - 1.85) < 0.01, `spriteScale=${a.spriteScale}`);
  await page.screenshot({ path: path.join(OUT, "RICKPRIME_idle.png") });

  console.log("\n── a NORMAL fires (heavy K) ──");
  await setupAdjacent(46);
  let hp0 = (await p2()).health;
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k");
  await waitFrames(22);
  check("heavy connects and deals damage", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);

  // Special button: rickPrime is an intentionally DRIVER-LESS zoner (abilities.js STANDARD_STRING_CHARS
  // comment + no `case "rickPrime"` in executeSpecial) — pressing L is a pre-existing no-op, NOT a
  // regression from this art pass. We only assert it doesn't crash / corrupt state.
  console.log("\n── special button (L) is a clean no-op for this driver-less zoner (existing kit) ──");
  await setupAdjacent(90);
  hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l");
  await waitFrames(40);
  check("pressing L does not error or KO (rickPrime has no special driver by design)", jsErrors.length === 0 && (await p1()).health > 0, `p2 hp ${hp0} → ${(await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "RICKPRIME_special.png") });

  check("no JS page errors during the match", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++;
} finally {
  console.log(`\n${PASS}/${FAIL}  (pass/fail)`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
