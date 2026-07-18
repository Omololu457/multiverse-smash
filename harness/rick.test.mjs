// harness/rick.test.mjs
// ---------------------------------------------------------------------------
// Rick Sanchez — full first-pass build verification (real Chromium, real code path).
//   • sprite gate (Rick renders as sprites, not a procedural box)
//   • basic normals connect + damage: light (J), heavy (K), up (I), air (J in air)
//   • Meeseeks Box (neutral special L): spawns, runs, connects — NO simultaneous cap
//   • Rocket (Up + Special: W then L): launches Rick up AND spawns a path-damage rocket
//   • Portal-Behind (double-tap toward opponent): repositions behind, like the others
//   • Self-Destruct ultimate (U): proximity AOE damage, NO self-damage, near-max cost,
//     whiffs when the opponent is out of range
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv" };
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
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

async function waitFrames(n) {
  const s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}
async function waitGrounded() {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
}
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const summons = () => page.evaluate(() => window.__harness.summons());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());

// Place the dummy just in front of Rick and heal it, so each move starts from a clean adjacent state.
async function setupAdjacent(gap = 58) {
  await waitGrounded();
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=rick`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── SPRITE GATE ─────────────────────────────────────────────────────────
  section("sprite gate — Rick renders as sprites (not a procedural box)");
  {
    const a = await p1();
    check("P1 is Rick", a.key === "rick", `key=${a.key}`);
    check("idle sprite is ready (spritesheets.js gate)", a.spriteReady, `sheet=${a.spriteSheet}`);
    check("idle sheet is rick_stand.png", (a.spriteSheet || "").includes("rick_stand"), `sheet=${a.spriteSheet}`);
    check("spriteScale applied (skins.js gate) ≈ 1.7", Math.abs((a.spriteScale || 0) - 1.7) < 0.01, `spriteScale=${a.spriteScale}`);
    check("Rick has the ZONER-tier energy pool (160)", a.maxEnergy === 160, `maxEnergy=${a.maxEnergy}`);
    await page.screenshot({ path: path.join(OUT, "RK_idle.png") });
  }

  // ── GROUND BASICS: light (J), heavy (K), up (I) ─────────────────────────
  section("GROUND basics — connect + damage");
  for (const [name, key, gap] of [["light (J)", "j", 46], ["heavy (K)", "k", 46], ["up-attack (I)", "i", 40]]) {
    await setupAdjacent(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(6); await page.keyboard.up(key);
    await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`${name} connects and deals damage`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(16);
  }

  // ── AIR basic: neutral air (J while airborne) ───────────────────────────
  section("AIR basic — neutral air (J in air)");
  await setupAdjacent(44);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(38));
    await page.keyboard.down("j"); await waitFrames(3); await page.keyboard.up("j");
    const mv = await p1();
    check("air attack STARTS", mv.attacking, `attacking=${mv.attacking}`);
    await waitFrames(14);
    const hp1 = (await p2()).health;
    check("air attack deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── MEESEEKS BOX — neutral special (L). Spawns / runs / connects, NO cap ─
  section("MEESEEKS BOX — neutral special (L): spawn, no cap, connect");
  await setupAdjacent(520);   // dummy FAR so both Meeseeks are still travelling when we count them
  await waitFrames(8);
  {
    const e0 = (await p1()).energy;
    // First throw
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    await waitFrames(3);
    let s = await summons();
    const mees1 = s.filter(x => x.id === "meeseeks");
    check("neutral special spawns a Meeseeks (subtype summon)", mees1.length === 1, `meeseeks=${mees1.length}`);
    check("Meeseeks costs Bullshit Science Energy", (await p1()).energy < e0, `energy ${e0} → ${(await p1()).energy.toFixed(0)}`);
    await page.screenshot({ path: path.join(OUT, "RK_meeseeks1.png") });

    // Second throw after recovery → TWO active at once (no cap, no one-at-a-time limit)
    await waitFrames(24);
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    await waitFrames(20);   // past the 2nd Meeseeks' 16-frame spawn beat so it's running too
    s = await summons();
    const mees2 = s.filter(x => x.id === "meeseeks");
    check("SECOND Meeseeks coexists with the first (NO cap)", mees2.length >= 2, `meeseeks active=${mees2.length}`);
    check("Meeseeks run in a straight line (past spawn beat, vx≠0)", mees2.every(x => Math.abs(x.vx) > 0), `vx=[${mees2.map(x => x.vx.toFixed(1)).join(",")}]`);
    await page.screenshot({ path: path.join(OUT, "RK_meeseeks2.png") });

    // Let them rush the full distance + connect
    const hp0 = (await p2()).health;
    await waitFrames(80);
    const hp1 = (await p2()).health;
    check("Meeseeks connects for damage on the opponent", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }

  // ── ROCKET — Up + Special (W then L): launch + path damage ───────────────
  section("ROCKET — Up + Special (W then L): launches Rick AND damages the path");
  // The rocket's "path" is VERTICAL (it rises with Rick). Put the dummy up IN that rising column,
  // roughly at Rick's cast altitude, so the rocket sweeps through it. (A grounded dummy sits below
  // the launch and is correctly missed — the rocket rises away from the floor.)
  await setupAdjacent(8);
  await waitFrames(4);
  {
    await page.evaluate(() => window.__harness.liftP2(175));   // raise the dummy into the rocket's rising column
    const before = await p1();
    const hp0 = (await p2()).health;
    // W feeds "U" into directionHistory (up == jump key); L reads it → Rocket.
    await page.keyboard.down("w"); await page.keyboard.down("l");
    await waitFrames(2);
    await page.keyboard.up("l"); await page.keyboard.up("w");
    await waitFrames(1);
    const after = await p1();
    check("Rocket LAUNCHES Rick upward (vy negative)", after.vy < -6, `vy=${after.vy.toFixed(1)}`);
    const proj = await projectiles();
    check("Rocket spawns a path-damage projectile", proj.some(p => p.name === "rocket"), `projectiles=${JSON.stringify(proj.map(p => p.name))}`);
    const rk = proj.find(p => p.name === "rocket");
    check("Rocket travels upward (vy<0)", !!rk && rk.vy < 0, rk ? `vy=${rk.vy.toFixed(1)}` : "");
    await page.screenshot({ path: path.join(OUT, "RK_rocket.png") });
    // Poll every frame — the rocket rises fast, so any contact is brief.
    let dmg = false;
    for (let i = 0; i < 22 && !dmg; i++) {
      if ((await p2()).health < hp0) dmg = true;
      await waitFrames(1);
    }
    check("Rocket damages an opponent caught in its (vertical) path", dmg, `hp0=${hp0} → ${(await p2()).health}`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── PORTAL-BEHIND — double-tap toward opponent (shared teleport) ─────────
  section("PORTAL-BEHIND — double-tap toward opponent repositions behind (like Gojo/Sasuke)");
  {
    await waitGrounded();
    // Put the dummy clearly to Rick's RIGHT so "toward" = d, and a blink lands Rick past it.
    const a0 = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), a0.x + 220);
    await waitFrames(2);
    const t = await p2();
    const before = await p1();
    // double-tap d (toward) within DOUBLE_TAP_TIME
    await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.up("d");
    await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.up("d");
    await waitFrames(3);
    const after = await p1();
    // Shared teleport (teleportBehindTarget): an INSTANT reposition adjacent to the opponent —
    // identical mechanic to Gojo/Sasuke. Assert the instant jump (impossible by walking) + adjacency.
    const jump = Math.abs(after.x - before.x);
    check("Portal-Behind INSTANTLY repositions Rick next to the opponent (shared teleport)", jump > 100 && Math.abs(after.x - t.x) < (after.w + 40), `rick ${before.x.toFixed(0)}→${after.x.toFixed(0)} (Δ${jump.toFixed(0)}), opp≈${t.x.toFixed(0)}`);
    check("Portal-Behind plays the portal-travel visual", (after.action === "portalTravel") || (after.spriteSheet || "").includes("portal_attack_travel"), `action=${after.action} sheet=${after.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "RK_portal.png") });
  }
  await waitFrames(20);

  // ── SELF-DESTRUCT ULTIMATE (U) — proximity AOE, no self-damage, near-max cost
  section("SELF-DESTRUCT ultimate (U) — proximity AOE, no self-damage, near-max cost");
  // (a) CLOSE: connects, near-max cost, Rick unharmed
  await setupAdjacent(60);
  await waitFrames(6);
  {
    const b = await p1();
    const hp0 = (await p2()).health;
    check("Rick starts at full Bullshit Science Energy", b.energy >= 159, `energy=${b.energy}`);
    await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
    await waitFrames(4);
    const a = await p1();
    const hp1 = (await p2()).health;
    check("ultimate connects (AOE damages a nearby opponent)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    check("Rick takes NO self-damage from his own blast", a.health >= b.health, `rick hp ${b.health} → ${a.health}`);
    check("ultimate costs near-max meter (~140)", (b.energy - a.energy) >= 130, `spent ${(b.energy - a.energy).toFixed(0)}`);
    const proj = await projectiles();
    check("blast FX spawns (visualOnly, no double-damage)", proj.some(p => p.name === "selfDestructBlast" && p.visualOnly), `projectiles=${JSON.stringify(proj.map(p => p.name))}`);
    await page.screenshot({ path: path.join(OUT, "RK_selfdestruct.png") });
  }
  await waitFrames(30);

  // (b) FAR: proximity-gated — whiffs entirely when the opponent is out of range
  section("SELF-DESTRUCT — proximity gate: whiffs when opponent is far");
  {
    await waitGrounded();
    const a0 = await p1();
    // Move the dummy far out of the 220px blast radius, clear the ult cooldown from (a), refill meter.
    await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.resetUlt?.(); }, a0.x + 520);
    await waitFrames(4);
    const hp0 = (await p2()).health;
    await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
    await waitFrames(6);
    const hp1 = (await p2()).health;
    check("far opponent takes NO damage (proximity-gated)", hp1 === hp0, `hp ${hp0} → ${hp1}`);
  }

  // ── PORTAL-PULL — QCF (D→F) + Special: yank opponent adjacent + fall-impact ──
  section("PORTAL-PULL — QCF+Special yanks the opponent next to Rick + fall-impact damage");
  {
    await waitGrounded();
    await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.healP2?.(); window.__harness.resetUlt?.(); });
    await waitFrames(6);
    const a0 = await p1();
    // Opponent FAR to Rick's RIGHT (so d=Forward, a=Back) — a real long-range yank.
    await page.evaluate(x => window.__harness.setP2X(x), a0.x + 600);
    await waitFrames(6);
    const hp0 = (await p2()).health;
    // QCF motion: down (s) → forward (d) → special (l).
    await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");
    await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d");
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    await waitFrames(2);
    const rick = await p1();
    const opp  = await p2();
    // Reposition adjacent to Rick — impossible from 600px away by any normal move.
    check("Portal-Pull yanks the opponent next to Rick",
      opp.x > rick.x - 40 && opp.x < rick.x + rick.w + 140,
      `rickx=${rick.x.toFixed(0)} oppx=${opp.x.toFixed(0)} Δ=${(opp.x - rick.x).toFixed(0)}`);
    check("opponent reappears ABOVE the spot (airborne, pending drop)", !opp.grounded && opp.portalDrop,
      `grounded=${opp.grounded} portalDrop=${opp.portalDrop}`);
    await page.screenshot({ path: path.join(OUT, "RK_portal_pull.png") });
    // Fall + land → impact damage.
    await page.waitForFunction(h => { const q = window.__harness.p2(); return q.grounded && !q.portalDrop && q.health < h; }, hp0, { timeout: 5000, polling: 16 }).catch(() => {});
    const hp1 = (await p2()).health;
    // Damage is applied DIRECTLY (unscaled — the ult/summon convention), and the dummy
    // isn't blocking, so the delta must equal the exact raw value: 42 effective.
    check("Portal-Pull deals its exact effective fall-impact damage (42)", Math.round(hp0 - hp1) === 42, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }

  // ── PORTAL-PUSH — QCB (D→B) + Special: banish to far edge + fall-impact, in-bounds ──
  section("PORTAL-PUSH — QCB+Special banishes the opponent to the far edge (in-bounds) + fall-impact");
  {
    await waitGrounded(); await waitFrames(20);   // let Pull's target fully settle
    await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.healP2?.(); });
    const a0 = await p1();
    // Dummy CLOSE to Rick's right, so a push is a real long-distance banish.
    await page.evaluate(x => window.__harness.setP2X(x), a0.x + 120);
    await waitFrames(6);
    const arena = await page.evaluate(() => window.__harness.arena());
    const hp0   = (await p2()).health;
    // QCB motion: down (s) → back (a) → special (l).
    await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");
    await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.up("a");
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    await waitFrames(2);
    const rick = await p1();
    const opp  = await p2();
    const rightEdge = arena.left + arena.width;
    // The push TARGETS the FARTHER stage edge (max distance respecting bounds), then
    // the always-on clampToCamera keeps the opponent inside the visible frame — so the
    // realised distance is camera-limited (correct/safe: Push never shoves someone
    // off-screen). Assert the max-distance DIRECTION: they're driven toward whichever
    // stage edge is farther from Rick, by a displacement far beyond any knockback.
    const stageMid = arena.left + arena.width / 2;
    const rickCx   = rick.x + rick.w / 2;
    const pushedTowardRight = rickCx < stageMid;   // the farther edge is the right one
    check("Portal-Push drives the opponent toward the farther stage edge (max-distance direction)",
      pushedTowardRight ? opp.x > rick.x + 200 : opp.x < rick.x - 200,
      `oppx=${opp.x.toFixed(0)} rickx=${rick.x.toFixed(0)} farEdge=${pushedTowardRight ? "right" : "left"}`);
    // ...and STILL fully on the playable stage (Push can't throw them off-stage).
    check("Portal-Push respects stage bounds (opponent stays on-stage)",
      opp.x >= arena.left - 1 && (opp.x + opp.w) <= rightEdge + 1,
      `oppx=${opp.x.toFixed(0)} w=${opp.w} bounds=[${arena.left},${rightEdge.toFixed(0)}]`);
    check("Portal-Push actually banished them far from Rick",
      Math.abs(opp.x - rick.x) > 400, `dist=${Math.abs(opp.x - rick.x).toFixed(0)}`);
    await page.screenshot({ path: path.join(OUT, "RK_portal_push.png") });
    await page.waitForFunction(h => { const q = window.__harness.p2(); return q.grounded && !q.portalDrop && q.health < h; }, hp0, { timeout: 5000, polling: 16 }).catch(() => {});
    const hp1 = (await p2()).health;
    // Unscaled direct damage, dummy not blocking → exact raw: 65 effective (a modest
    // committal premium over Rocket's 57, deliberately the hardest special).
    check("Portal-Push deals its exact effective fall-impact damage (65)", Math.round(hp0 - hp1) === 65, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "RK_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
