// harness/combo_starter_live.mjs — LIVE before/after for STARTER-weighted combo damage scaling, on the
// sample cast (bardock/gohan/ippo/madara). Builds two combos of matched length on a re-planted dummy:
//   • LIGHT-opened  (open with j)            — control: must be IDENTICAL before/after (starter tier 0)
//   • LAUNCHER-opened (open with i up-attack) — must deal LESS total damage AFTER (starter penalty)
// setP2X re-plants the dummy grounded + in range every frame, so an up-attack launcher's juggle is held
// on the ground and the follow-up lights connect as a real combo. Run BUF_TAG=after (current), then
// `git stash push combat.js` + BUF_TAG=before to see the launcher-opened total drop while light is flat.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = process.env.BUF_TAG || "after";
const OUT = path.join(ROOT, "harness", "shots", "combo_starter", TAG);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const Fr = async () => page.evaluate(() => window.__harness.state().frame);
const wf = async n => { const s = await Fr(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 9000, polling: 6 }).catch(() => {}); };
const plant = () => page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + (p.facing === 1 ? 44 : -44)); });
const combo = () => page.evaluate(() => { const p = window.__harness.p1(); return { cc: p.comboCounter || 0 }; });
const p2hp = () => page.evaluate(() => window.__harness.p2().health);

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const SAMPLE = ["bardock", "gohan", "ippo", "madara"];

async function reset() {
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); });
  await plant(); await wf(2); await plant();
}
async function press(key, holdF = 1) { await page.keyboard.down(key); await wf(holdF); await page.keyboard.up(key); }
// Land a hit as part of a chain: first WAIT until P1 is actionable (prev swing + cooldown + hitstop all
// cleared), pinning the dummy grounded+in-range the whole time, then press and let the swing connect.
async function hit(key) {
  for (let i = 0; i < 40; i++) {
    await plant();
    const s = await page.evaluate(() => { const p = window.__harness.p1(); return { a: !!p.attacking, cd: p.attackCooldown || 0, hs: p.hitstop || 0 }; });
    if (!s.a && s.cd <= 0 && s.hs <= 0) break;
    await wf(1);
  }
  await plant();
  await press(key, 1);
  for (let i = 0; i < 10; i++) { await plant(); await wf(1); }   // let it reach active + connect, dummy pinned
}

// Build a combo: opener (launcher 'i' or light 'j') + `follow` light hits. Returns {total, maxCC}.
async function buildCombo(openKey, follow, shotPath) {
  await reset();
  const h0 = await p2hp();
  await hit(openKey);
  let maxCC = (await combo()).cc;
  for (let i = 0; i < follow; i++) { await hit("j"); const c = (await combo()).cc; if (c > maxCC) maxCC = c; }
  if (shotPath) await page.screenshot({ path: shotPath });
  const total = Math.max(0, h0 - (await p2hp()));
  return { total, maxCC };
}

async function verify(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.resetFighterInput), null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(8);
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 44); });

  const light = await buildCombo("j", 4, path.join(OUT, `${charKey}_light_opened.png`));
  const launch = await buildCombo("i", 4, path.join(OUT, `${charKey}_launcher_opened.png`));
  console.log(`  ${charKey.padEnd(9)} light-opened total=${light.total} (cc${light.maxCC})   launcher-opened total=${launch.total} (cc${launch.maxCC})`);
  return { key: charKey, light, launch };
}

console.log(`\n══ STARTER-WEIGHTED COMBO SCALING — LIVE (TAG=${TAG}) ══`);
const results = [];
for (const c of SAMPLE) { try { results.push(await verify(c)); } catch (e) { console.log(`  ${c} ERROR ${e.message}`); results.push({ key: c, error: String(e.message) }); } }
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n  results.json + shots → harness/shots/combo_starter/${TAG}/  (compare launcher-opened totals before vs after)`);
await browser.close(); server.close();
process.exit(0);
