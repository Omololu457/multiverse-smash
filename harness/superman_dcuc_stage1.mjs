// harness/superman_dcuc_stage1.mjs
// STAGE 1 evidence: Superman (Custom / DC Universe Customs), rosterKey "superman_dcuc", DC.
// Asserts the sprite gate (handler / idle sheet / stats / scale / energyType / canFly), exercises
// idle / walk / run / dash / crouch / jump / fall / guard / hurt / knockdown / fly over the RE-SLICED
// superman_dcuc_*_uniform.png sheets (HONEST reuses: dash=run, guard/getup/charge=idle, descentLand=crouch),
// measures on-screen body height, sweeps for the procedural fallback box, and confirms the built `superman`
// (Arcade) stays a SEPARATE entry with its OWN art. Screenshots → harness/shots/superman_dcuc_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=superman_dcuc`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `superman_dcuc_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is superman_dcuc", g.key === "superman_dcuc", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = superman_dcuc_idle_uniform", (g.spriteSheet || "").includes("superman_dcuc_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1300", g.maxHealth === 1300, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("superman_dcuc"));
  check("universe = dc", def?.universe === "dc", `universe=${def?.universe}`);
  check("energyType = solar_energy", def?.traits?.energyType === "solar_energy", `energyType=${def?.traits?.energyType}`);
  check("canFly = true", def?.traits?.canFly === true, `canFly=${def?.traits?.canFly}`);
  check("registered (charDef non-null, hasSprites)", !!def && def.hasSprites === true, "");
  check("portrait asset exists on disk", fs.existsSync(path.join(ROOT, "superman_dcuc_portrait.png")), "");
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in roster band (80–130px)", m.contentH >= 80 && m.contentH <= 130, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk uses superman_dcuc_walk_uniform", /superman_dcuc_walk_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → superman_dcuc_walk_uniform (reuse — single locomotion cycle)", (rn.spriteSheet || "").includes("superman_dcuc_walk_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → superman_dcuc_walk_uniform (reuse)", (ds.spriteSheet || "").includes("superman_dcuc_walk_uniform"), `sheet=${ds.spriteSheet}`);

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → superman_dcuc_crouch_uniform", (cr.spriteSheet || "").includes("superman_dcuc_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses superman_dcuc_jump_uniform", (jp.spriteSheet || "").includes("superman_dcuc_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("fall"); await waitFrames(3); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → superman_dcuc_fall_uniform", (fl.spriteSheet || "").includes("superman_dcuc_fall_uniform"), `sheet=${fl.spriteSheet}`);

  await force("guard"); await waitFrames(4); const bl = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → superman_dcuc_idle_uniform (reuse)", (bl.spriteSheet || "").includes("superman_dcuc_idle_uniform"), `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → superman_dcuc_hurt_uniform (real recoil, distinct from idle)", (ht.spriteSheet || "").includes("superman_dcuc_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → superman_dcuc_knockdown_uniform (real knockback art)", (kd.spriteSheet || "").includes("superman_dcuc_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  console.log("\n── flight (canFly) ──");
  await force("fly"); await waitFrames(4); const fy = await p1(); await shot("fly"); await force(null); await waitFrames(2);
  check("fly → superman_dcuc_fly_uniform", (fy.spriteSheet || "").includes("superman_dcuc_fly_uniform"), `action=${fy.spriteAction} sheet=${fy.spriteSheet}`);

  console.log("\n── fallback-box sweep (no MOVEMENT action renders the procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "crouch", "jump", "fall", "guard", "hurt", "knockdown", "fly"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("superman_dcuc_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every movement action resolves a real superman_dcuc_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── built `superman` (Arcade) UNTOUCHED (separate entry, own art) ──");
  const oldS = await page.evaluate(() => window.__harness.charDef("superman"));
  check("built superman still registered + separate entry", !!oldS && oldS.universe === "dc" && (oldS.animationData?.idle?.sheet || "").includes("superman_idle"), `oldS=${!!oldS} idle=${oldS?.animationData?.idle?.sheet}`);
  const dcSheet = def?.animationData?.idle?.sheet || "", oldSheet = oldS?.animationData?.idle?.sheet || "";
  check("superman_dcuc uses its OWN art (distinct from superman)", dcSheet.includes("superman_dcuc") && oldSheet.includes("superman_idle") && !oldSheet.includes("dcuc"), `dcuc=${dcSheet} old=${oldSheet}`);
  check("distinct stats (dcuc 1300 vs superman 1450)", def?.stats?.maxHealth === 1300 && oldS?.stats?.maxHealth === 1450, `dcuc=${def?.stats?.maxHealth} old=${oldS?.stats?.maxHealth}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
