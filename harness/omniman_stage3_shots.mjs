// harness/omniman_stage3_shots.mjs — STAGE 3 evidence for Omni-Man's FLIGHT mechanic.
// Proves: (1) flight toggles ON (jump replaced by free 8-dir movement, no gravity); (2) Smart Atoms
// drains slowly while flying; (3) a special cast mid-flight pulls from the SAME pool; (4) Smart Atoms
// hitting 0 mid-air triggers the forced-descent crash + landing-recovery vulnerability window.
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
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `omniman_s3_${name}.png`) }); }
const has = (a, s) => (a.spriteSheet || "").includes(s);
const tapP = async () => { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(2); };

await page.goto(`${base}/index.html?harness=1&p1=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(4); await waitGrounded();

// ── (1) FLIGHT TOGGLE ON: jump replaced by free aerial movement ──
let a0 = await p1();
await tapP();
let a = await p1();
check("P toggles Flight ON", a.flightActive === true, `flightActive=${a.flightActive}`);
check("flight sprite → omni_man_fly", has(a, "omni_man_fly_uniform") || has(a, "omni_man_fly_move_uniform"), `sheet=${a.spriteSheet}`);
await shot("fly_engage");

// ascend (hold up) — y should DECREASE and he must NOT fall back (no gravity)
const yStart = (await p1()).y;
await page.keyboard.down("w"); await waitFrames(14); await page.keyboard.up("w");
const yUp = (await p1()).y;
check("holding Up ASCENDS (free vertical, no jump arc)", yUp < yStart - 20, `y ${yStart|0}→${yUp|0}`);
// release: hovers (does NOT fall) — prove gravity is off
await waitFrames(18);
const yHover = (await p1()).y;
check("releases into a HOVER (gravity off — holds altitude)", Math.abs(yHover - yUp) < 40 && !(await p1()).grounded, `y ${yUp|0}→${yHover|0}`);
// strafe (hold right) — flyMove pose + x moves
await page.keyboard.down("d"); await waitFrames(12); a = await p1();
check("holding Side → flyMove streak", has(a, "omni_man_fly_move_uniform"), `sheet=${a.spriteSheet}`);
await shot("fly_move");
await page.keyboard.up("d"); await waitFrames(4);

// ── (2) SLOW PASSIVE DRAIN over sustained flight ──
const eBefore = (await p1()).energy;
await waitFrames(60);   // ~1s of hovering
const eAfter = (await p1()).energy;
const drained = eBefore - eAfter;
check("Smart Atoms drains slowly while flying", drained > 3 && drained < 9, `Δ${drained.toFixed(2)} over 60f (≈0.08/frame)`);

// ── (3) SPECIAL CAST MID-FLIGHT pulls from the SAME pool ──
const ePreCast = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
await waitFrames(3);
a = await p1();
const spent = ePreCast - a.energy;
check("special cast mid-flight spends from shared pool (~35)", spent >= 33, `Δ${spent.toFixed(1)} (cost 35 + a little flight drain)`);
check("still flying after the cast", a.flightActive === true, `flightActive=${a.flightActive}`);
await shot("fly_special");
await waitFrames(20);

// ── (4) SMART ATOMS → 0 MID-AIR = FORCED DESCENT + landing recovery ──
// Fly up high, drop the pool to a sliver, keep hovering until it hits 0.
if (!(await p1()).flightActive) await tapP();
await page.keyboard.down("w"); await waitFrames(16); await page.keyboard.up("w");   // gain altitude
const yHigh = (await p1()).y;
await page.evaluate(() => window.__harness.setP1Energy(0.5));   // sliver of Smart Atoms
// wait for the drain to hit 0 → forced descent fires
await page.waitForFunction(() => window.__harness.p1().forcedDescent === true, null, { timeout: 4000, polling: 16 }).catch(() => {});
a = await p1();
check("Smart Atoms=0 mid-air → FORCED DESCENT", a.forcedDescent === true && a.flightActive === false, `forcedDescent=${a.forcedDescent} flight=${a.flightActive} y=${a.y|0}`);
check("forced-descent sprite → omni_man_descent", has(a, "omni_man_descent_uniform"), `sheet=${a.spriteSheet}`);
await shot("forced_descent");
// he must actually fall from where he was flying
await waitFrames(10);
const aFalling = await p1();
check("actually crashing DOWN (falling)", aFalling.y > yHigh, `y ${yHigh|0}→${aFalling.y|0}`);

// land → recovery window (locked/vulnerable). Wait for the timer specifically (grounded goes true one
// frame BEFORE applyOmniManFlightSystem opens the recovery window — avoid that 1-frame race).
await page.waitForFunction(() => window.__harness.p1().descentLandTimer > 0, null, { timeout: 5000, polling: 16 }).catch(() => {});
a = await p1();
check("crash-landing recovery window opens", a.descentLandTimer > 0, `descentLandTimer=${a.descentLandTimer}`);
check("landing-recovery sprite → omni_man_land", has(a, "omni_man_land_uniform"), `sheet=${a.spriteSheet}`);
await shot("descent_land");
// locked during recovery: an attack input does NOT start a move
await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
a = await p1();
check("locked during landing recovery (input ignored)", a.attacking === false, `attacking=${a.attacking} timer=${a.descentLandTimer}`);
// recovers cleanly
await page.waitForFunction(() => window.__harness.p1().descentLandTimer === 0, null, { timeout: 3000, polling: 16 }).catch(() => {});
await waitFrames(4);
a = await p1();
check("recovers to normal control", a.descentLandTimer === 0 && a.forcedDescent === false && a.grounded === true, `grounded=${a.grounded}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/omniman_s3_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
