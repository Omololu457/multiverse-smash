// harness/l_ryuuzaki_stage1.mjs
// STAGE 1 evidence: L "Ryuuzaki" (Death Note) registration + movement/state.
// Asserts the 5-file sprite gate (handler / idle sheet / stats / scale / energyType) and exercises
// idle / idle_seated / walk / run / dash / jump / fall / guard / hurt / knockdown / taunt / win over
// the RE-SLICED l_ryuuzaki_*_uniform.png sheets, measures on-screen body height, and sweeps for the
// 128×128 procedural fallback box. Screenshots → harness/shots/l_ryuuzaki_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=l_ryuuzaki`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats (5-file registration) ──");
  const g = await p1();
  check("P1 is L (rosterKey l_ryuuzaki)", g.key === "l_ryuuzaki", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = l_ryuuzaki_idle_uniform", (g.spriteSheet || "").includes("l_ryuuzaki_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1040", g.maxHealth === 1040, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("l_ryuuzaki"));
  check("energyType = deduction", def?.traits?.energyType === "deduction", `energyType=${def?.traits?.energyType}`);
  check("scaling versatile", def?.traits?.scaling === "versatile", `scaling=${def?.traits?.scaling}`);
  check("mobility medium", def?.traits?.mobility === "medium", `mobility=${def?.traits?.mobility}`);
  check("hasSprites flag on", def?.hasSprites === true, `hasSprites=${def?.hasSprites}`);
  check("idleSeated action present", !!def?.animationData?.idleSeated?.sheet, `idleSeated=${JSON.stringify(def?.animationData?.idleSeated)}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in human roster band (80–120px)", m.contentH >= 80 && m.contentH <= 120, `contentH=${m.contentH}`);
    check("idle NOT shrunk to scale-1 (contentH > 60px)", m.contentH > 60, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── seated idle (contextual variant + win pose) ──");
  await force("idleSeated"); await waitFrames(4); const seat = await p1(); await shot("idle_seated"); await force(null); await waitFrames(2);
  check("idleSeated → l_ryuuzaki_idle_seated_uniform", (seat.spriteSheet || "").includes("l_ryuuzaki_idle_seated_uniform"), `action=${seat.spriteAction} sheet=${seat.spriteSheet}`);

  console.log("\n── ground movement / state ──");
  // Holding a direction resolves to walk OR run depending on velocity (L ships BOTH dedicated strips) —
  // either is a real L sheet (never a box). force("run") below verifies the run strip directly.
  await page.keyboard.down("d"); await waitFrames(18); const rn = await p1(); await shot("run"); await page.keyboard.up("d"); await waitFrames(4);
  check("moving → l_ryuuzaki walk/run strip (no box)", /l_ryuuzaki_(walk|run)_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await force("run"); await waitFrames(4); const rf = await p1(); await shot("run_forced"); await force(null); await waitFrames(2);
  check("run → l_ryuuzaki_run_uniform", (rf.spriteSheet || "").includes("l_ryuuzaki_run_uniform"), `sheet=${rf.spriteSheet}`);

  await force("walk"); await waitFrames(4); const wk = await p1(); await shot("walk"); await force(null); await waitFrames(2);
  check("walk → l_ryuuzaki_walk_uniform", (wk.spriteSheet || "").includes("l_ryuuzaki_walk_uniform"), `sheet=${wk.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → l_ryuuzaki_dash_uniform", (ds.spriteSheet || "").includes("l_ryuuzaki_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses l_ryuuzaki_jump_uniform", (jp.spriteSheet || "").includes("l_ryuuzaki_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("guard"); await waitFrames(4); const bl = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → real sheet (procedural fallback = idle reuse, no box)", (bl.spriteSheet || "").includes("l_ryuuzaki_"), `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → l_ryuuzaki_knockdown_uniform", (ht.spriteSheet || "").includes("l_ryuuzaki_knockdown_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → l_ryuuzaki_knockdown_uniform", (kd.spriteSheet || "").includes("l_ryuuzaki_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("taunt"); await waitFrames(4); const tt = await p1(); await shot("taunt"); await force(null); await waitFrames(2);
  check("taunt → l_ryuuzaki_taunt_uniform", (tt.spriteSheet || "").includes("l_ryuuzaki_taunt_uniform"), `sheet=${tt.spriteSheet}`);

  await force("win"); await waitFrames(4); const wn = await p1(); await shot("win"); await force(null); await waitFrames(2);
  check("win → seated pose (l_ryuuzaki_idle_seated_uniform)", (wn.spriteSheet || "").includes("l_ryuuzaki_idle_seated_uniform"), `sheet=${wn.spriteSheet}`);

  console.log("\n── fallback-box sweep (no action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "idleSeated", "walk", "run", "dash", "jump", "fall", "guard", "hurt", "knockdown", "taunt", "win"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("l_ryuuzaki_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real l_ryuuzaki_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
