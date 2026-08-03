// harness/gold_samurai_voice.test.mjs — Gold Samurai Ranger voice-line wiring (audio-only).
// Proves: (1) every pool RANDOMIZES + full coverage (all 16 clips across 8 pools, no double-pooling,
// exact on-disk filenames); (2) live triggers fire (spy on playSfxFile) — intro / offense combatBark /
// hit-react / Barracuda Blade special (base tier) / Fierce Fox Claw finisher (samRekkaFin);
// (3) THE KEY GUARANTEE — the TWO transform lines fire at the right moments and DON'T overlap:
//   transformCast (000 "Samurai Morpher! Gold power!") at the ACTIVATION beat BEFORE the reveal resolves
//   the Mega art, then transformDone (001 "Gold is good to go!") once the morph FULLY completes — in that
//   ORDER, each exactly ONCE, sharing the single voice channel (001 doesn't stack on 000);
// (4) cross-VA isolation — Gold speaks ONLY goldranger_* clips, never a Red samred_* clip.
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
const activeOwnedGold = () => page.evaluate(() => window.__harness.sfxActive().filter(e => /^goldranger_/.test(e.file) && e.owned && !e.paused).length);
async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = s._sfxSpy || [];
    s._sfxAll = s._sfxAll || [];   // never-cleared: whole-session accumulator for cross-VA leak check
    if (!s._spied) {
      s._spied = true;
      const orig = s.playSfxFile.bind(s);
      s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); s._sfxAll.push(String(f)); } catch (_) {} return orig(f, fb, o); };
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
const pool = name => page.evaluate(p => window.__harness.goldSamuraiVoicePool(p), name);
const goldLines = log => log.filter(f => /^goldranger_/.test(f));

