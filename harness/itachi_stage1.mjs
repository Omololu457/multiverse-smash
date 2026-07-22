// harness/itachi_stage1.mjs
// STAGE 1 evidence: Itachi Uchiha registration + sprite gate + core movement.
// Asserts the 3-file sprite gate flips him from box → sprite, the correct uniform
// sheets resolve, stats match, and movement (run/dash/jump) renders real frames.
// Captures screenshots to harness/shots/itachi_stage1_*.png.
// Run: node harness/itachi_stage1.mjs
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `itachi_stage1_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=itachi`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── SPRITE GATE + STATS ──────────────────────────────────────────────
  console.log("\n── sprite gate + stats ──");
  const g = await record();
  check("P1 is Itachi", g.key === "itachi", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = itachi_melle_idle_uniform.png", (g.spriteSheet || "").includes("itachi_melle_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.55", Math.abs((g.spriteScale || 0) - 1.55) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1170", g.maxHealth === 1170, `HP=${g.maxHealth}`);
  check("maxEnergy = 200", g.maxEnergy === 200, `EN=${g.maxEnergy}`);
  await waitFrames(4); await record(); await shot("idle");

  // ── MOVEMENT / STATE ──────────────────────────────────────────────────
  console.log("\n── movement / state ──");
  await page.keyboard.down("d"); await waitFrames(18); const rn = await record(); await shot("run"); await page.keyboard.up("d"); await waitFrames(4);
  check("run/walk uses a real itachi_melle_*_uniform sheet", /itachi_melle_(run|walk)_uniform/.test(rn.spriteSheet || ""), `action=${rn.action} sheet=${rn.spriteSheet}`);

  // jump
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await record(); await shot("jump");
  check("jump uses itachi_melle_jump_uniform (or fall)", /itachi_melle_jump_uniform/.test(jp.spriteSheet || ""), `action=${jp.action} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  // HURT — the hit-reaction state must resolve to the dedicated brace pose (single clean sprite),
  // NOT the bare 128²×4 fallback that sliced the idle strip into the "four sprites going up" glitch.
  await page.evaluate(() => { window.__harness.liftP1?.(40); window.__harness.hurtP1?.(50); }); await waitFrames(4);
  const h = await record(); await shot("hurt");
  check("hurt resolves to the brace pose (block_uniform)", h.action === "hurt" && /itachi_melle_block_uniform/.test(h.spriteSheet || ""), `action=${h.action} sheet=${h.spriteSheet}`);
  check("hurt renders ONE frame (no 4-frame fallback grid)", h.spriteFrames === 1, `frames=${h.spriteFrames}`);
  await waitGrounded();

  // ── FALLBACK-BOX SWEEP (Stage-1 actions only) ────────────────────────
  console.log("\n── no 128² fallback box on any Stage-1 action ──");
  let boxes = 0;
  for (const [a, s] of seen) { if (!s) { boxes++; console.log(`   ⚠ action '${a}' had null sheet`); } }
  check("every Stage-1 action rendered a real sheet (no null/128² box)", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Itachi Stage 1: ${pass} passed, ${fail} failed`);
  console.log(`screenshots → harness/shots/itachi_stage1_*.png`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
