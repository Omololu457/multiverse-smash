// harness/zenitsu_voice.test.mjs — Zenitsu Agatsuma voice-line wiring (audio-only).
// Proves: (1) every pool RANDOMIZES + full coverage; (2) live triggers fire (spy on playSfxFile) —
// intro / Thunder-Breathing First-Form cast / ultimate ACTIVATION / Double-Attack (both variants) /
// offense combat-bark / hit-react / low-health; (3) the ultimate line fires on ACTIVATION *before the
// dash executes* (whiff-proof: fires even with 0 damage) — NOT on connect; (4) the single-voice-channel
// no-overlap rule holds when two Zenitsu triggers fire in quick succession (stopOwnedSfx clears the
// channel; never 2 owned Zenitsu clips playing at once).
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
// active OWNED Zenitsu clips currently playing (not paused) — the no-overlap probe.
const activeOwnedZen = () => page.evaluate(() => window.__harness.sfxActive().filter(e => /^zenitsu_/.test(e.file) && e.owned && !e.paused).length);
async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = s._sfxSpy || [];
    if (!s._spied) {
      s._spied = true;
      const orig = s.playSfxFile.bind(s);
      s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); };
      // instrument the single-voice-channel clear so we can prove it runs between two owned lines
      s._stopOwnedCalls = 0;
      const origStop = s.stopOwnedSfx.bind(s);
      s.stopOwnedSfx = (owner) => { try { if (owner) s._stopOwnedCalls++; } catch (_) {} return origStop(owner); };
    }
  });
}
const stopOwnedCalls = () => page.evaluate(() => window.__harness.__sound._stopOwnedCalls || 0);
const resetStopOwned = () => page.evaluate(() => { window.__harness.__sound._stopOwnedCalls = 0; });
async function ready() {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetUlt?.(); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 46); await waitFrames(2);
}
const hasZen = (log, re) => log.filter(f => /^zenitsu_/.test(f)).some(f => re.test(f));
const inPool = (log, pool) => log.some(f => pool.includes(f));
const pool = name => page.evaluate(p => window.__harness.zenitsuVoicePool(p), name);

