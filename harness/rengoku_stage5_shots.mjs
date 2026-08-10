// harness/rengoku_stage5_shots.mjs — STAGE 5 evidence for Rengoku's "Flame Explosion" ultimate.
// Presses U → asserts the freeze-cinematic activates (caster=rengoku), the explosion sprite plays
// through the freeze, the guaranteed AOE detonation damage lands, the cinematic ends + combat resumes,
// and the ultimate is COOLDOWN-gated (ultimateCooldown stamped, not energy). Screenshots the eruption.
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
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.rengokuUltCine());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function prep(gap = 90) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); window.__harness.resetUlt?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `rengoku_s5_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=rengoku&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(6);

console.log("\n── Ultimate: Flame Explosion (freeze-cinematic) ──");
// Fire at RANGE (600px) to prove the detonation is guaranteed + range-independent.
await prep(600);
const uhp = (await p2()).health;
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
let st = await cine();
check("U fires Flame Explosion cinematic (caster=rengoku)", st.active && st.casterKey === "rengoku", `active=${st.active} caster=${st.casterKey}`);
check("explosion sprite plays through freeze", has(await p1(), "rengoku_ultimate_explosion_uniform"), `sheet=${(await p1()).spriteSheet}`);
check("ultimate is COOLDOWN-gated (ultimateCooldown stamped)", ((await p1()).ultCooldown || 0) > 0, `ultCd=${(await p1()).ultCooldown}`);
// let the cinematic reach its push-in / eruption and screenshot it
await page.waitForFunction(() => { const c = window.__harness.rengokuUltCine(); return c.active && (c.phase === "burst" || c.struck); }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await shot("eruption");
// detonation damage
await page.waitForFunction(() => window.__harness.rengokuUltCine().struck === true || window.__harness.rengokuUltCine().active === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
await shot("detonation");
const dealt = uhp - (await p2()).health;
check("guaranteed detonation damage lands (range-independent ~204 = 340×0.60)", dealt >= 190, `−${dealt} @600px`);
// cinematic ends, combat resumes
await page.waitForFunction(() => window.__harness.rengokuUltCine().active === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(6);
check("cinematic ends, combat resumes", (await cine()).active === false && !has(await p1(), "rengoku_ultimate_explosion_uniform"), "");
await shot("resumed");

check("no JS errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/rengoku_s5_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
