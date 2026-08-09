// harness/nezuko_stage2.mjs — Stage 2 evidence: Nezuko's 5 B-family (Light) normals.
//   B (j)          → nezuko_punch      (jab flurry, connects)
//   Up+B (i)       → nezuko_up_attack  (rising kick launcher, connects)
//   Jump+B (air j) → nezuko_air_attack_1 (aerial kick, connects)
//   Fwd+B (d + j)  → nezuko_ball_kick + a TRAVELLING ball projectile (connects via projectile)
//   Down+B (s + j) → nezuko_dodge      (low i-frame EVADE — grants invuln, deals NO damage / not a strike)
// Asserts the right sheet renders, the 4 strikes connect, and the dodge evades (invuln>0) without striking.
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
const invuln = () => page.evaluate(() => window.__harness.gbHitState()?.invulnTimer || 0);
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
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s2_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── GROUND NEUTRAL LIGHT + UP ──
  section("ground normals: B (punch), Up+B (up_attack)");
  for (const [nm, key, sheet] of [["light(B)", "j", "nezuko_punch"], ["up(Up+B)", "i", "nezuko_up_attack"]]) {
    await reset(44);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    await shot(nm.replace(/[()+]/g, ""));
    await page.keyboard.up(key);
    await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check(`${nm} → ${sheet} + connects`, has(mv, sheet) && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── AIR LIGHT: Jump+B ──
  section("air normal: Jump+B (air_attack_1)");
  await reset(40);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(48));
    await page.keyboard.down("j");
    const mv = await waitSheet("nezuko_air_attack_1");
    await shot("air");
    await page.keyboard.up("j"); await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check("air(Jump+B) → nezuko_air_attack_1 + connects", has(mv, "nezuko_air_attack_1") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── FORWARD+B: ball kick launches a travelling projectile ──
  section("command normal: Fwd+B (ball kick → projectile)");
  await reset(90);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("d");           // hold forward
    await waitFrames(4);                      // let forward register (walking)
    await page.keyboard.down("j");           // + light (fresh edge) → ball kick
    const mv = await waitSheet("nezuko_ball_kick.png", 14);
    await shot("ballkick");
    check("Fwd+B → nezuko_ball_kick sprite", has(mv, "nezuko_ball_kick.png"), `sheet=${mv.spriteSheet}`);
    await page.keyboard.up("j");
    await waitFrames(30);                     // let the ball travel + connect
    await page.keyboard.up("d");
    const dmg = hp0 - (await p2()).health;
    check("Fwd+B ball projectile connects", dmg > 0, `dmg=${dmg}`);
  }

  // ── DOWN+B: low i-frame dodge — EVADE, not a strike ──
  section("command normal: Down+B (dodge — evade, NOT a strike)");
  await reset(44);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("s");            // hold down
    await page.keyboard.down("j");            // + light → dodge
    const mv = await waitSheet("nezuko_dodge", 12);
    const iv = await invuln();
    await shot("dodge");
    await page.keyboard.up("j"); await page.keyboard.up("s");
    await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check("Down+B → nezuko_dodge sprite", has(mv, "nezuko_dodge"), `sheet=${mv.spriteSheet}`);
    check("Down+B grants i-frames (invuln>0)", iv > 0, `invulnTimer=${iv}`);
    check("Down+B deals NO damage (evade, not a strike)", dmg === 0, `dmg=${dmg}`);
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
