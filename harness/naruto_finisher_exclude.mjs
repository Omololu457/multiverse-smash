// harness/naruto_finisher_exclude.mjs — verifies the Naruto comeback-finisher exclusion fix. At low HP,
// Naruto must get his Kurama SHROUD behavior WITHOUT the universal Fatal Blow also being available (same
// as toji/maki/gon). Non-excluded chars (sasuke) stay Fatal-Blow-eligible → proves the universal system is
// intact. BEFORE/AFTER: `git stash push combat.js` and re-run → Naruto shows ready:true (the old double-dip).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = process.env.BUF_TAG || "after";
const OUT = path.join(ROOT, "harness", "shots", "naruto_finisher", TAG);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const F = async () => page.evaluate(() => window.__harness.state().frame);
const wf = async n => { const s = await F(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 9000, polling: 8 }).catch(() => {}); };
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.finisherProbe), null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(8);
}
// Drop P1 to `frac` of max HP (via the live-mutating damageP1 hook — p1() is a read-only snapshot) and
// let the passive systems (shroud stage) update.
async function setLowHp(frac) {
  const mh = await page.evaluate(() => window.__harness.finisherProbe().maxHealth || 1000);
  await page.evaluate((dmg) => window.__harness.damageP1(dmg), Math.round(mh * (1 - frac)));
  await wf(12);
}

console.log(`\n══ NARUTO comeback-finisher EXCLUSION (TAG=${TAG}) ══`);
await boot("naruto");
await setLowHp(0.10);
const nar = await page.evaluate(() => { const s = window.__harness.p1Snap(); return { probe: window.__harness.finisherProbe(), shroudStage: s.shroudStage || 0, shroudBuffed: !!s.shroudBuffed }; });
console.log(`     naruto @${nar.probe.hpPct}% HP → finisher.ready=${nar.probe.ready}  shroudStage=${nar.shroudStage}  shroudBuffed=${nar.shroudBuffed}`);
check("Naruto at low HP → Fatal Blow NOT available (excluded like toji/maki/gon)", nar.probe.ready === false, `ready=${nar.probe.ready}`);
check("Naruto at low HP → Kurama shroud IS active (his bespoke low-HP tool, buff live)", nar.shroudStage >= 3 && nar.shroudBuffed, `stage=${nar.shroudStage} buffed=${nar.shroudBuffed}`);
await page.screenshot({ path: path.join(OUT, "naruto_lowhp_shroud.png") });

// Contrast: a NON-excluded char must still be Fatal-Blow-eligible at low HP (universal system intact).
await boot("sasuke");
await setLowHp(0.10);
const sas = await page.evaluate(() => window.__harness.finisherProbe());
console.log(`     sasuke @${sas.hpPct}% HP → finisher.ready=${sas.ready}`);
check("Sasuke (non-excluded) at low HP → Fatal Blow STILL available (universal system intact)", sas.ready === true, `ready=${sas.ready}`);

fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ naruto: nar, sasuke: sas }, null, 2));
console.log(`\n════════════════════════════════════════\n  NARUTO EXCLUSION: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
