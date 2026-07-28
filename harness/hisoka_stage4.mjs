// harness/hisoka_stage4.mjs
// Stage 4 verification: Texture Surprise cards — two variants on the SPECIAL button, direction-split.
//   • Down+Special  = single precise throw (1 card, higher damage)
//   • Fwd+Special   = rapid multi-card spread (5 cards, fanned, lower per-card damage)
// Each card is an INDEPENDENT projectile. Neutral Special stays Bungee Gum (no projectile). Screenshots.
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
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
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
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const cards = async () => (await projs()).filter(p => (p.name || "").includes("hisoka_card"));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function prep(gap, refillEnergy = true) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(re => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); if (re) window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); }, refillEnergy);
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
const shot = name => page.screenshot({ path: path.join(OUT, `hisoka_s4_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=hisoka`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("registration");
  check("P1 is Hisoka", (await record()).key === "hisoka");

  // ── Down+Special: single precise card ──
  section("Texture Surprise SINGLE (Down+Special) — 1 card, precise");
  // Far + invulnerable target so the lone card stays in flight while we count it (no despawn-on-hit race).
  await prep(420);
  await page.evaluate(() => window.__harness.setP2Invuln?.(240));
  await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(3);
  const cs = await record();
  check("Down+Special resolves to cardThrowSingle", cs.action === "cardThrowSingle" || cs.currentMove === "cardThrowSingle", `action=${cs.action} move=${cs.currentMove}`);
  check("single cast plays hisoka_card_single sheet", (cs.spriteSheet || "").includes("hisoka_card_single"), `sheet=${cs.spriteSheet}`);
  await page.keyboard.up("l"); await page.keyboard.up("s");
  let singlePeak = 0; let c0 = null;
  for (let i = 0; i < 16; i++) { const cc = await cards(); if (cc.length > singlePeak) { singlePeak = cc.length; c0 = cc[0]; } if (i === 3) await shot("single_throw"); await waitFrames(1); }
  check("spawns exactly 1 card projectile", singlePeak === 1, `peak=${singlePeak}`);
  check("card is a real independent projectile (own motion)", !!c0 && Math.abs(c0.vx) > 0, `vx=${c0?.vx}`);   // damage verified by the connect check below
  // now a connect check at close range
  await prep(200);
  const hp0s = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("s");
  await waitFrames(30);
  const singleDmg = hp0s - (await p2()).health;
  check("single card connects", singleDmg > 0, `−${singleDmg.toFixed(0)}`);

  // ── Fwd+Special: rapid spread ──
  section("Texture Surprise RAPID (Fwd+Special) — multi-card spread");
  // Far + invulnerable target so the whole fan stays airborne while we count/screenshot it.
  await prep(520);
  await page.evaluate(() => window.__harness.setP2Invuln?.(300));
  await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(3);
  const cr = await record();
  check("Fwd+Special resolves to cardThrowRapid", cr.action === "cardThrowRapid" || cr.currentMove === "cardThrowRapid", `action=${cr.action} move=${cr.currentMove}`);
  check("rapid cast plays hisoka_card_rapid sheet", (cr.spriteSheet || "").includes("hisoka_card_rapid"), `sheet=${cr.spriteSheet}`);
  await page.keyboard.up("l"); await page.keyboard.up("d");
  // poll for peak simultaneous card count across the staggered burst
  let peak = 0; const vys = new Set();
  for (let i = 0; i < 22; i++) { const cc = await cards(); peak = Math.max(peak, cc.length); cc.forEach(c => vys.add(Math.round(c.vy))); if (peak >= 4 && i > 8) await shot("rapid_spread"); await waitFrames(1); }
  check("rapid spawns multiple card projectiles", peak >= 3, `peak simultaneous=${peak}`);
  check("cards fan out (distinct vy angles)", vys.size >= 3, `distinct vy=${[...vys].sort((a, b) => a - b).join(",")}`);
  // now a connect check at close range
  await prep(200);
  const hp0r = (await p2()).health;
  await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("d");
  await waitFrames(34);
  const rapidDmg = hp0r - (await p2()).health;
  check("rapid spread connects", rapidDmg > 0, `−${rapidDmg.toFixed(0)}`);

  // ── neutral Special still = Bungee Gum (no projectile) ──
  section("neutral Special stays Bungee Gum (no card projectile)");
  await prep(90);
  await page.keyboard.down("l"); await waitFrames(4); const nb = await record(); await page.keyboard.up("l");
  check("neutral Special = bungeeGum", nb.currentMove === "bungeeGum" || nb.action === "bungeeGum", `move=${nb.currentMove}`);
  check("neutral spawns NO card projectile", (await cards()).length === 0, `cards=${(await cards()).length}`);
  await waitFrames(20);

  section("fallback-box sweep");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("hisoka"));
  check(`all ${seenActions.size} exercised actions use a hisoka sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("FATAL", e); FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  HISOKA Stage 4: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
