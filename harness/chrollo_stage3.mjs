// harness/chrollo_stage3.mjs — Stage 3 specials: Nen Bolt (neutral projectile) +
// Blade Lunge (Down knife-thrust). Both use real master-sheet art. Models netero_stage3.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function sample(n) { const acts = new Set(); for (let i = 0; i < n; i++) { const a = await record(); if (a.action) acts.add(a.action); await waitFrames(1); } return acts; }
const shot = name => page.screenshot({ path: path.join(OUT, `chrollo_s3_${name}.png`) });
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=chrollo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── NEN BOLT (neutral Special) — cast pose + traveling projectile (free-flight snapshot) ──
  section("Nen Bolt — neutral Special: blue nen construct projectile");
  await prep(400);
  await page.evaluate(() => window.__harness.setP2Invuln(600));   // let the bolt fly free so we can snapshot it mid-flight
  const nE0 = (await p1()).energy;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const nCast = await sample(4);           // watch the cast pose
  await shot("nenbolt_cast");
  const nE1 = (await p1()).energy;
  await page.waitForFunction(() => window.__harness.projectiles().some(p => p.name === "chrollo_nenbolt"), null, { timeout: 2000, polling: 16 }).catch(() => {});
  const pj = await projs();
  await waitFrames(6); await shot("nenbolt_travel");
  check("cast pose chNenCast plays", nCast.has("chNenCast"), `acts=[${[...nCast]}]`);
  check("spawns a chrollo_nenbolt projectile", pj.some(p => p.name === "chrollo_nenbolt"), `projs=[${pj.map(p => p.name).join(",")}]`);
  check("projectile uses the nen-construct sheet", pj.some(p => (p.sheet || "").includes("chrollo_nenbeast_uniform")), `sheet=${(pj.find(p => p.name === "chrollo_nenbolt") || {}).sheet}`);
  check("spends 25 energy", nE0 - nE1 >= 23, `Δ=${(nE0 - nE1).toFixed(0)}`);
  await page.evaluate(() => window.__harness.clearProjectiles?.());

  // ── NEN BOLT connect (close range, dummy vulnerable) ──
  await prep(150);
  const nH0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.p2().health < window.__harness.p2().maxHealth, null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("Nen Bolt connects", nH0 - (await p2()).health > 0, `−${(nH0 - (await p2()).health).toFixed(0)}`);
  await page.evaluate(() => window.__harness.clearProjectiles?.());

  // ── BLADE LUNGE (Down+Special) — knife-thrust lunge + connect ──
  section("Blade Lunge — Down+Special: forward knife-thrust lunge");
  await prep(90);
  const bH0 = (await p2()).health; const bE0 = (await p1()).energy;
  await page.keyboard.down("s");
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const bActs = await sample(8);
  await shot("blade_lunge");
  await page.keyboard.up("s");
  const bE1 = (await p1()).energy;
  const bAfter = await p2();
  check("Blade Lunge fires (chBladeLunge)", bActs.has("chBladeLunge"), `acts=[${[...bActs]}]`);
  check("uses chrollo_knifethrust sheet", (seenActions.get("chBladeLunge") || "").includes("chrollo_knifethrust_uniform"), `sheet=${(seenActions.get("chBladeLunge") || "").split("/").pop()}`);
  check("spends 25 energy", bE0 - bE1 >= 23, `Δ=${(bE0 - bE1).toFixed(0)}`);
  check("Blade Lunge connects", bH0 - bAfter.health > 0, `−${(bH0 - bAfter.health).toFixed(0)}`);
  await waitGrounded();

  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("chrollo"));
  check(`all ${seenActions.size} exercised actions use a chrollo sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  CHROLLO Stage 3: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
