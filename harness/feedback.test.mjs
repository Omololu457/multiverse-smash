// harness/feedback.test.mjs
// FEEDBACK — CANONICAL full-kit test (Ben 10 Omnitrix form, energy-absorption specialist).
// Covers: registration + all movement/state sprites, the 5 reused-pose normals (render + connect),
// the Absorb/Redirect reactive counter, the proactive Energy Discharge, the Overload ultimate,
// transform IN/OUT (feedback ↔ xlr8 ↔ human) cleanliness, and loadout selectability alongside the
// other art-backed forms. The staged evidence runners (feedback_stage3/4.test.mjs) hold the detail.
//   node harness/feedback.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const info = () => page.evaluate(() => window.__harness.renderInfo("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function startWatch(tag) { await page.evaluate(t => { window.__w = false; window.__wi = setInterval(() => { try { if (window.__harness.projectiles().some(p => (p.name || "").includes(t))) window.__w = true; } catch (_) {} }, 6); }, tag); }
async function stopWatch() { return page.evaluate(() => { clearInterval(window.__wi); return !!window.__w; }); }
const setForm = k => page.evaluate(key => window.__harness.benForm(key), k);
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function poseIsSprite(action) {
  await page.evaluate(a => window.__harness.benPose(a, "p1"), action);
  await waitFrames(1); await page.waitForTimeout(120);
  const s = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); const i = window.__harness.renderInfo("p1"); return { w: c?.contentW || 0, h: c?.contentH || 0, action: i?.action }; });
  await page.evaluate(() => window.__harness.benPose(null, "p1"));
  return { ok: s.w > 0 && s.h > 0 && !(s.w >= 120 && s.h >= 120), ...s };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  // ── REGISTRATION + TRANSFORM IN ──
  section("Registration + transform-in");
  const fi = await setForm("feedback");
  check("transforms INTO Feedback (activeAlien=feedback)", fi.activeAlien === "feedback", `active=${fi.activeAlien}`);
  check("Feedback loads its own sprite set (_skinAnim)", fi.hasSkinAnim === true, `hasSkinAnim=${fi.hasSkinAnim}`);
  check("name reads Feedback", /Feedback/.test(fi.name || ""), `name=${fi.name}`);
  check("stats swap to Feedback (maxHealth 980)", (await p1()).maxHealth === 980, `maxHealth=${(await p1()).maxHealth}`);

  // ── MOVEMENT / STATE SPRITES ──
  section("Movement / state render as sprites");
  for (const a of ["idle", "run", "jump", "guard", "hurt"]) { const r = await poseIsSprite(a); check(`${a} → in-form sprite`, r.ok, `body=${r.w}x${r.h} action=${r.action}`); }

  // ── NORMALS render + connect ──
  section("Normals (reused electric-shot pose) render + connect");
  for (const a of ["light", "heavy", "up", "air", "down_air"]) { const r = await poseIsSprite(a); check(`${a} → sprite`, r.ok, `body=${r.w}x${r.h}`); }
  for (const [name, key] of Object.entries({ light: "j", heavy: "k", up: "i" })) {
    await settle(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); await waitFrames(2);
    const hb = (await p2()).health; await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(22);
    check(`${name} connects`, (await p2()).health < hb, `Δ=${hb - (await p2()).health}`);
  }

  // ── SPECIAL: Absorb/Redirect reactive counter ──
  section("Special — Energy Absorption counter (absorb → redirect)");
  await settle(); { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 100); await waitFrames(2); }
  { const preHP = (await p1()).health, preEn = (await p1()).energy, p2b = (await p2()).health;
    await startWatch("feedback");
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    await page.evaluate(() => window.__harness.p2Attack());
    let low = preHP, gained = false;
    for (let i = 0; i < 26; i++) { const f = await p1(); if (f.energy > preEn) gained = true; low = Math.min(low, f.health); await waitFrames(1); }
    check("absorb negates the incoming hit", low >= preHP, `hp ${preHP}→${low}`);
    check("absorb refunds energy", gained, "");
    check("redirect projectile spawns", await stopWatch(), "");
    check("redirect connects on attacker", (await p2()).health < p2b, `Δ=${p2b - (await p2()).health}`); }

  // ── SPECIAL: Down proactive discharge ──
  section("Special — Down Energy Discharge (proactive orb)");
  await settle(); { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 150); await waitFrames(2); }
  { const p2b = (await p2()).health; await startWatch("feedback");
    await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s");
    for (let i = 0; i < 20; i++) await waitFrames(1);
    check("discharge orb spawns", await stopWatch(), "");
    check("discharge connects", (await p2()).health < p2b, `Δ=${p2b - (await p2()).health}`); }

  // ── ULTIMATE: Overload ──
  section("Ultimate — Overload");
  await settle(); { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 90); await waitFrames(2); }
  { const e = (await p1()).energy, h = (await p2()).health; let pose = null; await startWatch("overload");
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    for (let i = 0; i < 34; i++) { const ri = await info(); if (ri?.action === "fbUlt") pose = "fbUlt"; await waitFrames(1); }
    check("Overload fires (energy spent)", (e - (await p1()).energy) > 50, `Δ=${(e - (await p1()).energy).toFixed(0)}`);
    check("Overload uses fbUlt cast pose", pose === "fbUlt", `pose=${pose}`);
    check("Overload orb stream spawns", await stopWatch(), "");
    check("Overload deals ultimate-tier damage", (h - (await p2()).health) > 90, `−${(h - (await p2()).health).toFixed(0)}`); }

  // ── TRANSFORM OUT / ISOLATION ──
  section("Transform out + form isolation");
  const xf = await setForm("xlr8");
  check("transforms OUT to XLR8 cleanly", xf.activeAlien === "xlr8" && (await p1()).maxHealth === 900, `active=${xf.activeAlien} hp=${(await p1()).maxHealth}`);
  const hf = await setForm("human");
  check("reverts to Ben-human cleanly", hf.transformed === false, `transformed=${hf.transformed}`);
  // Absorb must NOT leak to another form: stamp a window, transform to xlr8, confirm xlr8 takes damage.
  await setForm("feedback"); await settle();
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // open absorb window
  await setForm("xlr8");   // transform away mid-window
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); await waitFrames(2);
    const hb = (await p1()).health; await page.evaluate(() => window.__harness.p2Attack()); await waitFrames(18);
    check("absorb window does NOT leak to XLR8 (takes damage)", (await p1()).health < hb, `hp ${hb}→${(await p1()).health}`); }

  // ── LOADOUT SELECTABILITY ──
  section("Loadout selectability");
  const L = await page.evaluate(() => window.__harness.benLoadout());
  check("Feedback is art-backed", (L.artBacked || []).includes("feedback"), `artBacked=[${(L.artBacked || []).join(",")}]`);
  check("Feedback appears in the Omnitrix picker", (L.picker || []).includes("feedback"), `picker=[${(L.picker || []).join(",")}]`);
  const sel = await page.evaluate(() => window.__harness.benLoadout(["xlr8", "diamondhead", "feedback"]));
  check("Feedback selectable into a live loadout", (sel.aliens || []).includes("feedback"), `loadout=[${(sel.aliens || []).join(",")}]`);

  section("sweep");
  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");

} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  FEEDBACK CANONICAL: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
