// harness/shinobu_stage2.mjs — Stage 2 evidence: Shinobu's 5 basic normals.
// Drives each normal (light/heavy/up/air/down_air) vs a dummy, asserts the correct thrust sheet
// renders AND the hit connects (damage dealt), and saves a screenshot at the active frame.
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
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 48) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `shinobu_s2_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=shinobu&p2=shinobu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── GROUND NORMALS: light / heavy / up ──
  section("ground normals (light / heavy / up)");
  for (const [nm, key, sheet] of [["light", "j", "shinobu_light_uniform"], ["heavy", "k", "shinobu_heavy_uniform"], ["up", "i", "shinobu_up_uniform"]]) {
    await reset(nm === "heavy" ? 60 : 46);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    await shot(nm);
    await page.keyboard.up(key);
    await waitFrames(14);
    const dmg = hp0 - (await p2()).health;
    check(`${nm} → ${sheet} + connects`, has(mv, sheet) && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── AIR NORMAL: air (light while airborne) ──
  section("air normal");
  await reset(40);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(48));
    await page.keyboard.down("j");
    const mv = await waitSheet("shinobu_air_uniform");
    await shot("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const dmg = hp0 - (await p2()).health;
    check("air → shinobu_air_uniform + connects", has(mv, "shinobu_air_uniform") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── DOWN-AIR NORMAL: down + light while airborne ──
  section("down_air normal");
  await reset(30);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j");
    const mv = await waitSheet("shinobu_down_air_uniform", 10);
    await shot("down_air");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const dmg = hp0 - (await p2()).health;
    check("down_air → shinobu_down_air_uniform + connects", has(mv, "shinobu_down_air_uniform") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

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
