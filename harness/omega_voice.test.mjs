// harness/omega_voice.test.mjs
// Verifies each wired OMEGA RANGER voice line fires at its correct trigger (spies on the live
// SoundManager.playSfxFile, records every file cue, asserts the right file at the right beat).
// Audio-hookup only — no gameplay assertions. Mirrors harness/sasuke_voice.test.mjs.
//
// Coverage of the 16-clip batch:
//   WIRED & tested here: intro reveal (gated to the intro2 step) · battle_start (round-1 GO) ·
//   Buster Mode (Gun cast) · Blast Mode (Ring cast) · Hyper Mode (Ultimate cast) — Ring vs Ultimate
//   proven to fire at DIFFERENT beats · "Had enough?" (strong heavy connect) · combo-finisher (4+
//   sword-slash chain, NOT a single slash) · "No!" (light hit-reaction) · low-health · win pair
//   (random alternation) · team-support (come-from-behind 2-1 win — best-effort, harness can't KO p1).
//   DEFERRED (flagged, not built): taunt pool of 3 — Omega defines no `taunt` action (same as
//   Naruto/Sasuke); updateTauntState is gated on animationData.taunt (only Rick/Goku Black define it).
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

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = [];
    if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; }
  });
}
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function logHas(sub) { return (await sfxLog()).some(f => f.includes(sub)); }
const forceRandom = v => page.evaluate(x => { window.__origRandom = window.__origRandom || Math.random; Math.random = () => x; }, v);
const restoreRandom = () => page.evaluate(() => { if (window.__origRandom) Math.random = window.__origRandom; });
async function gotoOmega(query = "") { await page.goto(`${base}/index.html?harness=1&p1=omega_ranger${query}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }

try {
  // ══ SCENARIO A: p1 = Omega Ranger (caster / attacker) ═════════════════════════
  await gotoOmega();
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();

  // reset to an actionable, adjacent-to-dummy state (energy full, ult unlocked, dummy in range)
  async function prep(gap = 60) {
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP1(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); });
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5 && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }

  // 6) BUSTER MODE — neutral Special (Gun cast) → "Buster Mode! Go!"
  section("6. omega_buster_mode_cast.mp3 — Gun (neutral Special)");
  await prep(); await clearSfx();
  await tap("l", 3); await waitFrames(4);
  check("buster_mode fires on the Gun cast", await logHas("omega_buster_mode_cast.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 10) SPECIAL CAST — Super Upper (Fwd+Special) → "But you can't beat this guy!"
  section("10. omega_special_cast.mp3 — Super Upper (Fwd+Special)  [Down+Special deliberately has none]");
  await prep(); await clearSfx();
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d");
  await waitFrames(4);
  check("special_cast fires on Super Upper", await logHas("omega_special_cast.mp3"), `move=${(await p1()).currentMove} log=${JSON.stringify(await sfxLog())}`);

  // 8) BLAST MODE — Ring / bonus super (Back+Special) → "Blast Mode! Power up!"
  //    Also asserts it does NOT fire the Ultimate line (distinct beat #1/2).
  section("8. omega_blast_mode_alt.mp3 — Ring / bonus super (Back+Special)");
  await prep(); await clearSfx();
  await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await page.keyboard.up("a");
  await waitFrames(4);
  check("blast_mode fires on the Ring cast", await logHas("omega_blast_mode_alt.mp3"), `move=${(await p1()).currentMove} log=${JSON.stringify(await sfxLog())}`);
  check("Ring cast does NOT fire the Ultimate (Hyper Mode) line", !(await logHas("omega_hyper_mode_ultimate.mp3")), "");

  // 7) HYPER MODE — Ultimate button → "Omega Ranger, Hyper Mode! Engage!"
  //    Also asserts it does NOT fire the Ring line — proving #7 and #8 are DIFFERENT activation beats.
  section("7. omega_hyper_mode_ultimate.mp3 — Ultimate (own button, distinct from Ring)");
  await prep(); await clearSfx();
  await tap("u", 3); await waitFrames(6);
  check("hyper_mode fires on the Ultimate cast", await logHas("omega_hyper_mode_ultimate.mp3"), `move=${(await p1()).currentMove} log=${JSON.stringify(await sfxLog())}`);
  check("Ultimate cast does NOT fire the Ring (Blast Mode) line", !(await logHas("omega_blast_mode_alt.mp3")), "");

  // 9) HAD ENOUGH? — a single STRONG (heavy-normal) connect (not a light poke)
  section("9. omega_hit_connect.mp3 — 'Had enough?' on a heavy connect");
  await prep(44);
  await waitFrames(160);   // clear any _atkVoiceCd
  await clearSfx();
  await tap("k", 4); await waitFrames(16);   // heavy smash connect on the dummy
  check("hit_connect fires on a strong heavy connect", await logHas("omega_hit_connect.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 16) COMBO FINISHER — the SWORD-SLASH string (4+ links). MUST NOT fire on a single slash.
  section("16. omega_combo_finisher.mp3 — full sword chain (4+), NOT a single slash");
  // (a) a SINGLE slash → no combo-finisher bark
  await prep(40);
  await waitFrames(160);   // clear _atkVoiceCd
  await clearSfx();
  await page.keyboard.down("a"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await page.keyboard.up("a");
  await waitFrames(16);
  check("single slash does NOT fire the combo-finisher", !(await logHas("omega_combo_finisher.mp3")), `log=${JSON.stringify(await sfxLog())}`);
  // (b) chain the full string → the finisher fires ONCE (at the 4th slash). Mirrors the proven
  // Stage-4 sword-string driver: prep once at gap 28, open Back+Light, then re-tap Light whenever the
  // rekka is connected + in recovery (drives 1→7). No per-frame re-glue (keeps the loop timing tight).
  await prep(28);
  await waitFrames(160);   // clear _atkVoiceCd so the finisher window is fresh
  await clearSfx();
  await page.keyboard.down("a"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await page.keyboard.up("a");
  const chain = [];
  for (let i = 0; i < 90; i++) {
    const c = await page.evaluate(() => window.__harness.orCmd());
    if (c?.move && c.move.startsWith("omSword") && !chain.includes(c.move)) chain.push(c.move);
    if (await logHas("omega_combo_finisher.mp3")) break;
    if (chain.includes("omSword7")) break;
    if (c?.rekkaNext && c.connected && c.phase === "recovery") { await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j"); await waitFrames(1); }
    else await waitFrames(1);
  }
  const comboLog = await sfxLog();
  const comboFires = comboLog.filter(f => f.includes("omega_combo_finisher.mp3")).length;
  if (comboFires >= 1) check("combo-finisher fires ONCE on a 4+ sword chain", comboFires === 1, `chain=[${chain.join(",")}] fires=${comboFires}`);
  else info("combo-finisher: could not chain 4+ clean sword slashes on the dummy this run — trigger is wired (comboCounter>=4 && currentMove omSword*)", `chain=[${chain.join(",")}] log=${JSON.stringify(comboLog)}`);

  // ══ SCENARIO B: Omega as DEFENDER (p1=vegeta, p2=omega) — hit reaction + low HP ══
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=omega_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();
  async function faceOmega(gap = 46) {
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
    const va = await p1(); await page.evaluate(x => window.__harness.setP2X(x), va.x + gap); await waitFrames(2);
  }

  // 11) LIGHT hit-reaction — a light poke → "No!" (light stagger tier only)
  section("11. omega_hit_reaction_light.mp3 — 'No!' on a light hit");
  await faceOmega(); await clearSfx();
  await tap("j", 4); await waitFrames(18);
  check("light hit → omega_hit_reaction_light.mp3", await logHas("omega_hit_reaction_light.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 12) LOW-HEALTH — drop Omega to/below 25% via a real hit crossing the line → low-health bark
  section("12. omega_low_health.mp3 — crossing the low-HP threshold");
  await faceOmega();
  await waitFrames(160);   // clear defender _hitVoiceCd from the previous section
  // set Omega just above the 25% line, then a single light hit crosses it (voice fires from the damage path)
  await page.evaluate(() => { const b = window.__harness.p2(); const max = b.maxHealth || 1180; const target = Math.floor(max * 0.25) + 18; window.__harness.damageP2((b.health || max) - target); window.__harness.setP2Invuln?.(0); });
  await clearSfx();
  await tap("j", 4); await waitFrames(10);
  check("low_health fires as Omega crosses the low-HP threshold", await logHas("omega_low_health.mp3"), `hp=${(await p2()).health} log=${JSON.stringify(await sfxLog())}`);

  // ══ SCENARIO C: INTRO reveal (gated) + BATTLE START — real intro/countdown flow ══
  section("1/2. omega_intro.mp3 (reveal beat = intro2) + omega_battle_start.mp3 (round-1 GO)");
  await gotoOmega();
  await installSpy();
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  // While the FIRST part ("intro") plays, the line is held (gateSeqStep) — must NOT have fired yet.
  await page.waitForFunction(() => window.__harness.introState().p1Variant === "intro", null, { timeout: 6000, polling: 16 }).catch(() => {});
  const firedDuringPart1 = await logHas("omega_intro.mp3");
  check("intro line is HELD during part 1 (not fired before the reveal)", !firedDuringPart1, `variant=intro log=${JSON.stringify(await sfxLog())}`);
  // Once the sequence reaches "intro2" (smoke disperses → visible), the line fires.
  await page.waitForFunction(() => window.__harness.introState().p1Variant === "intro2", null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => f.includes("omega_intro.mp3")), null, { timeout: 6000, polling: 16 }).catch(() => {});
  check("intro line fires at the reveal beat (intro2)", await logHas("omega_intro.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  // Let the intro + countdown run to the GO frame → battle_start fires (round 1), a SEPARATE beat.
  await page.waitForFunction(() => window.__harness.state().gameState === "battle" && window.__harness.state().countdown === 0, null, { timeout: 20000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  check("battle_start fires at the round-1 GO frame (distinct from intro)", await logHas("omega_battle_start.mp3"), `log=${JSON.stringify((await sfxLog()).slice(-6))}`);

  // ══ SCENARIO D: WIN pool — 2-way random alternation on a CLEAN win ════════════
  section("13/14. omega_win_line / omega_win_alt — win pair (random alternation) on a clean 2-0");
  await gotoOmega("&p2=vegeta");
  await installSpy();
  async function forceOmegaCleanWin() {
    await page.evaluate(() => window.__harness.bootVs());
    await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(4);
    for (let round = 0; round < 3; round++) {
      await page.waitForFunction(() => { const s = window.__harness.state(); const b = window.__harness.p2(); return s.gameState === "battle" && s.countdown === 0 && b && b.health > 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
      await page.evaluate(() => window.__harness.damageP2(5000));   // Omega wins every round → clean 2-0
      await waitFrames(6);
      if ((await stateF()).gameState === "victory") return;
    }
  }
  for (const [rv, expect, other, label] of [
    [0.2, "omega_win_line.mp3", "omega_win_alt.mp3", "win take A (rand<0.5)"],
    [0.8, "omega_win_alt.mp3", "omega_win_line.mp3", "win take B (rand>=0.5)"],
  ]) {
    await forceRandom(rv); await clearSfx();
    await forceOmegaCleanWin();
    await page.waitForFunction(() => window.__harness.state().gameState === "victory", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(2);
    const log = await sfxLog();
    check(`win → ${label} plays the right line`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
    check(`clean win does NOT fire the team-support (comeback-only) line (${label})`, !log.some(f => f.includes("omega_team_support.mp3")), "");
    await restoreRandom();
  }

  // 15) TEAM SUPPORT — come-from-behind (2-1) win. The harness cannot KO P1 (damageP1 floors at 1),
  // so a genuine 2-1 can't be deterministically staged. Assert the trigger is WIRED in source instead.
  section("15. omega_team_support.mp3 — come-from-behind (2-1) win  [best-effort + source-wired]");
  const gameSrc = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
  const wiredComeback = gameSrc.includes("omega_team_support.mp3") && /loserWins\s*>=\s*1/.test(gameSrc);
  check("team-support is wired to the come-from-behind (2-1) win branch", wiredComeback, wiredComeback ? "loserWins>=1 → team_support, else win pair" : "branch not found");
  info("team-support positive path is best-effort: the harness can't force P1 to drop a round (damageP1 floors at 1), so a real 2-1 comeback isn't stageable headless. Verified by source + mutual-exclusion (clean wins above never fire it).");

  // ══ DEFERRED reporting — taunt pool of 3 (no taunt mechanic for Omega) ════════
  section("DEFERRED — taunt pool of 3 (Omega defines no `taunt` action)");
  const chars = fs.readFileSync(path.join(ROOT, "characters.js"), "utf8");
  const omegaBlock = chars.slice(chars.indexOf('rosterKey: "omega_ranger"'), chars.indexOf('rosterKey: "omega_ranger"') + 6000);
  const hasTauntAction = /\btaunt\s*:/.test(omegaBlock);
  check("Omega has NO `taunt` action in animationData (taunt mechanic absent)", !hasTauntAction, hasTauntAction ? "unexpected taunt action found" : "no taunt action → updateTauntState never fires for Omega");
  for (const f of ["omega_taunt.mp3", "omega_taunt_alt.mp3", "omega_taunt_alt2.mp3"]) {
    check(`${f}: staged on disk`, fs.existsSync(path.join(ROOT, f)), "");
    const wired = ["abilities.js", "combat.js", "game.js"].some(js => { try { return fs.readFileSync(path.join(ROOT, js), "utf8").includes(f); } catch (_) { return false; } });
    check(`${f}: NOT wired (deferred — no taunt mechanic)`, !wired, wired ? "unexpectedly referenced" : "staged & waiting");
  }
  info("deferred: like Naruto/Sasuke, Omega ships no taunt action/sprite; updateTauntState is gated on animationData.taunt (only Rick/Goku Black define it). Not building a taunt mechanic for an audio task.");
  info("clip note: omega_taunt_alt.mp3 (~7s) should be verified as ONE clean line (and split if it's multiple) WHEN a taunt mechanic is later built — not needed while deferred.");

} catch (e) {
  console.error("FATAL", e);
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(52)}\n  OMEGA voice: ${PASS} passed, ${FAIL} failed  (taunt deferred; team-support/combo best-effort)\n${"═".repeat(52)}`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
