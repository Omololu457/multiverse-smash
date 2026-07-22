// harness/itachi_voice.test.mjs
// Itachi voice-line wiring proof (audio-only). Spies on SoundManager.playSfxFile and asserts the
// right clip fires at the right beat: 6 casts (fireball/mangekyou/amaterasu/genjutsu/susanoo/sword),
// offense + reaction + low-HP pools, intro pool, and win pool. All 36 clips are pooled in itachiVoice.js.
// Run: node harness/itachi_voice.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
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

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; } }); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function logHas(re) { return (await sfxLog()).some(f => re.test(f)); }
async function goto(q) { await page.goto(`${base}/index.html?harness=1&${q}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }

try {
  // ══ SCENARIO A: p1 = Itachi (caster / attacker) ═══════════════════════════
  await goto("p1=itachi");
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  async function prep(gap = 60) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }
  async function motionSpecial(dir) {
    const lat = dir === "F" ? "d" : "a";
    await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s"); await waitFrames(1);
    await page.keyboard.down(lat); await waitFrames(2); await page.keyboard.up(lat); await waitFrames(1);
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  }
  async function activateMangekyou() {
    await page.evaluate(() => window.__harness.fillEnergy());
    if ((await p1()).mangekyouActive) return;
    await page.keyboard.down("p"); await waitFrames(4); await page.keyboard.up("p"); await waitFrames(3);
  }

  section("cast: Fire Style — 'Katon!'");
  await prep(150); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(3);
  check("fireball → katon_cast", await logHas(/itachi_020_katon_cast/), `log=${JSON.stringify(await sfxLog())}`);

  section("cast: Mangekyou activation — 'eyes see nothing'");
  await prep(60); await page.evaluate(() => window.__harness.expireItachiSusanoo?.()); await clearSfx();
  await activateMangekyou();
  check("Mangekyou → eyes_see_nothing pool", await logHas(/eyes_see_nothing/), `log=${JSON.stringify(await sfxLog())}`);

  section("cast: Amaterasu (QCF, Mangekyou only)");
  await activateMangekyou(); await prep(160); await activateMangekyou(); await clearSfx();
  await motionSpecial("F");
  check("Amaterasu → amaterasu_cast", await logHas(/itachi_000_amaterasu_cast/), `log=${JSON.stringify(await sfxLog())}`);

  section("cast: Genjutsu (QCB hit-confirm)");
  await activateMangekyou(); await prep(42); await activateMangekyou();
  let cc = 0;
  for (let i = 0; i < 6 && cc < 2; i++) { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 40); await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(12); cc = await page.evaluate(() => window.__harness.training().combo); }
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await clearSfx();
  await motionSpecial("B");
  check("Genjutsu → tsukuyomi / finishing_touch", await logHas(/tsukuyomi|finishing_touch/), `combo=${cc} log=${JSON.stringify(await sfxLog())}`);

  section("cast: Susanoo ultimate — 'great spirit'");
  await page.evaluate(() => window.__harness.expireItachiSusanoo?.()); await waitFrames(3);
  await prep(80); await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.fillEnergy(); }); await waitFrames(2); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(4);
  check("Susanoo → great_spirit / yasakani pool", await logHas(/great_spirit|yasakani/), `log=${JSON.stringify(await sfxLog())}`);

  section("cast: Susanoo sword — 'Totsuka'");
  // Wait for the ult's activation attackCooldown to clear (else the SPECIAL press is dropped), and
  // confirm we're actually giant, before swinging.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.itachiSusanoo && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 120); window.__harness.healP2(); }); await waitFrames(2); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(3);
  check("Susanoo sword → totsuka_sword", await logHas(/itachi_001_totsuka_sword/), `giant=${(await p1()).itachiSusanoo} log=${JSON.stringify(await sfxLog())}`);
  await page.evaluate(() => window.__harness.expireItachiSusanoo?.()); await waitFrames(3);

  section("offense pool: strong connect");
  let offFired = false;
  const OFFENSE = /you_are_weak|unfortunate_reality|give_up|no_chance|foolish_one|sink_before|in_the_way|dont_come_near|no_escape|every_technique|how_naive/;
  for (let i = 0; i < 3 && !offFired; i++) {
    await prep(46); await page.evaluate(() => { window.__harness.setP2Invuln?.(0); const f = window.__harness.p1(); f._atkVoiceCd = 0; }); await clearSfx();
    await page.keyboard.down("k"); await waitFrames(5); await page.keyboard.up("k"); await waitFrames(16);
    offFired = await logHas(OFFENSE);
  }
  check("strong heavy connect → offense pool bark", offFired, `log=${JSON.stringify(await sfxLog())}`);

  // ══ INTRO pool (real intro flow) ═════════════════════════════════════════
  section("intro pool");
  await goto("p1=itachi");
  await installSpy(); await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /stay_calm_opening|fight_pointless|take_down_any_enemy/.test(f)), null, { timeout: 9000, polling: 16 }).catch(() => {});
  check("intro → one of the opening pool", await logHas(/stay_calm_opening|fight_pointless|take_down_any_enemy/), `log=${JSON.stringify(await sfxLog())}`);

  // ══ WIN pool ═════════════════════════════════════════════════════════════
  section("win pool");
  await goto("p1=itachi");
  await page.evaluate(() => window.__harness.bootVs());
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 8000, polling: 16 }).catch(() => {});
  await installSpy();
  let winFired = false;
  for (let r = 0; r < 3 && !winFired; r++) {
    await page.waitForFunction(() => { const s = window.__harness.state(); const b = window.__harness.p2(); return s.gameState === "battle" && s.countdown === 0 && b && b.health > 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
    await clearSfx();
    await page.evaluate(() => window.__harness.damageP2(9999));
    await waitFrames(30);
    winFired = await logHas(/win_is_easy|its_already_over|you_lose/);
  }
  check("win → one of the win pool", winFired, `log=${JSON.stringify(await sfxLog())}`);

  // ══ SCENARIO B: p1 = attacker, p2 = Itachi (defender voices) ══════════════
  section("reaction + low-HP (Itachi as defender)");
  await goto("p1=naruto&p2=itachi");
  await page.evaluate(() => window.__harness.boot());
  await installSpy();
  async function prepB(gap = 40) {
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.setP2Invuln?.(0); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }
  // reaction: land a hit on Itachi(p2) → calm-observation pool
  let reactFired = false;
  for (let i = 0; i < 3 && !reactFired; i++) {
    await page.evaluate(() => { window.__harness.healP2(); const b = window.__harness.p2(); b._hitVoiceCd = 0; });
    await prepB(40); await clearSfx();
    await page.keyboard.down("k"); await waitFrames(5); await page.keyboard.up("k"); await waitFrames(14);
    reactFired = await logHas(/naruhodo_i_see|quick_arent_you/);
  }
  check("Itachi hit → reaction pool", reactFired, `log=${JSON.stringify(await sfxLog())}`);

  // low-HP: pre-damage Itachi(p2) to ~26%, then land a hit to cross the 25% line
  let lowFired = false;
  for (let i = 0; i < 3 && !lowFired; i++) {
    await prepB(40);
    await page.evaluate(() => { window.__harness.setP2Invuln?.(0); const m = window.__harness.p2().maxHealth || 1170; window.__harness.damageP2(Math.floor(m * 0.74)); });
    await waitFrames(2); await clearSfx();
    await page.keyboard.down("k"); await waitFrames(5); await page.keyboard.up("k"); await waitFrames(14);
    lowFired = await logHas(/not_yet_fallen/);
  }
  check("Itachi crosses low-HP → not_yet_fallen", lowFired, `log=${JSON.stringify(await sfxLog())}`);

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Itachi voice: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
