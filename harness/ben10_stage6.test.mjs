// harness/ben10_stage6.test.mjs
// BEN 10 — STAGE 6: every alien Ultimate lands cleanly (fresh state per alien).
//   For each alien: force-fire the ult via the p1Ultimate() hook, confirm it casts,
//   deals a guaranteed hit in the ~198 EFF band, uses its own cast pose, no JS errors.
//   node harness/ben10_stage6.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const f = path.join(ROOT, u === "/" ? "/index.html" : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setForm = (k) => page.evaluate(key => window.__harness.benForm(key), k);
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function prep(gap) { await settle(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

// alien -> [gap, cast pose, min EFF damage]  (freeze-template band ~198; poses reuse each alien's own move art)
const ALIENS = [
  ["xlr8",        60,  "xlUlt",     140],
  ["diamondhead", 90,  "dhUlt",     140],
  ["feedback",    90,  "fbUlt",     140],
  ["wildmutt",    70,  "wmPounce",  140],
  ["heatblast",   90,  "hbFire",    140],
  ["upgrade",     90,  "upBeam",    140],
  ["eyeguy",      90,  "egBeam",    140],
  ["cannonbolt",  70,  "cbRoll",    140],
  ["chromastone", 90,  "csBeam",    140],
  ["fourarms",    60,  "faSlam",    140],
  ["brainstorm",  90,  "bsBolt",    140],
];

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  for (const [alien, gap, pose, minDmg] of ALIENS) {
    section(alien);
    const form = await setForm(alien);   // benForm(key) returns { activeAlien, name, hasSkinAnim, ... }
    // confirm the form actually took with its OWN art (no cross-alien borrowing / missing sheet)
    check(`${alien}: form active w/ own art`, form?.activeAlien === alien && form?.hasSkinAnim, `activeAlien=${form?.activeAlien} skinAnim=${form?.hasSkinAnim}`);
    await prep(gap);
    const e0 = (await p1()).energy, h0 = (await p2()).health;
    const cast = await page.evaluate(() => window.__harness.p1Ultimate());
    await waitFrames(4);
    const spent = e0 - (await p1()).energy;
    // sample the whole payoff window (freeze-cinematics land ~frame 42; ricochet/maul run longer)
    let maxDrop = 0;
    for (let i = 0; i < 150; i++) { const drop = h0 - (await p2()).health; if (drop > maxDrop) maxDrop = drop; await waitFrames(1); }
    check(`${alien}: ult casts`, !!cast?.cast, `cast=${cast?.cast} castMove=${cast?.castMove}`);
    check(`${alien}: spends energy`, spent > 40, `Δ=${spent.toFixed(0)}`);
    check(`${alien}: cast pose = ${pose}`, cast?.castMove === pose, `castMove=${cast?.castMove}`);
    check(`${alien}: guaranteed hit ≥ ${minDmg} EFF`, maxDrop >= minDmg, `−${maxDrop.toFixed(0)}`);
  }

  section("sweep");
  check("no JS errors across all aliens", jsErrors.length === 0, jsErrors[0] || "");

} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN 10 STAGE 6: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
