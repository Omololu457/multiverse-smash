// harness/inosuke_voice.test.mjs — Inosuke Hashibira voice-line wiring (audio-only).
// Proves: (1) every pool RANDOMIZES + full coverage (all 41 clips across 8 pools, no double-pooling);
// (2) live triggers fire (spy on playSfxFile) — intro / Beast-Breathing cinematic special cast (specialCast)
// / Beast Breathing ASSIST call (beastAssist) / offense combatBark / strong-hit hitReact / light-hit grunt /
// low-health; (3) the special/assist cast lines ride the CAST (set _atkVoiceCd, no cast+connect double);
// (4) the single-voice-channel no-overlap rule holds when two Inosuke triggers fire in quick succession.
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
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const bba = () => page.evaluate(() => window.__harness.beastAssistState());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const activeOwnedIno = () => page.evaluate(() => window.__harness.sfxActive().filter(e => /^inosuke_voice_/.test(e.file) && e.owned && !e.paused).length);
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
  // let any in-flight Beast-Breathing cinematic (from a prior special cast) fully clear first
  await page.waitForFunction(() => !(window.__harness.inosukeBeastCine && window.__harness.inosukeBeastCine().active), null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); window.__harness.setP2Invuln?.(0); window.__harness.clearBeastAssistCd?.("p1"); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  await page.waitForFunction(() => { const p = window.__harness.p2(); return (p.grounded ?? true) && Math.abs(p.vy || 0) < 0.5 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const inPool = (log, pool) => log.some(f => pool.includes(f));
const pool = name => page.evaluate(p => window.__harness.inosukeVoicePool(p), name);
const inoLog = log => log.filter(f => /^inosuke_voice_/.test(f)).slice(0, 4).join(",");

// Open the flurry to a mid-stage in clean-hit recovery, then press Special → Beast Breathing Assist.
async function driveAssist() {
  await ready(44);
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // B1 opener (Fwd+Heavy)
  let ok = false;
  for (let i = 0; i < 60; i++) {
    const c = await p1();
    if ((c.currentMove || "").startsWith("inosukeB") && c.attackPhase === "recovery" && c.cmdHitLanded && c.rekkaNext) { ok = true; break; }
    await waitFrames(1);
  }
  await clearSfx();
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // Special → Assist
  await waitFrames(3);
  const froze = await bba();
  await page.keyboard.up("d"); await waitFrames(6);
  return { ok, froze };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=inosuke&p2=inosuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "specialCast", "beastAssist", "combatBark", "hitReact", "hitGrunt", "lowHealth", "win"];
  let totalClips = 0;
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.inosukeVoicePick(pp, 300), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    totalClips += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 41 clips accounted for across the 8 pools", totalClips === 41, `total=${totalClips}`);
  { const seen = {}; let dupe = null;
    for (const p of POOLS) for (const c of await pool(p)) { if (seen[c]) dupe = c; seen[c] = true; }
    check("no clip is double-pooled (each file has one home)", !dupe, dupe ? `dupe=${dupe}` : ""); }
  { // every wired clip is a real preserved raw filename on disk
    let missing = null;
    for (const p of POOLS) for (const c of await pool(p)) { if (!fs.existsSync(path.join(ROOT, c))) missing = c; }
    check("every wired clip exists on disk (raw filename preserved)", !missing, missing ? `missing=${missing}` : ""); }

  // ── (2) LIVE: INTRO / battle-start ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), inoLog(log)); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: SPECIAL-CAST on a Beast-Breathing cinematic special (neutral Special "l"). Whiff-proof. ──
  section("live: special-cast on a Beast-Breathing cinematic special (neutral Special)");
  await ready();
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 320); }
  await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(8);
  { const log = await sfxLog(); const sc = await pool("specialCast");
    const only = log.filter(f => /^inosuke_voice_/.test(f));
    check("cinematic special fires a Fang/Form cast line", inPool(log, sc), inoLog(log));
    check("…exactly ONE Inosuke line on the cast (no cast+connect double)", only.length === 1, `lines=${only.length} [${only.join(",")}]`); }
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));

  // ── (2) LIVE: BEAST BREATHING ASSIST call → beastAssist pool ──
  section("live: beastAssist call on the mid-combo Beast Breathing Assist");
  const asr = await driveAssist();
  { const log = await sfxLog(); const ba = await pool("beastAssist");
    check("flurry opened + Assist FROZE Inosuke mid-combo", asr.ok && asr.froze?.active && asr.froze?.hitstop > 0, `ok=${asr.ok} active=${asr.froze?.active} hitstop=${asr.froze?.hitstop}`);
    check("Assist call fires a beastAssist declaration line", inPool(log, ba), inoLog(log)); }

  // ── (2) LIVE: offense combatBark (attacker) + strong hitReact (defender) via a neutral HEAVY connect ──
  section("live: combatBark + hitReact (neutral heavy connect)");
  await ready(58); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(14);
  { const log = await sfxLog(); const cb = await pool("combatBark"); const hr = await pool("hitReact");
    check("heavy connect fires the combatBark line (attacker)", inPool(log, cb), inoLog(log));
    check("mirror defender fires a strong-hit hitReact line", inPool(log, hr), ""); }

  // ── (2) LIVE: light-hit exertion GRUNT (defender) via a neutral LIGHT connect ──
  section("live: light-hit grunt (neutral light connect)");
  await ready(40); await clearSfx();
  await page.keyboard.down("j"); await waitFrames(6); await page.keyboard.up("j"); await waitFrames(12);
  { const log = await sfxLog(); const hg = await pool("hitGrunt");
    check("light connect fires the defender light-hit grunt", inPool(log, hg), inoLog(log)); }

  // ── (2) LIVE: low-health bark (defender crosses 25%) ──
  section("live: low-health bark");
  await ready(58);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth; window.__harness.damageP2(m * 0.72); });
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1"));
  await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(14);
  { const log = await sfxLog(); const lh = await pool("lowHealth"); check("crossing 25% fires the low-health line", inPool(log, lh), inoLog(log)); }

  // ── (4) NO-OVERLAP: two Inosuke special casts in quick succession → single voice channel ──
  section("no-overlap: back-to-back Inosuke cast lines share one voice channel");
  await ready();
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 320); }
  await page.evaluate(() => window.__harness.__sound.stopAllSfx());
  await waitFrames(2);
  await clearSfx(); await resetStopOwned();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // cast 1
  await waitFrames(3);
  const ownedAfter1 = await activeOwnedIno();
  await page.evaluate(() => window.__harness.clearBeastAssistCd?.("p1"));
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // cast 2
  await waitFrames(3);
  const ownedAfter2 = await activeOwnedIno();
  const stops = await stopOwnedCalls();
  const log = await sfxLog();
  check("special casts actually fired", inPool(log, await pool("specialCast")), inoLog(log));
  check("never 2 owned Inosuke clips playing at once (sample 1)", ownedAfter1 <= 1, `owned=${ownedAfter1}`);
  check("never 2 owned Inosuke clips playing at once (sample 2)", ownedAfter2 <= 1, `owned=${ownedAfter2}`);
  check("single-voice-channel clear ran between the two lines (stopOwnedSfx)", stops >= 1, `stopOwnedCalls=${stops}`);

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  INOSUKE voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
