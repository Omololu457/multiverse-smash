// harness/gon_voice.test.mjs — Gon Freecss voice-line wiring.
// (1) every multi-entry pool RANDOMIZES + full coverage; (2) live triggers fire (spy on playSfxFile);
// (3) CRITICAL: gonnen_017_sudden_death_janken fires EXCLUSIVELY on the Final Blow, never on a Jajanken
// variant or the Adult Form transformation.
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
const gon = () => page.evaluate(() => window.__harness.gonAdultForm("p1"));
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function ready() {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 46); await waitFrames(2);
}
const hasGon = (log, re) => log.filter(f => /^gonnen_/.test(f)).some(f => re.test(f));
const has017 = log => log.some(f => /gonnen_017_sudden_death_janken/.test(f));

try {
  await page.goto(`${base}/index.html?harness=1&p1=gon&p2=gon`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "rock", "scissors", "paper", "rekka", "combatBark", "hitReact", "lowHealth", "parry", "win"];
  for (const pool of POOLS) {
    const arr = await page.evaluate(p => window.__harness.gonVoicePool(p), pool);
    const samples = await page.evaluate(p => window.__harness.gonVoicePick(p, 120), pool);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    // multi-entry pools must show randomness (>1 distinct); size-1 pools are deterministic by design
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    check(`${pool} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  // the Final Blow line is a standalone const, NOT in any pool (so it can't leak)
  const inAnyPool = await page.evaluate(() => { const P = ["intro","rock","scissors","paper","rekka","combatBark","hitReact","lowHealth","parry","win"]; return P.some(p => (window.__harness.gonVoicePool(p) || []).includes("gonnen_017_sudden_death_janken.mp3")); });
  check("gonnen_017 (Final Blow) is NOT in any random pool", inAnyPool === false, `inAnyPool=${inAnyPool}`);

  // ── (2) LIVE: INTRO ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => window.__harness.gonVoicePool("intro").includes(f)), null, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); const introPool = await page.evaluate(() => window.__harness.gonVoicePool("intro")); check("an intro clip fired at match start", log.some(f => introPool.includes(f)), log.filter(f => /^gonnen/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: JAJANKEN casts + EXCLUSIVITY (017 must NOT appear on any variant) ──
  section("live: Jajanken casts (Rock/Scissors/Paper) + 017 exclusivity");
  // ROCK = neutral+Special
  await ready(); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); check("ROCK cast fires a rock-pool line", hasGon(log, /_(janken_rock_1|rock_wont_lose|rock_starts_here|everything_into_fist|rock_alt|first_is_rock)/), log.filter(f=>/^gonnen/.test(f)).join(",")); check("ROCK does NOT fire gonnen_017", !has017(log), ""); }
  // SCISSORS = Fwd+Special
  await ready(); await clearSfx();
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6); await page.keyboard.up("d");
  { const log = await sfxLog(); check("SCISSORS cast fires a scissors-pool line", hasGon(log, /_(chain_ren|jajanken_rapid_practice)/), log.filter(f=>/^gonnen/.test(f)).join(",")); check("SCISSORS does NOT fire gonnen_017", !has017(log), ""); }
  // PAPER = Down+Special
  await ready(); await clearSfx();
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6); await page.keyboard.up("s");
  { const log = await sfxLog(); check("PAPER cast fires a paper-pool line", hasGon(log, /_ken_block_completely/), log.filter(f=>/^gonnen/.test(f)).join(",")); check("PAPER does NOT fire gonnen_017", !has017(log), ""); }

  // ── (2) LIVE: Rush rekka opener ──
  section("live: Rush rekka opener (Down+Heavy)");
  await ready(); await clearSfx();
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k"); await page.keyboard.up("s"); await waitFrames(6);
  { const log = await sfxLog(); check("Rush opener fires a rekka-pool line", hasGon(log, /_(sword_ken|come_sword_technique)/), log.filter(f=>/^gonnen/.test(f)).join(",")); check("Rush does NOT fire gonnen_017", !has017(log), ""); }

  // ── (2) LIVE: combatBark (attacker) + hitReact (defender) via a mirror heavy connect ──
  section("live: combatBark + hitReact (mirror heavy connect)");
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(10);
  { const log = await sfxLog(); const cb = await page.evaluate(() => window.__harness.gonVoicePool("combatBark")); const hr = await page.evaluate(() => window.__harness.gonVoicePool("hitReact"));
    check("heavy connect fires a combatBark line (attacker)", log.some(f => cb.includes(f)), log.filter(f=>/^gonnen/.test(f)).join(","));
    check("mirror defender fires a hitReact line", log.some(f => hr.includes(f)), ""); }

  // ── (2) LIVE: low-health comeback bark (defender crosses 25%) ──
  section("live: low-health bark");
  await ready();
  await page.evaluate(() => { const p2h = window.__harness.p2().maxHealth; window.__harness.damageP2(p2h * 0.72); });  // drop p2 (gon) to ~28%
  await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(10);
  { const log = await sfxLog(); const lh = await page.evaluate(() => window.__harness.gonVoicePool("lowHealth")); check("crossing 25% fires a low-health line", log.some(f => lh.includes(f)), log.filter(f=>/^gonnen/.test(f)).join(",")); }

  // ── (3) CRITICAL: Final Blow EXCLUSIVE line + Adult Form transform has NO 017 leak ──
  section("CRITICAL: Final Blow exclusivity");
  await ready();
  // Adult Form transform itself must NOT fire 017 (or any cast line)
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(4);
  { const log = await sfxLog(); check("Adult Form TRANSFORM does NOT fire gonnen_017", !has017(log), log.filter(f=>/^gonnen/.test(f)).join(",")); }
  await page.waitForFunction(() => !window.__harness.adultFormCine().active, null, { timeout: 12000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  const inForm = await gon();
  check("Adult Form active (precondition for Final Blow)", inForm.active === true, `active=${inForm.active}`);
  // Final Blow = Special while Adult Form active → 017 fires
  await page.evaluate(() => { window.__harness.setP2Invuln(600); });   // whiff so the match doesn't instantly end mid-check
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 300); }
  await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(4);
  { const log = await sfxLog(); check("Final Blow FIRES gonnen_017 (exclusive)", has017(log), log.filter(f=>/^gonnen/.test(f)).join(",")); }

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  GON voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
