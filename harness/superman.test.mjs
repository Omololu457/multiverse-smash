// harness/superman.test.mjs — CANONICAL full-kit test for Superman (DC, 20th sprite char).
// Covers: registration + Solar Energy label, all 5 normals, the Kryptonian Rush rekka, both specials
// (Heat Vision projectile + Super Flying Punch), both mode-toggles (Solar Flare / Kryptonian Overload),
// the Solar Overload ULTIMATE, flight (toggle + drain + forced descent), the taunt-heal, and a
// FALLBACK-BOX SWEEP (every declared animation points to a real superman_*.png — no procedural box).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.supermanUltCine());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function settle() { await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); await page.evaluate(() => window.__harness.resetFighterInput("p1")); await waitFrames(2); }
async function prep(gap) {
  await waitGrounded(); await settle();
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function heldSpecial(dirKey) { if (dirKey) await page.keyboard.down(dirKey); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); if (dirKey) await page.keyboard.up(dirKey); await waitFrames(2); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const has = (a, s) => (a.spriteSheet || "").includes(s);
const seen = new Set();

await page.goto(`${base}/index.html?harness=1&p1=superman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12); await waitGrounded();

console.log("\n── Registration ──");
let a = await p1();
check("P1 is Superman, renders as sprites", a.key === "superman" && a.spriteReady === true, `key=${a.key}`);
check("idle → floating superman_idle_uniform", has(a, "superman_idle_uniform"), `sheet=${a.spriteSheet}`);
const label = await page.evaluate(() => window.__harness.energyLabel?.("p1"));
check("energy bar labelled 'Solar Energy'", label === "Solar Energy", `label=${label}`);

console.log("\n── FALLBACK-BOX SWEEP (every declared animation → a real superman_*.png) ──");
{
  const anim = characters.superman.animationData;
  const keys = Object.keys(anim);
  let bad = [];
  for (const k of keys) {
    const sheet = anim[k]?.sheet;
    if (!sheet || !/^\.\/superman_.*\.png$/.test(sheet) || !fs.existsSync(path.join(ROOT, sheet.replace(/^\.\//, "")))) bad.push(`${k}:${sheet}`);
  }
  check(`all ${keys.length} animations reference an existing superman_*.png (no box fallback)`, bad.length === 0, bad.length ? `MISSING: ${bad.join(", ")}` : `${keys.length} actions OK`);
}

console.log("\n── 5 normals ──");
for (const [name, key, gap, sheet] of [["light", "j", 60, "superman_light_uniform"], ["heavy", "k", 72, "superman_heavy_uniform"], ["up", "i", 58, "superman_up_uniform"]]) {
  await prep(gap);
  const hp = (await p2()).health;
  await page.keyboard.down(key); await waitFrames(3); const r = await p1(); if (r.spriteSheet) seen.add(r.spriteSheet); await page.keyboard.up(key); await waitFrames(20);
  check(`${name} → ${sheet} + connects`, seen.has(`./${sheet}.png`) && (hp - (await p2()).health) > 0, `−${(hp - (await p2()).health).toFixed(0)}`);
}
// air + down_air
await prep(56); { const hp = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(44)); await page.keyboard.down("j"); await waitFrames(3); const r = await p1(); if (r.spriteSheet) seen.add(r.spriteSheet); await page.keyboard.up("j"); await waitFrames(18); check("air → superman_air_uniform + connects", seen.has("./superman_air_uniform.png") && (hp - (await p2()).health) > 0, ""); }
await prep(34); { const hp = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(50)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); const r = await p1(); if (r.spriteSheet) seen.add(r.spriteSheet); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(18); check("down_air → superman_downair_uniform + connects", seen.has("./superman_downair_uniform.png") && (hp - (await p2()).health) > 0, ""); }

console.log("\n── Kryptonian Rush rekka (Fwd+Heavy, cancel-on-hit) ──");
await prep(50);
const rhp = (await p2()).health; const seq = [];
await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("d");
{ const m = (await p1()).currentMove; if (m) seq.push(m); }
for (const want of ["supRush2", "supRushFin"]) { let rec = false; for (let i = 0; i < 40; i++) { const p = await p1(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec = true; break; } await waitFrames(1); } if (!rec) break; await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); const m = (await p1()).currentMove; if (m && seq[seq.length - 1] !== m) seq.push(m); }
await waitFrames(24);
check("chain supRush1→supRush2→supRushFin + damage", seq.join("→") === "supRush1→supRush2→supRushFin" && (rhp - (await p2()).health) > 0, `seq=${seq.join("→")}`);

console.log("\n── Specials ──");
await prep(220); { const hp = (await p2()).health; await heldSpecial(null); await waitFrames(4); const beam = (await projs()).find(p => (p.name || "").includes("heatvision")); await page.waitForFunction(h => window.__harness.p2().health < h, hp, { timeout: 4000, polling: 16 }).catch(() => {}); check("Heat Vision → independent beam projectile + damage", !!beam && (hp - (await p2()).health) > 0, `beam=${beam?.name}`); }
await prep(120); { const hp = (await p2()).health; await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); const m = (await p1()).currentMove; await waitFrames(14); await page.keyboard.up("d"); check("Super Flying Punch (Fwd+Sp) → superPunch + damage", m === "superPunch" && (hp - (await p2()).health) > 0, `move=${m} −${(hp - (await p2()).health).toFixed(0)}`); }

console.log("\n── Mode-toggles ──");
await prep(60); await heldSpecial("s"); a = await p1();
check("Solar Flare (Down+Sp): active + gold art + +25% dmg", a.solarFlare && has(a, "superman_solarflare_uniform") && Math.abs(a.damageMult - 1.25) < 0.001, `form=${a.currentForm}`);
await settle(); await heldSpecial("s"); check("Solar Flare toggles OFF", (await p1()).solarFlare === false, "");
await prep(60); await heldSpecial("a"); a = await p1();
check("Kryptonian Overload (Back+Sp): active + blue art + buffs", a.overload && has(a, "superman_overload_uniform") && Math.abs(a.atkSpeedMult - 1.3) < 0.001, `form=${a.currentForm}`);
await page.evaluate(() => window.__harness.setP1Energy(0.3)); await waitFrames(4);
check("mode AUTO-REVERTS at 0 Solar Energy", (await p1()).overload === false, "");

console.log("\n── Flight (Omni-Man system, traits.canFly) ──");
await prep(80); await page.evaluate(() => window.__harness.fillEnergy?.());
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(5);
a = await p1();
check("P-tap toggles Flight ON → superman_fly_uniform", a.flightActive && has(a, "superman_fly_uniform"), `flight=${a.flightActive} sheet=${a.spriteSheet}`);
const ey = (await p1()).energy; await waitFrames(50); check("Flight drains Solar Energy", (ey - (await p1()).energy) > 3, `Δ${(ey - (await p1()).energy).toFixed(1)}`);
await page.evaluate(() => window.__harness.setP1Energy(0.4));
await page.waitForFunction(() => window.__harness.p1().forcedDescent === true, null, { timeout: 4000, polling: 16 }).catch(() => {});
check("Solar Energy=0 mid-air → forced descent", (await p1()).forcedDescent === true, "");
// FULLY recover from the crash (the ~42f landing-recovery lock would otherwise gate the ultimate/taunt below)
await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded === true && p.forcedDescent === false && (p.descentLandTimer || 0) === 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});

console.log("\n── Ultimate (Solar Overload) ──");
await prep(600); await page.evaluate(() => window.__harness.fillEnergy?.());
const uhp = (await p2()).health; const ue = (await p1()).energy;
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
let st = await cine();
check("U fires Solar Overload cinematic (caster=superman)", st.active && st.casterKey === "superman", `active=${st.active}`);
check("ultimate spends 100 Solar Energy", (ue - (await p1()).energy) === 100, `Δ${(ue - (await p1()).energy).toFixed(0)}`);
check("overload sprite plays through freeze", has(await p1(), "superman_ultimate_uniform"), "");
await page.waitForFunction(() => window.__harness.supermanUltCine().struck === true || window.__harness.supermanUltCine().active === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(3);
check("guaranteed detonation damage lands (range-independent ~228 = 380×0.60)", (uhp - (await p2()).health) >= 200, `−${(uhp - (await p2()).health).toFixed(0)} @600px`);
await page.waitForFunction(() => window.__harness.supermanUltCine().active === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(6);
check("cinematic ends, combat resumes", (await cine()).active === false && !has(await p1(), "superman_ultimate_uniform"), "");

console.log("\n── Taunt-heal (universal hold-Down system) ──");
await waitGrounded(); await settle();
// drop HP FIRST and let the taunt system's health-tracker catch up (a fresh HP drop reads as "took a hit"
// and would reset the charge), THEN fast-forward the 10s charge and hold Down to commit.
await page.evaluate(() => window.__harness.setP1Health(600)); await waitFrames(5);
await page.evaluate(() => window.__harness.setTauntCharge(598));
await page.keyboard.down("s");
await page.waitForFunction(() => window.__harness.p1().tauntPlaying === true, null, { timeout: 4000, polling: 16 }).catch(() => {});
a = await p1();
check("hold-Down 10s commits the taunt (superman_taunt_uniform)", a.tauntPlaying === true && has(a, "superman_taunt_uniform"), `playing=${a.tauntPlaying} sheet=${a.spriteSheet}`);
await page.waitForFunction(() => window.__harness.p1().tauntPlaying === false, null, { timeout: 5000, polling: 16 }).catch(() => {});
await page.keyboard.up("s"); await waitFrames(2);
check("taunt heals ~50% of current HP", (await p1()).health > 700, `hp=${(await p1()).health}`);

check("no uncaught JS exceptions", errors.length === 0, errors[0] || "");
console.log(`\n════════════════════════════════════════\n  SUPERMAN full-kit: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
