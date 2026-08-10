// harness/omniman_stage5_shots.mjs — STAGE 5 evidence for Omni-Man's ULTIMATE.
// "Viltrumite Onslaught": a frozen body-slam cinematic. Verifies it activates, plays the body-slam
// sprite through the freeze, lands guaranteed damage at the SLAM connect beat, and resumes cleanly.
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
const cine = () => page.evaluate(() => window.__harness.omnimanUltCine());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `omniman_s5_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(4); await waitGrounded();

// full meter + close to the dummy
await page.evaluate(() => { window.__harness.setP1Energy(200); window.__harness.topUpP1Health?.(); });
await waitFrames(20);   // stale window: keep the walk-in off the boot-proximity double-tap window (dashTeleport, Fix #4)
await page.keyboard.down("d");
await page.waitForFunction(() => { const a = window.__harness.p1(), b = window.__harness.p2(); return a && b && Math.abs(a.x - b.x) < 120; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
await page.keyboard.up("d"); await waitFrames(2);

const oppHP0 = (await p2()).health;
const e0 = (await p1()).energy;

// ── FIRE ULTIMATE (U) ──
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
await waitFrames(3);
let c = await cine();
check("Ultimate activates the body-slam cinematic", c.active === true, `active=${c.active} phase=${c.phase}`);
check("cinematic caster is the real Omni-Man", c.casterKey === "omniman", `casterKey=${c.casterKey}`);
check("Ultimate spent Smart Atoms (100)", e0 - (await p1()).energy >= 99, `Δ${(e0 - (await p1()).energy).toFixed(0)}`);
let a = await p1();
check("plays the body-slam sprite (omni_man_ultimate)", (a.spriteSheet || "").includes("omni_man_ultimate"), `sheet=${a.spriteSheet}`);
await shot("leap");

// ── advance to the SLAM connect beat ──
await page.waitForFunction(() => { const x = window.__harness.omnimanUltCine(); return x.struck === true; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
c = await cine();
check("reaches the SLAM connect beat (struck)", c.struck === true, `struck=${c.struck} phase=${c.phase} frame=${c.frame}`);
await shot("slam");
const oppHP1 = (await p2()).health;
check("guaranteed body-slam damage lands (~204 = 340×0.60)", oppHP0 - oppHP1 >= 190, `HP ${oppHP0 | 0}→${oppHP1 | 0} (Δ${(oppHP0 - oppHP1) | 0})`);
check("opponent slammed to the ground (knockdown)", (await p2()).knockdownState === true || (await p2()).hitstun > 0, "");

// ── cinematic ends → combat resumes ──
await page.waitForFunction(() => window.__harness.omnimanUltCine().active === false, null, { timeout: 6000, polling: 16 }).catch(() => {});
c = await cine();
check("cinematic ends cleanly (combat resumes)", c.active === false, `active=${c.active}`);
a = await p1();
check("Omni-Man returns to normal control (cast pose cleared)", !(a.spriteSheet || "").includes("omni_man_ultimate") || a.currentMove !== "ultimate", `sheet=${a.spriteSheet} move=${a.currentMove}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/omniman_s5_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
