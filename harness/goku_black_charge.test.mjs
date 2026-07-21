// ─────────────────────────────────────────────────────────────────────────────
// Goku Black CHARGE-UP animation (hold P). Replaces the procedural particle aura
// with the real mapped sprites, form-aware:
//   BASE → black_goku_power_up_uniform.png      (6f; buildup 0-1 once → loop 2-5)
//   ROSE → goku_black_ssj_rose_charge_uniform.png (9f; buildup 0-3 once → loop 4-8)
// Verifies: the charge strip plays while P is held; the BUILDUP plays ONCE (never
// loops back to frames 0..loopStart-1); the tail LOOPS (wraps to loopStart, not 0);
// and the correct form-specific sheet is used. Real in-game screenshots.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 150, y: 150, width: 460, height: 470 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(REPO, u === "/" ? "/index.html" : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
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
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && (p._spriteCastTimer || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

// Hold P for `frames` game-frames, sampling {action, sheet, fi} every frame. A screenshot is
// taken at `shotAt` (frame index into the hold) if provided. Never releases mid-sample so a long
// hold reads as CHARGE (a quick tap would instead toggle the transform).
async function holdChargeAndSample(frames, shotEarly, shotLate, shotName) {
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  await page.keyboard.down("p");
  const samples = [];
  for (let i = 0; i < frames; i++) {
    await wf(1);
    samples.push(await page.evaluate(() => { const p = window.__harness.p1(); return { action: p.action, sheet: p.spriteSheet || "", fi: p.frameIndex }; }));
    if (i === shotEarly) await page.screenshot({ path: path.join(OUT, shotName.replace(".png", "_buildup.png")), clip: CLIP });
    if (i === shotLate)  await page.screenshot({ path: path.join(OUT, shotName.replace(".png", "_loop.png")), clip: CLIP });
  }
  await page.keyboard.up("p");
  await wf(2);
  return samples;
}

// Analyse the frameIndex trace of the charge action against the expected two-part structure.
function analyzeCharge(label, samples, sheetFrag, frames, loopStart) {
  const charge = samples.filter(s => s.action === "charge");
  check(`${label}: charge strip plays while P held`, charge.length > 5, `${charge.length} charge frames`);
  check(`${label}: uses the form-specific sheet (${sheetFrag})`, charge.length > 0 && charge.every(s => s.sheet.includes(sheetFrag)), `sheet=${charge[0]?.sheet}`);
  const idx = charge.map(s => s.fi);
  const maxIdx = frames - 1;
  check(`${label}: animation reaches the final frame (${maxIdx})`, idx.includes(maxIdx), `max seen=${Math.max(...idx)}`);
  // BUILDUP PLAYS ONCE: once we first enter the loop region (idx >= loopStart), no later sample
  // may drop below loopStart (i.e. frames 0..loopStart-1 never repeat).
  const firstLoopPos = idx.findIndex(v => v >= loopStart);
  const afterLoop = idx.slice(firstLoopPos);
  const buildupRepeated = afterLoop.some(v => v < loopStart);
  check(`${label}: buildup frames 0-${loopStart - 1} play ONCE (never loop back)`, firstLoopPos >= 0 && !buildupRepeated, `after entering loop, min idx=${afterLoop.length ? Math.min(...afterLoop) : "n/a"} (must be ≥ ${loopStart})`);
  // TAIL LOOPS: after hitting the final frame we must return to loopStart and climb again
  // (proves it wraps to loopStart, not 0, and keeps cycling).
  const firstMaxPos = idx.indexOf(maxIdx);
  const afterMax = idx.slice(firstMaxPos + 1);
  const wrapped = afterMax.includes(loopStart);
  const climbsAgain = afterMax.some((v, i) => i > 0 && v > afterMax[i - 1]);   // index rises again = second cycle
  check(`${label}: tail LOOPS — wraps back to loopStart (${loopStart}) and cycles`, wrapped && climbsAgain, `post-max trace=[${afterMax.join(",")}]`);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  // ── BASE FORM ─────────────────────────────────────────────────────────────
  section("BASE form — power-up aura (buildup 0-1 once → loop 2-5)");
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.setEnergy(100); });   // <180 → a hold can't trip the transform
  await actionable();
  const baseSamples = await holdChargeAndSample(80, 6, 55, "GBCHG_base.png");
  analyzeCharge("base", baseSamples, "black_goku_power_up_uniform", 6, 2);
  check("base: form is still base (holding P charges, does not transform)", (await p1()).currentForm !== "ssjRose", `form=${(await p1()).currentForm}`);

  // ── SSJ ROSE FORM ─────────────────────────────────────────────────────────
  section("SSJ ROSE form — magenta aura (buildup 0-2 once → loop 3-7)");
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p");   // tap P → transform
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  check("transformed into SSJ Rose", (await p1()).currentForm === "ssjRose", `form=${(await p1()).currentForm}`);
  await page.evaluate(() => window.__harness.setEnergy(200));   // keep the meter up so it stays in Rose while charging
  const roseSamples = await holdChargeAndSample(120, 12, 90, "GBCHG_rose.png");
  analyzeCharge("rose", roseSamples, "goku_black_ssj_rose_charge_uniform", 9, 4);
  check("rose: still SSJ Rose after the charge hold", (await p1()).currentForm === "ssjRose", `form=${(await p1()).currentForm}`);

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku Black CHARGE-UP animation: ${PASS} passed, ${FAIL} failed`);
  console.log(`  screenshots → harness/shots/GBCHG_*.png`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
