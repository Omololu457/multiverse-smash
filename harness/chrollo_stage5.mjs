// harness/chrollo_stage5.mjs — Stage 5 SKILL HUNTER: 3 distinct moves unlock → activation cinematic →
// live copy of the opponent (Naruto) → copied moves connect → 30s timer → manual early-end. Full sequence.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sh = () => page.evaluate(() => window.__harness.shState("p1"));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `chrollo_s5_${name}.png`) });
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=chrollo&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── 1) DISTINCT-MOVE UNLOCK (with dedup) ──
  section("unlock gate — opponent must land 3 DISTINCT moves on Chrollo");
  let s = await sh();
  check("starts locked (distinct 0, not ready)", !s.ready && s.distinct === 0, `distinct=${s.distinct} ready=${s.ready}`);
  const r1 = await page.evaluate(() => window.__harness.shLandMove("light"));
  const r1b = await page.evaluate(() => window.__harness.shLandMove("light"));   // SAME move again → must NOT count
  check("same move twice = still 1 distinct (Set dedup)", r1.distinct === 1 && r1b.distinct === 1, `after light×2 distinct=${r1b.distinct}`);
  const r2 = await page.evaluate(() => window.__harness.shLandMove("heavy"));
  check("2 distinct → still locked", r2.distinct === 2 && !r2.unlocked, `distinct=${r2.distinct} unlocked=${r2.unlocked}`);
  const r3 = await page.evaluate(() => window.__harness.shLandMove("rasengan"));   // 3rd DISTINCT (a projectile/special name)
  check("3 distinct → UNLOCKED", r3.distinct === 3 && r3.unlocked, `distinct=${r3.distinct} unlocked=${r3.unlocked}`);
  s = await sh();
  check("shState reports ready", s.ready && s.moves.length === 3, `moves=[${s.moves}]`);

  // ── 2) ACTIVATION CINEMATIC ──
  section("activation — Skill Hunter transform cinematic (book windup → robe swirl)");
  await prep(120);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  // catch the cinematic mid-swirl
  await page.waitForFunction(() => window.__harness.shState("p1").cineActive, null, { timeout: 2000, polling: 16 }).catch(() => {});
  const midCine = await sh();
  await waitFrames(40); await shot("cinematic");
  check("transform cinematic is active", midCine.cineActive, `cineActive=${midCine.cineActive}`);
  // wait for the cinematic to finish + swap to resolve
  await page.waitForFunction(() => { const x = window.__harness.shState("p1"); return x.active && !x.cineActive; }, null, { timeout: 6000, polling: 16 }).catch(() => {});

  // ── 3) COPIED FORM ──
  section("copied form — Chrollo IS Naruto now (full kit)");
  s = await sh();
  check("Skill Hunter active", s.active, `active=${s.active}`);
  check("rosterKey swapped to the opponent (naruto)", s.rosterKey === "naruto", `rosterKey=${s.rosterKey}`);
  check("30s timer running (~1800f)", s.timer > 1500 && s.timer <= 1800, `timer=${s.timer}`);
  check("stolen ULTIMATE is now Chrollo's (data swap)", /rasen|kurama|tailed|bijuu|nine/i.test(s.ultName || ""), `ultName=${s.ultName}`);
  await waitFrames(4); await shot("copied_idle");

  // ── 4) COPIED MOVES CONNECT (≥2 different) ──
  section("copied moves connect — Naruto's normal + special");
  await prep(56);
  let hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const nl = await p1(); await shot("copied_light"); await page.keyboard.up("j"); await waitFrames(16);
  check("copied NORMAL (Naruto light) connects + uses a naruto sheet", hp0 - (await p2()).health > 0 && (nl.spriteSheet || "").includes("naruto"), `−${(hp0 - (await p2()).health).toFixed(0)} sheet=${(nl.spriteSheet||"").split("/").pop()}`);
  await waitGrounded();
  await prep(70);
  hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // Naruto's SPECIAL (Rasengan family)
  await waitFrames(24); await shot("copied_special");
  check("copied SPECIAL (Naruto) connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  await waitGrounded();

  // ── 5) TIMER COUNTS DOWN ──
  section("fixed 30s timer counts down");
  const t0 = (await sh()).timer;
  await waitFrames(30);
  const t1 = (await sh()).timer;
  check("timer decremented over ~30 frames", t0 - t1 >= 24 && t0 - t1 <= 40, `Δ=${t0 - t1} (${t0}→${t1})`);

  // ── 6) MANUAL EARLY-END (re-press Ultimate) ──
  section("manual early-end — re-press Ultimate reverts to Chrollo");
  await waitGrounded();
  await page.evaluate(() => window.__harness.setP1Energy(0));   // drain energy so the stolen ult can't fire → the U press reverts cleanly
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(4);
  let sEnd = await sh();
  await shot("reverted");
  check("reverted: Skill Hunter no longer active", !sEnd.active, `active=${sEnd.active}`);
  check("rosterKey restored to chrollo", sEnd.rosterKey === "chrollo", `rosterKey=${sEnd.rosterKey}`);
  check("unlock CONSUMED (must re-earn 3 distinct)", !sEnd.unlocked && sEnd.distinct === 0, `unlocked=${sEnd.unlocked} distinct=${sEnd.distinct}`);
  check("copied form/buff state cleansed (no giant scale)", !(await p1())._canvasHeightFrac, "");

  // ── integrity ──
  section("integrity — no duplicate-render / JS errors");
  const pp1 = await p1();
  check("Chrollo renders his own sheet again after revert", (pp1.spriteSheet || "").includes("chrollo"), `sheet=${(pp1.spriteSheet||"").split("/").pop()}`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  CHROLLO Stage 5 (Skill Hunter): ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
