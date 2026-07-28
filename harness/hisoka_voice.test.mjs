// harness/hisoka_voice.test.mjs — Hisoka Morrow voice-line wiring (audio-only "Nen Impact" pack).
// (1) every multi-entry pool RANDOMIZES + full coverage (single-entry pools are deterministic);
// (2) live triggers fire (spy on playSfxFile): intro, the special casts (Bungee Gum / Texture Surprise /
//     Bloodlust Overdrive), the Card Flourish rekka opener, and combatBark + hitReact on a mirror connect;
// (3) the low-health bark fires once on crossing 25%.
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
async function ready() {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); await waitFrames(2);
}
const poolOf = pool => page.evaluate(p => window.__harness.hisokaVoicePool(p), pool);
const firedFrom = (log, arr) => log.some(f => arr.includes(f));

try {
  await page.goto(`${base}/index.html?harness=1&p1=hisoka&p2=hisoka`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "taunt", "bungee", "texture", "overdrive", "rekka", "combatBark", "hitReact", "lowHealth", "win"];
  for (const pool of POOLS) {
    const arr = await poolOf(pool);
    const samples = await page.evaluate(p => window.__harness.hisokaVoicePick(p, 160), pool);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    check(`${pool} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  // every wired mp3 must be a hisokanen_* clip (no stray filename typos leaked into a pool)
  const allEntries = (await Promise.all(POOLS.map(poolOf))).flat();
  check("all pooled clips are hisokanen_* files", allEntries.every(f => /^hisokanen_\d+_t\d+m[\d_]+s\.mp3$/.test(f)), `${allEntries.length} entries`);

  // ── (2) LIVE: INTRO ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await poolOf("intro");
  await page.waitForFunction(pool => (window.__harness.__sound._sfxSpy || []).some(f => pool.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", firedFrom(log, introPool), log.filter(f => /^hisokanen/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: BUNGEE GUM (neutral+Special) ──
  section("live: Bungee Gum cast (neutral+Special)");
  await ready(); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); const pool = await poolOf("bungee"); check("Bungee Gum fires a bungee-pool line", firedFrom(log, pool), log.filter(f => /^hisokanen/.test(f)).join(",")); }

  // ── (2) LIVE: TEXTURE SURPRISE (Down+Special = single, Fwd+Special = rapid) ──
  section("live: Texture Surprise casts (Down+Special / Fwd+Special)");
  await ready(); await clearSfx();
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6); await page.keyboard.up("s");
  { const log = await sfxLog(); const pool = await poolOf("texture"); check("Down+Special (single card) fires a texture-pool line", firedFrom(log, pool), log.filter(f => /^hisokanen/.test(f)).join(",")); }
  await ready(); await clearSfx();
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6); await page.keyboard.up("d");
  { const log = await sfxLog(); const pool = await poolOf("texture"); check("Fwd+Special (rapid fan) fires a texture-pool line", firedFrom(log, pool), log.filter(f => /^hisokanen/.test(f)).join(",")); }

  // ── (2) LIVE: CARD FLOURISH rekka opener (Down+Heavy) ──
  section("live: Card Flourish rekka opener (Down+Heavy)");
  await ready(); await clearSfx();
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k"); await page.keyboard.up("s"); await waitFrames(6);
  { const log = await sfxLog(); const pool = await poolOf("rekka"); check("rekka opener fires a rekka-pool line", firedFrom(log, pool), log.filter(f => /^hisokanen/.test(f)).join(",")); }

  // ── (2) LIVE: combatBark (attacker) + hitReact (defender) via a mirror heavy connect ──
  section("live: combatBark + hitReact (mirror heavy connect)");
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(10);
  { const log = await sfxLog(); const cb = await poolOf("combatBark"); const tt = await poolOf("taunt"); const hr = await poolOf("hitReact");
    // attacker connect pulls combatBark (~70%) OR a flirty taunt (~30%) — either proves the connect trigger
    check("heavy connect fires a combatBark or taunt line (attacker)", log.some(f => cb.includes(f) || tt.includes(f)), log.filter(f => /^hisokanen/.test(f)).join(","));
    check("mirror defender fires a hitReact line", log.some(f => hr.includes(f)), ""); }

  // ── (3) LIVE: low-health comeback bark (defender crosses 25%) ──
  section("live: low-health bark");
  await ready();
  await page.evaluate(() => { const p2h = window.__harness.p2().maxHealth; window.__harness.damageP2(p2h * 0.72); });  // drop p2 (hisoka) to ~28%
  await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(10);
  { const log = await sfxLog(); const lh = await poolOf("lowHealth"); check("crossing 25% fires a low-health line", log.some(f => lh.includes(f)), log.filter(f => /^hisokanen/.test(f)).join(",")); }

  // ── (2) LIVE: BLOODLUST OVERDRIVE (Ultimate) — LAST (it transforms p1 for the rest of the round) ──
  section("live: Bloodlust Overdrive cast (Ultimate)");
  await ready(); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(6);
  { const log = await sfxLog(); const pool = await poolOf("overdrive"); check("Overdrive activation fires an overdrive-pool line", firedFrom(log, pool), log.filter(f => /^hisokanen/.test(f)).join(",")); }

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  HISOKA voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
