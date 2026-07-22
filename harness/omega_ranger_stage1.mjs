// harness/omega_ranger_stage1.mjs
// STAGE 1 evidence: Omega Ranger registration + movement/state + two-part intro.
// Captures screenshots to harness/shots/omega_stage1_*.png AND asserts the sprite
// gate / correct sheets / intro-sequence order. Run: node harness/omega_ranger_stage1.mjs
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `omega_stage1_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=omega_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // ── TWO-PART INTRO (smoke-cloud summon) ──────────────────────────────
  console.log("\n── intro: two-part summon sequence ──");
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  const order = [];
  for (const v of ["intro", "intro2"]) {
    const got = await page.waitForFunction(t => window.__harness.introState().p1Variant === t, v, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
    if (got) {
      order.push(v);
      await page.waitForFunction(t => (window.__harness.p1().spriteSheet || "").includes(t === "intro" ? "intro_2_part_1_uniform" : "intro_2_part_2_uniform"), v, { timeout: 3000, polling: 16 }).catch(() => {});
      const s = await record();
      seen.set(v, s.spriteSheet);
      await waitFrames(12);
      await shot(v);   // capture mid-hold of each intro part
    }
  }
  check("intro plays both parts in order [intro, intro2]", order.length === 2 && order[0] === "intro" && order[1] === "intro2", `order=[${order.join(",")}]`);
  check("intro part 1 sheet = intro_2_part_1_uniform", (seen.get("intro") || "").includes("intro_2_part_1_uniform"), `sheet=${seen.get("intro")}`);
  check("intro part 2 sheet = intro_2_part_2_uniform", (seen.get("intro2") || "").includes("intro_2_part_2_uniform"), `sheet=${seen.get("intro2")}`);

  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── SPRITE GATE + STATS ──────────────────────────────────────────────
  console.log("\n── sprite gate + stats ──");
  const g = await record();
  check("P1 is Omega Ranger", g.key === "omega_ranger", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = omega_ranger_idle.png", (g.spriteSheet || "").includes("omega_ranger_idle"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1180", g.maxHealth === 1180, `HP=${g.maxHealth}`);
  check("maxEnergy = 175", g.maxEnergy === 175, `EN=${g.maxEnergy}`);
  await waitFrames(4); await record(); await shot("idle");

  // ── MOVEMENT / STATE ──────────────────────────────────────────────────
  console.log("\n── movement / state ──");
  await page.keyboard.down("d"); await waitFrames(16); const rn = await record(); await shot("run"); await page.keyboard.up("d"); await waitFrames(4);
  check("run/walk uses run_uniform", ((seen.get("run") || seen.get("walk") || "")).includes("omega_ranger_run_uniform"), `action=${rn.action} sheet=${rn.spriteSheet}`);

  // dash = double-tap d
  await waitGrounded();
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2);
  await page.keyboard.down("d"); await waitFrames(3); const dsh = await record(); await shot("dash"); await page.keyboard.up("d"); await waitFrames(4);
  check("dash resolves to a sprite (no fallback box)", dsh.spriteReady && dsh.action === "dash", `action=${dsh.action} sheet=${dsh.spriteSheet}`);

  // jump
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await record(); await shot("jump");
  check("jump uses double_jump_uniform", (jp.spriteSheet || "").includes("double_jump_uniform"), `action=${jp.action} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  // hurt (light hit)
  await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(3); const h = await record(); await shot("hurt");
  check("hurt resolves to hit_1_uniform (hit reaction)", h.action === "hurt" && (h.spriteSheet || "").includes("hit_1_uniform"), `action=${h.action} sheet=${h.spriteSheet}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── FALLBACK-BOX SWEEP (Stage-1 actions only) ────────────────────────
  console.log("\n── no 128² fallback box on any Stage-1 action ──");
  let boxes = 0;
  for (const [a, s] of seen) { if (!s) { boxes++; console.log(`   ⚠ action '${a}' had null sheet`); } }
  check("every Stage-1 action rendered a real sheet (no null/128² box)", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 1: ${pass} passed, ${fail} failed`);
  console.log(`screenshots → harness/shots/omega_stage1_*.png`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
