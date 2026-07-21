// ─────────────────────────────────────────────────────────────────────────────
// Goku Black SSJ ROSE cinematic → gameplay HANDOFF must be clean (no "4 copies" glitch).
// The bug class: after the form-swap at the RESOLVE beat, _skinAnim = SSJ_ROSE_ANIM (which has NO
// "transform" strip), yet the caster still resolved action "transform" (held cast pose + teleportFlash>10)
// → the fallback drew the idle sheet UNSLICED as one oversized cell = ~4 overlapping copies.
// Fix: drop the morph cast pose at form-swap, clear isCharging, and gate the teleportFlash→"transform"
// branch on the ACTIVE anim set actually having a transform strip. This test traces the caster's
// resolved {action, sheet, spriteFrames} from the RESOLVE beat through control-return and asserts it
// is NEVER on a bogus "transform" (missing/empty sheet), and lands cleanly on the Rose idle.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 150, y: 120, width: 500, height: 520 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(REPO, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000 }).catch(() => {});

  // Trigger the SSJ Rose transform (tap P at full energy) and sample the caster every frame from the
  // RESOLVE beat (cinematic frame ≥ T_MORPH_END, where the form-swap lands) through control-return.
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p");
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && c.active; }, null, { timeout: 4000, polling: 8 }).catch(() => {});

  const trace = [];
  let inactiveCount = 0, shotResolve = false, shotAfter = false;
  for (let i = 0; i < 130; i++) {
    await wf(1);
    const s = await page.evaluate(() => { const c = window.__harness.ssjRoseCine?.(); const p = window.__harness.p1(); return { active: !!(c && c.active), cf: c ? c.frame : -1, action: p.action, sheet: p.spriteSheet || "", frames: p.spriteFrames, form: p.currentForm }; });
    // record from the form-swap beat (RESOLVE, cf>=48) onward, plus all post-cinematic frames
    if ((s.active && s.cf >= 48) || !s.active) {
      trace.push(s);
      if (s.active && s.cf >= 55 && !shotResolve) { shotResolve = true; await page.screenshot({ path: path.join(OUT, "GBHANDOFF_resolve.png"), clip: CLIP }); }
      if (!s.active && !shotAfter) { shotAfter = true; await page.screenshot({ path: path.join(OUT, "GBHANDOFF_after.png"), clip: CLIP }); }
    }
    if (!s.active) { inactiveCount++; if (inactiveCount >= 12) break; }
  }

  // The "transform" action is only legitimate on the real base morph sheet (frames=8). The glitch is
  // "transform" resolving against ANYTHING else (Rose skin has none → empty/idle fallback = 4 copies).
  const badTransform = trace.filter(s => s.action === "transform" && !s.sheet.includes("transformation"));
  check("no bogus 'transform' on a non-morph sheet (the 4-copies trigger)", badTransform.length === 0, `${badTransform.length} bad frames (sheets: ${[...new Set(badTransform.map(s => s.sheet))].join(",")})`);
  // No frame may render an EMPTY/missing sheet (the unsliced-fallback tell).
  const emptySheet = trace.filter(s => !s.sheet || s.sheet === "");
  check("no empty/missing sprite sheet through the handoff", emptySheet.length === 0, `${emptySheet.length} empty-sheet frames`);
  // Every sampled frame renders a real Goku Black sheet (base morph during the beat, Rose after).
  const allGoku = trace.every(s => s.sheet.includes("black_goku") || s.sheet.includes("goku_black"));
  check("every handoff frame renders a real Goku Black sheet", allGoku, `sheets=${[...new Set(trace.map(s => s.sheet.replace("./", "")))].join(", ")}`);
  // Control returns cleanly on the Rose IDLE (4 frames), not a fallback.
  const afterCine = trace.filter(s => !s.active);
  const firstAfter = afterCine[0];
  check("control returns on the Rose idle (properly sliced)", !!firstAfter && firstAfter.action === "idle" && firstAfter.sheet.includes("ssj_rose_idle") && firstAfter.frames === 4, firstAfter ? `action=${firstAfter.action} sheet=${firstAfter.sheet} frames=${firstAfter.frames}` : "no post-cinematic frame");
  check("ended in SSJ Rose form", !!firstAfter && firstAfter.form === "ssjRose", `form=${firstAfter?.form}`);
  check("captured resolve + post-handoff screenshots", shotResolve && shotAfter);
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku Black SSJ Rose handoff (no 4-copies): ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
