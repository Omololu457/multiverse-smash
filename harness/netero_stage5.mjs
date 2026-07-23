// harness/netero_stage5.mjs — Stage 5: the 4 Guanyin avatar attacks (leg/arm/combo-2hit/burst-frame-gated).
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
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
const shot = name => page.screenshot({ path: path.join(OUT, `netero_s5_${name}.png`) });

async function enterGiant() {
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => !!window.__harness.p1().canvasHeightFrac, null, { timeout: 5000, polling: 16 });
  await waitFrames(4);
}
async function prepG(gap) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
// Fire an avatar attack; sample p2 health + p1 action each frame. Count distinct damage events (hits),
// the sample index of the FIRST damage (windup proof), total damage, and the attack sheet used.
async function fireSample(key, n, name) {
  const h0 = (await p2()).health;
  let prev = h0, drops = 0, firstDrop = -1, sheet = null; const acts = new Set(); let shotAt = Math.floor(n / 3);
  await page.keyboard.down(key);
  for (let i = 0; i < n; i++) {
    const a = await record(); acts.add(a.action);
    if ((a.action || "").startsWith("guanyin")) sheet = a.spriteSheet;
    if (i === 2) await page.keyboard.up(key);
    if (i === shotAt) await shot(name);
    const h = (await p2()).health;
    if (h < prev - 0.01) { drops++; if (firstDrop < 0) firstDrop = i; }
    prev = h;
    await waitFrames(1);
  }
  await page.keyboard.up(key).catch(() => {});
  return { acts, drops, firstDrop, totalDmg: h0 - prev, sheet };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=netero`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await enterGiant();
  check("in Guanyin giant form", !!(await p1()).canvasHeightFrac, "");

  // ── leg strike (light) ──
  section("leg strike (light) — connects");
  await prepG(150);
  { const r = await fireSample("j", 24, "leg");
    check("leg strike uses guanyin_leg_strike sheet", r.acts.has("guanyinLeg") && (r.sheet || "").includes("guanyin_leg_strike"), `acts=[${[...r.acts]}] sheet=${r.sheet}`);
    check("leg strike connects", r.totalDmg > 0, `−${r.totalDmg.toFixed(0)} hits=${r.drops}`); }

  // ── arm sweep (heavy) ──
  section("arm sweep (heavy) — wide arc connects");
  await prepG(180);
  { const r = await fireSample("k", 28, "arm");
    check("arm sweep uses guanyin_arm_sweep sheet", r.acts.has("guanyinArm") && (r.sheet || "").includes("guanyin_arm_sweep"), `acts=[${[...r.acts]}] sheet=${r.sheet}`);
    check("arm sweep connects", r.totalDmg > 0, `−${r.totalDmg.toFixed(0)}`); }

  // ── combo slash (special) — 2 HITS ──
  section("combo slash (special) — registers as 2 HITS");
  await prepG(150);
  { const r = await fireSample("l", 34, "combo");
    check("combo slash uses guanyin_combo_slash sheet", r.acts.has("guanyinCombo") && (r.sheet || "").includes("guanyin_combo_slash"), `acts=[${[...r.acts]}] sheet=${r.sheet}`);
    check("combo slash registers 2 distinct hits", r.drops >= 2, `hits=${r.drops} −${r.totalDmg.toFixed(0)}`); }

  // ── punch burst (up) — hitbox only frames 3-6 ──
  section("punch burst (up) — windup (frames 1-2) non-damaging, burst (3-6) hits");
  await prepG(160);
  { const r = await fireSample("i", 30, "burst");
    check("punch burst uses guanyin_punch_burst sheet", r.acts.has("guanyinBurst") && (r.sheet || "").includes("guanyin_punch_burst"), `acts=[${[...r.acts]}] sheet=${r.sheet}`);
    check("punch burst connects", r.totalDmg > 0, `−${r.totalDmg.toFixed(0)}`);
    check("windup is non-damaging (no hit in the opening frames)", r.firstDrop >= 2, `firstHit@sample=${r.firstDrop}`); }

  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !(s.includes("netero") || s.includes("guanyin")));
  check(`all ${seenActions.size} exercised actions use a netero/guanyin sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  NETERO Stage 5: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
