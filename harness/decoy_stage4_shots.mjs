// harness/decoy_stage4_shots.mjs — DECOY Stage 4 EVIDENCE: no-tell escalation toggle.
//   - OFF by default: the visual tell is visible (clones subtly washed).
//   - F6 (Training-mode hotkey) toggles NO-TELL mode: the tell is removed, clones look identical.
//   - The hit-reveal rule STILL works with the tell off (a hit still poofs a clone).
//   - F6 again restores the tell (toggle both ways). Driven via the REAL hotkey, not just a hook.
// Outputs harness/shots/decoy_s4_*.png. Run ALONE.
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
const clones = () => page.evaluate(() => window.__harness.p1CloneCount());
const tell = () => page.evaluate(() => window.__harness.cloneTell());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function pressKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(2); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.dispelP1Clones?.(); });
  const me = await p1(); await page.evaluate(x => window.__harness.setP2X(x), me.x + 130); await waitFrames(2);

  // ── DEFAULT: tell visible (no-tell OFF) ──
  console.log("── mode A: DEFAULT (tell visible) ──");
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(20);
  check("no-tell mode is OFF by default (tell visible)", (await tell()) === true, `cloneTell=${await tell()}`);
  await shot("decoy_s4_tell_visible.png");

  // ── F6 → NO-TELL mode (tell removed) via the REAL training hotkey ──
  console.log("── mode B: F6 → NO-TELL (tell removed) ──");
  await pressKey("F6");
  check("F6 removed the visual tell (no-tell mode on)", (await tell()) === false, `cloneTell=${await tell()}`);
  await shot("decoy_s4_tell_removed.png");

  // ── hit-reveal STILL works with the tell off ──
  // Move the REAL fighter clear of the clones so the test projectile unambiguously hits a clone
  // (a projectile that overlaps the real fighter is correctly consumed by the normal resolver first).
  await page.evaluate(() => window.__harness.setP1Pos?.(200, null)); await waitFrames(2);
  const before = await page.evaluate(() => window.__harness.p2ProjectileAtClone());
  await waitFrames(32);
  const after = await clones();
  check("hit-reveal STILL poofs a clone with the tell OFF", before >= 1 && after === before - 1, `count ${before}→${after}`);

  // ── F6 again → tell restored ──
  console.log("── mode C: F6 again → tell restored ──");
  await pressKey("F6");
  check("F6 again restores the visual tell", (await tell()) === true, `cloneTell=${await tell()}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} DECOY Stage 4 evidence: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
