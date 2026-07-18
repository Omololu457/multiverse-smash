// harness/basickit.test.mjs
// ---------------------------------------------------------------------------
// Confirm each Sasuke BASIC-KIT move connects and deals damage:
//   light (J), heavy (K), up-attack (I), air (J in air), down_air (S+J in air),
//   and the NEW shuriken poke (K in air → projectile). Places the dummy adjacent
//   and checks p2 health drops for each.
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

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv" };
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
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

async function waitFrames(n) {
  const s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}
async function waitGrounded() {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
}
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());

// Place the dummy just in front of Sasuke and heal it, so each move starts from a clean adjacent state.
async function setupAdjacent(gap = 58) {
  await waitGrounded();
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND BASICS: light (J), heavy (K), up (I) ─────────────────────────
  section("GROUND basics — connect + damage");
  for (const [name, key] of [["light (J)", "j"], ["heavy (K)", "k"], ["up-attack (I)", "i"]]) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); await page.keyboard.up(key);
    if (key === "k") { await waitFrames(2); await page.screenshot({ path: path.join(OUT, "BK_heavy_sword.png") }); }
    await waitFrames(18);
    const hp1 = (await p2()).health;
    check(`${name} connects and deals damage`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(20);
  }

  // ── AIR basic: neutral air (J while airborne) ───────────────────────────
  // Real air-normals connect on the DESCENT / in juggles, not a rising hop from adjacent — so
  // put P1 at a realistic low airborne altitude (liftP1) and attack, testing the hitbox+damage.
  section("AIR basic — neutral air (J in air)");
  await setupAdjacent(44);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(38));
    await page.keyboard.down("j"); await waitFrames(3); await page.keyboard.up("j");
    const mv = await p1();
    check("air attack STARTS (new `air` slot wired)", mv.attacking, `attacking=${mv.attacking}`);
    await page.screenshot({ path: path.join(OUT, "BK_air.png") });
    await waitFrames(14);
    const hp1 = (await p2()).health;
    check("air attack deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── AIR basic: down-air spike (S+J while airborne) ──────────────────────
  section("AIR basic — down-air (S+J in air)");
  await setupAdjacent(28);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(52));   // above the dummy so the spike box reaches down
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4);
    await page.keyboard.up("j"); await page.keyboard.up("s");
    const mv = await p1();
    check("down-air STARTS", mv.attacking, `attacking=${mv.attacking}`);
    await waitFrames(14);
    const hp1 = (await p2()).health;
    check("down-air deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── SHURIKEN poke (DOWN + special → grounded ranged poke) ───────────────
  section("SHURIKEN poke — down + special (S then L)");
  await setupAdjacent(150);   // range so the thrown shuriken travels to the dummy
  await waitFrames(10);       // settle any leftover attackCooldown
  {
    const hp0 = (await p2()).health;
    // down feeds a "D" into directionHistory; special then reads it → shuriken (not dash-strike).
    await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    const proj = await page.evaluate(() => window.__harness.projectiles());
    check("down+special spawns a shuriken projectile (not dash-strike)", proj.some(p => p.name === "sasukeShuriken"), `projectiles=${JSON.stringify(proj.map(p => p.name))}`);
    const shuriken = proj.find(p => p.name === "sasukeShuriken");
    check("shuriken aims toward the opponent (vx>0)", !!shuriken && shuriken.vx > 0, shuriken ? `vx=${shuriken.vx.toFixed(1)} vy=${shuriken.vy.toFixed(1)}` : "");
    await page.screenshot({ path: path.join(OUT, "BK_shuriken.png") });
    await waitFrames(30);   // let it fly + hit
    const hp1 = (await p2()).health;
    check("shuriken deals damage on hit", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }

  // ── DASH-STRIKE sprite integrity (neutral L / special, close range) ─────
  // Regression: L = special (P1_CONTROLS), and the dash-strike used to flash a 128² NULL-sheet
  // fallback box during its recovery (dashStrike not in MOVE_TO_ACTION, _spriteCastTimer expired).
  section("dash-strike sprite integrity — neutral L, close range (no garbage flash)");
  for (let rep = 0; rep < 3; rep++) {
    await setupAdjacent(55);
    const hp0 = (await p2()).health;
    await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l");
    const sheets = new Set(); let nulls = 0;
    for (let i = 0; i < 24; i++) {
      const p = await p1();
      if (p.attacking) { sheets.add((p.spriteSheet || "NULL").split("/").pop()); if (!p.spriteSheet) nulls++; }
      await waitFrames(1);
    }
    const hp1 = (await p2()).health;
    check(`rep${rep}: dash-strike plays ONLY sasuke_dash.png (no NULL/box flash)`, nulls === 0 && sheets.has("sasuke_dash.png") && sheets.size === 1, `sheets=[${[...sheets].join(",")}] nulls=${nulls}`);
    check(`rep${rep}: dash-strike still connects for damage`, hp1 < hp0, `−${(hp0 - hp1).toFixed(0)}`);
    await waitFrames(18);
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "BK_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
