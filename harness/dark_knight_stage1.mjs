// harness/dark_knight_stage1.mjs
// STAGE 1 evidence: Batman NEW VARIANT (rosterKey "dark_knight", DC) registration + movement/state.
// Asserts the sprite gate (handler / idle sheet / stats / scale / energyType), exercises idle / walk /
// run / dash / crouch / jump / fall / glide / dodge / guard / hurt / knockdown / getup over the
// RE-SLICED dark_knight_*_uniform.png sheets (HONEST reuses: run+dash=walk, jump+fall=glide,
// guard+hurt+getup=idle), measures on-screen body height, and sweeps for the 128×128 procedural box.
// Screenshots → harness/shots/dark_knight_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=dark_knight`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `dark_knight_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is dark_knight", g.key === "dark_knight", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = dark_knight_idle_uniform", (g.spriteSheet || "").includes("dark_knight_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 0.9", Math.abs((g.spriteScale || 0) - 0.9) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1150", g.maxHealth === 1150, `HP=${g.maxHealth}`);
  check("maxEnergy = 100", g.maxEnergy === 100, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("dark_knight"));
  check("universe = dc", def?.universe === "dc", `universe=${def?.universe}`);
  check("energyType = fury", def?.traits?.energyType === "fury", `energyType=${def?.traits?.energyType}`);
  check("dark_knight registered (charDef non-null)", !!def && def.hasSprites === true, "");
  check("portrait asset exists on disk (dark_knight_portrait.png)", fs.existsSync(path.join(ROOT, "dark_knight_portrait.png")), "");
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in roster band (80–130px)", m.contentH >= 80 && m.contentH <= 130, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk uses dark_knight_walk_uniform", /dark_knight_walk_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → dark_knight_walk_uniform (reuse)", (rn.spriteSheet || "").includes("dark_knight_walk_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → dark_knight_walk_uniform (reuse)", (ds.spriteSheet || "").includes("dark_knight_walk_uniform"), `sheet=${ds.spriteSheet}`);

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → dark_knight_crouch_uniform", (cr.spriteSheet || "").includes("dark_knight_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  await force("dodge"); await waitFrames(4); const dg = await p1(); await shot("dodge"); await force(null); await waitFrames(2);
  check("dodge → dark_knight_dodge_uniform (cape-wrap evade)", (dg.spriteSheet || "").includes("dark_knight_dodge_uniform"), `sheet=${dg.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses dark_knight_glide_uniform", (jp.spriteSheet || "").includes("dark_knight_glide_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("fall"); await waitFrames(3); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → dark_knight_glide_uniform (reuse)", (fl.spriteSheet || "").includes("dark_knight_glide_uniform"), `sheet=${fl.spriteSheet}`);

  await force("glide"); await waitFrames(3); const gl = await p1(); await shot("glide"); await force(null); await waitFrames(2);
  check("glide → dark_knight_glide_uniform", (gl.spriteSheet || "").includes("dark_knight_glide_uniform"), `sheet=${gl.spriteSheet}`);

  await force("guard"); await waitFrames(4); const bl = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → dark_knight_idle_uniform (reuse)", (bl.spriteSheet || "").includes("dark_knight_idle_uniform"), `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → dark_knight_idle_uniform (reuse)", (ht.spriteSheet || "").includes("dark_knight_idle_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → dark_knight_knockdown_uniform (real KO art)", (kd.spriteSheet || "").includes("dark_knight_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  console.log("\n── fallback-box sweep (no MOVEMENT action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "crouch", "dodge", "jump", "fall", "glide", "guard", "hurt", "knockdown"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("dark_knight_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every movement action resolves a real dark_knight_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── old batman UNTOUCHED (separate entry, own art) ──");
  const oldB = await page.evaluate(() => window.__harness.charDef("batman"));
  check("old batman still registered + separate entry", !!oldB && oldB.universe === "dc", `oldB=${!!oldB}`);
  const dkSheet = def?.animationData?.idle?.sheet || "", oldSheet = oldB?.animationData?.idle?.sheet || "";
  check("dark_knight uses its OWN art (distinct from batman)", dkSheet.includes("dark_knight") && oldSheet.includes("batman") && !oldSheet.includes("dark_knight"), `dk=${dkSheet} old=${oldSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
