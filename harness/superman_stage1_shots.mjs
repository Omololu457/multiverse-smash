// harness/superman_stage1_shots.mjs — STAGE 1 visual evidence for Superman.
// Two parts:
//   (A) INTRO — the off-screen Clark-Kent run-in → liftoff → floating hover, proving the CAMERA tracks
//       him (camera.x pans as he travels) and he eases from the arena edge to his battle spot.
//   (B) MOVEMENT/STATE + FLIGHT — idle(float)/walk/jump/fall/hurt + the Omni-Man flight toggle reused
//       (P-tap → fly, shared Solar Energy drains, forced descent at 0), asserting each resolves to the
//       intended superman_* sheet.
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
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const cam = () => page.evaluate(() => window.__harness.camera());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitVariant(v) { await page.waitForFunction(vv => window.__harness.p1()?.introVariant === vv, v, { timeout: 12000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `superman_s1_${name}.png`) }); }
const has = (a, s) => (a.spriteSheet || "").includes(s);
const tapP = async () => { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(2); };

await page.goto(`${base}/index.html?harness=1&p1=superman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ══════════════════════════════════════════════════════════════════════════
// (A) INTRO — camera-tracked off-screen run-in → liftoff → hover
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── (A) INTRO: off-screen run-in → liftoff → hover (camera-tracked) ──");
await page.evaluate(() => window.__harness.start());   // start match, DO NOT skip → intro plays
await waitFrames(2);
await waitVariant("introRunIn");
const camSamples = [];
let a = await p1(); let c = await cam();
camSamples.push(c.x);
const xStart = a.x, camStart = c.x;
check("intro playing — step 1 = introRunIn (Clark run-in)", a.introVariant === "introRunIn", `variant=${a.introVariant}`);
check("run-in sheet → superman_intro1_uniform", has(a, "superman_intro1_uniform"), `sheet=${a.spriteSheet}`);
await shot("intro_1_runin");

// sample camera + world-x across the run to prove tracking + travel
for (let i = 0; i < 8; i++) { await waitFrames(10); c = await cam(); camSamples.push(c.x); }
await waitVariant("introLiftoff");
a = await p1(); c = await cam(); camSamples.push(c.x);
check("step 2 = introLiftoff (rip → Superman → liftoff)", a.introVariant === "introLiftoff", `variant=${a.introVariant}`);
check("liftoff sheet → superman_intro2_uniform", has(a, "superman_intro2_uniform"), `sheet=${a.spriteSheet}`);
await shot("intro_2_liftoff");
const xLiftoff = a.x;

await waitVariant("introHover");
a = await p1(); c = await cam(); camSamples.push(c.x);
check("step 3 = introHover (settle into floating idle)", a.introVariant === "introHover", `variant=${a.introVariant}`);
check("hover sheet → superman_intro3_uniform", has(a, "superman_intro3_uniform"), `sheet=${a.spriteSheet}`);
await shot("intro_3_hover");
const xHover = a.x;

// Tracking + travel assertions
const camSpread = Math.max(...camSamples) - Math.min(...camSamples);
check("CAMERA TRACKS the run-in (camera.x pans, not static)", camSpread > 80, `camera.x spread=${camSpread.toFixed(0)}px over the run`);
check("Superman TRAVELS from the off-screen edge inward", (xHover - xStart) > 250, `world x ${xStart|0} → ${xHover|0} (Δ${(xHover - xStart)|0})`);
check("arrives home by liftoff/hover (settles, stops travelling)", Math.abs(xHover - xLiftoff) < 60, `xLiftoff=${xLiftoff|0} xHover=${xHover|0}`);

// let the whole intro resolve into battle
await page.waitForFunction(() => window.__harness.state().gameState === "battle" || window.__harness.introState().stage === "done", null, { timeout: 15000, polling: 32 }).catch(() => {});

// ══════════════════════════════════════════════════════════════════════════
// (B) MOVEMENT / STATE + FLIGHT — boot skips intro so gameplay is live
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── (B) MOVEMENT / STATE + FLIGHT ──");
await page.evaluate(() => window.__harness.boot());
await waitFrames(3); await waitGrounded(); await waitFrames(6);
a = await p1();
check("P1 is Superman", a.key === "superman", `key=${a.key}`);
check("renders as sprites (not box)", a.spriteReady === true, "");
check("idle → superman_idle_uniform (floating idle)", has(a, "superman_idle_uniform"), `sheet=${a.spriteSheet}`);
await shot("idle");

// GROUND MOVE
await page.keyboard.down("d"); await waitFrames(16); a = await p1();
check("ground-move → walk (superman_walk_uniform)", has(a, "superman_walk_uniform"), `action=${a.action || a.currentMove} sheet=${a.spriteSheet}`);
await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);

// JUMP / FALL (floating jump reuses the hover idle)
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(3); a = await p1();
check("jump → superman_idle_uniform (float-jump)", has(a, "superman_idle_uniform"), `sheet=${a.spriteSheet} vy=${a.vy?.toFixed?.(1)}`);
await shot("jump");
await waitGrounded();

// HURT
await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(3); a = await p1();
check("hurt → superman_hit_uniform", has(a, "superman_hit_uniform"), `sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4); await waitGrounded();

