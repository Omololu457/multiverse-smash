// harness/transform_energy_shots.mjs — EVIDENCE that Tier 2 Full Copy does NOT refill energy to full.
// Naruto vs Sasuke. Sets a LOW energy pool, activates Tier 2, and reads the energy bar BEFORE and
// immediately AFTER: it must carry over (pre − activation cost), NOT reset to the copied character's max.
// Screenshots the HUD energy bar before + after. Outputs harness/shots/transform_energy_{before,after}.png.
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
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const tj = () => page.evaluate(() => window.__harness.p1TransformJutsu());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const d = seq.slice(0, -1), l = seq[seq.length - 1]; for (const k of d) await page.keyboard.press(k); await tap(l, 6); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.forceRevertTransformJutsu?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 70); await waitFrames(2);

  // Set a LOW energy pool that still affords Tier 2 (cost 100).
  const LOW = 120;
  await page.evaluate(v => window.__harness.setEnergy?.(v), LOW);
  await waitFrames(1);
  const before = await p1();
  await shot("transform_energy_before.png");
  console.log(`\n  BEFORE (undisguised Naruto): energy=${before.energy.toFixed(0)} / max=${before.maxEnergy}  (bar ≈ ${(100 * before.energy / before.maxEnergy).toFixed(0)}%)`);

  // Activate Tier 2 Full Copy (↓←→ DBF + Special).
  await motion(["s", "a", "d", "l"]);
  await waitFrames(2);   // read IMMEDIATELY after the transform completes
  const st = await tj();
  const after = await p1();
  await shot("transform_energy_after.png");
  console.log(`  AFTER  (copied Sasuke): energy=${after.energy.toFixed(0)} / max=${after.maxEnergy}  (bar ≈ ${(100 * after.energy / after.maxEnergy).toFixed(0)}%)  tier=${st.tier}`);

  check("Tier 2 actually activated at low energy", st.active === true && st.tier === 2, `tier=${st.tier}, roster=${st.rosterKey}`);
  check("energy did NOT refill to full (after < copied max)", after.energy < after.maxEnergy - 5, `after=${after.energy.toFixed(0)} < max=${after.maxEnergy}`);
  check("energy CARRIED OVER minus the ~100 cost (not reset upward)", (before.energy - after.energy) >= 90 && after.energy < before.energy, `Δ=${(before.energy - after.energy).toFixed(0)} (before ${before.energy.toFixed(0)} → after ${after.energy.toFixed(0)})`);
  check("left LOW — a copied ultimate (cost ~100) can't fire instantly", after.energy < 60, `after=${after.energy.toFixed(0)}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} Tier 2 energy-refill removed: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
