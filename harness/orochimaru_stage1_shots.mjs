// harness/orochimaru_stage1_shots.mjs — Stage 1 VISUAL capture + gate: registration/stats + every
// base-form movement/state sheet + the 4 hit-reaction tiers + both knockdown variants + the 3-part
// "reborn from the white snake" intro sequence. Writes PNGs to /tmp/orochimaru_s1/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/orochimaru_s1"; fs.mkdirSync(OUT, { recursive: true });
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
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1"));
  const cb = await page.locator("#gameCanvas").boundingBox();
  if (r && cb) {
    const pad = 70;
    const x = Math.max(0, cb.x + r.x - pad), y = Math.max(0, cb.y + r.y - pad * 1.8);
    const w = Math.min(cb.width - (r.x - pad), r.w + pad * 2), h = Math.min(cb.height - (r.y - pad * 1.8), r.h + pad * 2.6);
    try { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x, y, width: Math.max(80, w), height: Math.max(80, h) } }); return; } catch (_) {}
  }
  await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") });
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=orochimaru&p2=orochimaru`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => { const l = document.getElementById("loading"); return !l || l.classList.contains("hidden"); }, null, { timeout: 20000 }).catch(() => {});

  // ── 3-PART INTRO SEQUENCE (force each part in turn; capture the rebirth beats) ──
  console.log(`\n── 3-part intro (reborn from the white snake) ──`);
  const introShots = [
    ["intro1", "intro_1_gesture", 6],
    ["intro2", "intro_2_serpent", 14],
    ["intro3", "intro_3a_snakehead", 4],
    ["intro3", "intro_3b_stand", 40],
  ];
  for (const [variant, name, waitN] of introShots) {
    await page.evaluate((v) => window.__harness.forceIntro(v), variant);
    await page.evaluate(() => { const l = document.getElementById("loading"); if (l) l.classList.add("hidden"); });
    await wf(waitN);
    await shot(name);
    const is = await p1();
    check(`intro part '${variant}' plays (sheet=${variant})`, (is.spriteSheet || "").includes(`orochimaru_${variant}_uniform`), `sheet=${is.spriteSheet}`);
  }

  // ── BATTLE: registration / stats ──
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
  const g = await p1();
  console.log(`\n── registration / stats ──`);
  check("P1 is Orochimaru", g.key === "orochimaru", `key=${g.key}`);
  check("renders on SpriteHandler (not a procedural box)", g.hasSpriteHandler, `box=${!g.hasSpriteHandler}`);
  check("idle sheet = orochimaru_idle_uniform", (g.spriteSheet || "").includes("orochimaru_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.6", Math.abs((g.spriteScale || 0) - 2.6) < 0.01, `${g.spriteScale}`);
  check("HP1180 / EN210 (versatility technician)", g.maxHealth === 1180 && g.maxEnergy === 210, `HP${g.maxHealth} EN${g.maxEnergy}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.(window.__harness.p1()) ?? null);
  check("energy label = Chakra", energyLabel === "Chakra", `label=${energyLabel}`);
  await shot("state_idle");

  // ── MOVEMENT / STATE ──
  console.log(`\n── movement / state ──`);
  await waitGrounded();
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await shot("state_run"); await page.keyboard.up("d"); await wf(4);
  check("run = orochimaru_run_uniform", (rn.spriteSheet || "").includes("orochimaru_run_uniform"), `sheet=${rn.spriteSheet}`);

  await force("dash"); await wf(3); const ds = await p1(); await shot("state_dash"); await force(null);
  check("dash renders orochimaru sheet", (ds.spriteSheet || "").includes("orochimaru_run_uniform"), `sheet=${ds.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await wf(3); await page.keyboard.up("w"); await wf(4); const jp = await p1(); await shot("state_jump");
  check("jump = orochimaru_jump_uniform", (jp.spriteSheet || "").includes("orochimaru_jump_uniform"), `sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await force("doubleJump"); await wf(3); const dj = await p1(); await shot("state_doublejump"); await force(null);
  check("doubleJump = orochimaru_jump_uniform", (dj.spriteSheet || "").includes("orochimaru_jump_uniform"), `sheet=${dj.spriteSheet}`);

  await force("guard"); await wf(3); const gd = await p1(); await shot("state_guard"); await force(null);
  check("guard = orochimaru_guard_uniform", (gd.spriteSheet || "").includes("orochimaru_guard_uniform"), `sheet=${gd.spriteSheet}`);

  await force("guardAir"); await wf(3); const ga = await p1(); await shot("state_guardair"); await force(null);
  check("guardAir = orochimaru_guardair_uniform", (ga.spriteSheet || "").includes("orochimaru_guardair_uniform"), `sheet=${ga.spriteSheet}`);

  // ── HIT REACTIONS — 4 tiers ──
  console.log(`\n── hit-reaction tiers (4) ──`);
  const hurts = [
    ["hurt", "hurt_1_light", "orochimaru_hurt_uniform"],
    ["hurtSpecial", "hurt_2_special", "orochimaru_hurt_special_uniform"],
    ["hurtHeavy1", "hurt_3_heavy1", "orochimaru_hurt_heavy1_uniform"],
    ["hurtHeavy2", "hurt_4_heavy2", "orochimaru_hurt_heavy2_uniform"],
  ];
  for (const [act, name, sheet] of hurts) {
    await force(act); await wf(3); const s = await p1(); await shot(name); await force(null);
    check(`${act} = ${sheet}`, (s.spriteSheet || "").includes(sheet), `sheet=${s.spriteSheet}`);
  }

  // ── KNOCKDOWNS — both variants ──
  console.log(`\n── knockdown variants (2) ──`);
  await force("knockdown"); await wf(3); const kd = await p1(); await shot("knockdown_normal"); await force(null);
  check("knockdown = orochimaru_knockdown_uniform", (kd.spriteSheet || "").includes("orochimaru_knockdown_uniform"), `sheet=${kd.spriteSheet}`);
  await force("knockdownAgainst"); await wf(3); const kda = await p1(); await shot("knockdown_against"); await force(null);
  check("knockdownAgainst = orochimaru_knockdown_against_uniform", (kda.spriteSheet || "").includes("orochimaru_knockdown_against_uniform"), `sheet=${kda.spriteSheet}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ OROCHIMARU Stage 1: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
