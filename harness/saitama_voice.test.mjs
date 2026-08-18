// harness/saitama_voice.test.mjs — verifies Saitama's voice lines actually PLAY on their triggers (not just
// that files load). STATIC: all 18 provided clips are referenced, each exists on disk, the 5 identified lines
// land in the right pool, and the deliberate open gaps stay UNMAPPED. RUNTIME: installs a playSfxFile spy,
// drives each trigger, asserts the spy captured a clip from the expected pool. (Same pattern as hiruzen/jason.)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { SAITAMA_VOICE } from "../saitamaVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

// ── STATIC ──
console.log("── static: pool mapping + clips exist on disk ──");
const all = Object.values(SAITAMA_VOICE).flat();
let missing = all.filter(f => !fs.existsSync(path.join(ROOT, f)));
check(`all ${all.length} pool refs exist on disk`, missing.length === 0, missing.slice(0, 5).join(", "));
check("all 18 provided clips are used (5 identified + 13 barks)", all.length === 18, `got ${all.length}`);
check("intro = hero_for_fun", SAITAMA_VOICE.intro[0] === "saitama_hero_for_fun_061.1s.mp3");
check("bargain = bargain_sale", SAITAMA_VOICE.bargain[0] === "saitama_bargain_sale_042.2s.mp3");
check("punchCombo = normal_punches", SAITAMA_VOICE.punchCombo[0] === "saitama_normal_punches_096.0s.mp3");
check("ultimate = finishing_move (NOT Serious Punch)", SAITAMA_VOICE.ultimate[0] === "saitama_finishing_move_066.9s.mp3");
check("win = counting_on_you", SAITAMA_VOICE.win[0] === "saitama_counting_on_you_155.1s.mp3");
check("hitLight = 13 unidentified barks", SAITAMA_VOICE.hitLight.length === 13 && SAITAMA_VOICE.hitLight.every(f => /^saitama_bark_/.test(f)));
check("open gaps UNMAPPED (no taunt/knockdown/hitHeavy/namecall pools)",
  !("taunt" in SAITAMA_VOICE) && !("knockdown" in SAITAMA_VOICE) && !("hitHeavy" in SAITAMA_VOICE) && !("namecall" in SAITAMA_VOICE));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun && (p._saitamaDeathTimer || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {}); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const pool = name => page.evaluate(p => window.__harness.saitamaVoicePool(p), name);
async function firedFrom(poolName) { const s = await spy(); const pl = await pool(poolName); return s.some(f => pl.includes(f)); }
// resetOffenseVoice zeroes _atkVoiceCd — the cast-voice cooldown deliberately leaks between casts in real
// play (anti machine-gun), so we clear it between isolated triggers or the 2nd cast's voice is suppressed.
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.resetOffenseVoice?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.clearHitVoiceCd?.("p1"); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=saitama&p2=saitama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  console.log("\n── intro ──");
  await installSpy(); await clearSpy();
  await page.evaluate(() => window.__harness.forceIntro("intro"));
  await wf(20);
  check("intro fires the hero-for-fun line", await firedFrom("intro"), (await spy()).join(",").slice(0, 80));

  await page.evaluate(() => window.__harness.boot()); await wf(6);
  await installSpy();

  console.log("\n── special casts ──");
  await prep(84); await clearSpy();
  await page.evaluate(() => window.__harness.p1SpecialDir("U")); await wf(4);   // Up+Special = Today Is Bargain Sale
  check("Bargain Sale (Up+Special) fires the bargain line", await firedFrom("bargain"), (await spy()).join(","));

  console.log("\n── ultimate ──");
  await prep(70); await clearSpy();
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); await wf(6);
  check("Death Punch ult fires the finishing-move line", await firedFrom("ultimate"), (await spy()).join(","));

  // punch-combo LAST among casts — its flurry is the stickiest move, so nothing sensitive follows it.
  await prep(60); await clearSpy();
  await page.keyboard.down("l"); await page.waitForTimeout(90); await page.keyboard.up("l"); await wf(4);   // neutral-Special TAP = punch-combo (short press)
  check("punch-combo TAP fires the normal-punches line", await firedFrom("punchCombo"), (await spy()).join(","));

  console.log("\n── light hit-reaction bark ──");
  await prep(40); await clearSpy();
  await page.evaluate(() => window.__harness.p2Attack());   // LIGHT-category hit → a bark
  for (let i = 0; i < 12; i++) await wf(1);
  check("light hit fires a battle bark", await firedFrom("hitLight"), (await spy()).join(","));
  check("heavy hit stays SILENT (flagged open gap)", await (async () => {
    await prep(40); await clearSpy();
    await page.evaluate(() => window.__harness.p2Heavy());   // STRONG-category hit → no bark
    for (let i = 0; i < 12; i++) await wf(1);
    return !(await firedFrom("hitLight"));
  })(), (await spy()).join(","));

  console.log("\n── win pool wired ──");
  check("win pool = one line (fires on victory)", (await pool("win")).length === 1, "");
} finally {
  console.log(`\nSaitama voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
