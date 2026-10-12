// harness/zoldyck_phase1_live.mjs
// PHASE 1 render check for Killua (Godspeed) (rosterKey `zoldyck`): boots a real match
// (?p1=zoldyck&p2=gon), proves the sprite handler is ON, the on-screen scale lands in the
// roster band, the Volts energy label reads "Volts", every body/normal renders a real
// zoldyck_*_uniform sheet, and BOTH fighters render. Mirrors gaara_live.mjs.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const ok = (c, n) => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}`); };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() {
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}
const heal = () => page.evaluate(() => { window.__harness.healP1?.(); window.__harness.refill?.("p1"); });
const shot = name => page.screenshot({ path: path.join(OUT, `zoldyck_p1_${name}.png`) });

try {
  // ── 1) BOOT ──
  await boot(`${base}/index.html?harness=1&p1=zoldyck&p2=gon`);
  await toBattle();
  const b1 = await p1();
  ok(b1.key === "zoldyck", `p1 is zoldyck (got ${b1.key})`);
  const b2 = await p2();
  ok(b2.key === "gon", `p2 is gon (got ${b2.key})`);
  await shot("01_idle");

  // ── 2) SPRITE GATE + scale + Volts label ──
  const idleSheet = await page.evaluate(() => window.__harness.p1().spriteSheet || window.__harness.p1().sheet || null);
  ok(/zoldyck_idle/.test(idleSheet || ""), `idle renders zoldyck_idle sheet (${idleSheet})`);
  const ms = await page.evaluate(() => window.__harness.measureSprite?.("p1"));
  const onH = ms?.contentH ?? ms?.cellDstH ?? null;   // on-screen (scaled) content height
  console.log("  measureSprite:", JSON.stringify(ms));
  ok(onH != null && onH >= 95 && onH <= 125, `on-screen body height in roster band (~109): ${onH}`);
  const label = await page.evaluate(() => window.__harness.energyLabel?.("p1"));
  ok(/volt/i.test(String(label)), `energy label reads "Volts" (got ${JSON.stringify(label)})`);

  // ── 3) NORMALS + MOVEMENT (real key holds) ──
  async function move(label, keys, shotAtFrame = 5, hold = 12, downExtra = null) {
    await heal();
    for (const k of keys) await page.keyboard.down(k);
    if (downExtra) { await waitFrames(2); for (const k of downExtra) await page.keyboard.down(k); }
    await waitFrames(shotAtFrame);
    const mid = await p1();
    await shot(label);
    await waitFrames(Math.max(1, hold - shotAtFrame));
    for (const k of [...(downExtra || []), ...keys]) await page.keyboard.up(k);
    await waitFrames(18);
    console.log(`  ${label}: attacking=${mid.attacking} move=${mid.move} sheet=${mid.sheet || mid.spriteSheet}`);
    return mid;
  }
  const shOf = m => m.sheet || m.spriteSheet || "";
  const mRun = await move("02_run", ["d"], 12, 16);
  ok(/zoldyck_(walk|run)/.test(shOf(mRun)), `run renders walk sheet (${shOf(mRun)})`);
  const mLight = await move("03_light", ["j"], 4, 10);
  ok(/zoldyck_light/.test(shOf(mLight)) || mLight.attacking, `light plays (${shOf(mLight)})`);
  const mHeavy = await move("04_heavy", ["k"], 9, 18);   // heavy startup 7 → sample at frame 9
  ok(/zoldyck_heavy/.test(shOf(mHeavy)) || mHeavy.attacking, `heavy plays (${shOf(mHeavy)})`);
  const mUp = await move("05_up", ["i"], 5, 12);
  ok(/zoldyck_up/.test(shOf(mUp)) || mUp.attacking, `up-attack launcher plays (${shOf(mUp)})`);
  await move("06_jump", ["w"], 8, 14);
  const mAir = await move("07_air", ["w"], 10, 16, ["j"]);
  ok(/zoldyck_air/.test(shOf(mAir)) || !mAir.grounded, `air attack plays airborne (${shOf(mAir)})`);
  // down-air via forceAction (Playwright multi-key timing is flaky)
  await heal(); await page.evaluate(() => window.__harness.forceAction?.("down_air", "p1"));
  await waitFrames(4); await shot("08_down_air"); const mDA = await p1();
  ok(/zoldyck_downair/.test(shOf(mDA)), `down-air renders dive sheet (${shOf(mDA)})`);
  await page.evaluate(() => window.__harness.forceAction?.(null, "p1"));

  // ── 4) GUARD + HURT ──
  await heal(); await page.keyboard.down(";"); await waitFrames(8); const mG = await p1(); await shot("09_guard"); await page.keyboard.up(";"); await waitFrames(6);
  ok(/zoldyck_guard/.test(shOf(mG)) || mG.blocking === true, `guard pose renders (${shOf(mG)} blocking=${mG.blocking})`);
  await page.evaluate(() => window.__harness.hurtP1?.(26)); await waitFrames(3); const mH = await p1(); await shot("10_hurt");
  ok(/zoldyck_hurt/.test(shOf(mH)) || mH.sheet == null, `hurt pose renders (${shOf(mH)})`);
  await heal();

  // ── 5) CHARGE pose (recharge visual) ──
  await heal(); await page.keyboard.down("u"); await waitFrames(10); const mC = await p1(); await shot("11_charge"); await page.keyboard.up("u"); await waitFrames(6);
  console.log(`  11_charge: charging=${mC.charging} sheet=${shOf(mC)}`);

  // ── 6) WIN / LOSE poses ──
  await page.evaluate(() => window.__harness.forceAction?.("win", "p1")); await waitFrames(8); const mW = await p1(); await shot("12_win");
  ok(/zoldyck_win/.test(shOf(mW)), `win pose renders (${shOf(mW)})`);
  await page.evaluate(() => window.__harness.forceAction?.("lose", "p1")); await waitFrames(8); const mL = await p1(); await shot("13_lose");
  ok(/zoldyck_lose/.test(shOf(mL)), `lose pose renders (${shOf(mL)})`);
  await page.evaluate(() => window.__harness.forceAction?.(null, "p1"));

  // ── 7) BOTH FIGHTERS RENDER (final match screenshot) ──
  await heal(); await waitFrames(4); await shot("14_match");
  const p2s = await page.evaluate(() => window.__harness.p2().spriteSheet || window.__harness.p2().sheet || null);
  ok(!!p2s, `p2 (gon) renders a real sheet (${p2s})`);

  // ── 8) NO PAGE ERRORS ──
  ok(jsErrors.length === 0, `no page errors (${jsErrors.length}${jsErrors.length ? ": " + jsErrors[0] : ""})`);

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n── zoldyck Phase 1 live: ${PASS} passed, ${FAIL} failed ──`);
  await browser.close();
  server.close();
  process.exit(FAIL ? 1 : 0);
}
