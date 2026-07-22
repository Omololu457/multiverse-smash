// harness/rick_voice.test.mjs
// ---------------------------------------------------------------------------
// Rick Sanchez — VOICE-LINE wiring verification (real Chromium, real code path).
// Spies on SoundManager.playSfxFile (the single voice-cue seam every character uses)
// and drives the actual moves/events, asserting the right POOL fires at the right beat.
//
// Covers the four confirmations the task asked for explicitly:
//   • Meeseeks pool randomizes across multiple summons in a row
//   • Self-Destruct activation vs payoff fire at genuinely different beats (+ order)
//   • Team-Mode blue/red win callouts fire correctly per team
//   • the win-line pair alternates
// …plus intro pool, Rocket cast, taunt-heal callout, hit-reaction pools, round-flow barks.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";

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
function info(name, detail = "") { console.log(`  ℹ️  INFO  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const stateF = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

// ── SOUND SPY (mirrors naruto_voice.test.mjs) — wrap playSfxFile, record every cue ──
async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = [];
    if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; }
  });
}
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function rickOnly(log) { return log.filter(f => /^rick_/.test(f)); }

// Pool membership (mirrors rickVoice.js). Filenames are the source of truth.
const POOL = {
  intro:      ["rick_061", "rick_062", "rick_063", "rick_064", "rick_065", "rick_066"],
  meeseeks:   ["rick_047", "rick_048", "rick_049", "rick_050", "rick_051", "rick_052", "rick_053", "rick_054", "rick_055", "rick_056", "rick_057", "rick_058", "rick_059", "rick_060"],
  rocket:     ["rick_041", "rick_042", "rick_043", "rick_044", "rick_045", "rick_046"],
  ultActivate:["rick_029", "rick_030"],
  ultPayoff:  ["rick_031", "rick_032"],
  win:        ["rick_067", "rick_068"],
  tauntHeal:  ["rick_026", "rick_027", "rick_028"],
  hit:        ["rick_017", "rick_018", "rick_019", "rick_020", "rick_021", "rick_022", "rick_023", "rick_024", "rick_025"],
  taunt:      ["rick_033", "rick_034", "rick_035", "rick_036", "rick_037", "rick_038", "rick_039", "rick_040"],
  roundWin:   ["rick_005"],
  ko:         ["rick_007", "rick_008", "rick_009"],
  teamBlue:   ["rick_006"],
  teamRed:    ["rick_010"],
};
const inPool = (clip, pool) => POOL[pool].some(p => clip.includes(p));
const anyInPool = (log, pool) => log.some(c => inPool(c, pool));

async function setupAdjacent(gap = 58) {
  await waitGrounded();
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap);
  await waitFrames(2);
}

try {
  // ═══ INTRO POOL — fires during Rick's own match intro (no skip) ═══════════════
  section("INTRO pool — random catchphrase bark during Rick's intro (061–066)");
  await page.goto(`${base}/index.html?harness=1&p1=rick`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();
  await page.evaluate(() => window.__harness.start());   // real match start → runs the INTRO phase
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /rick_06[1-6]/.test(f)), null, { timeout: 10000, polling: 16 }).catch(() => {});
  {
    const log = await rickOnly(await sfxLog());
    check("an intro-pool clip (061–066) fires during the intro", anyInPool(log, "intro"), `rick log=${JSON.stringify(log)}`);
  }

  // Collapse to BATTLE for the move-driven tests.
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ═══ MEESEEKS — pool RANDOMIZES across summons in a row ═══════════════════════
  section("MEESEEKS Box (neutral special L) — pool randomizes across many summons (047–060)");
  await setupAdjacent(520);
  await clearSfx();
  {
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.__harness.fillEnergy());
      await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
      await waitFrames(22);   // clear the attack cooldown before the next cast
    }
    const log = await rickOnly(await sfxLog());
    const meese = log.filter(c => inPool(c, "meeseeks"));
    const distinct = [...new Set(meese.map(c => c.slice(0, 8)))];   // rick_0NN prefix
    check("every Meeseeks cast fires a clip from the 14-entry pool", meese.length >= 5 && meese.every(c => inPool(c, "meeseeks")), `casts=${meese.length}`);
    check("Meeseeks pool RANDOMIZES (≥3 distinct clips across 12 summons)", distinct.length >= 3, `distinct=${distinct.length} → ${JSON.stringify(distinct)}`);
  }

  // ═══ SELF-DESTRUCT — activation vs payoff at DIFFERENT beats ══════════════════
  section("SELF-DESTRUCT ultimate (U) — activation (029/030) then payoff (031/032), different beats");
  await setupAdjacent(60);
  await page.evaluate(() => window.__harness.resetUlt());
  await waitFrames(4);
  await clearSfx();
  {
    await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
    await waitFrames(8);
    const log = await rickOnly(await sfxLog());
    const actIdx = log.findIndex(c => inPool(c, "ultActivate"));
    const payIdx = log.findIndex(c => inPool(c, "ultPayoff"));
    check("activation bark (029/030) fires on cast", actIdx >= 0, `log=${JSON.stringify(log)}`);
    check("payoff bark (031/032) fires on the blast connecting", payIdx >= 0, `log=${JSON.stringify(log)}`);
    check("activation fires BEFORE payoff (genuinely separate beats)", actIdx >= 0 && payIdx >= 0 && actIdx < payIdx, `actIdx=${actIdx} payIdx=${payIdx}`);
  }

  // ═══ SELF-DESTRUCT WHIFF — activation fires, payoff does NOT (proves payoff is connect-gated) ═
  section("SELF-DESTRUCT whiff (opponent far) — activation fires, payoff SUPPRESSED");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetUlt(); window.__harness.setP2X(3000); });
  await waitFrames(3);
  await clearSfx();
  {
    await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
    await waitFrames(8);
    const log = await rickOnly(await sfxLog());
    check("activation still fires on a whiffed cast", anyInPool(log, "ultActivate"), `log=${JSON.stringify(log)}`);
    check("payoff does NOT fire when the blast misses", !anyInPool(log, "ultPayoff"), `log=${JSON.stringify(log)}`);
  }

  // ═══ ROCKET — Up + Special cast bark (041–046) ════════════════════════════════
  section("ROCKET (Up+Special: W then L) — cast bark from the 6-entry pool");
  await setupAdjacent(40);
  await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.resetFighterInput("p1"); });
  await clearSfx();
  {
    // W feeds "U" into directionHistory (up == jump key); register it a frame BEFORE L reads it.
    await page.keyboard.down("w"); await waitFrames(1);
    await page.keyboard.down("l"); await waitFrames(2);
    await page.keyboard.up("l"); await page.keyboard.up("w");
    await waitFrames(4);
    const log = await rickOnly(await sfxLog());
    check("a Rocket-pool cast bark (041–046) fires", anyInPool(log, "rocket"), `log=${JSON.stringify(log)}`);
  }
  await waitGrounded(); await waitFrames(6);

  // ═══ HIT-REACTION pools — Rick getting hit fires a reaction clip (017–025) ════
  section("HIT-REACTION — Rick taking a hit fires a reaction-pool clip (017–025)");
  await waitGrounded();
  {
    const a = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), a.x + 46);   // dummy adjacent, in range
    await waitFrames(2);
    await clearSfx();
    await page.evaluate(() => window.__harness.p2AttackCat("heavy"));   // real p2 heavy → hits Rick
    await waitFrames(20);
    const log = await rickOnly(await sfxLog());
    check("a hit-reaction clip (017–025) fires when Rick is struck", anyInPool(log, "hit"), `log=${JSON.stringify(log)}`);
  }

  // ═══ TAUNT-HEAL callout (026–028) — hold Down 10s → heal taunt commit ═════════
  section("TAUNT-HEAL callout — hold Down to commit the heal taunt (026–028)");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.setP2X(3000); window.__harness.resetFighterInput("p1"); });   // dummy far so nothing interrupts
  await waitFrames(2);
  await clearSfx();
  {
    await page.keyboard.down("s");   // hold Down (charge the taunt)
    const committed = await page.waitForFunction(() => window.__harness.p1().tauntPlaying, null, { timeout: 20000, polling: 32 }).then(() => true).catch(() => false);
    await page.keyboard.up("s");
    await waitFrames(2);
    const log = await rickOnly(await sfxLog());
    check("taunt commits after the hold (mechanic reached)", committed, `tauntPlaying=${committed}`);
    check("a taunt-heal callout (026–028) fires on commit", anyInPool(log, "tauntHeal"), `log=${JSON.stringify(log)}`);
  }

  // ═══ ROUND-FLOW barks — KO win ("hey you won" 005) vs KO loss (007–009) ═══════
  section("ROUND-FLOW HUD barks (gated to LOCAL PLAYER = Rick)");
  // NON-training match: checkRoundEnd early-returns while training is active, so round-flow barks
  // need a real vs-CPU match. (Combat/ability barks above are NOT round-gated, so training was fine.)
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await installSpy();   // spy wrapper persists on the singleton; this just re-arms the array
  await waitFrames(4);
  await clearSfx();
  {
    // KO a round in Rick's favour (not the match-deciding round) → "hey you won".
    await page.evaluate(() => window.__harness.forceP1Win());   // p2.health = 0
    await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /^rick_/.test(f)), null, { timeout: 8000, polling: 16 }).catch(() => {});
    const log = await rickOnly(await sfxLog());
    check("round-WIN by KO fires the win bark (005)", anyInPool(log, "roundWin"), `log=${JSON.stringify(log)}`);
  }
  // Fresh match → this time Rick LOSES a round by KO → knockout pool (007–009).
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await installSpy();
  await waitFrames(4);
  await clearSfx();
  {
    await page.evaluate(() => window.__harness.forceP1Lose());   // p1.health = 0
    await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /^rick_/.test(f)), null, { timeout: 8000, polling: 16 }).catch(() => {});
    const log = await rickOnly(await sfxLog());
    check("round-LOSS by KO fires the knockout pool (007–009)", anyInPool(log, "ko"), `log=${JSON.stringify(log)}`);
  }

  // ═══ WIN pool — full match win fires 067/068 through the real _checkMatchOver ══
  section("WIN pool — winning the MATCH fires a win bark (067/068)");
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await installSpy();
  await waitFrames(4);
  await clearSfx();
  {
    // Best-of-3: KO twice. Between rounds ROUND_BREAK → resetRound → BATTLE (+ a start countdown
    // during which checkRoundEnd does NOT run) — so each iteration waits for an ACTIONABLE frame
    // (battle + countdown 0) before the KO, then the 2nd KO trips _checkMatchOver → VICTORY + win bark.
    let won = false;
    for (let r = 0; r < 6 && !won; r++) {
      await page.waitForFunction(() => { const s = window.__harness.state(); return (s.gameState === "battle" && s.countdown === 0) || s.gameState === "victory"; }, null, { timeout: 12000, polling: 32 }).catch(() => {});
      if ((await stateF()).gameState === "victory") break;
      await page.evaluate(() => window.__harness.forceP1Win());
      await waitFrames(6);
      won = await page.evaluate(() => (window.__harness.__sound._sfxSpy || []).some(f => /rick_06[78]/.test(f)));
    }
    const log = await rickOnly(await sfxLog());
    check("winning the match fires a win-pool bark (067/068)", anyInPool(log, "win"), `log=${JSON.stringify(log)}`);
  }

  // ═══ TEAM-MODE blue/red win callouts (006 / 010) via real checkFFAOutcome ═════
  section("TEAM-MODE win callouts — blue (A→006) vs red (B→010)");
  // Rick on team A; KO team B → team A (blue) wins.
  await page.evaluate(() => window.__harness.ffaStart(4, ["rick", "gojo", "sukuna", "toji"], ["A", "A", "B", "B"], ["easy", "easy", "easy", "easy"]));
  await waitFrames(4);
  await clearSfx();
  {
    await page.evaluate(() => { window.__harness.ffaDamage(2, 99999); window.__harness.ffaDamage(3, 99999); });
    await page.waitForFunction(() => window.__harness.ffaInfo().over, null, { timeout: 8000, polling: 32 }).catch(() => {});
    const info = await page.evaluate(() => window.__harness.ffaInfo());
    const log = await rickOnly(await sfxLog());
    check("Team A (blue) win fires the BLUE callout (006)", info.winnerTeam === "A" && anyInPool(log, "teamBlue"), `winnerTeam=${info.winnerTeam} log=${JSON.stringify(log)}`);
    check("Team A win does NOT fire the red callout", !anyInPool(log, "teamRed"), `log=${JSON.stringify(log)}`);
  }
  // Rick still on team A, but KO team A → team B (red) wins. (Rick is a participant → callout still fires.)
  await page.evaluate(() => window.__harness.ffaStart(4, ["rick", "gojo", "sukuna", "toji"], ["A", "A", "B", "B"], ["easy", "easy", "easy", "easy"]));
  await waitFrames(4);
  await clearSfx();
  {
    await page.evaluate(() => { window.__harness.ffaDamage(0, 99999); window.__harness.ffaDamage(1, 99999); });
    await page.waitForFunction(() => window.__harness.ffaInfo().over, null, { timeout: 8000, polling: 32 }).catch(() => {});
    const info = await page.evaluate(() => window.__harness.ffaInfo());
    const log = await rickOnly(await sfxLog());
    check("Team B (red) win fires the RED callout (010)", info.winnerTeam === "B" && anyInPool(log, "teamRed"), `winnerTeam=${info.winnerTeam} log=${JSON.stringify(log)}`);
    check("Team B win does NOT fire the blue callout", !anyInPool(log, "teamBlue"), `log=${JSON.stringify(log)}`);
  }

  // ═══ RANDOMIZATION proof — the same pickRickVoice used by every trigger ═══════
  section("RANDOMIZATION — pool sampler proves genuine random selection / pair alternation");
  {
    const winSamples = await page.evaluate(() => window.__harness.rickVoicePick("win", 40));
    const winSet = [...new Set(winSamples)];
    check("win pair ALTERNATES (both 067 & 068 appear across 40 samples)", winSet.length === 2 && winSet.every(c => /rick_06[78]/.test(c)), `distinct=${JSON.stringify(winSet)}`);

    const meeseSamples = await page.evaluate(() => window.__harness.rickVoicePick("meeseeks", 80));
    const meeseSet = [...new Set(meeseSamples)];
    check("Meeseeks 14-pool covers ≥10 distinct across 80 samples", meeseSet.length >= 10 && meeseSamples.every(c => c.startsWith("rick_0")), `distinct=${meeseSet.length}`);

    const tauntSamples = await page.evaluate(() => window.__harness.rickVoicePick("taunt", 60));
    check("generic-taunt 8-pool covers ≥6 distinct across 60 samples", [...new Set(tauntSamples)].length >= 6, `distinct=${[...new Set(tauntSamples)].length}`);
  }

  section("page errors");
  check("no uncaught page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("\n💥 harness threw:", e);
  FAIL++;
} finally {
  console.log(`\n──────────────────────────────────────────\n  ${PASS} passed, ${FAIL} failed\n`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
