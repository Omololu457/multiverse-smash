// harness/omniman_stage4_shots.mjs — STAGE 4 evidence for Omni-Man's specials.
// Fires each direction-branched special (Neutral Viltrumite Smash / Fwd Skewering Rush / Down Meteor
// Drop), verifying the cast sprite, that it spends the SHARED Smart Atoms pool, and (skewer) the
// forward flight-charge. Also confirms a special mid-FLIGHT still draws from the same pool.
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
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitIdle() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {}); }
async function settle() { await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.topUpP1Health?.(); window.__harness.setP1Energy?.(200); }); await waitGrounded(); await waitFrames(6); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `omniman_s4_${name}.png`) }); }
const has = (a, s) => (a.spriteSheet || "").includes(s);

await page.goto(`${base}/index.html?harness=1&p1=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(4); await waitGrounded();

async function closeIn(gap = 80) {
  await settle();
  await page.keyboard.down("d");
  await page.waitForFunction(g => { const a = window.__harness.p1(), b = window.__harness.p2(); return a && b && Math.abs(a.x - b.x) < g; }, gap, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.keyboard.up("d"); await waitFrames(2);
}

// ── NEUTRAL — Viltrumite Smash (no direction + Special) ──
await closeIn(72);
let e0 = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(9); await page.keyboard.up("l");
let a = await p1();
check("Neutral Special → Viltrumite Smash (omSmash → heavy pose)", a.currentMove === "omSmash" && has(a, "omni_man_ground_punch_1_uniform"), `move=${a.currentMove} sheet=${a.spriteSheet}`);
check("Viltrumite Smash spent Smart Atoms (35)", e0 - a.energy >= 34, `Δ${(e0 - a.energy).toFixed(0)}`);
await shot("smash");
await waitIdle();

// ── FORWARD — Skewering Rush (hold toward opponent + Special) ──
await closeIn(140);
await waitFrames(18);   // let the walk-in forward tap go stale so re-pressing forward is a HOLD, not a double-tap → teleport (dashTeleport, Fix #4)
e0 = (await p1()).energy;
await page.keyboard.down("d"); await waitFrames(3);   // hold forward FIRST so _specialHeldDir reads "F" on the special frame
const x0 = (await p1()).x;                            // record AFTER the pre-walk so the check isolates the lunge burst
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
await waitFrames(5);
a = await p1();
check("Forward Special → Skewering Rush (omSkewer)", a.currentMove === "omSkewer" && has(a, "omni_man_skewer_uniform"), `move=${a.currentMove} sheet=${a.spriteSheet}`);
check("Skewering Rush carries him FORWARD (flight-charge)", a.x > x0 + 25, `x ${x0 | 0}→${a.x | 0}`);
check("Skewering Rush spent Smart Atoms (30)", e0 - a.energy >= 29, `Δ${(e0 - a.energy).toFixed(0)}`);
await shot("skewer");
await page.keyboard.up("d"); await waitIdle();

// ── DOWN — Meteor Drop (hold down + Special) ──
await closeIn(72);
e0 = (await p1()).energy;
await page.keyboard.down("s"); await waitFrames(3);   // hold DOWN firmly so _specialHeldDir reads "D" on the special frame
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
await waitFrames(9);
a = await p1();
check("Down Special → Meteor Drop (omMeteor)", a.currentMove === "omMeteor" && has(a, "omni_man_meteor_uniform"), `move=${a.currentMove} sheet=${a.spriteSheet}`);
check("Meteor Drop spent Smart Atoms (40)", e0 - a.energy >= 39, `Δ${(e0 - a.energy).toFixed(0)}`);
await shot("meteor");
await page.keyboard.up("s"); await waitIdle();

// ── SHARED POOL confirm: a special cast while FLYING draws from the same meter ──
await settle();
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3);   // fly
const flying = (await p1()).flightActive;
e0 = (await p1()).energy;
await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(2);
a = await p1();
check("special mid-FLIGHT draws from the shared pool", flying === true && (e0 - a.energy) >= 34, `flying=${flying} Δ${(e0 - a.energy).toFixed(0)}`);
await shot("fly_special");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/omniman_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
