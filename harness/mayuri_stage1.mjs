// harness/mayuri_stage1.mjs
// STAGE 1 evidence: Mayuri Kurotsuchi (Bleach, 12th-Division captain) registration + movement/state.
// Asserts the sprite gate (handler / idle sheet / stats / scale), exercises idle / seated-idle / walk /
// run / dash / crouch / hurt / knockdown+getup over the RE-SLICED mayuri_*_uniform.png sheets, and proves
// the dash-trail GHOST + dash-start SHOCKWAVE FX overlays render during movement (via __harness.mayuriFx).
// Sweeps for the 128×128 fallback box. Screenshots → harness/shots/mayuri_stage1_*.png.
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
const fx = () => page.evaluate(() => window.__harness.mayuriFx("p1"));
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=mayuri`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `mayuri_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Mayuri", g.key === "mayuri", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = mayuri_idle_uniform", (g.spriteSheet || "").includes("mayuri_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.15", Math.abs((g.spriteScale || 0) - 1.15) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1080", g.maxHealth === 1080, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("mayuri"));
  check("energyType = reiatsu (Bleach Spirit Pressure)", def?.traits?.energyType === "reiatsu", `energyType=${def?.traits?.energyType}`);
  check("technician profile (medium mobility, versatile scaling)", def?.traits?.mobility === "medium" && def?.traits?.scaling === "versatile", `mobility=${def?.traits?.mobility} scaling=${def?.traits?.scaling}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in human roster band (95–135px, tall captain)", m.contentH >= 95 && m.contentH <= 135, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── idle variants: standing + iconic SEATED ──");
  await force("idleSeated"); await waitFrames(6); const seat = await p1(); await shot("idle_seated");
  check("seated idle → mayuri_idle_seated_uniform", (seat.spriteSheet || "").includes("mayuri_idle_seated_uniform"), `sheet=${seat.spriteSheet}`);
  await force(null); await waitFrames(2);

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const rn = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("forward movement uses mayuri walk/run", /mayuri_(walk|run)_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await force("run"); await waitFrames(4); const rr = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → mayuri_run_uniform", (rr.spriteSheet || "").includes("mayuri_run_uniform"), `sheet=${rr.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → mayuri_dash_uniform", (ds.spriteSheet || "").includes("mayuri_dash_uniform"), `sheet=${ds.spriteSheet}`);

  console.log("\n── crouch (hold Down, generic gated resolver branch) ──");
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(6); const cr = await p1(); const crfx = await fx(); await shot("crouch"); await page.keyboard.up("s"); await waitFrames(3);
  check("crouch flag set while Down held", crfx?.crouching === true, `crouching=${crfx?.crouching}`);
  check("crouch → mayuri_crouch_uniform", (cr.spriteSheet || "").includes("mayuri_crouch_uniform"), `action=${cr.spriteAction} sheet=${cr.spriteSheet}`);

  console.log("\n── hit / knockdown chain ──");
  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → mayuri_hurt_uniform", (ht.spriteSheet || "").includes("mayuri_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → mayuri_knockdown_uniform", (kd.spriteSheet || "").includes("mayuri_knockdown_uniform"), `sheet=${kd.spriteSheet}`);
  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → mayuri_getup_uniform", (gu.spriteSheet || "").includes("mayuri_getup_uniform"), `sheet=${gu.spriteSheet}`);

  console.log("\n── MOVEMENT FX overlays (dash-trail ghost + dash-start shockwave) ──");
  await waitGrounded();
  // Deterministic real dash (arms the double-tap → physics gives a real dashTimer → the Mayuri overlay).
  // MEASURE in a TIGHT loop with NO interleaved screenshots (each shot() burns several frames and would
  // race past the FX windows). During the dash: dashTimer>0 (shockwave fires on the start edge, trail
  // shows). After it: the trail lingers a few frames (dashTimer==0) as a deceleration run-ghost.
  await waitGrounded();
  await page.evaluate(() => window.__harness.mayuriDash(1, "p1"));
  let sawTrail = false, sawShock = false, sawDash = false, runTrail = false;
  for (let i = 0; i < 22; i++) { const s = await fx();
    if (s?.trail) sawTrail = true; if (s?.shock) sawShock = true;
    if ((s?.dashTimer || 0) > 0) sawDash = true;
    if (s?.trail && (s?.dashTimer || 0) === 0) runTrail = true;
    await waitFrames(1); }
  check("real dash triggered (dashTimer > 0)", sawDash, `sawDash=${sawDash}`);
  check("dash-trail ghost overlay rendered during dash", sawTrail, `sawTrail=${sawTrail}`);
  check("dash-start shockwave rings overlay fired", sawShock, `sawShock=${sawShock}`);
  check("dash-trail ghost also renders during the post-dash fast run", runTrail, `runTrail=${runTrail}`);
  // Screenshots: fresh dashes, captured at the right beat (separate from measurement so the shot delay
  // doesn't skip the window). mayuriDash zeroes the dash cooldown so back-to-back dashes fire.
  await waitGrounded(); await page.evaluate(() => window.__harness.mayuriDash(1, "p1")); await waitFrames(1); await shot("fx_shockwave");
  await waitFrames(3); await shot("fx_dash_trail");
  await waitFrames(6); await shot("fx_run_trail");

  console.log("\n── fallback-box sweep (no action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "idleSeated", "walk", "run", "dash", "jump", "fall", "guard", "crouch", "hurt", "knockdown", "getup"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("mayuri_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real mayuri_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
