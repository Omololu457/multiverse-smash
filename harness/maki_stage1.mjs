// harness/maki_stage1.mjs — Stage 1 evidence for Maki Zenin (JJK, pure-physical naginata bruiser).
// Registration + portrait, base-form movement/state sprites (idle/walk/run/dash/jump/guard/hurt), and
// the DEFINING UI claim: Maki has NO resource meter at all (HP-only HUD, distinct from every other
// character — even Toji/Shinobu draw an empty flavored bar; Maki's whole energy panel is suppressed).
// Saves screenshots to harness/shots/maki_s1_*.png and prints verification data.
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
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `maki_s1_${name}.png`) }); }

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("maki"));
  check("maki.portrait wired", !!portrait, `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./maki_new_idle_uniform.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("idle sheet art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("jujutsu_kaisen", "training"));
  check("Jujutsu Kaisen universe includes maki", sel.roster.includes("maki"), `roster=${sel.roster.join(",")}`);

  // ── MOVEMENT / STATE ──
  section("movement / state sprites");
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(20);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);
  let mv = await p1();
  check("idle → maki_new_idle_uniform", has(mv, "maki_new_idle_uniform"), `sheet=${mv.spriteSheet}`);
  check("spriteScale = 1.63 (≈106px body ≈ 0.623×170cm)", Math.abs((mv.spriteScale || 0) - 1.63) < 0.001, `scale=${mv.spriteScale}`);
  await shot("idle");

  // walk (hold forward)
  await page.keyboard.down("d"); await waitFrames(10); mv = await p1();
  check("walk/run → maki_run_uniform", has(mv, "maki_run_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("walk");
  await page.keyboard.up("d"); await waitFrames(6);

  // dash (double-tap forward)
  await page.keyboard.press("d"); await page.keyboard.down("d"); await waitFrames(1); mv = await p1();
  for (let i = 0; i < 8 && !has(mv, "maki_dash_uniform"); i++) { await waitFrames(1); mv = await p1(); }
  check("dash → maki_dash_uniform", has(mv, "maki_dash_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("dash");
  await page.keyboard.up("d"); await waitFrames(8);

  // jump — hold up until airborne, sample mid-air
  await waitFrames(8);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2); mv = await p1();
  check("jump → maki_jump_uniform", has(mv, "maki_jump_uniform"), `sheet=${mv.spriteSheet} airborne=${!mv.grounded}`);
  await shot("jump");
  await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});

  // guard/block (hold down)
  await page.keyboard.down("s"); await waitFrames(8); mv = await p1();
  check("block/guard → maki_block_uniform", has(mv, "maki_block_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("block");
  await page.keyboard.up("s"); await waitFrames(4);

  // hurt (force hitstun)
  await page.evaluate(() => window.__harness.hurtP1(40)); await waitFrames(3); mv = await p1();
  check("hurt → maki_hit_uniform", has(mv, "maki_hit_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("hurt");
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(6);

  // ── NO ENERGY / RESOURCE METER (the defining Stage-1 UI claim) ──
  section("HP-only HUD — NO resource meter at all");
  // NOTE: the live fighter.maxEnergy is clamped to Math.max(1, …) engine-wide (createFighter),
  // so ALL no-energy chars read 1 live — irrelevant here since the panel is fully suppressed.
  // Assert the SOURCE data is 0 (no resource) instead.
  const dataEnergy = await page.evaluate(async () => (await import("./characters.js")).characters.maki.stats.maxEnergy);
  check("stats.maxEnergy data is 0 (no resource)", dataEnergy === 0, `data maxEnergy=${dataEnergy}`);
  const hiddenP1 = await page.evaluate(() => window.__harness.resourceMeterHidden("p1"));
  const hiddenP2 = await page.evaluate(() => window.__harness.resourceMeterHidden("p2"));
  check("energy panel SUPPRESSED for p1 (hideResourceMeter)", hiddenP1 === true, `hidden=${hiddenP1}`);
  check("energy panel SUPPRESSED for p2 (hideResourceMeter)", hiddenP2 === true, `hidden=${hiddenP2}`);
  await shot("hud_no_meter");

  // ── STABILITY ──
  section("stability");
  check("no JS errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
