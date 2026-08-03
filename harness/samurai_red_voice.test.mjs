// harness/samurai_red_voice.test.mjs — Samurai Red Ranger voice-line wiring (audio-only).
// Proves: (1) every pool RANDOMIZES + full coverage (all 29 clips across 9 pools, no double-pooling);
// (2) live triggers fire (spy on playSfxFile) — intro / offense combatBark / hit-react / low-health /
// Flame-Chain finisher (spinSword) / Mega Mode activation / Flame Slash special (fireSmasher) / ultimate;
// (3) THE KEY GUARANTEE — the Mega Mode line fires at the transformation's ACTIVATION beat (before the
// reveal RESOLVES the Mega art), and the ultimate line fires at the cast/windup BEFORE the freeze-
// cinematic's STRIKE beat (before the guaranteed damage lands), each exactly ONCE;
// (4) the single-voice-channel no-overlap rule holds when two Samurai triggers fire in quick succession.
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
const activeOwnedSam = () => page.evaluate(() => window.__harness.sfxActive().filter(e => /^samred_/.test(e.file) && e.owned && !e.paused).length);
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
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetUlt?.(); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  await page.waitForFunction(() => { const p = window.__harness.p2(); return (p.grounded ?? true) && Math.abs(p.vy || 0) < 0.5 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const inPool = (log, pool) => log.some(f => pool.includes(f));
const pool = name => page.evaluate(p => window.__harness.samuraiVoicePool(p), name);

try {
  await page.goto(`${base}/index.html?harness=1&p1=samurai_red_ranger&p2=samurai_red_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "win", "megaMode", "fireSmasher", "spinSword", "ultimate", "combatBark", "hitReact", "lowHealth"];
  let totalClips = 0;
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.samuraiVoicePick(pp, 300), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    totalClips += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 29 clips accounted for across the 9 pools", totalClips === 29, `total=${totalClips}`);
  { const seen = {}; let dupe = null;
    for (const p of POOLS) for (const c of await pool(p)) { if (seen[c]) dupe = c; seen[c] = true; }
    check("no clip is double-pooled (each file has one home)", !dupe, dupe ? `dupe=${dupe}` : ""); }
  // every referenced mp3 exists on disk (exact-filename discipline)
  { let missing = [];
    for (const p of POOLS) for (const c of await pool(p)) if (!fs.existsSync(path.join(ROOT, c))) missing.push(c);
    check("every referenced clip exists on disk", missing.length === 0, missing.slice(0, 3).join(",")); }

  // ── (2) LIVE: INTRO / battle-start ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), log.filter(f => /^samred/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: offense combatBark (attacker) + hitReact (defender) via a neutral HEAVY connect ──
  section("live: combatBark + hitReact (neutral heavy connect)");
  await ready(58); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(14);
  { const log = await sfxLog(); const cb = await pool("combatBark"); const hr = await pool("hitReact");
    check("heavy connect fires the combatBark line (attacker)", inPool(log, cb), log.filter(f => /^samred/.test(f)).join(","));
    check("mirror defender fires a hitReact line", inPool(log, hr), ""); }

  // ── (2) LIVE: Flame-Chain FINISHER cast (spinSword) via Fwd+Heavy → re-tap Heavy ×2 (cancel-on-hit). ──
  // Re-tap during each stage's RECOVERY (opens ~frame 8); hold forward so P1 walks back into range. Same
  // proven drive as the Stage-2 build test (sample frames BETWEEN re-taps, not a fixed pre-tap wait).
  section("live: spinSword on the Flame-Chain finisher (Fwd+Heavy → re-tap ×2)");
  await ready(34); await clearSfx();                              // point-blank so every stage overlaps through knockback
  const stages = new Set();
  const sample = async (n) => { for (let i = 0; i < n; i++) { const a = await p1(); if (a.currentMove) stages.add(a.currentMove); await waitFrames(1); } };
  await page.keyboard.down("d");                                   // hold forward (walk back into range between stages)
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener: samRekka1
  await sample(6);
  // Re-tap Heavy during each stage's recovery; keep going until the finisher casts (each stage only
  // advances on a real connect, and the mirror can drift/guard — so retry a few windows rather than exactly 2).
  for (let i = 0; i < 5 && !stages.has("samRekkaFin"); i++) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await sample(7); }
  await waitFrames(6); await page.keyboard.up("d");
  { const log = await sfxLog(); const ss = await pool("spinSword");
    check("chain reached the finisher (samRekkaFin)", stages.has("samRekkaFin"), `stages=[${[...stages]}]`);
    check("Flame-Chain finisher fires a spinSword line", inPool(log, ss), log.filter(f => /^samred/.test(f)).join(",")); }

  // ── (2) LIVE: low-health bark (defender crosses 25%) ──
  section("live: low-health bark");
  await ready(58);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth; window.__harness.damageP2(m * 0.78); });   // drop p2 to ~22%
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1"));
  await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(14);
  { const log = await sfxLog(); const lh = await pool("lowHealth"); check("crossing 25% fires the low-health line", inPool(log, lh), log.filter(f => /^samred/.test(f)).join(",")); }

  // ── (2)+(3) LIVE: MEGA MODE activation line — fires at ACTIVATION, BEFORE the reveal resolves the art ──
  section("live: MEGA MODE activation line (activation beat, NOT the reveal)");
  await ready();
  await clearSfx();
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");   // charge-release into Mega Mode
  await page.waitForFunction(() => window.__harness.p1().currentForm === "megaMode", null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(2);   // sample DURING the morph — form=megaMode but art not yet resolved
  const megaPool = await pool("megaMode");
  const logMega = await sfxLog();
  const midMorph = await p1();
  check("mega line fired at activation", inPool(logMega, megaPool), logMega.filter(f => /^samred/.test(f)).join(","));
  check("…at the ACTIVATION beat: reveal has NOT resolved the Mega art yet", inPool(logMega, megaPool) && midMorph.currentForm === "megaMode" && !midMorph.hasSkinAnim, `form=${midMorph.currentForm} skinAnim=${midMorph.hasSkinAnim}`);
  // let the morph fully resolve into Mega
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const megaCount = (await sfxLog()).filter(f => megaPool.includes(f)).length;
  check("exactly ONE mega-activation line across the whole transformation", megaCount === 1, `megaLines=${megaCount}`);

  // ── (2) LIVE: Flame Slash SPECIAL cast (fireSmasher) — Mega-exclusive, so we're still transformed ──
  section("live: fireSmasher on Flame Slash (Mega-only special)");
  // The morph locks attackCooldown for its full duration — wait until actionable before the special.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.currentForm === "megaMode" && !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 260); }   // whiff-proof: far dummy
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(8);
  { const log = await sfxLog(); const fs2 = await pool("fireSmasher"); const isMega = (await p1()).currentForm === "megaMode";
    check("still in Mega Mode for the special", isMega, `form=${(await p1()).currentForm}`);
    check("Flame Slash fires a fireSmasher line", inPool(log, fs2), log.filter(f => /^samred/.test(f)).join(",")); }
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));

  // ── (2)+(3) LIVE: ULTIMATE activation line — fires at cast/windup, BEFORE the cinematic STRIKE beat. ──
  section("live: ULTIMATE activation line (windup, NOT the strike/impact beat)");
  await ready();
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.healP2?.(); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); }
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");   // sample ~frame 3 — well before the strike beat
  const ultPool = await pool("ultimate");
  const logEarly = await sfxLog();
  const dmgEarly = (await p2()).maxHealth - (await p2()).health;
  const cineActiveEarly = await page.evaluate(() => !!(window.__harness.samuraiUltCine && window.__harness.samuraiUltCine().active));
  check("ultimate line fired within ~3f of activation", inPool(logEarly, ultPool), logEarly.filter(f => /^samred/.test(f)).join(","));
  check("…at the windup: strike damage has NOT landed yet", inPool(logEarly, ultPool) && dmgEarly === 0, `dmgEarly=${dmgEarly}`);
  check("…and the freeze-cinematic is active (line rode the activation, not the impact)", cineActiveEarly, `cineActive=${cineActiveEarly}`);
  await page.waitForFunction(() => { const q = window.__harness.p2(); return (q.maxHealth - q.health) > 0; }, null, { timeout: 12000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => !(window.__harness.samuraiUltCine && window.__harness.samuraiUltCine().active), null, { timeout: 12000, polling: 32 }).catch(() => {});
  const logFull = await sfxLog();
  const dmgFull = (await p2()).maxHealth - (await p2()).health;
  const ultCount = logFull.filter(f => ultPool.includes(f)).length;
  check("strike damage landed AFTER the activation line (≥300 direct)", dmgFull >= 300, `dmgFull=${dmgFull}`);
  check("exactly ONE ultimate line across the whole ult (no impact-beat double)", ultCount === 1, `ultLines=${ultCount}`);

  // ── (4) NO-OVERLAP: two Samurai triggers in quick succession → single voice channel ──
  section("no-overlap: back-to-back Samurai triggers share one voice channel");
  await ready();
  // If a prior section left us transformed, revert to base first (quick-tap P) — else enterSamuraiMega
  // no-ops and the megaMode line never fires. Then refill Symbol Power so the re-entry clears threshold.
  if ((await p1()).currentForm === "megaMode") {
    await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p");
    await page.waitForFunction(() => window.__harness.p1().currentForm !== "megaMode", null, { timeout: 3000, polling: 16 }).catch(() => {});
  }
  await page.evaluate(() => window.__harness.resetUlt?.());   // energy → max (≥ Mega threshold)
  await page.evaluate(() => window.__harness.__sound.stopAllSfx());
  await waitFrames(2);
  await clearSfx(); await resetStopOwned();
  // trigger 1: Mega Mode activation (megaMode line)
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().currentForm === "megaMode", null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  const ownedAfter1 = await activeOwnedSam();
  // wait until the morph resolves AND P1 is actionable (the morph locks attackCooldown for its duration)
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.hasSkinAnim && !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  // trigger 2: Flame Slash special (fireSmasher line)
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 260); }
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  await waitFrames(3);
  const ownedAfter2 = await activeOwnedSam();
  const stops = await stopOwnedCalls();
  const log = await sfxLog();
  const firedTwo = inPool(log, await pool("megaMode")) && inPool(log, await pool("fireSmasher"));
  check("both triggers actually fired (megaMode + fireSmasher)", firedTwo, log.filter(f => /^samred/.test(f)).join(","));
  check("never 2 owned Samurai clips playing at once (sample 1)", ownedAfter1 <= 1, `owned=${ownedAfter1}`);
  check("never 2 owned Samurai clips playing at once (sample 2)", ownedAfter2 <= 1, `owned=${ownedAfter2}`);
  check("single-voice-channel clear ran between the two lines (stopOwnedSfx)", stops >= 1, `stopOwnedCalls=${stops}`);

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  SAMURAI RED RANGER voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
