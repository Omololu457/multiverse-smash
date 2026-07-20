// harness/goku_black_audit.test.mjs
// ---------------------------------------------------------------------------
// Goku Black — INTRO fix confirmation + full VISUAL AUDIT of every wired state.
// Captures clipped (zoomed) screenshots of: intro, idle, walk, jump, fall, guard,
// hurt, knockdown, and all 4 normals (light/up/air/down_air), and prints a
// per-state diagnostics row (action / sheet / frames / frameIndex / scale / dstH).
// Screenshots → harness/shots/GBA_*.png  (GBA = Goku Black Audit).
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
// Zoomed clip around P1 (covers grounded → jump apex). ~2.3x vs full canvas.
const CLIP = { x: 180, y: 170, width: 560, height: 520 };

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };
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

let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅" : "❌"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function row(tag, s, extra = "") { console.log(`  [${tag.padEnd(10)}] action=${String(s.action).padEnd(10)} sheet=${(s.spriteSheet || "").replace("./", "").padEnd(30)} frames=${s.spriteFrames} idx=${s.frameIndex} scale=${s.spriteScale} ${extra}`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const renderInfo = () => page.evaluate(() => window.__harness.renderInfo?.("p1"));
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `GBA_${tag}.png`), clip: CLIP }); }
async function setupAdjacent(gap = 50) {
  await page.keyboard.up("d"); await page.keyboard.up("s");
  await page.evaluate(() => window.__harness.healP1());
  await waitGrounded();
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap);
  await waitFrames(2);
}
async function capture(tag) { const s = await p1(); const ri = await renderInfo(); row(tag, s, `dstH=${ri?.dstH}`); await shot(tag); return s; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // ── INTRO FIX — must resolve to IDLE (Rick-style), no transform/null-box fallback ──
  console.log("\n── INTRO (fix confirmation) ─────────────────────────");
  await page.evaluate(() => window.__harness.forceIntro("idle"));
  await waitFrames(4);
  {
    const s = await p1();
    const st = await page.evaluate(() => window.__harness.state());
    check("game is in INTRO state", st.gameState === "intro", `gameState=${st.gameState}`);
    check("intro variant resolves to 'idle' (introPool fix)", s.introVariant === "idle", `introVariant=${s.introVariant}`);
    check("intro renders the IDLE action (not 'transform'/null-box)", s.action === "idle", `action=${s.action}`);
    check("intro sheet is black_goku_idle.png (not a garbage/fallback sheet)", (s.spriteSheet || "").includes("black_goku_idle"), `sheet=${s.spriteSheet}`);
    check("has a real SpriteHandler during intro", s.hasSpriteHandler === true);
    row("intro", s);
    await shot("intro");
  }

  // ── BATTLE STATES — full visual audit ─────────────────────────────────────
  console.log("\n── VISUAL AUDIT — every wired state ─────────────────");
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await waitGrounded();

  await setupAdjacent();                                   await capture("idle");
  await page.keyboard.down("d"); await waitFrames(10);     await capture("walk");   await page.keyboard.up("d"); await waitGrounded();

  await page.keyboard.down("w");
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.grounded && p.vy < 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await capture("jump"); await page.keyboard.up("w");
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.grounded && p.vy > 6; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await capture("fall"); await waitGrounded();

  await setupAdjacent();
  await page.keyboard.down("s"); await waitFrames(4);      await capture("guard");  await page.keyboard.up("s"); await waitFrames(2);

  await page.evaluate(() => window.__harness.hurtP1(40)); await waitFrames(3);  await capture("hurt");  await page.evaluate(() => window.__harness.healP1());
  await waitGrounded();
  await page.evaluate(() => window.__harness.knockdownP1(90)); await waitFrames(3); await capture("knockdown"); await page.evaluate(() => window.__harness.healP1()); await waitFrames(2);

  // light (J) + up (I): screenshot mid-active
  for (const [tag, key] of [["light", "j"], ["up", "i"]]) {
    await setupAdjacent();
    await page.keyboard.down(key); await waitFrames(4);
    await capture(tag);
    await page.keyboard.up(key); await waitFrames(18);
  }
  // air (J airborne)
  await setupAdjacent(44); await page.evaluate(() => window.__harness.liftP1(46));
  await page.keyboard.down("j"); await waitFrames(3); await capture("air"); await page.keyboard.up("j");
  await waitGrounded(); await waitFrames(4);
  // down_air (S+J airborne) — release S before capture so the pose isn't block-masked
  await setupAdjacent(30); await page.evaluate(() => window.__harness.liftP1(52));
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
  await page.keyboard.up("s"); await waitFrames(1); await capture("downair");
  await page.keyboard.up("j"); await waitGrounded();

  console.log("\n── stability ────────────────────────────────────────");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("\n💥 threw:", e); FAIL++;
} finally {
  console.log(`\n  Goku Black AUDIT: ${PASS} passed, ${FAIL} failed  · screenshots → harness/shots/GBA_*.png\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
