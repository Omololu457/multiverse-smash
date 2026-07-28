// harness/hisoka_stage3.mjs
// Stage 3 verification: Bungee Gum — extended-reach elastic-whip MELEE special (neutral Special).
// Confirms it fires, plays the whip sheet, connects, costs Nen, and REACHES farther than a normal
// (connects at a gap where light whiffs). Screenshots of the lash + the reach comparison.
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
// Fire the neutral Special (Bungee Gum) and return damage dealt.
async function bungeeDmg() { const hp0 = (await p2()).health; await page.keyboard.down("l"); await waitFrames(3); await record(); await page.keyboard.up("l"); await waitFrames(24); return hp0 - (await p2()).health; }
async function lightDmg() { const hp0 = (await p2()).health; await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(20); return hp0 - (await p2()).health; }
const shot = name => page.screenshot({ path: path.join(OUT, `hisoka_s3_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=hisoka`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("registration");
  const g = await record();
  check("P1 is Hisoka", g.key === "hisoka", `key=${g.key}`);

  // ── Bungee Gum fires, plays whip sheet, connects, costs Nen ──
  section("Bungee Gum — fire / whip sheet / connect / cost");
  await prep(90);
  const enBefore = (await p1()).energy;
  const hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3);
  const cast = await record(); await shot("cast");
  const enAfter = (await p1()).energy;   // read immediately — passive Nen regen would inflate the delta over a long wait
  check("neutral Special resolves to bungeeGum action", cast.currentMove === "bungeeGum" || cast.action === "bungeeGum", `move=${cast.currentMove} action=${cast.action}`);
  check("whip plays hisoka_bungee_uniform sheet", (cast.spriteSheet || "").includes("hisoka_bungee_uniform"), `sheet=${cast.spriteSheet}`);
  await waitFrames(6); await shot("connect");
  await page.keyboard.up("l"); await waitFrames(20);
  const dmg = hp0 - (await p2()).health;
  check("Bungee Gum connects", dmg > 0, `−${dmg.toFixed(0)}`);
  check("costs ~30 Nen", Math.round(enBefore - enAfter) >= 29, `Δ=${(enBefore - enAfter).toFixed(0)}`);

  // ── REACH comparison: a normal whiffs where Bungee Gum connects ──
  section("extended reach — light whiffs where Bungee Gum connects");
  const REACH_GAP = 150;   // beyond a normal's default reach (rangeX 85), inside the whip's (rangeX 172)
  await prep(REACH_GAP);
  const ld = await lightDmg();
  await shot("reach_light_whiff");
  check(`light WHIFFS at gap ${REACH_GAP}`, ld === 0, `light −${ld.toFixed(0)}`);
  await prep(REACH_GAP);
  await page.keyboard.down("l"); await waitFrames(9); await record(); await shot("reach_bungee_hit"); await page.keyboard.up("l");
  await waitFrames(18);
  await prep(REACH_GAP);
  const bd2 = await bungeeDmg();
  check(`Bungee Gum CONNECTS at gap ${REACH_GAP}`, bd2 > 0, `bungee −${bd2.toFixed(0)}`);
  check("→ Bungee Gum out-reaches the normal", ld === 0 && bd2 > 0, `light −${ld.toFixed(0)} vs bungee −${bd2.toFixed(0)}`);

  // ── fallback-box sweep ──
  section("fallback-box sweep");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("hisoka"));
  check(`all ${seenActions.size} exercised actions use a hisoka sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("FATAL", e); FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  HISOKA Stage 3: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
