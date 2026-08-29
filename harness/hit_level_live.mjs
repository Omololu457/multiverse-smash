// harness/hit_level_live.mjs — LIVE in-engine verification of the OVERHEAD / hit-level attribute on a
// sample cast. For each char it throws a ground light, a ground heavy, and an AERIAL attack, and reads the
// REAL classification via __harness.attackHitLevel. Expected:
//   ground light           → mid (a normal jab)
//   ground heavy (TAGGED)  → overhead (jason/alt_sukuna/bardock)   | (UNTAGGED) → mid (gohan)
//   aerial attack          → overhead (jump-in — airborne attacker, no tag needed), for EVERY char
// BEFORE/AFTER: `git stash push characters.js` removes the tags → tagged heavies drop to 'mid' while the
// jump-in path is unchanged (classifier lives in combat.js) — proving the TAGS are what flip ground heavies.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = process.env.BUF_TAG || "after";
const OUT = path.join(ROOT, "harness", "shots", "hit_level", TAG);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const Fr = async () => page.evaluate(() => window.__harness.state().frame);
const wf = async n => { const s = await Fr(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 9000, polling: 4 }).catch(() => {}); };
const hl = () => page.evaluate(() => window.__harness.attackHitLevel("p1"));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
// tagged heavies vs an untagged contrast char
const SAMPLE = [
  { key: "jason", heavyOverhead: true }, { key: "alt_sukuna", heavyOverhead: true },
  { key: "bardock", heavyOverhead: true }, { key: "gohan", heavyOverhead: false },
];

async function reset() {
  // Wait until the PREVIOUS swing is fully done (else the next press is ignored while still attacking and we
  // read the tail of the old move). resetFighterInput also clears the buffered-press queue — WITHOUT it the
  // lingering light (j) buffer fires on the next press (light dispatches before heavy) → heavy reads as light.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 3000, polling: 8 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); const p = window.__harness.p1(); p.attacking = false; p.currentAttack = null; p.attackCooldown = 0; p.vy = 0; });
  await wf(3);
}
// Press a key and capture the attack classification while the swing is live.
async function classify(key, needAirborne = false) {
  await reset();
  if (needAirborne) { await page.keyboard.down("w"); await wf(1); await page.keyboard.up("w"); await wf(5); }  // hop first
  await page.keyboard.down(key); await wf(1); await page.keyboard.up(key);
  let seen = null;
  for (let i = 0; i < 16; i++) { const h = await hl(); if (h) { seen = h; break; } await wf(1); }
  return seen;
}

async function verify(entry) {
  await page.goto(`${base}/index.html?harness=1&p1=${entry.key}&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.attackHitLevel), null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(8);

  const light = await classify("j");
  const heavy = await classify("k");
  const air = await classify("j", true);
  const L = light?.level, H = heavy?.level, A = air?.level;
  console.log(`  ${entry.key.padEnd(11)} light=${L}(${light?.move}) heavy=${H}(${heavy?.move}, tag=${heavy?.tag}) air=${A}(${air?.move}, airborne=${air?.airborne})`);
  check(`${entry.key}: ground light → mid`, L === "mid", `got ${L}`);
  check(`${entry.key}: ground heavy → ${entry.heavyOverhead ? "overhead (tagged)" : "mid (untagged)"}`, H === (entry.heavyOverhead ? "overhead" : "mid"), `got ${H} tag=${heavy?.tag}`);
  check(`${entry.key}: aerial attack → overhead (jump-in)`, A === "overhead" && air?.airborne === true, `got ${A} airborne=${air?.airborne}`);
  return { key: entry.key, light: L, heavy: H, air: A, heavyTag: heavy?.tag };
}

console.log(`\n══ HIT-LEVEL / OVERHEAD attribute — LIVE (TAG=${TAG}) ══`);
const results = [];
for (const e of SAMPLE) { try { results.push(await verify(e)); } catch (err) { console.log(`  ${e.key} ERROR ${err.message}`); FAIL++; results.push({ key: e.key, error: String(err.message) }); } }
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n  results.json → harness/shots/hit_level/${TAG}/`);
console.log(`\n════════════════════════════════════════\n  HIT-LEVEL LIVE: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
