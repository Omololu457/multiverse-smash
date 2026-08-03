// harness/samurai_red_ranger_stage4.mjs
// STAGE 4 evidence: Flame Slash (Special button) is MEGA-MODE-EXCLUSIVE.
//  • BASE FORM: pressing Special is a NO-OP (no cast, no attack, no energy spent) — gated off.
//  • MEGA FORM: Flame Slash fires (flameslash cast sheet), connects + launches, and spawns the
//    DOUBLE-BURST (two forward flame crescents).
// Screenshots → harness/shots/samurai_stage4_*.png.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `samurai_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
// poll currentMove over a window (a cast is brief); returns whether `name` was seen + records sheet
let castSheet = null;
async function sawCast(name, frames = 24) { for (let i = 0; i < frames; i++) { const a = await p1(); if (a.currentMove === name) { castSheet = a.spriteSheet; return true } await waitFrames(1); } return false; }
async function toMega() {
  await waitGrounded();
  await page.evaluate(() => window.__harness.setEnergy?.(160));
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=samurai_red_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── BASE FORM: Special is a NO-OP (Mega-only gate) ───────────────────
  console.log("\n── base form: Flame Slash unavailable (Special = no-op) ──");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.setEnergy?.(160); window.__harness.clearProjectiles(); window.__harness.resetFighterInput?.("p1"); });
  const e0 = (await p1()).energy;
  await page.keyboard.down("l"); await waitFrames(2);
  const baseCast = await sawCast("flameSlash", 14);
  await page.keyboard.up("l"); await waitFrames(4);
  const baseAfter = await p1();
  const baseProjs = (await projs()).filter(p => (p.sheet || "").includes("flameburst")).length;
  check("base form: Special does NOT fire Flame Slash (currentMove never flameSlash)", !baseCast, "");
  check("base form: no attack state entered", !baseAfter.attacking, `attacking=${baseAfter.attacking}`);
  check("base form: no Symbol Power spent", Math.abs((baseAfter.energy ?? 0) - e0) < 1, `Δenergy=${(e0 - (baseAfter.energy ?? 0)).toFixed(1)}`);
  check("base form: no flame-burst projectiles spawned", baseProjs === 0, `bursts=${baseProjs}`);
  check("base form: form still base", baseAfter.currentForm !== "megaMode", `form=${baseAfter.currentForm}`);

  // ── MEGA FORM (A): Flame Slash fires + DOUBLE-BURST (P2 far → bursts fly, easy to count) ──
  console.log("\n── Mega form: Flame Slash fires + double-burst (far range) ──");
  await toMega();
  check("in Mega Mode", (await p1()).currentForm === "megaMode", "");
  await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setEnergy?.(160); });
  let a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 340); await waitFrames(2);   // far → bursts travel open space
  const eMega0 = (await p1()).energy;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const megaCast = await sawCast("flameSlash", 20);
  await waitFrames(10); await shot("flame_slash");   // bursts released + travelling
  let maxBursts = 0;
  for (let i = 0; i < 30; i++) { const n = (await projs()).filter(p => (p.sheet || "").includes("flameburst")).length; if (n > maxBursts) maxBursts = n; await waitFrames(1); }
  const eSpent = eMega0 - (await p1()).energy;
  check("Mega form: Flame Slash fires (currentMove=flameSlash)", megaCast, "");
  check("Flame Slash cast sheet = flameslash_uniform", (castSheet || "").includes("samurai_ranger_flameslash_uniform"), `sheet=${castSheet}`);
  check("Flame Slash spends Symbol Power (≥35, plus drain)", eSpent >= 35, `Δenergy=${eSpent.toFixed(1)}`);
  check("DOUBLE-BURST: two flame crescents spawned", maxBursts >= 2, `maxBursts=${maxBursts}`);

  // ── MEGA FORM (B): connects + launches (P2 close, check launch immediately) ──
  console.log("\n── Mega form: Flame Slash connects + launches (close range) ──");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setEnergy?.(160); });
  a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 62); await waitFrames(2);
  const hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await sawCast("flameSlash", 20);
  // watch for the launch in the frames right after the hit (P2 goes airborne / rises)
  let launched = false, dmg = 0;
  for (let i = 0; i < 22; i++) { const q = await p2(); if (!q.grounded || q.vy < -2) launched = true; dmg = hp0 - q.health; if (launched && dmg > 40) break; await waitFrames(1); }
  check("Flame Slash connects (damage dealt)", dmg > 40, `dmg=${dmg}`);
  check("Flame Slash launches the opponent (rising slash)", launched, "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 4: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
