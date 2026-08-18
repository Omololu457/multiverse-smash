// harness/spiderman_stage1.mjs
// STAGE 1 evidence: Spider-Man (Marvel Super Heroes, CPS2 arcade rip) registration + movement/state.
// Asserts the sprite gate (handler / idle sheet / stats / scale / energyType), exercises idle / intro
// crouch-to-stand / walk / run / dash / jump / fall / win / taunt / both ground rolls over the RE-SLICED
// spiderman_*_uniform.png sheets, and proves the CONFIRMED hit/knockdown GAP degrades safely (renders the
// idle-pose fallback, NOT the 128² box). Measures on-screen body height + sweeps for the fallback box.
// Screenshots → harness/shots/spiderman_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `spiderman_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Spider-Man", g.key === "spiderman", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = spiderman_idle_uniform", (g.spriteSheet || "").includes("spiderman_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.1", Math.abs((g.spriteScale || 0) - 1.1) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1080", g.maxHealth === 1080, `HP=${g.maxHealth}`);
  check("maxEnergy = 180", g.maxEnergy === 180, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("spiderman"));
  check("universe = marvel", def?.universe === "marvel", `universe=${def?.universe}`);
  check("energyType = web_fluid", def?.traits?.energyType === "web_fluid", `energyType=${def?.traits?.energyType}`);
  check("mobility = high (agile tier)", def?.traits?.mobility === "high", `mobility=${def?.traits?.mobility}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in human roster band (80–140px)", m.contentH >= 80 && m.contentH <= 140, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── intro (crouch-to-stand entrance) ──");
  await force("intro"); await waitFrames(5); const intro = await p1(); await shot("intro"); await force(null); await waitFrames(2);
  check("intro → spiderman_intro_uniform", (intro.spriteSheet || "").includes("spiderman_intro_uniform"), `sheet=${intro.spriteSheet}`);
  check("intro declared in introPool (auto-plays at match start)", Array.isArray(def?.introPool) && def.introPool.includes("intro"), `introPool=${JSON.stringify(def?.introPool)}`);

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const rn = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk/run uses spiderman_walk_uniform", /spiderman_walk_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → spiderman_dash_uniform", (ds.spriteSheet || "").includes("spiderman_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses spiderman_jump_uniform", (jp.spriteSheet || "").includes("spiderman_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitFrames(1);
  await force("fall"); await waitFrames(3); const fl = await p1(); await shot("fall"); await force(null);
  check("fall → spiderman_fall_uniform", (fl.spriteSheet || "").includes("spiderman_fall_uniform"), `sheet=${fl.spriteSheet}`);
  await waitGrounded();

  console.log("\n── win / taunt (row_24 glow-FX victory pose) ──");
  await force("win"); await waitFrames(4); const wn = await p1(); await shot("win"); await force(null); await waitFrames(2);
  check("win → spiderman_win_uniform", (wn.spriteSheet || "").includes("spiderman_win_uniform"), `sheet=${wn.spriteSheet}`);
  await force("taunt"); await waitFrames(4); const tt = await p1(); await shot("taunt"); await force(null); await waitFrames(2);
  check("taunt → spiderman_win_uniform (shared victory pose)", (tt.spriteSheet || "").includes("spiderman_win_uniform"), `sheet=${tt.spriteSheet}`);

  console.log("\n── ground rolls (evasive movement art) ──");
  await force("rollForward"); await waitFrames(3); const rf = await p1(); await shot("roll_forward"); await force(null); await waitFrames(2);
  check("rollForward → spiderman_rollf_uniform", (rf.spriteSheet || "").includes("spiderman_rollf_uniform"), `sheet=${rf.spriteSheet}`);
  await force("rollBack"); await waitFrames(3); const rb = await p1(); await shot("roll_back"); await force(null); await waitFrames(2);
  check("rollBack → spiderman_rollb_uniform", (rb.spriteSheet || "").includes("spiderman_rollb_uniform"), `sheet=${rb.spriteSheet}`);

  console.log("\n── CONFIRMED hit/knockdown GAP degrades safely (idle-pose fallback, NOT the 128² box) ──");
  // A missing action returns the bare 128² fallback DEF (spriteSheet=null in introspection), but the
  // engine's safe fallback (sprite.js:729) actually DRAWS the fighter's own idle pose. measureSprite
  // rasterizes the real draw, so a hurt/knockdown that renders idle has ~idle's contentH — the 128²
  // debug box would rasterize a big solid square instead. Compare against the captured idle height.
  const idleH = m ? m.contentH : 107;
  check("hurt/knockdown have NO dedicated strip (documented gap)", !def?.animationData?.hurt && !def?.animationData?.knockdown, `hurt=${def?.animationData?.hurt} kd=${def?.animationData?.knockdown}`);
  await force("hurt"); await waitFrames(3); const htm = await measure(); await shot("hurt_fallback"); await force(null); await waitFrames(2);
  check("hurt renders the idle-pose fallback (matches idle height, not a 128² box)", htm && Math.abs(htm.contentH - idleH) <= 20 && !htm.clipped, `hurtH=${htm?.contentH} idleH=${idleH}`);
  await force("knockdown"); await waitFrames(3); const kdm = await measure(); await force(null); await waitFrames(2);
  check("knockdown renders the idle-pose fallback (matches idle height, not a 128² box)", kdm && Math.abs(kdm.contentH - idleH) <= 20 && !kdm.clipped, `kdH=${kdm?.contentH} idleH=${idleH}`);

  console.log("\n── fallback-box sweep (no MOVEMENT action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "intro", "walk", "run", "dash", "jump", "fall", "win", "taunt", "rollForward", "rollBack"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("spiderman_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every movement action resolves a real spiderman_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
