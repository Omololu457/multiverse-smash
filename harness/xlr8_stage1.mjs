// harness/xlr8_stage1.mjs
// STAGE 1 evidence: XLR8 (Ben 10 transform FORM) movement/state RE-SOURCED from the ipmugen #11
// sheet (tools/reslice_xlr8.py, red-keyed teal/black raptor). Boots p1=ben10, switches to the xlr8
// form, forces every movement/state action and asserts each resolves to the NEW ben10_xlr8_*_uniform
// sheet (never the 128² fallback box), with special proof for the gap-fills that were idle stopgaps
// before: guard / hurt / knockdown / getup. Also measures on-screen idle body height. See XLR8_ASSET_MAP.md.
//   node harness/xlr8_stage1.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setForm = (k) => page.evaluate(key => window.__harness.benForm(key), k);
// Force an action, let its sheet decode, read the resolved sheet + rendered crop, release.
async function probe(action) {
  await page.evaluate(a => window.__harness.benPose(a), action);
  await page.waitForTimeout(140);
  const r = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); const pp = window.__harness.p1(); return { sheet: pp?.spriteSheet || "", w: c?.contentW || 0, h: c?.contentH || 0, action: pp?.spriteAction || null }; });
  await page.evaluate(() => window.__harness.benPose(null));
  return r;
}

// action -> expected re-sliced sheet substring
const EXPECT = {
  idle: "ben10_xlr8_idle_uniform", walk: "ben10_xlr8_run_uniform", run: "ben10_xlr8_run_uniform", dash: "ben10_xlr8_run_uniform",
  crouch: "ben10_xlr8_crouch_uniform", jump: "ben10_xlr8_jump_uniform", fall: "ben10_xlr8_fall_uniform",
  guard: "ben10_xlr8_guard_uniform", hurt: "ben10_xlr8_hurt_uniform", knockdown: "ben10_xlr8_knockdown_uniform", getup: "ben10_xlr8_getup_uniform",
};
const GAP_FILLS = ["guard", "hurt", "knockdown", "getup"];  // were idle stopgaps pre-Stage-1

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  section("form gate");
  const fi = await setForm("xlr8"); await waitFrames(2);
  const g = await p1();
  check("P1 is ben10", g.key === "ben10", `key=${g.key}`);
  check("active alien = xlr8", (g.activeAlien || fi.activeAlien) === "xlr8", `alien=${g.activeAlien}`);
  check("form has _skinAnim", !!fi.hasSkinAnim, `hasSkinAnim=${fi.hasSkinAnim}`);
  check("spriteScale = 2.0 (shared ben10 scale)", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `scale=${g.spriteScale}`);

  section("movement / state resolves to re-sliced ipmugen sheets (no 128² box)");
  const boxHit = [];
  for (const [action, want] of Object.entries(EXPECT)) {
    const r = await probe(action);
    const boxlike = r.w >= 200 || r.h >= 200;          // 128² box renders ~256px square
    const ok = r.sheet.includes(want) && !boxlike && r.w > 0 && r.h > 0;
    if (!ok) boxHit.push(`${action}:${r.sheet || "null"}(${r.w}x${r.h})`);
    check(`${action} → ${want}`, ok, `sheet=${r.sheet.split("/").pop()} body=${r.w}x${r.h}`);
  }

  section("gap-fills use NEW art (were idle stopgaps before Stage 1)");
  for (const a of GAP_FILLS) {
    const r = await probe(a);
    check(`${a} is NOT the idle sheet`, !r.sheet.includes("idle_uniform") && r.sheet.includes(EXPECT[a]), `sheet=${r.sheet.split("/").pop()}`);
  }

  section("idle on-screen body-height sanity");
  const idle = await probe("idle");
  console.log(`   idle body: ${idle.w}x${idle.h}px (native ~64 × spriteScale 2.0)`);
  check("idle body height plausible (100–160px)", idle.h >= 100 && idle.h <= 160, `h=${idle.h}`);

  section("summary");
  check("no 128² fallback box on any movement/state action", boxHit.length === 0, boxHit.join(" | "));
  check("no JS errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  XLR8 STAGE 1: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
