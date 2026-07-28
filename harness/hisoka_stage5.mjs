// harness/hisoka_stage5.mjs
// Stage 5: BLOODLUST OVERDRIVE ultimate — full alternate-form transformation (reuses the giant-cinematic
// buff-mode architecture: freeze cinematic + _skinAnim golden power-up body-swap + drain → auto-revert).
// Verifies activation, the frozen transform cinematic, the body-swap, a form attack connecting, the
// extended Bungee Gum reach, drain, and auto-revert. Screenshots of the full activation + a form attack.
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
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function bungeeDmg() { const hp0 = (await p2()).health; await page.keyboard.down("l"); await waitFrames(4); await record(); await page.keyboard.up("l"); await waitFrames(22); return hp0 - (await p2()).health; }
async function waitReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `hisoka_s5_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=hisoka`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("registration");
  check("P1 is Hisoka", (await record()).key === "hisoka");

  // ── baseline: base Bungee Gum WHIFFS at a long gap (before the form's extended reach) ──
  section("baseline — base Bungee Gum reach before Overdrive");
  const REACH_GAP = 250;   // beyond base Bungee's reach (rangeX 172), inside Overdrive's (rangeX 230)
  await prep(REACH_GAP);
  const baseReach = await bungeeDmg();
  check(`base Bungee Gum whiffs at gap ${REACH_GAP}`, baseReach === 0, `−${baseReach.toFixed(0)}`);

  // ── activate Bloodlust Overdrive (ULTIMATE button) ──
  section("Bloodlust Overdrive activates (ULTIMATE button)");
  await waitReady();   // fully recover from the baseline Bungee Gum (else triggerUltimate bails on attacking/cooldown)
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); });
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const on = await record();
  check("Overdrive is active", on.overdriveActive === true, `overdriveActive=${on.overdriveActive}`);
  check("damage buff applied (×1.3)", Math.abs((on.damageMultiplier || 1) - 1.3) < 0.001, `dmgMult=${on.damageMultiplier}`);
  check("attack-speed buff applied (×1.25)", Math.abs((on.attackSpeedMultiplier || 1) - 1.25) < 0.001, `atkSpdMult=${on.attackSpeedMultiplier}`);

  // ── activation CINEMATIC (freeze + camera push-in, card-cape→golden transform, pull back) ──
  const cine = await page.evaluate(() => window.__harness.overdriveCine());
  check("activation cinematic is playing (camera push-in)", cine.active === true, `cine=${JSON.stringify(cine)}`);
  await waitFrames(3);
  check("holds the transform pose during the cinematic", (await p1()).action === "transform", `action=${(await p1()).action}`);
  await shot("activate");
  await page.waitForFunction(() => !window.__harness.overdriveCine().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
  check("cinematic ends → combat resumes", (await page.evaluate(() => window.__harness.overdriveCine().active)) === false, "");

  // ── in-form body-swap: idle now uses the golden power-up sheet ──
  section("transformed form — golden power-up body-swap (_skinAnim)");
  await waitFrames(6);
  const formIdle = await record();
  await shot("form_idle");
  check("still in Overdrive after cinematic", formIdle.overdriveActive === true, `overdriveActive=${formIdle.overdriveActive}`);
  check("idle body-swaps to hisoka_powerup_idle sheet", (formIdle.spriteSheet || "").includes("hisoka_powerup_idle"), `sheet=${formIdle.spriteSheet}`);

  // ── an attack connects in the transformed state (the golden power-up up-attack) ──
  section("form attack connects — power-up up-attack");
  await page.evaluate(() => { window.__harness.fillEnergy?.(); });   // keep the form alive through the test
  await prep(60);
  await page.evaluate(() => { window.__harness.fillEnergy?.(); });   // prep heals P2 & refills; ensure form still fed
  const hp0u = (await p2()).health;
  await page.keyboard.down("i"); await waitFrames(3); const ua = await record(); await shot("form_attack"); await page.keyboard.up("i");
  await waitFrames(20);
  const upDmg = hp0u - (await p2()).health;
  check("up-attack plays hisoka_powerup_up sheet", (ua.spriteSheet || "").includes("hisoka_powerup_up"), `sheet=${ua.spriteSheet}`);
  check("form up-attack connects", upDmg > 0, `−${upDmg.toFixed(0)}`);

  // ── extended Bungee Gum reach in form (connects where the base whiffed) ──
  section("extended Bungee Gum reach in Overdrive");
  await page.evaluate(() => { window.__harness.fillEnergy?.(); });
  await prep(REACH_GAP);
  await page.evaluate(() => { window.__harness.fillEnergy?.(); });
  const formReach = await bungeeDmg();
  check(`Overdrive Bungee Gum CONNECTS at gap ${REACH_GAP} (base whiffed)`, formReach > 0, `−${formReach.toFixed(0)}`);

  // ── drain + auto-revert ──
  section("Overdrive drains Nen → auto-reverts");
  const enBefore = (await p1()).energy;
  await waitFrames(30);
  const enAfter = (await p1()).energy;
  check("Nen drains while Overdrive is active", enAfter < enBefore, `${enBefore.toFixed(1)} → ${enAfter.toFixed(1)}`);
  await page.evaluate(() => window.__harness.setP1Energy(0.03));   // drop the meter → next frame drains to 0 → revert
  await waitFrames(3);
  const off = await record();
  check("Overdrive reverted at empty meter", off.overdriveActive === false, `overdriveActive=${off.overdriveActive}`);
  check("damage multiplier reset to 1", Math.abs((off.damageMultiplier || 1) - 1) < 0.001, `dmgMult=${off.damageMultiplier}`);
  check("idle body-swap reverts to base hisoka_idle sheet", (off.spriteSheet || "").includes("hisoka_idle"), `sheet=${off.spriteSheet}`);

  // ── fallback-box sweep ──
  section("fallback-box sweep — every exercised state resolves to a hisoka sheet");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("hisoka"));
  check(`all ${seenActions.size} exercised actions use a hisoka sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("FATAL", e); FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  HISOKA Stage 5: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
