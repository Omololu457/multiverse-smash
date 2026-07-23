// harness/naruto.test.mjs
// ─────────────────────────────────────────────────────────────────────────────
// NARUTO — SHADOW CLONE COMBO SYSTEM verification (live-browser harness).
// Drives the REAL game (?harness=1&p1=naruto) and asserts each confirmed clone-combo
// route CONNECTS in a live match — full sequence, correct hit/consume behaviour, and
// the contextual gates that distinguish the new moves from the existing ones.
//
// Routes covered (see abilities.js executeNarutoSpecial + summons.js):
//   EXISTING (verify-only):
//     R1  Pincer Rendan   — B→U + Special, ≥2 clones → two LAUNCHER hits (juggle starter)
//     R2  Clone Rendan Storm — basic light string with clones out → extra flurry hits (extender)
//     R3  Rasengan Barrage — neutral Special, ≥2 clones → anchor + guaranteed clone orbs
//   NEW (this task):
//     R4  Clone Uzumaki Barrage — Down+Special, CONTEXTUAL (opponent in hitstun + ≥2 clones)
//         → hard-knockdown FINISHER; OUTSIDE a combo the SAME input stays Dark Rasengan
//     R5  Clone Rush / Kage Assault — F→F + Special (below shroud 3), ≥1 clone →
//         each clone sent on ONE autonomous rush-strike then despawns (setplay)
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
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
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const info  = (n, d = "") => console.log(`  ℹ️  ${n}${d ? `  — ${d}` : ""}`);
const section = t => console.log(`\n── ${t} ──────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cloneCount = () => page.evaluate(() => window.__harness.p1CloneCount());
const summonsOf = (id) => page.evaluate(k => window.__harness.summons().filter(s => s.id === k), id);
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));

async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }

// Boot into a live Naruto-vs-dummy battle.
await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(30);

// Reset to an actionable, adjacent-to-dummy state (energy full, dummy healed & at `gap`).
async function prep(gap = 55) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

// Stage EXACTLY n clones deterministically via the harness hook (the live "," hotkey delays
// its first spawn ~2.5s, leaving a pending body that races the clone-count gates). This spawns
// them immediately through the same summons.js path the game uses, with nothing pending.
async function spawnClones(n) {
  const c = await page.evaluate(k => window.__harness.spawnP1Clones(k), n);
  await waitFrames(2);
  return c >= n;
}

// ══════════════════════════════════════════════════════════════════════════════
section("R1. Pincer Rendan (B→U + Special, ≥2 clones) — LAUNCHER / juggle starter");
await prep();
{
  const staged = await spawnClones(2);
  check("staged ≥2 clones for Pincer", staged, `count=${await cloneCount()}`);
  const before = await p2();
  await tap("a", 1); await tap("w", 1); await tap("l");   // B, U, Special
  const launched = await page.waitForFunction(() => { const q = window.__harness.p2(); return (q.vy || 0) < -3 || q.grounded === false; }, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  await waitFrames(14);
  const after = await p2();
  const consumed = (await cloneCount()) === 0;
  check("Pincer LAUNCHED the opponent (upward pop)", launched, `vy=${after.vy?.toFixed?.(2)} grounded=${after.grounded}`);
  check("Pincer dealt combo damage", after.health < before.health, `Δhp=${(before.health - after.health).toFixed(0)}`);
  check("Pincer consumed both clones", consumed, `count=${await cloneCount()}`);
}

// ══════════════════════════════════════════════════════════════════════════════
section("R2. Clone Rendan Storm (basic light string with clones) — EXTENDER");
// Proven by DAMAGE DELTA: the flurry orbs spawn overlapping the target and resolve the same
// frame (too transient to catch by polling), so instead we compare the SAME 4-light string
// with vs without clones — the clone version must deal materially more (the piled-on hits).
async function lightStringDamage() {
  const before = (await p2()).health;
  for (let i = 0; i < 4; i++) { await tap("j", 2); await waitFrames(4); }
  await waitFrames(6);
  return before - (await p2()).health;
}
{
  // Baseline: no clones.
  await prep(32);
  await page.evaluate(() => window.__harness.dispelP1Clones());
  const bare = await lightStringDamage();
  // With 2 clones the string piles on the flurry.
  await prep(32);
  const staged = await spawnClones(2);
  check("staged ≥2 clones for Rendan Storm", staged, `count=${await cloneCount()}`);
  const withClones = await lightStringDamage();
  check("Rendan Storm adds flurry damage on top of the bare string", withClones > bare + 15, `bare=${bare.toFixed(0)} withClones=${withClones.toFixed(0)}`);
  check("Rendan Storm did NOT consume clones (string extender)", (await cloneCount()) >= 2, `count=${await cloneCount()}`);
}

// ══════════════════════════════════════════════════════════════════════════════
section("R3. Rasengan Barrage (neutral Special, ≥2 clones) — guaranteed multi-hit");
await prep();
{
  const staged = await spawnClones(2);
  check("staged ≥2 clones for Barrage", staged, `count=${await cloneCount()}`);
  const before = await p2();
  await tap("l"); await waitFrames(20);         // neutral Special → anchor orb + 2 guaranteed clone orbs
  const after = await p2();
  check("Barrage dealt multi-hit damage", before.health - after.health > 60, `Δhp=${(before.health - after.health).toFixed(0)}`);
  check("Barrage consumed both clones", (await cloneCount()) === 0, `count=${await cloneCount()}`);
}

// ══════════════════════════════════════════════════════════════════════════════
section("R4. Clone Uzumaki Barrage FINISHER (Down+Special, opponent in hitstun + ≥2 clones)");
await prep();
{
  const staged = await spawnClones(2);
  check("staged ≥2 clones for Finisher", staged, `count=${await cloneCount()}`);
  await page.evaluate(() => window.__harness.fillEnergy());
  await page.evaluate(() => window.__harness.hurtP2(40));   // opponent mid-combo (in hitstun) → contextual gate opens
  const before = await p2();
  await tap("s", 1); await tap("l");                        // Down + Special
  // the final clone lands the SLAM (knockbackX 8 / knockbackY +7 = down+away) — catch it mid-window
  const slam = await page.waitForFunction(() => { const q = window.__harness.p2(); return (q.vy || 0) > 3 || Math.abs(q.vx || 0) > 2; }, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  await waitFrames(24);
  const after = await p2();
  check("Finisher consumed the clones (combo capper)", (await cloneCount()) === 0, `count=${await cloneCount()}`);
  check("Finisher dealt damage", after.health < before.health, `Δhp=${(before.health - after.health).toFixed(0)}`);
  check("Finisher CAPS with a hard slam (down+away knockback)", slam, `slam knockback observed`);
}

section("R4b. Same input OUTSIDE a combo stays DARK RASENGAN (contextual gate — negative case)");
await prep();
{
  const staged = await spawnClones(2);
  check("staged ≥2 clones for the negative case", staged, `count=${await cloneCount()}`);
  await page.evaluate(() => window.__harness.fillEnergy());
  const energyBefore = (await p1()).energy;
  // p2 NOT in hitstun (prep healed it) → Down+Special must fall through to Dark Rasengan.
  await tap("s", 1); await tap("l"); await waitFrames(10);
  const energyAfter = (await p1()).energy;
  check("no hitstun → clones NOT consumed (finisher did NOT fire)", (await cloneCount()) >= 2, `count=${await cloneCount()}`);
  check("no hitstun → Dark Rasengan fired instead (spent ~45 energy)", energyBefore - energyAfter >= 40, `Δenergy=${(energyBefore - energyAfter).toFixed(0)}`);
}

// ══════════════════════════════════════════════════════════════════════════════
section("R5. Clone Rush / Kage Assault (F→F + Special, ≥1 clone) — SETPLAY autonomous rush");
await prep();
{
  const staged = await spawnClones(2);
  check("staged ≥2 clones for Clone Rush", staged, `count=${await cloneCount()}`);
  const before = await p2();
  await tap("d", 1); await tap("d", 1); await tap("l"); await waitFrames(4);   // F, F, Special
  const rushers = await summonsOf("narutoCloneRush");
  check("Clone Rush spawned autonomous rusher summons", rushers.length >= 1, `rushers=${rushers.length}`);
  check("Clone Rush consumed the placed clones", (await cloneCount()) === 0, `count=${await cloneCount()}`);
  // Let the rushers travel in and strike (reactable, unlike the instant barrage).
  await waitFrames(70);
  const after = await p2();
  const anyHit = await page.evaluate(() => window.__harness.summons().filter(s => s.id === "narutoCloneRush").some(s => s.hasHit)) ||
                 (before.health - after.health) > 0;
  check("a rushing clone autonomously connected", anyHit, `Δhp=${(before.health - after.health).toFixed(0)}`);
}

// ── summary ──────────────────────────────────────────────────────────────────
console.log(`\n${FAIL === 0 ? "✅" : "❌"} naruto clone-combo routes: ${PASS} passed, ${FAIL} failed`);
await browser.close();
server.close();
process.exit(FAIL === 0 ? 0 : 1);
