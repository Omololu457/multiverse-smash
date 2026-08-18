// harness/green_lantern_stage1.mjs
// STAGE 1 evidence: Green Lantern (DC — Hal Jordan) registration + movement/state.
// Asserts the sprite gate (handler / idle sheet / stats / scale / energyType / canFly), exercises idle /
// walk / run / dash / jump / fall / fly / guard / hurt / knockdown / getup over the ASSEMBLED
// gl_*_uniform.png sheets (HONEST reuses: walk=dash=run, guard=getup=idle), measures on-screen body
// height, and sweeps for the 128×128 procedural fallback box. GL has NO dedicated crouch art (excluded).
// Screenshots → harness/shots/green_lantern_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=green_lantern`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `green_lantern_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Green Lantern", g.key === "green_lantern", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = gl_idle_uniform", (g.spriteSheet || "").includes("gl_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.4", Math.abs((g.spriteScale || 0) - 1.4) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1150", g.maxHealth === 1150, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("green_lantern"));
  check("universe = dc", def?.universe === "dc", `universe=${def?.universe}`);
  check("energyType = willpower", def?.traits?.energyType === "willpower", `energyType=${def?.traits?.energyType}`);
  check("scaling versatile", def?.traits?.scaling === "versatile", `scaling=${def?.traits?.scaling}`);
  check("mobility high", def?.traits?.mobility === "high", `mobility=${def?.traits?.mobility}`);
  check("canFly trait set", def?.traits?.canFly === true, `canFly=${def?.traits?.canFly}`);
  check("portrait asset exists on disk (gl_portrait.png)", fs.existsSync(path.join(ROOT, "gl_portrait.png")), "");
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in large-hero band (110–200px)", m.contentH >= 110 && m.contentH <= 200, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  // GL has NO dedicated walk cycle → walk/dash REUSE the run sheet. Holding a direction resolves walk.
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk → gl_run_uniform (reuse run)", /gl_run_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);
  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → gl_run_uniform", (rn.spriteSheet || "").includes("gl_run_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → gl_run_uniform (reuse)", (ds.spriteSheet || "").includes("gl_run_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses gl_jump_uniform", (jp.spriteSheet || "").includes("gl_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("fall"); await waitFrames(3); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → gl_fall_uniform (real distinct descent art)", (fl.spriteSheet || "").includes("gl_fall_uniform"), `sheet=${fl.spriteSheet}`);

  await force("fly"); await waitFrames(4); const fy = await p1(); await shot("fly"); await force(null); await waitFrames(2);
  check("fly → gl_flight_uniform", (fy.spriteSheet || "").includes("gl_flight_uniform"), `action=${fy.spriteAction} sheet=${fy.spriteSheet}`);

  await force("guard"); await waitFrames(4); const bl = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → gl_idle_uniform (reuse)", (bl.spriteSheet || "").includes("gl_idle_uniform"), `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → gl_hurt_uniform", (ht.spriteSheet || "").includes("gl_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → gl_knockdown_uniform", (kd.spriteSheet || "").includes("gl_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → gl_idle_uniform (reuse — no dedicated rise art)", (gu.spriteSheet || "").includes("gl_idle_uniform"), `sheet=${gu.spriteSheet}`);

  console.log("\n── fallback-box sweep (no defined action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "fly", "flyMove", "guard", "hurt", "knockdown", "getup"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!/gl_(idle|run|jump|fall|flight|hurt|knockdown)_uniform/.test(sh)) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every movement action resolves a real gl_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
