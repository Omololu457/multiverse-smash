// harness/yuji_stage2.mjs — Stage 2 evidence for Yuji Itadori: the 5 confirmed normals connecting.
//   B        → light   (yuji_foward_attack_uniform)        — quick jab
//   Fwd+B    → heavy   (yuji_super_foward_attack_uniform)  — Divergent-Fist punch
//   Up+B     → up      (yuji_up_kick_uniform)              — rising launcher kick
//   Jump+B   → air     (yuji_air_attack_uniform)           — airborne strike
//   Down+B   → downAir (yuji_down_attack_uniform)          — airborne down-spike (engine downAir slot)
// Engine routing (game.js buildNormalControlState): j=light, k=heavy, i=up; airborne j=air, airborne s+j=downAir.
// Proves each fires its OWN sheet AND deals damage to the dummy. Saves harness/shots/yuji_s2_*.png.
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
async function reset(gap = 46) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !has(mv, needle); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `yuji_s2_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── GROUND NORMALS: light (B) / heavy (Fwd+B) / up (Up+B) ──
  section("ground normals — B / Forward+B / Up+B");
  for (const [nm, key, sheet, gap] of [
    ["light", "j", "yuji_foward_attack_uniform", 44],
    ["heavy", "k", "yuji_super_foward_attack_uniform", 60],
    ["up",    "i", "yuji_up_kick_uniform", 40],
  ]) {
    await reset(gap);
    if (nm === "heavy") await page.keyboard.down("d");    // Fwd+B: hold forward for the heavy
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    await shot(nm);
    await page.keyboard.up(key);
    if (nm === "heavy") await page.keyboard.up("d");
    await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check(`${nm} → ${sheet} + connects`, has(mv, sheet) && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── AIR NORMAL: Jump+B → air ──
  section("air normal — Jump+B");
  await reset(38);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(50));
    await page.keyboard.down("j");
    const mv = await waitSheet("yuji_air_attack_uniform");
    await shot("air");
    await page.keyboard.up("j"); await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check("air → yuji_air_attack_uniform + connects", has(mv, "yuji_air_attack_uniform") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── DOWN NORMAL: Down+B → downAir (airborne down-spike) ──
  section("down normal — Down+B (airborne down-spike)");
  await reset(30);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(56));
    await page.keyboard.down("s"); await page.keyboard.down("j");
    const mv = await waitSheet("yuji_down_attack_uniform", 14);
    await shot("down");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check("downAir → yuji_down_attack_uniform + connects", has(mv, "yuji_down_attack_uniform") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── DATA SANITY: the 5 categories all resolve to real hit data ──
  section("data sanity");
  const ba = await page.evaluate(async () => (await import("./characters.js")).characters.yuji.basic_attacks);
  check("light data present", (ba.light?.damage || 0) > 0, `dmg=${ba.light?.damage}`);
  check("heavy data present", (ba.heavy?.damage || 0) > 0, `dmg=${ba.heavy?.damage}`);
  check("upAttack is launcher", ba.upAttack?.type === "launcher" && (ba.upAttack?.knockbackY || 0) < 0, `type=${ba.upAttack?.type} kbY=${ba.upAttack?.knockbackY}`);
  check("airAttack data present", (ba.airAttack?.damage || 0) > 0, `dmg=${ba.airAttack?.damage}`);
  check("downAir data present", (ba.downAir?.damage || 0) > 0, `dmg=${ba.downAir?.damage}`);

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
