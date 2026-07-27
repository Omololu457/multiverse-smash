// harness/flash_reverse_voice.test.mjs — Reverse Flash SKIN voice pack + skin-gating.
// (1) skin exists; (2) every pool randomizes + covers; (3) resolver is skin-GATED (null on other skins);
// (4) LIVE per-fighter gating: under flash_reverse → revflash_* lines; under any other skin → base
// flashinj2_* lines, in the SAME mirror match. Base Flash must be completely unaffected off-skin.
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
const setSkin = (side, k) => page.evaluate(([s, kk]) => window.__harness.setSkin(s, kk), [side, k]);
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
const hasRev = log => log.some(f => /^revflash_/.test(f));
const hasBase = log => log.some(f => /^flashinj2_/.test(f));
async function landHeavy(gap = 52) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  await clearSfx();
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(12);
  return sfxLog();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=flash&p2=flash`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();

  // ── (1) skin exists ──
  section("Reverse Flash skin registered");
  const skins = await page.evaluate(() => window.__harness.showSkinSelect("flash", "p1", 0).skins.map(s => s.id));
  check("flash_reverse skin exists", skins.includes("flash_reverse"), skins.join(","));

  // ── (2) pool randomization + coverage (resolver) ──
  section("pool randomization + coverage");
  const POOLS = ["intro", "taunt", "cast", "hitConnect", "hitReact", "win"];
  for (const pool of POOLS) {
    const samples = await page.evaluate(p => window.__harness.skinVoicePick("flash", "flash_reverse", p, 200), pool);
    const uniq = new Set(samples.filter(Boolean));
    check(`${pool} — randomizes (${uniq.size} distinct)`, uniq.size > 1 && samples.every(s => /^revflash_/.test(s)), `distinct=${uniq.size}`);
  }

  // ── (3) resolver skin-GATING (null on every other skin / char) ──
  section("resolver is skin-gated (no leak)");
  for (const skin of ["default", "flash_godspeed", "flashBlue"]) {
    const any = await page.evaluate(s => ["intro","taunt","cast","hitConnect","hitReact","win"].some(p => window.__harness.skinVoicePick("flash", s, p, 5).some(Boolean)), skin);
    check(`skin "${skin}" → no revflash override (base voice used)`, any === false, `leaked=${any}`);
  }
  const otherChar = await page.evaluate(() => ["intro","taunt"].some(p => window.__harness.skinVoicePick("gon", "flash_reverse", p, 5).some(Boolean)));
  check("other character with same skinId string → no leak", otherChar === false, "");

  // ── (4) LIVE per-fighter gating (boot the real match) ──
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("LIVE: p1=Reverse attacks p2=base");
  await setSkin("p1", "flash_reverse"); await setSkin("p2", "default");
  { const log = await landHeavy();
    check("p1 (Reverse) attacker line is revflash_*", hasRev(log), log.filter(f=>/^(revflash|flashinj2)/.test(f)).join(","));
    check("p2 (base) hit-reaction is flashinj2_* (base untouched)", hasBase(log), ""); }

  section("LIVE: p1=base attacks p2=Reverse");
  await setSkin("p1", "default"); await setSkin("p2", "flash_reverse");
  { const log = await landHeavy();
    check("p1 (base) attacker line is flashinj2_*", hasBase(log), log.filter(f=>/^(revflash|flashinj2)/.test(f)).join(","));
    check("p2 (Reverse) hit-reaction is revflash_*", hasRev(log), ""); }

  section("LIVE: base skin never emits revflash (regression guard)");
  await setSkin("p1", "default"); await setSkin("p2", "default");
  { const log = await landHeavy();
    check("all-base mirror → NO revflash clip anywhere", !hasRev(log), log.filter(f=>/^(revflash|flashinj2)/.test(f)).join(",")); }

  section("LIVE: Reverse special-cast bark");
  await setSkin("p1", "flash_reverse");
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1"); });
  await clearSfx();
  await page.keyboard.down("l"); await waitFrames(8); await page.keyboard.up("l"); await waitFrames(6);
  { const log = await sfxLog(); const castPool = await page.evaluate(() => window.__harness.skinVoicePick("flash","flash_reverse","cast",1)); check("Reverse special cast fires a revflash cast line", log.some(f => /^revflash_/.test(f)), log.filter(f=>/^revflash/.test(f)).slice(0,2).join(",")); }

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  Reverse Flash voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
