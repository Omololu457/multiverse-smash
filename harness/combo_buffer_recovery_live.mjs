// harness/combo_buffer_recovery_live.mjs — LIVE in-game before/after for the input-buffer recovery fix,
// on real sample characters spanning archetypes. For each char it boots the real game vs a pinned dummy
// and sweeps the RE-PRESS GAP (frames between a 1st light and a 2nd light), finding the MINIMUM gap at
// which the 2nd normal links (combo counter reaches 2). A too-short buffer drops re-presses made early
// in recovery, so the minimum linking gap is LARGER; raising the buffer 7→10 shifts that threshold DOWN
// (a correctly-timed re-press links from ~3 frames sooner). Run with BUF_TAG=before on the old build
// (git stash the fix) and BUF_TAG=after on the new build to see the threshold move.
//   node harness/combo_buffer_recovery_live.mjs           (current build)
// Screenshots a landed 2-hit per char → harness/shots/combo_buffer/<TAG>/.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = process.env.BUF_TAG || "cur";
const OUT = path.join(ROOT, "harness", "shots", "combo_buffer", TAG);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const F = async () => page.evaluate(() => window.__harness.state().frame);
const wf = async n => { const s = await F(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 9000, polling: 6 }).catch(() => {}); };
const pin = () => page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + (p.facing === 1 ? 46 : -46)); const q = window.__harness.p2(); if (q) q.vx = 0; window.__harness.setP2Invuln(0); });

// rekka (bardock/gohan), meterless boxer (ippo), large-kit exception (madara/isshiki), stance (toji)
const SAMPLE = [
  { key: "bardock", kit: "rekka-sword" },
  { key: "gohan",   kit: "rekka-melee" },
  { key: "ippo",    kit: "meterless-boxer" },
  { key: "madara",  kit: "large-kit" },
];
const GAPS = [18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30];

// One re-press trial at inter-press gap G. Pins the dummy the WHOLE time so a linked 2nd swing always
// has a target (removes the knockback confound); returns the max combo counter reached (2 = linked).
async function trial(G, shot) {
  await page.evaluate(() => { const p = window.__harness.p1(); p.attacking = false; p.currentAttack = null; p.attackCooldown = 0; p.hitstun = 0; p.hitstop = 0; p.comboCounter = 0; });
  await page.evaluate(() => window.__harness.healP2());
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 46); });
  await pin();
  await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
  // pin through the gap so the 1st hit's knockback can't carry the dummy out of range
  for (let i = 0; i < G; i++) { await pin(); await wf(1); }
  await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
  let maxcc = 0, shotTaken = false;
  for (let i = 0; i < 40; i++) {
    await pin();
    const cc = await page.evaluate(() => window.__harness.p1().comboCounter || 0);
    if (cc > maxcc) maxcc = cc;
    if (maxcc >= 2 && shot && !shotTaken) { await page.screenshot({ path: shot }); shotTaken = true; }
    await wf(1);
  }
  return maxcc;
}

async function verify(entry) {
  await page.goto(`${base}/index.html?harness=1&p1=${entry.key}&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(8);
  let minGap = null;
  const row = [];
  for (const G of GAPS) {
    const cc = await trial(G, minGap === null ? path.join(OUT, `${entry.key}_2hit_gap${G}.png`) : null);
    row.push(`${G}:${cc}`);
    if (cc >= 2 && minGap === null) minGap = G;
  }
  console.log(`  ${entry.key.padEnd(9)} [${entry.kit.padEnd(16)}] min-gap-to-link-2nd = ${minGap ?? ">30"}   (gap:combo → ${row.join(" ")})`);
  return { key: entry.key, kit: entry.kit, minGap, row };
}

console.log(`\n══ COMBO BUFFER RECOVERY — LIVE min re-press gap to link a 2nd normal (TAG=${TAG}, buffer in play) ══`);
const results = [];
for (const e of SAMPLE) { try { results.push(await verify(e)); } catch (err) { console.log(`  ${e.key} ERROR ${err.message}`); results.push({ key: e.key, error: String(err.message) }); } }
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n  shots + results.json → harness/shots/combo_buffer/${TAG}/`);
await browser.close(); server.close();
process.exit(0);
