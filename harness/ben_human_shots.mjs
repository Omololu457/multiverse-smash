// harness/ben_human_shots.mjs
// Ben Tennyson (HUMAN form) full-kit RENDER EVIDENCE. Drives benForm("human"), forces each pose via
// benPose, renders through the production SpriteHandler.draw (spriteCrop), writes a PNG per pose + a
// montage. Prints resolved action + body px. Tag argv[2] (e.g. "before"/"after") suffixes the out dir.
//   node harness/ben_human_shots.mjs before
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = process.argv[2] || "shots";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", `ben_human_${TAG}`);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGE ERROR:", e.message));
await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

const info = await page.evaluate(() => window.__harness.benForm("human"));
console.log(`  Ben form: transformed=${info.transformed} hasSkinAnim=${info.hasSkinAnim} (human = base characters.ben10.animationData)`);

const POSES = ["idle", "run", "jump", "light", "heavy", "up", "air", "down_air", "benHover", "taunt", "transform"];
const crops = [];
for (const pose of POSES) {
  await page.evaluate(p => window.__harness.benPose(p, "p1"), pose);
  await page.waitForTimeout(280);
  const shot = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); const i = window.__harness.renderInfo("p1"); window.__harness.benPose(null, "p1"); return { dataURL: c?.dataURL || null, w: c?.contentW || 0, h: c?.contentH || 0, action: i?.action }; });
  if (shot.dataURL) fs.writeFileSync(path.join(OUT, `${pose}.png`), Buffer.from(shot.dataURL.split(",")[1], "base64"));
  crops.push({ pose, ...shot });
  console.log(`  ${pose.padEnd(10)} action=${String(shot.action).padEnd(10)} body=${shot.w}x${shot.h}px`);
}
const montage = await page.evaluate(async ({ crops, label }) => {
  const GAP = 16, PAD = 20, FLOOR = 30, LABEL = 26;
  const imgs = [];
  for (const c of crops) { if (!c.dataURL) { imgs.push(null); continue; } const im = new Image(); im.src = c.dataURL; await im.decode().catch(() => {}); imgs.push(im); }
  const maxH = Math.max(1, ...imgs.filter(Boolean).map(i => i.height));
  const totalW = PAD * 2 + imgs.reduce((s, i) => s + (i ? i.width : 40) + GAP, 0);
  const cv = document.createElement("canvas"); cv.width = totalW; cv.height = LABEL + PAD + maxH + FLOOR;
  const g = cv.getContext("2d"); g.fillStyle = "#1e293b"; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#fff"; g.font = "bold 15px Arial"; g.fillText(label, PAD, 18);
  const floorY = LABEL + PAD + maxH; g.strokeStyle = "#475569"; g.beginPath(); g.moveTo(0, floorY); g.lineTo(cv.width, floorY); g.stroke();
  let x = PAD; g.font = "11px Arial";
  for (let i = 0; i < imgs.length; i++) { const im = imgs[i]; if (im) g.drawImage(im, x, floorY - im.height); g.fillStyle = "#93c5fd"; g.fillText(`${crops[i].pose}`, x, floorY + 16); x += (im ? im.width : 40) + GAP; }
  return cv.toDataURL("image/png");
}, { crops, label: `Ben Tennyson (human) — full kit [${TAG}]` });
fs.writeFileSync(path.join(OUT, `_montage.png`), Buffer.from(montage.split(",")[1], "base64"));

await browser.close(); server.close();
console.log(`\n  wrote ${crops.length} crops + montage → harness/ben_human_${TAG}/`);
