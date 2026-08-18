// harness/yamamoto_voice.test.mjs — verifies Yamamoto's voice lines actually PLAY on their triggers (not
// just that files load). STATIC: every pool clip exists on disk + no cross-pool dupes + coverage report
// (126 of 161 pooled; 35 remainders intentional). RUNTIME: installs a playSfxFile spy, drives each trigger,
// asserts the spy captured a clip from the expected pool. (Same pattern as mayuri_voice.test.mjs.)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { YAMAMOTO_VOICE } from "../yamamotoVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const inPool = (files, pool) => files.some(f => YAMAMOTO_VOICE[pool].includes(f));

// ── STATIC ──
console.log("── static: pool clips exist on disk + coverage ──");
const allRefs = Object.values(YAMAMOTO_VOICE).flat();
let missing = [];
for (const [pool, arr] of Object.entries(YAMAMOTO_VOICE)) for (const f of arr) if (!fs.existsSync(path.join(ROOT, f))) missing.push(`${pool}:${f}`);
check(`all ${allRefs.length} pool refs exist on disk`, missing.length === 0, missing.slice(0, 5).join(", "));
const uniq = new Set(allRefs);
check("no clip is in more than one pool (each ref unique)", uniq.size === allRefs.length, `refs=${allRefs.length} unique=${uniq.size}`);
const diskClips = fs.readdirSync(ROOT).filter(f => /^yamamoto_line_.*\.mp3$/.test(f) && f !== "yamamoto_line_147_0316.8s.mp3");
check("flagged raw line_147 is NOT pooled (replaced by 147a/b/c splits)", !uniq.has("yamamoto_line_147_0316.8s.mp3") && uniq.has("yamamoto_line_147b_0316.8s.mp3"), "");
console.log(`  (coverage: ${uniq.size} pooled of ${diskClips.length} usable clips — ${diskClips.length - uniq.size} remainders left unused, expected)`);

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
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=yamamoto&p2=yamamoto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  console.log("\n── intro ──");
  await installSpy(); await clearSpy();
  await page.evaluate(() => window.__harness.forceIntro("intro"));
  await wf(20);
  check("intro fires an intro line", inPool(await spy(), "intro"), (await spy()).join(",").slice(0, 80));

  await page.evaluate(() => window.__harness.boot()); await wf(6);
  await installSpy();

  console.log("\n── command-chain / normal effort ──");
  await prep(56); await clearSpy();
  await page.keyboard.down("k"); await page.waitForTimeout(450); await page.keyboard.up("k"); await wf(2);
  check("heavy fires an effort shout", inPool(await spy(), "effort"), (await spy()).join(","));
  await prep(56); await wf(44); await clearSpy();   // let the ~40f effort cooldown expire
  await page.keyboard.down("j"); await page.waitForTimeout(220); await page.keyboard.up("j"); await wf(2);
  check("light fires an effort shout", inPool(await spy(), "effort"), (await spy()).join(","));

  console.log("\n── 5 specials (per-cast pools) ──");
  for (const [dir, poolName, label] of [[null, "beamCast", "Ground-Sweep Beam"], ["F", "stabCast", "Large Ground-Stab (flagship)"], ["D", "eruptionCast", "Ground Eruption Stab"], ["U", "overheadCast", "Overhead Slam"], ["B", "thrustCast", "Horizontal Thrust"]]) {
    await prep(80); await clearSpy();
    await page.evaluate(d => window.__harness.p1SpecialDir(d), dir); await wf(4);
    check(`${label} fires a ${poolName} line`, inPool(await spy(), poolName), (await spy()).join(","));
  }

  console.log("\n── Shunpo ──");
  await prep(120); await clearSpy();
  await page.evaluate(() => window.__harness.yamamotoShunpo("p1")); await wf(4);
  check("Shunpo fires a shunpo line", inPool(await spy(), "shunpo"), (await spy()).join(","));

  console.log("\n── Ultimate ──");
  await prep(120); await clearSpy();
  await page.evaluate(() => window.__harness.p1Ultimate()); await wf(6);
  check("Ultimate fires an ultimate line", inPool(await spy(), "ultimate"), (await spy()).join(","));

  console.log("\n── hit reaction + knockdown ──");
  await prep(40); await clearSpy();
  await page.evaluate(() => window.__harness.p2Heavy());   // strong hit → hitHeavy
  for (let i = 0; i < 10; i++) await wf(1);
  check("heavy hit fires a hitHeavy line", inPool(await spy(), "hitHeavy"), (await spy()).join(","));
  await prep(40); await clearSpy();
  await page.evaluate(() => window.__harness.knockdownP1(60)); await wf(4);
  check("knockdown fires a knockdown line", inPool(await spy(), "knockdown"), (await spy()).join(","));

  console.log("\n── pools wired ──");
  check("hitLight pool non-empty (fires on light-category hits <55 dmg)", YAMAMOTO_VOICE.hitLight.length > 0, `${YAMAMOTO_VOICE.hitLight.length} clips`);
  check("win pool non-empty (fires on victory)", YAMAMOTO_VOICE.win.length > 0, `${YAMAMOTO_VOICE.win.length} clips`);
  check("namecall pool banked (unconfirmed content — available)", YAMAMOTO_VOICE.namecall.length > 0, `${YAMAMOTO_VOICE.namecall.length} clips`);

  console.log(`\n════ YAMAMOTO voice: ${PASS} passed, ${FAIL} failed ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
