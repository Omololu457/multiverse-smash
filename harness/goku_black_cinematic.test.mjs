// harness/goku_black_cinematic.test.mjs
// ---------------------------------------------------------------------------
// SSJ Rose TRANSFORMATION CINEMATIC (mirrors Kurama/Sasuke freeze cinematics).
// Verified in real play with screenshots:
//   • trigger still works (charge-and-release at real starting energy) → cinematic starts
//   • combat FULLY FREEZES — move/attack inputs do nothing during the cinematic
//   • the opponent is genuinely OUT OF FRAME (camera isolates Goku Black)
//   • the form-swap lands at the END of the cinematic (not before), leaving him SSJ Rose
// Shots → harness/shots/GBCINE_*.png
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(REPO, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const p1 = () => page.evaluate(() => window.__harness.p1());
const cine = () => page.evaluate(() => window.__harness.ssjRoseCine());
const p2screen = () => page.evaluate(() => window.__harness.p2ScreenX());
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();
  // put the dummy adjacent so "opponent out of frame" is a REAL test (not trivially far away)
  const a0 = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a0.x + 100);   // a realistic "transform at neutral" distance
  await wf(2);

  // ── TRIGGER (re-verify the fix) — charge-and-release at real starting energy → cinematic ──
  section("TRIGGER — charge (hold P) from real 100 energy, release → cinematic starts");
  await page.evaluate(() => window.__harness.setEnergy(100));
  await page.keyboard.down("p");
  await page.waitForFunction(() => window.__harness.p1().energy >= 180, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.keyboard.up("p");
  await wf(2);
  const started = await cine();
  check("SSJ Rose CINEMATIC starts on release at/near max", started.active === true, `active=${started.active} phase=${started.phase} frame=${started.frame}`);
  check("form NOT yet swapped when the cinematic begins (lands at the end)", (await p1()).currentForm !== "ssjRose", `form=${(await p1()).currentForm}`);

  // ── FREEZE — inputs do nothing during the cinematic ─────────────────────────
  section("FREEZE — combat is fully paused (move/attack do nothing)");
  {
    const before = await p1();
    await page.keyboard.down("d"); await page.keyboard.down("j");   // try to walk + attack
    await wf(6);
    const mid = await p1(); const c = await cine();
    check("still mid-cinematic", c.active === true, `phase=${c.phase} frame=${c.frame}`);
    check("held MOVE does nothing (x unchanged)", Math.abs((mid.x || 0) - (before.x || 0)) < 0.5, `x ${before.x?.toFixed?.(1)} → ${mid.x?.toFixed?.(1)}`);
    check("held ATTACK does nothing (not attacking)", mid.attacking === false, `attacking=${mid.attacking}`);
    await page.keyboard.up("d"); await page.keyboard.up("j");
  }

  // ── OPPONENT OUT OF FRAME — camera isolates Goku Black ───────────────────────
  section("ISOLATION — opponent genuinely OFF-frame during the cinematic");
  {
    // wait until the camera has settled into the isolate (mid-morph), then sample
    await page.waitForFunction(() => window.__harness.ssjRoseCine().phase === "morph", null, { timeout: 4000, polling: 16 }).catch(() => {});
    await wf(16);   // let the zoom/pan finish snapping in
    let offFrames = 0, samples = 0; let worst = null;
    for (let i = 0; i < 8; i++) {
      const c = await cine(); if (!c.active || c.phase === "resolve") break;
      const s = await p2screen(); samples++;
      if (s.offFrame) offFrames++; worst = s;
      if (i === 0) await page.screenshot({ path: path.join(OUT, "GBCINE_transform.png") });
      await wf(2);
    }
    check("opponent (p2) is OFF-frame during the cinematic", samples > 0 && offFrames >= samples - 1, `offFrame ${offFrames}/${samples}, p2 screen L=${worst?.left?.toFixed?.(0)} R=${worst?.right?.toFixed?.(0)} of ${worst?.cw}`);
  }

  // ── FORM-SWAP AT END — resolve leaves him SSJ Rose ──────────────────────────
  section("RESOLVE — form-swap lands at the end; gameplay resumes in SSJ Rose");
  {
    await page.waitForFunction(() => !window.__harness.ssjRoseCine().active, null, { timeout: 6000, polling: 16 }).catch(() => {});
    const ended = await cine();
    check("cinematic ended (combat resumes)", ended.active === false, `active=${ended.active}`);
    await wf(4);
    const after = await p1();
    check("now in SSJ Rose form", after.currentForm === "ssjRose" && after.hasSkinAnim === true, `form=${after.currentForm} skinAnim=${after.hasSkinAnim}`);
    check("SSJ Rose art swapped in (Rose sheet)", (after.spriteSheet || "").includes("goku_black_ssj_rose"), `sheet=${after.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GBCINE_after.png") });
    // and he can move again now that the freeze is over
    const bx = after.x;
    await page.keyboard.down("d"); await wf(6); await page.keyboard.up("d");
    check("gameplay resumed — can move after the cinematic", Math.abs((await p1()).x - bx) > 1, `moved from ${bx?.toFixed?.(0)}`);
  }

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n  Goku Black SSJ ROSE CINEMATIC: ${PASS} passed, ${FAIL} failed\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
