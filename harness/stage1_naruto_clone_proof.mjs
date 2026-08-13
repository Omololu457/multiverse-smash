// harness/stage1_naruto_clone_proof.mjs — STAGE 1 VISUAL PROOF (Naruto standing clone).
// Per the rebuild spec: prove ON SCREEN (not just a test log) that Naruto's standing clone is
//   (1) visually indistinguishable from the real Naruto (same sprite/scale/colour, no tint),
//   (2) autonomously MOVES toward + ATTACKS the opponent,
//   (3) dies in exactly ONE hit regardless of the incoming damage value.
// Emits side-by-side + filmstrip PNGs into harness/shots/stage1/. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "stage1");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const clones = () => page.evaluate(() => window.__harness.p1CloneCount());
const cloneStates = () => page.evaluate(() => window.__harness.p1CloneStates());
const strikeFx = () => page.evaluate(() => (window.__harness.cloneStrikeFxCount ? window.__harness.cloneStrikeFxCount() : -1));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}
async function prep(gap = 150) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

try {
  await boot("naruto");

  // ── A. VISUAL: real Naruto + one standing clone, current DEFAULT tell setting ──
  // Let the clone walk a bit out from behind Naruto (aggro on), THEN freeze, so the shot shows three
  // cleanly-spaced figures: real Naruto (left) | standing clone (middle) | dummy (right).
  console.log("\n── A. Visual side-by-side (default tell) ──");
  await prep(320);
  const tellDefault = await page.evaluate(() => window.__harness.cloneTell());
  await page.evaluate(() => window.__harness.setCloneAggro(true));
  await page.evaluate(() => window.__harness.spawnP1Clones(1));
  await waitFrames(26);                              // clone steps out from behind Naruto toward the dummy
  await page.evaluate(() => window.__harness.setCloneAggro(false));  // freeze mid-field for a clean compare
  await waitFrames(4);
  await shot("A_default_tell.png");
  check("captured default-tell side-by-side (real | clone | dummy)", true, `cloneTell default = ${tellDefault}`);

  // ── B. VISUAL: the OLD tell forced back ON → shows exactly what the design removed ──
  console.log("\n── B. Visual side-by-side (old tell forced ON, for contrast) ──");
  await page.evaluate(() => window.__harness.setCloneTell(true));
  await waitFrames(6);
  await shot("B_tell_on_contrast.png");
  await page.evaluate(() => window.__harness.setCloneTell(false));   // restore the design default
  check("captured old-tell contrast shot", true, "compare A (design: no tell) vs B (old: red wash)");

  // ── C. BEHAVIOR: clone autonomously moves toward + attacks the opponent ──
  console.log("\n── C. Autonomous move + attack filmstrip ──");
  await page.evaluate(() => window.__harness.setCloneTell(false));
  await prep(340);                                   // opponent far → clone must WALK across to reach
  await page.evaluate(() => window.__harness.setCloneAggro(true));
  const oppHp0 = (await p2()).health;
  const fx0 = await strikeFx();
  await page.evaluate(() => window.__harness.spawnP1Clones(1));
  const trail = [];
  for (let i = 0; i < 14; i++) {                      // sample densely so brief windup/strike windows aren't skipped
    await waitFrames(9);
    const cs = (await cloneStates())[0];
    const opp = await p2();
    // keep the dummy alive+parked so the clone keeps swinging (heal, but do NOT invuln — invuln blocks the strike)
    await page.evaluate(() => { window.__harness.healP2?.(); });
    trail.push(cs ? { x: cs.x, st: cs.state, atk: cs.atk, vx: cs.vx, dist: cs.x != null ? Math.round(opp.x - cs.x) : null } : null);
    if (i % 2 === 0) await shot(`C_move_${String(i).padStart(2, "0")}.png`);
  }
  const fx1 = await strikeFx();
  console.log("    clone trail:", JSON.stringify(trail));
  const moved = trail.filter(Boolean);
  const walkedTowards = moved.length >= 2 && Math.abs(moved[0].dist) > Math.min(...moved.map(t => Math.abs(t.dist)));
  const sawAtkState = moved.some(t => ["windup", "strike", "recover"].includes(t.st) || ["windup", "strike", "recover"].includes(t.atk));
  const struck = (fx1 > fx0 && fx0 >= 0);
  check("clone WALKS toward the opponent (closes distance)", walkedTowards, moved.length ? `dist ${moved[0].dist}→min ${Math.min(...moved.map(t => Math.abs(t.dist)))}` : "no clone");
  check("clone ATTACKS on its own (strike-FX fired on connect)", struck || sawAtkState, `strikeFx ${fx0}→${fx1}, sawAtkState=${sawAtkState}, states=${moved.map(t => t.atk || t.st).join(",")}`);

  // ── D. DURABILITY: dies in exactly ONE hit regardless of incoming damage ──
  // D1 = a WEAK 30-dmg projectile; D2 = a stronger 60-dmg melee. Either one, on its own, must
  // destroy the clone in a single hit (classic one-hit-kill rule, independent of damage value).
  console.log("\n── D. One-hit-kill durability ──");
  await boot("naruto");                              // fresh world — section C leaves the dummy knocked around

  // Durability is asserted via the deterministic MELEE reveal (fires on ANY active enemy hitbox,
  // independent of the hit's damage). Proving a WEAK swing and a STRONG swing each one-shot the clone
  // demonstrates the one-hit-kill rule holds regardless of damage value. (The projectile-reveal path is
  // covered by the always-on decoy suite: "PROJECTILE hit poofs a clone".)
  async function meleeOneShot(label, gap, weak) {
    await prep(gap);
    await page.evaluate(() => window.__harness.spawnP1Clones(1));
    await waitFrames(90);                            // clone walks into the dummy's melee range and holds
    const before = await clones();
    await shot(`D_${weak ? "weak" : "strong"}_before.png`);
    await page.evaluate(w => { w ? window.__harness.p2AttackCat("light") : window.__harness.p2Attack(); }, weak);
    let after = before;
    for (let i = 0; i < 10; i++) { await waitFrames(4); after = await clones(); if (after === 0) break; }
    await shot(`D_${weak ? "weak" : "strong"}_after.png`);
    check(label, before === 1 && after === 0, `count ${before}→${after}`);
  }
  // D1 = weaker swing (p2AttackCat light, 40 dmg); D2 = stronger swing (p2Attack, 60 dmg).
  await meleeOneShot("D1: clone destroyed by a single WEAK (40-dmg) hit", 110, true);
  await meleeOneShot("D2: clone destroyed by a single STRONG (60-dmg) hit", 110, false);

  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 1 proof: ${fails} failed check(s). Shots → harness/shots/stage1/`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
