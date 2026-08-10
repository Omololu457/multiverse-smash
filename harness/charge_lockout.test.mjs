// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL "charging = fully vulnerable" lockout (shared engine mechanic).
// While fighter.isCharging is true (any hold-to-charge character):
//   • CANNOT move (no walk/jump/dash from input)   — physics.moveFighter canMove gate
//   • CANNOT block (isBlocking forced false)         — updateMovementInput block gate
//   • CANNOT start any normal attack / ultimate      — updatePlayerCombat lockout
//   • CAN still be HIT (real vulnerability) and a hit INTERRUPTS the charge
//   • Releasing the charge button (P) exits INSTANTLY — no added recovery lag
//   • EXCEPTION 1: the Special button is the charge's own RELEASE/FIRE trigger
//     (Naruto's Big Ball Rasengan reads isCharging) → must still fire.
//   • EXCEPTION 2: a projectile launched BEFORE charging keeps flying, unaffected.
// Proven across MULTIPLE characters (naruto, gojo, goku_black) → genuinely universal.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(REPO, u === "/" ? "/index.html" : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
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
const P1 = () => page.evaluate(() => window.__harness.p1());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});
const releaseAll = async () => { for (const k of ["p", "d", "a", "s", "w", "j", "k", "l"]) await page.keyboard.up(k).catch(() => {}); };

async function setup(p1c, p2c) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1c}&p2=${p2c}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2?.(); window.__harness.fillEnergy(); });
  await actionable();
}

// ── UNIVERSAL LOCKOUT — run the full move/block/attack/exit matrix for one char ──
async function universality(char) {
  section(`UNIVERSAL LOCKOUT — ${char}`);
  await setup(char, char);

  // BASELINE (not charging): movement + block both work normally.
  const bx = (await P1()).x;
  await page.keyboard.down("d"); await wf(6);
  const movedFree = (await P1()).x - bx;
  await page.keyboard.up("d"); await wf(2);
  check(`${char}: moves normally when NOT charging`, movedFree > 4, `Δx=${movedFree.toFixed(1)}`);

  await page.keyboard.down(";"); await wf(3);
  const blkFree = (await P1()).blocking;
  await page.keyboard.up(";"); await wf(2);
  check(`${char}: blocks normally when NOT charging`, blkFree === true, `blocking=${blkFree}`);
  await actionable();

  // ENTER CHARGE
  await page.keyboard.down("p"); await wf(3);
  check(`${char}: holding P enters the charging state`, (await P1()).charging === true, `charging=${(await P1()).charging}`);

  // CANNOT MOVE — let residual velocity settle under the lock, then hold a direction.
  await wf(10);
  const cx = (await P1()).x;
  await page.keyboard.down("d"); await wf(10);
  const moving = await P1();
  await page.keyboard.up("d"); await wf(1);
  check(`${char}: CANNOT move while charging`, moving.charging && Math.abs(moving.x - cx) < 2 && Math.abs(moving.vx) < 0.5, `Δx=${Math.abs(moving.x - cx).toFixed(2)} vx=${moving.vx.toFixed(2)}`);

  // CANNOT BLOCK — holding down while charging must NOT raise a guard.
  await page.keyboard.down(";"); await wf(3);
  const blk = await P1();
  await page.keyboard.up(";"); await wf(1);
  check(`${char}: CANNOT block while charging`, blk.charging && blk.blocking === false, `blocking=${blk.blocking}`);

  // CANNOT NORMAL-ATTACK — a light press is swallowed by the lockout.
  await page.keyboard.down("j"); await wf(4);
  const atk = await P1();
  await page.keyboard.up("j"); await wf(1);
  check(`${char}: CANNOT normal-attack (light) while charging`, atk.charging && atk.attacking === false && !atk.currentMove && (atk.attackCooldown || 0) === 0, `attacking=${atk.attacking} move=${atk.currentMove} cd=${atk.attackCooldown}`);

  // INSTANT EXIT — release P; charging clears next frame with no lingering recovery.
  await page.keyboard.up("p"); await wf(1);
  const released = await P1();
  check(`${char}: releasing P exits charging INSTANTLY (next frame)`, released.charging === false, `charging=${released.charging}`);
  const rx = released.x;
  await page.keyboard.down("d"); await wf(4);
  const after = await P1();
  await page.keyboard.up("d"); await wf(2);
  check(`${char}: movement restored immediately after release (no added lag)`, (after.x - rx) > 4, `Δx=${(after.x - rx).toFixed(1)}`);

  await releaseAll();
}

