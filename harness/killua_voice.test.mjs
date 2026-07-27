// harness/killua_voice.test.mjs — Killua Zoldyck voice-line wiring (audio-only).
// Proves: (1) every pool randomizes + all 83 clips are categorized exactly once (deterministic, via the
// killuaVoicePick/killuaVoicePool harness hooks); (2) the LIVE triggers actually fire the right pool
// (spy on SoundManager.playSfxFile); (3) killuanen_082_charge_complete fires PRECISELY once on charge-
// animation completion. Japanese "Nen Impact" pack (killuanen_*), kept intentionally.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

// ── SOUND SPY (mirrors rick/naruto voice tests) — wrap playSfxFile, record every cue ──
async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = s._sfxSpy || [];
    if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; }
  });
}
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const killuaClips = log => log.filter(f => /^killuanen_/.test(f));

async function prep(gap = 70) {
  await waitGrounded();
  // wait for any prior move to fully recover — triggerSpecial / heavy is gated on attackCooldown
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await waitFrames(2);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
  await clearSfx();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── POOLS: randomization + full coverage (deterministic, via the same picker the live triggers use) ──
  section("pools randomize + full 83-clip coverage");
  const POOLS = { intro: 1, taunt: 6, specialPalm: 2, specialGodspeed: 2, specialCast: 4, combatBark: 6, hitReact: 5, win: 4 };
  for (const [pool, minDistinct] of Object.entries(POOLS)) {
    const samples = await page.evaluate(p => window.__harness.killuaVoicePick(p, 80), pool);
    const arr = await page.evaluate(p => window.__harness.killuaVoicePool(p), pool);
    const set = new Set(samples);
    const allIn = samples.every(s => arr.includes(s)) && samples.length === 80;
    check(`pool '${pool}' fires + randomizes (${arr.length} clips)`, allIn && set.size >= Math.min(minDistinct, arr.length), `distinct=${set.size}/${arr.length}`);
  }
  // Coverage: union of all pools + the charge-complete clip === exactly the 83 killuanen_* files on disk.
  const diskFiles = fs.readdirSync(ROOT).filter(f => /^killuanen_.*\.mp3$/.test(f)).sort();
  let wired = ["killuanen_082_charge_complete.mp3"];
  for (const pool of Object.keys(POOLS)) wired = wired.concat(await page.evaluate(p => window.__harness.killuaVoicePool(p), pool));
  const wiredSet = new Set(wired);
  const missing = diskFiles.filter(f => !wiredSet.has(f));
  const dupes = wired.length !== wiredSet.size;
  const extra = wired.filter(f => !diskFiles.includes(f));
  check("all 83 clips present on disk", diskFiles.length === 83, `disk=${diskFiles.length}`);
  check("every clip categorized exactly once (no dupes/omissions)", wired.length === 83 && missing.length === 0 && !dupes && extra.length === 0, `wired=${wired.length} missing=${missing.length} extra=${extra.length}`);

  // ── LIVE: INTRO (round-1 match start) ──
  section("live triggers (spy on playSfxFile)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());   // real match → INTRO phase runs maybeFireIntroVoice
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /killuanen_000_intro/.test(f)), null, { timeout: 12000, polling: 16 }).catch(() => {});
  check("INTRO fires killuanen_000", (await sfxLog()).some(f => /killuanen_000_intro/.test(f)), "");

  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── LIVE: offense connect (heavy lands on p2) → combatBark (or ~30% taunt). FIRST combat action so the
  //         shared _atkVoiceCd (150f, set by any connect) is still fresh. ──
  await prep(50);
  await page.keyboard.down("k"); await waitFrames(4); await page.keyboard.up("k"); await waitFrames(20);
  const off = killuaClips(await sfxLog());
  check("offense connect fires a combat bark / taunt one-liner", off.length >= 1, `${off.join(",")}`);

  // ── LIVE: CHARGE-COMPLETE (the precise event) — hold P, buildup animation finishes → 082 fires ONCE ──
  await prep();
  await page.keyboard.down("p");
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /killuanen_082_charge_complete/.test(f)), null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(120);   // keep charging well past the first loop — must NOT re-fire
  await page.keyboard.up("p");
  const chargeLog = killuaClips(await sfxLog());
  const c082 = chargeLog.filter(f => /killuanen_082/.test(f));
  check("charge-complete fires killuanen_082 on charge-animation completion", c082.length >= 1, `hits=${c082.length}`);
  check("charge-complete fires EXACTLY once per charge (not spammed each loop)", c082.length === 1, `hits=${c082.length}`);

  // ── LIVE: Yo-Yo (neutral Special) → specialCast pool ──
  await prep();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
  const yoyo = killuaClips(await sfxLog());
  check("Yo-Yo cast fires a specialCast bark", yoyo.some(f => /_(can_you_block_this|here_i_go|can_you_see_it|numb_up|try_to_dodge|how_about_this|here_i_go_alt|watch_this)/.test(f)), `${yoyo.join(",")}`);

  // ── LIVE: Lightning Palm (Fwd+Special) → specialPalm pool (PROVISIONAL pairing) ──
  await prep(60);
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(4); await page.keyboard.up("d"); await waitFrames(4);
  const palm = killuaClips(await sfxLog());
  check("Lightning Palm cast fires a specialPalm callout (gale/jinnai) [PROVISIONAL]", palm.some(f => /_special_(gale|jinnai|gale_jinnai_alt)/.test(f)), `${palm.join(",")}`);

  // ── LIVE: Electric Ball (Down+Special) → specialCast pool ──
  await prep();
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("s"); await waitFrames(6);
  const eball = killuaClips(await sfxLog());
  check("Electric Ball cast fires a specialCast bark", eball.some(f => /_(can_you_block_this|here_i_go|can_you_see_it|numb_up|try_to_dodge|how_about_this|here_i_go_alt|watch_this)/.test(f)), `${eball.join(",")}`);

  // ── LIVE: hit reaction (p2 hits Killua) → hitReact pool ──
  await prep(0);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 30); window.__harness.healP2?.(); });
  await waitFrames(1); await clearSfx();
  await page.evaluate(() => window.__harness.p2Attack?.());
  await waitFrames(24);
  const react = killuaClips(await sfxLog());
  check("hit reaction fires a hitReact dismissal", react.some(f => /_(my_bad|damn_it|too_soft|annoying|seriously|underestimating_me|watch_closely|no_way|damn_it_alt|how_lame|how_uncool)/.test(f)), `${react.join(",")}`);

  // ── LIVE: Godspeed ultimate → specialGodspeed pool (PROVISIONAL pairing) ──
  await prep();
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.fillEnergy?.(); });
  await waitFrames(2); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(8);
  const gs = killuaClips(await sfxLog());
  check("Godspeed ultimate fires a specialGodspeed callout (lightning_speed/thunder_god) [PROVISIONAL]", gs.some(f => /_special_(thunder_god_1|lightning_speed|thunder_god_2)/.test(f)), `${gs.join(",")}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Killua voice lines: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
