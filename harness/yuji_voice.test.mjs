// harness/yuji_voice.test.mjs — Yuji Itadori voice-line wiring (audio-only; EN+JA dual pools, JA active).
// Proves: (1) BOTH language pool sets randomize + cover fully (JA 72 + EN 46 = 118 clips across 7 pools each
// language present, no double-pooling within a language, every mp3 on disk); (2) live triggers fire (spy on
// playSfxFile) — intro / offense(attacker)+hitReact(defender) via heavy connect / cursed-energy cast via a Y
// special / ★ Black Flash on the Ultimate / lowHealth crossing 30%; (3) the language switch is live
// (setYujiVoiceLang flips pickYujiVoice EN↔JA); (4) no JS errors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function idleReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return (p.grounded ?? true) && !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const pool = (name, lang) => page.evaluate(([p, l]) => window.__harness.yujiVoicePool(p, l), [name, lang]);
const setLang = l => page.evaluate(x => window.__harness.yujiVoiceLang(x), l);
const inPool = (log, arr) => log.some(f => arr.includes(f));
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function ready(gap = 58) { await idleReady(); await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

const POOLS = ["intro", "offense", "cast", "blackFlash", "hitReact", "lowHealth", "win"];
const EXPECT = { ja: 72, en: 46 };
try {
  await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await installSpy();

  // ── (1) POOL COVERAGE + RANDOMIZATION, both languages ──
  section("pool randomization + coverage (JA + EN)");
  const allWired = new Set();
  for (const lang of ["ja", "en"]) {
    await setLang(lang);
    let total = 0;
    for (const p of POOLS) {
      const arr = await pool(p, lang);
      const samples = await page.evaluate(pp => window.__harness.yujiVoicePick(pp, 400), p);
      const uniq = new Set(samples);
      const allValid = samples.every(s => arr.includes(s));
      const coversAll = arr.every(c => uniq.has(c));
      const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
      arr.forEach(c => allWired.add(c)); total += arr.length;
      check(`${lang}.${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
    }
    check(`${lang}: all ${EXPECT[lang]} clips across ${POOLS.length} pools`, total === EXPECT[lang], `total=${total}`);
    { const seen = {}; let dupe = null; for (const p of POOLS) for (const c of await pool(p, lang)) { if (seen[c]) dupe = c; seen[c] = true; } check(`${lang}: no clip double-pooled`, !dupe, dupe || ""); }
  }
  check("118 unique clips total (JA 72 + EN 46)", allWired.size === 118, `unique=${allWired.size}`);
  { let missing = []; for (const c of allWired) if (!fs.existsSync(path.join(ROOT, c))) missing.push(c); check("every referenced clip exists on disk", missing.length === 0, missing.slice(0, 3).join(",")); }

  // reset to the default active language for the live triggers
  await setLang("ja");

  // ── (2) LIVE: intro (JA active) ──
  section("live: intro");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro", "ja");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), log.filter(f => /^yuji_voice_/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);

  // ── (2) LIVE: offense + hitReact via heavy connect ──
  section("live: offense + hitReact (heavy connect)");
  await ready(56); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(16);
  { const log = await sfxLog();
    check("heavy connect fires an offense line (attacker)", inPool(log, await pool("offense", "ja")), log.filter(f => /^yuji_voice_/.test(f)).join(","));
    check("mirror defender fires a hitReact line", inPool(log, await pool("hitReact", "ja")), ""); }

  // ── (2) LIVE: cursed-energy cast via neutral Special ──
  section("live: cursed-energy cast (neutral Special)");
  await ready(120); await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.fillEnergy?.(); }); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); check("a Y-special fires a cast line", inPool(log, await pool("cast", "ja")), log.filter(f => /^yuji_voice_/.test(f)).join(",")); }

  // ── (2) LIVE: low-health (crossing 30%) — fires on the DEFENDER (P2) ──
  section("live: low-health bark (crossing 30%)");
  await ready(56);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth || 1120; window.__harness.damageP2(m - 280); });   // P2 → ~280/1120 = 25% (≤30%)
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog(); check("low-HP Yuji (defender) crossing 30% fires a lowHealth line", inPool(log, await pool("lowHealth", "ja")), log.filter(f => /^yuji_voice_/.test(f)).join(",")); }

  // ── (2) LIVE: ★ Black Flash on the Ultimate ──
  section("live: ★ Black Flash callout (Ultimate)");
  await ready(60); await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); }); await idleReady(); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(6);
  { const log = await sfxLog(); check("Ultimate fires the Black Flash callout", inPool(log, await pool("blackFlash", "ja")), log.filter(f => /^yuji_voice_/.test(f)).join(",")); }

  // ── (3) LANGUAGE SWITCH is live ──
  section("language switch (JA ↔ EN)");
  await setLang("en");
  const enIntro = await pool("intro", "en");
  const enSamples = await page.evaluate(() => window.__harness.yujiVoicePick("intro", 60));
  check("setYujiVoiceLang('en') → pickYujiVoice returns EN clips", enSamples.every(s => enIntro.includes(s)), enSamples.slice(0, 2).join(","));
  await setLang("ja");
  const jaSamples = await page.evaluate(() => window.__harness.yujiVoicePick("intro", 60));
  check("switch back to 'ja' → pickYujiVoice returns JA clips", jaSamples.every(s => (introPool).includes(s)), jaSamples.slice(0, 2).join(","));

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  YUJI voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
