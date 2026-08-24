// harness/gohan_stage1.mjs
// STAGE 1 evidence: Teen Gohan (Dragon Ball, Extreme Butoden) registration + movement/state. Asserts the sprite
// gate (handler / idle sheet / stats / scale / ki energy), exercises idle / walk / run / dash / jump / fall /
// crouch / guard / hurt / knockdown / getup / taunt over the RE-SLICED gohan_*_uniform.png sheets
// (tools/reslice_gohan.py — BASE form; SSJ2 recolor lands at Stage 5), measures on-screen body height
// (measureSprite), and sweeps for the 128×128 fallback box. Unlike Piccolo, Gohan has a REAL walk/run stride
// cycle (its own sheets), so walk/run must NOT borrow idle. Screenshots → harness/shots/gohan_stage1_*.png.
// See GOHAN_ASSET_MAP.md.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=gohan`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gohan_stage1_${tag}.png`) }); }
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
  check("P1 is Teen Gohan", g.key === "gohan", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = gohan_idle_uniform", (g.spriteSheet || "").includes("gohan_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.20", Math.abs((g.spriteScale || 0) - 1.20) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1200", g.maxHealth === 1200, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const el = await energyLabel().catch(() => null);
  check("energy label = Ki", (el || "").toLowerCase().includes("ki"), `label=${el}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in TEEN band (95–120px, ~just under the ~111px adults)", m.contentH >= 95 && m.contentH <= 120, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── movement / state (Gohan has REAL walk+run cycles — must NOT borrow idle) ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk → gohan_walk_uniform (real stride cycle, not idle)", /gohan_walk_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → gohan_run_uniform (real stride cycle)", (rn.spriteSheet || "").includes("gohan_run_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → gohan_dash_uniform", (ds.spriteSheet || "").includes("gohan_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump uses gohan_jump_uniform", (jp.spriteSheet || "").includes("gohan_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → gohan_crouch_uniform", (cr.spriteSheet || "").includes("gohan_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  await force("guard"); await waitFrames(4); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → gohan_guard_uniform", (gd.spriteSheet || "").includes("gohan_guard_uniform"), `sheet=${gd.spriteSheet}`);

  await force("taunt"); await waitFrames(5); const tn = await p1(); await shot("taunt"); await force(null); await waitFrames(2);
  check("taunt → gohan_taunt_uniform", (tn.spriteSheet || "").includes("gohan_taunt_uniform"), `sheet=${tn.spriteSheet}`);

  await force("hurt"); await waitFrames(3); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → gohan_hurt_uniform", (ht.spriteSheet || "").includes("gohan_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → gohan_knockdown_uniform", (kd.spriteSheet || "").includes("gohan_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → gohan_getup_uniform", (gu.spriteSheet || "").includes("gohan_getup_uniform"), `sheet=${gu.spriteSheet}`);

  console.log("\n── fallback-box sweep (every registered action resolves a real gohan_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "hurt", "knockdown", "getup", "taunt"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("gohan_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real gohan_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
