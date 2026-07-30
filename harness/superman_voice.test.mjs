// harness/superman_voice.test.mjs — Superman voice-line wiring.
// (1) every multi-entry pool RANDOMIZES + full coverage; (2) live triggers fire (spy on playSfxFile):
// intro (match start), cast (special / flight activation / ultimate), taunt (offense connect),
// hitReact (defender hit), lowHealth (crossing 30%). Win pool is validated (live win needs match-end).
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
const pool = p => page.evaluate(x => window.__harness.supermanVoicePool(x), p);
async function ready() {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 46); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=superman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) POOL RANDOMIZATION + COVERAGE ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "cast", "taunt", "hitReact", "lowHealth", "win"];
  for (const p of POOLS) {
    const arr = await pool(p);
    // Sample size scales with pool size: full-coverage needs ~N·ln(N) draws (coupon-collector), so a
    // flat 200 flakes on the 64-clip taunt pool. 25·N gives reliable coverage without being slow.
    const samples = await page.evaluate(([x, n]) => window.__harness.supermanVoicePick(x, n), [p, Math.max(200, arr.length * 25)]);
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
    check(`${p} (${arr.length}) — valid + covers-all + ${arr.length === 1 ? "single" : "randomizes"}`, allValid && coversAll && randOk, `distinct=${uniq.size}/${arr.length}`);
  }
  // pools must not overlap intro/taunt (distinct triggers) — a quick disjointness sanity on intro vs taunt
  { const i = await pool("intro"), t = await pool("taunt"); check("intro & taunt pools are disjoint", !i.some(x => t.includes(x)), ""); }

  // ── (2) LIVE: INTRO ──
  section("live: intro (real match start)");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introPool = await pool("intro");
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro clip fired at match start", log.some(f => introPool.includes(f)), log.filter(f => /^superman_/.test(f)).slice(0, 2).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);

  // ── (2) LIVE: CAST (neutral Special = Heat Vision) ──
  section("live: special cast");
  await ready(); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); const cast = await pool("cast"); check("special cast fires a cast-pool line", log.some(f => cast.includes(f)), log.filter(f => /^superman_/.test(f)).join(",")); }

  // ── (2) LIVE: CAST via FLIGHT activation (P) ──
  section("live: flight activation bark");
  await ready(); await clearSfx();
  await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(4);
  { const log = await sfxLog(); const cast = await pool("cast"); check("flight activation fires a cast-pool line", log.some(f => cast.includes(f)), log.filter(f => /^superman_/.test(f)).join(",")); }
  // toggle flight back off (clean state)
  await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitGrounded();

  // ── (2) LIVE: CAST via ULTIMATE (U) ──
  section("live: ultimate bark");
  await ready(); await clearSfx();
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(4);
  { const log = await sfxLog(); const cast = await pool("cast"); check("ultimate fires a cast-pool line", log.some(f => cast.includes(f)), log.filter(f => /^superman_/.test(f)).join(",")); }
  // let the ult cinematic finish
  await page.waitForFunction(() => !window.__harness.supermanUltCine().active, null, { timeout: 12000, polling: 16 }).catch(() => {});
  await waitFrames(3);

  // ── (2) LIVE: taunt (attacker connect) + hitReact (defender) via a mirror heavy connect ──
  section("live: taunt (offense connect) + hitReact");
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(10);
  { const log = await sfxLog(); const tt = await pool("taunt"); const hr = await pool("hitReact");
    check("heavy connect fires a taunt line (attacker)", log.some(f => tt.includes(f)), log.filter(f => /^superman_/.test(f)).join(","));
    check("mirror defender fires a hitReact line", log.some(f => hr.includes(f)), ""); }

  // ── (2) LIVE: low-health bark (defender crosses 30%) ──
  section("live: low-health bark");
  await ready();
  await page.evaluate(() => { const p2h = window.__harness.p2().maxHealth; window.__harness.damageP2(p2h * 0.75); });  // drop p2 to ~25%
  await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(10);
  { const log = await sfxLog(); const lh = await pool("lowHealth"); check("crossing 30% fires a low-health line", log.some(f => lh.includes(f)), log.filter(f => /^superman_/.test(f)).join(",")); }

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  SUPERMAN voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
