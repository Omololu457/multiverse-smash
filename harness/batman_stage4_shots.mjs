// harness/batman_stage4_shots.mjs — STAGE 4: "The Dark Knight" ultimate (batarang-barrage freeze
// cinematic). Verifies activation, phase progression, guaranteed damage at the connect beat, clean
// resume, and captures windup / barrage / impact / resumed screenshots.
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
const cine = () => page.evaluate(() => window.__harness.batmanUltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `batman_s4_${name}.png`) }); }
async function holdKey(key, frames = 3) { await page.keyboard.down(key); await waitFrames(frames); await page.keyboard.up(key); }

await page.goto(`${base}/index.html?harness=1&p1=batman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

// Setup: full gadget meter, dummy at mid range, both healthy.
await waitGrounded();
await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 150); });
await waitFrames(2);
const en0 = (await p1()).energy;
const hp0 = (await p2()).health;
check("starts with full gadget meter", en0 >= 99, `energy=${en0.toFixed(0)}`);

// Fire the ultimate (U).
await holdKey("u", 3);
await waitFrames(2);
let c = await cine();
check("ultimate activates cinematic", c.active === true, `active=${c.active} phase=${c.phase}`);
check("caster is the real Batman", c.casterKey === "batman", `casterKey=${c.casterKey}`);
check("ultimate spends full meter", en0 - (await p1()).energy >= 99, `Δ=${(en0 - (await p1()).energy).toFixed(0)}`);
await shot("windup");

// Advance into BARRAGE and screenshot the rain.
await page.waitForFunction(() => { const s = window.__harness.batmanUltCine(); return !s.active || s.phase === "barrage"; }, null, { timeout: 8000, polling: 16 });
c = await cine();
check("progresses to barrage phase", c.phase === "barrage" || c.struck, `phase=${c.phase} struck=${c.struck}`);
await shot("barrage");

// Advance past the connect beat and confirm the guaranteed damage landed.
await page.waitForFunction(() => { const s = window.__harness.batmanUltCine(); return !s.active || s.struck; }, null, { timeout: 8000, polling: 16 });
await waitFrames(2);
const dmg = hp0 - (await p2()).health;
check("barrage deals big guaranteed damage (~300)", dmg >= 250, `−${dmg.toFixed(0)}`);
await shot("impact");

// Cinematic ends and combat resumes.
await page.waitForFunction(() => window.__harness.batmanUltCine().active === false, null, { timeout: 8000, polling: 16 });
await waitFrames(6);
c = await cine();
check("cinematic ends (combat resumes)", c.active === false, `active=${c.active}`);
const alive = await p1();
check("Batman is live after the ultimate", alive.key === "batman" && (alive.health || 0) > 0, `hp=${alive.health}`);
await shot("resumed");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/batman_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
