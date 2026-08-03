// harness/maki_stage4.mjs — Stage 4 evidence for Maki's HP-THRESHOLD Shibuya-Arc transformation ultimate.
// Proves: (1) the Ultimate button is a NO-OP above 25% HP; (2) the transform UNLOCKS at ≤25% HP and the
// unlock PERSISTS after healing back above 25%; (3) activation plays the freeze-cinematic and swaps to the
// Shibuya black-costume form; (4) ≥2 Shibuya-Arc moves connect post-transform; (5) the cinematic is single-
// body (no duplicate-render). Saves screenshots to harness/shots/maki_s4_*.png.
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
const mk = (who = "p1") => page.evaluate(w => window.__harness.makiShibuya(w), who);
const cine = () => page.evaluate(() => window.__harness.makiShibuyaCine());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function idleReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return (p.grounded ?? true) && !p.attacking && !p.currentMove; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
async function reposition(gap = 50) { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }
async function waitSheet(needle, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function pressUlt() { await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `maki_s4_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);

  // ── HP-THRESHOLD GATE ──
  section("HP-threshold gate — locked above 25%, unlocks at ≤25%, persists after healing");
  let m = await mk("p1");
  check("full HP → transform LOCKED (unlocked=false)", m.unlocked === false && m.active === false, `hp%=${m.hpPct} unlocked=${m.unlocked}`);
  await pressUlt(); await waitFrames(4);
  m = await mk("p1");
  check("Ultimate button is a NO-OP while locked (no transform, no cinematic)", m.active === false && !(await cine()).active, `active=${m.active}`);

  // drop to ≤25% HP → unlock (tracked in updateMiscTimers)
  await page.evaluate(() => window.__harness.setP1Health(250));   // 250 / 1180 ≈ 21% (≤25%)
  await waitFrames(4);
  m = await mk("p1");
  check("HP dropped to ≤25% → transform UNLOCKS", m.unlocked === true && m.hpPct <= 25, `hp%=${m.hpPct} unlocked=${m.unlocked}`);
  await shot("unlocked_low_hp");

  // heal back ABOVE 25% → unlock must PERSIST (confirmed behavior)
  await page.evaluate(() => window.__harness.healP1());
  await waitFrames(4);
  m = await mk("p1");
  check("healed back >25% → unlock PERSISTS (one-time comeback)", m.unlocked === true && m.hpPct > 25 && m.active === false, `hp%=${m.hpPct} unlocked=${m.unlocked}`);

  // ── ACTIVATION + CINEMATIC ──
  section("activation → freeze-cinematic → Shibuya-Arc form");
  await idleReady();
  await pressUlt();
  // cinematic should be active
  const started = await page.waitForFunction(() => window.__harness.makiShibuyaCine().active === true, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  check("Ultimate (now unlocked) → transform cinematic ACTIVATES", started, `cine=${JSON.stringify(await cine())}`);
  await waitFrames(6);
  const during = await p1();
  check("cinematic holds the Shibuya reveal pose (single body, no duplicate)", has(during, "maki_shibuya_intro_covered"), `sheet=${during.spriteSheet}`);
  await shot("cinematic");
  // DUPLICATE-RENDER GUARD: flash-only cinematic → the caster is NOT hidden and is the ONLY body rendered.
  const dup = await page.evaluate(() => { const p = window.__harness.p1(); const projs = window.__harness.projectiles(); return { hidden: !!p.kuramaHide, renders: !!p.spriteSheet, clones: projs.filter(x => (x.name || "").includes("maki")).length }; });
  check("no duplicate-render (caster visible & sole body, no clone overlay)", dup.renders === true && dup.clones === 0, `renders=${dup.renders} clones=${dup.clones}`);

  // wait for cinematic to finish → Shibuya form live
  await page.waitForFunction(() => window.__harness.makiShibuyaCine().active === false, null, { timeout: 6000, polling: 33 }).catch(() => {});
  await waitFrames(6);
  m = await mk("p1");
  const idleMv = await waitSheet("maki_shibuya_idle_covered", 30);
  check("post-cinematic → _shibuyaActive + currentForm 'shibuya'", m.active === true && m.form === "shibuya", `active=${m.active} form=${m.form}`);
  check("Shibuya form buffs damage (1.25×)", Math.abs(m.dmgMult - 1.25) < 0.001, `dmgMult=${m.dmgMult}`);
  check("Shibuya idle → maki_shibuya_idle_covered", has(idleMv, "maki_shibuya_idle_covered"), `sheet=${idleMv.spriteSheet}`);
  check("Shibuya scale bump (~1.86, keeps canon height)", Math.abs((m.spriteScale || 0) - 1.86) < 0.001, `scale=${m.spriteScale}`);
  await shot("shibuya_idle");

  // ── SHIBUYA MOVESET (≥2 moves connect) ──
  section("Shibuya-Arc moveset — ≥2 moves connect post-transform");
  for (const [nm, key, sheet] of [["light", "j", "maki_shibuya_light_covered"], ["up", "i", "maki_shibuya_up_covered"], ["heavy", "k", "maki_shibuya_heavy_covered"]]) {
    await idleReady();
    await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
    await reposition(nm === "heavy" ? 58 : 46);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet, 24);
    await shot(`shibuya_${nm}`);
    await page.keyboard.up(key);
    await waitFrames(14);
    const dmg = hp0 - (await p2()).health;
    check(`Shibuya ${nm} → ${sheet} + connects`, has(mv, sheet) && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  section("stability");
  check("no JS errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
