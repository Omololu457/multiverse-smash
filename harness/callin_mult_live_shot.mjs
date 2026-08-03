// harness/callin_mult_live_shot.mjs — prove the Training-Mode live control for CALLIN_DAMAGE_MULT:
// overlay shows the value, the [ / ] keys change it live, and the NEXT call-in deals different damage —
// no reload/restart. Playing Omega, calling in Gold (its Light Finale = a big, clear damage number).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

await page.goto(`${base}/index.html?harness=1&p1=omega_ranger&p2=gojo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());               // mode=training → overlay + [ / ] keys live
await sleep(200);
await page.evaluate(() => window.__harness.setCallInPartner("gold_samurai_ranger", "p1"));

// Fire a call-in and return the damage dealt (heal p2 first so each shot measures cleanly). Screenshot at
// the strike beat (when p2's HP drops) so the floating damage number is visible.
async function fireAndMeasure(tag) {
  await page.evaluate(() => window.__harness.healP2?.());
  const hp0 = await page.evaluate(() => window.__harness.p2().health);
  await page.evaluate(() => window.__harness.fireCallIn("p1"));
  let shot = false;
  for (let i = 0; i < 90; i++) {
    const st = await page.evaluate(() => window.__harness.callInStatus());
    if (!shot && st.oppHealth != null && st.oppHealth < hp0 - 1) { await page.screenshot({ path: path.join(OUT, `callin_mult_${tag}.png`) }); shot = true; }
    if (!st.active) break;
    await sleep(45);
  }
  const hp1 = await page.evaluate(() => window.__harness.p2().health);
  await sleep(120);
  await page.screenshot({ path: path.join(OUT, `callin_mult_after_${tag}.png`) });   // overlay now shows Last Dmg
  return Math.round(hp0 - hp1);
}
// Press a Training-Mode key for real (held long enough for a frame to edge-detect it).
async function tap(k) { await page.keyboard.down(k); await sleep(90); await page.keyboard.up(k); await sleep(60); }

const m0 = await page.evaluate(() => window.__harness.callInMult());
await page.screenshot({ path: path.join(OUT, "callin_mult_overlay_055.png") });
check("default CALLIN_DAMAGE_MULT = 0.55 (mid of 0.5–0.6)", Math.abs(m0 - 0.55) < 1e-6, `mult=${m0}`);
const dmgLow = await fireAndMeasure("dmg_055");
console.log(`  at mult ${m0}: call-in dealt ${dmgLow}`);

// Raise the multiplier LIVE with the real ] key (0.55 → 0.75), no reload.
await tap("]"); await tap("]");
const m1 = await page.evaluate(() => window.__harness.callInMult());
await page.screenshot({ path: path.join(OUT, "callin_mult_overlay_075.png") });
check("pressing ] twice raised the LIVE value to 0.75 (no restart)", Math.abs(m1 - 0.75) < 1e-6, `mult=${m1}`);
const dmgHigh = await fireAndMeasure("dmg_075");
console.log(`  at mult ${m1}: call-in dealt ${dmgHigh}`);

check("the NEXT call-in dealt MORE damage after raising the mult", dmgHigh > dmgLow + 20, `${dmgLow} → ${dmgHigh}`);
check("damage tracks the multiplier (~340×mult)", Math.abs(dmgLow - 340 * m0) < 12 && Math.abs(dmgHigh - 340 * m1) < 12, `expected ~${Math.round(340*m0)}/${Math.round(340*m1)}, got ${dmgLow}/${dmgHigh}`);
// Also confirm [ lowers it.
await tap("["); const m2 = await page.evaluate(() => window.__harness.callInMult());
check("pressing [ lowers the live value (0.75 → 0.65)", Math.abs(m2 - 0.65) < 1e-6, `mult=${m2}`);

console.log(`\n${fail === 0 ? "✅" : "❌"} CALL-IN MULT LIVE CONTROL: ${pass} passed, ${fail} failed`);
console.log("shots: callin_mult_overlay_055.png, callin_mult_dmg_055.png, callin_mult_overlay_075.png, callin_mult_dmg_075.png");
await browser.close(); server.close();
process.exit(fail === 0 ? 0 : 1);
