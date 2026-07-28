// harness/hisoka_stage2.mjs
// Stage 2 verification: Hisoka's 5 normals + "Card Flourish" Down+Heavy command-normal chain
// (rekka1 strike → rekka2 card-slash launcher, cancel-on-hit) + mid-chain interrupt, w/ screenshots.
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
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function prep(gap, refillEnergy = true) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(re => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); if (re) window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); }, refillEnergy);
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function dmgFrom(pressFn) { const hp0 = (await p2()).health; await pressFn(); await waitFrames(22); return hp0 - (await p2()).health; }
const shot = name => page.screenshot({ path: path.join(OUT, `hisoka_s2_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=hisoka`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── registration ──
  section("registration");
  const g = await record();
  check("P1 is Hisoka", g.key === "hisoka", `key=${g.key}`);

  // ── 5 normals ──
  section("5 normals connect + resolve to hisoka sheets");
  for (const [name, key, gap, expectSheet] of [
    ["light", "j", 52, "hisoka_light_uniform"],
    ["heavy", "k", 58, "hisoka_heavy_uniform"],
    ["up",    "i", 50, "hisoka_up_uniform"],
  ]) {
    await prep(gap);
    let sheet = "";
    const d = await dmgFrom(async () => { await page.keyboard.down(key); await waitFrames(4); const r = await record(); sheet = r.spriteSheet || ""; await shot(name); await page.keyboard.up(key); });
    check(`${name} connects`, d > 0, `−${d.toFixed(0)}`);
    check(`${name} sheet = ${expectSheet}`, sheet.includes(expectSheet), `sheet=${sheet}`);
  }
  // air (neutral aerial)
  await prep(44);
  { let sheet = ""; const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(46)); await page.keyboard.down("j"); await waitFrames(3); const r = await record(); sheet = r.spriteSheet || ""; await shot("air"); await page.keyboard.up("j"); });
    check("air connects", d > 0, `−${d.toFixed(0)}`); check("air sheet = hisoka_air_uniform", sheet.includes("hisoka_air_uniform"), `sheet=${sheet}`); }
  // down_air (dive smash)
  await waitGrounded(); await prep(30);
  { let sheet = ""; const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(52)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); const r = await record(); sheet = r.spriteSheet || ""; await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); });
    check("down_air connects", d > 0, `−${d.toFixed(0)}`); check("down_air sheet = hisoka_downair_uniform", sheet.includes("hisoka_downair_uniform"), `sheet=${sheet}`); }
  await waitGrounded();

  // ── Card Flourish chain (Down+Heavy rekka) ──
  section("Card Flourish command chain (Down+Heavy → rekka1 → rekka2)");
  await prep(40);
  const hp0 = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  await waitFrames(2); await shot("chain_rekka1");
  // Continuously sample currentMove; re-tap Heavy the first time rekka1 enters recovery to cancel into rekka2.
  const moves = new Set(); let retapped = false; let shotRekka2 = false;
  for (let i = 0; i < 70; i++) {
    const p = await record();
    if (p.currentMove) moves.add(p.currentMove);
    if (p.currentMove === "hisokaRekka2" && !shotRekka2) { await shot("chain_rekka2"); shotRekka2 = true; }
    if (!retapped && p.attacking && p.currentMove === "hisokaRekka1" && p.attackPhase === "recovery") {
      await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); retapped = true; continue;
    }
    if (!p.attacking && i > 4) break;
    await waitFrames(1);
  }
  check("opener fired rekka1", moves.has("hisokaRekka1"), `moves=${[...moves].join(",")}`);
  check("cancels into rekka2 on hit", moves.has("hisokaRekka2"), `moves=${[...moves].join(",")}`);
  await waitFrames(24);
  const chainDmg = hp0 - (await p2()).health;
  check("full chain deals damage (both hits)", chainDmg > 40, `−${chainDmg.toFixed(0)}`);
  await waitFrames(20);

  // ── mid-chain interrupt: a WHIFFED opener must NOT advance to rekka2 ──
  section("mid-chain interrupt — whiff ends the string");
  await prep(360);   // P2 far → rekka1 whiffs
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  const opener = (await p1()).currentMove;
  // wait into recovery, then re-tap Heavy — cancel-on-hit means a whiff leaves _cmdHitLanded false → no rekka2
  let sawRekka2 = false;
  for (let i = 0; i < 30; i++) { const p = await record(); if (p.attackPhase === "recovery") { await tapKey("k"); break; } if (!p.attacking) break; await waitFrames(1); }
  for (let i = 0; i < 20; i++) { const m = (await p1()).currentMove; if (m === "hisokaRekka2") { sawRekka2 = true; break; } await waitFrames(1); }
  await shot("interrupt");
  check("opener was rekka1", opener === "hisokaRekka1", `opener=${opener}`);
  check("whiffed opener does NOT cancel into rekka2", !sawRekka2, sawRekka2 ? "ILLEGALLY chained on whiff" : "string ended (correct)");
  await waitFrames(20);

  // ── fallback-box sweep ──
  section("fallback-box sweep — every exercised attack resolves to a hisoka sheet");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("hisoka"));
  check(`all ${seenActions.size} exercised actions use a hisoka sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("FATAL", e); FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  HISOKA Stage 2: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
