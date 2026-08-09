// harness/miwa_voice.test.mjs — Kasumi Miwa voice-line wiring (audio-only; Japanese JJK dub).
// Proves: (1) every pool RANDOMIZES + full coverage (all 68 JA clips across 9 pools, no double-pooling,
// every mp3 on disk); (2) live triggers fire (spy on playSfxFile) — intro(+taunt) / combatBark(attacker)
// + hitReact(defender) / the 3 special casts (iaiDash grounded / airVortex airborne / ultimate) /
// lowHealth; (3) no JS errors. English session (000–357) is intentionally NOT wired (JA-only per brief).
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
const pool = name => page.evaluate(p => window.__harness.miwaVoicePool(p), name);
const inPool = (log, arr) => log.some(f => arr.includes(f));
const miwaLog = log => log.filter(f => /^miwa_/.test(f));
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function ready(gap = 58) { await idleReady(); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

const POOLS = ["intro", "taunt", "iaiDash", "airVortex", "ultimate", "combatBark", "hitReact", "lowHealth", "win"];
try {
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=miwa`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await installSpy();

  // ── (1) POOL COVERAGE + RANDOMIZATION ──
  section("pool randomization + coverage");
  let total = 0; const allWired = new Set();
  for (const p of POOLS) {
    const arr = await pool(p);
    const samples = await page.evaluate(pp => window.__harness.miwaVoicePick(pp, 400), p);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    arr.forEach(c => allWired.add(c)); total += arr.length;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  check("all 68 JA clips accounted for across the 9 pools", total === 68, `total=${total}`);
  { const seen = {}; let dupe = null; for (const p of POOLS) for (const c of await pool(p)) { if (seen[c]) dupe = c; seen[c] = true; } check("no clip is double-pooled", !dupe, dupe || ""); }
  { let missing = []; for (const c of allWired) if (!fs.existsSync(path.join(ROOT, c))) missing.push(c); check("every referenced clip exists on disk", missing.length === 0, missing.slice(0, 3).join(",")); }
  { let en = [...allWired].filter(c => { const m = /^miwa_(\d+)_/.exec(c); return m && +m[1] < 358; }); check("no ENGLISH-session clip (000–357) is wired — JA-only", en.length === 0, en.slice(0, 3).join(",")); }

  // ── (2) LIVE: intro(+taunt) fires at match start ──
  section("live: intro (fires at match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = [...(await pool("intro")), ...(await pool("taunt"))];
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro/taunt clip fired at match start", inPool(log, introPool), miwaLog(log).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);

  // ── (2) LIVE: combatBark + hitReact via heavy connect ──
  section("live: combatBark + hitReact (heavy connect)");
  await ready(56); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(16);
  { const log = await sfxLog(); const cb = await pool("combatBark"), hr = await pool("hitReact");
    check("heavy connect fires a combatBark line (attacker)", inPool(log, cb), miwaLog(log).join(","));
    check("mirror defender fires a hitReact line", inPool(log, hr), ""); }

  // ── (2) LIVE: lowHealth (crossing 30%) — DEFENDER (low-HP Miwa = P2). Run BEFORE the specials/ultimate
  //     so P2 is freshly healed and no freeze-cinematic is pending (a mid-cinematic hit wouldn't connect). ──
  section("live: low-health bark (crossing 30%)");
  await ready(56);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth || 1150; window.__harness.damageP2(m - Math.round(m * 0.25)); });   // P2 → ~25% (≤30%)
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog(); check("low-HP Miwa (defender) crossing 30% fires a lowHealth line", inPool(log, await pool("lowHealth")), miwaLog(log).join(",")); }

  // ── (2) LIVE: iaiDash cast — grounded Special ──
  section("live: iaiDash cast (grounded Special)");
  await ready(120); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); check("grounded Special (Iai Dash) fires an iaiDash cast line", inPool(log, await pool("iaiDash")), miwaLog(log).join(",")); }

  // ── (2) LIVE: airVortex cast — airborne Special ──
  section("live: airVortex cast (airborne Special)");
  await ready(120); await clearSfx();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");   // jump
  await page.waitForFunction(() => { const p = window.__harness.p1(); return (p.grounded ?? true) === false; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(8);
  { const log = await sfxLog(); check("airborne Special (Rapid Slash Vortex) fires an airVortex cast line", inPool(log, await pool("airVortex")), miwaLog(log).join(",")); }
  await page.waitForFunction(() => (window.__harness.p1().grounded ?? true) === true, null, { timeout: 4000, polling: 16 }).catch(() => {});

  // ── (2) LIVE: ultimate cast — "Blade of the Neophyte" ──
  section("live: ultimate cast (Blade of the Neophyte)");
  await ready(80); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(6);
  { const log = await sfxLog(); check("Ultimate fires an ultimate cast line", inPool(log, await pool("ultimate")), miwaLog(log).join(",")); }

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  MIWA voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