try {
  await page.goto(`${base}/index.html?harness=1&p1=zenitsu&p2=zenitsu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "thunderclap", "ultimate", "combatBark", "hitReact", "lowHealth", "doubleAttack"];
  let totalClips = 0;
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.zenitsuVoicePick(pp, 120), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    totalClips += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 16 clips accounted for across the 7 pools", totalClips === 16, `total=${totalClips}`);

  // ── (2) LIVE: INTRO / battle-start ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), log.filter(f => /^zenitsu/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: Thunder Breathing First Form special CAST (Neutral+Special "l") ──
  section("live: Thunder Breathing First Form cast (Neutral+Special)");
  await ready(); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); const tc = await pool("thunderclap"); check("First Form cast fires a thunderclap-pool line", inPool(log, tc), log.filter(f => /^zenitsu/.test(f)).join(",")); }

  // ── (2) LIVE: Double Attack (both variants) — Fwd+Special (Tanjiro) & Down+Special (Inosuke) ──
  section("live: Double Attack activation (both variants)");
  for (const [dirKey, label] of [["d", "Tanjiro (Fwd)"], ["s", "Inosuke (Down)"]]) {
    await page.waitForFunction(() => (window.__harness.p1().doubleAtkCd || 0) === 0, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await ready(); await clearSfx();
    await page.keyboard.down(dirKey); await waitFrames(2);
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(6);
    await page.keyboard.up(dirKey);
    const log = await sfxLog(); const da = await pool("doubleAttack");
    check(`Double Attack ${label} fires the finisher line`, inPool(log, da), log.filter(f => /^zenitsu/.test(f)).join(","));
  }

  // ── (2)+(3) LIVE: ULTIMATE activation — fires BEFORE the dash, and even on a WHIFF (not on connect) ──
  section("live: ultimate ACTIVATION line (before dash / not on connect)");
  await ready();
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(600); });  // p2 invuln → the ult can NEVER connect
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); }
  await clearSfx();
  const xBefore = (await p1()).x;
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");   // sample at frame ~3 (< the ~10f dash-blink startup)
  const ultPool = await pool("ultimate");
  const logEarly = await sfxLog();
  const xEarly = (await p1()).x;
  check("ultimate line fired within ~3f of activation", inPool(logEarly, ultPool), logEarly.filter(f => /^zenitsu/.test(f)).join(","));
  check("…before the dash blink (p1 hasn't teleported yet)", Math.abs(xEarly - xBefore) < 30, `Δx=${(xEarly - xBefore).toFixed(0)}`);
  await waitFrames(30);
  const dmgDealt = (await p2()).maxHealth - (await p2()).health;
  check("ultimate line fired despite ZERO connect (activation, not on-hit)", inPool(logEarly, ultPool) && dmgDealt === 0, `dmg=${dmgDealt}`);
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));

  // ── (2) LIVE: offense combatBark (attacker) + hitReact (defender) via a mirror heavy connect ──
  section("live: combatBark + hitReact (mirror heavy connect)");
  await page.waitForFunction(() => (window.__harness.p1().ultimateCooldown || 0) >= 0, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog(); const cb = await pool("combatBark"); const hr = await pool("hitReact");
    check("heavy connect fires a combatBark line (attacker)", inPool(log, cb), log.filter(f => /^zenitsu/.test(f)).join(","));
    check("mirror defender fires a hitReact line", inPool(log, hr), ""); }

  // ── (2) LIVE: low-health comeback bark (defender crosses 25%) ──
  section("live: low-health bark");
  await ready();
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth; window.__harness.damageP2(m * 0.72); });  // drop p2 to ~28%
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1"));
  await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog(); const lh = await pool("lowHealth"); check("crossing 25% fires a low-health line", inPool(log, lh), log.filter(f => /^zenitsu/.test(f)).join(",")); }

  // ── (4) NO-OVERLAP: two Zenitsu triggers in quick succession → single voice channel ──
  // Thunderclap cast (owned by p1) then Ultimate cast (owned by p1) ~0.5s later, while the first clip is
  // still playing. The 2nd owned cue must STOP the 1st (stopOwnedSfx) → never 2 owned Zenitsu clips at once.
  // NOTE: the no-overlap rule is PER-CHARACTER (per owner) — cross-character overlap is intentionally
  // allowed. Since p2 is also Zenitsu here, we make him SILENT (invuln + far, so both casts WHIFF and he
  // never hit-reacts) → any owned Zenitsu clip playing is unambiguously p1's, so the count is a clean probe.
  await ready();
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(600); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 320); }   // far → casts whiff → p2 stays silent
  section("no-overlap: back-to-back Zenitsu triggers share one voice channel");
  await page.evaluate(() => window.__harness.__sound.stopAllSfx());   // clear any still-playing residual clips → clean baseline
  await waitFrames(2);
  await clearSfx(); await resetStopOwned();
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // trigger 1: thunderclap
  await waitFrames(3);
  const ownedAfter1 = await activeOwnedZen();
  // trigger 2: ultimate (buffered through thunderclap recovery); fires while clip-1 audio is still playing
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await waitFrames(3);
  const ownedAfter2 = await activeOwnedZen();
  const stops = await stopOwnedCalls();
  const log = await sfxLog();
  const firedTwo = inPool(log, await pool("thunderclap")) && inPool(log, ultPool);
  check("both triggers actually fired (thunderclap + ultimate)", firedTwo, log.filter(f => /^zenitsu/.test(f)).join(","));
  check("never 2 owned Zenitsu clips playing at once (sample 1)", ownedAfter1 <= 1, `owned=${ownedAfter1}`);
  check("never 2 owned Zenitsu clips playing at once (sample 2)", ownedAfter2 <= 1, `owned=${ownedAfter2}`);
  check("single-voice-channel clear ran between the two lines (stopOwnedSfx)", stops >= 1, `stopOwnedCalls=${stops}`);

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  ZENITSU voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
