// ─────────────────────────────────────────────────────────────────────────────
// Universal procedural CHARGE VORTEX (_drawChargeAura). Upgraded from a flat ground
// ring + rising dots to a swirling, coiling ribbon that spirals AROUND the body and
// ROTATES continuously off globalFrameCount.
// Verifies (real in-game):
//   • a character WITHOUT dedicated charge art (Naruto) renders the procedural spiral
//     while charging, and it genuinely ROTATES across frames (sampled mid-coil x moves,
//     multiple distinct values — not a static shot). Screenshots across several frames.
//   • Goku Black (has his OWN charge sprite) is UNAFFECTED: the procedural aura is
//     skipped (render counter never advances for him) while his real charge sprite plays.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 150, y: 150, width: 480, height: 480 };
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

const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 8, timeout: 20000 }); };
const aura = who => page.evaluate(w => window.__harness.chargeAura(w), who);
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

async function boot(p1c, p2c) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1c}&p2=${p2c}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();
}

try {
  // ── PROCEDURAL SPIRAL — Naruto (no dedicated charge art) ────────────────────
  section("Naruto — procedural charge vortex renders + rotates");
  await boot("naruto", "naruto");
  await page.evaluate(() => { window.__harness.setEnergy(120); });   // partway-filled meter (brightness scales with pct)
  await actionable();

  const before = (await aura("p1")).renders;
  await page.keyboard.down("p");                       // HOLD to charge (frame-polled input)
  await wf(3);
  check("charging state is active", (await aura("p1")).charging === true, "");

  // Sample the real drawn mid-coil x across a span of frames → must take several DISTINCT values
  // (the spiral is rotating), not sit on one value (static).
  const xs = [], shots = [];
  for (let k = 0; k < 12; k++) {
    await wf(3);
    const a = await aura("p1");
    xs.push(Math.round(a.sampleX * 100) / 100);
    if (k === 0) { await page.screenshot({ path: path.join(OUT, "CHARGEVTX_naruto_a.png"), clip: CLIP }); }
    if (k === 5) { await page.screenshot({ path: path.join(OUT, "CHARGEVTX_naruto_b.png"), clip: CLIP }); }
    if (k === 10) { await page.screenshot({ path: path.join(OUT, "CHARGEVTX_naruto_c.png"), clip: CLIP }); }
  }
  const after = (await aura("p1")).renders;
  const distinct = new Set(xs).size;
  const spread = Math.max(...xs) - Math.min(...xs);
  console.log(`     mid-coil x samples: [${xs.join(", ")}]`);
  check("procedural spiral actually RENDERS while charging (counter advances)", after > before + 5, `renders ${before}→${after}`);
  check("spiral ROTATES — mid-coil x takes many distinct values across frames", distinct >= 6, `${distinct} distinct of ${xs.length}`);
  check("spiral sweeps a real horizontal arc (wraps around the body)", spread > 20, `x spread=${spread.toFixed(1)}px`);

  await page.keyboard.up("p"); await wf(2);
  check("releasing P stops the charge", (await aura("p1")).charging === false, "");

  // ── GOKU BLACK — dedicated charge sprite, procedural aura SKIPPED ────────────
  section("Goku Black — dedicated charge sprite, procedural aura correctly skipped");
  await boot("goku_black", "goku_black");
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.setEnergy(100); });   // <180 so a hold can't trip SSJ Rose
  await actionable();

  const gbBefore = (await aura("p1")).renders;
  await page.keyboard.down("p");
  await wf(24);   // long enough for his real charge strip to be up
  const gbMid = await aura("p1");
  const gbAfter = gbMid.renders;
  await page.screenshot({ path: path.join(OUT, "CHARGEVTX_gokublack.png"), clip: CLIP });   // captured DURING the hold → shows his real charge sprite, no procedural coil
  await page.keyboard.up("p"); await wf(2);
  check("Goku Black is charging", gbMid.charging === true, "");
  check("procedural vortex is SKIPPED for Goku Black (render counter frozen)", gbAfter === gbBefore, `renders ${gbBefore}→${gbAfter}`);
  check("Goku Black plays his OWN charge sprite instead", gbMid.action === "charge" && !!gbMid.spriteSheet && gbMid.spriteSheet.includes("power_up"), `action=${gbMid.action} sheet=${gbMid.spriteSheet}`);

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Charge vortex: ${PASS} passed, ${FAIL} failed`);
  console.log(`  screenshots → harness/shots/CHARGEVTX_*.png`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
