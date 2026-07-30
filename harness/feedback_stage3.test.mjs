// harness/feedback_stage3.test.mjs
// FEEDBACK — STAGE 3: the Absorb/Redirect special, built as a REACTIVE COUNTER (the art supports it:
// charge stance = absorb windup, electric-shot = discharge). Proves:
//   (1) Down Special = proactive Energy Discharge → spawns a traveling electric orb that connects.
//   (2) Neutral Special = Energy Absorption counter: opponent's hit DURING the window is ABSORBED
//       (Feedback takes NO damage, GAINS energy) and an amplified discharge fires back and connects.
//   (3) WHIFF control: absorb stance with no incoming hit → no discharge, normal recovery.
// Also writes fbCharge (absorb stance) + fbShot (discharge) pose screenshots as evidence.
//   node harness/feedback_stage3.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "feedback_stage3_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
// In-browser fast watcher: a setInterval polling faster than the frame rate so a short-lived
// (fast, close-range) projectile can't slip between Playwright round-trips. Returns true if a
// feedback projectile existed at any point between startWatch/stopWatch.
async function startWatch() { await page.evaluate(() => { window.__fbSeen = false; window.__fbWatch = setInterval(() => { try { if (window.__harness.projectiles().some(p => (p.name || "").includes("feedback"))) window.__fbSeen = true; } catch (_) {} }, 6); }); }
async function stopWatch() { return page.evaluate(() => { clearInterval(window.__fbWatch); return !!window.__fbSeen; }); }
async function shot(name) {
  const s = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); const i = window.__harness.renderInfo("p1"); return { dataURL: c?.dataURL || null, w: c?.contentW || 0, h: c?.contentH || 0, action: i?.action }; });
  if (s.dataURL) fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(s.dataURL.split(",")[1], "base64"));
  return s;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});
  await page.evaluate(() => window.__harness.benForm("feedback"));

  // ── (1) DOWN SPECIAL — proactive Energy Discharge projectile ──
  section("Down Special — Energy Discharge (proactive electric orb)");
  await settle();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 150); await waitFrames(2); }
  const eBefore = (await p1()).energy;
  const p2hpStart = (await p2()).health;
  await startWatch();
  await page.keyboard.down("s"); await waitFrames(1);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.keyboard.up("s");
  let castPose = null;
  for (let i = 0; i < 22; i++) {
    const ri = await page.evaluate(() => window.__harness.renderInfo("p1")); if (ri?.action === "fbShot") castPose = "fbShot";
    if (i === 1) await shot("discharge_cast");
    await waitFrames(1);
  }
  const sawOrb = await stopWatch();
  const dischHit = (await p2()).health < p2hpStart;
  check("Discharge spends energy", (eBefore - (await p1()).energy) > 0 || sawOrb, `Δe=${eBefore - (await p1()).energy}`);
  check("Discharge plays fbShot cast pose", castPose === "fbShot", `pose=${castPose}`);
  check("Discharge spawns an electric orb projectile", sawOrb, "");
  check("Discharge orb connects on the dummy", dischHit, `p2 ${p2hpStart}→${(await p2()).health}`);

  // ── (2) NEUTRAL SPECIAL — Energy Absorption COUNTER (absorb incoming hit → amplified redirect) ──
  section("Neutral Special — Energy Absorption counter (absorb → redirect)");
  await settle();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 100); await waitFrames(2); }   // in p2's 120 attack-reach, far enough the redirect orb is visible in flight
  const preHP = (await p1()).health, preEn = (await p1()).energy;
  const p2Base = (await p2()).health;
  await startWatch();
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // enter absorb stance
  const stancePose = (await shot("absorb_stance")).action;
  // fire an INCOMING hit during the window
  await page.evaluate(() => window.__harness.p2Attack());
  let absorbedHP = preHP, gainedEnergy = false;
  for (let i = 0; i < 26; i++) {
    const f1 = await p1();
    if (f1.energy > preEn) gainedEnergy = true;      // refund fired
    absorbedHP = Math.min(absorbedHP, f1.health);
    await waitFrames(1);
  }
  const sawCounter = await stopWatch();
  const counterHit = (await p2()).health < p2Base;
  check("Absorb NEGATES the incoming hit (no damage taken)", absorbedHP >= preHP, `hp ${preHP}→${absorbedHP}`);
  check("Absorb REFUNDS energy (absorption payoff)", gainedEnergy, `en ${preEn}→${(await p1()).energy}`);
  check("Absorb stance uses fbCharge pose", stancePose === "fbCharge", `pose=${stancePose}`);
  check("Counter fires an amplified redirect projectile", sawCounter, "");
  check("Redirect connects back on the attacker", counterHit, `p2 ${p2Base}→${(await p2()).health}`);

  // ── (3) WHIFF control — absorb with NO incoming hit → no discharge, clean recovery ──
  section("Whiff control — absorb window with no incoming hit");
  await settle();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 300); await waitFrames(2); }
  await startWatch();
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  for (let i = 0; i < 40; i++) await waitFrames(1);
  const whiffProj = await stopWatch();
  const recovered = !(await p1()).attacking && ((await p1()).attackCooldown || 0) <= 0;
  check("Whiff: no discharge projectile spawned", !whiffProj, "");
  check("Whiff: Feedback recovers to neutral", recovered, "");

  section("sweep");
  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");

} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  FEEDBACK STAGE 3: ${pass} passed, ${fail} failed`);
  console.log(`  evidence → harness/feedback_stage3_out/`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
