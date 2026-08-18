// harness/saitama_stage1.mjs
// STAGE 1 evidence: Saitama (One Punch Man) registration + movement/state + 3-part intro.
// Asserts the sprite gate (handler / idle sheet / stats / scale), exercises idle / intro / walk / dash /
// jump / block / hit over the RE-SLICED saitama_*_uniform.png sheets, proves the stitched 3-part intro
// (getup → run-backwards → settle) plays and hands back to idle, measures on-screen body height
// (measureSprite), and sweeps for the 128×128 fallback box. Screenshots → harness/shots/saitama_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=saitama`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `saitama_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Saitama", g.key === "saitama", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = saitama_idle_uniform", (g.spriteSheet || "").includes("saitama_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1280", g.maxHealth === 1280, `HP=${g.maxHealth}`);
  check("maxEnergy = 150", g.maxEnergy === 150, `EN=${g.maxEnergy}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in human roster band (92–120px)", m.contentH >= 92 && m.contentH <= 120, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── 3-part intro (getup → run-backwards → settle → idle) ──");
  await force("intro"); await waitFrames(3); await shot("intro_start");
  const introMid = await p1(); await waitFrames(6); await shot("intro_mid");
  const intro = await p1(); await waitFrames(6); await shot("intro_end");
  check("intro → saitama_intro_full_uniform", (intro.spriteSheet || "").includes("saitama_intro_full_uniform"), `sheet=${intro.spriteSheet}`);
  check("intro still on intro sheet mid-play", (introMid.spriteSheet || "").includes("saitama_intro_full_uniform"), `sheet=${introMid.spriteSheet}`);
  await force(null); await waitFrames(3); const back = await p1(); await shot("intro_to_idle");
  check("intro hands back to idle sheet", (back.spriteSheet || "").includes("saitama_idle_uniform"), `sheet=${back.spriteSheet}`);

  console.log("\n── movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const rn = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk uses saitama_walk_uniform", /saitama_walk_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → saitama_dash_uniform", (ds.spriteSheet || "").includes("saitama_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump uses saitama_jump_uniform", (jp.spriteSheet || "").includes("saitama_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await page.keyboard.down(";"); await waitFrames(6); const bl = await p1(); await shot("block"); await page.keyboard.up(";"); await waitFrames(3);
  check("block → saitama_block_uniform", (bl.spriteSheet || "").includes("saitama_block_uniform"), `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hit"); await force(null); await waitFrames(2);
  check("hurt → saitama_hit_uniform", (ht.spriteSheet || "").includes("saitama_hit_uniform"), `sheet=${ht.spriteSheet}`);

  console.log("\n── fallback-box sweep (no action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "intro", "walk", "dash", "jump", "fall", "guard", "hurt"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("saitama_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real saitama_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
