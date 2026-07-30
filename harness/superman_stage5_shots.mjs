// harness/superman_stage5_shots.mjs — STAGE 5: "Solar Overload" ULTIMATE (freeze cinematic).
// Proves: U fires the cinematic (spends 100 Solar Energy), Superman's overload sprite plays through the
// freeze, the guaranteed detonation damage lands range-INDEPENDENTLY at the connect beat, then combat resumes.
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
const cine = () => page.evaluate(() => window.__harness.supermanUltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `superman_s5_${name}.png`) }); }
const has = (a, s) => (a.spriteSheet || "").includes(s);

await page.goto(`${base}/index.html?harness=1&p1=superman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12); await waitGrounded();

console.log("\n── Solar Overload ULTIMATE (freeze cinematic) ──");
// full meter, and shove the opponent FAR away to prove the detonation is range-independent
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 620); });
await waitFrames(2);
const e0 = (await p1()).energy;
const hp0 = (await p2()).health;

// fire the ultimate (U)
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
await waitFrames(3);
let st = await cine();
check("U fires the Solar Overload cinematic", st.active === true, `active=${st.active}`);
check("cinematic caster is the real Superman", st.casterKey === "superman", `casterKey=${st.casterKey}`);
const e1 = (await p1()).energy;
check("ultimate spends 100 Solar Energy", (e0 - e1) === 100, `Δ${(e0 - e1).toFixed(0)} (${e0}→${e1})`);
// overload sprite plays through the freeze
let a = await p1();
check("Superman's overload sprite plays through the freeze", has(a, "superman_ultimate_uniform"), `sheet=${a.spriteSheet}`);
await shot("ult_surge");

// wait for the DETONATION beat (struck)
await page.waitForFunction(() => { const s = window.__harness.supermanUltCine(); return s.struck === true || s.active === false; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await shot("ult_detonation");
// give the frame after impact a moment, then measure damage
await waitFrames(3);
const dmg = hp0 - (await p2()).health;
check("guaranteed detonation damage lands (~380, range-independent)", dmg >= 360, `−${dmg.toFixed(0)} (opponent 620px away)`);

// cinematic ends → combat resumes
await page.waitForFunction(() => window.__harness.supermanUltCine().active === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(6);
st = await cine();
check("cinematic ends cleanly (combat resumes)", st.active === false, `active=${st.active}`);
a = await p1();
check("caster returns to normal control (sprite pose released)", !has(a, "superman_ultimate_uniform"), `sheet=${a.spriteSheet}`);

// cooldown gate — a second U immediately does NOT re-fire
await page.evaluate(() => window.__harness.fillEnergy?.());
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
check("ultimate on cooldown — immediate re-press does NOT re-fire", (await cine()).active === false, `active=${(await cine()).active}`);

check("no uncaught JS exceptions", errors.length === 0, errors[0] || "");
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/superman_s5_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
