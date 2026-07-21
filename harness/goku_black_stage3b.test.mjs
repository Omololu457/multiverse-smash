// harness/goku_black_stage3b.test.mjs
// ---------------------------------------------------------------------------
// Stage 3b — Explosion (neutral Special) + Sword Slash (Rose-only Ultimate).
// Real in-game verification with screenshots:
//  EXPLOSION (L, no motion, both forms): proximity-gated AOE, costs 120, NO self-harm,
//    whiffs when the opponent is out of range (Rick Self-Destruct mirror). Procedural blast.
//  SWORD SLASH (U, ROSE-only): a full FREEZE CINEMATIC (gokuBlackSwordCinematic.js) — energy-gated,
//    GUARANTEED range-independent hit + 30f paralysis at the STRIKE connect beat. Disabled in base
//    form. Voice cue goku-black-taste-my-blade.mp3. (Freeze/framing/audio depth → sword_cinematic test.)
// Shots → harness/shots/GB3B_*.png
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 120, y: 140, width: 500, height: 480 };
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
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});
async function place(gap) { await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2?.(); window.__harness.clearProjectiles?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); }); await actionable(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await wf(2); }
async function toRose() {   // IDEMPOTENT — no-op if already Rose (a P-tap while transformed would REVERT it)
  if ((await p1()).currentForm === "ssjRose") return;
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p");
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
}
async function toBase() {   // revert to base by draining energy to 0 (auto-revert)
  if ((await p1()).currentForm !== "ssjRose") return;
  await page.evaluate(() => window.__harness.setEnergy(0));
  await page.waitForFunction(() => window.__harness.p1().currentForm !== "ssjRose", null, { timeout: 4000, polling: 16 }).catch(() => {});
  await wf(2);
}
async function pressL() { await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l"); }
async function pressU() { await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  // ── EXPLOSION (base form) ───────────────────────────────────────────────────
  section("EXPLOSION (neutral L) — proximity AOE, cost 120, NO self-harm");
  {
    await place(60);   // opponent in range
    await page.evaluate(() => window.__harness.setEnergy(160));
    const e0 = (await p1()).energy, hp0 = (await p2()).health, self0 = (await p1()).health;
    await pressL();
    const e1 = (await p1()).energy;
    check("Explosion costs ~120 energy", Math.abs((e0 - e1) - 120) < 2, `energy ${e0.toFixed(0)} → ${e1.toFixed(0)}`);
    check("spawns a procedural blast (gbExplosion, visualOnly)", (await projs()).some(p => p.name === "gbExplosion"), `projs=[${(await projs()).map(p => p.name).join(",")}]`);
    await page.screenshot({ path: path.join(OUT, "GB3B_explosion.png"), clip: CLIP });
    await wf(4);
    const hp1 = (await p2()).health, self1 = (await p1()).health;
    check("in-range opponent takes damage", hp1 < hp0, `p2 hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    check("NO self-harm (caster health unchanged)", self1 === self0, `p1 hp ${self0} → ${self1}`);
    await actionable();
  }
  {
    // proximity gate — out of range → no damage
    await place(600);   // far
    await page.evaluate(() => window.__harness.setEnergy(160));
    const hp0 = (await p2()).health;
    await pressL(); await wf(6);
    check("out-of-range opponent takes NO damage (proximity gate)", (await p2()).health === hp0, `p2 hp ${hp0} → ${(await p2()).health}`);
    await actionable();
  }

  // ── EXPLOSION (SSJ Rose) — stronger ─────────────────────────────────────────
  section("EXPLOSION (Rose) — works transformed, +25% damage");
  {
    await place(60); await toRose();
    await page.evaluate(() => window.__harness.setEnergy(160));
    const hp0 = (await p2()).health;
    await pressL(); await wf(4);
    check("Rose Explosion damages the in-range opponent", (await p2()).health < hp0, `p2 hp ${hp0} → ${(await p2()).health} (−${(hp0 - (await p2()).health).toFixed(0)})`);
    await actionable();
  }

  // ── SWORD SLASH — disabled in BASE form ─────────────────────────────────────
  section("SWORD SLASH (U) — DISABLED in base form (Rose-only art)");
  {
    await place(80); await toBase();   // ensure BASE form (prior section left him in Rose)
    await page.evaluate(() => window.__harness.setEnergy(200));   // energy is NOT the gate here — form is
    const hp0 = (await p2()).health;
    await pressU(); await wf(50);
    const s = await p1();
    check("base-form U does NOT cast Sword Slash", (s.spriteSheet || "").indexOf("sword_slahs") < 0 && (await p2()).health === hp0, `sheet=${s.spriteSheet} p2 unharmed=${(await p2()).health === hp0}`);
    await actionable();
  }

  // ── SWORD SLASH (Rose) — full freeze CINEMATIC → guaranteed hit + paralysis ──
  // (Deep cinematic behaviour — freeze both fighters, both-in-frame, audio beat, phase timing —
  //  is verified in goku_black_sword_cinematic.test.mjs. Here: it triggers + lands its payoff.)
  section("SWORD SLASH (Rose) — freeze cinematic → guaranteed range-independent hit + paralysis");
  {
    await place(200); await toRose();          // FAR opponent → proves the hit is range-independent (sure-hit)
    await page.evaluate(() => { window.__harness.resetUlt?.(); });   // clear ult cd; refills energy
    const e0 = (await p1()).energy, hp0 = (await p2()).health;
    await pressU();
    const eCast = (await p1()).energy;
    check("Sword Slash costs ~40 energy (at cast)", Math.abs((e0 - eCast) - 40) < 4, `energy ${e0.toFixed(0)} → ${eCast.toFixed(1)}`);
    await wf(3);
    const cine = await page.evaluate(() => window.__harness.swordCine());
    check("Sword Slash triggers the freeze cinematic", cine.active === true, `active=${cine.active} phase=${cine.phase} total=${cine.total}`);
    const wind = await p1();
    check("caster plays the Rose sword-slash pose", (wind.spriteSheet || "").includes("goku_black_ssj_rose_sword_slahs"), `sheet=${wind.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB3B_swordslash.png"), clip: CLIP });
    // let the whole cinematic resolve
    await page.waitForFunction(() => { const c = window.__harness.swordCine(); return c && !c.active; }, null, { timeout: 9000, polling: 16 });
    const d2 = await p2();
    check("GUARANTEED hit lands on the FAR opponent (sure-hit, range-independent)", d2.health < hp0, `p2 hp ${hp0} → ${d2.health} (−${(hp0 - d2.health).toFixed(0)})`);
    check("paralysis applied (stun/hitstun on opponent once combat resumes)", (d2.hitstun || 0) > 0 || (d2.stun || 0) > 0, `hitstun=${d2.hitstun} stun=${d2.stun}`);
    await actionable();
  }

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n  Goku Black STAGE 3b (Explosion + Sword Slash): ${PASS} passed, ${FAIL} failed\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
