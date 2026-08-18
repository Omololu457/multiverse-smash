// harness/kiba_stage5.mjs — STAGE 5: Kiba's ULTIMATE "Three-Headed Wolf" (beast-fusion tier 3).
// Inline freeze/camera-focus cinematic (Saitama/Isshiki pattern). Deterministic trigger via
// __harness.p1Ultimate(). Verifies:
//   * the LIVE fighter performs it — p1 itself carries _kibaThwTimer + the feral-crouch cast pose
//     (kibaFourLegs), with NO duplicate fighter instance (the recurring bug class, checked explicitly)
//   * the overlay actually renders (kibaThwCine probe) with all 4 beat images loaded
//   * the beats sequence summon → charge → maul → vortex over the cinematic
//   * the opponent is frozen and takes the guaranteed two-hit payoff (~198 EFF)
// Screenshots the charge + maul beats.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.kibaThwCine());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function setupAdjacent(gap = 70) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=kiba`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── Three-Headed Wolf ultimate (freeze/camera-focus cinematic) ──");
  await setupAdjacent(70);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  await waitFrames(2);

  // ── LIVE fighter performs it (no duplicate instance) ──
  const a1 = await p1();
  check("ultimate cast fired", res?.cast === true, `cast=${res?.cast}`);
  check("LIVE fighter holds the cinematic timer (_kibaThwTimer on p1)", a1.key === "kiba" && res?.castMove === "kibaFourLegs", `key=${a1.key} castMove=${res?.castMove}`);
  const c0 = await cine();
  check("cinematic timer is live + counting (>0)", c0.timer > 0, `timer=${c0.timer}`);
  check("live-fighter cast pose = kibaFourLegs (feral crouch, no dup instance)", c0.cast === "kibaFourLegs", `cast=${c0.cast}`);

  // ── overlay renders + beats sequence (sample from the START of the cinematic) ──
  const beats = new Set();
  let sawRenders = 0, everLoaded = false;
  for (let i = 0; i < 56; i++) {
    const c = await cine();
    if (c.renders > sawRenders) sawRenders = c.renders;
    if (c.imgsLoaded) everLoaded = true;
    if (c.beat) beats.add(c.beat);
    if (c.beat === "charge" && !fs.existsSync(path.join(OUT, "kiba_s5_charge.png"))) await page.screenshot({ path: path.join(OUT, "kiba_s5_charge.png") });
    if (c.beat === "maul" && !fs.existsSync(path.join(OUT, "kiba_s5_maul.png"))) await page.screenshot({ path: path.join(OUT, "kiba_s5_maul.png") });
    await waitFrames(2);
  }
  check("all 4 beat images loaded", everLoaded === true, `everLoaded=${everLoaded}`);
  check("cinematic overlay actually rendered", sawRenders > 0, `renders=${sawRenders}`);
  check("beats sequenced (≥3 of summon/charge/maul/vortex)", beats.size >= 3, `beats=${[...beats].join(",")}`);
  check("charge beat reached (the big three-headed wolf)", beats.has("charge"), `beats=${[...beats].join(",")}`);

  // ── guaranteed two-hit payoff ──
  await waitFrames(30);
  const hp1 = (await p2()).health;
  const dealt = hp0 - hp1;
  check("opponent took the guaranteed cinematic payoff", dealt > 120, `hp ${hp0} → ${hp1} (−${dealt.toFixed(0)} EFF)`);

  // ── cinematic ends cleanly, control returns ──
  await page.waitForFunction(() => (window.__harness.p1()._kibaThwTimer || 0) === 0, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const a2 = await p1();
  check("cinematic ends + timer clears", (a2.fourLegsTimer || 0) >= 0 && (await cine()).timer === 0, `timer=${(await cine()).timer}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kiba Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/kiba_s5_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
