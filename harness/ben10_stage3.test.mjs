// harness/ben10_stage3.test.mjs
// BEN 10 — STAGE 3: per-form specials (SPECIAL button = "l", direction via held key).
//   XLR8:        neutral Dash Strike (lunge) · Fwd Sonic Rush (launcher)
//   Diamondhead: neutral Shard Barrage (projectile) · Down Rising Diamonds (ground eruption)
//   Ben-human:   neutral Hoverboard Dash (mobility+strike) · Down Hoverboard Bash (launcher)
// Proves each fires (energy spent), the projectile specials spawn a projectile, the dash
// specials move the fighter forward, and the launchers pop the dummy up. Drives real inputs.
//   node harness/ben10_stage3.test.mjs
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setForm = (k) => page.evaluate(key => window.__harness.benForm(key), k);
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function prep(gap = 60) { await settle(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }
// Fire the SPECIAL with an optional held direction ("d"=forward, "s"=down). Records the action seen
// during the cast/active window. Returns { moved, energySpent, launched, proj, act }.
async function fireSpecial(dir = null) {
  const before = await p1(); const p2b = await p2();
  if (dir) { await page.keyboard.down(dir); await waitFrames(1); }
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  let act = null, proj = false, projName = null;
  for (let i = 0; i < 14; i++) {
    const ri = await info(); if (ri?.action) { seen.add(ri.action); act = ri.action; }
    const ps = await projs(); const hit = ps.find(p => (p.name || "").includes("diamond"));
    if (hit) { proj = true; projName = hit.name; }
    await waitFrames(1);
  }
  if (dir) await page.keyboard.up(dir);
  const after = await p1(); const p2a = await p2();
  return {
    energySpent: (before.energy - after.energy) > 0.5,
    moved: Math.abs(after.x - before.x) > 14,
    launched: (p2a.vy || 0) < -1 || (p2a.health < p2b.health),
    hurtDummy: p2a.health < p2b.health,
    proj, projName, act,
  };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  // ── XLR8 ────────────────────────────────────────────────────────────
  section("XLR8 — Dash Strike (neutral) + Sonic Rush (forward)");
  await settle(); await setForm("xlr8"); await prep(64);
  { const r = await fireSpecial(null);
    check("XLR8 Dash Strike fires (energy spent)", r.energySpent, `act=${r.act}`);
    check("XLR8 Dash Strike lunges forward", r.moved, `moved=${r.moved}`);
    check("XLR8 Dash Strike uses xlDash pose", seen.has("xlDash"), `act=${r.act}`); }
  await settle(); await setForm("xlr8"); await prep(58);
  { const r = await fireSpecial("d");
    check("XLR8 Sonic Rush fires (energy spent)", r.energySpent, "");
    check("XLR8 Sonic Rush uses xlRush pose", seen.has("xlRush"), `act=${r.act}`);
    check("XLR8 Sonic Rush connects/launches", r.launched || r.hurtDummy, `launched=${r.launched} hurt=${r.hurtDummy}`); }

  // ── DIAMONDHEAD ─────────────────────────────────────────────────────
  section("Diamondhead — Shard Barrage (projectile) + Rising Diamonds (ground eruption)");
  await settle(); await setForm("diamondhead"); await prep(120);
  { const r = await fireSpecial(null);
    check("DH Shard Barrage fires (energy spent)", r.energySpent, "");
    check("DH Shard Barrage plays dhShoot cast", seen.has("dhShoot"), `act=${r.act}`);
    check("DH Shard Barrage spawns a projectile", r.proj, `proj=${r.projName}`); }
  await settle(); await setForm("diamondhead"); await prep(80);
  { const r = await fireSpecial("s");
    check("DH Rising Diamonds fires (energy spent)", r.energySpent, "");
    check("DH Rising Diamonds plays dhRising cast", seen.has("dhRising"), `act=${r.act}`);
    check("DH Rising Diamonds spawns ground hitbox", r.proj, `proj=${r.projName}`); }

  // ── BEN (human) ─────────────────────────────────────────────────────
  section("Ben-human — Hoverboard Dash (neutral) + Hoverboard Bash (down)");
  await settle(); await setForm("human"); await prep(70);
  { const r = await fireSpecial(null);
    check("Ben Hoverboard Dash fires (energy spent)", r.energySpent, "");
    check("Ben Hoverboard Dash lunges forward", r.moved, `moved=${r.moved}`);
    check("Ben Hoverboard uses benHover pose", seen.has("benHover"), `act=${r.act}`); }
  await settle(); await setForm("human"); await prep(58);
  { const r = await fireSpecial("s");
    check("Ben Hoverboard Bash fires (energy spent)", r.energySpent, "");
    check("Ben Hoverboard Bash connects/launches", r.launched || r.hurtDummy, `launched=${r.launched} hurt=${r.hurtDummy}`); }

  section("sweep");
  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");
  console.log(`  actions seen: ${[...seen].join(", ")}`);

} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN 10 STAGE 3: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
