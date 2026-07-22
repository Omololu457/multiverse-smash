// harness/beerus_voice.test.mjs
// Verifies each Beerus voice line fires at its correct trigger (spies on the live
// SoundManager's playSfxFile, records every file cue, asserts the right file appears
// at the right beat). Audio-hookup only — no gameplay assertions.
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
const section = t => console.log(`\n── ${t} ──────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.beerusUltCine());
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

try {
  // ══ SCENARIO A: p1 = Beerus ═════════════════════════════════════════════
  await page.goto(`${base}/index.html?harness=1&p1=beerus`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // 1) INTRO — fires at the REVEAL beat (not frame 0)
  section("1. beerus_intro.mp3 — at the intro reveal beat");
  await installSpy();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  // NOT at frame 0: reveal hide=10, so it must not have fired in the first few frames
  await waitFrames(4);
  const earlyFired = await logHas("beerus_intro.mp3");
  check("intro line does NOT fire at frame 0 (empty-stage beat first)", !earlyFired, `log=${JSON.stringify(await sfxLog())}`);
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => f.includes("beerus_intro.mp3")), null, { timeout: 6000, polling: 16 }).catch(() => {});
  check("intro line fires at the reveal beat", await logHas("beerus_intro.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // helper: reset to an actionable adjacent state
  async function prep(gap = 120) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }

  // 7) KI BLAST — special_cast_1
  section("7. beerus_special_cast_1.mp3 — Ki Blast (neutral Special)");
  await prep(); await clearSfx();
  await tap("l"); await waitFrames(4);
  check("cast_1 fires on Ki Blast", await logHas("beerus_special_cast_1.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 8) FORWARD PUSH — special_cast_2
  section("8. beerus_special_cast_2.mp3 — Forward Push (QCF)");
  await prep(); await clearSfx();
  await tap("s", 1); await tap("d", 1); await tap("l"); await waitFrames(4);
  check("cast_2 fires on Forward Push", await logHas("beerus_special_cast_2.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  check("cast_2 is DISTINCT from cast_1 (no cast_1 here)", !(await logHas("beerus_special_cast_1.mp3")), "");

  // 3) HAKAI — hakai_activate
  section("3. beerus_hakai_activate.mp3 — on Hakai cast (U+Special)");
  await prep(); await clearSfx();
  await tap("w", 1); await tap("l"); await waitFrames(4);
  check("hakai line fires on Hakai cast", await logHas("beerus_hakai_activate.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 4) ULTIMATE — ultimate_activate at CHARGE start (NOT impact)
  section("4. beerus_ultimate_activate.mp3 — Ki Ball CHARGE start (not impact)");
  await prep(); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  // wait until a few frames into the cinematic (past the f===6 fire point) but still in CHARGE
  await page.waitForFunction(() => { const c = window.__harness.beerusUltCine(); return c.active && c.frame >= 10; }, null, { timeout: 6000, polling: 16 });
  const cAtCharge = await cine();
  check("ult line already fired during CHARGE phase", await logHas("beerus_ultimate_activate.mp3") && cAtCharge.phase === "charge", `phase=${cAtCharge.phase} frame=${cAtCharge.frame}`);
  check("ult line fired BEFORE the impact beat (not struck yet)", cAtCharge.struck === false, `struck=${cAtCharge.struck} impactFrame=${cAtCharge.impactFrame}`);
  // let the cinematic finish
  await page.waitForFunction(() => window.__harness.beerusUltCine().active === false, null, { timeout: 8000, polling: 16 });

  // 5+6) WIN lines — random alt between beerus_win / beerus_win_alt across several wins
  section("5+6. beerus_win.mp3 / beerus_win_alt.mp3 — on match win, randomly alternating");
  async function forceBeerusWin() {
    // bootVs = NON-training vs-CPU match; training mode's checkRoundEnd skips round/match
    // resolution, so victory (and the win voice) never fire under plain boot().
    await page.evaluate(() => window.__harness.bootVs());
    await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(4);
    for (let round = 0; round < 3; round++) {
      // wait until a live battle round with p2 alive
      await page.waitForFunction(() => { const s = window.__harness.state(); const b = window.__harness.p2(); return s.gameState === "battle" && s.countdown === 0 && b && b.health > 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
      await page.evaluate(() => window.__harness.damageP2(5000));
      await waitFrames(6);
      const gs = (await stateF()).gameState;
      if (gs === "victory") return;
    }
    return;
  }
  // DETERMINISTIC alternation proof: override Math.random to force each coin-flip branch, so BOTH
  // win files are proven reachable/wired without relying on chance across many slow full matches.
  for (const [rv, expect, other, label] of [
    [0.2, "beerus_win.mp3",     "beerus_win_alt.mp3", "main (rand<0.5)"],
    [0.8, "beerus_win_alt.mp3", "beerus_win.mp3",     "alt (rand>=0.5)"],
  ]) {
    await page.evaluate(v => { window.__origRandom = window.__origRandom || Math.random; Math.random = () => v; }, rv);
    await clearSfx();
    await forceBeerusWin();
    // victory is the proof the win fired; the log proves WHICH line (forceBeerusWin's own return can
    // race the transition, so rely on the victory-wait + log, not its bool)
    await page.waitForFunction(() => window.__harness.state().gameState === "victory", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(2);
    const log = await sfxLog();
    check(`win → ${label} plays the right line`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
  }
  await page.evaluate(() => { if (window.__origRandom) Math.random = window.__origRandom; });   // restore native Math.random

  // ══ SCENARIO B: Beerus as DEFENDER (p1=vegeta, p2=beerus) — hit reaction ══
  section("9. beerus_hit_reaction.mp3 — on a HEAVY hit taken (not light pokes)");
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=beerus`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();
  // position beerus(p2) right in front of vegeta(p1)
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); });
  const va = await p1(); await page.evaluate(x => window.__harness.setP2X(x), va.x + 48); await waitFrames(2);
  // LIGHT first — should NOT trigger the reaction
  await clearSfx();
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(18);
  check("light hit does NOT trigger the reaction", !(await logHas("beerus_hit_reaction.mp3")), `log=${JSON.stringify(await sfxLog())}`);
  // HEAVY — should trigger it
  await page.evaluate(() => { window.__harness.healP2(); }); const va2 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), va2.x + 48); await waitFrames(2);
  await clearSfx();
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(22);
  check("heavy hit triggers beerus_hit_reaction.mp3", await logHas("beerus_hit_reaction.mp3"), `log=${JSON.stringify(await sfxLog())}`);

  // 2) TAUNT — deferred (no taunt mechanic in Beerus's build)
  section("2. beerus_taunt.mp3 — DEFERRED (Beerus has no taunt move)");
  console.log("  ⏭  deferred: Beerus has no taunt action/mechanic (universal hold-Down taunt not wired); not building one for an audio line.");

} catch (e) {
  console.error("FATAL", e);
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  BEERUS voice: ${PASS} passed, ${FAIL} failed  (taunt deferred)\n${"═".repeat(44)}`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
