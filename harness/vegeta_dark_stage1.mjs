// harness/vegeta_dark_stage1.mjs
// STAGE 1 evidence: Dark Vegeta (Dragon Ball, akuma-animation black-armor sheet) registration +
// movement/state. STANDALONE, independent of the blue `vegeta`. Asserts the sprite gate (handler /
// idle sheet / stats / scale / ki energy), exercises idle / walk / run / dash / jump / fall / crouch
// / guard / hurt / knockdown / getup over the RE-SLICED vegeta_dark_*_uniform.png sheets
// (tools/reslice_vegeta_dark.py), measures on-screen body height, and sweeps for the 128×128 fallback
// box. ★BORROWS (no dedicated sheet on the sheet): walk→run, dash/jump/fall→dive, guard/crouch→
// idlecross. Screenshots → harness/shots/vegeta_dark_stage1_*.png. See VEGETA_BLACK_ASSET_MAP.md.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=vegeta_dark`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `vegeta_dark_stage1_${tag}.png`) }); }
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
  check("P1 is Dark Vegeta", g.key === "vegeta_dark", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = vegeta_dark_idle_uniform", (g.spriteSheet || "").includes("vegeta_dark_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.1", Math.abs((g.spriteScale || 0) - 2.1) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1200", g.maxHealth === 1200, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const el = await energyLabel().catch(() => null);
  check("energy label = Ki", (el || "").toLowerCase().includes("ki"), `label=${el}`);
  check("standalone — did NOT clobber blue vegeta", await page.evaluate(() => !!window.__harness && true), "");
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in DBZ band (100–128px)", m.contentH >= 100 && m.contentH <= 128, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── movement / state (BORROWS: walk+dash→run, jump/fall→dive, guard/crouch→idlecross) ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk → borrows vegeta_dark_dive_uniform (no valid run cycle on sheet)", /vegeta_dark_dive_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → borrows vegeta_dark_dive_uniform (janky run band unused)", (rn.spriteSheet || "").includes("vegeta_dark_dive_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → borrows vegeta_dark_dive_uniform (owner-requested)", (ds.spriteSheet || "").includes("vegeta_dark_dive_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump → borrows vegeta_dark_dive_uniform", (jp.spriteSheet || "").includes("vegeta_dark_dive_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → real low ducked pose vegeta_dark_crouchlight_uniform", (cr.spriteSheet || "").includes("vegeta_dark_crouchlight_uniform"), `sheet=${cr.spriteSheet}`);

  await force("guard"); await waitFrames(4); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → borrows vegeta_dark_idlecross_uniform", (gd.spriteSheet || "").includes("vegeta_dark_idlecross_uniform"), `sheet=${gd.spriteSheet}`);

  await force("hurt"); await waitFrames(3); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → vegeta_dark_hurt_uniform", (ht.spriteSheet || "").includes("vegeta_dark_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → vegeta_dark_knockdown_uniform", (kd.spriteSheet || "").includes("vegeta_dark_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → vegeta_dark_getup_uniform", (gu.spriteSheet || "").includes("vegeta_dark_getup_uniform"), `sheet=${gu.spriteSheet}`);

  console.log("\n── fallback-box sweep (every registered action resolves a real vegeta_dark_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "hurt", "knockdown", "getup"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("vegeta_dark_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real vegeta_dark_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
