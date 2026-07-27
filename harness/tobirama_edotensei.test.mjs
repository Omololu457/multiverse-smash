// harness/tobirama_edotensei.test.mjs — CANONICAL Edo Tensei ultimate test (Stage 6).
// Covers: activation cost (all chakra + HP), control handoff to the summoned vessel's full kit,
// the TIMER-driven auto-revert at expiry, the revert restoring Tobirama, and — critically — that
// the swap is NOT a free escape (activation blocked in hitstun; revert grants no i-frames and
// preserves hitstun) and reverts gracefully (no fallback box / hard snap).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitSheet(needle, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function readyTobirama(vessel = "sasuke") {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.setP1Energy?.(200); window.__harness.resetUlt?.(); window.__harness.healP1?.(); });
  await page.evaluate(v => window.__harness.edoBackup.setBackup(v), vessel);
  await waitFrames(2);
}
// Press Ultimate → the summoning CINEMATIC starts (freeze). Skip it to its resolve (the body-swap)
// for speed; a dedicated test lets the cinematic play out with screenshots.
async function activate() {
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(3);
  await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.("p1"); });   // resolve the summon → body-swap; clear the leftover ult-press the real (~3s) cinematic would age out
  await waitFrames(2); return p1();
}
// Fast-forward the active window to expiry (drain the fuel), then resolve the un-summon cinematic.
async function endWindow() {
  await page.evaluate(() => window.__harness.edoBackup.setFuel(0.05));   // near-empty → next drain tick hits 0
  await waitFrames(4);                                                // updateEdoTensei launches the end cinematic
  await page.evaluate(() => window.__harness.edoBackup.skipCine());   // resolve the un-summon → revert
  await waitFrames(2); return p1();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── ACTIVATION + COST ────────────────────────────────────────────────
  section("activation + cost");
  await readyTobirama("sasuke");
  const b = await p1(); const hp0 = b.health, en0 = b.energy;
  const a = await activate();
  check("activates (edoActive)", a.edoActive, `edoActive=${a.edoActive}`);
  check("control → vessel (sasuke)", a.key === "sasuke" && a.edoVessel === "sasuke", `key=${a.key}`);
  check("cost: ALL chakra spent → fresh vessel bar (~full, already draining)", en0 >= 60 && a.energy >= a.maxEnergy - 2 && a.maxEnergy === 190, `en ${en0}→${a.energy}/${a.maxEnergy}`);
  check("cost: ~25% of current HP", a.health < hp0 && Math.abs((hp0 - a.health) - Math.floor(hp0 * 0.25)) <= 2, `hp ${hp0}→${a.health}`);
  check("window fuel = the ENERGY bar (near-full, drains the manageable bar — not a separate meter)", a.edoFuel >= a.maxEnergy - 2 && a.edoFuel <= a.maxEnergy, `fuel=${a.edoFuel} max=${a.maxEnergy}`);
  check("standing Tobirama dummy present", !!a.edoDummy && typeof a.edoDummy.x === "number", `dummy=${JSON.stringify(a.edoDummy)}`);

  // ── ENERGY-DRAIN WINDOW: managed drain of the vessel's ENERGY, not a fixed timer ──
  section("energy-drain window (managed, extendable — not a fixed timer)");
  // (i) the window drains the vessel's ENERGY during normal play
  await page.evaluate(() => window.__harness.setP1Energy?.(60));
  const eBefore = (await p1()).energy;
  await waitFrames(40);
  const idle = await p1();
  check("window drains the vessel's ENERGY during play", idle.energy < eBefore && idle.edoActive, `energy ${eBefore.toFixed(1)}→${idle.energy.toFixed(1)}`);
  // (ii) BUILDING energy EXTENDS the summon: keep topping a near-empty bar → it survives far past the
  //      ~28 frames an unmanaged energy-8 bar (or a fixed timer of that length) would have de-summoned in.
  await page.evaluate(() => window.__harness.setP1Energy?.(8));
  for (let i = 0; i < 6; i++) { await waitFrames(10); await page.evaluate(() => window.__harness.setP1Energy?.(8)); }   // ~60f of active energy-building
  const managed = await p1();
  check("building energy EXTENDS the summon (still active after 60f of topping up)", managed.edoActive && !managed.edoEnding, `edoActive=${managed.edoActive} edoEnding=${managed.edoEnding}`);
  await page.evaluate(() => window.__harness.setP1Energy?.(190));   // refill so the later sections run with a live window

  // ── CONTROL HANDOFF (vessel's full kit is live) ──────────────────────
  section("control handoff");
  await waitGrounded();
  await page.evaluate(() => { const x = window.__harness.p1().x; window.__harness.setP2X(x + 60); window.__harness.healP2?.(); });
  await waitFrames(2);
  const dh0 = (await p2()).health;
  await page.keyboard.down("j"); const mv = await waitSheet("sasuke"); await page.keyboard.up("j"); await waitFrames(18);
  check("vessel normal renders vessel sprite (sasuke_*)", (mv.spriteSheet || "").includes("sasuke"), `sheet=${mv.spriteSheet}`);
  check("vessel normal connects", (await p2()).health < dh0, `Δ=${dh0 - (await p2()).health}`);

  // ── FUEL-DRAIN AUTO-REVERT (fast-forward the window → un-summon cinematic) ──
  section("fuel expiry → auto-revert");
  await waitGrounded();
  const r = await endWindow();   // window lapses → end cinematic launches automatically → revert
  check("auto-reverted at expiry (no input)", !r.edoActive && r.key === "tobirama", `edoActive=${r.edoActive} key=${r.key}`);
  check("kit restored (energyType=chakra, max 200)", r.maxEnergy === 200, `max=${r.maxEnergy}`);
  check("Tobirama spent all chakra (energy ~0, before regen)", r.energy < 5, `energy=${r.energy}`);
  check("shared HP carried through (still damaged)", r.health <= hp0, `hp=${r.health}`);
  // Tobirama's OWN kit works again — Special (neutral) casts Water Dragon. Assert on the CAST POSE
  // (fires instantly) rather than the delayed projectile, so the check isn't a timing race. Re-press
  // if the frame-polled input buffer drops the tap.
  for (const k of ["a", "d", "s", "w", "j", "k", "i", "u", "l"]) await page.keyboard.up(k).catch(() => {});   // release any key held from earlier sections
  await page.evaluate(() => { window.__harness.setP1Energy?.(200); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); });
  await waitGrounded(); await waitFrames(8);   // clean idle + let the reform-pose timer clear
  const pre = await p1();
  let cast = pre;
  for (let tries = 0; tries < 3 && cast.action !== "tobiWaterDragon"; tries++) {
    await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l");
    for (let f = 0; f < 8 && (await p1()).action !== "tobiWaterDragon"; f++) await waitFrames(1);
    cast = await p1();
  }
  check("Tobirama's own kit restored (Water Dragon casts)", cast.action === "tobiWaterDragon", `pre[atkCd=${pre.attackCooldown} hitstun=${pre.hitstun} attacking=${pre.attacking} action=${pre.action}] → cast=${cast.action}`);

  // ── COUNTER-PLAY: hit-on-Tobirama vs hit-on-vessel distinction (the trickiest new part) ──
  section("counter-play (Tobirama-hit cancels; vessel-hit does NOT)");
  for (const k of ["a", "d", "s", "w", "j", "k", "i", "u", "l"]) await page.keyboard.up(k).catch(() => {});   // release anything held from the prior section's casts
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); });
  await waitGrounded(); await waitFrames(8);   // let the prior Water-Dragon cast pose fully clear so the ult press registers
  await readyTobirama("sasuke");
  const ca = await activate();
  check("re-activated for counter-play test", ca.edoActive, `edoActive=${ca.edoActive}`);
  await waitGrounded();
  let dummy = null;
  for (let f = 0; f < 12 && !dummy; f++) { dummy = await page.evaluate(() => window.__harness.edoBackup.dummyRect()); if (!dummy) await waitFrames(1); }

  // Deterministic geometry (independent of where the vessel happened to emerge): `inward` points from the
  // edge-standing Tobirama toward stage-center.
  const inward = dummy.x > 640 ? -1 : 1;

  // (a) NEGATIVE — the brief's tricky case: the SUMMONED CHARACTER stands right NEXT TO Tobirama and takes a
  // hit whose swing overlaps BOTH boxes. Vessel pinned 100px inward of Tobirama; opponent 160px inward, so
  // its swing reaches over the vessel (nearer) AND grazes the dummy (behind). Because it LANDS on the vessel
  // (sets hasHit), the jutsu must NOT cancel.
  await page.evaluate(x => window.__harness.setP1Pos(x, null), dummy.x + inward * 100);
  const beforeVesselHit = await p1();
  let vHit = beforeVesselHit;
  // Retry the swing until it connects (tight geometry + collision-push timing can whiff a single try).
  for (let attempt = 0; attempt < 4 && vHit.health >= beforeVesselHit.health && vHit.edoActive; attempt++) {
    await page.evaluate((x) => { window.__harness.setP1Pos(x, null); }, dummy.x + inward * 100);   // re-pin (knockback/push may nudge)
    await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, dummy.x + inward * 160);
    await waitFrames(1);
    await page.evaluate(() => window.__harness.p2Attack());
    for (let f = 0; f < 22; f++) { await waitFrames(1); vHit = await p1(); if (vHit.health < beforeVesselHit.health || !vHit.edoActive) break; }
  }
  check("hit on the SUMMONED character (beside Tobirama) connects (shared HP drops)", vHit.health < beforeVesselHit.health, `hp ${beforeVesselHit.health}→${vHit.health}`);
  check("hit on the SUMMONED character does NOT cancel the jutsu", vHit.edoActive && !vHit.edoEnding, `edoActive=${vHit.edoActive} edoEnding=${vHit.edoEnding}`);

  // (b) POSITIVE — swing that lands on the STANDING TOBIRAMA cancels immediately (+ damages shared HP).
  await page.evaluate(() => window.__harness.setP1Pos(640, null));   // park the vessel at center, well clear of Tobirama at the edge
  await page.evaluate(dx => { window.__harness.setP2X(dx); window.__harness.healP2?.(); }, dummy.x);   // stand the opponent ON Tobirama
  await waitFrames(1);
  const beforeHit = await p1();
  await page.evaluate(() => window.__harness.p2Attack());   // real active swing over the standing Tobirama
  let hitRes = beforeHit;
  for (let f = 0; f < 30; f++) { await waitFrames(1); hitRes = await p1(); if (hitRes.edoEnding || !hitRes.edoActive) break; }
  check("hit on Tobirama cancels the jutsu (de-summon)", hitRes.edoEnding || !hitRes.edoActive, `edoActive=${hitRes.edoActive} edoEnding=${hitRes.edoEnding}`);
  check("hit on Tobirama damaged the shared HP", hitRes.health < beforeHit.health, `hp ${beforeHit.health}→${hitRes.health}`);
  await page.evaluate(() => window.__harness.edoBackup.skipCine());   // resolve the un-summon cinematic → revert
  await waitFrames(2);
  const afterCancel = await p1();
  check("reverts to Tobirama after the cancel", !afterCancel.edoActive && afterCancel.key === "tobirama", `key=${afterCancel.key}`);
  await page.evaluate(() => window.__harness.healP1?.());

  // ── NON-EXPLOITABLE: activation is blocked during hitstun ────────────
  section("not a free escape");
  await readyTobirama("sasuke");
  await page.evaluate(() => window.__harness.hurtP1(40));   // in hitstun
  await waitFrames(1);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
  const he = await p1();
  check("cannot ACTIVATE during hitstun (no escape-swap)", !he.edoActive && he.key === "tobirama", `edoActive=${he.edoActive}`);
  await page.evaluate(() => window.__harness.healP1?.());

  // ── NON-EXPLOITABLE: revert during hitstun preserves the punish ──────
  await readyTobirama("sasuke");
  await activate();
  await page.evaluate(() => window.__harness.hurtP1(22));   // vessel gets hit — plain hitstun
  await waitFrames(1);
  const midHit = await p1();
  const invBefore = midHit.invulnTimer || 0;
  // Revert the body-swap DIRECTLY (revertEdoTensei) — the same logic the end cinematic runs at its
  // resolve beat, tested without the cinematic's frame-timing noise. This isolates "does the revert
  // itself grant an escape?" from incidental hurt/getup i-frames.
  const rev = await page.evaluate(() => { window.__harness.edoBackup.revert(); return window.__harness.p1(); });
  check("was in hitstun as the vessel", midHit.hitstun > 0, `hitstun=${midHit.hitstun}`);
  check("reverted to Tobirama mid-combo", !rev.edoActive && rev.key === "tobirama", `key=${rev.key}`);
  check("revert added NO i-frames (no free escape)", (rev.invulnTimer || 0) <= invBefore, `invuln before=${invBefore} after=${rev.invulnTimer}`);
  check("hitstun preserved through the revert (still being punished)", rev.hitstun > 0, `hitstun=${rev.hitstun}`);

  // ── GRACEFUL: a clean revert resolves to a real Tobirama sprite (no box) ──
  section("graceful handoff (no fallback box)");
  await page.evaluate(() => window.__harness.healP1?.());
  await readyTobirama("sasuke");
  await activate();
  await waitGrounded();
  const g = await endWindow();
  await page.screenshot({ path: path.join(OUT, "tobirama_edo_reverted.png") });
  check("clean revert shows a real Tobirama sheet (not a 128² box/null)", (g.spriteSheet || "").includes("tobirama"), `action=${g.action} sheet=${g.spriteSheet}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Edo Tensei ultimate: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
