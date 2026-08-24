// harness/ippo_stage1.mjs
// STAGE 1 evidence: Ippo Makunouchi (Hajime no Ippo) registration + movement/state. Asserts the sprite
// gate (handler / idle sheet / stats / scale / GUTS energy label), exercises idle / walk / run / dash /
// jump / fall / guard / crouch / dodge / failed / hurt / knockdown / getup over the RE-SLICED
// ippo_*_uniform.png sheets (tools/reslice_ippo.py — JUS-style, green-bg, RIGHT-facing, no flip),
// measures on-screen body height (measureSprite), and sweeps for the 128×128 fallback box. ★Ippo has
// NO separate run/dash stride on the sheet → run + dash BORROW the WALK cycle; crouch borrows guard.
// fall = REAL descent art (not a jump reuse). dodge/failed are DISTINCT states (Stage-0 item 3).
// Screenshots → harness/shots/ippo_stage1_*.png. See IPPO_ASSET_MAP.md.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=ippo`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `ippo_stage1_${tag}.png`) }); }
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
  check("P1 is Ippo", g.key === "ippo", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = ippo_idle_uniform", (g.spriteSheet || "").includes("ippo_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.1", Math.abs((g.spriteScale || 0) - 2.1) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1160", g.maxHealth === 1160, `HP=${g.maxHealth}`);
  check("maxEnergy = 100", g.maxEnergy === 100, `EN=${g.maxEnergy}`);
  const el = await energyLabel().catch(() => null);
  check("energy label = Guts", (el || "").toLowerCase().includes("guts"), `label=${el}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in roster mid-band (95–120px)", m.contentH >= 95 && m.contentH <= 120, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── movement / state (Ippo has NO run/dash stride → run/dash BORROW walk; crouch borrows guard) ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk → ippo_walk_uniform (real boxing shuffle)", /ippo_walk_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → borrows ippo_walk_uniform (no run stride on sheet)", (rn.spriteSheet || "").includes("ippo_walk_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → borrows ippo_walk_uniform", (ds.spriteSheet || "").includes("ippo_walk_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump uses ippo_jump_uniform", (jp.spriteSheet || "").includes("ippo_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("fall"); await waitFrames(4); const fl = await p1(); await shot("fall"); await force(null); await waitFrames(2);
  check("fall → ippo_fall_uniform (REAL descent art, not a jump reuse)", (fl.spriteSheet || "").includes("ippo_fall_uniform"), `sheet=${fl.spriteSheet}`);

  await force("guard"); await waitFrames(4); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → ippo_guard_uniform (gloves higher than idle)", (gd.spriteSheet || "").includes("ippo_guard_uniform"), `sheet=${gd.spriteSheet}`);

  await force("crouch"); await waitFrames(3); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → borrows ippo_guard_uniform", (cr.spriteSheet || "").includes("ippo_guard_uniform"), `sheet=${cr.spriteSheet}`);

  await force("dodge"); await waitFrames(3); const dg = await p1(); await shot("dodge"); await force(null); await waitFrames(2);
  check("dodge → ippo_dodge_uniform (weaving peekaboo)", (dg.spriteSheet || "").includes("ippo_dodge_uniform"), `sheet=${dg.spriteSheet}`);

  await force("failed"); await waitFrames(3); const fd = await p1(); await shot("failed"); await force(null); await waitFrames(2);
  check("failed → ippo_failed_uniform (distinct whiffed-dodge stumble)", (fd.spriteSheet || "").includes("ippo_failed_uniform"), `sheet=${fd.spriteSheet}`);
  check("failed is NOT the walk sheet (genuinely distinct — Stage-0 item 3)", !(fd.spriteSheet || "").includes("ippo_walk_uniform"), `sheet=${fd.spriteSheet}`);

  await force("hurt"); await waitFrames(3); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → ippo_hurt_uniform", (ht.spriteSheet || "").includes("ippo_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → ippo_knockdown_uniform", (kd.spriteSheet || "").includes("ippo_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → ippo_getup_uniform", (gu.spriteSheet || "").includes("ippo_getup_uniform"), `sheet=${gu.spriteSheet}`);

  console.log("\n── fallback-box sweep (every registered action resolves a real ippo_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "guard", "crouch", "dodge", "failed", "hurt", "knockdown", "getup"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("ippo_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real ippo_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
