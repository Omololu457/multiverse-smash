// harness/yuji_charge_shot.mjs — proves the recolored-cyan CHARGE pose fires live.
// Holds P (charge) on default-skin Yuji, asserts the sprite action == "charge" and the
// active sheet is yuji_charge_uniform.png, and captures a cropped screenshot of the aura.
// Also spot-checks a recolor skin (crimson) so the skin-agnostic cyan copy is confirmed on disk.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
page.on("pageerror", e => errors.push(String(e)));

const chargeState = () => page.evaluate(() => window.__harness.chargeAura?.("p1"));
const cam = () => page.evaluate(() => window.__harness.camera?.());
const snap = () => page.evaluate(() => window.__harness.p1?.());

async function cropShot(name) {
  const p = await snap(); const c = await cam();
  let clip;
  if (p && c) {
    const sx = (p.x - c.x) * c.zoom + 640, sy = (p.y - c.y) * c.zoom + 360;
    const pad = 90;
    const x0 = Math.max(0, sx - pad), y0 = Math.max(0, sy - pad - 40);
    clip = { x: x0, y: y0, width: Math.min(1280 - x0, 220), height: Math.min(720 - y0, 240) };
  }
  await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) });
}

await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await page.evaluate(() => window.__harness.setSession?.({ dummyBehavior: "stand" }));
await sleep(300);
await page.evaluate(() => { window.__harness.setP1X?.(560); window.__harness.setP2X?.(720); });
await sleep(300);

let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) { pass++; console.log("  ✔", msg); } else { fail++; console.log("  ✗ FAIL", msg); } };

// ── DEFAULT SKIN CHARGE ──
// drain a bit of energy first so charging has something to build (and to prove the state holds)
await page.keyboard.down("p");
await sleep(260);                                   // let isCharging + pose settle
const st = await chargeState();
console.log("charge state:", JSON.stringify(st));
check(st?.charging === true, "isCharging true while holding P");
check(st?.action === "charge", `sprite action == 'charge' (got ${st?.action})`);
check(/yuji_charge_uniform\.png/.test(st?.spriteSheet || ""), `active sheet is yuji_charge_uniform.png (got ${st?.spriteSheet})`);
await cropShot("yuji_charge_default.png");
await page.keyboard.up("p");
await sleep(200);
const rel = await chargeState();
check(rel?.charging === false, "isCharging clears on release");

// ── SKIN-AGNOSTIC COPY (crimson) ──
await page.evaluate(() => window.__harness.setSkin?.("p1", "yujiCrimson"));
await sleep(300);
await page.keyboard.down("p");
await sleep(220);
const stc = await chargeState();
console.log("crimson charge state:", JSON.stringify(stc));
check(stc?.action === "charge", `crimson skin also plays charge pose (got ${stc?.action})`);
check(/yuji_charge_uniform__crimson\.png/.test(stc?.spriteSheet || ""), `crimson uses its charge copy (got ${stc?.spriteSheet})`);
await cropShot("yuji_charge_crimson.png");
await page.keyboard.up("p");

check(errors.length === 0, `no page errors (${errors.length})`);
console.log(`\nCHARGE SHOT: ${pass} passed, ${fail} failed → harness/shots/yuji_charge_{default,crimson}.png`);
if (errors.length) console.log("ERRORS:", errors.slice(0, 5));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
