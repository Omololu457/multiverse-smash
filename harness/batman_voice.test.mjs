// harness/batman_voice.test.mjs — Batman voice-line wiring (Injustice 2 pack, transcribed → BATMAN_VOICE_LOG.md).
// (1) every wired pool RANDOMIZES + full coverage + points at on-disk mp3s that pass the name filter;
// (2) live triggers fire (spy on playSfxFile): intro at match start, taunt on a strong connect, hitReact on a hit.
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

// The FULL discarded-line set that must NEVER be wired (named-character or fragment/garble) — a
// regression guard so a future edit can't accidentally pull a filtered clip into a pool.
const FORBIDDEN = new Set([
  "004","005","012","015","029","031","032","033",          // named-character
  "001","002","008","010","014","016","017","018","019","020","021","024","025","028","030", // fragment/garble
]);
const clipIndex = f => (String(f).match(/^batmaninj2_(\d{3})_/) || [])[1];

try {
  await page.goto(`${base}/index.html?harness=1&p1=batman&p2=batman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE + FILTER INTEGRITY ──
  section("pool randomization + coverage + filter integrity");
  const POOLS = { intro: 4, taunt: 5, hitReact: 6, win: 2 };
  for (const [pool, expect] of Object.entries(POOLS)) {
    const arr = await page.evaluate(p => window.__harness.batmanVoicePool(p), pool);
    const samples = await page.evaluate(p => window.__harness.batmanVoicePick(p, 200), pool);
    const uniq = new Set(samples);
    const sizeOk = arr.length === expect;
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    const onDisk = arr.every(f => fs.existsSync(path.join(ROOT, f)));
    const noForbidden = arr.every(f => !FORBIDDEN.has(clipIndex(f)));
    check(`${pool} (${arr.length}/${expect}) — valid+covers+randomizes+on-disk+filtered`,
      sizeOk && allValid && coversAll && randOk && onDisk && noForbidden,
      `distinct=${uniq.size}/${arr.length} disk=${onDisk} filtered=${noForbidden}`);
  }
  // No discarded clip may appear in ANY pool.
  const leak = await page.evaluate(() => {
    const P = ["intro", "taunt", "hitReact", "win"]; const all = [];
    for (const p of P) all.push(...(window.__harness.batmanVoicePool(p) || []));
    return all;
  });
  check("no discarded (named/fragment) clip leaked into any pool", leak.every(f => !FORBIDDEN.has(clipIndex(f))), leak.filter(f => FORBIDDEN.has(clipIndex(f))).join(","));

  // ── (2) LIVE: INTRO at real match start ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => window.__harness.batmanVoicePool("intro").includes(f)), null, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); const introPool = await page.evaluate(() => window.__harness.batmanVoicePool("intro")); check("an intro clip fired at match start", log.some(f => introPool.includes(f)), log.filter(f => /^batmaninj2/.test(f)).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: taunt (attacker) + hitReact (defender) via a mirror heavy connect ──
  section("live: taunt + hitReact (mirror heavy connect)");
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog();
    const taunt = await page.evaluate(() => window.__harness.batmanVoicePool("taunt"));
    const hr = await page.evaluate(() => window.__harness.batmanVoicePool("hitReact"));
    check("heavy connect fires a taunt line (attacker)", log.some(f => taunt.includes(f)), log.filter(f => /^batmaninj2/.test(f)).join(","));
    check("mirror defender fires a hitReact grunt", log.some(f => hr.includes(f)), ""); }

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  BATMAN voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
