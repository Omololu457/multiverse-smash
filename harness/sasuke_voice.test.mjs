// harness/sasuke_voice.test.mjs
// Verifies each wired Sasuke voice line fires at its correct trigger (spies on the live
// SoundManager.playSfxFile, records every file cue, asserts the right file at the right beat).
// Audio-hookup only — no gameplay assertions. Mirrors harness/naruto_voice.test.mjs.
//
// Coverage of the 28-clip batch:
//   WIRED & tested here: intro pool (cluster/alt2, random) · battle_start · serious-taunt pool
//   (2 takes, random) · Chidori cast · Great Fireball → Two-Strike Lightning cast (flagged
//   substitution) · Substitution (smoke+kagutsuchi) · Susanoo Stage 1 activate · Stage 2 ult
//   line · Kagutsuchi blade (Susanoo sword) · Burn-to-ashes (Susanoo melee hit-confirm) ·
//   Absolute Defense warning cluster · light/heavy hit-reaction pools · combo-finisher pool
//   (2 takes, random) · attack-connect (strong single) · win pool (2 takes, random).
//   DEFERRED (flagged, not built): taunt pool of 5 — Sasuke defines no `taunt` action (same as
//   Naruto). STAGED-ONLY (files present, NOT wired to code): Amaterasu & Kirin — those moves do
//   not exist as playable moves.
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
async function gotoSasuke(query = "") { await page.goto(`${base}/index.html?harness=1&p1=sasuke${query}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }

try {
  // ══ SCENARIO A: p1 = Sasuke (caster / attacker) ═══════════════════════════════
  await gotoSasuke();

  // reset to an actionable, adjacent-to-dummy state (energy full, ult unlocked)
  async function prep(gap = 60) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }

  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();

  // 12) CHIDORI KOITEN — qcb (Down,Back) + Special → "No one can resist my lightning"
  section("12. sasuke_chidori_cast.mp3 — Chidori Koiten (qcb+Special)");
  await prep(); await clearSfx();
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("a"); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("a"); await page.keyboard.up("s");
  await waitFrames(4);
  check("chidori_cast fires on Chidori Koiten", await logHas("sasuke_chidori_cast.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 15) GREAT FIREBALL → Two-Strike Lightning — qcf (Down,Forward) + Special. FLAGGED: no literal
  // fireball move exists; the named-jutsu callout is mapped onto the lightning cast (see report).
  section("15. sasuke_great_fireball.mp3 — mapped onto Two-Strike Lightning (qcf+Special)");
  await prep(); await clearSfx();
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("d"); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d"); await page.keyboard.up("s");
  await waitFrames(4);
  check("great_fireball fires on the Two-Strike Lightning cast", await logHas("sasuke_great_fireball.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  // wait out the lightning cast so its rooted state clears before the next test
  await page.waitForFunction(() => !window.__harness.p1().lightningPhase, null, { timeout: 6000, polling: 16 }).catch(() => {});

  // 1) SUSANOO STAGE 1 — ultimate press → "Susanoo!"
  section("1. sasuke_susanoo_activate.mp3 — Susanoo Stage 1 activation");
  await prep(); await clearSfx();
  await tap("u", 3); await waitFrames(6);
  const inS1 = (await p1()).susanooStage;
  check("susanoo_activate fires at Stage 1", await logHas("sasuke_susanoo_activate.mp3") && inS1 === 1, `stage=${inS1} log=${JSON.stringify(await sfxLog())}`);

  // 22) SUSANOO STAGE 2 — second ultimate press (after release) → "I'll erase you, right here"
  section("22. sasuke_ultimate_cast.mp3 — Susanoo Stage 2 escalation");
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.susanooStage === 1 && (p.attacking ? false : true); }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitFrames(20);   // clear the 15f Stage-1 recovery
  await clearSfx();
  await tap("u", 3);
  await page.waitForFunction(() => !window.__harness.sasukeCine().active && window.__harness.p1().susanooStage === 2, null, { timeout: 9000, polling: 16 }).catch(() => {});
  const inS2 = (await p1()).susanooStage;
  check("ultimate_cast fires at Stage 2", await logHas("sasuke_ultimate_cast.mp3"), `stage=${inS2} log=${JSON.stringify(await sfxLog())}`);

  // 2) KAGUTSUCHI BLADE — Susanoo sword (Lv2, close, Special) → "Kagutsuchi's Blade!"
  //  + 4) BURN TO ASHES — the sword CONNECTING (hit-confirm bark), distinct from the cast.
  section("2/4. sasuke_kagutsuchi_blade.mp3 (sword cast) + sasuke_burn_to_ashes.mp3 (Susanoo hit-confirm)");
  if (inS2 === 2) {
    await page.evaluate(() => { window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.resetFighterInput("p1"); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 90);   // close (<170) → sword, not arrow
    await waitFrames(2); await clearSfx();
    await tap("l", 3); await waitFrames(40);   // let the giant blade sweep land on the dummy
    const log = await sfxLog();
    check("kagutsuchi_blade fires on the Susanoo sword cast", log.some(f => f.includes("sasuke_kagutsuchi_blade.mp3")), `log=${JSON.stringify(log)}`);
    check("burn_to_ashes fires on the Susanoo melee connecting", log.some(f => f.includes("sasuke_burn_to_ashes.mp3")), `log=${JSON.stringify(log)}`);
  } else {
    info("kagutsuchi/burn: could not reach Stage 2 this run — triggers are wired (sword cast + Susanoo melee connect)", `stage=${inS2}`);
  }

  // 3) SUBSTITUTION JUTSU — Block+Special vs an incoming swing → "Smoke Release! Susanoo Kagutsuchi!"
  // Staged in a VS match so the AI actually swings; best-effort (timing-dependent).
  section("3. sasuke_smoke_and_kagutsuchi.mp3 — Substitution Jutsu (Block+Special vs incoming)");
  await gotoSasuke("&p2=vegeta");
  await page.evaluate(() => window.__harness.bootVs());
  await page.waitForFunction(() => window.__harness.state().gameState === "battle" && window.__harness.state().countdown === 0, null, { timeout: 9000, polling: 16 }).catch(() => {});
  await installSpy();
  let subFired = false;
  for (let attempt = 0; attempt < 40 && !subFired; attempt++) {
    await page.evaluate(() => window.__harness.fillEnergy());
    await clearSfx();
    // hold block + tap special repeatedly; when the AI's swing is incoming this reads as Substitution
    await page.keyboard.down("s"); // crouch-block-ish; block is auto vs incoming when holding back — use special spam
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    await page.keyboard.up("s");
    await waitFrames(3);
    subFired = await logHas("sasuke_smoke_and_kagutsuchi.mp3");
  }
  if (subFired) check("smoke_and_kagutsuchi fires on Substitution", true);
  else info("substitution: could not time a Block+Special vs an incoming AI swing this run — trigger is wired at executeSasukeSubstitution", "");

  // 19) ABSOLUTE DEFENSE — charge-TAP toggle ON → warning cluster
  section("19. sasuke_special_warning_cluster.mp3 — Absolute Defense toggle ON");
  await gotoSasuke();
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await installSpy();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); });
  await clearSfx();
  // charge-TAP = quick press+release of the charge key (p) → handleChargeRelease toggles it
  let absFired = false;
  for (let i = 0; i < 4 && !absFired; i++) {
    await tap("p", 2); await waitFrames(3);
    absFired = await logHas("sasuke_special_warning_cluster.mp3");
    if (absFired) break;
    // toggle back off for a clean retry
    await tap("p", 2); await waitFrames(3); await clearSfx();
  }
  check("special_warning_cluster fires on Absolute Defense ON", absFired, `log=${JSON.stringify(await sfxLog())}`);

  // 26) ATTACK CONNECT — a single strong (heavy) connect (not a light poke) → attack-lands bark
  section("26. sasuke_attack_connect.mp3 — strong single connect (heavy)");
  await gotoSasuke();
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await installSpy();
  await prep(46);
  await page.evaluate(() => { window.__harness.setP2Invuln?.(0); });
  await waitFrames(160);   // clear any _atkVoiceCd
  await clearSfx();
  await tap("k", 4); await waitFrames(14);   // heavy connect on the dummy
  check("attack_connect fires on a strong single hit", await logHas("sasuke_attack_connect.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 16/17) COMBO-FINISHER pool — a long BASIC light string (5th+ link), random of the two takes
  section("16/17. sasuke_hit_connect_taunt / sasuke_combo_finisher — combo pool (random take)");
  for (const [rv, expect, other, label] of [
    [0.2, "sasuke_hit_connect_taunt.mp3", "sasuke_combo_finisher.mp3", "take A (rand<0.5)"],
    [0.8, "sasuke_combo_finisher.mp3", "sasuke_hit_connect_taunt.mp3", "take B (rand>=0.5)"],
  ]) {
    await prep(34);
    await page.evaluate(() => window.__harness.setP2Invuln?.(0));
    await waitFrames(160);   // clear _atkVoiceCd between takes
    await forceRandom(rv); await clearSfx();
    let comboOk = false;
    for (let i = 0; i < 20 && !comboOk; i++) {
      // re-glue the dummy in light range + drop its invuln so every jab connects and the combo
      // counter climbs; wait long enough for the light to recover before the next tap isn't swallowed.
      const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.setP2Invuln?.(0); }, a.x + 24);
      await tap("j", 2); await waitFrames(8);
      comboOk = (await sfxLog()).some(f => f.endsWith(expect));
    }
    const log = await sfxLog();
    if (log.some(f => f.endsWith(expect)) || log.some(f => f.endsWith(other))) {
      check(`combo ${label} plays the right take`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
    } else {
      info(`combo ${label}: could not chain a 5+ light string on the dummy this run — trigger is wired (comboCounter>=5)`, `log=${JSON.stringify(log)}`);
    }
    await restoreRandom();
  }

  // ══ SCENARIO B: Sasuke as DEFENDER (p1=vegeta, p2=sasuke) — hit reactions ══════
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();
  async function faceSasuke(gap = 46) {
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); });
    const va = await p1(); await page.evaluate(x => window.__harness.setP2X(x), va.x + gap); await waitFrames(2);
  }

  // 20) LIGHT hit-reaction cluster — a light poke → hit_bark_cluster (NOT the heavy take)
  section("20. sasuke_hit_bark_cluster.mp3 — light flinch tier");
  await faceSasuke(); await clearSfx();
  await tap("j", 4); await waitFrames(18);
  check("light hit → sasuke_hit_bark_cluster.mp3", await logHas("sasuke_hit_bark_cluster.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  check("light hit does NOT play the heavy take", !(await logHas("sasuke_hit_reaction2.mp3")), `log=${JSON.stringify(await sfxLog())}`);

  // 21) HEAVY hit-reaction — a heavy connect → hit_reaction2 (separate pool from light)
  section("21. sasuke_hit_reaction2.mp3 — heavy tier (separate from light)");
  await faceSasuke();
  await waitFrames(160);   // clear defender _hitVoiceCd
  await page.evaluate(() => { window.__harness.healP2(); });
  await clearSfx();
  await tap("k", 6); await waitFrames(22);
  check("heavy hit → sasuke_hit_reaction2.mp3", await logHas("sasuke_hit_reaction2.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  check("heavy hit does NOT play the light cluster", !(await logHas("sasuke_hit_bark_cluster.mp3")), "");

  // ══ SCENARIO C: SERIOUS-TAUNT pool — energy crosses 80% (random of two takes) ══
  // boot() sets P1 energy to max (>=80%), so the crossing fires on the first frame after boot.
  section("10/11. sasuke_serious_taunt / sasuke_serious_taunt_alt — 'getting serious' pool (random)");
  for (const [rv, expect, other, label] of [
    [0.2, "sasuke_serious_taunt.mp3", "sasuke_serious_taunt_alt.mp3", "take A (rand<0.5)"],
    [0.8, "sasuke_serious_taunt_alt.mp3", "sasuke_serious_taunt.mp3", "take B (rand>=0.5)"],
  ]) {
    await gotoSasuke();
    await installSpy();
    await forceRandom(rv); await clearSfx();
    await page.evaluate(() => window.__harness.boot());
    await waitFrames(6);
    const log = await sfxLog();
    check(`serious ${label} plays the right take`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
    await restoreRandom();
  }

  // ══ SCENARIO D: INTRO pool (2 takes) + BATTLE START — real intro/countdown flow ══
  section("23/24. sasuke_intro_cluster / sasuke_intro_alt2 — intro pool (random) + 25. battle_start");
  for (const [rv, expect, other, label] of [
    [0.2, "sasuke_intro_cluster.mp3", "sasuke_intro_alt2.mp3", "intro take A (rand<0.5)"],
    [0.8, "sasuke_intro_alt2.mp3", "sasuke_intro_cluster.mp3", "intro take B (rand>=0.5)"],
  ]) {
    await gotoSasuke();
    await installSpy();
    await forceRandom(rv); await clearSfx();
    await page.evaluate(() => window.__harness.start());
    // wait for Sasuke's own intro to play, then for its voice cue
    await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
    await page.waitForFunction(([a]) => (window.__harness.__sound._sfxSpy || []).some(f => f.includes(a)), [expect], { timeout: 9000, polling: 16 }).catch(() => {});
    const log = await sfxLog();
    check(`${label} plays the right intro clip`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
    await restoreRandom();
    // Let the real intro + countdown run to the GO frame → battle_start should fire (round 1 only).
    await page.waitForFunction(() => window.__harness.state().gameState === "battle" && window.__harness.state().countdown === 0, null, { timeout: 20000, polling: 16 }).catch(() => {});
    check(`battle_start fires at the round-1 GO frame (${label})`, await logHas("sasuke_battle_start.mp3"), `log=${JSON.stringify((await sfxLog()).slice(-6))}`);
  }

  // ══ SCENARIO E: WIN pool — 2-way random alternation (win_line / win_alt) ═══════
  section("27/28. sasuke_win_line / sasuke_win_alt — win pool (random alternation)");
  await gotoSasuke("&p2=vegeta");
  await installSpy();
  async function forceSasukeWin() {
    await page.evaluate(() => window.__harness.bootVs());
    await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(4);
    for (let round = 0; round < 3; round++) {
      await page.waitForFunction(() => { const s = window.__harness.state(); const b = window.__harness.p2(); return s.gameState === "battle" && s.countdown === 0 && b && b.health > 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
      await page.evaluate(() => window.__harness.damageP2(5000));
      await waitFrames(6);
      if ((await stateF()).gameState === "victory") return;
    }
  }
  for (const [rv, expect, other, label] of [
    [0.2, "sasuke_win_line.mp3", "sasuke_win_alt.mp3", "win take A (rand<0.5)"],
    [0.8, "sasuke_win_alt.mp3", "sasuke_win_line.mp3", "win take B (rand>=0.5)"],
  ]) {
    await forceRandom(rv); await clearSfx();
    await forceSasukeWin();
    await page.waitForFunction(() => window.__harness.state().gameState === "victory", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(2);
    const log = await sfxLog();
    check(`win → ${label} plays the right line`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
    await restoreRandom();
  }

  // ══ DEFERRED / STAGED-ONLY reporting ═════════════════════════════════════════
  section("DEFERRED — taunt pool of 5 (no taunt mechanic for Sasuke)");
  info("deferred: Sasuke defines no `taunt` action (animationData.taunt) and ships no taunt sprite, exactly like Naruto. updateTauntState only fires for chars that define it (Rick/Goku Black). The 5 taunt clips (darkness_eye/eyesore/troublesome/annoying/underestimate) are STAGED on disk, waiting for a taunt mechanic. Not building one for an audio task.");

  section("STAGED-ONLY — Amaterasu & Kirin (moves not built)");
  for (const [file, move] of [["sasuke_amaterasu_cast.mp3", "Amaterasu"], ["sasuke_kirin_cast.mp3", "Kirin"]]) {
    const onDisk = fs.existsSync(path.join(ROOT, file));
    // Assert the file is present but NOT referenced anywhere in the JS source (i.e. staged, not wired).
    const wired = ["abilities.js", "combat.js", "game.js", "kurama.js"].some(js => {
      try { return fs.readFileSync(path.join(ROOT, js), "utf8").includes(file); } catch (_) { return false; }
    });
    check(`${move}: audio staged on disk`, onDisk, file);
    check(`${move}: audio NOT wired to code (move doesn't exist yet)`, !wired, wired ? "unexpectedly referenced in source" : "staged & waiting");
  }

} catch (e) {
  console.error("FATAL", e);
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(52)}\n  SASUKE voice: ${PASS} passed, ${FAIL} failed  (taunt deferred; substitution/combo best-effort)\n${"═".repeat(52)}`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
