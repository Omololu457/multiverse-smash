// harness/feedback_stage1_shots.mjs
// Stage-1 RENDER EVIDENCE for the Feedback Omnitrix form. Drives the REAL
// applyAlien/_skinAnim swap via __harness.benForm("feedback"), poses the live
// fighter (idle/run/jump/guard/hurt), renders through the production
// SpriteHandler.draw() path (__harness.spriteCrop), writes a PNG per pose +
// a montage, and prints resolved action + body px (proving it's not the 128² box).
//   node harness/feedback_stage1_shots.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "feedback_stage1_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGE ERROR:", e.message));

await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

const POSES = ["idle", "run", "jump", "guard", "hurt"];
const info = await page.evaluate(() => window.__harness.benForm("feedback"));
console.log(`  Feedback form set: activeAlien=${info.activeAlien} name="${info.name}" hasSkinAnim=${info.hasSkinAnim}`);

const rows = [];
const crops = [];
for (const pose of POSES) {
  await page.evaluate(p => window.__harness.benPose(p, "p1"), pose);
  await page.waitForTimeout(300);
  const shot = await page.evaluate(() => {
    const crop = window.__harness.spriteCrop("p1");
    const info = window.__harness.renderInfo("p1");
    window.__harness.benPose(null, "p1");
    return { dataURL: crop?.dataURL || null, w: crop ? crop.contentW : 0, h: crop ? crop.contentH : 0, action: info?.action || null };
  });
  const file = `feedback_${pose}.png`;
  if (shot.dataURL) fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.dataURL.split(",")[1], "base64"));
  rows.push({ pose, action: shot.action, w: shot.w, h: shot.h, ok: !!shot.dataURL });
  crops.push({ pose, ...shot });
  console.log(`  feedback ${pose.padEnd(6)} action=${String(shot.action).padEnd(6)} body=${shot.w}x${shot.h}px`);
}

const montage = await page.evaluate(async ({ crops, label }) => {
  const GAP = 20, PAD = 24, FLOOR = 30, LABEL = 28;
  const imgs = [];
  for (const c of crops) { if (!c.dataURL) { imgs.push(null); continue; } const im = new Image(); im.src = c.dataURL; await im.decode().catch(() => {}); imgs.push(im); }
  const maxH = Math.max(1, ...imgs.filter(Boolean).map(i => i.height));
  const totalW = PAD * 2 + imgs.reduce((s, i) => s + (i ? i.width : 40) + GAP, 0);
  const cv = document.createElement("canvas"); cv.width = totalW; cv.height = LABEL + PAD + maxH + FLOOR;
  const g = cv.getContext("2d");
  g.fillStyle = "#1e293b"; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#fff"; g.font = "bold 16px Arial"; g.fillText(label, PAD, 20);
  const floorY = LABEL + PAD + maxH;
  g.strokeStyle = "#475569"; g.beginPath(); g.moveTo(0, floorY); g.lineTo(cv.width, floorY); g.stroke();
  let x = PAD;
  g.font = "12px Arial";
  for (let i = 0; i < imgs.length; i++) {
    const im = imgs[i];
    if (im) g.drawImage(im, x, floorY - im.height);
    g.fillStyle = "#93c5fd"; g.fillText(`${crops[i].pose} (${crops[i].action})`, x, floorY + 18);
    x += (im ? im.width : 40) + GAP;
  }
  return cv.toDataURL("image/png");
}, { crops, label: "Feedback (Conductoid) — Stage 1 movement/state" });
fs.writeFileSync(path.join(OUT, `_montage_feedback.png`), Buffer.from(montage.split(",")[1], "base64"));

await browser.close();
server.close();
const boxHits = rows.filter(r => r.w >= 120 && r.h >= 120);
console.log(`\n  wrote ${rows.length} crops + montage → harness/feedback_stage1_out/`);
console.log(`  fallback-box suspects (>=120² body): ${boxHits.length ? boxHits.map(r => r.pose).join(", ") : "none"}`);
