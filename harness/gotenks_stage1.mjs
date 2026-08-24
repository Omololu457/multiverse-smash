// harness/gotenks_stage1.mjs
// STAGE 1 evidence: Gotenks (Super Saiyan) (Dragon Ball, Extreme Butoden) registration + movement/state. Asserts
// the sprite gate (handler / idle sheet / stats / scale / ki energy), exercises idle / walk / run / dash / jump /
// fall / crouch / guard / guardHit / hurt / knockdown / getup / taunt / dazed over the RE-SLICED
// gotenks_*_uniform.png sheets (tools/reslice_gotenks.py — STANDALONE SS kit, no base form / no transform),
// measures on-screen body height (measureSprite), and sweeps for the 128×128 fallback box. ★Gotenks has NO ground
// walk stride on the sheet → walk/run BORROW idle (Frieza/Piccolo pattern), so walk/run must resolve to the IDLE
// sheet, not a separate walk sheet. Screenshots → harness/shots/gotenks_stage1_*.png. See GOTENKS_ASSET_MAP.md.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=gotenks`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gotenks_stage1_${tag}.png`) }); }
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
  check("P1 is Gotenks", g.key === "gotenks", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = gotenks_idle_uniform", (g.spriteSheet || "").includes("gotenks_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.20", Math.abs((g.spriteScale || 0) - 1.20) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1200", g.maxHealth === 1200, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const el = await energyLabel().catch(() => null);
  check("energy label = Ki", (el || "").toLowerCase().includes("ki"), `label=${el}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in SHORT-FIGHTER band (95–120px, ~just under the ~111px adults)", m.contentH >= 95 && m.contentH <= 120, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── movement / state (Gotenks has NO walk stride → walk/run BORROW idle) ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk → borrows gotenks_idle_uniform (no walk stride on sheet)", /gotenks_idle_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(4); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → borrows gotenks_idle_uniform", (rn.spriteSheet || "").includes("gotenks_idle_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → gotenks_dash_uniform", (ds.spriteSheet || "").includes("gotenks_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump uses gotenks_jump_uniform", (jp.spriteSheet || "").includes("gotenks_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch → gotenks_crouch_uniform", (cr.spriteSheet || "").includes("gotenks_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  await force("guard"); await waitFrames(4); const gd = await p1(); await shot("guard"); await force(null); await waitFrames(2);
  check("guard → gotenks_guard_uniform", (gd.spriteSheet || "").includes("gotenks_guard_uniform"), `sheet=${gd.spriteSheet}`);

  await force("guardHit"); await waitFrames(4); const gh = await p1(); await shot("guardhit"); await force(null); await waitFrames(2);
  check("guardHit → gotenks_guardhit_uniform", (gh.spriteSheet || "").includes("gotenks_guardhit_uniform"), `sheet=${gh.spriteSheet}`);

  await force("taunt"); await waitFrames(5); const tn = await p1(); await shot("taunt"); await force(null); await waitFrames(2);
  check("taunt → gotenks_taunt_uniform", (tn.spriteSheet || "").includes("gotenks_taunt_uniform"), `sheet=${tn.spriteSheet}`);

  await force("hurt"); await waitFrames(3); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → gotenks_hurt_uniform", (ht.spriteSheet || "").includes("gotenks_hurt_uniform"), `sheet=${ht.spriteSheet}`);

  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → gotenks_knockdown_uniform", (kd.spriteSheet || "").includes("gotenks_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  await force("getup"); await waitFrames(3); const gu = await p1(); await shot("getup"); await force(null); await waitFrames(2);
  check("getup → gotenks_getup_uniform", (gu.spriteSheet || "").includes("gotenks_getup_uniform"), `sheet=${gu.spriteSheet}`);

  // ★ Torn-clothing DAZED state is registered UNWIRED (trigger deferred, GOTENKS_ASSET_MAP.md item 2) — but it
  //   must still resolve real art if force-played (proves the clip exists for Stage-6 wiring).
  await force("dazed"); await waitFrames(4); const dz = await p1(); await shot("dazed"); await force(null); await waitFrames(2);
  check("dazed (torn-clothing) → gotenks_dazed_uniform (art present, trigger deferred)", (dz.spriteSheet || "").includes("gotenks_dazed_uniform"), `sheet=${dz.spriteSheet}`);

  console.log("\n── fallback-box sweep (every registered action resolves a real gotenks_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "guardHit", "hurt", "knockdown", "getup", "taunt", "dazed"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("gotenks_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real gotenks_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
