// harness/jason_stage1.mjs
// STAGE 1 evidence: Jason Voorhees registration + movement/state + fallback-state sweep.
// Asserts the 3-file sprite gate (sprite handler / idle sheet / stats / scale), exercises
// idle/walk/jump/hurt/knockdown over the RE-SLICED jason_*_uniform.png sheets, and proves the
// fallback states (guard/dash/grab/win/death) all resolve to a REAL sheet (never null/box).
// Screenshots land in harness/shots/jason_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=jason`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `jason_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Jason", g.key === "jason", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = jason_idle_uniform", (g.spriteSheet || "").includes("jason_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.15", Math.abs((g.spriteScale || 0) - 1.15) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1250", g.maxHealth === 1250, `HP=${g.maxHealth}`);
  check("maxEnergy = 80", g.maxEnergy === 80, `EN=${g.maxEnergy}`);
  await waitFrames(4); await shot("idle");

  console.log("\n── movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const rn = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk uses jason_walk_uniform", /jason_walk_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await p1(); await shot("jump");
  check("jump uses jason_jump_uniform", (jp.spriteSheet || "").includes("jason_jump_uniform"), `action=${jp.spriteAction} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  // hurt (frames 0-3 of the hit sheet, sourceX 0). Read the sheet AFTER a frame tick (the
  // forceAction return is the pre-update actionDef — stale by one step).
  await force("hurt"); await waitFrames(3); const h = await p1(); await shot("hurt");
  check("hurt → jason_hit_uniform (sourceX 0)", (h.spriteSheet || "").includes("jason_hit_uniform") && h.spriteSourceX === 0, `sheet=${h.spriteSheet} sx=${h.spriteSourceX}`);

  // knockdown = death/KO grounded pose (frames 4-5 of the SAME hit sheet, sourceX 492).
  await force("knockdown"); await waitFrames(3); const k = await p1(); await shot("knockdown");
  check("knockdown/KO → jason_hit_uniform frames 4-5 (sourceX 492)", (k.spriteSheet || "").includes("jason_hit_uniform") && k.spriteSourceX === 492, `sheet=${k.spriteSheet} sx=${k.spriteSourceX}`);
  await force(null); await waitFrames(2);

  // ── FALLBACK-STATE SWEEP. Drive the REAL engine code paths (not force-set nonexistent action
  // names — the engine never does that; it GATES on the strip existing and falls back to idle,
  // sprite.js:502). Every state must render a REAL sheet, never null (= the broken box). ──
  console.log("\n── fallback-state sweep (real code paths; must render a real sheet, never null) ──");
  const resolved = {};

  // BLOCK: Jason has NO guard art by design → the engine's block branch resolves to idle (a real sheet).
  await page.keyboard.down(";"); await waitFrames(6); const bl = await p1(); await shot("fallback_block"); await page.keyboard.up(";"); await waitFrames(3);
  resolved.block = bl.spriteSheet;
  check("block (no guard art) → idle fallback, real sheet not null", (bl.spriteSheet || "").includes("jason_") && bl.spriteSheet != null, `action=${bl.spriteAction} sheet=${bl.spriteSheet}`);

  // DASH: a defined action (walk sheet fallback, no dash-blur art).
  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("fallback_dash"); await force(null); await waitFrames(2);
  resolved.dash = ds.spriteSheet;
  check("dash → jason_walk_uniform (fallback, real sheet)", (ds.spriteSheet || "").includes("jason_walk_uniform"), `sheet=${ds.spriteSheet}`);

  // GRAB: press the real grab key; Jason's grab reuses the light-jab windup pose.
  await page.keyboard.press("o"); await waitFrames(3); const gr = await force("grab"); await waitFrames(2); const grs = await p1(); await shot("fallback_grab"); await force(null); await waitFrames(2);
  resolved.grab = grs.spriteSheet;
  check("grab → jason_light_uniform (real pose, not idle/box)", (grs.spriteSheet || "").includes("jason_light_uniform"), `sheet=${grs.spriteSheet}`);

  // WIN: no win art → the winner holds idle (a real sheet), never a box. Drive the real victory path.
  await page.evaluate(() => window.__harness.forceMatchWin("p1")); await waitFrames(8); const wn = await p1(); await shot("fallback_win");
  resolved.win = wn.spriteSheet;
  check("win (no win art) → real sheet, not null/box", typeof wn.spriteSheet === "string" && wn.spriteSheet.includes("jason_"), `action=${wn.spriteAction} sheet=${wn.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\nfallback resolve map: ${JSON.stringify(resolved, null, 0)}`);
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
