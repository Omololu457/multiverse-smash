// harness/naoya_stage1.mjs
// STAGE 1 evidence: Naoya Zenin (Jujutsu Kaisen) registration + movement/state.
// Asserts the sprite gate (handler / idle sheet / stats / scale / universe / energyType), exercises
// idle / walk / run / dash / crouch-entry over the RE-SLICED naoya_*_uniform.png sheets, proves Naoya
// SHIPS real hit art (hurt = row_13 recoil, knockdown = row_13 full chain — NOT a fallback), and proves
// the movement gaps (no dedicated jump/fall/win strip yet) degrade safely to the idle-pose fallback,
// NOT the 128² procedural box. Screenshots → harness/shots/naoya_stage1_*.png.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=naoya`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `naoya_stage1_${tag}.png`) }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const measure = () => page.evaluate(() => window.__harness.measureSprite("p1"));

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await p1();
  check("P1 is Naoya", g.key === "naoya", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = naoya_idle_uniform", (g.spriteSheet || "").includes("naoya_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.6", Math.abs((g.spriteScale || 0) - 1.6) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1050", g.maxHealth === 1050, `HP=${g.maxHealth}`);
  check("maxEnergy = 180", g.maxEnergy === 180, `EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("naoya"));
  check("universe = jujutsu_kaisen", def?.universe === "jujutsu_kaisen", `universe=${def?.universe}`);
  check("energyType = cursed_energy", def?.traits?.energyType === "cursed_energy", `energyType=${def?.traits?.energyType}`);
  check("mobility = high (agile tier)", def?.traits?.mobility === "high", `mobility=${def?.traits?.mobility}`);
  await waitFrames(4); await shot("idle");

  const m = await measure().catch(() => null);
  if (m) { console.log(`   measureSprite: contentH=${m.contentH}px scale=${m.scale} action=${m.action} clipped=${m.clipped}`);
    check("idle body height in human roster band (80–140px)", m.contentH >= 80 && m.contentH <= 140, `contentH=${m.contentH}`);
    check("idle not clipped by cell", !m.clipped, `clipped=${m.clipped}`); }

  console.log("\n── ground movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const wk = await p1(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk uses naoya_walk_uniform", /naoya_walk_uniform/.test(wk.spriteSheet || ""), `action=${wk.spriteAction} sheet=${wk.spriteSheet}`);

  await force("run"); await waitFrames(3); const rn = await p1(); await shot("run"); await force(null); await waitFrames(2);
  check("run → naoya_dash_uniform (shared row_02 sprint)", (rn.spriteSheet || "").includes("naoya_dash_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await waitFrames(3); const ds = await p1(); await shot("dash"); await force(null); await waitFrames(2);
  check("dash → naoya_dash_uniform", (ds.spriteSheet || "").includes("naoya_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await force("crouch"); await waitFrames(4); const cr = await p1(); await shot("crouch"); await force(null); await waitFrames(2);
  check("crouch-entry → naoya_crouch_uniform (row_03)", (cr.spriteSheet || "").includes("naoya_crouch_uniform"), `sheet=${cr.spriteSheet}`);

  console.log("\n── REAL hit art (row_13) — NOT a fallback ──");
  check("hurt has a dedicated strip", !!def?.animationData?.hurt?.sheet, `hurt=${def?.animationData?.hurt?.sheet}`);
  check("knockdown has a dedicated strip", !!def?.animationData?.knockdown?.sheet, `kd=${def?.animationData?.knockdown?.sheet}`);
  await force("hurt"); await waitFrames(3); const ht = await p1(); await shot("hurt"); await force(null); await waitFrames(2);
  check("hurt → naoya_hurt_uniform (row_13 recoil)", (ht.spriteSheet || "").includes("naoya_hurt_uniform"), `sheet=${ht.spriteSheet}`);
  await force("knockdown"); await waitFrames(3); const kd = await p1(); await shot("knockdown"); await force(null); await waitFrames(2);
  check("knockdown → naoya_knockdown_uniform (row_13 chain)", (kd.spriteSheet || "").includes("naoya_knockdown_uniform"), `sheet=${kd.spriteSheet}`);

  console.log("\n── movement gaps (no jump/fall/win art yet) degrade safely to idle-pose fallback, NOT a 128² box ──");
  const idleH = m ? m.contentH : 102;
  check("jump/fall/win have NO dedicated strip (documented S1 gap)", !def?.animationData?.jump && !def?.animationData?.fall && !def?.animationData?.win, `jump=${def?.animationData?.jump} fall=${def?.animationData?.fall} win=${def?.animationData?.win}`);
  await force("jump"); await waitFrames(3); const jm = await measure(); await shot("jump_fallback"); await force(null); await waitFrames(2);
  check("jump renders the idle-pose fallback (matches idle height, not a 128² box)", jm && Math.abs(jm.contentH - idleH) <= 24 && !jm.clipped, `jumpH=${jm?.contentH} idleH=${idleH}`);

  console.log("\n── fallback-box sweep (no movement/state action renders the 128×128 procedural box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "crouch", "hurt", "knockdown"]) {
    await force(act); await waitFrames(3); const r = await p1();
    const sh = r.spriteSheet || "";
    if (!sh.includes("naoya_")) boxHit.push(`${act}:${sh || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every movement/state action resolves a real naoya_ sheet (no box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
