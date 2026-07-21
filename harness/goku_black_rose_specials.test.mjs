// ─────────────────────────────────────────────────────────────────────────────
// Goku Black STAGE 3c — SSJ-ROSE-EXCLUSIVE slash specials.
// Three NEW moves on the SPECIAL button, each on its own motion, ALL gated on SSJ Rose:
//   B→F  ELECTRIC KI PUSH  (goku_black_ssj_rose_electric_ki_push + _effect) — spacing/repel
//   D→U  ELECTRIC SLASH    (goku_black_ssj_rose_electric_slash)             — fast mid-tier poke
//   U→D  SUPER KI SLASH     (goku_black_ssj_rose_super_ki_slash)            — strongest slash
// Verifies: fires ONLY while transformed; does NOTHING (whiff, no energy) in base form; each
// connects for its intended damage; Electric Ki Push repels far (high knockback, low damage).
// Real in-game screenshots (not slice overlays), per this character's history.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 150, y: 150, width: 460, height: 470 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(REPO, u === "/" ? "/index.html" : u);
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
    res.end(d);
  });
});
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

// Fresh dummy each cast: heal both, clear projectiles + any lingering i-frames, reset the motion buffer,
// re-seat the dummy at `gap`, top P1 back to full (Rose drains every frame). Keeps casts uncontaminated.
async function place(gap) {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2?.(); window.__harness.clearProjectiles?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetFighterInput?.("p1"); });
  await actionable();
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await wf(2);
}
const topup = () => page.evaluate(() => window.__harness.setEnergy(200));

// Idempotent SSJ Rose transform (frozen cinematic → wait for resolve + post-cinematic settle).
async function toRose() {
  if ((await p1()).currentForm === "ssjRose") return;
  await topup();
  await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p");
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
}
// Revert by draining energy to 0 (instant auto-revert).
async function toBase() {
  if ((await p1()).currentForm !== "ssjRose") return;
  await page.evaluate(() => window.__harness.setEnergy(0));
  await page.waitForFunction(() => window.__harness.p1().currentForm !== "ssjRose", null, { timeout: 4000, polling: 16 }).catch(() => {});
  await wf(2);
}

// Perform a directional MOTION then tap Special (l). facing right: D=s, F=d, B=a, U=w.
async function castMotion(dirKeys) {
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  for (const k of dirKeys) { await page.keyboard.down(k); await wf(2); await page.keyboard.up(k); }
  await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
}

