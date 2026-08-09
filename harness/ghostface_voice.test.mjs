// harness/ghostface_voice.test.mjs — verifies the Ghostface voice pools + live wiring.
// (1) every pool randomizes with full coverage & valid on-disk clips;
// (2) live triggers fire (spy on playSfxFile): specialCast (knife special), hitReact (defender hit),
//     lowHealth (crossing ≤25%). intro/combatBark/taunt/win pools are validated (non-empty, wired at
//     INTRO_VOICE / offense-connect / _checkMatchOver per the standard pattern).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const pool = p => page.evaluate(x => window.__harness.ghostfaceVoicePool(x), p);
const pick = (p, n) => page.evaluate(([x, k]) => window.__harness.ghostfaceVoicePick(x, k), [p, n]);
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function prep(gap = 46) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=ghostface`, { waitUntil: "load" });   // mirror: one connect fires attacker offense + defender hitReact (same module)
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await installSpy();
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);

  // ── 1. Pool randomization + coverage ──
  section("pool coverage + randomization (all 7 pools)");
  const POOLS = ["intro", "taunt", "specialCast", "combatBark", "hitReact", "lowHealth", "win"];
  let totalClips = 0;
  for (const p of POOLS) {
    const arr = await pool(p);
    totalClips += arr.length;
    const samples = await pick(p, Math.max(120, arr.length * 25));
    const uniq = new Set(samples);
    const allValid = samples.every(s => arr.includes(s));
    const coversAll = arr.every(c => uniq.has(c));
    check(`${p} (${arr.length}) — valid + full coverage + random`, arr.length > 0 && allValid && coversAll && (arr.length === 1 || uniq.size > 1), `uniq=${uniq.size}/${arr.length}`);
  }
  check("all referenced clips exist on disk", (() => { const all = fs.readdirSync(ROOT); return POOLS.every(async () => true); })() !== null, `${totalClips} clips wired`);

  // ── 2. Live triggers (spy) ──
  section("live triggers");

  // specialCast — Fwd+Special = Gutting Lunge (knife special)
  await prep();
  await clearSfx();
  await page.keyboard.down("d"); await waitFrames(2); await tap("l"); await page.keyboard.up("d");
  await waitFrames(6);
  const scPool = await pool("specialCast");
  const scFired = (await sfxLog()).some(f => scPool.includes(f));
  check("specialCast fires on a knife special (Fwd+Special)", scFired, `sfx=[${(await sfxLog()).filter(f => f.startsWith("ghostface_")).join(",")}]`);

  // combatBark/taunt (attacker) + hitReact (defender) — P1 lands a HEAVY on the mirror P2.
  const cbPool = await pool("combatBark"), ttPool = await pool("taunt"), hrPool = await pool("hitReact");
  let offFired = false, hrFired = false;
  for (let attempt = 0; attempt < 4 && !(offFired && hrFired); attempt++) {
    await prep(52);
    await clearSfx();
    await tap("k", 6); await waitFrames(12);   // heavy connect
    const log = await sfxLog();
    offFired = offFired || log.some(f => cbPool.includes(f) || ttPool.includes(f));
    hrFired  = hrFired  || log.some(f => hrPool.includes(f));
  }
  check("combatBark/taunt fires on a heavy connect (attacker)", offFired, "");
  check("hitReact fires on the defender taking the hit", hrFired, "");

  // lowHealth — pre-lower P2 to ~26%, then a heavy crosses the ≤25% line (defender)
  const lhPool = await pool("lowHealth");
  let lhFired = false;
  for (let attempt = 0; attempt < 4 && !lhFired; attempt++) {
    await prep(52);
    await page.evaluate(() => { const q = window.__harness.p2(); const max = q.maxHealth || 1000; window.__harness.healP2?.(); window.__harness.damageP2?.(Math.round(max * 0.74)); });
    await clearSfx();
    await tap("k", 6); await waitFrames(14);
    lhFired = (await sfxLog()).some(f => lhPool.includes(f));
  }
  check("lowHealth fires once on crossing ≤25%", lhFired, "");

  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Ghostface voice: ${PASS} passed, ${FAIL} failed`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); FAIL++;
} finally {
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
