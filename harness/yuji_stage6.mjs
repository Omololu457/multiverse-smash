// harness/yuji_stage6.mjs — Stage 6 evidence for Yuji's "Sukuna Slash" FLAVOR special (NO transform).
// TRIGGER = double-tap DOWN → Special (S,S+L). Proves:
//   • the cursed HAND-SIGN cast pose (yuji_sukuna_slash.png) plays, 35 energy spent
//   • an AUTO-TARGETING slash FX (yuji_sukuna_slahs_effect.png) resolves ON the opponent — stationary,
//     visualOnly (no travelling collider), yet lands sure-hit damage
//   • BLOCKABLE: a guarding opponent takes chip only (the block genuinely stops the full hit)
//   • DISAMBIGUATION: a SINGLE Down+Special is still Crescent (not the slash)
//   • NO TRANSFORM: Yuji stays Yuji (rosterKey unchanged, no form flag)
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
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `yuji_s6_${name}.png`) });

// double-tap DOWN then Special (S,S + L). Two quick "s" edges feed directionHistory; the 2nd is held while L fires.
async function doubleDownSpecial() {
  await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.up("s"); await waitFrames(1);
  await page.keyboard.down("s"); await waitFrames(1);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.keyboard.up("s");
}
// single Down + Special (should be Crescent, NOT the slash).
async function singleDownSpecial() {
  await page.keyboard.down("s"); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.keyboard.up("s");
}
async function prep(gap, behavior = "stand") {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.evaluate(b => window.__harness.setSession?.({ dummyBehavior: b }), behavior);
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 3500, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(6);   // let stale Down edges age out (>340ms)
}
// Fire the double-down slash and sample the cast pose + FX projectile + damage across the resolve window.
async function fireSlashAndSample() {
  const eBefore = (await p1()).energy;
  const hpBefore = (await p2()).health;
  let sawSign = false, fx = null, everBlocking = false;
  await doubleDownSpecial();
  for (let i = 0; i < 22; i++) {
    const a = await p1();
    if ((a.spriteSheet || "").includes("yuji_sukuna_slash")) sawSign = true;
    for (const pr of await projs()) if ((pr.name || "") === "yujiSukunaSlash") fx = pr;
    if ((await p2()).blocking) everBlocking = true;   // was the dummy guarding during the resolve window?
    await waitFrames(1);
  }
  const eSpent = eBefore - (await p1()).energy;
  const dmg = hpBefore - (await p2()).health;
  return { sawSign, fx, eSpent, dmg, everBlocking };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setSession?.({ dummyBehavior: "stand" }));
  await waitFrames(6);

  // ── SUKUNA SLASH connects (unblocked) ──
  section("Sukuna Slash — double-tap Down + Special → hand-sign → auto-target slash");
  await prep(120, "stand");
  const r = await fireSlashAndSample();
  await shot("slash");
  check("cursed hand-sign cast plays (yuji_sukuna_slash)", r.sawSign, `sawSign=${r.sawSign}`);
  check("~35 energy spent", r.eSpent >= 30 && r.eSpent <= 45, `spent=${r.eSpent.toFixed(0)}`);
  check("auto-target slash FX spawned (yujiSukunaSlash)", !!r.fx, `fx=${r.fx ? "yes" : "no"}`);
  check("FX is stationary + visualOnly (no travelling collider)", !!r.fx && r.fx.visualOnly === true && r.fx.vx === 0 && r.fx.vy === 0, r.fx ? `visualOnly=${r.fx.visualOnly} vx=${r.fx.vx} vy=${r.fx.vy}` : "no fx");
  check("FX uses the shared sukuna-slash sheet", !!r.fx && (r.fx.sheet || "").includes("yuji_sukuna_slahs_effect"), r.fx ? `sheet=${r.fx.sheet}` : "no fx");
  check("FX resolves ON the opponent (auto-track)", !!r.fx && Math.abs(r.fx.x - ((await p2()).x + (await p2()).w / 2)) < 160, r.fx ? `dx≈${Math.abs(r.fx.x - ((await p2()).x + (await p2()).w / 2)).toFixed(0)}` : "no fx");
  check("sure-hit damage landed (unblocked)", r.dmg >= 40 && r.dmg <= 65, `−${r.dmg.toFixed(0)}`);

  // ── NO TRANSFORM ──
  section("no transform — Yuji stays Yuji");
  const a1 = await p1();
  check("rosterKey still 'yuji'", a1.key === "yuji", `key=${a1.key}`);
  check("no transformation form active (base/none)", (!a1.currentForm || a1.currentForm === "base") && !a1.overdriveActive && !a1.godspeedActive && !a1.mangekyouActive && !a1.flashTimeActive, `form=${a1.currentForm}`);

  // ── BLOCKABLE ──
  section("blockable — a guarding opponent takes chip only");
  await prep(120, "block");
  const rb = await fireSlashAndSample();
  await shot("slash_blocked");
  check("opponent was guarding during the slash", rb.everBlocking === true, `blocking=${rb.everBlocking}`);
  check("blocked hit is chip only (< unblocked)", rb.dmg > 0 && rb.dmg < 30, `−${rb.dmg.toFixed(0)}  (vs unblocked −${r.dmg.toFixed(0)})`);

  // ── DISAMBIGUATION: single Down = Crescent, not the slash ──
  section("disambiguation — single Down + Special is still Crescent");
  await prep(120, "stand");
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  let sawCrescent = false, sawSlashFx = false, sawSignSingle = false;
  await singleDownSpecial();
  for (let i = 0; i < 20; i++) {
    const a = await p1();
    if ((a.spriteSheet || "").includes("yuji_crescent")) sawCrescent = true;
    if ((a.spriteSheet || "").includes("yuji_sukuna_slash")) sawSignSingle = true;
    for (const pr of await projs()) if ((pr.name || "") === "yujiSukunaSlash") sawSlashFx = true;
    await waitFrames(1);
  }
  check("single Down fired Crescent (yuji_crescent)", sawCrescent, `crescent=${sawCrescent}`);
  check("single Down did NOT fire the Sukuna Slash", !sawSignSingle && !sawSlashFx, `sign=${sawSignSingle} slashFx=${sawSlashFx}`);

  section("stability");
  check("no JS errors during Stage 6", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
