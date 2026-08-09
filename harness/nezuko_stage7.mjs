// harness/nezuko_stage7.mjs — Stage 7 evidence: both ultimates on the Ultimate button (TAP vs HOLD).
//   TAP  → Kekijutsu Baketsu: two-phase single slot — punch barrage (nezukoUlt1a) auto-chains → rising
//          finisher (nezukoUlt1b). Connects.
//   HOLD → Demon Transformation: mode-change — buffed damage (×1.4) + transformed idle for a fixed window,
//          then AUTO-REVERTS cleanly to base Nezuko on timer expiry.
//   Independently selectable: TAP never transforms; HOLD never fires the barrage.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 48) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); window.__harness.p1ClearCooldowns?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s7_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── ULTIMATE 1 — Kekijutsu Baketsu (TAP): two-phase barrage → finisher ──
  section("Ultimate 1 — Kekijutsu Baketsu (TAP, two-phase)");
  await reset(46);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("u"); await page.keyboard.up("u");   // TAP (<250ms)
    const moves = new Set(); let demon = false;
    for (let i = 0; i < 90; i++) { const c = await p1(); if (c.currentMove) moves.add(c.currentMove); if (c.nzDemonActive) demon = true; if (i === 4) await shot("ult1_barrage"); if (i === 40) await shot("ult1_finisher"); await waitFrames(1); }
    const dmg = hp0 - (await p2()).health;
    check("TAP → phase 1 barrage (nezukoUlt1a)", moves.has("nezukoUlt1a"), `moves=${[...moves].join(",")}`);
    check("auto-chains → phase 2 finisher (nezukoUlt1b)", moves.has("nezukoUlt1b"), `moves=${[...moves].join(",")}`);
    check("Kekijutsu connects (both phases damage)", dmg > 0, `dmg=${dmg}`);
    check("TAP does NOT transform (independent)", !demon, `demon=${demon}`);
  }

  // ── ULTIMATE 2 — Demon Transformation (HOLD): buff → timed revert ──
  section("Ultimate 2 — Demon Transformation (HOLD, mode-change)");
  await reset(300);
  { await page.keyboard.down("u"); await page.waitForTimeout(320); await page.keyboard.up("u");   // HOLD (≥250ms)
    await waitFrames(3);
    const on = await p1();
    await shot("transform_in");
    check("HOLD → Demon Transformation active", on.nzDemonActive, `active=${on.nzDemonActive}`);
    check("transform buffs damage (×1.4)", on.dmgMult > 1.3, `dmgMult=${on.dmgMult}`);
    check("HOLD does NOT fire the barrage (independent)", on.currentMove !== "nezukoUlt1a", `move=${on.currentMove}`);
    // sustained transformed idle
    await waitFrames(40);
    const idle = await p1();
    await shot("transform_idle");
    check("transformed state renders transformation art", has(idle, "nezuko_transformation") && idle.nzDemonActive, `sheet=${idle.spriteSheet}`);
    // timer expiry → clean revert to base
    await page.waitForFunction(() => !window.__harness.p1().nzDemonActive, null, { timeout: 12000, polling: 32 }).catch(() => {});
    const off = await p1();
    await shot("transform_reverted");
    check("timer expires → reverts to base (not transformed)", !off.nzDemonActive, `active=${off.nzDemonActive} timer=${off.nzDemonTimer}`);
    check("revert restores base damage multiplier", Math.abs(off.dmgMult - 1) < 0.01, `dmgMult=${off.dmgMult}`);
    check("reverted idle back to base Nezuko", has(off, "nezuko_idle") || !has(off, "nezuko_transformation"), `sheet=${off.spriteSheet}`);
  }

  section("stability");
  check("no JS errors during Stage 7", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
