// harness/ben10_stage1_shots.mjs
// Stage-1 RENDER EVIDENCE for Ben 10 (transform model). For each form
// (human / xlr8 / diamondhead) it drives the REAL applyAlien/_skinAnim swap via
// __harness.benForm, poses the live fighter (idle/run/jump/hurt), renders it through
// the production SpriteHandler.draw() path (__harness.spriteCrop), and writes a PNG
// per (form,pose) + a per-form montage. Also prints the resolved action + body px so
// we can prove the right sprite set/pose rendered (not the 128² fallback box).
//   node harness/ben10_stage1_shots.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "ben10_stage1_out");
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

// pose setter: mutate the live fighter so determineAction resolves the target action,
// then crop — all inside ONE evaluate so no rAF frame reverts the fields mid-capture.
const POSES = ["idle", "run", "jump", "hurt"];
const FORMS = [
  { key: "human", label: "Ben (human)" },
  { key: "xlr8", label: "XLR8" },
  { key: "diamondhead", label: "Diamondhead" },
];

const rows = [];
for (const form of FORMS) {
  const info = await page.evaluate(k => window.__harness.benForm(k), form.key);
  const cropsForForm = [];
  for (const pose of POSES) {
    // Hold the forced action for a few real frames first so the main-loop draw triggers
    // the on-demand _loadSheet() and the PNG decodes before we crop (else a first-time
    // sheet is img.complete=false → sprite.js draws its fallback box).
    await page.evaluate(p => window.__harness.benPose(p, "p1"), pose);
    await page.waitForTimeout(300);
    const shot = await page.evaluate(() => {
      const crop = window.__harness.spriteCrop("p1");       // renders via the real SpriteHandler.draw
      const info = window.__harness.renderInfo("p1");
      window.__harness.benPose(null, "p1");                 // release
      return { dataURL: crop?.dataURL || null, w: crop ? crop.contentW : 0, h: crop ? crop.contentH : 0, action: info?.action || null };
    });
    const file = `${form.key}_${pose}.png`;
    if (shot.dataURL) fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.dataURL.split(",")[1], "base64"));
    rows.push({ form: form.label, pose, action: shot.action, w: shot.w, h: shot.h, ok: !!shot.dataURL });
    cropsForForm.push({ pose, ...shot });
    console.log(`  ${form.label.padEnd(14)} ${pose.padEnd(5)} action=${String(shot.action).padEnd(6)} body=${shot.w}x${shot.h}px  hasSkinAnim=${info?.hasSkinAnim}`);
  }
  // per-form montage (feet-aligned row)
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
  }, { crops: cropsForForm, label: form.label });
  fs.writeFileSync(path.join(OUT, `_montage_${form.key}.png`), Buffer.from(montage.split(",")[1], "base64"));
}

await browser.close();
server.close();
const boxHits = rows.filter(r => r.w >= 120 && r.h >= 120); // 128² fallback box heuristic
console.log(`\n  wrote ${rows.length} crops + 3 montages → harness/ben10_stage1_out/`);
console.log(`  fallback-box suspects (>=120² body): ${boxHits.length ? boxHits.map(r => r.form + "/" + r.pose).join(", ") : "none"}`);
