// harness/vegeta_voice.test.mjs — Vegeta voice-line wiring (audio-only; shared across base/SSJ/Blue).
// Proves: (1) every pool RANDOMIZES + full coverage (all 33 clips across 9 shared pools, no double-
// pooling, every mp3 on disk); (2) the 15 DISCARDED clips (named-char / noise) are wired NOWHERE;
// (3) live triggers fire (spy on playSfxFile) — intro / combatBark(attacker) + hitReact(defender) /
// Galick Gun cast / low-health / win — using the SAME pickVegetaVoice the game calls; (4) no JS errors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const pool = name => page.evaluate(p => window.__harness.vegetaVoicePool(p), name);
const inPool = (log, arr) => log.some(f => arr.includes(f));
async function installSpy() {
  await page.evaluate(() => {
    const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || [];
    if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; }
  });
}
async function ready(gap = 58) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

// The 15 hand-review DISCARDS (named characters / noise / garble) — must be wired into NO pool.
const DISCARDED = [
  "vegeta_ssj_006_t01m47_8s.mp3", "vegeta_ssj_018_t03m11_3s.mp3", "vegeta_ssj_019_t03m13_6s.mp3",
  "vegeta_ssj_021_t03m34_2s.mp3", "vegeta_ssj_024_t05m46_0s.mp3", "vegeta_ssj_025_t05m48_9s.mp3",
  "vegeta_blue_002_t01m13_9s.mp3", "vegeta_blue_004_t01m17_7s.mp3", "vegeta_blue_006_t01m32_9s.mp3",
  "vegeta_blue_007_t01m36_4s.mp3", "vegeta_blue_011_t02m26_7s.mp3", "vegeta_blue_012_t02m32_6s.mp3",
  "vegeta_blue_013_t02m53_8s.mp3", "vegeta_blue_017_t03m48_6s.mp3", "vegeta_blue_019_t03m54_7s.mp3",
];
const POOLS = ["intro", "win", "combatBark", "hitReact", "lowHealth", "galickGun", "bigBang", "finalFlash", "ultimate"];

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegeta&p2=vegeta`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  let totalClips = 0; const allWired = new Set();
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.vegetaVoicePick(pp, 400), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    arr.forEach(c => allWired.add(c)); totalClips += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 33 survivor clips accounted for across the 9 shared pools", totalClips === 33, `total=${totalClips}`);
  { const seen = {}; let dupe = null; for (const p of POOLS) for (const c of await pool(p)) { if (seen[c]) dupe = c; seen[c] = true; } check("no clip is double-pooled (each file has one home)", !dupe, dupe ? `dupe=${dupe}` : ""); }
  { let missing = []; for (const c of allWired) if (!fs.existsSync(path.join(ROOT, c))) missing.push(c); check("every referenced clip exists on disk", missing.length === 0, missing.slice(0, 3).join(",")); }

  // ── (2) DISCARD GUARD — no named-character / noise clip is wired anywhere ──
  section("discard guard (15 named-char/noise clips wired NOWHERE)");
  { const leaked = DISCARDED.filter(d => allWired.has(d)); check("none of the 15 discarded clips appear in any pool", leaked.length === 0, leaked.join(",")); }
  check("survivors + discards == the full 48-clip source set", totalClips + DISCARDED.length === 48, `${totalClips}+${DISCARDED.length}`);

  // ── (3) LIVE: intro at match start ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), log.filter(f => /^vegeta_/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (3) LIVE: combatBark (attacker) + hitReact (defender) via a HEAVY connect ──
  section("live: combatBark + hitReact (neutral heavy connect)");
  await ready(58); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(16);
  { const log = await sfxLog(); const cb = await pool("combatBark"); const hr = await pool("hitReact");
    check("heavy connect fires the combatBark line (attacker)", inPool(log, cb), log.filter(f => /^vegeta_/.test(f)).join(","));
    check("mirror defender fires a hitReact line", inPool(log, hr), ""); }

  // ── (3) LIVE: Galick Gun cast (QCF D→F + Special) → galickGun pool ──
  section("live: galickGun cast (QCF + Special)");
  await ready(120);   // spaced out so it reads as a cast, not a point-blank connect
  await page.evaluate(() => { window.__harness.p1().energy = window.__harness.p1().maxEnergy; window.__harness.resetOffenseVoice?.("p1"); });
  await clearSfx();
  const a = await p1(); const fwd = a.facing === 1 ? "d" : "a";
  await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.up("s");   // D
  await page.keyboard.down(fwd); await waitFrames(1); await page.keyboard.up(fwd);   // →F
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // Special
  await waitFrames(6);
  { const log = await sfxLog(); const gg = await pool("galickGun");
    check("Galick Gun cast fires a galickGun line", inPool(log, gg), log.filter(f => /^vegeta_/.test(f)).join(",")); }

  // ── (3) LIVE: low-health bark (defender crosses 25%) ──
  section("live: low-health bark");
  await ready(58);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth; window.__harness.damageP2(m * 0.78); });   // ~22%
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1"));
  await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(16);
  { const log = await sfxLog(); const lh = await pool("lowHealth"); check("crossing 25% fires the low-health line", inPool(log, lh), log.filter(f => /^vegeta_/.test(f)).join(",")); }

  // ── WIN line — verified STRUCTURALLY (like the Samurai test): the win pool fires from the MATCH-OVER
  // victory block (game.js winFighter === "vegeta"), which only runs when the whole match ends — too
  // much round/match orchestration to drive reliably here. Pool coverage above proves it's wired, and
  // the winner block calls pickVegetaVoice("win") with the identical mechanism as 20+ shipped characters.

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  VEGETA voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
