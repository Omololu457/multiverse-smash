// harness/feedback_stage2_shots.mjs
// Stage-2 evidence for Feedback normals. (1) Renders each of the 5 normals
// (light/heavy/up/air/down_air) via the real SpriteHandler and writes a montage,
// proving each resolves to the electric-shot pose (not the 128² box). (2) Drives
// the REAL input path (j=light, k=heavy, i=up) against a dummy in range and
// measures p2 health drop, proving the normals CONNECT.
//   node harness/feedback_stage2_shots.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "feedback_stage2_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGE ERROR:", e.message));

const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

const info = await page.evaluate(() => window.__harness.benForm("feedback"));
console.log(`  Feedback form set: activeAlien=${info.activeAlien} hasSkinAnim=${info.hasSkinAnim}\n`);

// ── (1) RENDER MONTAGE of the 5 normals ──
const NORMALS = ["light", "heavy", "up", "air", "down_air"];
const crops = [];
for (const a of NORMALS) {
  await page.evaluate(x => window.__harness.benPose(x, "p1"), a);
  await waitFrames(1); await page.waitForTimeout(140);
  const shot = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); const i = window.__harness.renderInfo("p1"); window.__harness.benPose(null, "p1"); return { dataURL: c?.dataURL || null, w: c?.contentW || 0, h: c?.contentH || 0, action: i?.action }; });
  crops.push({ pose: a, ...shot });
  const boxlike = shot.w >= 120 && shot.h >= 120;
  console.log(`  render ${a.padEnd(9)} action=${String(shot.action).padEnd(6)} body=${shot.w}x${shot.h}px ${boxlike ? "⚠ BOX" : "✓"}`);
}
const montage = await page.evaluate(async ({ crops, label }) => {
  const GAP = 20, PAD = 24, FLOOR = 30, LABEL = 28;
  const imgs = [];
  for (const c of crops) { if (!c.dataURL) { imgs.push(null); continue; } const im = new Image(); im.src = c.dataURL; await im.decode().catch(() => {}); imgs.push(im); }
  const maxH = Math.max(1, ...imgs.filter(Boolean).map(i => i.height));
  const totalW = PAD * 2 + imgs.reduce((s, i) => s + (i ? i.width : 40) + GAP, 0);
  const cv = document.createElement("canvas"); cv.width = totalW; cv.height = LABEL + PAD + maxH + FLOOR;
  const g = cv.getContext("2d"); g.fillStyle = "#1e293b"; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#fff"; g.font = "bold 16px Arial"; g.fillText(label, PAD, 20);
  const floorY = LABEL + PAD + maxH; g.strokeStyle = "#475569"; g.beginPath(); g.moveTo(0, floorY); g.lineTo(cv.width, floorY); g.stroke();
  let x = PAD; g.font = "12px Arial";
  for (let i = 0; i < imgs.length; i++) { const im = imgs[i]; if (im) g.drawImage(im, x, floorY - im.height); g.fillStyle = "#93c5fd"; g.fillText(`${crops[i].pose} (${crops[i].action})`, x, floorY + 18); x += (im ? im.width : 40) + GAP; }
  return cv.toDataURL("image/png");
}, { crops, label: "Feedback — Stage 2 normals (all reuse electric-shot pose)" });
fs.writeFileSync(path.join(OUT, `_montage_normals.png`), Buffer.from(montage.split(",")[1], "base64"));

// ── (2) CONNECT TEST: ground normals land damage on a dummy in range ──
console.log("");
const KEYS = { light: "j", heavy: "k", up: "i" };
for (const [name, key] of Object.entries(KEYS)) {
  await settle();
  const a = await page.evaluate(() => window.__harness.p1());
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 52);
  await waitFrames(2);
  const hpBefore = (await page.evaluate(() => window.__harness.p2())).health;
  await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key);
  await waitFrames(22);
  const hpAfter = (await page.evaluate(() => window.__harness.p2())).health;
  const dmg = hpBefore - hpAfter;
  console.log(`  connect ${name.padEnd(6)} (key ${key}) → p2 HP ${hpBefore}→${hpAfter}  Δ=${dmg}  ${dmg > 0 ? "✓ HIT" : "✗ no hit"}`);
}

await browser.close();
server.close();
console.log(`\n  wrote normals montage → harness/feedback_stage2_out/_montage_normals.png`);
