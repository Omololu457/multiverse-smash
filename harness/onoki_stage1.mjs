// harness/onoki_stage1.mjs
// STAGE 1 evidence: Onoki (Third Tsuchikage, Naruto) registration + movement/state + FLIGHT MODE.
// Asserts the sprite gate (handler / idle sheet / stats / scale), exercises idle / walk / run / dash /
// jump / fall / guard / hurt / knockdown+getup / taunt over the RE-SLICED onoki_*_uniform.png sheets,
// and — Onoki's signature — proves the GROUND↔FLIGHT toggle swaps to the dedicated fly/flyMove art
// (canon Dust Release levitation, shared canFly system). Measures on-screen body height and sweeps for
// the 128×128 fallback box. Screenshots → harness/shots/onoki_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=onoki`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `onoki_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const flightToggle = () => page.evaluate(() => window.__harness.onokiFlightToggle("p1"));
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Onoki", g.key === "onoki", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = onoki_idle_uniform", (g.spriteSheet || "").includes("onoki_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.55", Math.abs((g.spriteScale || 0) - 1.55) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1120", g.maxHealth === 1120, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("onoki"));
  check("energyType = particle (Dust Release)", def?.traits?.energyType === "particle", `energyType=${def?.traits?.energyType}`);
  check("traits.canFly (flight system enabled)", def?.traits?.canFly === true, `canFly=${def?.traits?.canFly}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in human roster band (80–120px, Onoki reads short)", m.contentH >= 80 && m.contentH <= 120, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const rn = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk/run uses onoki_walk_uniform", /onoki_walk_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → onoki_dash_uniform", (ds.spriteSheet || "").includes("onoki_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); const jp = await p1(); await shot("jump");
  check("jump uses onoki_jump_uniform", (jp.spriteSheet || "").includes("onoki_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("guard"); await waitFrames(4); const bl = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → onoki_guard_uniform", (bl.spriteSheet || "").includes("onoki_guard_uniform"), `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  await force("hurt"); await waitFrames(4); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → onoki_hit_uniform", (ht.spriteSheet || "").includes("onoki_hit_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → onoki_knockdown_uniform", (kd.spriteSheet || "").includes("onoki_knockdown_uniform"), `sheet=${kd.spriteSheet}`);
  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → onoki_getup_uniform", (gu.spriteSheet || "").includes("onoki_getup_uniform"), `sheet=${gu.spriteSheet}`);

  await force("taunt"); await waitFrames(4); const tt = await p1(); await shot("taunt"); await force(null); await waitFrames(2);
  check("taunt → onoki_taunt_uniform", (tt.spriteSheet || "").includes("onoki_taunt_uniform"), `sheet=${tt.spriteSheet}`);

  console.log("\n── FLIGHT MODE (signature Dust Release levitation — dedicated fly/flyMove art) ──");
  await waitGrounded();
  const t1 = await flightToggle(); await waitFrames(4); const fh = await p1(); await shot("flight_hover");
  check("flight toggle ON engages _flightActive", t1.flightActive === true && fh.flightActive === true, `flightActive=${fh.flightActive}`);
  check("neutral flight → onoki_hover_idle_uniform (fly art)", (fh.spriteSheet || "").includes("onoki_hover_idle_uniform"), `sheet=${fh.spriteSheet}`);

  // Streaking flight: hold a direction while airborne-flying → flyMove art.
  await page.keyboard.down("d"); await waitFrames(6); const fm = await p1(); await shot("flight_move"); await page.keyboard.up("d"); await waitFrames(2);
  check("horizontal flight → onoki_flight_glide_uniform (flyMove art)", (fm.spriteSheet || "").includes("onoki_flight_glide_uniform"), `sheet=${fm.spriteSheet}`);

  const t2 = await flightToggle(); await waitFrames(4); await waitGrounded(); await waitFrames(2); const gr = await p1(); await shot("flight_off");
  check("flight toggle OFF disengages _flightActive", t2.flightActive === false && gr.flightActive === false, `flightActive=${gr.flightActive}`);
  const grSheet = gr.spriteSheet || "";
  check("flight art cleared, ground art restored (no fly/flyMove sheet)",
    grSheet.includes("onoki_") && !grSheet.includes("hover_idle") && !grSheet.includes("flight_glide"), `sheet=${grSheet}`);

  console.log("\n── fallback-box sweep (no action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "guard", "hurt", "knockdown", "getup", "taunt", "fly", "flyMove"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("onoki_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real onoki_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
