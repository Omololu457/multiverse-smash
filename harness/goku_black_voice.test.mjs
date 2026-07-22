// harness/goku_black_voice.test.mjs
// Verifies each of Goku Black's 8 NEW voice lines fires at its correct trigger (spies on the live
// SoundManager's playSfxFile, records every file cue, asserts the right file appears at the right beat).
// Audio-hookup only — no gameplay/damage assertions. Mirrors harness/beerus_voice.test.mjs.
//
// Coverage:
//   1 goku_black_taunt.mp3          — on the universal hold-Down taunt committing
//   2 goku_black_hit_light.mp3      — on a LIGHT hit taken (flinch, not knockdown)
//   3 goku_black_hit_heavy.mp3      — on a HEAVY/knockdown hit taken (escalated)
//   4 goku_black_taste_divine_fury  — Sword Slash IMPACT beat, ALTERNATING with taste-my-blade
//     + goku-black-taste-my-blade.mp3 (existing) — proven to alternate, not double-fire
//   5 goku_black_ultimate_line.mp3  — Sword Slash WINDUP (cast start), BEFORE the impact line
//   6 goku_black_transform_rose.mp3 — SSJ Rose transform start
//   7+8 goku_black_win / win_alt     — match win, randomly alternating (Math.random override)
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
const swordCine = () => page.evaluate(() => window.__harness.swordCine());
const roseCine = () => page.evaluate(() => window.__harness.ssjRoseCine());
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
async function logHas(sub) { return (await sfxLog()).some(f => f.includes(sub)); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5 && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {}); }

// Enter SSJ Rose (P tap at high energy), wait for the transform cinematic to finish.
async function enterRose() {
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p");
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}
// Press U until the Sword Slash cinematic actually activates (the frame-polled input buffer can miss a
// single press if it lands on a non-actionable frame — retry a few times). Returns true once active.
async function pressUltUntilActive() {
  await page.evaluate(() => window.__harness.resetUlt());   // clear ult cooldown + refill energy (stays in Rose)
  await grounded(); await waitFrames(2);
  for (let i = 0; i < 6; i++) {
    if (await page.evaluate(() => window.__harness.swordCine().active)) return true;
    await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
    if (await page.evaluate(() => window.__harness.swordCine().active)) return true;
  }
  return false;
}
// Cast the Sword Slash ultimate (U) and wait until the STRIKE connect beat has fired.
async function castSwordUlt() {
  await pressUltUntilActive();
  await page.waitForFunction(() => { const c = window.__harness.swordCine(); return c.active && c.struck; }, null, { timeout: 8000, polling: 16 });
}

