// harness/maki_voice.test.mjs — Maki Zenin voice-line wiring (audio-only; Japanese JJK dub).
// Proves: (1) every pool RANDOMIZES + full coverage (all 55 JA clips across 9 pools, no double-pooling,
// every mp3 on disk); (2) live triggers fire (spy on playSfxFile) — intro / combatBark(attacker) +
// hitReact(defender) / the 3 special casts (kunai/nunchaku/powerCharge) / lowHealth; (3) THE KEY
// GUARANTEE — the Shibuya-activation line fires at the transformation CAST beat (before the cinematic
// reveal resolves) and EXACTLY ONCE (no reveal overlap); (4) no JS errors.
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
const pool = name => page.evaluate(p => window.__harness.makiVoicePool(p), name);
const inPool = (log, arr) => log.some(f => arr.includes(f));
const cine = () => page.evaluate(() => window.__harness.makiShibuyaCine());
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function ready(gap = 58) { await idleReady(); await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

const POOLS = ["intro", "kunai", "nunchaku", "powerCharge", "combatBark", "hitReact", "lowHealth", "shibuyaActivation", "win"];
try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await installSpy();

  // ── (1) POOL COVERAGE + RANDOMIZATION ──
  section("pool randomization + coverage");
  let total = 0; const allWired = new Set();
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.makiVoicePick(pp, 400), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    arr.forEach(c => allWired.add(c)); total += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 55 JA clips accounted for across the 9 pools", total === 55, `total=${total}`);
  { const seen = {}; let dupe = null; for (const p of POOLS) for (const c of await pool(p)) { if (seen[c]) dupe = c; seen[c] = true; } check("no clip is double-pooled", !dupe, dupe || ""); }
  { let missing = []; for (const c of allWired) if (!fs.existsSync(path.join(ROOT, c))) missing.push(c); check("every referenced clip exists on disk", missing.length === 0, missing.slice(0, 3).join(",")); }

  // ── (2) LIVE: intro (checked right after start, BEFORE skipping — the intro-play frame) ──
  section("live: intro");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), log.filter(f => /^maki_/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);

  // ── (2) LIVE: combatBark + hitReact via heavy connect ──
  section("live: combatBark + hitReact (heavy connect)");
  await ready(56); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(16);
  { const log = await sfxLog(); const cb = await pool("combatBark"), hr = await pool("hitReact");
    check("heavy connect fires a combatBark line (attacker)", inPool(log, cb), log.filter(f => /^maki_/.test(f)).join(","));
    check("mirror defender fires a hitReact line", inPool(log, hr), ""); }

  // ── (2) LIVE: special casts — kunai / nunchaku / powerCharge ──
  section("live: special casts (kunai / nunchaku / powerCharge)");
  await ready(120); await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);   // neutral Special = Kunai
  { const log = await sfxLog(); check("Kunai Throw fires a kunai cast line", inPool(log, await pool("kunai")), log.filter(f => /^maki_/.test(f)).join(",")); }

  await ready(120); await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("s"); await waitFrames(1);                                                    // hold Down
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("s"); await waitFrames(6);   // Down+Special = Nunchaku
  { const log = await sfxLog(); check("Nunchaku Flurry fires a nunchaku cast line", inPool(log, await pool("nunchaku")), log.filter(f => /^maki_/.test(f)).join(",")); }

  await ready(120); await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p"); await waitFrames(6);  // Charge release = Power Charge
  { const log = await sfxLog(); check("Power Charge fires a powerCharge cast line", inPool(log, await pool("powerCharge")), log.filter(f => /^maki_/.test(f)).join(",")); }

  // ── (2) LIVE: lowHealth (crossing 30%) — fires on the DEFENDER, so the low-HP Maki (P2) takes the hit ──
  section("live: low-health bark (crossing 30%)");
  await ready(56);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth || 1180; window.__harness.damageP2(m - 300); });   // P2 → ~300/1180 ≈ 25% (≤30%)
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog(); check("low-HP Maki (defender) crossing 30% fires a lowHealth line", inPool(log, await pool("lowHealth")), log.filter(f => /^maki_/.test(f)).join(",")); }

  // ── (3) KEY: Shibuya-activation line fires at the CAST beat, before reveal, exactly ONCE ──
  section("live: Shibuya-activation at the transform CAST beat (not the reveal)");
  await idleReady();
  await page.evaluate(() => window.__harness.setP1Health(250));   // ≤25% → unlock
  await waitFrames(4);
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");   // trigger the transform ultimate
  const cineActive = await page.waitForFunction(() => window.__harness.makiShibuyaCine().active === true, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  const logEarly = await sfxLog();
  const sap = await pool("shibuyaActivation");
  check("Shibuya-activation line fired at the transform cast", inPool(logEarly, sap), logEarly.filter(f => /^maki_/.test(f)).join(","));
  check("…at the CAST beat: cinematic is active (line rode the windup, reveal still in progress)", inPool(logEarly, sap) && cineActive, `cineActive=${cineActive}`);
  // let the cinematic fully resolve → confirm the line played exactly once (no reveal-beat repeat)
  await page.waitForFunction(() => window.__harness.makiShibuyaCine().active === false, null, { timeout: 6000, polling: 33 }).catch(() => {});
  await waitFrames(4);
  const logFull = await sfxLog();
  const sapCount = logFull.filter(f => sap.includes(f)).length;
  check("exactly ONE Shibuya-activation line across the whole transform", sapCount === 1, `count=${sapCount}`);

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  MAKI voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
