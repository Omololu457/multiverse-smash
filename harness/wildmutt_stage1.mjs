// harness/wildmutt_stage1.mjs
// STAGE 1 evidence (PROVISIONAL — pixel sign-off deferred): Wildmutt (Ben 10 transform FORM) movement/
// state sliced from the #13 Dragonrod sheet (tools/reslice_wildmutt.py, white-key). Boots p1=ben10,
// force-applies the wildmutt form (it is NOT in BEN10_ART_ALIENS yet, so this proves _skinAnim renders
// when the form is active), forces each movement/state action and asserts it resolves to the expected
// ben10_wildmutt_* sheet (never the 128² fallback box). walk/run/dash/hurt are documented idle STOPGAPS.
// Programmatic-only: no visual QA here (harness is node-based). See WILDMUTT_ASSET_MAP.md.
//   node harness/wildmutt_stage1.mjs
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
async function probe(action) {
  await page.evaluate(a => window.__harness.benPose(a), action);
  await page.waitForTimeout(140);
  const r = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); const pp = window.__harness.p1(); return { sheet: pp?.spriteSheet || "", w: c?.contentW || 0, h: c?.contentH || 0, action: pp?.spriteAction || null }; });
  await page.evaluate(() => window.__harness.benPose(null));
  return r;
}

// action -> expected sheet substring (walk/run/dash/hurt are idle STOPGAPS)
const EXPECT = {
  idle: "ben10_wildmutt_idle_uniform", walk: "ben10_wildmutt_idle_uniform", run: "ben10_wildmutt_idle_uniform",
  dash: "ben10_wildmutt_idle_uniform", jump: "ben10_wildmutt_jump_uniform", fall: "ben10_wildmutt_land_uniform",
  hurt: "ben10_wildmutt_idle_uniform",
};

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  section("form gate (wildmutt force-applied; not in BEN10_ART_ALIENS yet)");
  const fi = await setForm("wildmutt"); await waitFrames(2);
  const g = await p1();
  check("P1 is ben10", g.key === "ben10", `key=${g.key}`);
  check("wildmutt form has _skinAnim", !!fi.hasSkinAnim, `hasSkinAnim=${fi.hasSkinAnim}`);

  section("movement / state resolves to wildmutt sheets (no 128² box)");
  const boxHit = [];
  for (const [action, want] of Object.entries(EXPECT)) {
    const r = await probe(action);
    const boxlike = r.w >= 200 || r.h >= 200;
    const ok = r.sheet.includes(want) && !boxlike && r.w > 0 && r.h > 0;
    if (!ok) boxHit.push(`${action}:${r.sheet.split("/").pop() || "null"}(${r.w}x${r.h})`);
    check(`${action} → ${want.replace("ben10_wildmutt_", "")}`, ok, `sheet=${r.sheet.split("/").pop()} body=${r.w}x${r.h}`);
  }

  section("dedicated (non-stopgap) states use real distinct art");
  for (const a of ["jump", "fall"]) {
    const r = await probe(a);
    check(`${a} is NOT the idle sheet`, !r.sheet.includes("idle_uniform") && r.sheet.includes(EXPECT[a]), `sheet=${r.sheet.split("/").pop()}`);
  }

  section("summary");
  check("no 128² fallback box on any movement/state action", boxHit.length === 0, boxHit.join(" | "));
  check("no JS errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  WILDMUTT STAGE 1 (provisional): ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
