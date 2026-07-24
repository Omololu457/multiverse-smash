// harness/combo_decay_shots.mjs — STAGE 3 VISUAL/LOG evidence. Boots the REAL game headless and drives
// a sustained combo on the live fighters (forcing repeated same-tier hits so the decay is visible as the
// SAME move dealing less each hit), logging the per-hit on-screen damage + combo counter, on two different
// matchups. Proves the decay curve reduces per-hit damage in real play. Gate = combo_decay.test.mjs.
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

// Drive a sustained combo: p2 (attacker) repeatedly lands the SAME heavy on p1, kept within the 90f combo
// window, so the only variable is the decay. Logs per-hit damage (p1 health delta) + p1's combo victim view.
async function runCombo(p1, p2, cat = "heavy", hits = 7) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 56); });
  const seq = [];
  for (let i = 0; i < hits; i++) {
    // keep the attacker adjacent + the victim un-invulnerable so every forced swing connects
    await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 56); if (window.__harness.setP1Invuln) window.__harness.setP1Invuln(0); });
    const before = (await page.evaluate(() => window.__harness.p1())).health;
    await page.evaluate(c => window.__harness.p2AttackCat(c), cat);
    await waitFrames(8);   // let the swing reach active + connect (well within the 90f combo window)
    const after = (await page.evaluate(() => window.__harness.p1())).health;
    seq.push({ hit: i + 1, dmg: Math.max(0, before - after) });
  }
  const file = path.join(OUT, `combodecay_${p2}_on_${p1}.png`);
  await page.screenshot({ path: file });
  console.log(`\n[${p2} combos ${p1} — ${cat}] per-hit damage:`, seq.map(s => s.dmg).join(" → "));
  console.log(`   screenshot → ${path.relative(ROOT, file)}`);
  return seq;
}

const a = await runCombo("sasuke", "toji", "heavy", 7);
const b = await runCombo("rick", "gojo", "heavy", 7);
const decays = s => { const nz = s.map(x => x.dmg).filter(d => d > 0); return nz.length >= 3 && nz[nz.length - 1] < nz[0]; };
console.log("\nSUMMARY:");
console.log("  decay visible (toji→sasuke):", decays(a));
console.log("  decay visible (gojo→rick):", decays(b));
await browser.close();
server.close();
process.exit(0);
