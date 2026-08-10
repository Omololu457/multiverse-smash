// harness/ben10_stage4.test.mjs
// BEN 10 — STAGE 4: per-form Ultimates (ULT button = "u").
//   Ben-human:   Omnitrix Transformation — FREEZE CINEMATIC + guaranteed burst shockwave
//   XLR8:        Sonic Blitz — committed high-damage blitz dash
//   Diamondhead: Crystal Storm — field of marching ground eruptions
//   node harness/ben10_stage4.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const f = path.join(ROOT, u === "/" ? "/index.html" : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Set();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const info = () => page.evaluate(() => window.__harness.renderInfo("p1"));
const cine = () => page.evaluate(() => window.__harness.ben10UltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setForm = (k) => page.evaluate(key => window.__harness.benForm(key), k);
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function prep(gap) { await settle(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  // ── BEN-HUMAN — Omnitrix Transformation freeze cinematic ─────────────
  section("Ben-human — Omnitrix Transformation (freeze cinematic + guaranteed burst)");
  await setForm("human"); await prep(150);
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
  let uc = await cine();
  check("cinematic active, caster=ben10, p1-slot", uc.active && uc.casterKey === "ben10" && uc.casterSide === "p1", `active=${uc.active} caster=${uc.casterKey} side=${uc.casterSide}`);
  check("LIVE p1 spent ~90 energy", e0 - (await p1()).energy >= 80, `Δ=${(e0 - (await p1()).energy).toFixed(0)}`);
  await waitFrames(20); uc = await cine();
  check("BUILDUP phase — not struck, opponent undamaged yet", uc.phase === "buildup" && !uc.struck && (await p2()).health === hp0, `phase=${uc.phase} struck=${uc.struck}`);
  await page.waitForFunction(() => { const s = window.__harness.ben10UltCine(); return !s.active || s.struck; }, null, { timeout: 8000, polling: 16 });
  uc = await cine();
  check("burst lands at the impact beat (not premature)", uc.frame >= uc.impactFrame, `frame=${uc.frame} impact=${uc.impactFrame}`);
  await page.waitForFunction(() => window.__harness.ben10UltCine().active === false, null, { timeout: 8000, polling: 16 });
  check("Omnitrix burst big guaranteed damage (~192 = 320×0.60)", hp0 - (await p2()).health > 180, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  const bx = (await p1()).x; await page.keyboard.down("d"); await waitFrames(10); await page.keyboard.up("d");
  check("control returns to live p1 after cinematic", Math.abs((await p1()).x - bx) > 1, "");

  // ── XLR8 — Sonic Blitz ───────────────────────────────────────────────
  section("XLR8 — Sonic Blitz (blitz dash)");
  await setForm("xlr8"); await prep(52);
  { const e = (await p1()).energy, h = (await p2()).health;
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    for (let i = 0; i < 16; i++) { const ri = await info(); if (ri?.action) seen.add(ri.action); await waitFrames(1); }
    check("XLR8 Sonic Blitz fires (energy spent)", (e - (await p1()).energy) > 40, `Δ=${(e - (await p1()).energy).toFixed(0)}`);
    check("XLR8 Sonic Blitz uses xlUlt pose", seen.has("xlUlt"), "");
    check("XLR8 Sonic Blitz deals big damage", (h - (await p2()).health) > 140, `−${(h - (await p2()).health).toFixed(0)}`); }

  // ── DIAMONDHEAD — Crystal Storm ──────────────────────────────────────
  section("Diamondhead — Crystal Storm (marching eruptions)");
  await setForm("diamondhead"); await prep(90);
  { const e = (await p1()).energy, h = (await p2()).health; let erupt = 0;
    await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
    for (let i = 0; i < 30; i++) { const ri = await info(); if (ri?.action) seen.add(ri.action); const ps = await projs(); if (ps.some(p => (p.name || "").includes("eruption"))) erupt++; await waitFrames(1); }
    check("DH Crystal Storm fires (energy spent)", (e - (await p1()).energy) > 50, `Δ=${(e - (await p1()).energy).toFixed(0)}`);
    check("DH Crystal Storm uses dhUlt cast pose", seen.has("dhUlt"), "");
    check("DH Crystal Storm spawns eruption field", erupt > 0, `erupt frames=${erupt}`);
    check("DH Crystal Storm deals damage", (h - (await p2()).health) > 40, `−${(h - (await p2()).health).toFixed(0)}`); }

  section("sweep");
  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");
  console.log(`  actions seen: ${[...seen].join(", ")}`);

} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN 10 STAGE 4: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