// ── REAL VULNERABILITY — a charging fighter can be struck, and the hit ends the charge ──
async function vulnerability(char) {
  section(`REAL VULNERABILITY — ${char} can be HIT while charging`);
  await setup(char, "sasuke");
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 64); window.__harness.healP1(); window.__harness.healP2?.(); });
  await actionable();

  await page.keyboard.down("p"); await wf(3);
  const pre = await P1();
  check(`${char}: charging & unguarded before the hit`, pre.charging === true && pre.blocking === false, `charging=${pre.charging} blocking=${pre.blocking}`);

  await page.evaluate(() => window.__harness.p2Attack());
  let hit = null;
  for (let i = 0; i < 30; i++) { await wf(1); const s = await P1(); if (s.health < pre.health) { hit = s; break; } }
  check(`${char}: takes REAL damage from the attack while charging`, !!hit && hit.health < pre.health, hit ? `hp ${pre.health}→${hit.health}` : "no damage landed");
  check(`${char}: the hit INTERRUPTS the charge`, !!hit && hit.charging === false, hit ? `charging=${hit.charging}` : "n/a");

  await releaseAll();
}

// ── CHARGE-RELEASE STILL WORKS — Naruto fires his charged special via Special-during-charge ──
async function narutoReleaseStillWorks() {
  section("CHARGE-RELEASE EXCEPTION — Naruto Big Ball Rasengan (Special during charge)");
  await setup("naruto", "sasuke");
  await page.evaluate(() => window.__harness.fillEnergy());
  await actionable();

  await page.keyboard.down("p"); await wf(6);
  check("naruto is charging", (await P1()).charging === true, `charging=${(await P1()).charging}`);
  await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");
  const fired = await P1();
  await releaseAll(); await wf(2);
  check("Special during charge FIRES the Rasengan (release still works)", (fired.attacking || (fired.attackCooldown || 0) > 0 || !!fired.currentMove), `attacking=${fired.attacking} cd=${fired.attackCooldown} move=${fired.currentMove}`);
}

// ── PROJECTILE INDEPENDENCE — a projectile launched before charging keeps flying ──
async function projectileIndependence() {
  section("PROJECTILE INDEPENDENCE — pre-charge projectile is unaffected (Goku Black Kamehameha)");
  await setup("goku_black", "sasuke");
  await page.evaluate(() => window.__harness.fillEnergy());
  await actionable();

  // QCF (facing right): D=s, F=d, then Special=l.
  await page.keyboard.down("s"); await wf(2); await page.keyboard.up("s");
  await page.keyboard.down("d"); await wf(2); await page.keyboard.up("d");
  await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
  const spawned = await page.waitForFunction(() => window.__harness.projectiles().some(p => p.name === "gbKamehameha"), null, { timeout: 3000, polling: 8 }).then(() => true).catch(() => false);
  check("kamehameha projectile launched (BEFORE any charge)", spawned, "");

  await wf(12);
  await page.evaluate(() => window.__harness.setEnergy(10));   // stay below the SSJ-Rose transform threshold on release
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const before = (await projs()).find(p => p.name === "gbKamehameha");

  // START charging AFTER the projectile is airborne.
  await page.keyboard.down("p"); await wf(2);
  check("caster is now charging (locked)", (await P1()).charging === true, `charging=${(await P1()).charging}`);
  const xs = [];
  for (let i = 0; i < 8; i++) { await wf(1); const pr = (await projs()).find(p => p.name === "gbKamehameha"); if (pr) xs.push(pr.x); }
  await releaseAll(); await wf(2);
  const advanced = !!before && xs.length >= 2 && Math.abs(xs[xs.length - 1] - before.x) > 20;
  check("projectile keeps advancing independently while the caster charges", advanced, `x: ${before ? before.x.toFixed(0) : "?"} → [${xs.map(v => v.toFixed(0)).join(",")}]`);
}

try {
  // Universality across characters that use the shared hold-to-charge path.
  await universality("naruto");
  await universality("gojo");
  await vulnerability("naruto");
  await vulnerability("gojo");
  await narutoReleaseStillWorks();
  await projectileIndependence();

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Universal charge-lockout: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
