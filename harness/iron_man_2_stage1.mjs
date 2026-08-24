// harness/iron_man_2_stage1.mjs
// STAGE 1 evidence: Iron Man 2 (Marvel, Data East 1991 rip) registration + movement/state.
// Asserts the sprite gate (handler / idle sheet / stats / scale / energyType), exercises idle / walk /
// run / run-to-crouch / crouch / jump / fall / dash / guard / hurt / knockdown / getup / intro over the
// RE-SLICED iron_man_2_*_uniform.png sheets. HONEST reuses: fall=jump, dash=run, guard=crouch, intro=idle;
// run + run-to-crouch are their OWN art (Stage-0 item 3: kept separate). Measures on-screen body height
// and sweeps for the 128×128 procedural fallback box. Screenshots → harness/shots/iron_man_2_stage1_*.png
// (the STOP-point clips are idle / walk / run / runcrouch).
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=iron_man_2`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `iron_man_2_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Iron Man 2", g.key === "iron_man_2", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = iron_man_2_idle_uniform", (g.spriteSheet || "").includes("iron_man_2_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1200", g.maxHealth === 1200, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("iron_man_2"));
  check("universe = marvel", def?.universe === "marvel", `universe=${def?.universe}`);
  check("energyType = repulsor", def?.traits?.energyType === "repulsor", `energyType=${def?.traits?.energyType}`);
  check("scaling versatile", def?.traits?.scaling === "versatile", `scaling=${def?.traits?.scaling}`);
  check("mobility high", def?.traits?.mobility === "high", `mobility=${def?.traits?.mobility}`);
  check("portrait asset exists on disk (iron_man_2_portrait.png)", fs.existsSync(path.join(ROOT, "iron_man_2_portrait.png")), "");
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in roster band (80–130px)", m.contentH >= 80 && m.contentH <= 130, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement (idle / walk / run / run-to-crouch = the STOP-point clips) ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk uses iron_man_2_walk_uniform", /iron_man_2_walk_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → iron_man_2_run_uniform (OWN dedicated sprint art)", (rn.spriteSheet || "").includes("iron_man_2_run_uniform"), `sheet=${rn.spriteSheet}`);

  await force("runCrouch"); await waitFrames(4); const rc = await p1(); await shot("runcrouch"); await force(null); await waitFrames(2);
  check("run-to-crouch → iron_man_2_runcrouch_uniform (own bracketed transition, kept separate)", (rc.spriteSheet || "").includes("iron_man_2_runcrouch_uniform"), `action=${rc.spriteAction} sheet=${rc.spriteSheet}`);

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → iron_man_2_crouch_uniform", (cr.spriteSheet || "").includes("iron_man_2_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → iron_man_2_run_uniform (reuse run)", (ds.spriteSheet || "").includes("iron_man_2_run_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses iron_man_2_jump_uniform", (jp.spriteSheet || "").includes("iron_man_2_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("fall"); await waitFrames(3); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → iron_man_2_jump_uniform (reuse jump)", (fl.spriteSheet || "").includes("iron_man_2_jump_uniform"), `sheet=${fl.spriteSheet}`);

  await force("guard"); await waitFrames(4); const bl = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → iron_man_2_crouch_uniform (reuse crouch, defensive low pose)", (bl.spriteSheet || "").includes("iron_man_2_crouch_uniform"), `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → iron_man_2_hurt_uniform", (ht.spriteSheet || "").includes("iron_man_2_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → iron_man_2_knockdown_uniform", (kd.spriteSheet || "").includes("iron_man_2_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → iron_man_2_getup_uniform", (gu.spriteSheet || "").includes("iron_man_2_getup_uniform"), `sheet=${gu.spriteSheet}`);

  await force("intro"); await waitFrames(3); const ntr = await p1(); await shot("intro"); await force(null); await waitFrames(2);
  check("intro → iron_man_2_idle_uniform (reuse idle — Stage 6 upgrades)", (ntr.spriteSheet || "").includes("iron_man_2_idle_uniform"), `sheet=${ntr.spriteSheet}`);

  console.log("\n── fallback-box sweep (no MOVEMENT action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "runCrouch", "crouch", "jump", "fall", "dash", "guard", "hurt", "knockdown", "getup", "intro"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("iron_man_2_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every movement action resolves a real iron_man_2_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
