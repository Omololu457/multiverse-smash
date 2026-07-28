// harness/omniman_fixes_shots.mjs — BEFORE/AFTER evidence for the 6 post-build Omni-Man fixes.
// Run: TAG=before node harness/omniman_fixes_shots.mjs   (then again with TAG=after)
// Measures: ground travel distance, flight travel distance, hold-P charge gain, double-tap teleport,
// intro variety; and screenshots the ground-move + flight-move poses.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TAG = process.env.TAG || "after";
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
const shot = (name) => page.screenshot({ path: path.join(OUT, `omniman_fix_${TAG}_${name}.png`) });
const has = (a, s) => (a.spriteSheet || "").includes(s);
const tapP = async () => { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(2); };
const log = (n, d) => console.log(`  • ${n}: ${d}`);

await page.goto(`${base}/index.html?harness=1&p1=omniman&p2=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(4); await waitGrounded();

console.log(`\n=== OMNI-MAN FIX EVIDENCE [${TAG}] ===`);

// NOTE: a stale-wait (60f) precedes each directional hold so the double-tap detector's tap-times are
// >240ms old — a lone HOLD then reads as pure walk (no spurious teleport-dash), giving a clean
// steady-state velocity. (A rapid boot→immediate-input can otherwise trip a one-off teleport.)

// ── GROUND SPEED: steady-state walk velocity (item 5 ground; item 3 sprite) ──
await waitFrames(60);
await page.keyboard.down("d"); await waitFrames(10);   // ramp past startup
let vxs = [];
for (let i = 0; i < 6; i++) { await waitFrames(2); vxs.push(Math.abs((await p1()).vx || 0)); }
const gMid = await p1(); await shot("ground_move");
await page.keyboard.up("d");
const gVx = Math.max(...vxs);
log("GROUND walk velocity (px/frame)", gVx.toFixed(2));
log("GROUND move sprite", gMid.spriteSheet);
await waitFrames(4);

// ── FLIGHT SPEED: steady-state flight velocity (item 5 flight; item 2 sprite) ──
await reset();
await tapP(); // engage flight
await waitFrames(60);
await page.keyboard.down("d"); await waitFrames(8);
let fvxs = [];
for (let i = 0; i < 6; i++) { await waitFrames(2); fvxs.push(Math.abs((await p1()).vx || 0)); }
const fMid = await p1(); await shot("flight_move");
await page.keyboard.up("d");
const fVx = Math.max(...fvxs);
log("FLIGHT velocity (px/frame)", fVx.toFixed(2));
log("FLIGHT move sprite", fMid.spriteSheet);
log("flight NOTICEABLY faster than ground?", `${fVx.toFixed(1)} vs ${gVx.toFixed(1)} → ${fVx > gVx * 1.4 ? "YES" : "NO"}`);

// ── HOLD-P CHARGE (item 1) ──
await reset();
await page.evaluate(() => window.__harness.setP1Energy(20));
const e0 = (await p1()).energy;
await page.keyboard.down("p"); await waitFrames(40); await page.keyboard.up("p");
const e1 = (await p1()).energy;
log("HOLD-P 40f energy gain", `${e0.toFixed(1)} → ${e1.toFixed(1)} (Δ${(e1 - e0).toFixed(1)})`);
log("charging works?", e1 - e0 > 3 ? "YES" : "NO (impossible to charge)");
await waitFrames(2);

// ── DOUBLE-TAP TELEPORT (item 4) — measured by the position JUMP (gap-close blink), the shared
//    teleportBehindTarget behavior (reposition adjacent to the opponent, like Gojo/Sasuke/Rick). ──
await reset();
await waitFrames(60);   // stale window: a LONE tap must NOT teleport
const lx0 = (await p1()).x;
await page.keyboard.press("d"); await waitFrames(20);
const loneDx = Math.abs((await p1()).x - lx0);
await waitFrames(60);
const tx0 = (await p1()).x;
await page.keyboard.press("d"); await waitFrames(4); await page.keyboard.press("d"); await waitFrames(10);
const dblDx = Math.abs((await p1()).x - tx0);
await shot("teleport_after");
log("lone-tap jump (should be small)", `${loneDx.toFixed(0)}px`);
log("double-tap teleport jump", `${dblDx.toFixed(0)}px → ${dblDx > 150 && loneDx < 120 ? "TELEPORT-DASH OK (lone tap safe)" : "CHECK"}`);

// ── INTRO VARIETY (item 6) — read the chosen introVariant across many boots ──
const intros = {};
for (let i = 0; i < 16; i++) {
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(2);
  const v = (await p1()).introVariant || "?";
  intros[v] = (intros[v] || 0) + 1;
}
log("intro variants over 16 boots", JSON.stringify(intros));

async function reset() { await page.evaluate(() => window.__harness.boot()); await waitFrames(4); await waitGrounded(); }

console.log("=== done ===\n");
await browser.close();
server.close();
