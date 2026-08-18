// harness/height_reference.mjs — CHARACTER-HEIGHT REFERENCE audit + montage.
//
// STEP 1 (reference block) + STEP 3 (audit) instrumentation. For every sprite character it boots the
// real game, waits for the idle sheet to decode, and measures the VISIBLE BODY pixel height through the
// production SpriteHandler.draw() path (window.__harness.measureSprite → alpha bounding box). That is the
// constant-conditions "measured under identical conditions" number the methodology requires.
//
// It also grabs each character's trimmed idle bitmap (__harness.spriteCrop) and composites a single
// feet-aligned full-roster montage PNG so the relative heights are directly eyeball-able.
//
//   node harness/height_reference.mjs                 → measure + montage → shots/height_roster_<tag>.png
//   node harness/height_reference.mjs before          → tag the montage "before"
//   node harness/height_reference.mjs after           → tag the montage "after"
//
// Prints a machine-readable JSON block (MEASURE_JSON) so a follow-up step can diff before/after.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = process.argv[2] || "current";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

// Sprite characters (hasSprites:true), in roster order.
const CHARS = (process.env.HR_CHARS ? process.env.HR_CHARS.split(",") : [
  "goku", "vegeta", "gojo", "sukuna", "naruto", "sasuke", "itachi",
  "tobirama", "minato", "zenitsu", "rick", "omega_ranger", "omniman", "netero", "goku_black",
  "beerus", "saiki", "killua", "flash", "gon", "batman", "hisoka",
  "rengoku", "shinobu", "samurai_red_ranger", "gold_samurai_ranger", "chrollo", "superman", "ben10",
  // built since the 2026-08-01 pass:
  "maki", "green_samurai_ranger", "ghostface", "miwa",
  // built since the 2026-08-03 pass (were never in the audit list):
  "yuji", "madara",
  // built 2026-08-12, after the §8 pass — never measured until now (idle is a wide forward-lunge crouch,
  // so his standing height is calibrated off the upright frame; see characters.js hashirama spriteScale note):
  "hashirama",
]);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const results = [];
const crops = [];
for (const char of CHARS) {
  await page.goto(`${base}/index.html?harness=1&p1=${char}&p2=${char}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  // Wait for the fighter to exist AND its idle sheet to decode (else measureSprite reads the box).
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});
  // A few frames so the idle animation settles on its rest pose.
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(f => window.__harness.state().frame >= f + 10, s0, { timeout: 8000, polling: 16 }).catch(() => {});
  const m = await page.evaluate(() => window.__harness.measureSprite("p1"));
  const c = await page.evaluate(() => window.__harness.spriteCrop("p1"));
  const scale = await page.evaluate(() => window.__harness.p1()?.spriteScale ?? null);
  results.push({ char, scale, ...(m || { contentH: 0, contentW: 0, cellDstH: null, action: null, clipped: false }) });
  crops.push({ char, dataURL: c?.dataURL || null, contentH: c?.contentH || (m?.contentH || 0), contentW: c?.contentW || (m?.contentW || 0) });
  const r = results[results.length - 1];
  console.log(`  ${char.padEnd(14)} scale=${String(r.scale).padEnd(5)} bodyPx=${String(r.contentH).padStart(4)}  widthPx=${String(r.contentW).padStart(4)}  action=${r.action}${r.clipped ? "  ⚠CLIPPED" : ""}`);
}

// ── Composite the feet-aligned roster montage ────────────────────────────────
const montage = await page.evaluate(async ({ crops }) => {
  const GAP = 24, PAD = 40, FLOOR_PAD = 60, LABEL_H = 40;
  const imgs = [];
  let maxH = 0, totalW = 0;
  for (const c of crops) {
    if (!c.dataURL) { imgs.push(null); continue; }
    const img = new Image();
    await new Promise(res => { img.onload = res; img.src = c.dataURL; });
    imgs.push(img);
    maxH = Math.max(maxH, img.height);
    totalW += img.width + GAP;
  }
  const W = totalW + PAD * 2, H = maxH + FLOOR_PAD + LABEL_H + PAD;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "#141821"; g.fillRect(0, 0, W, H);
  const floorY = H - FLOOR_PAD - LABEL_H;
  // faint reference grid every 20px above the floor (each line = a "reference-block" tick)
  g.strokeStyle = "rgba(255,255,255,0.06)"; g.lineWidth = 1;
  for (let y = floorY; y > PAD; y -= 20) { g.beginPath(); g.moveTo(PAD, y); g.lineTo(W - PAD, y); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(PAD, floorY); g.lineTo(W - PAD, floorY); g.stroke();
  g.imageSmoothingEnabled = false;
  g.textAlign = "center"; g.font = "13px monospace"; g.fillStyle = "#cbd5e1";
  let x = PAD;
  for (let i = 0; i < crops.length; i++) {
    const img = imgs[i], c = crops[i];
    if (img) { g.drawImage(img, x, floorY - img.height); }
    g.fillStyle = "#e2e8f0"; g.fillText(c.char, x + (img ? img.width : 40) / 2, floorY + 18);
    g.fillStyle = "#64748b"; g.fillText(`${c.contentH}px`, x + (img ? img.width : 40) / 2, floorY + 34);
    x += (img ? img.width : 40) + GAP;
  }
  return cv.toDataURL("image/png");
}, { crops });

const outPng = path.join(ROOT, "harness", "shots", `height_roster_${TAG}.png`);
fs.writeFileSync(outPng, Buffer.from(montage.split(",")[1], "base64"));
console.log(`\nMontage → ${path.relative(ROOT, outPng)}`);

console.log("\nMEASURE_JSON " + JSON.stringify(results));
const jsonOut = path.join(ROOT, "harness", "shots", `height_measure_${TAG}.json`);
fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
console.log(`Measurements → ${path.relative(ROOT, jsonOut)}`);

await browser.close();
server.close();
process.exit(0);
