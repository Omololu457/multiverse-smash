// harness/killua_stage5.mjs — Stage 5: Godspeed ultimate (buff-mode / OVERLAY path).
// Verifies: ULTIMATE activates the sustained buff (speed/damage), the electric activation pose plays,
// buffed damage > base, the meter drains, and it AUTO-REVERTS when the meter runs dry.
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
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
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
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
const shot = name => page.screenshot({ path: path.join(OUT, `killua_s5_${name}.png`) });
// reposition the dummy + heal it, WITHOUT refilling P1 energy (so Godspeed's drain isn't reset)
async function repos(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(3);   // let combo scaling reset between measurements
}
async function lightDamage(gap) {
  await repos(gap);
  const hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await waitFrames(18);
  return hp0 - (await p2()).health;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── base damage baseline (before Godspeed) ──
  section("baseline — a light normal before Godspeed");
  const baseLight = await lightDamage(50);
  check("base light connects", baseLight > 0, `−${baseLight.toFixed(0)}`);

  // ── activate Godspeed ──
  section("Godspeed activates (ULTIMATE button)");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); });
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const on = await record();
  check("Godspeed is active", on.godspeedActive === true, `godspeedActive=${on.godspeedActive}`);
  check("damage buff applied (×1.25)", Math.abs((on.damageMultiplier || 1) - 1.25) < 0.001, `dmgMult=${on.damageMultiplier}`);
  check("attack-speed buff applied (×1.4)", Math.abs((on.attackSpeedMultiplier || 1) - 1.4) < 0.001, `atkSpdMult=${on.attackSpeedMultiplier}`);
  await waitFrames(2);
  check("plays the godspeedActivate electric cast pose", (await p1()).action === "godspeedActivate", `action=${(await p1()).action}`);
  await shot("activate");

  // ── fight in Godspeed: buffed damage ──
  section("fighting in Godspeed — buffed damage + electric overlay");
  await waitFrames(20);   // let the activation pose finish
  const buffLight = await lightDamage(50);
  await shot("fighting");
  check("still in Godspeed while fighting", (await p1()).godspeedActive === true, `godspeedActive=${(await p1()).godspeedActive}`);
  check("light hits HARDER in Godspeed than base", buffLight > baseLight, `godspeed −${buffLight.toFixed(0)} vs base −${baseLight.toFixed(0)}`);

  // ── meter drains ──
  section("Godspeed drains the Nen meter over time");
  const enBefore = (await p1()).energy;
  await waitFrames(30);
  const enAfter = (await p1()).energy;
  check("Nen drains while Godspeed is active", enAfter < enBefore, `${enBefore.toFixed(1)} → ${enAfter.toFixed(1)}`);

  // ── auto-revert when the meter runs dry ──
  section("Godspeed auto-reverts when the meter empties");
  await page.evaluate(() => window.__harness.setP1Energy(0.05));   // drop the meter → next frame drains to 0 → revert
  await waitFrames(3);
  const off = await p1();
  check("Godspeed reverted at empty meter", off.godspeedActive === false, `godspeedActive=${off.godspeedActive}`);
  check("damage multiplier reset to 1", Math.abs((off.damageMultiplier || 1) - 1) < 0.001, `dmgMult=${off.damageMultiplier}`);
  check("attack-speed multiplier reset to 1", Math.abs((off.attackSpeedMultiplier || 1) - 1) < 0.001, `atkSpdMult=${off.attackSpeedMultiplier}`);

  // ── fallback-box sweep ──
  section("fallback-box sweep — Godspeed states resolve to killua sheets");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("killua"));
  check(`all ${seenActions.size} exercised actions use a killua sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  KILLUA Stage 5: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
