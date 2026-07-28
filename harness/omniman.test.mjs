// harness/omniman.test.mjs — CANONICAL full-kit test for Omni-Man (Invincible).
// Covers registration, every movement/state, the 5 normals + grab, the Viltrumite Beatdown command
// chain (opener → cancel-on-hit advance → whiff interrupt → push poke), the 3 specials, and — per the
// brief — the FLIGHT mechanic in depth: toggle ACTIVATION + DEACTIVATION, the passive drain rate over a
// sustained flight, a special drawing from the SHARED pool while flying, and the forced-descent at zero
// Smart Atoms. Plus the Ultimate cinematic. Assertion-only (no screenshots) — the stage_*_shots harnesses
// carry the visual evidence.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitIdle() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {}); }
async function reset() { await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.topUpP1Health?.(); window.__harness.setP1Energy?.(200); }); await waitGrounded(); await waitFrames(6); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const sect = t => console.log(`\n── ${t} ──`);
const has = (a, s) => (a.spriteSheet || "").includes(s);
async function closeIn(gap = 74) { await reset(); await page.keyboard.down("d"); await page.waitForFunction(g => { const a = window.__harness.p1(), b = window.__harness.p2(); return a && b && Math.abs(a.x - b.x) < g; }, gap, { timeout: 6000, polling: 16 }).catch(() => {}); await page.keyboard.up("d"); await waitFrames(2); }

