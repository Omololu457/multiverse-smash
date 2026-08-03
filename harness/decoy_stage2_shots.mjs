// harness/decoy_stage2_shots.mjs — DECOY SYSTEM Stage 2 EVIDENCE: independent clone movement.
// For BOTH Naruto and Minato: spawn clones, then show they APPROACH the opponent on their own
// (x-positions move toward the opponent over time) rather than standing as static props.
// Outputs harness/shots/decoy_s2_*.png. Run ALONE.
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

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cloneXs = () => page.evaluate(() => window.__harness.summons().filter(s => s.id === "shadowClone").map(s => Math.round(s.x)));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const avg = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}

async function demo(charKey) {
  console.log(`\n── ${charKey.toUpperCase()} · independent clone movement (approach-and-hold) ──`);
  await boot(charKey);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.dispelP1Clones?.(); });
  // Opponent placed FAR to the right so the clones have room to visibly travel.
  const me = await p1(); await page.evaluate(x => window.__harness.setP2X(x), me.x + 360); await waitFrames(2);
  const oppX = (await p2()).x;

  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(20);                       // clear the 16f spawn-poof so clones are in their idle (mobile) state
  const baseXs = await cloneXs();
  const baseDist = Math.round(Math.abs(avg(baseXs) - oppX));
  await shot(`decoy_s2_${charKey}_spawn.png`);
  console.log(`  clones at spawn:  x=[${baseXs.join(",")}]  (avg dist to opponent ≈ ${baseDist})`);

  await waitFrames(70);                        // let them approach
  const moveXs = await cloneXs();
  const moveDist = Math.round(Math.abs(avg(moveXs) - oppX));
  await shot(`decoy_s2_${charKey}_moved.png`);
  console.log(`  clones after 70f: x=[${moveXs.join(",")}]  (avg dist to opponent ≈ ${moveDist})`);

  check(`${charKey}: clones still present (not consumed)`, moveXs.length === baseXs.length && moveXs.length >= 1, `n=${moveXs.length}`);
  check(`${charKey}: clones MOVED toward the opponent (independent movement)`, moveDist < baseDist - 40, `dist ${baseDist} → ${moveDist}`);
}

try {
  await demo("naruto");
  await demo("minato");
  console.log(`\n${fails === 0 ? "✅" : "❌"} DECOY Stage 2 evidence: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
