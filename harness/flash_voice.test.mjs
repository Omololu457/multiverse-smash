// harness/flash_voice.test.mjs — The Flash voice-line wiring (audio-only).
// The 120 flashinj2_* clips were TRANSCRIBED (not guessed); only 12 filter-passing clips are wired
// (intro 2 / taunt 4 / hitReact 6). Proves: (1) each wired pool randomizes + references only real files;
// (2) the named-character clips are NOT wired (filter correctness); (3) the live triggers fire.
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
const flashClips = log => log.filter(f => /^flashinj2_/.test(f));

async function prep(gap = 46) {
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
  await page.goto(`${base}/index.html?harness=1&p1=flash`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── POOLS: randomize + reference only real on-disk files ──
  section("wired pools randomize + reference real files");
  const diskSet = new Set(fs.readdirSync(ROOT).filter(f => /^flashinj2_.*\.mp3$/.test(f)));
  const POOLS = { intro: 2, taunt: 3, hitReact: 4 };
  for (const [pool, minDistinct] of Object.entries(POOLS)) {
    const samples = await page.evaluate(p => window.__harness.flashVoicePick(p, 60), pool);
    const arr = await page.evaluate(p => window.__harness.flashVoicePool(p), pool);
    const set = new Set(samples);
    const allReal = arr.every(f => diskSet.has(f)) && samples.every(s => arr.includes(s));
    check(`pool '${pool}' randomizes + real files (${arr.length} clips)`, allReal && set.size >= Math.min(minDistinct, arr.length), `distinct=${set.size}/${arr.length}`);
  }

  // ── FILTER CORRECTNESS: clips that NAME an opponent must NOT be in any pool ──
  section("project filter — named-character clips excluded");
  const NAMED = ["flashinj2_001_t01m31_6s.mp3", "flashinj2_010_t04m08_2s.mp3", "flashinj2_012_t06m16_8s.mp3", "flashinj2_014_t07m43_1s.mp3", "flashinj2_018_t08m23_7s.mp3"];
  const allWired = [].concat(...await Promise.all(Object.keys(POOLS).map(p => page.evaluate(pp => window.__harness.flashVoicePool(pp), p))));
  const namedLeak = NAMED.filter(f => diskSet.has(f) && allWired.includes(f));
  check("named-opponent clips (Lawton/Floyd/Katniss/Vic/Dinah) not wired", namedLeak.length === 0, `leaked=${namedLeak.length}`);
  check("only verified clips wired (12 total)", allWired.length === 12 && allWired.every(f => diskSet.has(f)), `wired=${allWired.length}`);

  // ── LIVE: INTRO ──
  section("live triggers (spy on playSfxFile)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /^flashinj2_/.test(f)), null, { timeout: 12000, polling: 16 }).catch(() => {});
  const introLog = flashClips(await sfxLog());
  const introPool = await page.evaluate(() => window.__harness.flashVoicePool("intro"));
  check("INTRO fires a Flash intro boast", introLog.some(f => introPool.includes(f)), `${introLog.join(",")}`);

  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── LIVE: offense connect (heavy on p2) → taunt. FIRST so _atkVoiceCd is fresh. ──
  await prep(44);
  await page.keyboard.down("k"); await waitFrames(4); await page.keyboard.up("k"); await waitFrames(20);
  const off = flashClips(await sfxLog());
  const tauntPool = await page.evaluate(() => window.__harness.flashVoicePool("taunt"));
  check("offense connect fires a taunt", off.some(f => tauntPool.includes(f)), `${off.join(",")}`);

  // ── LIVE: hit reaction (p2 hits Flash) → hitReact ──
  await prep(0);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 30); window.__harness.healP2?.(); });
  await waitFrames(1); await clearSfx();
  await page.evaluate(() => window.__harness.p2Attack?.());
  await waitFrames(24);
  const react = flashClips(await sfxLog());
  const hitPool = await page.evaluate(() => window.__harness.flashVoicePool("hitReact"));
  check("hit reaction fires a hitReact clip", react.some(f => hitPool.includes(f)), `${react.join(",")}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Flash voice lines: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
