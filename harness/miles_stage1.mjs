// harness/miles_stage1.mjs
// STAGE 1 evidence: Miles Morales (Marvel / Spider-Man) registration + movement/state. Asserts the
// sprite gate (handler / idle sheet / stats / scale / venom energy label), exercises idle / walk / run /
// dash / jump / fall / guard / hurt / knockdown / getup / intro over the RE-SLICED miles_*_uniform.png
// sheets (tools/reslice_miles.py — JUS-style, blue-bg JPG, RIGHT-facing, no flip), measures on-screen
// body height (measureSprite), and sweeps for the 128×128 fallback box. ★Miles has NO separate walk
// stride on the sheet → walk (and dash) BORROW the RUN cycle. fall = REAL descent art (not a jump reuse).
// Screenshots → harness/shots/miles_stage1_*.png. See MILES_MORALES_ASSET_MAP.md.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=miles`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `miles_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));
const energyLabel = () => page.evaluate(() => window.__harness.energyLabel("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Miles", g.key === "miles", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = miles_idle_uniform", (g.spriteSheet || "").includes("miles_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.9", Math.abs((g.spriteScale || 0) - 2.9) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1120", g.maxHealth === 1120, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const el = await energyLabel().catch(() => null);
  check("energy label = Venom", (el || "").toLowerCase().includes("venom"), `label=${el}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in roster mid-band (95–120px)", m.contentH >= 95 && m.contentH <= 120, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── movement / state (Miles has NO walk stride → walk/dash BORROW run) ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk → borrows miles_run_uniform (no walk stride on sheet)", /miles_run_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → miles_run_uniform (genuine stride)", (rn.spriteSheet || "").includes("miles_run_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → borrows miles_run_uniform", (ds.spriteSheet || "").includes("miles_run_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump uses miles_jump_uniform", (jp.spriteSheet || "").includes("miles_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("fall"); await waitFrames(4); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → miles_fall_uniform (REAL descent art, not a jump reuse)", (fl.spriteSheet || "").includes("miles_fall_uniform"), `sheet=${fl.spriteSheet}`);

  await force("guard"); await waitFrames(4); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → miles_guard_uniform", (gd.spriteSheet || "").includes("miles_guard_uniform"), `sheet=${gd.spriteSheet}`);

  await force("hurt"); await waitFrames(3); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → miles_hurt_uniform", (ht.spriteSheet || "").includes("miles_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → miles_knockdown_uniform", (kd.spriteSheet || "").includes("miles_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → miles_getup_uniform", (gu.spriteSheet || "").includes("miles_getup_uniform"), `sheet=${gu.spriteSheet}`);

  await force("intro"); await waitFrames(4); const it = await p1(); await shot("intro"); await force(null); await waitFrames(2);
  check("intro → miles_intro_uniform (REAL landing-into-stance)", (it.spriteSheet || "").includes("miles_intro_uniform"), `sheet=${it.spriteSheet}`);

  console.log("\n── fallback-box sweep (every registered action resolves a real miles_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "guard", "hurt", "knockdown", "getup", "intro"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("miles_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real miles_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
