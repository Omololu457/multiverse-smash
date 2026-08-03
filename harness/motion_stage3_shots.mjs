// harness/motion_stage3_shots.mjs — STAGE 3 EVIDENCE: Shuriken-Hidden Clone (double-QCB ↓←↓←).
// Boots the REAL game and shows, for BOTH Naruto and Minato, the technique working: a single decoy
// projectile is thrown, then a hidden clone reveals (puff) and strikes. Captures the decoy in flight
// and the reveal/strike, with damage + cost logs. Outputs harness/shots/motion_s3_*.png. Run ALONE.
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
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function pressDirs(dirs) { for (const k of dirs) await page.keyboard.press(k); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}
async function prep(gap = 300) {   // FAR dummy so the single decoy is observable in flight
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

async function demo(charKey, decoyName) {
  console.log(`\n── ${charKey.toUpperCase()} · Shuriken-Hidden Clone (↓←↓←) ──────────`);
  await boot(charKey);
  await prep();
  const hp0 = (await p2()).health; const e0 = (await p1()).energy;
  // Poll for the decoy CONCURRENTLY with the input so it's caught the instant it spawns.
  const [sawDecoy] = await Promise.all([
    page.waitForFunction(n => window.__harness.projectiles().some(p => p.name === n), decoyName, { timeout: 2500, polling: 6 }).then(() => true).catch(() => false),
    (async () => { await pressDirs(["s", "a", "s", "a"]); await tap("l"); })()   // ↓←↓← + Special
  ]);
  await shot(`motion_s3_${charKey}_decoy.png`);                 // a SINGLE projectile in flight (the decoy)
  console.log(`  decoy in flight: ${sawDecoy ? decoyName : "NOT seen"}   (projectiles=[${(await projNames()).join(",")}])`);
  await waitFrames(16);                                          // hidden clone reveals + strikes
  await shot(`motion_s3_${charKey}_reveal.png`);
  await waitFrames(16);
  const dmg = hp0 - (await p2()).health; const drop = e0 - (await p1()).energy;
  console.log(`  reveal strike: opponent Δhp=${dmg.toFixed(0)}, energy spent=${drop.toFixed(0)}`);
  check(`${charKey}: decoy projectile thrown`, sawDecoy, decoyName);
  check(`${charKey}: hidden clone revealed + struck`, dmg > 0, `Δhp=${dmg.toFixed(0)}`);
  check(`${charKey}: paid the technique cost`, drop >= 30, `Δenergy=${drop.toFixed(0)}`);
}

try {
  await demo("naruto", "narutoHiddenShuriken");
  await demo("minato", "minatoHiddenShuriken");
  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 3 evidence: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
