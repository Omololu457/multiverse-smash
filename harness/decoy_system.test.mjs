// harness/decoy_system.test.mjs — canonical regression for the SHADOW CLONE DECOY SYSTEM.
// Covers, for BOTH Naruto and Minato (shared logic): independent clone movement, the ZERO-TELL
// standing-clone design (indistinguishable by default; the wash is a debug-only lever), and the
// always-on hit-reveal rule (melee + projectile poof a clone; a hit on the real fighter deals real
// damage), incl. hit-reveal working with the tell OFF (i.e. always).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const clones = () => page.evaluate(() => window.__harness.p1CloneCount());
const cloneXs = () => page.evaluate(() => window.__harness.summons().filter(s => s.id === "shadowClone").map(s => s.x));
const tell = () => page.evaluate(() => window.__harness.cloneTell());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function pressKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(2); }
const avg = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}
async function prep(gap = 150) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); window.__harness.setCloneTell?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

async function suite(charKey) {
  section(`${charKey.toUpperCase()} — decoy system`);
  await boot(charKey);

  // 1. Independent movement: clones approach the opponent.
  await prep(360);
  const oppX = (await p2()).x;
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(20);
  const d0 = Math.abs(avg(await cloneXs()) - oppX);
  await waitFrames(70);
  const d1 = Math.abs(avg(await cloneXs()) - oppX);
  check(`${charKey}: clones move independently toward the opponent`, d1 < d0 - 40, `dist ${d0.toFixed(0)}→${d1.toFixed(0)}`);

  // 2. STANDING CLONE = ZERO TELL by default (confirmed design: pixel-identical, no wash). The
  //    setCloneTell wash survives only as a training/debug lever — assert it still flips both ways.
  await prep();
  check(`${charKey}: NO visual tell by default (clone is indistinguishable)`, (await tell()) === false);
  await page.evaluate(() => window.__harness.setCloneTell(true));   // debug lever ON
  check(`${charKey}: debug tell lever turns the wash ON`, (await tell()) === true);
  await page.evaluate(() => window.__harness.setCloneTell(false));  // back to the design default
  check(`${charKey}: debug tell lever turns the wash OFF`, (await tell()) === false);
  const tellOffForReveal = await tell();

  // 3. Hit-reveal — MELEE poofs a clone.
  await prep(120);
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(80);
  const mBefore = await clones();
  await page.evaluate(() => window.__harness.p2Attack?.());
  await waitFrames(36);
  check(`${charKey}: MELEE hit poofs a clone`, (await clones()) < mBefore, `count ${mBefore}→${await clones()}`);

  // 4. Hit-reveal — PROJECTILE poofs a clone (real fighter moved clear so the shot hits only a clone).
  await prep(150);
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(20);
  await page.evaluate(() => window.__harness.setP1Pos?.(200, null)); await waitFrames(2);
  const pBefore = await page.evaluate(() => window.__harness.p2ProjectileAtClone());
  await waitFrames(32);
  check(`${charKey}: PROJECTILE hit poofs a clone`, pBefore >= 1 && (await clones()) === pBefore - 1, `count ${pBefore}→${await clones()}`);

  // 5. Hit-reveal is INDEPENDENT of the tell: repeat the projectile poof with the tell OFF.
  await prep(150);
  await page.evaluate(() => { window.__harness.setCloneTell?.(false); window.__harness.spawnP1Clones(2); });
  await waitFrames(20);
  await page.evaluate(() => window.__harness.setP1Pos?.(200, null)); await waitFrames(2);
  const nBefore = await page.evaluate(() => window.__harness.p2ProjectileAtClone());
  await waitFrames(32);
  check(`${charKey}: hit-reveal works with the tell OFF`, nBefore >= 1 && (await clones()) === nBefore - 1, `tell=${tellOffForReveal}, count ${nBefore}→${await clones()}`);
  await page.evaluate(() => window.__harness.setCloneTell?.(false));

  // 6. A hit on the REAL fighter deals real damage (no clones present) and never poofs.
  await prep(60);
  const hp0 = (await p1()).health;
  await page.evaluate(() => window.__harness.p2Attack?.());
  await waitFrames(30);
  const me = await p1();
  check(`${charKey}: hit on the REAL fighter deals real damage`, me.health < hp0, `hp ${hp0.toFixed(0)}→${me.health.toFixed(0)}`);
  check(`${charKey}: real fighter still present (never poofs)`, !!me && me.health > 0 && (me.key === charKey || me.rosterKey === charKey), `key=${me.key ?? me.rosterKey}`);
}

await suite("naruto");
await suite("minato");

console.log(`\n${FAIL === 0 ? "✅" : "❌"} decoy system (Naruto + Minato, shared): ${PASS} passed, ${FAIL} failed`);
await browser.close();
server.close();
process.exit(FAIL === 0 ? 0 : 1);
