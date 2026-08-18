// harness/jason_voice.test.mjs — proves each wired Jason SFX trigger FIRES at the correct combat moment in
// real play (not just that files load). Installs a playSfxFile spy (ichigo_voice pattern), drives each
// trigger, and asserts the spy captured a clip from the expected pool.
//   slot 1 attack effort  → light/heavy normal active-frame (+ air normal must stay SILENT per the brief)
//   slot 2/5 special cast → Relentless Slash (grunt, or ~25% roar)
//   slot 3 hit reaction   → Jason takes a STRONG hit (a light poke must NOT fire it)
//   slot 4 knockdown      → Jason enters the downed state
//   slot 6 win            → victory
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }
// spy
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return o(f, fb, x); }; } }); }
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const pool = (name) => page.evaluate(p => window.__harness.jasonVoicePool(p), name);
async function firedFrom(poolName) { const s = await spy(); const pl = await pool(poolName); return s.some(f => pl.includes(f)); }
async function firedAnyJason() { return (await spy()).some(f => f.startsWith("jason_sample_")); }
async function prep(gap) {
  await ready();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setEnergy?.(80); });
  await page.evaluate(() => { const f = window.__harness.p1(); }); // no-op keep-alive
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await wf(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=jason`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
  await installSpy();

  // ── pool integrity ──
  section("pool integrity (files exist + preserved names)");
  for (const [name, min] of [["effortLight", 1], ["effortHeavy", 1], ["specialCast", 1], ["specialRoar", 1], ["hitReact", 1], ["knockdown", 1], ["win", 1]]) {
    const pl = await pool(name);
    const ok = Array.isArray(pl) && pl.length >= min && pl.every(f => /^jason_sample_\d+_\d+\.mp3$/.test(f));
    check(`pool '${name}' = ${JSON.stringify(pl)}`, ok);
  }

  // ── slot 1: ATTACK EFFORT (light + heavy), and AIR must stay silent ──
  section("slot 1 — attack effort fires on the normal's swing");
  await prep(70); await clearSpy();
  await page.keyboard.down("j"); await wf(5); await page.keyboard.up("j"); await wf(6);
  check("LIGHT normal fires an effortLight grunt", await firedFrom("effortLight"), (await spy()).join(","));

  await prep(90); await clearSpy();
  await page.keyboard.down("k"); await wf(6); await page.keyboard.up("k"); await wf(8);
  check("HEAVY normal fires an effortHeavy grunt", await firedFrom("effortHeavy"), (await spy()).join(","));

  // AIR normal — the brief EXCLUDES the air normal from attack-effort → must be SILENT.
  await prep(48); await page.evaluate(() => window.__harness.liftP1(40)); await clearSpy();
  await page.keyboard.down("j"); await wf(6); await page.keyboard.up("j"); await wf(6);
  check("AIR normal is SILENT (excluded from effort by design)", !(await firedAnyJason()), (await spy()).join(","));

  // ── slot 2/5: SPECIAL CAST ──
  section("slot 2/5 — Relentless Slash cast voice");
  await prep(120); await clearSpy();
  await page.keyboard.down("l"); await wf(4); await page.keyboard.up("l"); await wf(6);
  const sp = await spy();
  const castPool = [...(await pool("specialCast")), ...(await pool("specialRoar"))];
  check("SPECIAL cast fires a committed grunt or signature roar", sp.some(f => castPool.includes(f)), sp.join(","));

  // ── slot 3: HIT REACTION (strong only) ──
  // NOTE: in training the dummy p2 is ALSO Jason, so p2's OWN effort grunt appears in the spy too — we
  // assert specifically on the hitReact clip (13), not merely "any jason clip".
  section("slot 3 — hit reaction (STRONG hit fires it; a light poke does NOT)");
  // NEGATIVE: a light poke on Jason (scaled ~36 dmg, below the strong threshold) must NOT fire hitReact.
  await prep(40);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 40 * (a.facing || 1)); });
  await clearSpy();
  await page.evaluate(() => window.__harness.p2Attack());   // light: ~36 EFF on Jason → NOT strong
  await wf(16);
  check("LIGHT poke does NOT fire hitReact (gated to strong hits)", !(await firedFrom("hitReact")), (await spy()).join(","));
  // POSITIVE: a heavy-category hit on Jason fires the pained hitReact grunt.
  await prep(40);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 40 * (a.facing || 1)); });
  await clearSpy();
  await page.evaluate(() => window.__harness.p2Heavy());    // heavy-category → strong
  await wf(16);
  check("STRONG (heavy) hit on Jason fires a hitReact grunt", await firedFrom("hitReact"), (await spy()).join(","));

  // ── slot 4: KNOCKDOWN ──
  section("slot 4 — knockdown grunt on entering the downed state");
  await prep(120); await clearSpy();
  await page.evaluate(() => window.__harness.knockdownP1(60));
  await wf(4);
  check("entering knockdown fires the knockdown grunt", await firedFrom("knockdown"), (await spy()).join(","));
  // it fires ONCE (not every frame while down)
  await clearSpy(); await wf(10);
  check("knockdown grunt does NOT re-fire every frame while down", !(await firedFrom("knockdown")), (await spy()).join(","));

  // ── slot 6: WIN ──
  section("slot 6 — win voice on victory");
  await clearSpy();
  await page.evaluate(() => window.__harness.forceMatchWin("p1"));
  await wf(10);
  check("victory fires a win clip", await firedFrom("win"), (await spy()).join(","));

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("SUITE ERROR", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  JASON voice: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
