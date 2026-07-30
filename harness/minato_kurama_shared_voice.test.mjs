// harness/minato_kurama_shared_voice.test.mjs — PART 2 verification.
// Cross-character audio REUSE: naruto_kurama_ultimate.mp3 ("Kurama! Haa! Tailed Beast Bomb!")
// must fire at BOTH Naruto's ult (existing) AND Minato's half-Kurama ult (new), independently,
// with no interference:
//   • Minato's ult fires his DEDICATED cast line (minatoVoice "ult" pool) at activation AND the
//     shared naruto_kurama_ultimate.mp3 at the bomb-forming CHARGE beat — alongside, not replacing.
//   • Naruto's ult still fires naruto_kurama_ultimate.mp3 (unaffected).
//   • Each fires the shared clip EXACTLY ONCE (no double-fire); the cinematics are mutually
//     exclusive (freeze contract) so one character's ult can never suppress/double the other.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);
const stateF = () => page.evaluate(() => window.__harness.state());
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const countOf = (log, needle) => log.filter(f => String(f).includes(needle)).length;
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function boot(who) {
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=${who}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(10);
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(4);
}

try {
  // ═══ MINATO — dedicated line AND the shared Kurama line, alongside ═══
  section("MINATO half-Kurama ult: dedicated line + shared naruto_kurama_ultimate.mp3");
  await boot("minato");
  const minatoUltPool = await page.evaluate(() => window.__harness.minatoVoicePool("ult"));
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.minatoKuramaUltCine().active, null, { timeout: 6000, polling: 16 });
  // Dedicated cast line fires early (at activation) — before the shared line's CHARGE beat.
  await page.waitForFunction((pool) => (window.__harness.__sound._sfxSpy || []).some(f => pool.includes(f)), minatoUltPool, { timeout: 6000, polling: 16 }).catch(() => {});
  const preCharge = await sfxLog();
  check("Minato's DEDICATED ult line fired at activation", minatoUltPool.some(p => preCharge.includes(p)), `firstFew=${preCharge.slice(0,4).join(",")}`);
  check("shared line has NOT fired yet during rise (pre-CHARGE)", countOf(preCharge, "naruto_kurama_ultimate.mp3") === 0, `phase=${(await page.evaluate(()=>window.__harness.minatoKuramaUltCine())).phase}`);
  // By the CHARGE beat the SHARED line fires — alongside the (already-played) dedicated line.
  await page.waitForFunction(() => { const c = window.__harness.minatoKuramaUltCine(); return c.phase === "charge" && (window.__harness.__sound._sfxSpy || []).some(f => f.includes("naruto_kurama_ultimate.mp3")); }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const cAtCharge = await page.evaluate(() => window.__harness.minatoKuramaUltCine());
  const midLog = await sfxLog();
  check("shared naruto_kurama_ultimate.mp3 fires at Minato's CHARGE beat", countOf(midLog, "naruto_kurama_ultimate.mp3") >= 1, `phase=${cAtCharge.phase} frame=${cAtCharge.frame}`);
  check("BOTH play (dedicated NOT replaced by shared)", minatoUltPool.some(p => midLog.includes(p)) && countOf(midLog, "naruto_kurama_ultimate.mp3") >= 1, `dedicated=${minatoUltPool.filter(p=>midLog.includes(p)).length} shared=${countOf(midLog,"naruto_kurama_ultimate.mp3")}`);
  check("fired BEFORE bomb impact (charge windup, not struck)", cAtCharge.struck === false, `struck=${cAtCharge.struck} impactFrame=${cAtCharge.impactFrame}`);
  // Let the cinematic fully end and confirm the shared clip fired EXACTLY ONCE (no double-fire).
  await page.waitForFunction(() => window.__harness.minatoKuramaUltCine().active === false, null, { timeout: 12000, polling: 16 }).catch(() => {});
  const minatoFinal = await sfxLog();
  check("shared line fired EXACTLY ONCE across Minato's whole ult", countOf(minatoFinal, "naruto_kurama_ultimate.mp3") === 1, `count=${countOf(minatoFinal, "naruto_kurama_ultimate.mp3")}`);

  // ═══ NARUTO — existing wiring unaffected ═══
  section("NARUTO ult: naruto_kurama_ultimate.mp3 still fires, exactly once, unaffected");
  await boot("naruto");
  await clearSfx();
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.kuramaUltCine().active, null, { timeout: 6000, polling: 16 });
  await page.waitForFunction(() => { const c = window.__harness.kuramaUltCine(); return c.phase === "charge" && (window.__harness.__sound._sfxSpy || []).some(f => f.includes("naruto_kurama_ultimate.mp3")); }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const nAtCharge = await page.evaluate(() => window.__harness.kuramaUltCine());
  check("Naruto still fires naruto_kurama_ultimate.mp3 at his CHARGE beat", countOf(await sfxLog(), "naruto_kurama_ultimate.mp3") >= 1, `phase=${nAtCharge.phase} frame=${nAtCharge.frame}`);
  await page.waitForFunction(() => window.__harness.kuramaUltCine().active === false, null, { timeout: 12000, polling: 16 }).catch(() => {});
  const narutoFinal = await sfxLog();
  check("Naruto fired the shared line EXACTLY ONCE (no double-fire from Minato reuse)", countOf(narutoFinal, "naruto_kurama_ultimate.mp3") === 1, `count=${countOf(narutoFinal, "naruto_kurama_ultimate.mp3")}`);
  check("Naruto did NOT bleed any Minato-pool line", !narutoFinal.some(f => minatoUltPool.includes(f)), `minatoLines=${narutoFinal.filter(f=>minatoUltPool.includes(f)).join(",")}`);

  console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
} catch (e) { console.log("FATAL", e); FAIL++; }
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
