// harness/netero_voice.test.mjs
// Isaac Netero voice-line wiring proof (audio-only; Japanese "Nen Impact" VO, 51 named clips
// across 7 pools; 16 present on disk at wiring time — the rest 404 harmlessly until uploaded).
// The SFX spy records the filename ARGUMENT (before load), so a clip that is named-but-not-yet-
// on-disk is still provably wired.
//
// Parts:
//   (1) RANDOMIZER — sample __harness.neteroVoicePick(pool, N) for all 7 pools; assert genuine
//       random spread (near-full distinct coverage) + non-repeating order on the big pools.
//   (2) ON-DISK — reporting-only count of how many named clips are present right now.
//   (3) LIVE TRIGGERS — spy on playSfxFile and assert the right POOL fires at the right beat:
//         • guanyin cast → the ultimate summon beat (and NOT the monologue/zero lines — no overlap)
//         • grunt vs hit  → DISTINCT triggers: a WHIFF fires grunt-only (startup), a CONNECT fires hit
//         • intro         → intro pool at the intro-play beat
//         • win           → win pool at match-end victory
//   (4) STAGED — Netero has no `taunt` action (dormant); prove the pick randomizes and that the
//       real commit hook fires the instant a taunt animation is injected (giveP1TestTaunt).
// Run: node harness/netero_voice.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const info = (m) => console.log(`  · ${m}`);
const section = t => console.log(`\n── ${t} ──`);

