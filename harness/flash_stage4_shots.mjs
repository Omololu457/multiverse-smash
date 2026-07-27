// harness/flash_stage4_shots.mjs — STAGE 4: FLASH TIME (Ultimate).
// Verifies: cinematic activation (Godspeed architecture) · 3×/⅓× time differential · opponent keeps
// block during the slow · Flash's overshoot/skid movement · Flash CANNOT block (opponent lands a hit).
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
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const ftCine = () => page.evaluate(() => window.__harness.flashTimeCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `flash_s4_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=flash`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);
await waitGrounded();

console.log("\n── 1) Activation cinematic (Godspeed architecture) ──");
await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2(); });
const enPre = (await p1()).energy;
check("near-max Speed Force before cast", enPre >= 90, `EN=${enPre}`);
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
let sawCine = false, sawPush = false, sawBurst = false;
for (let i = 0; i < 160; i++) { const c = await ftCine(); if (c.active) { sawCine = true; if (c.phase === "push") sawPush = true; if (c.burst) sawBurst = true; if (c.phase === "hold" && !sawBurst) await shot("cinematic"); } else if (sawCine) break; await waitFrames(1); }
check("Flash Time cinematic activated", sawCine, "");
check("cinematic pushes in (push phase)", sawPush, "");
check("cinematic reaches the engage burst", sawBurst, "");
const a1 = await p1();
check("Flash Time buff live after cinematic", a1.flashTimeActive === true, `form=${a1.currentForm}`);
check("self attack-speed buff (snappier)", (a1.attackSpeedMultiplier || 1) > 1.1, `x${a1.attackSpeedMultiplier}`);

console.log("\n── 2) 3×/⅓× time differential ──");
let p2ran = 0, p1frozenEver = false; const N = 48;
for (let i = 0; i < N; i++) { const q = await p2(), pp = await p1(); if (!q.timeSlowFrozen) p2ran++; if (pp.timeSlowFrozen) p1frozenEver = true; if (i === 6) await shot("differential"); await waitFrames(1); }
const frac = p2ran / N;
// target 0.34 (⅓); headless frame-aliasing adds sampling noise → assert clearly slowed (well under full) + roughly a third
check("opponent runs at ~⅓ speed (clearly slowed)", frac >= 0.15 && frac <= 0.50, `${(frac * 100).toFixed(0)}% of frames ran (target ~34%)`);
check("Flash never time-slowed (full speed)", !p1frozenEver, "");

console.log("\n── 3) opponent RETAINS block during the slow ──");
await page.evaluate(() => { window.__harness.healP2(); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 76); window.__harness.setP2Invuln(0); });
// fire Flash's multi-hit Spin while continuously forcing the dummy's guard; across the exchange at least
// one hit must land on a blocked frame → a blockstun spike proves blocking still FUNCTIONS during the slow.
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
let blockedAHit = false, maxBs = 0;
for (let i = 0; i < 40; i++) { await page.evaluate(() => window.__harness.setP2Blocking(true)); const q = await p2(); const bs = q.blockstun || 0; if (bs > 0) blockedAHit = true; maxBs = Math.max(maxBs, bs); await waitFrames(1); }
check("opponent CAN block during the slow (blockstun spike seen)", blockedAHit, `max blockstun=${maxBs}`);

console.log("\n── 4) Flash's movement OVERSHOOT / skid ──");
await waitGrounded();
await page.evaluate(() => { window.__harness.resetFighterInput("p1"); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 520); });  // clear the dummy's pushbox
await page.keyboard.down("d"); await waitFrames(8); const vMove = Math.abs((await p1()).vx); await page.keyboard.up("d");
// sample vx decay after release — Flash Time keeps momentum (gentle skid) instead of a dead stop
let vAfter6 = null; for (let i = 0; i < 6; i++) await waitFrames(1); vAfter6 = Math.abs((await p1()).vx);
check("zips at raised top speed while held (>9 clamp)", vMove > 9, `vx=${vMove.toFixed(1)}`);
check("skids on release (momentum carries, vx still moving)", vAfter6 > 2.5, `vx after 6f = ${vAfter6.toFixed(1)}`);

console.log("\n── 5) Flash CANNOT block (opponent lands a hit mid-Flash-Time) ──");
await waitGrounded();
await page.evaluate(() => { window.__harness.healP2(); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 60); });
// hold block on Flash — it must be IGNORED
await page.keyboard.down("s"); await waitFrames(3);
const flashBlocking = (await p1()).isBlocking;
const ph0 = (await p1()).health;
await page.evaluate(() => window.__harness.p2Attack());   // opponent swings at Flash
for (let i = 0; i < 20; i++) { if ((await p1()).hitstun > 0) break; await waitFrames(1); }
await shot("cant_block");
await waitFrames(4); await page.keyboard.up("s");
const flashDmg = ph0 - (await p1()).health, p1hs = (await p1()).hitstun;
check("Flash's block input is IGNORED (isBlocking false)", flashBlocking === false, `isBlocking=${flashBlocking}`);
check("opponent's hit LANDS on Flash (full, unblocked)", flashDmg > 20, `−${flashDmg.toFixed(0)}`);

console.log("\n── 6) meter drains → auto-revert ──");
const enA = (await p1()).energy; await waitFrames(30); const enB = (await p1()).energy;
check("Speed Force drains while active", enB < enA, `${enA.toFixed(0)}→${enB.toFixed(0)}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/flash_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
