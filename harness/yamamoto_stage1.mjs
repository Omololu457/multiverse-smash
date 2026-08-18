// harness/yamamoto_stage1.mjs
// STAGE 1 evidence: Yamamoto Genryūsai (Captain-Commander, Bleach) registration + movement/state, built
// on the STAGE-0-cleaned + BODY+PROP-composited RE-SLICED sheets (tools/reslice_yamamoto.py). Asserts the
// sprite gate (handler / idle sheet / stats / scale / reiatsu), exercises idle / walk / run / dash and the
// banked turnaround, measures on-screen body height, and sweeps for the 128×128 fallback box.
// Screenshots → harness/shots/yamamoto_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=yamamoto`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `yamamoto_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Yamamoto", g.key === "yamamoto", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = yamamoto_idle_uniform (BODY+PROP composite)", (g.spriteSheet || "").includes("yamamoto_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.85", Math.abs((g.spriteScale || 0) - 1.85) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1300 (Captain-Commander durability)", g.maxHealth === 1300, `HP=${g.maxHealth}`);
  check("maxEnergy = 200 (Reiatsu pool)", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("yamamoto"));
  check("energyType = reiatsu", def?.traits?.energyType === "reiatsu", `energyType=${def?.traits?.energyType}`);
  check("defense = 92 (ties non-giant ceiling)", def?.stats?.defense === 92, `def=${def?.stats?.defense}`);
  check("speed = 74 (2nd-slowest real fighter — unhurried counterweight)", def?.stats?.speed === 74, `spd=${def?.stats?.speed}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height reads tall/imposing (105–135px)", m.contentH >= 105 && m.contentH <= 135, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(20); const rn = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk/run uses yamamoto_walk_uniform", /yamamoto_walk_uniform/.test(rn.spriteSheet || ""), `action=${rn.spriteAction} sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → yamamoto_dash_uniform", (ds.spriteSheet || "").includes("yamamoto_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await force("turn"); await waitFrames(3); const tn = await p1(); await shot("turn"); await force(null); await waitFrames(2);
  check("turnaround (banked art) → yamamoto_turn_uniform", (tn.spriteSheet || "").includes("yamamoto_turn_uniform"), `sheet=${tn.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(5); await shot("jump");
  // Yamamoto ships no dedicated jump art (not in the confirmed design). The engine's MISSING-ACTION SAFE
  // FALLBACK (sprite.js) renders his OWN idle sheet sliced at idle's dims — one clean pose, NOT the 128²
  // "four sprites" box. Verify via measureSprite: body height stays in the idle band, not the fallback box.
  const mj = await measure().catch(() => null);
  if (mj) console.log(`   jump measureSprite: contentH=${mj.contentH}px action=${mj.action} clipped=${mj.clipped}`);
  check("jump uses safe idle fallback, not the 128² box", !!mj && mj.contentH >= 105 && mj.contentH <= 135 && !mj.clipped, `contentH=${mj?.contentH} clipped=${mj?.clipped}`);
  await waitGrounded();

  console.log("\n── fallback-box sweep (movement/state actions resolve a real sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "turn"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("yamamoto_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every Stage-1 action resolves a real yamamoto_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
