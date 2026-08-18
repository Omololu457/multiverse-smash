// harness/hiruzen_voice.test.mjs — verifies Hiruzen's voice lines actually PLAY on their triggers (not just
// that files load). STATIC: every pool clip exists on disk. RUNTIME: installs a playSfxFile spy, drives each
// trigger, asserts the spy captured a clip from the expected pool. (Same pattern as jason_voice/isshiki.)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { HIRUZEN_VOICE } from "../hiruzenVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

// ── STATIC: all clips present ──
console.log("── static: pool clips exist on disk ──");
let missing = [];
for (const [pool, arr] of Object.entries(HIRUZEN_VOICE)) for (const f of arr) if (!fs.existsSync(path.join(ROOT, f))) missing.push(`${pool}:${f}`);
check(`all ${Object.values(HIRUZEN_VOICE).reduce((a, x) => a + x.length, 0)} pool refs exist`, missing.length === 0, missing.slice(0, 5).join(", "));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const pool = name => page.evaluate(p => window.__harness.hiruzenVoicePool(p), name);
async function firedFrom(poolName) { const s = await spy(); const pl = await pool(poolName); return s.some(f => pl.includes(f)); }
async function firedAny() { return (await spy()).some(f => f.startsWith("hiruzen_line_")); }
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=hiruzen&p2=hiruzen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  console.log("\n── intro ──");
  await installSpy(); await clearSpy();
  await page.evaluate(() => window.__harness.forceIntro("intro"));
  await wf(20);
  check("intro fires an intro line", await firedFrom("intro"), (await spy()).join(",").slice(0, 80));

  await page.evaluate(() => window.__harness.boot()); await wf(6);
  await installSpy();

  console.log("\n── combo effort (punches) ──");
  await prep(64); await clearSpy();
  await page.keyboard.down("k"); await page.waitForTimeout(450); await page.keyboard.up("k"); await wf(2);   // heavy startup ~12f → real-time settle to the active frame
  check("heavy fires an effort shout", await firedFrom("effort"), (await spy()).join(","));
  await prep(64); await wf(34); await clearSpy();   // let the ~30f effort-voice cooldown expire
  await page.keyboard.down("j"); await page.waitForTimeout(220); await page.keyboard.up("j"); await wf(2);
  check("light fires an effort shout", await firedFrom("effort"), (await spy()).join(","));

  console.log("\n── specials + ultimate ──");
  for (const [dir, poolName, label] of [[null, "spin", "SPIN"], ["F", "fireball", "Fire"], ["D", "earthWall", "Earth"], ["U", "enma", "Enma"], ["B", "effort", "Bind"]]) {
    await prep(90); await clearSpy();
    await page.evaluate(d => window.__harness.p1SpecialDir(d), dir); await wf(4);
    check(`${label} special fires a ${poolName} line`, await firedFrom(poolName), (await spy()).join(","));
  }
  await prep(90); await clearSpy();
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); await wf(6);
  check("Reaper Death Seal ult fires an ultimate line", await firedFrom("ultimate"), (await spy()).join(","));

  console.log("\n── hit reactions + knockdown ──");
  await prep(40); await clearSpy();
  await page.evaluate(() => window.__harness.p2Heavy());   // strong hit → hitHeavy
  for (let i = 0; i < 10; i++) await wf(1);
  check("heavy hit fires a hitHeavy line", await firedFrom("hitHeavy"), (await spy()).join(","));
  await prep(40); await clearSpy();
  await page.evaluate(() => window.__harness.knockdownP1(60)); await wf(4);   // real knockdownState → the voice watcher fires
  check("knockdown fires a knockdown line", await firedFrom("knockdown"), (await spy()).join(","));

  console.log("\n── win pool wired ──");
  check("win pool non-empty (fires on victory)", (await pool("win")).length > 0, "");

  check("no exclusion leak — named-opponent clips are NOT in any pool", (() => {
    const banned = ["hiruzen_line_23d.mp3", "hiruzen_line_23g.mp3", "hiruzen_line_51_", "hiruzen_line_31_", "hiruzen_line_27_"];
    const all = Object.values(HIRUZEN_VOICE).flat();
    return !all.some(f => banned.some(b => f.includes(b)));
  })(), "");

  console.log(`\n════ HIRUZEN voice: ${PASS} passed, ${FAIL} failed ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
