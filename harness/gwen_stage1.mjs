// harness/gwen_stage1.mjs
// STAGE 1 evidence: Gwen Tennyson (fan-made JUS chibi sheet) registration + movement/state.
// Asserts the sprite gate (handler / idle sheet / stats / scale / energyType / universe), exercises
// idle / guard / walk / run / dash / crouch / jump / fall / hurt / knockdown over the RE-SLICED
// gwen_*_uniform.png sheets, and measures on-screen body height + sweeps for the 128×128 fallback box.
// ★Gwen has a GENUINE separate WALK cycle DISTINCT from RUN (walk≠run). dash has its OWN low-lunge art
//   (does NOT reuse run). fall REUSES jump's apex cell. guard = spellbook-across-chest brace (own sheet).
// Screenshots → harness/shots/gwen_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=gwen`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gwen_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Gwen", g.key === "gwen", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = gwen_idle_uniform", (g.spriteSheet || "").includes("gwen_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.25", Math.abs((g.spriteScale || 0) - 2.25) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1120", g.maxHealth === 1120, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("gwen"));
  check("universe = ben10", def?.universe === "ben10", `universe=${def?.universe}`);
  check("energyType = mana", def?.traits?.energyType === "mana", `energyType=${def?.traits?.energyType}`);
  check("scaling versatile", def?.traits?.scaling === "versatile", `scaling=${def?.traits?.scaling}`);
  check("mobility high", def?.traits?.mobility === "high", `mobility=${def?.traits?.mobility}`);
  check("runWhenAdvancing set", def?.movement?.runWhenAdvancing === true, `movement=${JSON.stringify(def?.movement)}`);
  check("ultimate = Mana Blade", def?.ultimate?.name === "Mana Blade", `ult=${def?.ultimate?.name}`);
  check("portrait asset exists on disk (gwen_portrait.png)", fs.existsSync(path.join(ROOT, "gwen_portrait.png")), "");
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in roster band (80–130px)", m.contentH >= 80 && m.contentH <= 130, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  // Gwen WALK and RUN are DISTINCT sheets. runWhenAdvancing plays RUN when moving TOWARD the foe
  //   (press "d"→foe) and WALK on RETREAT (press "a", away). dash has OWN art; fall reuses jump.
  await page.keyboard.down("a"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("a"); await waitFrames(4);
  check("walk (retreat) uses gwen_walk_uniform", /gwen_walk_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await page.keyboard.down("d"); await waitFrames(14); const adv = await p1(); await shot("advance_run"); await page.keyboard.up("d"); await waitFrames(4);
  check("advance (toward foe) plays run cycle (runWhenAdvancing)", /gwen_run_uniform/.test(adv.spriteSheet || ""), `action=${adv.spriteAction} sheet=${adv.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → gwen_run_uniform (own art, ≠ walk)", (rn.spriteSheet || "").includes("gwen_run_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const dsh = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → gwen_dash_uniform (own low-lunge art)", (dsh.spriteSheet || "").includes("gwen_dash_uniform"), `sheet=${dsh.spriteSheet}`);

  await force("guard"); await waitFrames(4); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → gwen_guard_uniform (spellbook brace)", (gd.spriteSheet || "").includes("gwen_guard_uniform"), `sheet=${gd.spriteSheet}`);

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → gwen_crouch_uniform", (cr.spriteSheet || "").includes("gwen_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses gwen_jump_uniform", (jp.spriteSheet || "").includes("gwen_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("fall"); await waitFrames(3); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → gwen_jump_uniform (reuse apex)", (fl.spriteSheet || "").includes("gwen_jump_uniform"), `sheet=${fl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → gwen_hurt_uniform", (ht.spriteSheet || "").includes("gwen_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → gwen_knockdown_uniform", (kd.spriteSheet || "").includes("gwen_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  console.log("\n── fallback-box sweep (no MOVEMENT action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "guard", "walk", "run", "dash", "crouch", "jump", "fall", "hurt", "knockdown"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("gwen_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every movement action resolves a real gwen_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
