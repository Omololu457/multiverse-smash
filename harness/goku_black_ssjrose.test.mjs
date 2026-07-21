// harness/goku_black_ssjrose.test.mjs
// ---------------------------------------------------------------------------
// Stage 2 — Ki Slash (energy-costing heavy) + SSJ Rose transform.
// Real in-game verification with screenshots:
//   • Ki Slash (K): connects for damage AND costs 10 energy; whiffs when broke
//   • SSJ Rose transform (P-tap) fires ONLY at/near max energy (>=180)
//   • continuous per-frame energy drain while transformed
//   • instant auto-revert the frame energy hits 0
//   • SSJ Rose art (goku_black_ssj_rose_*) actually swaps in (visual + sheet)
// Shots → harness/shots/GBROSE_*.png
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 180, y: 150, width: 380, height: 480 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg" };
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
const grounded = async () => { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5 && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {}); };
async function setup(gap = 50) { await page.keyboard.up("k"); await page.evaluate(() => { window.__harness.healP1(); }); await grounded(); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await wf(2); }
async function ptap() { await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p"); await wf(2); }
const sheet = s => (s.spriteSheet || "");

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await grounded();

  // ── KI SLASH (heavy K) — connects + costs 10 energy ─────────────────────────
  section("KI SLASH (K) — connects, deals damage, costs 10 energy");
  {
    await setup(48);
    await page.evaluate(() => window.__harness.setEnergy(120));
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    await page.keyboard.down("k"); await wf(2);
    const mid = await p1();
    // measure cost right after the deduction (passive regen keeps ticking, so a later read shows net < 10)
    check("Ki Slash costs ~10 energy (deducted at start)", Math.abs((e0 - mid.energy) - 10) < 1.5, `energy ${e0.toFixed(0)} → ${mid.energy.toFixed(1)} (−${(e0 - mid.energy).toFixed(1)})`);
    check("Ki Slash plays black_goku_ki_slash.png", sheet(mid).includes("ki_slash"), `action=${mid.action} sheet=${mid.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GBROSE_kislash.png"), clip: CLIP });
    await page.keyboard.up("k"); await wf(22);
    const hp1 = (await p2()).health;
    check("Ki Slash connects and deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await grounded();
  }
  {
    // broke → no heavy
    await setup(48);
    await page.evaluate(() => window.__harness.setEnergy(5));
    const hp0 = (await p2()).health;
    await page.keyboard.down("k"); await wf(6); await page.keyboard.up("k"); await wf(10);
    const s = await p1(); const hp1 = (await p2()).health;
    check("Ki Slash with < cost energy does NOT come out", s.attacking === false && s.action !== "heavy" && hp1 === hp0, `attacking=${s.attacking} action=${s.action} hp ${hp0}→${hp1}`);
    await grounded();
  }

  // ── SSJ ROSE — threshold-gated activation ───────────────────────────────────
  section("SSJ ROSE — transforms ONLY at/near max energy (>=180)");
  {
    await setup(); await page.evaluate(() => window.__harness.setEnergy(100));
    await ptap();
    const low = await p1();
    check("P-tap at energy 100 does NOT transform", low.currentForm !== "ssjRose" && !low.hasSkinAnim, `form=${low.currentForm} skinAnim=${low.hasSkinAnim}`);
    await page.evaluate(() => window.__harness.setEnergy(200));
    await ptap();
    const hi = await p1();
    check("P-tap at energy 200 TRANSFORMS to SSJ Rose", hi.currentForm === "ssjRose" && hi.hasSkinAnim === true, `form=${hi.currentForm} skinAnim=${hi.hasSkinAnim}`);
    await wf(26);   // let the transform-morph cast pose finish → Rose idle
    const rose = await p1();
    check("SSJ Rose ART swaps in (idle sheet = goku_black_ssj_rose)", sheet(rose).includes("goku_black_ssj_rose"), `action=${rose.action} sheet=${rose.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GBROSE_transformed.png") });
  }

  // ── continuous per-frame drain while transformed ────────────────────────────
  section("SSJ ROSE — continuous per-frame energy drain");
  {
    await page.evaluate(() => window.__harness.setEnergy(180));
    const e0 = (await p1()).energy;
    await wf(30);
    const e1 = (await p1()).energy;
    check("energy DRAINS every frame while transformed (net ~ -0.24/frame)", e1 < e0 - 3, `energy ${e0.toFixed(1)} → ${e1.toFixed(1)} over 30f (−${(e0 - e1).toFixed(1)})`);
    check("still in SSJ Rose (not yet empty)", (await p1()).currentForm === "ssjRose");
  }

  // ── instant auto-revert at zero ─────────────────────────────────────────────
  section("SSJ ROSE — instant auto-revert when energy hits 0");
  {
    await page.evaluate(() => window.__harness.setEnergy(0.5));   // one tick from empty
    await wf(4);
    const rev = await p1();
    check("auto-reverts to base the frame energy hits 0", rev.currentForm !== "ssjRose" && !rev.hasSkinAnim, `form=${rev.currentForm} skinAnim=${rev.hasSkinAnim}`);
    check("base ART restored (idle sheet = black_goku_idle)", sheet(rev).includes("black_goku_idle"), `sheet=${rev.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GBROSE_reverted.png") });
  }

  // ── Rose normals use Rose art ───────────────────────────────────────────────
  section("SSJ ROSE — normals use Rose art variants");
  {
    await setup(50); await page.evaluate(() => window.__harness.setEnergy(200));
    await ptap(); await wf(26);
    check("transformed again", (await p1()).currentForm === "ssjRose");
    await page.keyboard.down("j"); await wf(4);
    const lp = await p1();
    check("Rose LIGHT uses goku_black_ssj_rose_foward_attack", sheet(lp).includes("goku_black_ssj_rose_foward_attack"), `sheet=${lp.spriteSheet}`);
    await page.keyboard.up("j");
    await page.evaluate(() => window.__harness.setEnergy(0));   // clean revert for end
    await wf(3);
  }

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n  Goku Black STAGE 2 (Ki Slash + SSJ Rose): ${PASS} passed, ${FAIL} failed\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
