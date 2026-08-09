// harness/nezuko_stage1.mjs — Stage 1 evidence for Nezuko Kamado (5th Demon Slayer char).
// Registration + portrait, and every MOVEMENT/STATE sprite: idle, walk, run, dash (must be a
// DISTINCT sheet from run — nezuko_run_tiny hunched scramble vs nezuko_run_tall upright run),
// jump, fall, guard, hurt, knockdown. Saves screenshots to harness/shots/nezuko_s1_*.png.
// NOTE: crouch is DORMANT (engine has no crouch-state producer; down-hold = guard) — not tested
// as a live state here; flagged in the Stage-1 report. Intro/win/lose are Stage 8, not covered.
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
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s1_${name}.png`) }); }

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("nezuko"));
  check("nezuko.portrait wired", portrait === "./nezuko_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./nezuko_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("demon_slayer", "training"));
  check("Demon Slayer universe includes nezuko", sel.roster.includes("nezuko"), `roster=${sel.roster.join(",")}`);

  // ── MOVEMENT / STATE ──
  section("movement / state sprites");
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(20);
  const flavor = await page.evaluate(() => window.__harness.noMeterFlavor("p1"));
  check("no-meter flavor = TOTAL CONCENTRATION", flavor === "TOTAL CONCENTRATION", `noMeterFlavor=${JSON.stringify(flavor)}`);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);
  let mv = await p1();
  check("idle → nezuko_idle", has(mv, "nezuko_idle"), `sheet=${mv.spriteSheet}`);
  const idleH = Math.round((mv.spriteScreenH ?? mv.renderH ?? 0));
  console.log(`     idle render height ≈ ${idleH}px (target ≈95px @ canon 153cm; scale=${mv.spriteScale})`);
  await shot("idle");

  // walk / run (hold forward)
  await page.keyboard.down("d"); await waitFrames(12); mv = await p1();
  check("run → nezuko_run_tall", has(mv, "nezuko_run_tall"), `sheet=${mv.spriteSheet}`);
  const runSheet = mv.spriteSheet;
  await shot("run");
  await page.keyboard.up("d"); await waitFrames(8);

  // dash (double-tap forward) — MUST be a distinct sheet from run
  await page.keyboard.press("d"); await page.keyboard.down("d"); await waitFrames(1); mv = await p1();
  for (let i = 0; i < 8 && !has(mv, "nezuko_run_tiny"); i++) { await waitFrames(1); mv = await p1(); }
  check("dash → nezuko_run_tiny", has(mv, "nezuko_run_tiny"), `sheet=${mv.spriteSheet}`);
  check("dash sheet is DISTINCT from run sheet", (mv.spriteSheet || "") !== runSheet && has(mv, "nezuko_run_tiny"), `dash=${mv.spriteSheet} run=${runSheet}`);
  await shot("dash");
  await page.keyboard.up("d"); await waitFrames(10);

  // jump — hold up until airborne, sample mid-air (rise), then fall
  await waitFrames(8);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2); mv = await p1();
  check("jump → nezuko_jump (airborne)", has(mv, "nezuko_jump"), `sheet=${mv.spriteSheet} airborne=${!mv.grounded}`);
  await shot("jump");
  // fall — wait for descent (vy > 0), same sheet, still airborne
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.grounded && (p.vy || 0) > 1; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  mv = await p1();
  check("fall → nezuko_jump (descending)", has(mv, "nezuko_jump") && !mv.grounded, `sheet=${mv.spriteSheet} vy=${Math.round(mv.vy)}`);
  await shot("fall");
  await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});

  // guard (hold down)
  await page.keyboard.down("s"); await waitFrames(6); mv = await p1();
  check("guard → nezuko_block", has(mv, "nezuko_block"), `sheet=${mv.spriteSheet}`);
  await shot("guard");
  await page.keyboard.up("s"); await waitFrames(4);

  // hurt (force hitstun)
  await page.evaluate(() => window.__harness.hurtP1(40)); await waitFrames(3); mv = await p1();
  check("hurt → nezuko_hit", has(mv, "nezuko_hit"), `sheet=${mv.spriteSheet}`);
  await shot("hurt");
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(6);

  // knockdown (force downed state → sprite.js knockdown hook)
  await page.evaluate(() => window.__harness.knockdownP1(60)); await waitFrames(3); mv = await p1();
  check("knockdown → nezuko_hit_2", has(mv, "nezuko_hit_2"), `sheet=${mv.spriteSheet} down=${mv.knockdownState}`);
  await shot("knockdown");
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(6);

  // ── NO FALLBACK BOXES: every Stage-1 sheet must be a real nezuko_* PNG, none the 128² null box ──
  section("fallback-box sweep");
  const decoded = await page.evaluate(async () => {
    const sheets = ["nezuko_idle.png","nezuko_run_tall.png","nezuko_run_tiny.png","nezuko_jump.png",
                    "nezuko_crouch.png","nezuko_block.png","nezuko_hit.png","nezuko_hit_2.png"];
    const out = {};
    for (const s of sheets) { const i = new Image(); i.src = "./" + s; try { await i.decode(); out[s] = { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { out[s] = { ok: false }; } }
    return out;
  });
  for (const [s, r] of Object.entries(decoded)) check(`sheet decodes: ${s}`, r.ok, r.ok ? `${r.w}×${r.h}` : "MISSING");

  // ── NO JS ERRORS ──
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
