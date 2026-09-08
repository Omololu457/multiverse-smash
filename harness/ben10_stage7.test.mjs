// harness/ben10_stage7.test.mjs
// BEN 10 — STAGE 7: "HERO TIME" (Ben-human / Albedo ultimate).
//   From HUMAN, the ult slams the Omnitrix, FORCE-TRANSFORMS into the currently-dialed loadout
//   alien, lands ONE oversized guaranteed blow as that alien, then reverts to human.
//   Runs the flow for both ben10 and albedo (they share the Omnitrix ult branch).
//   node harness/ben10_stage7.test.mjs
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
  await waitFrames(2);
}
async function prep(gap) { await settle(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

async function bootAs(who) {
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});
}

async function testHeroTime(who) {
  section(`${who} — "Hero Time" (force-transform → oversized blow → revert)`);
  await bootAs(who);
  // Dial the Omnitrix to a known loadout; slot 0 (fourarms) is what Hero Time should become.
  await page.evaluate(() => window.__harness.benLoadout(["fourarms", "xlr8", "heatblast"]));
  await setForm("human");   // start the ult from Ben-human
  await prep(70);
  const human0 = await p1();
  check(`${who}: starts human (not transformed)`, human0.transformed === false && !human0.activeAlien, `transformed=${human0.transformed} alien=${human0.activeAlien}`);

  const e0 = human0.energy, h0 = (await p2()).health;
  const cast = await page.evaluate(() => window.__harness.p1Ultimate());
  check(`${who}: Hero Time casts`, !!cast?.cast, `cast=${cast?.cast}`);

  // Advance through the cinematic; capture the peak transform state + peak damage.
  let becameAlien = false, sawFourarms = false, maxDrop = 0;
  for (let i = 0; i < 150; i++) {
    const s1 = await p1(); const s2 = await p2();
    if (s1.transformed && s1.activeAlien) becameAlien = true;
    if (s1.activeAlien === "fourarms" && s1.benSkinAnim) sawFourarms = true;
    const drop = h0 - s2.health; if (drop > maxDrop) maxDrop = drop;
    await waitFrames(1);
  }
  check(`${who}: force-transformed into an alien mid-ult`, becameAlien, "");
  check(`${who}: became the dialed loadout alien (fourarms) w/ its own art`, sawFourarms, "");
  check(`${who}: oversized finishing blow (> standard 198 band)`, maxDrop > 210, `−${maxDrop.toFixed(0)}`);
  check(`${who}: spent ult energy`, e0 - (await p1()).energy > 40 || cast?.cast, `Δ=${(e0 - (await p1()).energy).toFixed(0)}`);

  // ...then revert: give the scheduled revert time to fire, confirm back to human.
  for (let i = 0; i < 60; i++) { const s1 = await p1(); if (s1.transformed === false) break; await waitFrames(2); }
  const after = await p1();
  check(`${who}: reverted to human after the blow`, after.transformed === false && !after.activeAlien, `transformed=${after.transformed} alien=${after.activeAlien}`);
}

try {
  await testHeroTime("ben10");
  await testHeroTime("albedo");
  section("sweep");
  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN 10 STAGE 7: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
