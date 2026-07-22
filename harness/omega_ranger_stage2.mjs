// harness/omega_ranger_stage2.mjs
// STAGE 2 evidence: Omega Ranger's 5 basic normals connect on the dummy + render
// the correct re-sliced sheets. Screenshots → harness/shots/omega_stage2_*.png.
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
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `omega_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=omega_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── GROUND NORMALS: light / heavy / up ───────────────────────────────
  console.log("\n── ground normals connect + correct sheet ──");
  // NB: all damage is scaled by a global ~0.58 factor, so thresholds are ~0.5×raw.
  for (const [name, action, key, gap, sheetTag, dmgMin] of [
    ["light", "light", "j", 46, "foward_punch_uniform", 22],
    ["heavy", "heavy", "k", 44, "downward_smash_uniform", 44],
    ["up (launcher)", "up", "i", 42, "upper_attack_uniform", 30],
  ]) {
    await prep(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const mid = await record(); await shot(action); await page.keyboard.up(key); await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`${name} connects (dmg ≥ ${dmgMin})`, hp0 - hp1 >= dmgMin, `dmg=${hp0 - hp1}`);
    check(`${name} sheet = ${sheetTag}`, (seen.get(action) || "").includes(sheetTag), `action=${mid.action} sheet=${seen.get(action)}`);
  }
  // up-attack should launch the dummy (knockbackY negative)
  await prep(42);
  await page.keyboard.down("i"); await waitFrames(6); await page.keyboard.up("i"); await waitFrames(6);
  const launched = await p2();
  check("up-attack launches dummy (airborne / rising)", !launched.grounded || launched.vy < -1, `grounded=${launched.grounded} vy=${launched.vy}`);

  // ── AIR NORMALS: air (airborne J) / down_air (airborne S+J spike) ─────
  // Real air-normals connect on the DESCENT/in juggles, not a rising hop — so lift P1
  // to the dummy's height (liftP1) and strike, mirroring the roster's air-normal tests.
  console.log("\n── air normals connect + correct sheet ──");
  await prep(44);
  await page.evaluate(() => window.__harness.liftP1(40));
  let hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const airRec = await record(); await shot("air"); await page.keyboard.up("j"); await waitFrames(14);
  let hp1 = (await p2()).health;
  check("air resolves to air_punch_uniform", (seen.get("air") || "").includes("air_punch_uniform"), `action=${airRec.action} sheet=${seen.get("air")}`);
  check("air connects (dmg > 0)", hp0 - hp1 > 0, `dmg=${hp0 - hp1}`);
  await waitGrounded(); await waitFrames(8);

  await prep(30);
  await page.evaluate(() => window.__harness.liftP1(46));
  hp0 = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); const daRec = await record(); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
  hp1 = (await p2()).health;
  check("down_air resolves to air_down_attack_uniform", (seen.get("down_air") || "").includes("air_down_attack_uniform"), `action=${daRec.action} sheet=${seen.get("down_air")}`);
  check("down_air connects (dmg > 0)", hp0 - hp1 > 0, `dmg=${hp0 - hp1}`);

  // ── no fallback box on any normal ────────────────────────────────────
  console.log("\n── no 128² fallback box ──");
  let boxes = 0; for (const [a, s] of seen) { if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); } }
  check("every normal rendered a real sheet", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 2: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