// Fire a Rose special, prove the caster pose swapped to its Rose sheet, prove the projectile spawned,
// then let it connect and return the damage / pushback measured on the dummy.
async function fireRose({ label, motion, castAction, castSheetFrag, projName, projSheetFrag, cost, gap, shot }) {
  await place(gap); await topup();
  const e0 = (await p1()).energy;
  const before = await p2();
  // In-page rAF watcher: record {name, sheet} the instant this projectile appears, synced to the game
  // loop. Robust vs an external poll — Electric Ki Push spawns close and HITS/despawns within a few
  // frames (well before its lifetime), a window a screenshot-delayed poll can miss under full-suite load.
  await page.evaluate(pn => {
    window.__projSeen = null;
    const watch = () => {
      const q = (window.__harness.projectiles() || []).find(p => p.name === pn);
      if (q && !window.__projSeen) window.__projSeen = { name: q.name, sheet: q.sheet };
      window.__projWatch = requestAnimationFrame(watch);
    };
    window.__projWatch = requestAnimationFrame(watch);
  }, projName);
  await castMotion(motion);
  // Caster CHARGE pose + energy — read IMMEDIATELY (pose is up on the Special press). Keeps Rose
  // per-frame drain out of the cost measurement.
  const cast = await p1();
  await page.screenshot({ path: path.join(OUT, shot), clip: CLIP });
  check(`${label}: caster pose = ${castAction} (Rose sheet ${castSheetFrag})`, cast.action === castAction && sheet(cast).includes(castSheetFrag), `action=${cast.action} sheet=${cast.spriteSheet}`);
  check(`${label}: spends ~${cost} energy`, Math.abs((e0 - cast.energy) - cost) < 5, `energy ${e0.toFixed(0)} → ${cast.energy.toFixed(1)} (−${(e0 - cast.energy).toFixed(1)})`);
  // let it travel + connect (the watcher keeps recording across these frames)
  await wf(34);
  const proj = await page.evaluate(() => { if (window.__projWatch) cancelAnimationFrame(window.__projWatch); return window.__projSeen; });
  check(`${label}: releases the ${projName} projectile`, !!proj, proj ? `sheet=${proj.sheet || "(procedural)"}` : "not found");
  if (projSheetFrag) check(`${label}: projectile uses the ${projSheetFrag} FX sheet`, !!proj && (proj.sheet || "").includes(projSheetFrag), proj ? `sheet=${proj.sheet}` : "");
  const after = await p2();
  const dmg = before.health - after.health;
  const push = after.x - before.x;
  return { dmg, push, before, after };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  // ── TRANSFORMED — all 3 Rose specials fire and connect ────────────────────
  section("SSJ ROSE — the 3 Rose-exclusive slash specials");
  await toRose();
  check("transformed into SSJ Rose", (await p1()).currentForm === "ssjRose", `form=${(await p1()).currentForm}`);

  const push = await fireRose({ label: "Electric Ki Push (B→F)", motion: ["a", "d"], castAction: "gbElectricKiPush", castSheetFrag: "electric_ki_push", projName: "gbElectricPush", projSheetFrag: "electric_ki_push_effect", cost: 15, gap: 100, shot: "GBROSE3C_electric_ki_push.png" });
  check("Electric Ki Push: connects (deals damage)", push.dmg > 0, `p2 hp −${push.dmg.toFixed(0)}`);
  check("Electric Ki Push: LOW damage (spacing tool, < 40)", push.dmg > 0 && push.dmg < 40, `−${push.dmg.toFixed(0)}`);
  check("Electric Ki Push: HIGH knockback (repels the opponent far, > 25px)", push.push > 25, `pushback +${push.push.toFixed(0)}px`);

  const eslash = await fireRose({ label: "Electric Slash (F→D)", motion: ["d", "s"], castAction: "gbElectricSlash", castSheetFrag: "electric_slash", projName: "gbElectricSlash", projSheetFrag: null, cost: 20, gap: 150, shot: "GBROSE3C_electric_slash.png" });
  check("Electric Slash: connects for mid damage (40–70)", eslash.dmg >= 40 && eslash.dmg <= 70, `−${eslash.dmg.toFixed(0)}`);

  const superk = await fireRose({ label: "Super Ki Slash (B→D)", motion: ["a", "s"], castAction: "gbSuperKiSlash", castSheetFrag: "super_ki_slash", projName: "gbSuperKiSlash", projSheetFrag: null, cost: 48, gap: 150, shot: "GBROSE3C_super_ki_slash.png" });
  check("Super Ki Slash: connects for HIGH damage (> 70)", superk.dmg > 70, `−${superk.dmg.toFixed(0)}`);

  // ── relative balance: strongest slash > mid slash; push repels harder than it hurts ──
  section("balance ordering");
  check("Super Ki Slash hits harder than Electric Slash", superk.dmg > eslash.dmg, `super −${superk.dmg.toFixed(0)} vs elec −${eslash.dmg.toFixed(0)}`);
  check("Electric Slash hits harder than Electric Ki Push", eslash.dmg > push.dmg, `elec −${eslash.dmg.toFixed(0)} vs push −${push.dmg.toFixed(0)}`);
  check("Electric Ki Push repels farther than Electric Slash", push.push > eslash.push, `push +${push.push.toFixed(0)}px vs elec +${eslash.push.toFixed(0)}px`);

  // ── BASE FORM — the same motions must do NOTHING (no base art) ─────────────
  section("BASE FORM — the 3 Rose motions must fall through to NOTHING");
  await toBase();
  check("reverted to base form", (await p1()).currentForm !== "ssjRose", `form=${(await p1()).currentForm}`);

  for (const { label, motion, projName, shot } of [
    { label: "base B→F (Electric Ki Push)", motion: ["a", "d"], projName: "gbElectricPush",  shot: "GBROSE3C_base_bf.png" },
    { label: "base F→D (Electric Slash)",   motion: ["d", "s"], projName: "gbElectricSlash", shot: "GBROSE3C_base_fd.png" },
    { label: "base B→D (Super Ki Slash)",   motion: ["a", "s"], projName: "gbSuperKiSlash",  shot: "GBROSE3C_base_bd.png" }
  ]) {
    await place(150); await topup();
    const e0 = (await p1()).energy;
    const before = await p2();
    await castMotion(motion);
    await wf(20);
    const p1a = await p1(); const p2a = await p2();
    const spawned = (await projs()).some(p => p.name === projName);
    await page.screenshot({ path: path.join(OUT, shot), clip: CLIP });
    check(`${label}: spawns NO projectile`, !spawned, spawned ? "projectile appeared!" : "none");
    // whiff = nothing spent. Base form doesn't drain; passive regen can only ADD a hair → energy ≈ e0.
    check(`${label}: spends NO energy (whiff, no accidental Explosion)`, (e0 - p1a.energy) < 3, `energy ${e0.toFixed(0)} → ${p1a.energy.toFixed(1)}`);
    check(`${label}: opponent takes no damage`, p2a.health >= before.health - 0.5, `p2 hp ${before.health.toFixed(0)} → ${p2a.health.toFixed(0)}`);
    check(`${label}: does not swap to the move's Rose caster pose`, !(sheet(p1a).includes("electric") || sheet(p1a).includes("super_ki")), `sheet=${p1a.spriteSheet}`);
  }

  // ── NEUTRAL Explosion still works in base form (regression on the neutral gate) ──
  section("neutral Explosion still fires (base form, no motion)");
  await place(120); await topup();
  const eBoom0 = (await p1()).energy;
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
  await wf(4);
  const eBoom1 = (await p1()).energy;
  check("neutral Special still fires Explosion (~120 energy)", Math.abs((eBoom0 - eBoom1) - 120) < 3, `energy ${eBoom0.toFixed(0)} → ${eBoom1.toFixed(0)}`);
  check("Explosion projectile present", (await projs()).some(p => p.name === "gbExplosion"), `projs=[${(await projs()).map(p => p.name).join(",")}]`);

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku Black STAGE 3c (SSJ Rose slash specials): ${PASS} passed, ${FAIL} failed`);
  console.log(`  screenshots → harness/shots/GBROSE3C_*.png`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
