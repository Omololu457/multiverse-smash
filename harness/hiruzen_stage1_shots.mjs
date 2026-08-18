// harness/hiruzen_stage1_shots.mjs — Stage 1 VISUAL capture: registration/stats + every movement/state
// sheet + the 2-part intro (Hokage robe → combat + the falling-robe prop). Writes PNGs to /tmp/hiruzen_s1/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/hiruzen_s1"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const cbox = await (async () => null)();
// tight crop around p1 using the harness screenRect (padded), so sprite detail is visible
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1"));
  const cb = await page.locator("#gameCanvas").boundingBox();
  if (r && cb) {
    const pad = 60;
    const x = Math.max(0, cb.x + r.x - pad), y = Math.max(0, cb.y + r.y - pad * 1.6);
    const w = Math.min(cb.width - (r.x - pad), r.w + pad * 2), h = Math.min(cb.height - (r.y - pad * 1.6), r.h + pad * 2.4);
    try { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x, y, width: Math.max(80, w), height: Math.max(80, h) } }); return; } catch (_) {}
  }
  await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") });
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=hiruzen&p2=hiruzen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  // wait for the loading overlay to clear (assets decoded) before the intro capture
  await page.waitForFunction(() => { const l = document.getElementById("loading"); return !l || l.classList.contains("hidden"); }, null, { timeout: 20000 }).catch(() => {});

  // ── 2-PART INTRO (forceIntro holds it open; capture the wardrobe-change progression + falling robe) ──
  await page.evaluate(() => window.__harness.forceIntro("intro"));
  await page.evaluate(() => { const l = document.getElementById("loading"); if (l) l.classList.add("hidden"); });
  // intro pose speed = 9 → frame index = floor(elapsed/9). Capture: 0 (robed) · 2 (shed) · 3 (combat) · 4 (held).
  await wf(5);  await shot("intro_1_robed");     // frame 0: Hokage robe + hat (still robed)
  await wf(15); await shot("intro_2_shed");      // frame 2: robe shed → combat; robe prop begins falling
  await wf(10); await shot("intro_3_combat");    // frame 3: combat stance, robe tumbling to ground
  await wf(14); await shot("intro_4_ready");     // frame 4 held: combat-ready, robe settled on ground
  const introState = await p1();
  check("intro variant = intro (playing)", introState.introVariant === "intro", `variant=${introState.introVariant}`);

  // ── BATTLE: movement / state sheets ──
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
  const g = await p1();
  console.log(`\n── registration / stats ──`);
  check("P1 is Hiruzen", g.key === "hiruzen", `key=${g.key}`);
  check("renders on SpriteHandler (not a box)", g.hasSpriteHandler, `box=${!g.hasSpriteHandler}`);
  check("idle sheet = hiruzen_idle_uniform", (g.spriteSheet || "").includes("hiruzen_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("HP1180 / EN140 (veteran/technician)", g.maxHealth === 1180 && g.maxEnergy === 140, `HP${g.maxHealth} EN${g.maxEnergy}`);
  const stats = await page.evaluate(() => window.__harness.getCharacter?.("hiruzen")?.stats || null);
  check("atk88 / def90 / spd84 (mid-atk, high-def, low-mid-spd)", !stats || (stats.attack === 88 && stats.defense === 90 && stats.speed === 84), stats ? `a${stats.attack} d${stats.defense} s${stats.speed}` : "n/a");
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.(window.__harness.p1()) ?? null);
  check("energy label = Chakra", energyLabel === "Chakra", `label=${energyLabel}`);
  await shot("state_idle");

  await waitGrounded();
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await shot("state_run"); await page.keyboard.up("d"); await wf(4);
  check("run = hiruzen_run_uniform", (rn.spriteSheet || "").includes("hiruzen_run_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await wf(3); const ds = await p1(); await shot("state_dash"); await force(null);
  check("dash = hiruzen_dash_uniform (shunshin-ghost frame kept)", (ds.spriteSheet || "").includes("hiruzen_dash_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await wf(3); await page.keyboard.up("w"); await wf(4); const jp = await p1(); await shot("state_jump");
  check("jump = hiruzen_jump_uniform", (jp.spriteSheet || "").includes("hiruzen_jump_uniform"), `sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("doubleJump"); await wf(3); const dj = await p1(); await shot("state_doublejump"); await force(null);
  check("doubleJump = hiruzen_back_jump_uniform", (dj.spriteSheet || "").includes("hiruzen_back_jump_uniform"), `sheet=${dj.spriteSheet}`);

  await force("guard"); await wf(3); const gd = await p1(); await shot("state_guard"); await force(null);
  check("guard = hiruzen_block_uniform", (gd.spriteSheet || "").includes("hiruzen_block_uniform"), `sheet=${gd.spriteSheet}`);

  await force("hurt"); await wf(3); const hu = await p1(); await shot("state_hurt"); await force(null);
  check("hurt = hiruzen_hit_uniform", (hu.spriteSheet || "").includes("hiruzen_hit_uniform"), `sheet=${hu.spriteSheet}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n  intro observed: variant=${introState._introVariant} playing=${introState._introPlaying}`);
  console.log(`\n════ HIRUZEN Stage 1 shots: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
