// harness/superman_stage4_shots.mjs — STAGE 4: two Mangekyou-style mode-toggles.
//   Solar Flare (Down+Special, gold): +25% damage, Heat Vision → wide gold Solar Flare Beam.
//   Kryptonian Overload (Back+Special, blue): +30% atk speed +15% move speed, Flying Punch → Overload Rush.
// Both DRAIN Solar Energy while active and AUTO-REVERT at 0. Held-dir routing (deterministic).
// Keys (facing right): Down=s, Back=a, Forward=d, Special=l.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
// hold a direction (or none) and tap Special — deterministic _specialHeldDir routing
async function heldSpecial(dirKey) {
  if (dirKey) await page.keyboard.down(dirKey);
  await waitFrames(1);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  if (dirKey) await page.keyboard.up(dirKey);
  await waitFrames(2);
}
async function settle() {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.resetFighterInput("p1"));
  await waitFrames(2);
}
async function reset() {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `superman_s4_${name}.png`) }); }
const has = (a, s) => (a.spriteSheet || "").includes(s);

await page.goto(`${base}/index.html?harness=1&p1=superman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

// ══════════════ SOLAR FLARE (gold, Down+Special) ══════════════
console.log("\n── Solar Flare mode (Down+Special, gold) ──");
await reset();
await heldSpecial("s");
let a = await p1();
check("Down+Special ignites Solar Flare", a.solarFlare === true && a.currentForm === "solarFlare", `form=${a.currentForm} flare=${a.solarFlare}`);
check("Solar Flare applies +25% damage buff", Math.abs(a.damageMult - 1.25) < 0.001, `dmgMult=${a.damageMult}`);
check("entry plays the dedicated gold transform art", has(a, "superman_solarflare_uniform"), `sheet=${a.spriteSheet}`);
await shot("solarflare_activate");
const eF0 = (await p1()).energy; await waitFrames(40); const eF1 = (await p1()).energy;
check("Solar Flare drains Solar Energy while active", (eF0 - eF1) > 5, `Δ${(eF0 - eF1).toFixed(1)} over 40f`);
// enhanced move: neutral Heat Vision → gold Solar Flare Beam
await settle();
await page.evaluate(() => window.__harness.fillEnergy?.());
await heldSpecial(null); await waitFrames(4);
const beam = (await projs()).find(p => (p.name || "").includes("solarbeam") || (p.name || "").includes("heatvision"));
check("Heat Vision UNLOCKED into gold Solar Flare Beam", !!beam && beam.name === "superman_solarbeam", `beam=${beam?.name}`);
await shot("solarflare_beam");
// toggle OFF
await settle();
await heldSpecial("s");
a = await p1();
check("Down+Special again toggles Solar Flare OFF (buff cleared)", a.solarFlare === false && Math.abs(a.damageMult - 1) < 0.001, `flare=${a.solarFlare} dmgMult=${a.damageMult}`);

// ══════════════ KRYPTONIAN OVERLOAD (blue, Back+Special) ══════════════
console.log("\n── Kryptonian Overload mode (Back+Special, blue) ──");
await reset();
await heldSpecial("a");
a = await p1();
check("Back+Special ignites Kryptonian Overload", a.overload === true && a.currentForm === "overload", `form=${a.currentForm} over=${a.overload}`);
check("Overload applies +30% atk-speed & +15% move-speed", Math.abs(a.atkSpeedMult - 1.3) < 0.001 && Math.abs(a.speedMult - 1.15) < 0.001, `atkSpd=${a.atkSpeedMult} spd=${a.speedMult}`);
check("entry plays the dedicated blue transform art", has(a, "superman_overload_uniform"), `sheet=${a.spriteSheet}`);
check("modes are mutually exclusive (Solar Flare off)", a.solarFlare === false, `flare=${a.solarFlare}`);
await shot("overload_activate");
// enhanced move: forward Super Flying Punch → Overload Rush
await settle();
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP2(); const x = window.__harness.p1(); window.__harness.setP2X(x.x + 120); });
const hpO0 = (await p2()).health;
await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
let ap = await p1();
check("Overload Rush casts (superPunch pose, enhanced)", ap.currentMove === "superPunch", `move=${ap.currentMove}`);
await shot("overload_rush");
await waitFrames(14); await page.keyboard.up("d");
const overDmg = hpO0 - (await p2()).health;
check("Overload Rush connects for heavy damage", overDmg > 0, `−${overDmg.toFixed(0)}`);
// toggle OFF
await settle();
await heldSpecial("a");
a = await p1();
check("Back+Special again toggles Kryptonian Overload OFF (buffs cleared)", a.overload === false && Math.abs(a.atkSpeedMult - 1) < 0.001, `over=${a.overload} atkSpd=${a.atkSpeedMult}`);

// ══════════════ AUTO-REVERT AT 0 ENERGY ══════════════
console.log("\n── Auto-revert when Solar Energy runs dry ──");
await reset();
await heldSpecial("a");   // Overload on (fresh full energy)
check("mode active before drain-out", (await p1()).overload === true, "");
await page.evaluate(() => window.__harness.setP1Energy(0.3));   // drop to a sliver
await waitFrames(4);
a = await p1();
check("mode AUTO-REVERTS when Solar Energy hits 0", a.overload === false && a.currentForm !== "overload", `over=${a.overload} form=${a.currentForm} energy=${a.energy?.toFixed?.(1)}`);

check("no uncaught JS exceptions", errors.length === 0, errors[0] || "");
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/superman_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
