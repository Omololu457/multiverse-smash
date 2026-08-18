// harness/light_stage1.mjs
// STAGE 1 evidence: Light Yagami (Death Note, Kira / special-heavy zoner) registration + movement.
// Asserts the sprite gate (handler / idle sheet / stats / scale / kira energy / zoner-technician profile),
// exercises idle / walk / run / dash / jump / fall / guard / hurt / knockdown over the RE-SLICED
// light_*_uniform.png sheets, and sweeps for the 128×128 fallback box. Screenshots → harness/shots/light_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=light`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `light_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Light", g.key === "light", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = light_idle_uniform", (g.spriteSheet || "").includes("light_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.9", Math.abs((g.spriteScale || 0) - 1.9) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1080", g.maxHealth === 1080, `HP=${g.maxHealth}`);
  check("maxEnergy = 200 (deep Kira pool)", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("light"));
  check("energyType = kira", def?.traits?.energyType === "kira", `energyType=${def?.traits?.energyType}`);
  check("zoner/technician profile (versatile scaling)", def?.traits?.scaling === "versatile", `scaling=${def?.traits?.scaling}`);
  check("speed 88 / defense 82 (average durability)", def?.stats?.speed === 88 && def?.stats?.defense === 82, `spd=${def?.stats?.speed} def=${def?.stats?.defense}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in human roster band (85–140px)", m.contentH >= 85 && m.contentH <= 140, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const rn = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("forward movement uses light run strip (walk borrows run)", /light_run_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await force("run"); await waitFrames(4); const rr = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → light_run_uniform", (rr.spriteSheet || "").includes("light_run_uniform"), `sheet=${rr.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → light_dash_uniform (wide dash cells)", (ds.spriteSheet || "").includes("light_dash_uniform"), `sheet=${ds.spriteSheet}`);

  console.log("\n── airborne (jump / fall share the jump strip) ──");
  await force("jump"); await waitFrames(3); const jp = await p1(); await shot("jump"); await force(null); await waitFrames(2);
  check("jump → light_jump_uniform", (jp.spriteSheet || "").includes("light_jump_uniform"), `sheet=${jp.spriteSheet}`);
  await force("fall"); await waitFrames(3); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → light_jump_uniform (reused aerial base)", (fl.spriteSheet || "").includes("light_jump_uniform"), `sheet=${fl.spriteSheet}`);

  console.log("\n── hit / knockdown (both from the 4f damage strip; notebook drops on f4) ──");
  await waitGrounded();
  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → light_hurt_uniform", (ht.spriteSheet || "").includes("light_hurt_uniform"), `sheet=${ht.spriteSheet}`);
  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → light_hurt_uniform (reuses damage strip)", (kd.spriteSheet || "").includes("light_hurt_uniform"), `sheet=${kd.spriteSheet}`);

  console.log("\n── guard (DEFENSE segment, hold f1) ──");
  await force("guard"); await waitFrames(3); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → light_guard_uniform", (gd.spriteSheet || "").includes("light_guard_uniform"), `sheet=${gd.spriteSheet}`);

  console.log("\n── fallback-box sweep (no action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "guard", "hurt", "knockdown"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("light_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real light_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