try {
  // ══ SCENARIO A: p1 = Goku Black ═════════════════════════════════════════════
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();

  async function prep(gap = 120) {
    await grounded();
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP1(); window.__harness.healP2(); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }

  // NOTE ordering: the Rose/Sword-ult sections run FIRST on this fresh boot. The universal taunt commit
  // (below) leaves the in-session input buffer in a state where the ultimate press no longer registers,
  // so the taunt is deliberately run LAST on a reloaded page — each feature verified from a clean state.

  // 6) SSJ ROSE TRANSFORM — transform_rose fires at cinematic start
  section("6. goku_black_transform_rose.mp3 — SSJ Rose transform start");
  await prep(); await clearSfx();
  await enterRose();
  check("transform_rose fires on Rose activation", await logHas("goku_black_transform_rose.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  const roseActive = await page.evaluate(() => window.__harness.p1().currentForm);
  check("Goku Black is now in SSJ Rose form", roseActive === "ssjRose", `currentForm=${roseActive}`);

  // 5) SWORD SLASH WINDUP — ultimate_line fires at CAST start, BEFORE the impact line
  section("5. goku_black_ultimate_line.mp3 — Sword Slash WINDUP (before impact)");
  await clearSfx();
  const activated = await pressUltUntilActive();
  check("Sword Slash cinematic activated", activated, "");
  // catch the cinematic mid-WINDUP (before the struck beat)
  await page.waitForFunction(() => { const c = window.__harness.swordCine(); return c.active; }, null, { timeout: 6000, polling: 16 });
  await waitFrames(3);
  const cWind = await swordCine();
  check("ultimate_line fired during WINDUP (not yet struck)", await logHas("goku_black_ultimate_line.mp3") && cWind.struck === false, `phase=${cWind.phase} struck=${cWind.struck}`);
  check("impact lines have NOT fired yet at windup", !(await logHas("taste")), `log=${JSON.stringify(await sfxLog())}`);
  // let it reach + pass the impact beat
  await page.waitForFunction(() => { const c = window.__harness.swordCine(); return c.struck; }, null, { timeout: 8000, polling: 16 });
  await waitFrames(2);

  // 4) SWORD SLASH IMPACT — taste-my-blade / taste-divine-fury ALTERNATE across casts
  section("4. taste-my-blade ↔ taste_divine_fury — alternate at IMPACT, never double-fire");
  // this first cast already happened above (section 5). Capture which impact line it played.
  const firstImpactLog = await sfxLog();
  const firstBlade  = firstImpactLog.some(f => f.includes("taste-my-blade"));
  const firstFury   = firstImpactLog.some(f => f.includes("taste_divine_fury"));
  check("cast #1 impact played EXACTLY ONE of the two lines (no double-fire)", firstBlade !== firstFury, `blade=${firstBlade} fury=${firstFury}`);
  // wait for the cinematic to fully end, then cast a SECOND ultimate
  await page.waitForFunction(() => !window.__harness.swordCine().active, null, { timeout: 8000, polling: 16 });
  await clearSfx();
  await castSwordUlt();
  await waitFrames(2);
  const secondImpactLog = await sfxLog();
  const secondBlade = secondImpactLog.some(f => f.includes("taste-my-blade"));
  const secondFury  = secondImpactLog.some(f => f.includes("taste_divine_fury"));
  check("cast #2 impact played EXACTLY ONE of the two lines", secondBlade !== secondFury, `blade=${secondBlade} fury=${secondFury}`);
  check("cast #2 line is the OTHER line vs cast #1 (strict alternation)", (firstBlade === secondFury) && (firstFury === secondBlade), `#1 blade=${firstBlade}/fury=${firstFury}  #2 blade=${secondBlade}/fury=${secondFury}`);
  await page.waitForFunction(() => !window.__harness.swordCine().active, null, { timeout: 8000, polling: 16 });

  // 1) TAUNT — universal hold-Down taunt committing (fast-forwarded via setTauntCharge). Runs on a FRESH
  // reload so the earlier ult casts can't interfere (and the taunt likewise can't affect the win below).
  section("1. goku_black_taunt.mp3 — universal taunt commit");
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();
  await prep(200); await clearSfx();
  // Establish an eligible Down-hold FIRST (charge starts accruing), THEN fast-forward near the 600
  // threshold — setting the charge before the keydown registers would get reset by the not-eligible path.
  await page.keyboard.down("s"); await waitFrames(3);
  await page.evaluate(() => window.__harness.setTauntCharge(598));   // one frame shy of the 600 threshold
  await waitFrames(5); await page.keyboard.up("s");
  check("taunt line fires when the taunt commits", await logHas("goku_black_taunt.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  // let any committed taunt animation finish before moving on
  await page.waitForFunction(() => !window.__harness.p1()._tauntPlaying, null, { timeout: 6000, polling: 16 }).catch(() => {});

  // 7+8) WIN lines — random alternation via Math.random override (Beerus pattern)
  section("7+8. goku_black_win.mp3 / goku_black_win_alt.mp3 — on win, randomly alternating");
  async function forceGokuBlackWin() {
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
    [0.2, "goku_black_win.mp3",     "goku_black_win_alt.mp3", "main (rand<0.5)"],
    [0.8, "goku_black_win_alt.mp3", "goku_black_win.mp3",     "alt (rand>=0.5)"],
  ]) {
    await page.evaluate(v => { window.__origRandom = window.__origRandom || Math.random; Math.random = () => v; }, rv);
    await clearSfx();
    await forceGokuBlackWin();
    await page.waitForFunction(() => window.__harness.state().gameState === "victory", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await waitFrames(2);
    const log = await sfxLog();
    check(`win → ${label} plays the right line`, log.some(f => f.endsWith(expect)) && !log.some(f => f.endsWith(other)), `log=${JSON.stringify(log)}`);
  }
  await page.evaluate(() => { if (window.__origRandom) Math.random = window.__origRandom; });

  // ══ SCENARIO B: Goku Black as DEFENDER (p1=vegeta, p2=goku_black) — hit reactions ══
  section("2+3. hit_light (flinch) vs hit_heavy (knockdown) — tier-split reactions");
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();

  // LIGHT hit — flinch, NOT knockdown → hit_light
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); });
  let va = await p1(); await page.evaluate(x => window.__harness.setP2X(x), va.x + 48); await waitFrames(2);
  await clearSfx();
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(20);
  const afterLight = await p2();
  check("LIGHT hit fires goku_black_hit_light.mp3", await logHas("goku_black_hit_light.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  check("LIGHT hit did NOT fire hit_heavy", !(await logHas("goku_black_hit_heavy.mp3")), "");
  check("LIGHT hit did NOT knock down", afterLight.knockdownState !== true, `knockdown=${afterLight.knockdownState}`);

  // let the shared _hitVoiceCd (150f) tick down, then reset the dummy for the heavy hit
  await waitFrames(160);
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.resetFighterInput("p1"); });
  va = await p1(); await page.evaluate(x => window.__harness.setP2X(x), va.x + 48); await waitFrames(2);
  await clearSfx();
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k");
  // knockdown resolves after ~28f — capture it at its peak (the hit_heavy line is gated on it being set)
  const knocked = await page.waitForFunction(() => window.__harness.p2().knockdownState === true, null, { timeout: 2000, polling: 16 }).then(() => true).catch(() => false);
  await waitFrames(20);
  check("HEAVY hit knocked Goku Black down", knocked, `knockdown captured=${knocked}`);
  check("HEAVY/knockdown hit fires goku_black_hit_heavy.mp3", await logHas("goku_black_hit_heavy.mp3"), `log=${JSON.stringify(await sfxLog())}`);
  check("HEAVY hit did NOT fire the light line", !(await logHas("goku_black_hit_light.mp3")), "");

} catch (e) {
  console.error("FATAL", e);
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(52)}\n  GOKU BLACK voice: ${PASS} passed, ${FAIL} failed\n${"═".repeat(52)}`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