// ── FLIGHT (reused Omni-Man system via traits.canFly) ──
await page.evaluate(() => window.__harness.setP1Energy(200)); await waitFrames(2);
await tapP(); a = await p1();
check("P-tap toggles FLIGHT ON (reused system)", a.flightActive === true, `flightActive=${a.flightActive}`);
check("flight sprite → superman_fly_uniform", has(a, "superman_fly_uniform"), `sheet=${a.spriteSheet}`);
await shot("fly_engage");

// ascend + hover (gravity off)
const yA = (await p1()).y;
await page.keyboard.down("w"); await waitFrames(14); await page.keyboard.up("w");
const yUp = (await p1()).y;
check("holding Up ASCENDS (free vertical, no jump arc)", yUp < yA - 20, `y ${yA|0}→${yUp|0}`);
await waitFrames(16);
const yHov = (await p1()).y;
check("releases into HOVER (gravity off — does not fall)", yHov <= yUp + 10 && !(await p1()).grounded, `y ${yUp|0}→${yHov|0}`);
// strafe → flyMove
await page.keyboard.down("d"); await waitFrames(12); a = await p1();
check("holding Side → flyMove streak", has(a, "superman_fly_uniform"), `sheet=${a.spriteSheet}`);
await shot("fly_move"); await page.keyboard.up("d"); await waitFrames(4);

// shared-pool drain
const eB = (await p1()).energy; await waitFrames(60); const eA = (await p1()).energy;
check("Solar Energy drains slowly while flying", (eB - eA) > 3 && (eB - eA) < 9, `Δ${(eB - eA).toFixed(2)} over 60f (≈0.08/frame)`);

// forced descent at 0
await page.evaluate(() => window.__harness.setP1Energy(0.5));
await page.waitForFunction(() => window.__harness.p1().forcedDescent === true, null, { timeout: 4000, polling: 16 }).catch(() => {});
a = await p1();
check("Solar Energy=0 mid-air → FORCED DESCENT", a.forcedDescent === true && a.flightActive === false, `forcedDescent=${a.forcedDescent} flight=${a.flightActive}`);
await shot("forced_descent");
await page.waitForFunction(() => window.__harness.p1().descentLandTimer > 0, null, { timeout: 5000, polling: 16 }).catch(() => {});
a = await p1();
check("crash-landing recovery window opens", a.descentLandTimer > 0, `descentLandTimer=${a.descentLandTimer}`);
await shot("descent_land");
await page.waitForFunction(() => window.__harness.p1().descentLandTimer === 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(4); a = await p1();
check("recovers to normal control", a.descentLandTimer === 0 && a.forcedDescent === false && a.grounded === true, `grounded=${a.grounded}`);

check("no uncaught JS exceptions", errors.length === 0, errors[0] || "");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/superman_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
