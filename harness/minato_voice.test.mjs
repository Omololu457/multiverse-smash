// harness/minato_voice.test.mjs — Minato Namikaze voice-line wiring.
// (1) every multi-entry pool RANDOMIZES + full coverage; (2) live triggers fire (spy on playSfxFile):
// intro at match start, Rasengan / Flying Raijin / Reaper / Kurama-ult casts, offense bark (taunt/
// hitConnect) + defender hitReact, low-health. Mirror match (p1=p2=minato) so both sides' voices fire.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function ready(gap = 46) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); window.__harness.dispelP1Clones?.(); window.__harness.clearP1FrMarks?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const inPool = (log, pool) => log.some(f => pool.includes(f));
const poolOf = p => page.evaluate(x => window.__harness.minatoVoicePool(x), p);
const mlog = log => log.filter(f => /^minatostorm_/.test(f)).slice(0, 4).join(",");

try {
  await page.goto(`${base}/index.html?harness=1&p1=minato&p2=minato`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "taunt", "rasengan", "flyingRaijin", "reaper", "ult", "hitConnect", "hitReact", "lowHealth", "win"];
  for (const pool of POOLS) {
    const arr = await poolOf(pool);
    const samples = await page.evaluate(p => window.__harness.minatoVoicePick(p, 120), pool);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    check(`${pool} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }

  // ── (2) LIVE: INTRO ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => window.__harness.minatoVoicePool("intro").includes(f)), null, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, await poolOf("intro")), mlog(log)); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: SPECIAL CASTS ──
  section("live: special casts (Rasengan / Flying Raijin / Reaper / Kurama-ult)");
  // Rasengan = Down+Special
  await ready(60); await clearSfx();
  await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s"); await waitFrames(6);
  { const log = await sfxLog(); check("Rasengan cast fires a rasengan-pool line", inPool(log, await poolOf("rasengan")), mlog(log)); }
  // Flying Raijin = neutral Special (0 clones)
  await ready(60); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); check("Flying Raijin cast fires a flyingRaijin-pool line", inPool(log, await poolOf("flyingRaijin")), mlog(log)); }
  // Reaper = charge(hold P) + Special, at grab range
  await ready(70); await clearSfx();
  await page.keyboard.down("p"); await waitFrames(16); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("p"); await waitFrames(6);
  { const log = await sfxLog(); check("Reaper cast fires the reaper-pool line", inPool(log, await poolOf("reaper")), mlog(log)); }
  // Kurama ultimate = U
  await ready(120); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(6);
  { const log = await sfxLog(); check("Kurama ult fires an ult-pool line", inPool(log, await poolOf("ult")), mlog(log)); await page.evaluate(() => window.__harness.clearMinatoKurama?.()); }
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing"; }, null, { timeout: 4000, polling: 16 }).catch(() => {});

  // ── (2) LIVE: OFFENSE bark + defender hitReact (mirror match) ──
  section("live: offense bark (taunt/hitConnect) + defender hitReact");
  await ready(46); await clearSfx();
  // land several heavy connects to reliably trip the 30/70 offense bark and the defender's hitReact
  for (let i = 0; i < 5; i++) { await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(16); }
  { const log = await sfxLog(); const taunt = await poolOf("taunt"), hc = await poolOf("hitConnect"), hr = await poolOf("hitReact");
    check("heavy connect fires an offense bark (taunt or hitConnect)", inPool(log, taunt) || inPool(log, hc), mlog(log));
    check("mirror defender fires a hitReact line", inPool(log, hr), mlog(log)); }

  // ── (2) LIVE: LOW-HEALTH ──
  section("live: low-health bark");
  // Set Minato (p1) below the 25% line, then have p2 land a REAL hit on him — the low-health check
  // fires from the hit resolver (not from a bare hitstun set), same path as Gon/Naruto.
  await ready(40); await clearSfx();
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP1Health?.(Math.floor((p.maxHealth || 1150) * 0.20)); window.__harness.setP1Invuln?.(0); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 30); }
  for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__harness.p2Attack?.()); await waitFrames(10); const l = await sfxLog(); if (inPool(l, await poolOf("lowHealth"))) break; }
  { const log = await sfxLog(); check("crossing 25% fires a low-health line", inPool(log, await poolOf("lowHealth")), mlog(log)); }

  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { check("test run completed", false, String(e)); }

console.log(`\nMINATO voice: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
