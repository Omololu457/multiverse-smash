// harness/tobirama_voice.test.mjs — Tobirama Senju voice-line wiring (audio-only).
// Proves: (1) every pool randomizes + all 27 clips are categorized exactly once (deterministic, via the
// tobiramaVoicePick/tobiramaVoicePool harness hooks); (2) the LIVE triggers fire the right pool (spy on
// SoundManager.playSfxFile) — intro, Water Dragon cast (PROVISIONAL seiton pairing), Edo Tensei ult cast,
// and the overconfident-taunt connect. Japanese pack (tobirama_*), kept intentionally.
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

async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound;
    s._sfxSpy = s._sfxSpy || [];
    if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; }
  });
}
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const tobiClips = log => log.filter(f => /^tobirama_\d/.test(f));

async function prep(gap = 60) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await waitFrames(2);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
  await clearSfx();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── POOLS: randomization + full coverage ──
  section("pools randomize + full 27-clip coverage");
  const POOLS = { intro: 6, cast: 1, ultimateCast: 3, taunt: 4, finisher: 4 };
  for (const [pool, minDistinct] of Object.entries(POOLS)) {
    const samples = await page.evaluate(p => window.__harness.tobiramaVoicePick(p, 80), pool);
    const arr = await page.evaluate(p => window.__harness.tobiramaVoicePool(p), pool);
    const set = new Set(samples);
    const allIn = samples.every(s => arr.includes(s)) && samples.length === 80;
    check(`pool '${pool}' fires + randomizes (${arr.length} clips)`, allIn && set.size >= Math.min(minDistinct, arr.length), `distinct=${set.size}/${arr.length}`);
  }
  const diskFiles = fs.readdirSync(ROOT).filter(f => /^tobirama_\d.*\.mp3$/.test(f)).sort();
  let wired = [];
  for (const pool of Object.keys(POOLS)) wired = wired.concat(await page.evaluate(p => window.__harness.tobiramaVoicePool(p), pool));
  const wiredSet = new Set(wired);
  const missing = diskFiles.filter(f => !wiredSet.has(f));
  const extra = wired.filter(f => !diskFiles.includes(f));
  check("all 27 clips present on disk", diskFiles.length === 27, `disk=${diskFiles.length}`);
  check("every clip categorized exactly once (no dupes/omissions)", wired.length === 27 && missing.length === 0 && wired.length === wiredSet.size && extra.length === 0, `wired=${wired.length} missing=${missing.length} extra=${extra.length}`);

  // ── LIVE: INTRO (round-1 match start) ──
  section("live triggers (spy on playSfxFile)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /^tobirama_\d/.test(f)), null, { timeout: 12000, polling: 16 }).catch(() => {});
  const introLog = tobiClips(await sfxLog());
  const introPool = await page.evaluate(() => window.__harness.tobiramaVoicePool("intro"));
  check("INTRO fires a will-of-fire declaration", introLog.some(f => introPool.includes(f)), `${introLog.join(",")}`);

  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── LIVE: offense connect (heavy lands on p2) → taunt pool. FIRST so shared _atkVoiceCd is fresh. ──
  await prep(46);
  await page.keyboard.down("k"); await waitFrames(4); await page.keyboard.up("k"); await waitFrames(20);
  const off = tobiClips(await sfxLog());
  const tauntPool = await page.evaluate(() => window.__harness.tobiramaVoicePool("taunt"));
  check("offense connect fires an overconfident taunt", off.some(f => tauntPool.includes(f)), `${off.join(",")}`);

  // ── LIVE: Water Dragon (neutral Special) → cast (PROVISIONAL seiton pairing) ──
  await prep();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
  const cast = tobiClips(await sfxLog());
  check("Water Dragon cast fires the seiton callout [PROVISIONAL]", cast.some(f => /_special_cast_seiton/.test(f)), `${cast.join(",")}`);

  // ── LIVE: Edo Tensei ULTIMATE → ultimateCast pool ──
  await prep();
  await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.fillEnergy?.(); window.__harness.edoBackup.setBackup("sasuke"); });
  await waitFrames(2); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(6);
  const ult = tobiClips(await sfxLog());
  const ultPool = await page.evaluate(() => window.__harness.tobiramaVoicePool("ultimateCast"));
  check("Edo Tensei ultimate fires an ultimate-cast callout", ult.some(f => ultPool.includes(f)), `${ult.join(",")}`);
  await page.evaluate(() => window.__harness.edoBackup.skipCine());   // clean up the summon cinematic

  // ── WIN pool: randomization proven above; the live win fires pickTobiramaVoice("finisher") in
  //    _checkMatchOver (same mirror as Killua/Rick's verified win blocks). ──
  check("finisher/win pool wired (for_the_future_forward present)", (await page.evaluate(() => window.__harness.tobiramaVoicePool("finisher"))).includes("tobirama_026_for_the_future_forward.mp3"), "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Tobirama voice lines: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