// Every named clip per pool (exact on-disk filenames) — for coverage + presence reporting.
const POOLS = {
  intro: ["netero_nenimpact_intro_challenger.mp3", "netero_nenimpact_intro_playmate.mp3"],
  taunt: ["netero_nenimpact_taunt_1.mp3", "netero_nenimpact_taunt_2.mp3", "netero_nenimpact_taunt_3.mp3", "netero_nenimpact_taunt_4.mp3", "netero_nenimpact_taunt_come_at_me.mp3", "netero_nenimpact_taunt_go_easier.mp3", "netero_nenimpact_taunt_spacing_out.mp3", "netero_nenimpact_taunt_come_at_me_2.mp3"],
  win: ["netero_nenimpact_win_short.mp3", "netero_nenimpact_win_feed_me.mp3", "netero_nenimpact_win_hundred_years.mp3", "netero_nenimpact_win_laugh.mp3", "netero_nenimpact_win_getting_old.mp3", "netero_nenimpact_win_grateful_1.mp3", "netero_nenimpact_win_grateful_2.mp3", "netero_nenimpact_win_close_1.mp3", "netero_nenimpact_win_close_2.mp3", "netero_nenimpact_win_close_3.mp3", "netero_nenimpact_win_close_4.mp3"],
  guanyinCast: ["netero_nenimpact_guanyin_cast_1.mp3", "netero_nenimpact_guanyin_cast_alt.mp3"],
  hit: ["netero_nenimpact_hit_too_soft.mp3", "netero_nenimpact_hit_underestimate.mp3", "netero_nenimpact_hit_last_strength.mp3", "netero_nenimpact_hit_full_tension.mp3", "netero_nenimpact_hit_too_naive.mp3", "netero_nenimpact_hit_impudent.mp3"],
  grunt: Array.from({ length: 10 }, (_, i) => `netero_nenimpact_grunt_a${i + 1}.mp3`).concat(Array.from({ length: 10 }, (_, i) => `netero_nenimpact_grunt_b${i + 1}.mp3`)),
  zero: ["netero_nenimpact_ultimate_monologue.mp3", "netero_nenimpact_zero_payoff.mp3"],
};
const RE = {
  intro: /^netero_nenimpact_intro_(challenger|playmate)\.mp3$/,
  taunt: /^netero_nenimpact_taunt_/,
  win: /^netero_nenimpact_win_/,
  guanyinCast: /^netero_nenimpact_guanyin_cast_(1|alt)\.mp3$/,
  hit: /^netero_nenimpact_hit_/,
  grunt: /^netero_nenimpact_grunt_[ab]\d+\.mp3$/,
  zero: /^netero_nenimpact_(ultimate_monologue|zero_payoff)\.mp3$/,
};

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; } }); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function logHas(re) { return (await sfxLog()).some(f => re.test(f)); }
async function goto(q) { await page.goto(`${base}/index.html?harness=1&${q}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }

try {
  // ══ PART 1: RANDOMIZER ═════════════════════════════════════════════════════
  await goto("p1=netero");
  section("randomizer — genuine random spread within each pool");
  const SPEC = [
    { name: "intro", size: 2, minDistinct: 2 },
    { name: "taunt", size: 8, minDistinct: 7 },
    { name: "win", size: 11, minDistinct: 10 },
    { name: "guanyinCast", size: 2, minDistinct: 2 },
    { name: "hit", size: 6, minDistinct: 6 },
    { name: "grunt", size: 20, minDistinct: 18 },
    { name: "zero", size: 2, minDistinct: 2 },
  ];
  for (const s of SPEC) {
    const picks = await page.evaluate(p => window.__harness.neteroVoicePick(p, 300), s.name);
    const distinct = new Set(picks);
    const allValid = picks.every(f => RE[s.name].test(f));
    check(`${s.name} (${s.size}) → ${distinct.size}/${s.size} distinct over 300 picks`, distinct.size >= s.minDistinct && allValid, allValid ? "" : `invalid pick e.g. ${picks.find(f => !RE[s.name].test(f))}`);
  }
  // Non-repeating order on the two big pools (not a fixed cycle).
  for (const nm of ["grunt", "win"]) {
    const seq = await page.evaluate(n => window.__harness.neteroVoicePick(n, 30), nm);
    let changes = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
    check(`${nm} is randomized, not a fixed repeating cycle`, changes >= 20, `${changes}/29 adjacent changes`);
  }
  const badPool = await page.evaluate(() => window.__harness.neteroVoicePick("nope", 3));
  check("unknown pool name → null (no crash)", badPool.every(x => x === null), `got ${JSON.stringify(badPool)}`);

  // ══ PART 2: ON-DISK PRESENCE (reporting only) ══════════════════════════════
  section("on-disk presence (reporting only — spy proves wiring regardless of presence)");
  const all = Object.values(POOLS).flat();
  const present = all.filter(f => fs.existsSync(path.join(ROOT, f)));
  info(`${present.length}/${all.length} named mp3s present on disk; ${all.length - present.length} named-but-pending (404 harmlessly until uploaded)`);
  check("at least the shipped clips are present & wired", present.length >= 16, `present=${present.length}`);

  // ══ PART 3: LIVE TRIGGERS ══════════════════════════════════════════════════
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  async function prep(gap) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice("p1"); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); await clearSfx();
  }

  section("GUANYIN CAST → ultimate summon beat (and NOT the monologue/zero lines)");
  await prep(300);
  await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.resetUlt(); });
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(6);
  check("ultimate cast → a guanyin_cast_* clip fires", await logHas(RE.guanyinCast), `log=${JSON.stringify(await sfxLog())}`);
  check("the ~19s monologue / zero payoff do NOT fire at the summon beat (no overlap)", !(await logHas(RE.zero)), `zero-in-log=${(await sfxLog()).filter(f => RE.zero.test(f)).join(",") || "none"}`);
  // let the giant form auto-revert / reset back to base for the next section
  await page.evaluate(() => window.__harness.boot()); await installSpy();

  section("GRUNT vs HIT — distinct triggers (whiff = grunt only; connect = hit)");
  // WHIFF: p2 far out of range → the light SWING fires a startup grunt but never connects (no hit bark).
  let gruntOnWhiff = false, hitOnWhiff = false;
  for (let i = 0; i < 4 && !gruntOnWhiff; i++) {
    await prep(600);   // way out of range
    await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(14);
    if (await logHas(RE.grunt)) gruntOnWhiff = true;
    if (await logHas(RE.hit)) hitOnWhiff = true;
  }
  check("whiffed attack → startup GRUNT fires", gruntOnWhiff, `log=${JSON.stringify(await sfxLog())}`);
  check("whiffed attack → hit-connect pool does NOT fire (distinct trigger)", !hitOnWhiff, hitOnWhiff ? "hit bark leaked on a whiff" : "");

  // CONNECT: p2 in range → the light lands → hit-connect bark fires.
  let hitOnConnect = false;
  for (let i = 0; i < 5 && !hitOnConnect; i++) {
    await prep(40);
    await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(14);
    if (await logHas(RE.hit)) hitOnConnect = true;
  }
  check("connected attack → HIT-CONNECT bark fires", hitOnConnect, `log=${JSON.stringify(await sfxLog())}`);

  section("INTRO → intro pool at the intro-play beat");
  await goto("p1=netero");
  await installSpy(); await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /netero_nenimpact_intro_/.test(f)), null, { timeout: 9000, polling: 16 }).catch(() => {});
  check("intro → one of the intro pool", await logHas(RE.intro), `log=${JSON.stringify((await sfxLog()).filter(f => /netero/.test(f)))}`);

  section("WIN → win pool at match-end victory");
  await goto("p1=netero");
  await page.evaluate(() => window.__harness.bootVs());
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 8000, polling: 16 }).catch(() => {});
  await installSpy();
  let winFired = false;
  for (let r = 0; r < 3 && !winFired; r++) {
    await page.waitForFunction(() => { const s = window.__harness.state(); const b = window.__harness.p2(); return s.gameState === "battle" && s.countdown === 0 && b && b.health > 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
    await clearSfx();
    await page.evaluate(() => window.__harness.damageP2(9999));
    await waitFrames(30);
    winFired = await logHas(RE.win);
  }
  check("win → one of the win pool", winFired, `log=${JSON.stringify(await sfxLog())}`);

  // ══ 100-TYPE ZERO FINISHER — ult button while giant → guanyinZero + monologue/payoff ══
  section("100-TYPE ZERO — dedicated finisher slot (ult-in-form; monologue cast → payoff strike)");
  await goto("p1=netero");
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  // Enter Guanyin, and park the dummy far away so the long committed finisher can't be interrupted.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 700); window.__harness.setP2Invuln?.(600); window.__harness.fillEnergy(); window.__harness.resetUlt(); });
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => !!window.__harness.p1().canvasHeightFrac, null, { timeout: 5000, polling: 16 });
  await waitFrames(6);
  const inForm = await p1();
  check("Guanyin form active before the finisher", !!inForm.canvasHeightFrac, `frac=${inForm.canvasHeightFrac}`);
  // Wait until the entry-cast cooldown has fully drained (form settled + actionable) so the finisher
  // press isn't eaten by the residual charge-cast cooldown.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.canvasHeightFrac && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  // Press Ultimate AGAIN while giant → 100-Type Zero finisher.
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(4);
  const zAct = await p1();
  check("ult-in-form → the guanyinZero finisher move fires", zAct.action === "guanyinZero", `action=${zAct.action}`);
  check("finisher plays the ~19s monologue as its cast line", await logHas(/netero_nenimpact_ultimate_monologue\.mp3/), `log=${JSON.stringify((await sfxLog()).filter(f => /netero/.test(f)))}`);
  check("no generic startup GRUNT over the finisher cast", !(await logHas(RE.grunt)), (await sfxLog()).filter(f => RE.grunt.test(f)).join(",") || "");
  // The payoff battle-cry is scheduled to the strike frames (after the ~24f committed windup).
  await waitFrames(34);
  check("payoff battle-cry fires synced to the strike", await logHas(/netero_nenimpact_zero_payoff\.mp3/), `log=${JSON.stringify((await sfxLog()).filter(f => /netero/.test(f)))}`);
  // ONCE-PER-ACTIVATION: after the move resolves, a 2nd ult press in the SAME form does nothing.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.canvasHeightFrac && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(6);
  const zAct2 = await p1();
  check("2nd ult press in the same form → NO second Zero (once-per-activation)", !(await logHas(/ultimate_monologue|zero_payoff/)) && zAct2.action !== "guanyinZero", `action=${zAct2.action} log=${JSON.stringify((await sfxLog()).filter(f => /netero/.test(f)))}`);

  // ══ PART 4: STAGED TAUNT (dormant → lights up when a taunt action exists) ═══
  section("TAUNT staged — no taunt action; hook fires the moment one is injected");
  await goto("p1=netero");
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  const hasTauntAnim = await page.evaluate(() => !!window.__harness.p1().animationData?.taunt);
  check("Netero ships NO taunt animationData (staged, not a built mechanic)", !hasTauntAnim, `animationData.taunt=${hasTauntAnim}`);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.giveP1TestTaunt(4); });
  await clearSfx();
  await page.keyboard.down("s"); await waitFrames(2);
  await page.evaluate(() => window.__harness.setTauntCharge(599));
  await waitFrames(6);
  await page.keyboard.up("s");
  const tLog = await sfxLog();
  const tClip = tLog.find(f => RE.taunt.test(f)) || null;
  check("injected taunt commit → a taunt_* clip fires (hook genuinely wired)", !!tClip, tClip ? `fired: ${tClip}` : `log=${JSON.stringify(tLog)}`);

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Netero voice: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
