// harness/naoya_frametrap_hud.mjs — the Projection Sorcery "24-frame" HUD (the enhancement).
// Naoya's Frame-Trap already exists; this proves the NEW above-head HUD that makes its (previously invisible)
// execution pressure legible. Boots the real game and asserts:
//   1. Arming the Frame-Trap feeds the HUD data contract (ftWindowMax > 0, ftSeq = light→heavy→light).
//   2. The HUD actually RENDERS while armed (naoyaHudRenders climbs), and the per-beat window ticks down.
//   3. A clean L→H→L finish raises the gold "FRAMES SET" flash (ftFlash === "freeze") + freezes the opponent.
//   4. A dropped input raises the red "DROP" flash (ftFlash === "drop") + registers the drop.
//   5. No JS page errors (the HUD draws safely). Screenshots → harness/shots/naoya_hud_*_crop.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const fx = () => page.evaluate(() => window.__harness.naoyaFx("p1"));
const hudRenders = () => page.evaluate(() => window.__harness.naoyaHudRenders());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `naoya_hud_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.5, padBot = 34;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `naoya_hud_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 50) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
const specialDir = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
async function tap(key) { await page.keyboard.down(key); await waitFrames(1); await page.keyboard.up(key); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=naoya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── 1 & 2. Arm → HUD data contract + the HUD renders + window ticks ──
  console.log("\n── Arm Frame-Trap → HUD renders + data contract ──");
  await setupAdjacent(50);
  const rendersBefore = await hudRenders();
  await specialDir("D"); await waitFrames(2);
  const armed = await fx();
  check("Frame-Trap armed (step 0)", armed.ftArmed && armed.ftStep === 0, `armed=${armed.ftArmed} step=${armed.ftStep}`);
  check("HUD data contract: windowMax > 0", (armed.ftWindowMax || 0) > 0, `windowMax=${armed.ftWindowMax}`);
  check("HUD data contract: seq is light→heavy→light", JSON.stringify(armed.ftSeq) === JSON.stringify(["light", "heavy", "light"]), JSON.stringify(armed.ftSeq));
  const w0 = armed.ftWindow;
  await waitFrames(3);
  const armed2 = await fx();
  check("per-beat window TICKS DOWN while armed", (armed2.ftWindow || 0) < w0 || !armed2.ftArmed, `w0=${w0} w1=${armed2.ftWindow}`);
  const rendersDuring = await hudRenders();
  check("the Projection HUD actually RENDERS while armed", rendersDuring > rendersBefore, `renders ${rendersBefore}→${rendersDuring}`);
  await crop("armed");

  // ── 3. Clean L→H→L → gold "FRAMES SET" flash + freeze ──
  console.log("\n── Clean L→H→L → FRAMES-SET flash + freeze ──");
  let clean = null;
  for (let attempt = 0; attempt < 4 && !(clean && clean.oppFrozen > 0); attempt++) {
    await setupAdjacent(50);
    await specialDir("D"); await waitFrames(2);
    await tap("j"); await waitFrames(2);   // Light
    await tap("k"); await waitFrames(2);   // Heavy
    await tap("j"); await waitFrames(1);   // Light → finish
    const st = await fx();
    if (st.oppFrozen > 0) { clean = st; await crop("frames_set"); }
    await waitFrames(18); await waitGrounded(); await waitFrames(3);
  }
  check("clean finish froze the opponent", (clean?.oppFrozen || 0) >= 60, `oppFrozen=${clean?.oppFrozen}`);
  check('clean finish raised the "FRAMES SET" (freeze) HUD flash', clean?.ftFlash === "freeze", `flash=${clean?.ftFlash}`);

  // ── 4. Drop → red "DROP" flash ──
  console.log("\n── Drop a window → DROP flash ──");
  await setupAdjacent(50);
  await page.waitForFunction(() => (window.__harness.naoyaFx("p1")?.oppFrozen || 0) === 0, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const dropsBefore = (await fx()).ftDropped;
  await specialDir("D"); await waitFrames(2);
  await tap("j");            // step 1 only
  await waitFrames(3);
  const midDrop = await fx();   // catch the flash before it fades
  await crop("drop");
  await waitFrames(20);
  const dropped = await fx();
  check("dropped Frame-Trap registered a drop", dropped.ftDropped > dropsBefore, `dropped ${dropsBefore}→${dropped.ftDropped}`);
  check('drop raised the red "DROP" HUD flash', midDrop.ftFlash === "drop" || dropped.ftFlash === "drop", `flash=${midDrop.ftFlash}/${dropped.ftFlash}`);

  check("no JS page errors across the whole run", jsErrors.length === 0, jsErrors[0] || "");
} catch (e) {
  check("harness ran without throwing", false, String(e));
}

console.log(`\n${FAIL === 0 ? "✅" : "❌"} Naoya Frame-Trap HUD: ${PASS} passed, ${FAIL} failed — shots in harness/shots/naoya_hud_*_crop.png`);
await browser.close(); server.close();
process.exit(FAIL === 0 ? 0 : 1);
