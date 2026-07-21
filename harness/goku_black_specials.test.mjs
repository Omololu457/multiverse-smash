// harness/goku_black_specials.test.mjs
// ---------------------------------------------------------------------------
// Stage 3a — Kamehameha (QCF) + Spirit Bomb (QCB), charge-then-release specials.
// Real in-game verification with screenshots, in BOTH base and SSJ Rose forms:
//   • fires (motion-gated) + spends the right energy + spawns a projectile
//   • the caster CHARGE→RELEASE pose uses the FORM-CORRECT art (base vs Rose sheet)
//   • the beam connects for damage
// Shots → harness/shots/GBSPEC_*.png
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 150, y: 150, width: 460, height: 470 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(REPO, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const sheet = s => (s.spriteSheet || "");
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && (p._spriteCastTimer || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});
async function setup(gap = 210) { await page.evaluate(() => { window.__harness.healP1(); window.__harness.clearProjectiles?.(); }); await actionable(); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await wf(2); }
// QCF/QCB motion roll then Special (round4.test.mjs pattern). facing right: D=s, F=d(right), B=a(left).
async function roll(dirKey) {
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  await page.keyboard.down("s"); await wf(2); await page.keyboard.up("s");
  await page.keyboard.down(dirKey); await wf(2); await page.keyboard.up(dirKey);
  await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
}
async function toRose() { await page.evaluate(() => window.__harness.setEnergy(200)); await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p"); await wf(28); }

async function verifyCast({ label, dirKey, castSheet, projName, cost, fireAt, shot }) {
  await setup(210);
  await page.evaluate(() => window.__harness.setEnergy(160));
  const e0 = (await p1()).energy;
  const before = (await projs()).length;
  await roll(dirKey);
  await wf(2);
  const cast = await p1();
  check(`${label}: caster CHARGE pose uses ${castSheet}`, cast.action === projName && sheet(cast).includes(castSheet), `action=${cast.action} sheet=${cast.spriteSheet}`);
  // tolerance 4: in SSJ Rose the continuous per-frame drain also ticks during this ~8-frame window
  check(`${label}: spends ~${cost} energy`, Math.abs((e0 - cast.energy) - cost) < 4, `energy ${e0.toFixed(0)} → ${cast.energy.toFixed(1)} (−${(e0 - cast.energy).toFixed(1)})`);
  await page.screenshot({ path: path.join(OUT, shot), clip: CLIP });
  // POLL for the beam to appear (the fast Kamehameha travels/hits within a few frames of release)
  const spawned = await page.waitForFunction(pn => window.__harness.projectiles().some(p => p.name === pn), projName, { timeout: 2500, polling: 8 }).then(() => true).catch(() => false);
  check(`${label}: releases a ${projName} projectile`, spawned, `polled projectiles`);
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  await actionable();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  // ── BASE FORM ──────────────────────────────────────────────────────────────
  section("BASE FORM — Kamehameha (QCF) + Spirit Bomb (QCB)");
  await verifyCast({ label: "base Kamehameha", dirKey: "d", castSheet: "black_goku_kamehameha", projName: "gbKamehameha", cost: 30, fireAt: 24, shot: "GBSPEC_kame_base.png" });
  await verifyCast({ label: "base Spirit Bomb", dirKey: "a", castSheet: "black_goku_spirit_bomb", projName: "gbSpiritBomb", cost: 40, fireAt: 20, shot: "GBSPEC_bomb_base.png" });

  // damage check (base Kamehameha into a close dummy)
  section("BASE — Kamehameha connects for damage");
  {
    await setup(150); await page.evaluate(() => window.__harness.setEnergy(160));
    const hp0 = (await p2()).health;
    await roll("d");
    await wf(40);
    const hp1 = (await p2()).health;
    check("base Kamehameha beam deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await actionable();
  }

  // ── SSJ ROSE FORM — same specials, Rose art ─────────────────────────────────
  section("SSJ ROSE FORM — Kamehameha + Spirit Bomb use ROSE art");
  await setup(210); await toRose();
  check("transformed to SSJ Rose", (await p1()).currentForm === "ssjRose");
  await verifyCast({ label: "Rose Kamehameha", dirKey: "d", castSheet: "goku_black_ssj_rose_kamehameha", projName: "gbKamehameha", cost: 30, fireAt: 24, shot: "GBSPEC_kame_rose.png" });
  // stay in Rose for the second cast
  if ((await p1()).currentForm !== "ssjRose") await toRose();
  await verifyCast({ label: "Rose Spirit Bomb", dirKey: "a", castSheet: "goku_black_ssj_rose_spirit_bomb", projName: "gbSpiritBomb", cost: 40, fireAt: 20, shot: "GBSPEC_bomb_rose.png" });

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n  Goku Black STAGE 3a (Kamehameha + Spirit Bomb): ${PASS} passed, ${FAIL} failed\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
