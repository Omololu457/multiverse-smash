// harness/inosuke_stage1.mjs — Stage 1 evidence for Inosuke Hashibira (4th Demon Slayer char).
// Registration + portrait, Total-Concentration energy flavor, and the full movement/state sprite
// set: idle / walk / dash / jump / fall / guard / hurt / knockdown (live) + dodge / taunt (forced,
// no live input driver / 10s-charge). Also a decode sweep proving every animationData sheet is real
// art (no fallback boxes). Saves real screenshots to harness/shots/inosuke_s1_*.png.
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
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `inosuke_s1_${name}.png`) }); }
const force = (action) => page.evaluate(a => window.__harness.forceAction(a), action);

try {
  // ── REGISTRATION + PORTRAIT ──
  section("registration + portrait");
  await page.goto(`${base}/index.html?harness=1&p1=inosuke&p2=inosuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const portrait = await page.evaluate(() => window.__harness.charPortrait("inosuke"));
  check("inosuke.portrait wired", portrait === "./inosuke_portrait.png", `portrait=${portrait}`);
  const imgOk = await page.evaluate(async () => { const i = new Image(); i.src = "./inosuke_portrait.png"; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } });
  check("portrait art decodes", imgOk.ok, `${imgOk.w}×${imgOk.h}`);
  const sel = await page.evaluate(() => window.__harness.showCharSelect("demon_slayer", "training"));
  check("Demon Slayer universe includes inosuke", sel.roster.includes("inosuke"), `roster=${sel.roster.join(",")}`);
  check("Demon Slayer roster is now 4 (zenitsu/rengoku/shinobu/inosuke)", ["zenitsu","rengoku","shinobu","inosuke"].every(k => sel.roster.includes(k)), `roster=${sel.roster.join(",")}`);

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
  check("has real sprite handler (not procedural box)", mv.hasSpriteHandler && mv.spriteReady, `handler=${mv.hasSpriteHandler} ready=${mv.spriteReady}`);
  check("idle → inosuke_idle_uniform", has(mv, "inosuke_idle_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("idle");

  // walk (hold forward) — reuses idle sheet (no dedicated walk art)
  await page.keyboard.down("d"); await waitFrames(10); mv = await p1();
  check("walk (hold fwd) → action=walk/run on idle sheet", ["walk","run"].includes(mv.action) && has(mv, "inosuke_idle_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
  await shot("walk");
  await page.keyboard.up("d"); await waitFrames(6);

  // dash (double-tap forward)
  await page.keyboard.press("d"); await page.keyboard.down("d"); await waitFrames(1); mv = await p1();
  for (let i = 0; i < 6 && !has(mv, "inosuke_dash_uniform"); i++) { await waitFrames(1); mv = await p1(); }
  check("dash → inosuke_dash_uniform", has(mv, "inosuke_dash_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("dash");
  await page.keyboard.up("d"); await waitFrames(8);

  // jump — hold up until airborne, sample mid-air
  await waitFrames(8);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 2000, polling: 16 }).catch(() => {});
  await waitFrames(2); mv = await p1();
  check("jump → inosuke_jump_uniform (airborne)", has(mv, "inosuke_jump_uniform") && !mv.grounded, `sheet=${mv.spriteSheet} airborne=${!mv.grounded}`);
  await shot("jump");
  await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(4);

  // fall (forced — descent frame from jump sheet)
  await force("fall"); await waitFrames(2); mv = await p1();
  check("fall → inosuke_jump_uniform (fall frame)", has(mv, "inosuke_jump_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("fall");
  await force(null); await waitFrames(2);

  // guard (hold down) — reuses idle frame 0
  await page.keyboard.down(";"); await waitFrames(6); mv = await p1();
  check("guard (hold down) → action=guard", mv.action === "guard", `action=${mv.action} sheet=${mv.spriteSheet}`);
  await shot("guard");
  await page.keyboard.up(";"); await waitFrames(4);

  // hurt (force hitstun)
  await page.evaluate(() => window.__harness.hurtP1(40)); await waitFrames(3); mv = await p1();
  check("hurt → inosuke_hit_uniform", has(mv, "inosuke_hit_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("hurt");
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(6);

  // knockdown (forced — frames 3-5 of hit sheet)
  await force("knockdown"); await waitFrames(3); mv = await p1();
  check("knockdown → inosuke_hit_uniform (frames 3-5)", has(mv, "inosuke_hit_uniform") && mv.spriteFrames === 3, `sheet=${mv.spriteSheet} frames=${mv.spriteFrames}`);
  await shot("knockdown");
  await force(null); await waitFrames(2);

  // dodge (forced — no live dodge state in engine)
  await force("dodge"); await waitFrames(3); mv = await p1();
  check("dodge → inosuke_dodge_uniform", has(mv, "inosuke_dodge_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("dodge");
  await force(null); await waitFrames(2);

  // taunt (forced — live driver is a 10s Down-hold)
  await force("taunt"); await waitFrames(3); mv = await p1();
  check("taunt → inosuke_taunt_uniform", has(mv, "inosuke_taunt_uniform"), `sheet=${mv.spriteSheet}`);
  await shot("taunt");
  await force(null); await waitFrames(2);

  // ── DECODE SWEEP: every animationData sheet is real art (no fallback box) ──
  section("sprite-sheet decode sweep (no fallback boxes)");
  const sheets = [
    "./inosuke_idle_uniform.png", "./inosuke_dash_uniform.png", "./inosuke_jump_uniform.png",
    "./inosuke_hit_uniform.png", "./inosuke_dodge_uniform.png", "./inosuke_taunt_uniform.png"
  ];
  for (const s of sheets) {
    const r = await page.evaluate(async (src) => { const i = new Image(); i.src = src; try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; } catch { return { ok: false }; } }, s);
    check(`decodes ${s.replace('./inosuke_','').replace('_uniform.png','')}`, r.ok, `${r.w}×${r.h}`);
  }

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
