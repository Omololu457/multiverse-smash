// harness/jiraiya_shots.mjs — REAL select + match verification for Jiraiya.
// Boots a real match, drives every claimed move via REAL keystrokes (j/k/i/l/u + a/d/s),
// asserts state from __harness, and writes PNGs to /tmp/jiraiya_shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/jiraiya_shots"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function full(name) { await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") }); }
async function tight(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1"));
  const cb = await page.locator("#gameCanvas").boundingBox();
  if (r && cb) { const pad = 70; const x = Math.max(0, cb.x + r.x - pad), y = Math.max(0, cb.y + r.y - pad * 1.6);
    const w = Math.min(cb.width - (r.x - pad), r.w + pad * 2), h = Math.min(cb.height - (r.y - pad * 1.6), r.h + pad * 2.4);
    try { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x, y, width: Math.max(80, w), height: Math.max(80, h) } }); return; } catch (_) {} }
  await full(name);
}
const tap = async (k, holdFrames = 2) => { await page.keyboard.down(k); await wf(holdFrames); await page.keyboard.up(k); };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=jiraiya&p2=jiraiya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => { const l = document.getElementById("loading"); return !l || l.classList.contains("hidden"); }, null, { timeout: 20000 }).catch(() => {});

  // ── SELECT SCREEN (real select state) ──
  await page.evaluate(() => window.__harness.ui.goto("SELECT_CHARACTER"));
  await wf(4);
  await full("01_select_grid");
  const locked = await page.evaluate(() => { try { return window.__harness.isLocked ? window.__harness.isLocked("jiraiya") : null; } catch (_) { return null; } });
  check("jiraiya is NOT locked", locked === false || locked === null, `locked=${locked}`);

  // ── BATTLE ──
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
  const g = await p1();
  console.log(`\n── registration / stats ──`);
  check("P1 is Jiraiya (exists + selectable via real p1 select)", g.key === "jiraiya", `key=${g.key}`);
  check("idle sheet = jiraiya_idle_uniform", (g.spriteSheet || "").includes("jiraiya_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("HP1210 / EN180 (Sannin band)", g.maxHealth === 1210 && g.maxEnergy === 180, `HP${g.maxHealth} EN${g.maxEnergy}`);
  const stats = await page.evaluate(() => window.__harness.getCharacter?.("jiraiya")?.stats || null);
  check("atk93 / def89 / spd85", !stats || (stats.attack === 93 && stats.defense === 89 && stats.speed === 85), stats ? `a${stats.attack} d${stats.defense} s${stats.speed}` : "n/a");
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.(window.__harness.p1()) ?? null);
  check("energy label = Chakra", energyLabel === "Chakra", `label=${energyLabel}`);
  check("spriteScale = 1.7", Math.abs((g.spriteScale || 0) - 1.7) < 0.001, `scale=${g.spriteScale}`);
  check("rendered height in roster band (~100-150px)", (g.drawH || 0) > 95 && (g.drawH || 0) < 155, `drawH=${g.drawH}`);
  await waitGrounded(); await tight("02_idle");

  // ── WALK (real: hold d) ──
  await page.keyboard.down("d"); await wf(14); const wlk = await p1(); await tight("03_walk"); await page.keyboard.up("d"); await wf(6);
  check("walk sheet = jiraiya_walk_uniform", (wlk.spriteSheet || "").includes("jiraiya_walk_uniform"), `sheet=${wlk.spriteSheet}`);

  // ── LIGHT string mid-swing (real: j) ──
  await waitGrounded(); await page.keyboard.down("j"); await wf(3); const lt = await p1(); await tight("04_light"); await page.keyboard.up("j"); await wf(10);
  check("light fired (attacking, light sheet)", !!lt.attacking && (lt.spriteSheet || "").includes("jiraiya_light_uniform"), `atk=${lt.attacking} sheet=${lt.spriteSheet}`);

  // ── UP launcher (real: i) ── refill clears any residual attack cooldown so the normal fires.
  await waitGrounded(); await page.evaluate(() => window.__harness.jiraiya.refill());
  await page.keyboard.down("i");
  await page.waitForFunction(() => (window.__harness.p1().spriteSheet || "").includes("jiraiya_up_uniform"), null, { timeout: 3000, polling: 16 }).catch(() => {});
  const up = await p1(); await tight("05_up_launcher"); await page.keyboard.up("i"); await wf(12);
  check("up launcher fired (up sheet)", (up.spriteSheet || "").includes("jiraiya_up_uniform"), `sheet=${up.spriteSheet}`);

  // ── RASENGAN (real: neutral l) → projectile mid-flight ──
  await waitGrounded(); await page.evaluate(() => window.__harness.jiraiya.refill());
  await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l"); await wf(12);
  const rp = await projs(); const rasengan = rp.find(p => p.name === "jiraiyaRasengan");
  await full("06_rasengan");
  check("Rasengan projectile in flight", !!rasengan, `projs=${rp.map(p => p.name).join(",") || "none"}`);

  // ── HERMIT (Sage) MODE transformation (real: neutral u) — capture mid-cinematic ──
  await waitGrounded(); await page.evaluate(() => window.__harness.jiraiya.refill());
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
  await wf(22); await full("07_hermit_transform");   // mid-cinematic (FLASH/BUILD of ~60f form cine)
  await page.waitForFunction(() => window.__harness.jiraiya.state().hermit === true, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await wf(18);   // let the transform cast-pose clear + combat settle before reading the sage idle
  const hs = await page.evaluate(() => window.__harness.jiraiya.state());
  check("Hermit/Sage Mode active after real Ultimate", hs && hs.hermit === true, `hermit=${hs?.hermit} form=${hs?.form}`);
  check("Hermit buffs applied (dmg1.18/spd1.10/def1.12)", hs && Math.abs(hs.dmgMul - 1.18) < 0.001 && Math.abs(hs.spdMul - 1.10) < 0.001 && Math.abs(hs.defMul - 1.12) < 0.001, `dmg${hs?.dmgMul} spd${hs?.spdMul} def${hs?.defMul}`);
  check("Hermit timer ~20s (1200f)", hs && hs.hermitTimer > 1000 && hs.hermitTimer <= 1200, `timer=${hs?.hermitTimer}`);
  await waitGrounded(); const hidle = await p1(); await tight("08_hermit_idle");
  check("Hermit idle sheet = jiraiya_hermit_idle_uniform", (hidle.spriteSheet || "").includes("jiraiya_hermit_idle_uniform"), `sheet=${hidle.spriteSheet}`);

  // ── HERMIT special (real: neutral l = Senpo Goemon) ──
  await waitGrounded(); await page.evaluate(() => window.__harness.jiraiya.refill());
  await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l"); await wf(11);
  const gp = await projs(); const goemon = gp.find(p => p.name === "jiraiyaGoemon");
  await full("09_hermit_special_goemon");
  check("Hermit special Senpo Goemon projectile fired", !!goemon, `projs=${gp.map(p => p.name).join(",") || "none"}`);

  // ── GAMABUNTA summon (real: Down + Ultimate) ──
  await waitGrounded(); await page.evaluate(() => window.__harness.jiraiya.refill());
  await page.keyboard.down("s"); await wf(1); await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); await page.keyboard.up("s");
  await wf(24);
  const sp = await projs(); const gama = sp.find(p => p.name === "jiraiyaGamabunta" || p.name === "jiraiyaGamaSmoke");
  await full("10_gamabunta");
  check("Gamabunta summon fired (toad/smoke projectile)", !!gama, `projs=${sp.map(p => p.name).join(",") || "none"}`);

  check("no JS errors during run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.log("  ❌ HARNESS THREW:", String(e).split("\n")[0]); FAIL++;
}
console.log(`\n════════════════════════════════════════`);
console.log(`  JIRAIYA SHOTS: ${PASS} passed, ${FAIL} failed  → ${OUT}`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
