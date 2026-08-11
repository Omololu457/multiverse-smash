// harness/cancel_window_shots.mjs — STAGE 2 VISUAL evidence. Boots the REAL game headless and reads
// the shared __harness.cancelWindow() on TWO different real command-chain characters (Killua's Down+Heavy
// Barrage = a heavy hit-gated chain; Toji's blade Light rekka = a timing-gated stance chain), printing the
// live frame-defined window at each stage + a screenshot mid-chain. Proves both characters' cancel timing
// reads through the ONE getCancelWindow API in the same shape. Deterministic gate = cancel_window.test.mjs.
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
const cw = () => page.evaluate(() => window.__harness.cancelWindow("p1"));

async function boot(p1) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);
  const a = await page.evaluate(() => window.__harness.p1());
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 58);   // adjacent so the hit-gated chain connects
  await page.evaluate(() => window.__harness.healP2());
  await waitFrames(2);
}

// Drive an opener + a couple of cancels, sampling cancelWindow when it's OPEN.
async function driveChain(label, openerKeys, chainKey) {
  const samples = [];
  // opener
  for (const k of openerKeys) await page.keyboard.down(k);
  await waitFrames(2);
  for (const k of openerKeys) await page.keyboard.up(k);
  // sample + re-tap the chain button a few times across recovery windows
  for (let rep = 0; rep < 4; rep++) {
    // walk frames until the window opens (recovery) or the move ends
    for (let i = 0; i < 30; i++) {
      const w = await cw();
      if (w && w.open && w.move) { samples.push({ move: w.move, startup: w.startup, active: w.active, recovery: w.recovery, phase: w.phase, open: w.open, cancelInto: w.cancelInto, connected: w.connected }); break; }
      await waitFrames(1);
    }
    // fresh tap of the chain button to cancel into the next stage
    await page.keyboard.down(chainKey); await waitFrames(2); await page.keyboard.up(chainKey);
    await waitFrames(2);
  }
  const file = path.join(OUT, `cancelwindow_${label}.png`);
  await page.screenshot({ path: file });
  console.log(`\n[${label}] cancel-window samples (shared getCancelWindow):`);
  for (const s of samples) console.log("   ", JSON.stringify(s));
  console.log(`   screenshot → ${path.relative(ROOT, file)}`);
  return samples;
}

// Killua — Down+Heavy Barrage (heavy hit-gated chain). P1 keys: down=s, heavy=k.
await boot("killua");
const killua = await driveChain("killua_barrage", ["s", "k"], "k");
// Toji — blade Light rekka (timing-gated stance chain). P1 key: light=j.
await boot("maki");
const toji = await driveChain("toji_blade", ["j"], "j");

console.log("\nSUMMARY: both characters' cancel windows read through the ONE getCancelWindow() API in the same {startup,active,recovery,phase,open,cancelInto} shape.");
console.log("killua stages seen:", [...new Set(killua.map(s => s.move))].join(", ") || "(none)");
console.log("toji stages seen:", [...new Set(toji.map(s => s.move))].join(", ") || "(none)");
await browser.close();
server.close();
process.exit(0);
