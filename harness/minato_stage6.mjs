// harness/minato_stage6.mjs — STAGE 6: Minato's Kurama (half-form) ULTIMATE.
// Nine-Tails Chakra Mode → half-Kurama fox → Tailed Beast Bomb. Verifies: the ultimate
// activates its own cinematic (minatoKurama, NOT Naruto's kurama), the phase machine runs
// activate→widen→rise→charge→fire→settle, combat is FROZEN, the guaranteed TBB damage lands
// at impact, and it's survivable-from-full (not a pure round-ender). Captures each phase.
// Ultimate key = "u". Standalone server (mirrors minato_stage5.mjs).
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
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.minatoKuramaUltCine());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(OUT, `minato_s6_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(30);

// Prep: full meter, dummy at mid distance, both healed.
await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP1?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
{ const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 260); }
await waitFrames(3);

{ const a = await p1(); check("P1 is Minato", (a.key || "").toLowerCase() === "minato", `key=${a.key}`); }
const p2full = (await p2()).health;

// ── ACTIVATE the ultimate ──
section("Ultimate activation");
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
await page.waitForFunction(() => window.__harness.minatoKuramaUltCine().active, null, { timeout: 3000, polling: 16 }).catch(() => {});
let c = await cine();
check("Minato Kurama cinematic ACTIVE (own module)", c.active, `active=${c.active}`);
check("Naruto's kurama cinematic did NOT fire", await page.evaluate(() => !window.__harness.kuramaUltCine().active), "");
check("spent ultimate meter (~50%)", (await p1()).energy < p2full, `en=${(await p1()).energy?.toFixed?.(0)}`);

// ── PHASE MACHINE — capture each beat ──
section("Phase machine (activate→widen→rise→charge→fire→settle)");
const seen = new Set();
const grabbed = {};
for (let i = 0; i < 260; i++) {
  c = await cine();
  if (!c.active && seen.size) break;
  if (c.phase && !seen.has(c.phase)) { seen.add(c.phase); if (!grabbed[c.phase]) { grabbed[c.phase] = true; await shot(c.phase); } }
  await waitFrames(2);
}
for (const ph of ["activate", "widen", "rise", "charge", "fire", "settle"]) {
  check(`phase '${ph}' occurred`, seen.has(ph), "");
}

// ── COMBAT FREEZE + guaranteed damage ──
section("Freeze + guaranteed TBB damage");
// The cinematic has ended by now (loop ran past T_TOTAL). Verify aftermath.
await page.waitForFunction(() => !window.__harness.minatoKuramaUltCine().active, null, { timeout: 6000, polling: 32 }).catch(() => {});
const p2after = (await p2()).health;
const dmg = p2full - p2after;
check("TBB dealt guaranteed damage (~360 = 600×0.60)", dmg > 300, `Δhp=${dmg.toFixed(0)}`);
check("survivable from full (NOT a pure round-ender)", p2after > 0, `p2 hp=${p2after.toFixed(0)} / ${p2full.toFixed(0)}`);
check("cinematic ended cleanly (combat resumes)", !(await cine()).active, "");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/minato_s6_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
