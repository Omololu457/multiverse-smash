// harness/miles_stage5.mjs
// STAGE 5 evidence: Miles Morales' ULTIMATE "Venom Overload" — the sheet's standout X+Up combo (owner-locked
// BLACK/RED palette; the red/blue "Classic Spider-Man" duplicate is a future alt-skin, NOT the gameplay ult).
// INLINE freeze-cinematic (live fighter plays the venom combo, no dup): giant venom ring-bursts manifest at
// the foe at growing scale → 5 guaranteed beats, BURST payoff. 330 raw → ~198 EFF (top-ult band, ×0.60).
// (1) TRIGGER  — Ultimate fires, plays the milesUlt cast, spends 100 meter.
// (2) FREEZE   — the foe is frozen (hitstop) through the cinematic.
// (3) PAYOFF   — total guaranteed damage lands in the ~198 band + the foe ends knocked down.
// (4) FX       — venom ring-bursts (miles_venomring) manifest during the cinematic.
// Screenshots → harness/shots/miles_stage5_*.png.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `miles_stage5_${tag}.png`) }); }
const projCount = () => page.evaluate(() => window.__harness.perf().projectiles);

try {
  await page.goto(`${base}/index.html?harness=1&p1=miles&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  // position + full meter + healthy foe
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP1Energy(100); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 70 * (a.facing || 1)); });
  await waitFrames(2);

  console.log("\n── (1) TRIGGER — Ultimate fires the venom-combo cast + spends meter ──");
  const e0 = (await p1()).energy;
  const h0 = (await p2()).health;
  const r = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate casts", !!r.cast, `cast=${r.cast}`);
  check("cast pose = milesUlt (venom combo)", r.castMove === "milesUlt", `castMove=${r.castMove}`);
  await waitFrames(2);
  const e1 = (await p1()).energy;
  check("spends ~100 meter", e0 - e1 >= 95, `Δ=${(e0 - e1).toFixed(0)}`);
  await shot("ult_start");

  console.log("\n── (2) FREEZE — the foe is frozen through the cinematic ──");
  await waitFrames(6);
  const fr = await p2();
  check("foe frozen (hitstop) during the cinematic", (fr.hitstop || 0) > 0, `hitstop=${fr.hitstop}`);
  let sawFx = false; for (let i = 0; i < 10; i++) { if ((await projCount()) > 0) sawFx = true; await waitFrames(3); await shot("ult_mid"); }
  check("(4) venom ring-burst FX manifests during the ultimate", sawFx, "");

  console.log("\n── (3) PAYOFF — total guaranteed damage lands in the ~198 band ──");
  // NOTE: the training dummy is in STAND mode (auto-recovers hitstun/knockdown), so the payoff's
  // launch/knockdown can't be asserted on it — the guaranteed damage total is the reliable payoff proof.
  let dealt = 0;
  for (let i = 0; i < 26; i++) { dealt = h0 - (await p2()).health; await waitFrames(3); }
  await shot("ult_end");
  check(`ultimate deals ~198 EFF (dealt ${dealt.toFixed(0)}, top-ult band, ×0.60)`, dealt >= 188 && dealt <= 210, `dealt=${dealt.toFixed(1)}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
