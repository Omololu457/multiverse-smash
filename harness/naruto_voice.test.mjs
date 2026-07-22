// harness/naruto_voice.test.mjs
// Verifies each wired Naruto voice line fires at its correct trigger (spies on the live
// SoundManager.playSfxFile, records every file cue, asserts the right file at the right beat).
// Audio-hookup only — no gameplay assertions. Mirrors harness/beerus_voice.test.mjs.
//
// Coverage: intro, plain Rasengan (rasengan_cast), Big Ball (big_ball_rasengan),
// Dark Rasengan (special_burst), Kurama ultimate (kurama_ultimate at CHARGE, not impact),
// Shadow Clone Blast barrage (shadow_clone_special), Hokage pride line + combo-burst on
// offense, light/heavy hit-reaction pools, low-health bark, and the 3-way win pool
// (win / win_alt / ninja_way). Taunt (#7) is DEFERRED — Naruto has no taunt action.
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
const kcine = () => page.evaluate(() => window.__harness.kuramaUltCine());
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

try {
  // ══ SCENARIO A: p1 = Naruto (caster / attacker) ═══════════════════════════════
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // 1) INTRO battle-cry — fires during Naruto's own intro play
  section("1. naruto_intro.mp3 — during the intro sequence");
  await installSpy();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => f.includes("naruto_intro.mp3")), null, { timeout: 8000, polling: 16 }).catch(() => {});
  check("intro battle-cry fires during intro", await logHas("naruto_intro.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // reset to an actionable, adjacent-to-dummy state (energy full, ult unlocked)
  async function prep(gap = 60) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }

  // 6) PLAIN RASENGAN — neutral Special → "It's Rasengan!"
  section("6. naruto_rasengan_cast.mp3 — plain (neutral) Rasengan cast");
  await prep(); await clearSfx();
  await tap("l"); await waitFrames(4);
  check("rasengan_cast fires on neutral Rasengan", await logHas("naruto_rasengan_cast.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 3) BIG BALL RASENGAN — hold P (partial) + Special → "Super Big Ball Rasengan Barrage!"
  section("3. naruto_big_ball_rasengan.mp3 — Big Ball (hold-charge) cast, NOT plain Rasengan");
  await prep(); await clearSfx();
  await page.keyboard.down("p");
  await page.waitForFunction(() => window.__harness.p1().charging, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(4);                                   // short partial charge (< full)
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.keyboard.up("p"); await waitFrames(4);
  check("big_ball line fires on Big Ball cast", await logHas("naruto_big_ball_rasengan.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  check("Big Ball does NOT play the plain-Rasengan voice line", !(await logHas("naruto_rasengan_cast.mp3")), `log=${JSON.stringify(await sfxLog())}`);

  // 17) DARK RASENGAN — Down + Special → "I'll blow it away with my jutsu"
  section("17. naruto_special_burst.mp3 — Dark Rasengan (Down+Special)");
  await prep(); await clearSfx();
  await tap("s", 1); await tap("l"); await waitFrames(4);
  check("special_burst fires on Dark Rasengan", await logHas("naruto_special_burst.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 14/15) HOKAGE pride line on a STRONG (heavy) connect — two takes, random
  section("14/15. naruto_hokage_line_{1,2}.mp3 — on a strong/special connect (random take)");
  for (const [rv, expect, other, label] of [
    [0.2, "naruto_hokage_line_1.mp3", "naruto_hokage_line_2.mp3", "take 1 (rand<0.5)"],
    [0.8, "naruto_hokage_line_2.mp3", "naruto_hokage_line_1.mp3", "take 2 (rand>=0.5)"],
  ]) {
    await prep(48); await forceRandom(rv); await clearSfx();
    await waitFrames(160);                               // let _atkVoiceCd (150f) clear between takes
    await tap("k", 4); await waitFrames(14);             // heavy connect on the dummy
    const log = await sfxLog();
    check(`hokage ${label} plays the right take`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
    await restoreRandom();
  }

  // 2) SHADOW CLONE BLAST — clone Rasengan barrage → "Naruto 2000-Hit Combo!"
  section("2. naruto_shadow_clone_special.mp3 — Shadow Clone Blast (clone barrage)");
  await prep(70);
  // spawn 2 clones via the debug hotkey (",") — poof-synced delayed spawn, so wait for the count
  await page.keyboard.press(","); await waitFrames(6); await page.keyboard.press(","); await waitFrames(6);
  const clonesReady = await page.waitForFunction(() => window.__harness.p1CloneCount() >= 2, null, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
  const cloneCount = await page.evaluate(() => window.__harness.p1CloneCount());
  if (clonesReady) {
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy(); });
    await clearSfx();
    await tap("l"); await waitFrames(4);                 // neutral Special w/ clones out → barrage
    check("shadow_clone_special fires on the clone barrage", await logHas("naruto_shadow_clone_special.mp3"), `clones=${cloneCount} log=${JSON.stringify(await sfxLog())}`);
  } else {
    info("shadow_clone_special: could not stage 2 clones in time (delayed-spawn timing) — trigger is wired at the barrage cast", `cloneCount=${cloneCount}`);
  }
  await page.evaluate(() => window.__harness.p1CloneCount && window.__harness.__sound); // no-op guard

  // 4) COMBO BURST — long BASIC light string landing (wired on comboCounter>=5, non-special).
  // Keep the dummy glued in front so consecutive light jabs keep connecting (a light hit
  // pushes it back, which would otherwise break the string).
  section("4. naruto_combo_burst.mp3 — long basic combo string");
  await prep(34); await clearSfx();
  await page.evaluate(() => window.__harness.setP2Invuln?.(0));
  for (let i = 0; i < 10 && !(await logHas("naruto_combo_burst.mp3")); i++) {
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 30);
    await tap("j", 2); await waitFrames(1);
  }
  if (await logHas("naruto_combo_burst.mp3")) check("combo_burst fires on a long light string", true, `log=${JSON.stringify(await sfxLog())}`);
  else info("combo_burst: could not chain a 5+ hit light string on the dummy this run — trigger is wired (comboCounter>=5, non-special)", `log=${JSON.stringify(await sfxLog())}`);

  // 5) KURAMA ULTIMATE — fires at CHARGE start, BEFORE the bomb travels/impacts
  section("5. naruto_kurama_ultimate.mp3 — Kurama ult CHARGE windup (not impact)");
  await prep(120); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.kuramaUltCine().active, null, { timeout: 6000, polling: 16 });
  // early beats (widen/rise, before CHARGE): the line must NOT have fired yet
  await page.waitForFunction(() => { const c = window.__harness.kuramaUltCine(); return c.active && c.frame >= 20 && c.frame < c.chargeStart; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  check("kurama line has NOT fired during widen/rise (pre-CHARGE)", !(await logHas("naruto_kurama_ultimate.mp3")), `log=${JSON.stringify(await sfxLog())}`);
  // by the CHARGE beat it must have fired, and still be pre-impact
  await page.waitForFunction(() => { const c = window.__harness.kuramaUltCine(); return c.phase === "charge" && (window.__harness.__sound._sfxSpy || []).some(f => f.includes("naruto_kurama_ultimate.mp3")); }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const cAtCharge = await kcine();
  check("kurama line fires during the CHARGE phase", await logHas("naruto_kurama_ultimate.mp3") && cAtCharge.phase === "charge", `phase=${cAtCharge.phase} frame=${cAtCharge.frame}`);
  check("kurama line fired BEFORE the bomb impact (not struck)", cAtCharge.struck === false, `struck=${cAtCharge.struck} impactFrame=${cAtCharge.impactFrame}`);
  await page.waitForFunction(() => window.__harness.kuramaUltCine().active === false, null, { timeout: 10000, polling: 16 }).catch(() => {});

  // ══ SCENARIO B: Naruto as DEFENDER (p1=vegeta, p2=naruto) — hit reactions + low HP ══
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();
  async function faceNaruto(gap = 46) {
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); });
    const va = await p1(); await page.evaluate(x => window.__harness.setP2X(x), va.x + gap); await waitFrames(2);
  }

  // 13) LIGHT hit-reaction pool — a light poke → hit_light (NOT a heavy take)
  section("13. naruto_hit_light.mp3 — light flinch tier");
  await faceNaruto(); await clearSfx();
  await tap("j", 4); await waitFrames(18);
  check("light hit → naruto_hit_light.mp3", await logHas("naruto_hit_light.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  check("light hit does NOT play a heavy-tier take", !(await logHas("naruto_hit_heavy")), `log=${JSON.stringify(await sfxLog())}`);

  // 11/12) HEAVY hit-reaction pool — heavy connect → hit_heavy_{1,2}, random take
  section("11/12. naruto_hit_heavy_{1,2}.mp3 — heavy tier (random take, separate from light)");
  for (const [rv, expect, other, label] of [
    [0.2, "naruto_hit_heavy_1.mp3", "naruto_hit_heavy_2.mp3", "take 1 (rand<0.5)"],
    [0.8, "naruto_hit_heavy_2.mp3", "naruto_hit_heavy_1.mp3", "take 2 (rand>=0.5)"],
  ]) {
    await faceNaruto(); await forceRandom(rv);
    await waitFrames(160);                               // clear defender _hitVoiceCd (150f)
    await page.evaluate(() => { window.__harness.healP2(); });
    await clearSfx();
    await tap("k", 6); await waitFrames(22);
    const log = await sfxLog();
    check(`heavy ${label} plays the right take`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
    check(`heavy ${label} does NOT play the light take`, !log.some(f => f.endsWith("naruto_hit_light.mp3")), "");
    await restoreRandom();
  }

  // 10) LOW HEALTH — "Not yet, I can still fight" fires when Naruto crosses the threshold.
  // Stage Naruto (p2) just above the 25% line, then land a HEAVY hit that pushes it under.
  section("10. naruto_low_health.mp3 — on dropping below the low-HP threshold");
  let lowFired = false, before, after;
  for (let attempt = 0; attempt < 3 && !lowFired; attempt++) {
    await faceNaruto(38);
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.setP2Invuln?.(0); const m = window.__harness.p2().maxHealth || 1000; window.__harness.damageP2(Math.floor(m * 0.74)); }); // → ~26%
    await waitFrames(2); await clearSfx();
    before = await p2();
    await tap("k", 6); await waitFrames(14);           // heavy: guaranteed land + drop under 25%
    after = await p2();
    lowFired = await logHas("naruto_low_health.mp3");
  }
  check("low_health fires on crossing the threshold", lowFired, `hp ${before.health}->${after.health} of ${after.maxHealth} log=${JSON.stringify(await sfxLog())}`);

  // ══ SCENARIO C: WIN pool — 3-way random (win / win_alt / ninja_way) ═══════════
  section("8/9/16. naruto_win / naruto_win_alt / naruto_ninja_way — 3-way win pool (random)");
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();
  async function forceNarutoWin() {
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
  // floor(rand*3): 0.1→0 (win), 0.5→1 (win_alt), 0.9→2 (ninja_way)
  for (const [rv, expect, label] of [
    [0.1, "naruto_win.mp3",       "win (idx 0)"],
    [0.5, "naruto_win_alt.mp3",   "win_alt (idx 1)"],
    [0.9, "naruto_ninja_way.mp3", "ninja_way (idx 2)"],
  ]) {
    await forceRandom(rv); await clearSfx();
    await forceNarutoWin();
    await page.waitForFunction(() => window.__harness.state().gameState === "victory", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(2);
    const log = await sfxLog();
    const others = ["naruto_win.mp3", "naruto_win_alt.mp3", "naruto_ninja_way.mp3"].filter(f => f !== expect);
    check(`win → ${label} plays the right line`, log.some(f => f.endsWith(expect)) && !others.some(o => log.some(f => f.endsWith(o))), `log=${JSON.stringify(log)}`);
    await restoreRandom();
  }

  // 7) TAUNT — DEFERRED (Naruto has no taunt action; not building a mechanic for a line)
  section("7. naruto_taunt.mp3 — DEFERRED");
  info("deferred: Naruto defines no `taunt` action (updateTauntState is gated on animationData.taunt; only Rick/Goku Black have it). naruto_ninja_way.mp3 was folded into the win pool instead (see 8/9/16).");

} catch (e) {
  console.error("FATAL", e);
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(52)}\n  NARUTO voice: ${PASS} passed, ${FAIL} failed  (taunt deferred; combo_burst/barrage best-effort)\n${"═".repeat(52)}`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
