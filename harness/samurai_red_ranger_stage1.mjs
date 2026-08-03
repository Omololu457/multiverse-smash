// harness/samurai_red_ranger_stage1.mjs
// STAGE 1 evidence: Samurai Red Ranger registration + base-tier movement/state.
// Captures screenshots to harness/shots/samurai_stage1_*.png AND asserts the sprite
// gate / correct sheets / stats / spriteScale. Run: node harness/samurai_red_ranger_stage1.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const seen = new Map();  // action -> sheet

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `samurai_stage1_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=samurai_red_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── SPRITE GATE + STATS ──────────────────────────────────────────────
  console.log("\n── sprite gate + stats ──");
  const g = await record();
  check("P1 is Samurai Red Ranger", g.key === "samurai_red_ranger", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = samurai_ranger_idle_uniform.png", (g.spriteSheet || "").includes("samurai_ranger_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.85", Math.abs((g.spriteScale || 0) - 1.85) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1220", g.maxHealth === 1220, `HP=${g.maxHealth}`);
  check("maxEnergy = 160", g.maxEnergy === 160, `EN=${g.maxEnergy}`);
  await waitFrames(4); await record(); await shot("idle");

  // ── MOVEMENT / STATE ──────────────────────────────────────────────────
  console.log("\n── movement / state ──");
  await page.keyboard.down("d"); await waitFrames(16); const rn = await record(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk/run uses samurai_run_uniform", ((seen.get("run") || seen.get("walk") || "")).includes("samurai_run_uniform"), `action=${rn.action} sheet=${rn.spriteSheet}`);

  // jump
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await record(); await shot("jump");
  check("jump uses samurai_ranger_jump_uniform", (jp.spriteSheet || "").includes("samurai_ranger_jump_uniform"), `action=${jp.action} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  // guard (hold down)
  await page.keyboard.down("s"); await waitFrames(6); const gd = await record(); await shot("guard"); await page.keyboard.up("s"); await waitFrames(4);
  check("guard uses samurai_ranger_guard_uniform", (gd.spriteSheet || "").includes("samurai_ranger_guard_uniform"), `action=${gd.action} isBlocking=${gd.isBlocking} sheet=${gd.spriteSheet}`);

  // hurt (light hit)
  await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(3); const h = await record(); await shot("hurt");
  check("hurt resolves to samurai_ranger_hit_uniform", h.action === "hurt" && (h.spriteSheet || "").includes("samurai_ranger_hit_uniform"), `action=${h.action} sheet=${h.spriteSheet}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── FALLBACK-BOX SWEEP (Stage-1 actions only) ────────────────────────
  console.log("\n── no null/fallback box on any Stage-1 action ──");
  let boxes = 0;
  for (const [a, s] of seen) { if (!s) { boxes++; console.log(`   ⚠ action '${a}' had null sheet`); } }
  check("every Stage-1 action rendered a real sheet (no null/128² box)", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 1: ${pass} passed, ${fail} failed`);
  console.log(`screenshots → harness/shots/samurai_stage1_*.png`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
