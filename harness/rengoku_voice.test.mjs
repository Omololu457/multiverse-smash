// harness/rengoku_voice.test.mjs — Kyojuro Rengoku voice-line wiring (audio-only).
// Proves: (1) every pool RANDOMIZES + full coverage (all 51 clips across 8 pools); (2) live triggers fire
// (spy on playSfxFile) — intro / Flame-Breathing FORM callout (Charged Flame Strike, shared with the combo
// super-finisher branches) / Total-Concentration COUNTER cast / ultimate ACTIVATION / offense combat-bark /
// hit-react / low-health / win; (3) THE KEY GUARANTEE — the "Ultimate Technique" line (rengoku_039) fires at
// the Flame Explosion ACTIVATION/windup, BEFORE the freeze-cinematic's detonation beat (whiff-proof: fires
// even while the guaranteed detonation damage has NOT yet landed) — NOT overlapping the impact; (4) the
// single-voice-channel no-overlap rule holds when two Rengoku triggers fire in quick succession.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
// active OWNED Rengoku clips currently playing (not paused) — the no-overlap probe.
const activeOwnedRen = () => page.evaluate(() => window.__harness.sfxActive().filter(e => /^rengoku_/.test(e.file) && e.owned && !e.paused).length);
async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = s._sfxSpy || [];
    if (!s._spied) {
      s._spied = true;
      const orig = s.playSfxFile.bind(s);
      s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); };
      s._stopOwnedCalls = 0;
      const origStop = s.stopOwnedSfx.bind(s);
      s.stopOwnedSfx = (owner) => { try { if (owner) s._stopOwnedCalls++; } catch (_) {} return origStop(owner); };
    }
  });
}
const stopOwnedCalls = () => page.evaluate(() => window.__harness.__sound._stopOwnedCalls || 0);
const resetStopOwned = () => page.evaluate(() => { window.__harness.__sound._stopOwnedCalls = 0; });
async function ready(gap = 46) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetUlt?.(); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  // wait for p2 to also settle to the ground (a prior ultimate/heavy can launch him airborne — a
  // whiffed follow-up connect would flake otherwise), then snap him to the requested gap.
  await page.waitForFunction(() => { const p = window.__harness.p2(); return (p.grounded ?? true) && Math.abs(p.vy || 0) < 0.5 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const inPool = (log, pool) => log.some(f => pool.includes(f));
const pool = name => page.evaluate(p => window.__harness.rengokuVoicePool(p), name);

try {
  await page.goto(`${base}/index.html?harness=1&p1=rengoku&p2=rengoku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "formCallout", "concentration", "ultimate", "combatBark", "hitReact", "lowHealth", "win"];
  let totalClips = 0;
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.rengokuVoicePick(pp, 300), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    totalClips += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 51 clips accounted for across the 8 pools", totalClips === 51, `total=${totalClips}`);
  // no clip appears in more than one pool (each file has exactly one home)
  { const seen = {}; let dupe = null;
    for (const p of POOLS) for (const c of await pool(p)) { if (seen[c]) dupe = c; seen[c] = true; }
    check("no clip is double-pooled (each file has one home)", !dupe, dupe ? `dupe=${dupe}` : ""); }

  // ── (2) LIVE: INTRO / battle-start ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), log.filter(f => /^rengoku/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: FLAME BREATHING FORM callout — Charged Flame Strike (CHARGE "p" hold→release).
  //    Shares the `formCallout` pool with the combo super-finisher branches. Whiff-proof: p2 invuln+far so
  //    the callout is unambiguously p1's and fires on CAST regardless of connect. ──
  section("live: FORM callout on Charged Flame Strike (shared super-finisher pool)");
  await ready();
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 300); }
  await clearSfx();
  await page.keyboard.down("p"); await waitFrames(4); await page.keyboard.up("p"); await waitFrames(8);
  { const log = await sfxLog(); const fc = await pool("formCallout");
    check("Charged Flame Strike fires a FORM-callout line", inPool(log, fc), log.filter(f => /^rengoku/.test(f)).join(",")); }
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));

  // ── (2) LIVE: TOTAL CONCENTRATION on COUNTER cast (neutral Special "l") ──
  section("live: concentration on Counter cast (neutral Special)");
  await ready(); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); const cc = await pool("concentration");
    check("Counter cast fires a concentration-pool line", inPool(log, cc), log.filter(f => /^rengoku/.test(f)).join(",")); }

  // ── (2) LIVE: offense combatBark (attacker) + hitReact (defender) via a neutral heavy connect ──
  section("live: combatBark + hitReact (neutral heavy connect)");
  await ready(48); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(14);
  { const log = await sfxLog(); const cb = await pool("combatBark"); const hr = await pool("hitReact");
    check("heavy connect fires a combatBark line (attacker)", inPool(log, cb), log.filter(f => /^rengoku/.test(f)).join(","));
    check("mirror defender fires a hitReact (grunt) line", inPool(log, hr), ""); }

  // ── (2) LIVE: low-health comeback bark (defender crosses 25%) ──
  section("live: low-health bark");
  await ready(48);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth; window.__harness.damageP2(m * 0.72); });  // drop p2 to ~28%
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1"));
  await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(14);
  { const log = await sfxLog(); const lh = await pool("lowHealth"); check("crossing 25% fires a low-health line", inPool(log, lh), log.filter(f => /^rengoku/.test(f)).join(",")); }

  // ── (2)+(3) LIVE: ULTIMATE activation line — the KEY guarantee. Fires at cast/windup, BEFORE the
  //    freeze-cinematic's detonation beat. Whiff-proof: sampled early, while the guaranteed ~340 detonation
  //    damage has NOT yet landed → proves it's the activation beat, not the impact beat. ──
  section("live: ULTIMATE activation line (windup, NOT the detonation/impact beat)");
  await ready();
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.healP2?.(); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); }
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");   // sample at frame ~3 — well before the detonation beat
  const ultPool = await pool("ultimate");
  const logEarly = await sfxLog();
  const dmgEarly = (await p2()).maxHealth - (await p2()).health;
  const cineActiveEarly = await page.evaluate(() => !!(window.__harness.rengokuUltCine && window.__harness.rengokuUltCine().active));
  check("ultimate line fired within ~3f of activation", inPool(logEarly, ultPool), logEarly.filter(f => /^rengoku/.test(f)).join(","));
  check("…at the windup: detonation damage has NOT landed yet", inPool(logEarly, ultPool) && dmgEarly === 0, `dmgEarly=${dmgEarly}`);
  check("…and the freeze-cinematic is active (line rode the activation, not the impact)", cineActiveEarly, `cineActive=${cineActiveEarly}`);
  // let the cinematic run to the detonation beat — confirm damage lands LATER and NO second ult line fires there
  await page.waitForFunction(() => { const p2 = window.__harness.p2(); return (p2.maxHealth - p2.health) > 0; }, null, { timeout: 12000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => !(window.__harness.rengokuUltCine && window.__harness.rengokuUltCine().active), null, { timeout: 12000, polling: 32 }).catch(() => {});
  const logFull = await sfxLog();
  const dmgFull = (await p2()).maxHealth - (await p2()).health;
  const ultCount = logFull.filter(f => ultPool.includes(f)).length;
  check("detonation damage landed AFTER the activation line (~340)", dmgFull > 200, `dmgFull=${dmgFull}`);
  check("exactly ONE ultimate line across the whole ult (no impact-beat double)", ultCount === 1, `ultLines=${ultCount}`);

  // ── WIN voice — validated via the pool-coverage section above (a live win needs a real match-END,
  //    which is fragile to drive in-harness; superman_voice precedent skips the live KO for the same
  //    reason). The wiring is a single WINNER-gated playSfxFile in game.js's round-end block. ──

  // ── (4) NO-OVERLAP: two Rengoku triggers in quick succession → single voice channel ──
  // Charged Flame Strike (owned by p1) then Counter cast (owned by p1) ~0.6s later, while the first clip is
  // still playing. The 2nd owned cue must STOP the 1st (stopOwnedSfx) → never 2 owned Rengoku clips at once.
  // p2 is silenced (invuln + far → both casts whiff, no hit-react) so any owned Rengoku clip is p1's.
  section("no-overlap: back-to-back Rengoku triggers share one voice channel");
  await ready();
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 320); }
  await page.evaluate(() => window.__harness.__sound.stopAllSfx());
  await waitFrames(2);
  await clearSfx(); await resetStopOwned();
  await page.keyboard.down("p"); await waitFrames(4); await page.keyboard.up("p");   // trigger 1: Charged Flame Strike (formCallout)
  await waitFrames(3);
  const ownedAfter1 = await activeOwnedRen();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // trigger 2: Counter (concentration)
  await waitFrames(3);
  const ownedAfter2 = await activeOwnedRen();
  const stops = await stopOwnedCalls();
  const log = await sfxLog();
  const firedTwo = inPool(log, await pool("formCallout")) && inPool(log, await pool("concentration"));
  check("both triggers actually fired (formCallout + concentration)", firedTwo, log.filter(f => /^rengoku/.test(f)).join(","));
  check("never 2 owned Rengoku clips playing at once (sample 1)", ownedAfter1 <= 1, `owned=${ownedAfter1}`);
  check("never 2 owned Rengoku clips playing at once (sample 2)", ownedAfter2 <= 1, `owned=${ownedAfter2}`);
  check("single-voice-channel clear ran between the two lines (stopOwnedSfx)", stops >= 1, `stopOwnedCalls=${stops}`);

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  RENGOKU voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
