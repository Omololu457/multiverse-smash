// harness/shinobu_stage1.mjs — Stage 1 evidence for Shinobu Kocho (3rd Demon Slayer char).
// Registration + portrait, movement/state sprites (idle/walk/dash/jump/guard/hurt), and the
// camera-TRACKED glide-in intro (proves positional travel from off-screen → home + camera pan).
// Saves real screenshots to harness/shots/shinobu_s1_*.png and prints verification data.
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
const cam = () => page.evaluate(() => window.__harness.camera());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `shinobu_s1_${name}.png`) }); }

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=shinobu&p2=shinobu`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("shinobu"));
  check("shinobu.portrait wired", portrait === "./shinobu_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./shinobu_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("demon_slayer", "training"));
  check("Demon Slayer universe includes shinobu", sel.roster.includes("shinobu"), `roster=${sel.roster.join(",")}`);

  // ── MOVEMENT / STATE ──
  section("movement / state sprites");
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(20);
  const flavor = await page.evaluate(() => window.__harness.noMeterFlavor("p1"));
  check("energy label = TOTAL CONCENTRATION", flavor === "TOTAL CONCENTRATION", `noMeterFlavor=${JSON.stringify(flavor)}`);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);
  let mv = await p1();
  check("idle → shinobu_idle_uniform", has(mv, "shinobu_idle_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("idle");

  // walk (hold forward)
  await page.keyboard.down("d"); await waitFrames(10); mv = await p1();
  check("walk/run → shinobu_walk_uniform", has(mv, "shinobu_walk_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("walk");
  await page.keyboard.up("d"); await waitFrames(6);

  // dash (double-tap forward)
  await page.keyboard.press("d"); await page.keyboard.down("d"); await waitFrames(1); mv = await p1();
  for (let i = 0; i < 6 && !has(mv, "shinobu_dash_uniform"); i++) { await waitFrames(1); mv = await p1(); }
  check("dash → shinobu_dash_uniform", has(mv, "shinobu_dash_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("dash");
  await page.keyboard.up("d"); await waitFrames(8);

  // jump — hold up until airborne, sample mid-air
  await waitFrames(8);   // let walk momentum settle to idle first
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2); mv = await p1();
  check("jump → shinobu_jump_uniform", has(mv, "shinobu_jump_uniform"), `sheet=${mv.spriteSheet} airborne=${!mv.grounded}`);
  await shot("jump");
  await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});

  // guard (hold down)
  await page.keyboard.down("s"); await waitFrames(6); mv = await p1();
  check("guard → shinobu_guard_uniform", has(mv, "shinobu_guard_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("guard");
  await page.keyboard.up("s"); await waitFrames(4);

  // hurt (force hitstun)
  await page.evaluate(() => window.__harness.hurtP1(40)); await waitFrames(3); mv = await p1();
  check("hurt → shinobu_hit_uniform", has(mv, "shinobu_hit_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("hurt");
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(6);

  // ── TRACKED GLIDE-IN INTRO ──
  section("camera-tracked glide-in intro (positional travel + camera pan)");
  await page.evaluate(() => window.__harness.start());   // real intro stage machine (introStage=p1)
  await waitFrames(2);
  const samples = [];
  let camMin = Infinity, camMax = -Infinity;
  for (let i = 0; i < 40; i++) {
    const f = await p1(); const c = await cam();
    samples.push({ f: i, x: Math.round(f.x), variant: f.introVariant, sheet: (f.spriteSheet || "").split("/").pop(), reveal: f.introRevealFrame ?? null, camX: Math.round(c.x) });
    camMin = Math.min(camMin, c.x); camMax = Math.max(camMax, c.x);
    if (i === 6) await shot("intro_glide_early");
    if (i === 16) await shot("intro_glide_mid");
    await waitFrames(1);
  }
  const xs = samples.map(s => s.x);
  const travel = Math.max(...xs) - Math.min(...xs);
  const glideVariant = samples.some(s => s.variant === "introGlide");
  const glideSheet = samples.some(s => (s.sheet || "").includes("shinobu_intro_glide"));
  check("intro variant = introGlide", glideVariant, `variants=${[...new Set(samples.map(s => s.variant))].join(",")}`);
  check("intro renders shinobu_intro_glide sheet", glideSheet, `sheets=${[...new Set(samples.map(s => s.sheet))].join(",")}`);
  check("POSITIONAL TRAVEL (off-screen → home, >200px)", travel > 200, `x-travel=${travel}px  (${Math.min(...xs)}→${Math.max(...xs)})`);
  check("CAMERA TRACKS the entrance (pans >80px)", (camMax - camMin) > 80, `cam-pan=${Math.round(camMax - camMin)}px`);
  console.log("     first/mid/last samples:", JSON.stringify([samples[0], samples[10], samples[20]]));
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(4);
  const homeSettled = await p1();
  check("snaps HOME after intro (finalize, on-screen)", Number.isFinite(homeSettled.x) && homeSettled.x > 0 && homeSettled.x < 3200, `x=${Math.round(homeSettled.x)}`);

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
