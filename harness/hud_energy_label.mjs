// harness/hud_energy_label.mjs
// ---------------------------------------------------------------------------
// Display-only proof for universe-specific energy-resource HUD labels.
// Boots a real match (Chromium, real render path) per matchup, reads the LIVE
// label each fighter's energy panel draws (via a tiny __harness.energyLabel hook
// if present, else the ENERGY_TYPE_LABELS mapping is verified by screenshot), and
// captures a full-frame + cropped bottom-corner screenshot of the energy bars.
//   node harness/hud_energy_label.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };

const server = await new Promise(r => {
  const s = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]));
    fs.readFile(p, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); });
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// (p1, p2, expectedP1Label, expectedP2Label, shotName, expP1Flavor, expP2Flavor)
// expLabel = raw resolveEnergyLabel (an energyType-"none" fighter still resolves to "ENERGY" here — the
// no-meter FLAVOR is what the HUD actually draws instead, asserted separately via expP*Flavor).
const MATCHUPS = [
  ["goku",   "naruto", "Ki",   "Chakra", "HUD_energy_ki_vs_chakra",   null, null],   // Dragon Ball vs Naruto (the required pair)
  ["vegeta", "sasuke", "Ki",   "Chakra", "HUD_energy_vegeta_vs_sasuke", null, null], // second DB-vs-Naruto pair
  ["gojo",   "rick",   "Cursed Energy", "Bullshit Science Energy", "HUD_energy_jjk_vs_rick", null, null], // confirm JJK + Rick untouched
  ["toji",   "gojo",   "ENERGY",        "Cursed Energy",           "HUD_energy_toji_heavenly", "HEAVENLY RESTRICTION", null], // Toji → HEAVENLY RESTRICTION (energyType none, JJK)
  ["rengoku","zenitsu","ENERGY",        "ENERGY",                  "HUD_energy_demonslayer",   "TOTAL CONCENTRATION", "TOTAL CONCENTRATION"], // Demon Slayer no-meter → TOTAL CONCENTRATION (was generic "ENERGY" bug)
];

let pass = 0, fail = 0;
for (const [p1k, p2k, expP1, expP2, shot, expFlav1, expFlav2] of MATCHUPS) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1k}&p2=${p2k}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  // let the HUD render a few frames past boot
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(f => window.__harness.state().frame >= f + 8, s0, { timeout: 8000, polling: 16 });
  // Read the labels the HUD actually draws, off the REAL fighter (same resolveEnergyLabel() as ui.js).
  const st = await page.evaluate(() => ({
    p1: window.__harness.energyLabel("p1"), p2: window.__harness.energyLabel("p2"),
    hr1: window.__harness.heavenlyRestriction("p1"), hr2: window.__harness.heavenlyRestriction("p2"),
    nm1: window.__harness.noMeterFlavor("p1"), nm2: window.__harness.noMeterFlavor("p2"),
  }));
  const labels = { p1: st.p1, p2: st.p2 };
  const ok1 = labels.p1 === expP1, ok2 = labels.p2 === expP2;
  ok1 ? pass++ : fail++; ok2 ? pass++ : fail++;
  // Only Toji (JJK energyType none) should be in the Heavenly Restriction HUD state — nobody else here.
  const hrOk = (p1k === "toji" ? st.hr1 === true : st.hr1 === false) && st.hr2 === false;
  hrOk ? pass++ : fail++;
  // No-meter FLAVOR label actually drawn (the fix): "TOTAL CONCENTRATION" for Demon Slayer, "HEAVENLY
  // RESTRICTION" for JJK-none, null otherwise. Was a generic "ENERGY" panel for Rengoku/Zenitsu before.
  const nmOk = (st.nm1 ?? null) === (expFlav1 ?? null) && (st.nm2 ?? null) === (expFlav2 ?? null);
  nmOk ? pass++ : fail++;
  console.log(`${ok1 && ok2 && hrOk && nmOk ? "✅" : "❌"} ${p1k} → "${labels.p1}"${st.nm1 ? ` [${st.nm1}]` : ""} (exp "${expP1}"${expFlav1 ? `/${expFlav1}` : ""}) | ${p2k} → "${labels.p2}"${st.nm2 ? ` [${st.nm2}]` : ""} (exp "${expP2}"${expFlav2 ? `/${expFlav2}` : ""})`);
  await page.screenshot({ path: path.join(OUT, `${shot}.png`) });
  // Crop the bottom strip (both energy panels) for a legible label read.
  await page.screenshot({ path: path.join(OUT, `${shot}_bar.png`), clip: { x: 0, y: 600, width: 1280, height: 120 } });
}

console.log(`\nHUD energy labels: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
