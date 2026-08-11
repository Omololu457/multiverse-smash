// harness/momentum_shots.mjs — STAGE 4 VISUAL/LOG evidence. Boots the REAL game headless, builds forward
// velocity on a real character, RELEASES the direction, then attacks — sampling the attacker's x + vx each
// frame. With momentum preservation the attacker keeps DRIFTING FORWARD through the swing (vx decays on the
// gentle ~0.90 attack friction, not the 0.72 idle brake), so a combo reads as continuous forward motion.
// Compares the moving-attack drift to the idle-brake drift, on two characters. Gate = momentum.test.mjs.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
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
const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const frame = async () => (await page.evaluate(() => window.__harness.state().frame));
async function waitFrames(n) { const s = await frame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());

async function boot(char) {
  await page.goto(`${base}/index.html?harness=1&p1=${char}&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);
}

// Build rightward velocity, release, then act; sample x each frame for N frames. `attack`=true holds Light.
async function driftTrace(char, attack, n = 14) {
  await boot(char);
  // Park the dummy well clear so the fighter builds FULL run velocity without colliding into it first
  // (the momentum we want to show is the fighter's own inbound speed carrying through the swing).
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 360); });
  await page.keyboard.down("d"); await waitFrames(12);   // build full run velocity
  if (attack) {
    // Start the attack WHILE still moving, wait until it's actually active, THEN release the direction —
    // so the swing begins at full speed and the ONLY thing carrying the fighter forward is the attack
    // friction (not held input). This removes the per-character input-timing skew.
    await page.keyboard.down("j");
    await page.waitForFunction(() => window.__harness.p1().attacking, null, { timeout: 3000, polling: 8 }).catch(() => {});
    await page.keyboard.up("d");
  } else {
    await page.keyboard.up("d");   // idle baseline: just release and coast
  }
  const xs = [], vxs = [];
  for (let i = 0; i < n; i++) { const s = await p1(); xs.push(Math.round(s.x)); vxs.push(+s.vx.toFixed(2)); await waitFrames(1); }
  if (attack) { await page.screenshot({ path: path.join(OUT, `momentum_${char}.png`) }); await page.keyboard.up("j"); }
  return { drift: xs[xs.length - 1] - xs[0], xs, vxs };
}

// sasuke + naruto = standard-movement melee (their normals don't root), so the demo cleanly builds full
// run velocity into the swing. Chars whose light roots movement stay stationary by design (no glide to show).
for (const char of ["sasuke", "naruto"]) {
  const atk = await driftTrace(char, true);
  const idle = await driftTrace(char, false);
  console.log(`\n[${char}]`);
  console.log(`  MOVING ATTACK  — forward drift ${atk.drift}px   vx: ${atk.vxs.slice(0, 8).join(" → ")} …`);
  console.log(`  IDLE (no atk)  — forward drift ${idle.drift}px   vx: ${idle.vxs.slice(0, 8).join(" → ")} …`);
  console.log(`  → attack carries ${(atk.drift / Math.max(1, idle.drift)).toFixed(1)}× the idle drift  (screenshot: harness/shots/momentum_${char}.png)`);
}
await browser.close();
server.close();
process.exit(0);
