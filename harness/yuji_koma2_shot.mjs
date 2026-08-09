// harness/yuji_koma2_shot.mjs — captures the trimmed Koma Attack 2 FINISHER as its own distinct
// pose. Fires the Ultimate → Koma flurry, mashes to the cap so it auto-chains into the koma2 finisher,
// then screenshots the instant komaState reports phase=="finisher" playing sheet yuji_koma2_uniform.png.
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
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const koma = () => page.evaluate(() => window.__harness.komaState?.("p1"));
const cam = () => page.evaluate(() => window.__harness.camera?.());
const snap = () => page.evaluate(() => window.__harness.p1?.());

async function cropShot(name) {
  const p = await snap(); const c = await cam();
  let clip;
  if (p && c) { const sx = (p.x - c.x) * c.zoom + 640, sy = (p.y - c.y) * c.zoom + 360, pad = 100;
    const x0 = Math.max(0, sx - pad), y0 = Math.max(0, sy - pad - 30);
    clip = { x: x0, y: y0, width: Math.min(1280 - x0, 260), height: Math.min(720 - y0, 250) }; }
  await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) });
}

await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await page.evaluate(() => window.__harness.setSession?.({ dummyBehavior: "stand" }));
await sleep(300);
await page.evaluate(() => { window.__harness.setP1X?.(560); window.__harness.setP2X?.(624); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); });
await sleep(300);

let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; console.log("  ✔", m); } else { fail++; console.log("  ✗ FAIL", m); } };

const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.sheet));
// Fire Ultimate → wait for cinematic to lift into Koma flurry
await page.keyboard.down("u"); await sleep(40); await page.keyboard.up("u");
await sleep(1000);   // build (54f) then flurry begins
// Mash to drive the flurry to its cap → auto-chain into the koma2 finisher
let sawFinisher = false, finSheet = null, finFrames = 0, sawBurst = false, sawFinFx = false, flurryShot = false;
for (let i = 0; i < 40 && !sawFinisher; i++) {
  await page.keyboard.down("j"); await sleep(25); await page.keyboard.up("j"); await sleep(25);
  const sheets = await projNames();
  if (sheets.some(s => /yuji_koma_burst_uniform/.test(s || ""))) { sawBurst = true; if (!flurryShot) { flurryShot = true; await cropShot("yuji_koma_flurry_burst.png"); } }
  if (sheets.some(s => /yuji_koma_finfx_uniform/.test(s || ""))) sawFinFx = true;
  const k = await koma();
  if (k?.phase === "finisher") { sawFinisher = true; finSheet = k.spriteSheet; await cropShot("yuji_koma2_finisher.png"); }
}
// keep sampling THROUGH the finisher's hit beat (lands ~frame 26/40) to catch the ground-burst FX
if (sawFinisher) {
  for (let i = 0; i < 24 && !sawFinFx; i++) {
    await sleep(30);
    const sheets = await projNames();
    if (sheets.some(s => /yuji_koma_finfx_uniform/.test(s || ""))) { sawFinFx = true; await cropShot("yuji_koma2_finisher_mid.png"); }
  }
  if (!sawFinFx) await cropShot("yuji_koma2_finisher_mid.png");
}
console.log("finisher sheet:", finSheet);
check(sawFinisher, "Koma flurry auto-chained into the koma2 FINISHER phase");
check(/yuji_koma2_uniform\.png/.test(finSheet || ""), `finisher plays yuji_koma2_uniform.png (got ${finSheet})`);
check(sawBurst, "flurry hits spawn the large red burst FX (yuji_koma_burst_uniform / ultimate_effect)");
check(sawFinFx, "finisher hit spawns the ground-burst FX (yuji_koma_finfx_uniform / ultimate_effect_1)");
check(errors.length === 0, `no page errors (${errors.length})`);

console.log(`\nKOMA2 SHOT: ${pass} passed, ${fail} failed → harness/shots/yuji_koma2_finisher{,_mid}.png`);
if (errors.length) console.log("ERRORS:", errors.slice(0, 4));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
