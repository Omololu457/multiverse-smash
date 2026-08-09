// harness/yuji_stage1.mjs — Stage 1 evidence for Yuji Itadori (JJK, pure hand-to-hand rushdown brawler).
// Registration + portrait, base movement/state sprites (idle/walk/run/dash/jump/guard/hurt/knockdown-getup),
// and BOTH intro variants random-cycling (intro1 cinematic + intro2 the master-sheet "ALT" solo stance —
// same costume, so pooled not skin-gated). Saves screenshots to harness/shots/yuji_s1_*.png.
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
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `yuji_s1_${name}.png`) }); }

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("yuji"));
  check("yuji.portrait wired", !!portrait, `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./yuji_idle_uniform.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("idle sheet art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("jujutsu_kaisen", "training"));
  check("Jujutsu Kaisen universe includes yuji", sel.roster.includes("yuji"), `roster=${sel.roster.join(",")}`);

  // ── MOVEMENT / STATE ──
  section("movement / state sprites");
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(20);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);
  let mv = await p1();
  check("idle → yuji_idle_uniform", has(mv, "yuji_idle_uniform"), `sheet=${mv.spriteSheet}`);
  check("spriteScale ≈ 2.10", Math.abs((mv.spriteScale || 0) - 2.10) < 0.001, `scale=${mv.spriteScale}`);
  check("hasSpriteHandler (not procedural box)", mv.hasSpriteHandler === true, `handler=${mv.hasSpriteHandler}`);
  await shot("idle");

  // walk (hold forward)
  await page.keyboard.down("d"); await waitFrames(10); mv = await p1();
  check("walk/run → yuji_run_uniform", has(mv, "yuji_run_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("walk");
  await page.keyboard.up("d"); await waitFrames(6);

  // dash (double-tap forward)
  await page.keyboard.press("d"); await page.keyboard.down("d"); await waitFrames(1); mv = await p1();
  for (let i = 0; i < 8 && !has(mv, "yuji_dash_uniform"); i++) { await waitFrames(1); mv = await p1(); }
  check("dash → yuji_dash_uniform", has(mv, "yuji_dash_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("dash");
  await page.keyboard.up("d"); await waitFrames(8);

  // jump — hold up until airborne, sample mid-air
  await waitFrames(8);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2); mv = await p1();
  check("jump → yuji_jump_uniform", has(mv, "yuji_jump_uniform"), `sheet=${mv.spriteSheet} airborne=${!mv.grounded}`);
  await shot("jump");
  await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});

  // guard/block (hold back — away from the opponent on the right → "a")
  await page.keyboard.down("a"); await waitFrames(8); mv = await p1();
  if (!has(mv, "yuji_block_uniform")) { await page.keyboard.up("a"); await page.keyboard.down("s"); await waitFrames(8); mv = await p1(); }
  check("block/guard → yuji_block_uniform", has(mv, "yuji_block_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("block");
  await page.keyboard.up("a").catch(() => {}); await page.keyboard.up("s").catch(() => {}); await waitFrames(4);

  // hurt (force hitstun)
  await page.evaluate(() => window.__harness.hurtP1(40)); await waitFrames(3); mv = await p1();
  check("hurt → yuji_hit_uniform", has(mv, "yuji_hit_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("hurt");
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(6);

  // knockdown / get-up (force downed state → drives the 8-cell hurt strip)
  await page.evaluate(() => window.__harness.knockdownP1(60)); await waitFrames(4); mv = await p1();
  check("knockdown/getup → yuji_hurt_uniform", has(mv, "yuji_hurt_uniform"), `sheet=${mv.spriteSheet} down=${mv.knockdownState}`);
  await shot("knockdown");
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(6);

  // ── INTROS (both variants random-cycle; each renders its own sheet) ──
  section("intro sequences — random-cycle pool (intro1 + intro2)");
  const SHEET = { intro1: "yuji_intro_1_uniform", intro2: "yuji_intro_2_uniform" };
  const seen = {}, rendered = {}, seq = [];
  for (let i = 0; i < 30 && Object.keys(seen).length < 2; i++) {
    await page.evaluate(() => window.__harness.start());
    await waitFrames(10);
    const f = await p1(); const v = f.introVariant; seq.push(v);
    if (v) {
      seen[v] = (seen[v] || 0) + 1;
      if (SHEET[v] && has(f, SHEET[v])) {
        rendered[v] = true;
        if (!fs.existsSync(path.join(SHOTS, `yuji_s1_${v}.png`))) await shot(v);
      }
    }
    await page.evaluate(() => window.__harness.skipToBattle()); await waitFrames(2);
  }
  console.log("  pick sequence:", seq.filter(Boolean).join(", "));
  console.log("  counts:", JSON.stringify(seen));
  for (const v of ["intro1", "intro2"]) {
    check(`${v} was picked (random-cycle)`, (seen[v] || 0) > 0, `count=${seen[v] || 0}`);
    check(`${v} renders ${SHEET[v]} (self-contained, no fallback box)`, rendered[v] === true);
  }
  check("both intros appeared across starts (cycle works)", Object.keys(seen).length === 2, `distinct=${Object.keys(seen).length}`);

  // ── STABILITY ──
  section("stability");
  check("no JS errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
