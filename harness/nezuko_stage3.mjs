// harness/nezuko_stage3.mjs — Stage 3 evidence: Nezuko's 5 Y-family (Heavy) normals.
//   Y (k)            → nezuko_foward_punch  (straight heavy punch)
//   Fwd+Y (d+k)      → nezuko_angry_punch   (lunging hook — command normal)
//   Down+Y (s+k)     → nezuko_side_kick     (spinning side kick — command normal)
//   Jump+Y (air k)   → nezuko_air_attack_2  (aerial spin kick — air_heavy slot)
//   Jump+Down (air s+j) → nezuko_air_down_attack (downward dive — down_air slot)
// Asserts each renders the right sheet, connects (damage), and is visually distinct from the B-family.
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
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s3_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── NEUTRAL HEAVY ──
  section("ground: Y (foward_punch)");
  await reset(52);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("k");
    const mv = await waitSheet("nezuko_foward_punch");
    await shot("heavy");
    await page.keyboard.up("k"); await waitFrames(18);
    const dmg = hp0 - (await p2()).health;
    check("Y → nezuko_foward_punch + connects", has(mv, "nezuko_foward_punch") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
    check("distinct from B-family neutral (≠ nezuko_punch)", !has(mv, "nezuko_punch.png"), `sheet=${mv.spriteSheet}`);
  }

  // ── FORWARD+Y (command) ──
  section("command: Fwd+Y (angry_punch)");
  await reset(52);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(4);
    await page.keyboard.down("k");
    const mv = await waitSheet("nezuko_angry_punch", 14);
    await shot("angry");
    await page.keyboard.up("k");
    await waitFrames(16);
    await page.keyboard.up("d");
    const dmg = hp0 - (await p2()).health;
    check("Fwd+Y → nezuko_angry_punch + connects", has(mv, "nezuko_angry_punch") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── DOWN+Y (command) ──
  section("command: Down+Y (side_kick)");
  await reset(56);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(2);
    await page.keyboard.down("k");
    const mv = await waitSheet("nezuko_side_kick", 14);
    await shot("sidekick");
    await page.keyboard.up("k"); await page.keyboard.up("s");
    await waitFrames(18);
    const dmg = hp0 - (await p2()).health;
    check("Down+Y → nezuko_side_kick + connects", has(mv, "nezuko_side_kick") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── JUMP+Y (air_heavy) ──
  section("air: Jump+Y (air_attack_2)");
  await reset(40);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(50));
    await page.keyboard.down("k");
    const mv = await waitSheet("nezuko_air_attack_2", 12);
    await shot("airheavy");
    await page.keyboard.up("k"); await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check("Jump+Y → nezuko_air_attack_2 + connects", has(mv, "nezuko_air_attack_2") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── JUMP+DOWN air-down (down_air) ──
  section("air: Jump+Down (air_down_attack)");
  await reset(30);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(56));
    await page.keyboard.down("s"); await page.keyboard.down("j");
    const mv = await waitSheet("nezuko_air_down_attack", 10);
    await shot("airdown");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check("Jump+Down → nezuko_air_down_attack + connects", has(mv, "nezuko_air_down_attack") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  section("stability");
  check("no JS errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
