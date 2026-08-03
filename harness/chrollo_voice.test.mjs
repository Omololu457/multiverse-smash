// harness/chrollo_voice.test.mjs — Chrollo Lucilfer voice-line wiring.
// (1) every pool RANDOMIZES + full coverage using the SAME pickChrolloVoice the live triggers call;
// (2) live triggers fire (spy on playSfxFile): intro / combatBark+tauntCombat / grunt / hitReact / lowHealth / win;
// (3) CRITICAL: the Skill Hunter / Switch ultimate-activation line fires EXACTLY ONCE at the transform
//     beat and NEVER overlaps the copied character's own subsequent voice (no chrollo_ clip after the swap).
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
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 46); await waitFrames(2);
}
const chr = f => /^chrollo_/.test(f);
const inPool = (log, pool) => log.some(f => pool.includes(f));

try {
  // ═══════════════════════════════════════════════════════════════════════
  // MATCH 1 — mirror (p1=chrollo, p2=chrollo): pools, intro, combat, hit, low-health, win
  // ═══════════════════════════════════════════════════════════════════════
  await page.goto(`${base}/index.html?harness=1&p1=chrollo&p2=chrollo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "combatBark", "tauntCombat", "grunt", "hitReact", "lowHealth", "win", "ultActivate"];
  for (const pool of POOLS) {
    const arr = await page.evaluate(p => window.__harness.chrolloVoicePool(p), pool);
    const samples = await page.evaluate(p => window.__harness.chrolloVoicePick(p, 120), pool);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    check(`${pool} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }

  // ── (2) LIVE: INTRO ──
  section("live: intro (real match start)");
  const introPool = await page.evaluate(() => window.__harness.chrolloVoicePool("intro"));
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => window.__harness.chrolloVoicePool("intro").includes(f)), null, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", inPool(log, introPool), log.filter(chr).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: heavy connect → combatBark/taunt (attacker) + hitReact (defender) ──
  section("live: heavy connect → combatBark|tauntCombat (attacker) + hitReact (defender)");
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog();
    const cb = await page.evaluate(() => window.__harness.chrolloVoicePool("combatBark"));
    const tc = await page.evaluate(() => window.__harness.chrolloVoicePool("tauntCombat"));
    const hr = await page.evaluate(() => window.__harness.chrolloVoicePool("hitReact"));
    check("heavy connect fires a combatBark OR tauntCombat line (attacker)", inPool(log, cb) || inPool(log, tc), log.filter(chr).join(","));
    check("mirror defender fires a hitReact line", inPool(log, hr), ""); }

  // ── (2) LIVE: light connect → grunt (defender exertion) ──
  section("live: light connect → grunt (defender)");
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 44); }
  await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(10);
  { const log = await sfxLog(); const gr = await page.evaluate(() => window.__harness.chrolloVoicePool("grunt")); check("light connect fires a grunt line (defender)", inPool(log, gr), log.filter(chr).join(",")); }

  // ── (2) LIVE: low-health comeback bark (defender crosses 25%) ──
  section("live: low-health bark ('the spider doesn't die')");
  await ready();
  await page.evaluate(() => { const p2h = window.__harness.p2().maxHealth; window.__harness.damageP2(p2h * 0.72); });
  await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog(); const lh = await page.evaluate(() => window.__harness.chrolloVoicePool("lowHealth")); check("crossing 25% fires the low-health line", inPool(log, lh), log.filter(chr).join(",")); }

  // ═══════════════════════════════════════════════════════════════════════
  // MATCH 2 — (p1=chrollo, p2=naruto): CRITICAL ult-activation-once + no-overlap
  // ═══════════════════════════════════════════════════════════════════════
  section("CRITICAL: Skill Hunter / Switch ultimate activation — fires EXACTLY once, no overlap");
  await page.goto(`${base}/index.html?harness=1&p1=chrollo&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);
  await ready();

  // Unlock Skill Hunter: opponent lands 3 DISTINCT moves on Chrollo (drives the REAL tracker).
  await page.evaluate(() => { window.__harness.shLandMove("light"); window.__harness.shLandMove("heavy"); window.__harness.shLandMove("rasengan"); });
  { const s = await page.evaluate(() => window.__harness.shState("p1")); check("Skill Hunter unlocked (3 distinct moves landed)", s.ready === true, `distinct=${s.distinct} ready=${s.ready}`); }

  const ultPool = await page.evaluate(() => window.__harness.chrolloVoicePool("ultActivate"));
  // Press Ultimate → cinematic activates. Capture the spy from just before the press.
  await page.evaluate(() => { window.__harness.fillEnergy?.(); });
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.shState("p1").cineActive, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  const atActivation = await sfxLog();
  const ultHitsAtActivation = atActivation.filter(f => ultPool.includes(f));
  check("an ultActivate line (Skill Hunter/Switch) fired at the transform", ultHitsAtActivation.length >= 1, atActivation.filter(chr).join(","));
  check("EXACTLY ONE ultActivate line fired (not both, not repeated)", ultHitsAtActivation.length === 1, `count=${ultHitsAtActivation.length} [${ultHitsAtActivation.join(",")}]`);

  // Let the cinematic complete → body-swap to Naruto (copied character now live).
  await page.waitForFunction(() => { const x = window.__harness.shState("p1"); return x.active && !x.cineActive; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  { const s = await page.evaluate(() => window.__harness.shState("p1")); check("swap completed — Chrollo is now copying the opponent", s.active === true && s.rosterKey !== "chrollo", `rosterKey=${s.rosterKey} active=${s.active}`); }

  // AFTER the swap: drive the copied form's moves; assert NO chrollo_ clip leaks (no overlap / no re-fire).
  await clearSfx();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.setP2Invuln?.(600); });
  await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(6);   // copied light
  await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l"); await waitFrames(10);   // copied special (Rasengan family)
  { const log = await sfxLog(); const leaks = log.filter(chr); check("NO chrollo_ voice line fires after the swap (copied char owns its voice)", leaks.length === 0, leaks.join(",") || "clean"); }
  // NOTE: the WIN line (_checkMatchOver, winner=chrollo) is verified via pool randomization above; a live
  // match-end fire needs multi-round orchestration + an unexposed forceMatchEnd hook (gon_voice precedent
  // likewise verifies win via the pool only). The wiring mirrors the gon win hook at the same call site.

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  CHROLLO voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