await page.goto(`${base}/index.html?harness=1&p1=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(4); await waitGrounded();

// ── REGISTRATION ──
sect("Registration");
let a = await p1();
check("P1 is Omni-Man", a.key === "omniman", `key=${a.key}`);
check("renders as sprites (not box)", a.hasSpriteHandler === true);
check("idle → omni_man_idle", has(a, "omni_man_idle"));
check('energy label is "Smart Atoms"', (await page.evaluate(() => window.__harness.energyLabel("p1"))) === "Smart Atoms");

// ── NORMALS ──
sect("Normals + grab");
async function normal(name, keys, sheet, startup, air = false) {
  await reset();
  if (air) { await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 3000, polling: 16 }).catch(() => {}); await waitFrames(2); }
  for (const k of keys) await page.keyboard.down(k);
  await waitFrames(startup + 1);
  check(`${name} → ${sheet}`, has(await p1(), sheet));
  for (const k of keys) await page.keyboard.up(k);
  await waitIdle();
}
await normal("light", ["j"], "omni_man_ground_punch_uniform", 6);
await normal("heavy", ["k"], "omni_man_ground_punch_1_uniform", 14);
await normal("up (launcher)", ["i"], "omni_man_ground_up_attack_uniform", 11);
await normal("air", ["j"], "omni_man_air_forward_punch_uniform", 7, true);
await normal("down_air", ["s", "j"], "omni_man_air_down_attack_2_uniform", 9, true);

// ── COMMAND CHAIN (Viltrumite Beatdown) ──
sect("Viltrumite Beatdown command chain");
// Fwd+Light poke
await reset(); await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("j"); await waitFrames(4);
check("Fwd+Light → omPush poke", (await p1()).currentMove === "omPush");
await page.keyboard.up("j"); await page.keyboard.up("d"); await waitIdle();
// opener + cancel-on-hit advance
await closeIn(62);
await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("d"); await waitFrames(3);
check("Fwd+Heavy → omCombo1 opener", (await p1()).currentMove === "omCombo1");
async function advance(next) { for (let i = 0; i < 48; i++) { const s = await p1(); if (s.currentMove === next) return true; if (s.attacking && s.attackPhase === "recovery" && s.cmdHitLanded === true) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); } return (await p1()).currentMove === next; }
check("cancel-on-HIT → omCombo2", await advance("omCombo2"));
check("advance → omComboFin launcher", await advance("omComboFin"));
await waitIdle();
// whiff interrupt
await reset(); await page.keyboard.down("a"); await waitFrames(26); await page.keyboard.up("a"); await waitFrames(2);
await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(2);
const opened = (await p1()).currentMove === "omCombo1", noHit = (await p1()).cmdHitLanded !== true;
await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k"); await waitFrames(4);
check("WHIFF interrupt: re-tap does NOT advance", opened && noHit && (await p1()).currentMove !== "omCombo2");
await page.keyboard.up("d"); await waitIdle();

// ── SPECIALS (shared Smart Atoms pool) ──
sect("Specials");
async function special(name, dirKey, move, sheet, cost) {
  await closeIn(dirKey === "d" ? 130 : 74);
  // Let the walk-in forward tap go STALE (>240ms) so re-pressing forward for the special reads as a
  // fresh HOLD, not a double-tap toward → teleport-dash (the intended dashTeleport mechanic, Fix #4).
  // A real player holds forward continuously into the special; this mirrors that timing.
  if (dirKey === "d") await waitFrames(18);
  const e0 = (await p1()).energy;
  if (dirKey) { await page.keyboard.down(dirKey); await waitFrames(3); }
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(4);
  a = await p1();
  check(`${name} → ${move} (${sheet})`, a.currentMove === move && has(a, sheet), `move=${a.currentMove}`);
  check(`${name} spent ~${cost} Smart Atoms`, e0 - a.energy >= cost - 1, `Δ${(e0 - a.energy).toFixed(0)}`);
  if (dirKey) await page.keyboard.up(dirKey);
  await waitIdle();
}
await special("Neutral Viltrumite Smash", null, "omSmash", "omni_man_ground_punch_1_uniform", 35);
await special("Forward Skewering Rush", "d", "omSkewer", "omni_man_skewer_uniform", 30);
await special("Down Meteor Drop", "s", "omMeteor", "omni_man_meteor_uniform", 40);

// ── FLIGHT (the core new system) ──
sect("Flight — toggle / drain / shared-pool / forced descent");
await reset();
// ACTIVATION
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(2);
check("P toggles Flight ON (jump replaced by free hover)", (await p1()).flightActive === true);
check("flight sprite → omni_man_fly", has(await p1(), "omni_man_fly"));
// free vertical (ascend) + hover
const yA = (await p1()).y; await page.keyboard.down("w"); await waitFrames(12); await page.keyboard.up("w");
check("holding Up ASCENDS (no jump arc)", (await p1()).y < yA - 20);
// DEACTIVATION — clean, returns to normal jump/ground
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(2);
check("P toggles Flight OFF", (await p1()).flightActive === false);
await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
check("deactivation drops him back to the ground cleanly", (await p1()).grounded === true);
// DRAIN rate over a sustained flight
await reset();
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3);
const eD0 = (await p1()).energy; await waitFrames(60); const eD1 = (await p1()).energy;
const drain = eD0 - eD1;
check("passive drain ≈ 0.08/frame (slow, sustainable)", drain > 3.5 && drain < 6.5, `Δ${drain.toFixed(2)}/60f`);
// SPECIAL while flying draws from the SAME pool
const eS0 = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(2);
check("special mid-flight draws from the shared pool", (await p1()).flightActive && (eS0 - (await p1()).energy) >= 34, `Δ${(eS0 - (await p1()).energy).toFixed(0)}`);
// FORCED DESCENT at zero Smart Atoms
await reset();
if (!(await p1()).flightActive) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); }
await page.keyboard.down("w"); await waitFrames(14); await page.keyboard.up("w");
await page.evaluate(() => window.__harness.setP1Energy(0.5));
await page.waitForFunction(() => window.__harness.p1().forcedDescent === true, null, { timeout: 4000, polling: 16 }).catch(() => {});
check("Smart Atoms=0 mid-air → forced descent", (await p1()).forcedDescent === true && (await p1()).flightActive === false);
check("forced-descent sprite → omni_man_descent", has(await p1(), "omni_man_descent"));
await page.waitForFunction(() => window.__harness.p1().descentLandTimer > 0, null, { timeout: 5000, polling: 16 }).catch(() => {});
check("crash-landing recovery window opens", (await p1()).descentLandTimer > 0);
await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
check("locked/vulnerable during landing recovery", (await p1()).attacking === false);
await page.waitForFunction(() => window.__harness.p1().descentLandTimer === 0, null, { timeout: 3000, polling: 16 }).catch(() => {});
await waitFrames(3);
check("recovers to normal control", (await p1()).descentLandTimer === 0 && (await p1()).grounded === true);

// ── ULTIMATE ──
sect("Ultimate — Viltrumite Onslaught body-slam");
await reset();
await page.keyboard.down("d"); await page.waitForFunction(() => { const a = window.__harness.p1(), b = window.__harness.p2(); return Math.abs(a.x - b.x) < 120; }, null, { timeout: 6000, polling: 16 }).catch(() => {}); await page.keyboard.up("d"); await waitFrames(2);
const oppHP0 = (await p2()).health;
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
let c = await page.evaluate(() => window.__harness.omnimanUltCine());
check("Ultimate activates the body-slam cinematic", c.active === true && c.casterKey === "omniman");
check("plays the body-slam sprite", has(await p1(), "omni_man_ultimate"));
await page.waitForFunction(() => window.__harness.omnimanUltCine().struck === true, null, { timeout: 6000, polling: 16 }).catch(() => {});
check("guaranteed body-slam damage lands (~340)", oppHP0 - (await p2()).health >= 300, `Δ${(oppHP0 - (await p2()).health) | 0}`);
await page.waitForFunction(() => window.__harness.omnimanUltCine().active === false, null, { timeout: 6000, polling: 16 }).catch(() => {});
check("cinematic ends cleanly (combat resumes)", (await page.evaluate(() => window.__harness.omnimanUltCine())).active === false);

console.log(`\n════════════════════════════════════════\nOMNI-MAN full-kit: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
