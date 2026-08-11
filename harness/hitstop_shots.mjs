// harness/hitstop_shots.mjs — STAGE 1 VISUAL evidence. Boots the REAL game headless and
// captures a screenshot of a real character pinned mid hit-stop (one light, one heavy, one
// special, on three different characters), printing the live hitstop reading at capture time.
// Not a pass/fail gate — the deterministic gate is hitstop.test.mjs. Outputs to harness/shots/.
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

const cases = [
  { p1: "sasuke", p2: "maki",   cat: "light" },
  { p1: "rick",   p2: "gojo",   cat: "heavy" },
  { p1: "naruto", p2: "sukuna", cat: "special" },
];

async function frame() { return (await page.evaluate(() => window.__harness.state())).frame; }
async function waitFrames(n) { const s = await frame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

const results = [];
for (const c of cases) {
  await page.goto(`${base}/index.html?harness=1&p1=${c.p1}&p2=${c.p2}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);
  // Position the dummy attacker right next to P1 so its forced swing connects.
  const a = await page.evaluate(() => window.__harness.p1());
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 60);
  await page.evaluate(() => window.__harness.healP2());
  await waitFrames(2);
  // Force the dummy (p2) to swing at p1 with the chosen tier, then poll for the freeze.
  await page.evaluate(cat => window.__harness.p2AttackCat(cat), c.cat);
  // Wait until p1 is actually frozen (hitstop>0), capturing peak reading.
  await page.waitForFunction(() => (window.__harness.p1().hitstop || 0) > 0 || (window.__harness.p2().hitstop || 0) > 0, null, { timeout: 4000, polling: 8 }).catch(() => {});
  const snap1 = await page.evaluate(() => window.__harness.p1());
  const snap2 = await page.evaluate(() => window.__harness.p2());
  const file = path.join(OUT, `hitstop_${c.cat}_${c.p1}.png`);
  await page.screenshot({ path: file });
  results.push({ ...c, p1_hitstop: snap1.hitstop, p2_hitstop: snap2.hitstop, p1_action: snap1.action, file: path.relative(ROOT, file) });
  console.log(`captured ${c.cat}: p1=${c.p1} hitstop=${snap1.hitstop}  p2=${c.p2} hitstop=${snap2.hitstop}  → ${path.relative(ROOT, file)}`);
}

console.log("\nSUMMARY:", JSON.stringify(results, null, 2));
await browser.close();
server.close();
process.exit(0);
