// harness/goku_black.test.mjs
// ---------------------------------------------------------------------------
// Goku Black — STAGE 1 build verification (real Chromium, real code path).
// SCOPE (this stage only): core identity + 4 basic normals. NO Ki Slash (heavy),
// NO SSJ Rose transform, NO specials — those are later stages.
//   • sprite gate: renders as sprites (not a procedural box), correct scale/pool
//   • locomotion poses render the right sheets: idle / walk-run / jump / fall
//   • reaction poses render: hurt (hit) / knockdown (get-up) / guard (block)
//   • basic normals connect + damage and play the right sheet:
//       light (J), up (I), air (J airborne), down_air (S+J airborne)
//   • HEAVY (K) is intentionally inert this stage (Ki Slash = Stage 2)
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
const sheetOf = a => (a.spriteSheet || "");

// Place the dummy just in front of Goku Black and heal it, so each move starts clean.
async function setupAdjacent(gap = 52) {
  await page.keyboard.up("d"); await page.keyboard.up("s");
  await page.evaluate(() => window.__harness.healP1());
  await waitGrounded();
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await waitGrounded();

  // ── SPRITE GATE ───────────────────────────────────────────────────────────
  section("sprite gate — Goku Black renders as sprites (not a procedural box)");
  {
    const a = await p1();
    check("P1 is Goku Black", a.key === "goku_black", `key=${a.key}`);
    check("has a real SpriteHandler (not the box renderer)", a.hasSpriteHandler === true, `hasSpriteHandler=${a.hasSpriteHandler}`);
    check("idle sprite is ready (spritesheets.js gate)", a.spriteReady === true, `sheet=${a.spriteSheet}`);
    check("idle sheet is black_goku_idle.png", sheetOf(a).includes("black_goku_idle"), `sheet=${a.spriteSheet}`);
    check("idle plays the FIRST 4 frames (two-variant split)", a.spriteFrames === 4, `frames=${a.spriteFrames}`);
    check("spriteScale applied (skins.js gate) ≈ 1.7", Math.abs((a.spriteScale || 0) - 1.7) < 0.01, `spriteScale=${a.spriteScale}`);
    check("all-rounder energy pool = 200", a.maxEnergy === 200, `maxEnergy=${a.maxEnergy}`);
    check("all-rounder health pool = 1200", a.maxHealth === 1200, `maxHealth=${a.maxHealth}`);
    check("idle action resolved", a.action === "idle", `action=${a.action}`);
    await page.screenshot({ path: path.join(OUT, "GB_idle.png") });
  }

  // ── LOCOMOTION: walk/run + jump/fall ───────────────────────────────────────
  section("locomotion — walk/run + jump/fall sheets");
  {
    // Move toward the dummy (right) → walk/run, both mapped to black_goku_run.png
    await page.keyboard.down("d");
    await waitFrames(10);
    const mv = await p1();
    check("moving → walk or run action", mv.action === "walk" || mv.action === "run", `action=${mv.action}`);
    check("locomotion sheet is black_goku_run.png", sheetOf(mv).includes("black_goku_run"), `sheet=${mv.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB_run.png") });
    await page.keyboard.up("d");
    await waitGrounded();
  }
  {
    // Jump: HOLD W (the frame-polled input buffer misses an instant press). Edge-triggered
    // jump fires once; sample the ascent, then wait for the descent.
    await page.keyboard.down("w");
    await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.grounded && p.vy < 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
    const asc = await p1();
    check("airborne ascent → jump action", asc.action === "jump", `action=${asc.action} vy=${asc.vy?.toFixed?.(1)}`);
    check("jump sheet is black_goku_jump.png", sheetOf(asc).includes("black_goku_jump") && !sheetOf(asc).includes("jump_2"), `sheet=${asc.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB_jump.png") });
    await page.keyboard.up("w");
    // wait for descent
    await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.grounded && p.vy > 6; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
    const desc = await p1();
    check("descent → fall action", desc.action === "fall", `action=${desc.action} vy=${desc.vy?.toFixed?.(1)}`);
    check("fall sheet is black_goku_jump_2.png", sheetOf(desc).includes("jump_2"), `sheet=${desc.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB_fall.png") });
    await waitGrounded();
  }

  // ── REACTION POSES: hurt / knockdown / guard ───────────────────────────────
  section("reaction poses — hurt (hit) / knockdown (get-up) / guard (block)");
  {
    await setupAdjacent();
    await page.evaluate(() => window.__harness.hurtP1(40));
    await waitFrames(3);
    const h = await p1();
    check("hitstun → hurt action", h.action === "hurt", `action=${h.action}`);
    check("hurt sheet is black_goku_hit.png", sheetOf(h).includes("black_goku_hit"), `sheet=${h.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB_hurt.png") });
    await page.evaluate(() => window.__harness.healP1());
  }
  {
    await waitGrounded();
    await page.evaluate(() => window.__harness.knockdownP1(90));
    await waitFrames(3);
    const k = await p1();
    check("knockdownState → knockdown action", k.action === "knockdown", `action=${k.action}`);
    check("knockdown sheet is black_goku_get_up.png", sheetOf(k).includes("black_goku_get_up"), `sheet=${k.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB_knockdown.png") });
    await page.evaluate(() => window.__harness.healP1());
    await waitFrames(2);
  }
  {
    await waitGrounded();
    await page.keyboard.down("s");   // hold DOWN → block
    await waitFrames(4);
    const g = await p1();
    check("holding down → isBlocking", g.blocking === true, `blocking=${g.blocking}`);
    check("blocking → guard action", g.action === "guard", `action=${g.action}`);
    check("guard sheet is black_goku_block.png", sheetOf(g).includes("black_goku_block"), `sheet=${g.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB_guard.png") });
    await page.keyboard.up("s");
    await waitFrames(2);
  }

  // ── GROUND NORMALS: light (J), up (I) — connect + damage + sheet ────────────
  section("ground normals — light (J), up (I): connect + damage + sheet");
  for (const [name, key, sheet, gap] of [
    ["light (J)", "j", "black_goku_front_attack", 48],
    ["up (I)",    "i", "black_goku_kick_attack",  44],
  ]) {
    await setupAdjacent(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4);
    const mid = await p1();
    check(`${name} plays ${sheet}.png`, sheetOf(mid).includes(sheet), `action=${mid.action} sheet=${mid.spriteSheet}`);
    await page.keyboard.up(key); await waitFrames(20);
    const hp1 = (await p2()).health;
    check(`${name} connects and deals damage`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(10);
  }

  // ── AIR NORMALS: air (J airborne), down_air (S+J airborne) ──────────────────
  section("air normals — air (J), down_air (S+J): start + sheet + damage");
  {
    await setupAdjacent(44);
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j"); await waitFrames(3);
    const air = await p1();
    check("air attack STARTS", air.attacking === true, `attacking=${air.attacking} action=${air.action}`);
    check("air plays black_goku_air_attack.png", sheetOf(air).includes("black_goku_air_attack"), `sheet=${air.spriteSheet}`);
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check("air attack deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await page.screenshot({ path: path.join(OUT, "GB_air.png") });
    await waitGrounded(); await waitFrames(6);
  }
  {
    // down_air = airborne + S + J (basickit's proven driving pattern). NOTE: holding S also
    // sets isBlocking (engine-wide: `down` = block, checked before `attacking` in the sprite
    // resolver), which MASKS the down_air pose with "guard" while S is held — so after the move
    // starts we RELEASE S and read the now-unmasked sprite (down_air action → air_attack, GAP reuse).
    await setupAdjacent(30);
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(52));          // above the dummy so the spike box reaches down
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const da = await p1();
    check("down_air attack STARTS", da.attacking === true, `attacking=${da.attacking}`);
    await page.keyboard.up("s"); await waitFrames(1);                // clear the block-mask so the real pose shows
    const vis = await p1();
    check("down_air (S released) → down_air action + air_attack sheet (base GAP reuse)", vis.action === "down_air" && sheetOf(vis).includes("black_goku_air_attack"), `action=${vis.action} sheet=${vis.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GB_downair.png") });
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check("down_air deals damage", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── HEAVY (K) is intentionally inert this stage (Ki Slash = Stage 2) ─────────
  section("heavy (K) — intentionally NOT wired this stage");
  {
    await setupAdjacent(48);
    const hp0 = (await p2()).health;
    const before = await p1();
    await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k");
    await waitFrames(10);
    const after = await p1();
    const hp1 = (await p2()).health;
    check("K does not start an attack (heavy deferred to Ki Slash)", after.attacking === false, `attacking=${after.attacking}`);
    check("K deals no damage", hp1 === hp0, `hp ${hp0} → ${hp1}`);
  }

  // ── NO JS ERRORS ────────────────────────────────────────────────────────────
  section("stability — no uncaught page errors");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("\n💥 harness threw:", e);
  FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku Black STAGE 1:  ${PASS} passed, ${FAIL} failed`);
  console.log(`  screenshots → harness/shots/GB_*.png`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
