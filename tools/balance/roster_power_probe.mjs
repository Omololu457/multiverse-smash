// Live roster power probe: boots each character vs a fixed dummy and reads RUNTIME numbers (kits often re-stamp
// stats in their tick) + the real first-hit damage of one Light and one Heavy (all scales/boosts included).
// Usage: node tools/balance/roster_power_probe.mjs [out.json] [key ...]
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const out = process.argv[2] || "roster_power.json";
let keys = process.argv.slice(3);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const DUMMY = "goku";
if (!keys.length) {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`); await page.waitForFunction(() => !!window.__harness, null, { timeout: 30000 });
  keys = await page.evaluate(async () => { const { characters } = await import("./characters.js"); return Object.keys(characters).filter(k => characters[k]?.stats && characters[k].isPlayable !== false && !characters[k].hidden) });
}
const frame = () => page.evaluate(() => window.__harness.state().frame);
async function waitFrames(n) { const s = await frame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 8000, polling: 16 }) }
const pin = () => page.evaluate(() => { const H = window.__harness, p = H.p1(); H.setP2X(p.x + (p.facing === 1 ? 50 : -50)); const q = H.p2(); if (q) q.vx = 0; H.setP2Invuln?.(0) });
async function hit(key) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0 && (p.hitstop || 0) <= 0 }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.healP2()); await pin(); await waitFrames(2);
  const before = await page.evaluate(() => window.__harness.p2().health);
  await page.keyboard.down(key); await waitFrames(1); await page.keyboard.up(key);
  let best = 0;
  for (let i = 0; i < 14; i++) { await waitFrames(3); await pin(); const h = await page.evaluate(() => window.__harness.p2().health); best = Math.max(best, before - h) }
  await waitFrames(20);
  return Math.round(best);
}
const rows = {};
for (const k of keys) {
  try {
    await page.goto(`${base}/index.html?harness=1&p1=${k}&p2=${DUMMY}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 30000 });
    await page.mouse.click(640, 360); await page.evaluate(() => window.__harness.boot()); await waitFrames(30);
    const st = await page.evaluate(() => { const p = window.__harness.p1(); return { hp: p.maxHealth, en: p.maxEnergy } });
    // effective walk speed: px travelled holding forward for 30 frames (dummy parked far behind)
    await page.evaluate(() => { const H = window.__harness, p = H.p1(); H.setP2X(p.x - 400) });
    await waitFrames(2);
    const fwd = await page.evaluate(() => window.__harness.p1().facing === 1 ? "d" : "a");
    const x0 = await page.evaluate(() => window.__harness.p1().x);
    await page.keyboard.down(fwd); await waitFrames(30); const x1 = await page.evaluate(() => window.__harness.p1().x); await page.keyboard.up(fwd);
    st.walk = Math.round(Math.abs(x1 - x0)); await waitFrames(15);
    const L = await hit("j"); const H = await hit("k");
    rows[k] = { ...st, L, H }; console.log(k, JSON.stringify(rows[k]));
  } catch (e) { console.log(k, "ERR", String(e).slice(0, 100)); rows[k] = { err: String(e).slice(0, 200) } }
  fs.writeFileSync(out, JSON.stringify(rows, null, 1));
}
await browser.close(); server.close();
