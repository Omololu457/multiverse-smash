// harness/bardock_stage1.mjs
// STAGE 1 evidence: Bardock (Dragon Ball, Extreme Butoden) registration + movement/state. Asserts the
// sprite gate (handler / idle sheet / stats / scale / ki energy), exercises idle / walk / run / dash /
// jump / fall / crouch / guard / guardHit / hurt / knockdown / getup / win / lose over the RE-SLICED
// bardock_*_uniform.png sheets (tools/reslice_bardock.py — STANDALONE single-form kit, SSJ = cosmetic
// flash only / no transform), measures on-screen body height (measureSprite), and sweeps for the
// 128×128 fallback box. ★Bardock has NO ground walk stride on the sheet → walk/run BORROW idle
// (Frieza/Piccolo/Gotenks pattern), so walk/run must resolve to the IDLE sheet, not a separate walk
// sheet. Screenshots → harness/shots/bardock_stage1_*.png. See BARDOCK_ASSET_MAP.md.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=bardock`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `bardock_stage1_${tag}.png`) }); }
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
  check("P1 is Bardock", g.key === "bardock", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = bardock_idle_uniform", (g.spriteSheet || "").includes("bardock_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.0", Math.abs((g.spriteScale || 0) - 1.0) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1200", g.maxHealth === 1200, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const el = await energyLabel().catch(() => null);
  check("energy label = Ki", (el || "").toLowerCase().includes("ki"), `label=${el}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in ADULT-WARRIOR band (105–128px)", m.contentH >= 105 && m.contentH <= 128, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── movement / state (Bardock has NO walk stride → walk/run BORROW idle) ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk → borrows bardock_idle_uniform (no walk stride on sheet)", /bardock_idle_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → borrows bardock_idle_uniform", (rn.spriteSheet || "").includes("bardock_idle_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → bardock_dash_uniform", (ds.spriteSheet || "").includes("bardock_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump uses bardock_jump_uniform", (jp.spriteSheet || "").includes("bardock_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch (sword-drawn) → bardock_crouch_uniform", (cr.spriteSheet || "").includes("bardock_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  await force("guard"); await waitFrames(4); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → bardock_guard_uniform", (gd.spriteSheet || "").includes("bardock_guard_uniform"), `sheet=${gd.spriteSheet}`);

  await force("guardHit"); await waitFrames(4); const gh = await p1(); await shot("guardhit"); await force(null); await waitFrames(2);
  check("guardHit → bardock_guardhit_uniform", (gh.spriteSheet || "").includes("bardock_guardhit_uniform"), `sheet=${gh.spriteSheet}`);

  await force("hurt"); await waitFrames(3); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → bardock_hurt_uniform", (ht.spriteSheet || "").includes("bardock_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → bardock_knockdown_uniform", (kd.spriteSheet || "").includes("bardock_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → bardock_getup_uniform", (gu.spriteSheet || "").includes("bardock_getup_uniform"), `sheet=${gu.spriteSheet}`);

  // ★ Bardock HAS real win art on the sheet (arms-crossed [276-281]) — no borrowing (unlike Goku/Gotenks).
  await force("win"); await waitFrames(5); const wn = await p1(); await shot("win"); await force(null); await waitFrames(2);
  check("win (REAL arms-crossed) → bardock_win_uniform", (wn.spriteSheet || "").includes("bardock_win_uniform"), `sheet=${wn.spriteSheet}`);

  await force("lose"); await waitFrames(3); const ls = await p1(); await shot("lose"); await force(null); await waitFrames(2);
  check("lose → reuses bardock_knockdown_uniform", (ls.spriteSheet || "").includes("bardock_knockdown_uniform"), `sheet=${ls.spriteSheet}`);

  console.log("\n── fallback-box sweep (every registered action resolves a real bardock_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "guardHit", "hurt", "knockdown", "getup", "win", "lose"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("bardock_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real bardock_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
