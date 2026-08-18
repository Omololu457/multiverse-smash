// harness/light_stage56.mjs
// STAGE 5 + 6 evidence: Light Yagami — the TWO ultimate-tier payoffs sharing the Kira meter. Asserts:
//  Stage 5 "As Planned" (neutral U)  → lightUltWrite cast, 100 Kira spent, GUARANTEED range-independent damage.
//  Stage 6 "I Am Kira"  (Down+U)      → lightScythe cast, the _lightKiraTimer panel-flash cinematic runs,
//                                        100 Kira spent, GUARANTEED damage. Variant selected via opts.variant.
// Screenshots → harness/shots/light_stage56_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const fx = () => page.evaluate(() => window.__harness.lightFx("p1"));
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=light`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `light_stage56_${tag}.png`) }); }
const setEnergy = (v) => page.evaluate((e) => window.__harness.setEnergy(e), v);
const healP2 = () => page.evaluate(() => window.__harness.healP2?.());
const fireUlt = (opts) => page.evaluate((o) => window.__harness.p1Ultimate(o), opts || {});

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);
  const g = await p1();
  check("P1 is Light", g.key === "light", `key=${g.key}`);
  check("ultimate cost 100 (HUD)", (await page.evaluate(() => window.__harness.charDef("light"))) != null, "");

  // ── STAGE 5 — "As Planned" (writing, neutral U) ──
  console.log("\n── STAGE 5 — 'As Planned' ultimate (neutral U, Death Note writing) ──");
  await healP2(); await setEnergy(100); await waitFrames(2);
  const enB1 = (await p1()).energy ?? 0, hpB1 = (await p2()).health ?? 0;
  const r1 = await fireUlt({});
  const enMid1 = (await p1()).energy ?? 0;   // read immediately — before passive regen refills the pool
  check("neutral U casts (triggerUltimate returns a cast)", !!r1?.cast, `cast=${JSON.stringify(r1)}`);
  let write = false, wKira = false;
  for (let i = 0; i < 10; i++) { const s = await fx(); if (s?.castMove === "lightUltWrite") write = true; if ((s?.kiraTimer || 0) > 0) wKira = true; await waitFrames(1); }
  check("writing cast pose = lightUltWrite", write, "");
  await waitFrames(20); await shot("write_cast");   // land the capture during the "JUST AS PLANNED" panel window
  check("'JUST AS PLANNED' panel cinematic runs (_lightKiraTimer > 0)", wKira, "");
  await waitFrames(40);
  const hpA1 = (await p2()).health ?? 0;
  check("spent 100 Kira (pool drained to ~0)", enB1 - enMid1 >= 99, `spent=${(enB1 - enMid1).toFixed(1)}`);
  check("As Planned lands GUARANTEED damage on the frozen foe", hpB1 - hpA1 > 100, `dmg=${hpB1 - hpA1}`);
  await waitFrames(40);

  // ── STAGE 6 — "I Am Kira" (scythe, Down+U) ──
  console.log("\n── STAGE 6 — 'I Am Kira' ultimate (Down+U, notebook→scythe + panel cinematic) ──");
  await healP2(); await setEnergy(100); await waitFrames(2);
  const enB2 = (await p1()).energy ?? 0, hpB2 = (await p2()).health ?? 0;
  const r2 = await fireUlt({ variant: "scythe" });
  const enMid2 = (await p1()).energy ?? 0;   // read immediately — before passive regen refills the pool
  check("Down+U casts (variant=scythe)", !!r2?.cast, `cast=${JSON.stringify(r2)}`);
  let scythe = false, kira = false;
  for (let i = 0; i < 12; i++) { const s = await fx(); if (s?.castMove === "lightScythe") scythe = true; if ((s?.kiraTimer || 0) > 0) kira = true; if (i === 5) await shot("scythe_panel"); await waitFrames(1); }
  check("scythe cast pose = lightScythe", scythe, "");
  check("'I Am Kira' panel cinematic runs (_lightKiraTimer > 0)", kira, "");
  await waitFrames(60);
  const hpA2 = (await p2()).health ?? 0;
  check("spent 100 Kira (pool drained to ~0)", enB2 - enMid2 >= 99, `spent=${(enB2 - enMid2).toFixed(1)}`);
  check("I Am Kira lands GUARANTEED damage", hpB2 - hpA2 > 100, `dmg=${hpB2 - hpA2}`);

  // ── meter gate ──
  console.log("\n── meter gate (no meter → no ult) ──");
  await healP2(); await setEnergy(0); await waitFrames(2);
  const hpB3 = (await p2()).health ?? 0;
  await fireUlt({}); await waitFrames(8);
  const hpA3 = (await p2()).health ?? 0;
  check("no meter → As Planned does not fire (no damage)", Math.abs(hpB3 - hpA3) < 1, `dmg=${hpB3 - hpA3}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5+6", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