try {
  await page.goto(`${base}/index.html?harness=1&p1=gold_samurai_ranger&p2=gold_samurai_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["transformCast", "transformDone", "intro", "barracuda", "foxClaw", "combatBark", "hitReact", "win"];
  let totalClips = 0;
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.goldSamuraiVoicePick(pp, 300), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    totalClips += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 16 clips accounted for across the 8 pools", totalClips === 16, `total=${totalClips}`);
  { const seen = {}; let dupe = null;
    for (const p of POOLS) for (const c of await pool(p)) { if (seen[c]) dupe = c; seen[c] = true; }
    check("no clip is double-pooled (each file has one home)", !dupe, dupe ? `dupe=${dupe}` : ""); }
  { let missing = [];
    for (const p of POOLS) for (const c of await pool(p)) if (!fs.existsSync(path.join(ROOT, c))) missing.push(c);
    check("every referenced clip exists on disk (exact filenames)", missing.length === 0, missing.slice(0, 3).join(",")); }

  // ── (2) LIVE: INTRO / battle-start ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), goldLines(log).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: offense combatBark (attacker) + hitReact (defender) via a neutral HEAVY connect ──
  section("live: combatBark + hitReact (neutral heavy connect)");
  await ready(58); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(14);
  { const log = await sfxLog(); const cb = await pool("combatBark"); const hr = await pool("hitReact");
    check("heavy connect fires the combatBark line (attacker)", inPool(log, cb), goldLines(log).join(","));
    check("mirror defender fires a hitReact line", inPool(log, hr), ""); }

  // ── (2) LIVE: BARRACUDA BLADE special cast (Light Slash — usable in BASE tier) ──
  section("live: Barracuda Blade on Light Slash (SPECIAL button, base tier)");
  await ready();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 260); }   // far dummy — isolate the cast line
  await page.evaluate(() => window.__harness.setP2Invuln?.(600));
  await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(8);
  { const log = await sfxLog(); const bb = await pool("barracuda"); const isBase = (await p1()).currentForm !== "megaMode";
    check("Light Slash usable in base tier (not transformed)", isBase, `form=${(await p1()).currentForm}`);
    check("Light Slash special fires a Barracuda Blade line", inPool(log, bb), goldLines(log).join(",")); }
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));

  // ── (2) LIVE: FIERCE FOX CLAW on the command-chain finisher (Fwd+Heavy → re-tap Heavy, cancel-on-hit) ──
  section("live: Fierce Fox Claw on the samRekkaFin finisher (Fwd+Heavy → re-tap)");
  await ready(34); await clearSfx();
  const stages = new Set();
  const sample = async (n) => { for (let i = 0; i < n; i++) { const a = await p1(); if (a.currentMove) stages.add(a.currentMove); await waitFrames(1); } };
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener: samRekka1
  await sample(6);
  for (let i = 0; i < 5 && !stages.has("samRekkaFin"); i++) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await sample(7); }
  await waitFrames(6); await page.keyboard.up("d");
  { const log = await sfxLog(); const fc = await pool("foxClaw");
    check("chain reached the finisher (samRekkaFin)", stages.has("samRekkaFin"), `stages=[${[...stages]}]`);
    check("finisher fires the Fierce Fox Claw line", inPool(log, fc), goldLines(log).join(",")); }

  // ── (3) THE KEY: transform 000 (activation) → 001 (complete), in order, each once, no overlap ──
  section("live: transform 000 (activation, pre-reveal) → 001 (complete) — order/once/no-overlap");
  await ready();
  await page.evaluate(() => window.__harness.resetUlt?.());   // energy → max (≥ Mega threshold)
  await page.evaluate(() => window.__harness.__sound.stopAllSfx());
  await waitFrames(2);
  await clearSfx(); await resetStopOwned();
  const castPool = await pool("transformCast");
  const donePool = await pool("transformDone");
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");   // charge-release into Mega Mode
  await page.waitForFunction(() => window.__harness.p1().currentForm === "megaMode", null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(2);   // sample DURING the morph — form=megaMode but art NOT yet resolved
  const logMid = await sfxLog();
  const midMorph = await p1();
  const ownedMid = await activeOwnedGold();
  check("transformCast (000) fired at activation", inPool(logMid, castPool), goldLines(logMid).join(","));
  check("…at the ACTIVATION beat: reveal has NOT resolved the Mega art yet", inPool(logMid, castPool) && midMorph.currentForm === "megaMode" && !midMorph.hasSkinAnim, `form=${midMorph.currentForm} skinAnim=${midMorph.hasSkinAnim}`);
  check("transformDone (001) has NOT fired yet (morph still resolving)", !inPool(logMid, donePool), "");
  check("only one owned Gold clip playing mid-morph (no overlap)", ownedMid <= 1, `owned=${ownedMid}`);
  // let the morph fully resolve + P1 become actionable → 001 should have fired by now
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.hasSkinAnim && !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  const logDone = await sfxLog();
  const castIdx = logDone.findIndex(f => castPool.includes(f));
  const doneIdx = logDone.findIndex(f => donePool.includes(f));
  const castCount = logDone.filter(f => castPool.includes(f)).length;
  const doneCount = logDone.filter(f => donePool.includes(f)).length;
  const stops = await stopOwnedCalls();
  const ownedDone = await activeOwnedGold();
  check("transformDone (001) fired after the morph completed", doneIdx >= 0, goldLines(logDone).join(","));
  check("ORDER correct: 000 activation fired BEFORE 001 complete", castIdx >= 0 && doneIdx > castIdx, `castIdx=${castIdx} doneIdx=${doneIdx}`);
  check("exactly ONE 000 across the whole transform", castCount === 1, `count=${castCount}`);
  check("exactly ONE 001 across the whole transform", doneCount === 1, `count=${doneCount}`);
  check("single voice channel: no 2 owned Gold clips at once + a stop ran between the two lines", ownedDone <= 1 && stops >= 1, `owned=${ownedDone} stops=${stops}`);

  // ── (4) CROSS-VA ISOLATION: Gold never spoke a Red samred_* clip anywhere in this run ──
  section("cross-VA isolation");
  const redLeaks = await page.evaluate(() => (window.__harness.__sound._sfxAll || []).filter(f => /^samred_/.test(String(f))));
  check("no Red samred_* clip ever fired for a Gold fighter (activation leak fixed)", redLeaks.length === 0, redLeaks.slice(0, 3).join(","));

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  GOLD SAMURAI RANGER voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
