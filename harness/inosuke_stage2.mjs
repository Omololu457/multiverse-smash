// harness/inosuke_stage2.mjs — Stage 2 evidence for Inosuke Hashibira.
// Five basic normals (light/heavy/up/air/down_air) + the "Beast Breathing Flurry" 5-stage command
// chain (Fwd+Heavy → B1→B2→B3→B4→B5, cancel-on-hit) WITH a whiff interrupt, plus the Down+Heavy
// "Beast Fang" command normal. Real screenshots → harness/shots/inosuke_s2_*.png.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `inosuke_s2_${name}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 46) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }

async function driveChain(gap = 44) {
  await reset(gap);
  const hp0 = (await p2()).health; const chain = [];
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  for (let i = 0; i < 130; i++) {
    const c = await p1();
    if (c.currentMove && !chain.includes(c.currentMove)) chain.push(c.currentMove);
    if (!c.attacking) break;
    if (c.attackPhase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
    else await waitFrames(1);
  }
  await page.keyboard.up("d"); await waitFrames(8);
  return { chain, dmg: hp0 - (await p2()).health };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=inosuke&p2=inosuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(10);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.setP2Invuln?.(600); });

  // ── 5 BASIC NORMALS ──
  section("basic normals (light / heavy / up / air / down_air)");
  await reset(60);
  await tap("j"); let mv = await waitSheet("inosuke_light_uniform");
  check("light (J) → inosuke_light_uniform", has(mv, "inosuke_light_uniform"), `sheet=${mv.spriteSheet} action=${mv.action}`);
  await shot("light");

  await reset(60);
  await tap("k"); mv = await waitSheet("inosuke_heavy_uniform");
  check("heavy (K) → inosuke_heavy_uniform", has(mv, "inosuke_heavy_uniform"), `sheet=${mv.spriteSheet} action=${mv.action}`);
  await shot("heavy");

  await reset(60);
  await tap("i"); mv = await waitSheet("inosuke_up_uniform");
  check("up (I) → inosuke_up_uniform (launcher)", has(mv, "inosuke_up_uniform"), `sheet=${mv.spriteSheet} action=${mv.action}`);
  await shot("up");

  // air (neutral aerial light)
  await reset(60);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await tap("j", 1); mv = await waitSheet("inosuke_airdown_uniform", 14);
  check("air (jump→J) → inosuke_airdown_uniform, action=air", has(mv, "inosuke_airdown_uniform") && mv.action === "air", `sheet=${mv.spriteSheet} action=${mv.action}`);
  await shot("air");
  await waitGrounded();

  // down_air (airborne down+light)
  await reset(60);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await page.keyboard.down("s"); await tap("j", 1); await page.keyboard.up("s");
  mv = await waitSheet("inosuke_airdown_uniform", 14);
  check("down_air (air S+J) → action=down_air", mv.action === "down_air" && has(mv, "inosuke_airdown_uniform"), `sheet=${mv.spriteSheet} action=${mv.action}`);
  await shot("down_air");
  await waitGrounded();

  // ── COMMAND CHAIN: Beast Breathing Flurry ──
  section("Beast Breathing Flurry chain (B1→B2→B3→B4→B5) + whiff interrupt");
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));   // let hits land so the chain gates open
  const r = await driveChain(44);
  const wantStages = ["inosukeB1", "inosukeB2", "inosukeB3", "inosukeB4", "inosukeB5"];
  check("chain progresses B1 → B2 → B3 → B4 → B5", wantStages.every(k => r.chain.includes(k)), `chain=${r.chain.join(" → ")}`);
  check("chain deals cumulative damage (multiple stages connect > single finisher's 42)", r.dmg > 55, `dmg=${r.dmg}`);
  await shot("chain_finisher");

  // whiff: opener out of range must NOT chain past B1
  const w = await driveChain(520);
  check("whiffed opener does NOT chain past B1 (interrupt)", w.chain.length === 1 && w.chain[0] === "inosukeB1", `chain=${w.chain.join(" → ")}`);

  // ── DOWN+HEAVY: Beast Fang command normal ──
  section("Down+Heavy 'Beast Fang' command normal");
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  await reset(52);
  await page.keyboard.down("s");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  mv = await waitSheet("inosuke_downheavy_uniform", 12);
  const dm = await p1();
  check("Down+Heavy → inosukeDownHeavy (inosuke_downheavy_uniform)", has(mv, "inosuke_downheavy_uniform") && dm.currentMove === "inosukeDownHeavy", `sheet=${mv.spriteSheet} move=${dm.currentMove}`);
  await shot("beast_fang");
  await page.keyboard.up("s"); await waitFrames(6);

  // ── STABILITY ──
  section("stability");
  check("no JS errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
