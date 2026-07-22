// harness/itachi_mangekyou.mjs
// STAGE 3 evidence: Mangekyou Sharingan buff-mode — charge→release activation at the energy
// threshold, continuous chakra drain, instant auto-revert at 0, buff multipliers, and the
// crimson activation flash. Reuses the SSJ-Rose drain shape (tickSustainedFormDrain).
// Run: node harness/itachi_mangekyou.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
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

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const section = (t) => console.log(`\n── ${t} ──`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `itachi_mangekyou_${tag}.png`) }); }
async function tapCharge(holdFrames) { await page.keyboard.down("p"); await waitFrames(holdFrames); await page.keyboard.up("p"); await waitFrames(2); }
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.resetFighterInput("p1"); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && (p.attackCooldown || 0) <= 0 && !p.charging; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=itachi`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── UNDER-THRESHOLD: does NOT activate ───────────────────────────────
  section("gated on energy threshold (150)");
  await settle();
  await page.evaluate(() => window.__harness.setEnergy(100));   // below 150
  await tapCharge(4);
  check("stays base below threshold", (await p1()).mangekyouActive === false, `active=${(await p1()).mangekyouActive} en=${(await p1()).energy.toFixed(0)}`);

  // ── AT THRESHOLD: activates on charge-release ────────────────────────
  section("charge → release ignites Mangekyou");
  await settle();
  await page.evaluate(() => window.__harness.fillEnergy());     // 200 ≥ 150
  await tapCharge(4);
  const on = await p1();
  check("Mangekyou active", on.mangekyouActive === true, `active=${on.mangekyouActive}`);
  check("currentForm = mangekyou", on.currentForm === "mangekyou", `form=${on.currentForm}`);
  check("buff damage multiplier ~1.20", Math.abs(on.damageMultiplier - 1.20) < 0.001, `mult=${on.damageMultiplier}`);
  check("activation eye-flash armed", on.mangekyouFlash > 0, `flash=${on.mangekyouFlash}`);
  await shot("active");

  // ── CONTINUOUS DRAIN ─────────────────────────────────────────────────
  section("continuous chakra drain while active");
  const e0 = (await p1()).energy;
  await waitFrames(40);
  const e1 = await p1();
  check("energy drains over time", e1.energy < e0, `${e0.toFixed(1)} → ${e1.energy.toFixed(1)}`);
  check("still active mid-drain", e1.mangekyouActive === true, `active=${e1.mangekyouActive}`);
  check("flash decays toward 0", e1.mangekyouFlash < on.mangekyouFlash, `flash ${on.mangekyouFlash} → ${e1.mangekyouFlash}`);

  // ── AUTO-REVERT AT ZERO ──────────────────────────────────────────────
  section("instant auto-revert when chakra runs dry");
  await page.evaluate(() => window.__harness.setEnergy(0.1));   // below one 0.28 drain tick → reverts next tick
  await waitFrames(3);
  const dry = await p1();
  check("auto-reverts to base at 0 energy", dry.mangekyouActive === false, `active=${dry.mangekyouActive} en=${dry.energy.toFixed(1)}`);
  check("buff multiplier cleared on revert", Math.abs(dry.damageMultiplier - 1) < 0.001, `mult=${dry.damageMultiplier}`);

  // ── MANUAL TAP-REVERT ────────────────────────────────────────────────
  section("quick-tap reverts early while active");
  await settle();
  await page.evaluate(() => window.__harness.fillEnergy());
  await tapCharge(4);
  check("re-activated", (await p1()).mangekyouActive === true, "");
  await tapCharge(1);   // quick tap
  check("tap while active reverts", (await p1()).mangekyouActive === false, `active=${(await p1()).mangekyouActive}`);

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Itachi Mangekyou (Stage 3): ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
