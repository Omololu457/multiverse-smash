// harness/zoldyck_phase2_live.mjs
// PHASE 2 verification for Killua (Godspeed) `zoldyck`: VOLTS (no self-regen + hold-Charge recharge) +
// the 5 directional Volts specials (N Thunderbolt / F Rhythm Echo / B Echo Strike / D Narukami / U Snack
// Break) + the neutral-Ultimate Thunderbolt Barrage. Real key input (?p1=zoldyck&p2=gon). Keys: j=light
// k=heavy l=special u=ultimate p=charge ;=block, w/a/s/d.
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
const ok = (c, n) => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}`); };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const zs = () => page.evaluate(() => window.__harness.zoldyckState("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() {
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}
const setE = v => page.evaluate(vv => window.__harness.setEnergy(vv), v);
// ready for a fresh input: top up Volts (fillEnergy) and wait for attackCooldown/attacking to clear.
async function refill() {
  await page.evaluate(() => window.__harness.fillEnergy());
  await page.waitForFunction(() => { const z = window.__harness.zoldyckState("p1"); return (z?.cooldown || 0) <= 0 && !z?.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
}
const shot = n => page.screenshot({ path: path.join(OUT, `zoldyck_p2_${n}.png`) });
// fire a special: clear cooldowns, (hold dir), tap special, let it resolve
async function special(dir, settle = 10) {
  await refill(); await waitFrames(2);
  if (dir) await page.keyboard.down(dir);
  if (dir) await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  await waitFrames(settle);
  const s = await zs();
  if (dir) await page.keyboard.up(dir);
  await waitFrames(8);
  return s;
}

try {
  await boot(`${base}/index.html?harness=1&p1=zoldyck&p2=gon`);
  await toBattle();
  const b = await zs();
  ok(b && b.key === "zoldyck", `p1 is zoldyck (Volts max ${b?.maxEnergy})`);

  // ── 1) VOLTS do NOT self-regenerate ──
  await setE(50); await waitFrames(2); const e0 = (await zs()).energy;
  await waitFrames(90); const e1 = (await zs()).energy;
  console.log(`  no-regen: energy ${e0} → ${e1} after 90 idle frames`);
  ok(e1 <= e0 + 1, `Volts do NOT self-regenerate (${e0}→${e1})`);
  await shot("01_noregen");

  // ── 2) RECHARGE by holding Charge ("p") ──
  await setE(20); await waitFrames(2); const r0 = (await zs()).energy;
  await page.keyboard.down("p"); await waitFrames(40); const r1 = (await zs()).energy; await page.keyboard.up("p");
  console.log(`  recharge: energy ${r0} → ${r1} after 40 charge frames`);
  ok(r1 > r0 + 8, `holding Charge refills Volts (${r0}→${r1})`);
  await shot("02_recharge");
  await waitFrames(10);

  // ── 3) N+Special THUNDERBOLT — bolt projectile, spends Volts ──
  { const eBefore = 100; await refill(); const s = await special(null, 14);
    console.log(`  thunderbolt: energy→${s.energy} projSelf=${s.projSelf} cast=${s.cast}`);
    ok(s.energy <= eBefore - 18, `Thunderbolt spent Volts (→${s.energy})`);
    ok(s.projSelf >= 1 || /zoldyckThunderbolt/.test(s.cast || ""), `Thunderbolt fired a bolt / cast pose (proj=${s.projSelf}, cast=${s.cast})`);
    await shot("03_thunderbolt"); }

  // ── 4) F+Special RHYTHM ECHO — i-frames (afterimages absorb hits) + Volts ──
  { const s = await special("d", 6);
    console.log(`  rhythm echo: energy→${s.energy} invuln=${s.invuln} echo=${s.echo} cast=${s.cast}`);
    ok(s.energy <= 100 - 14, `Rhythm Echo spent Volts (→${s.energy})`);
    ok(s.invuln > 0 || s.echo > 0 || /zoldyckRhythmEcho/.test(s.cast || ""), `Rhythm Echo grants i-frames/afterimages (invuln=${s.invuln}, echo=${s.echo})`);
    await shot("04_rhythmecho"); }

  // ── 5) B+Special ECHO STRIKE — advancing multi-hit + Volts ──
  { const s = await special("a", 8);
    console.log(`  echo strike: energy→${s.energy} attacking=${s.attacking} cast=${s.cast}`);
    ok(s.energy <= 100 - 20, `Echo Strike spent Volts (→${s.energy})`);
    ok(s.attacking || /zoldyckEchoStrike/.test(s.cast || ""), `Echo Strike enters an attack (attacking=${s.attacking}, cast=${s.cast})`);
    await shot("05_echostrike"); }

  // ── 6) D+Special NARUKAMI — leap → lightning pillars at the foe + Volts ──
  { await refill(); await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    await waitFrames(26); const s = await zs(); await page.keyboard.up("s"); await waitFrames(8);
    console.log(`  narukami: energy→${s.energy} projSelf=${s.projSelf} cast=${s.cast}`);
    ok(s.energy <= 100 - 24, `Narukami spent Volts (→${s.energy})`);
    ok(s.projSelf >= 1 || /zoldyckNarukami/.test(s.cast || ""), `Narukami spawned lightning pillars / cast (proj=${s.projSelf}, cast=${s.cast})`);
    await shot("06_narukami"); }

  // ── 7) U+Special SNACK BREAK — ChocoRobo refills ~40 Volts (vulnerable) ──
  { await setE(20); await waitFrames(2); const before = (await zs()).energy;
    await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    await waitFrames(56); const s = await zs(); await page.keyboard.up("w"); await waitFrames(8);
    console.log(`  snack break: energy ${before} → ${s.energy} (expect ~+40)`);
    ok(s.energy >= before + 30, `Snack Break refilled ~40 Volts (${before}→${s.energy})`);
    await shot("07_snackbreak"); }

  // ── 8) ULTIMATE (neutral U) THUNDERBOLT BARRAGE — big Volts, guaranteed damage ──
  { await refill(); await page.evaluate(() => window.__harness.healP2?.()); await waitFrames(2);
    const oppBefore = (await zs()).oppHealth; const eBefore = (await zs()).energy;
    await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u");
    await waitFrames(90); const s = await zs();
    console.log(`  barrage ult: energy ${eBefore}→${s.energy}  oppHealth ${oppBefore}→${s.oppHealth}  cast=${s.cast} variant=${s.ultVariant}`);
    ok(s.energy < eBefore - 50, `Thunderbolt Barrage spent a big chunk of Volts (${eBefore}→${s.energy})`);
    ok(s.oppHealth < oppBefore, `Thunderbolt Barrage dealt guaranteed damage (${oppBefore}→${s.oppHealth})`);
    await shot("08_barrage"); }

  ok(jsErrors.length === 0, `no page errors (${jsErrors.length}${jsErrors.length ? ": " + jsErrors[0] : ""})`);
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++;
} finally {
  console.log(`\n── zoldyck Phase 2 live: ${PASS} passed, ${FAIL} failed ──`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
