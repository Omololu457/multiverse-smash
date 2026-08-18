// harness/onoki_stage4.mjs — STAGE 4: Onoki's flight-mode / air specials + Rock Platform Ride.
// Airborne Special branches (via liftP1 + p1SpecialDir): Down/Fwd = Fast Dive (diving spike),
// neutral/Back = Aerial Spin, Up = Rock Platform Ride (positioning rise + i-frames, 0 dmg). Each renders
// its move-name sprite; the two attacks connect on the adjacent dummy. Also proves an air special fires
// while actually FLYING (_flightActive). Data contract at the end.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `onoki_s4_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.4, padBot = 60;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `onoki_s4_${name}_crop.png`), clip });
}
async function setup(gap = 46) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(1);
  await page.evaluate(() => window.__harness.fillEnergy?.());
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const flightToggle = () => page.evaluate(() => window.__harness.onokiFlightToggle("p1"));

try {
  await page.goto(`${base}/index.html?harness=1&p1=onoki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── Fast Dive (air Down) ──
  console.log("\n── Fast Dive (air Down) ──");
  await setup(40);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(30)); await waitFrames(1);
    const res = await fireDir("D");
    check("onokiFastDive: fires airborne", res.move === "onokiFastDive", `move=${res.move}`);
    await waitFrames(2); const mv = await p1();
    check("onokiFastDive: sprite → onoki_fast_dive_uniform", (mv.spriteSheet || "").includes("onoki_fast_dive_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("fastDive");
    await waitFrames(14);
    const hp1 = (await p2()).health;
    check("onokiFastDive: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(6);

  // ── Aerial Spin (air neutral) ──
  console.log("\n── Aerial Spin (air neutral) ──");
  await setup(40);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(28)); await waitFrames(1);
    const res = await fireDir(null);
    check("onokiAerialSpin: fires airborne", res.move === "onokiAerialSpin", `move=${res.move}`);
    await waitFrames(2); const mv = await p1();
    check("onokiAerialSpin: sprite → onoki_aerial_spin_uniform", (mv.spriteSheet || "").includes("onoki_aerial_spin_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("aerialSpin");
    await waitFrames(16);
    const hp1 = (await p2()).health;
    check("onokiAerialSpin: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(6);

  // ── Rock Platform Ride (air Up) — positioning rise + i-frames, 0 dmg ──
  console.log("\n── Rock Platform Ride (air Up) ──");
  await setup(46);
  {
    await page.evaluate(() => window.__harness.liftP1(20)); await waitFrames(1);
    const before = await p1();
    const res = await fireDir("U");
    check("onokiPlatformRide: fires airborne (cast pose)", res.cast === "onokiPlatformRide", `cast=${res.cast}`);
    await waitFrames(2); const mv = await p1();
    check("onokiPlatformRide: sprite → onoki_platform_ride_uniform", (mv.spriteSheet || "").includes("onoki_platform_ride_uniform"), `sheet=${mv.spriteSheet}`);
    check("onokiPlatformRide: rises (y decreases)", mv.y < before.y - 40, `y ${before.y.toFixed(0)} → ${mv.y.toFixed(0)}`);
    check("onokiPlatformRide: grants i-frames (invulnTimer > 0)", (mv.invulnTimer || 0) > 0, `invuln=${mv.invulnTimer}`);
    await crop("platformRide");
  }
  await waitGrounded(); await waitFrames(6);

  // ── FLIGHT-MODE proof: an air special fires while actually FLYING (_flightActive) ──
  console.log("\n── flight-mode special (fires while _flightActive) ──");
  await setup(40);
  {
    const t = await flightToggle(); await waitFrames(3);
    check("flight engaged", t.flightActive === true, `flightActive=${t.flightActive}`);
    await page.evaluate(() => window.__harness.fillEnergy?.());
    const res = await fireDir(null);
    check("air special fires while flying (onokiAerialSpin)", res.move === "onokiAerialSpin", `move=${res.move}`);
    await crop("flightSpecial");
    // cleanup: disengage flight
    await flightToggle();
  }
  await waitGrounded(); await waitFrames(4);

  // ── data contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("onoki")?.animationData || {});
  const keys = ["onokiFastDive", "onokiAerialSpin", "onokiPlatformRide"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("onoki"));
  check("all 3 air specials wired to real onoki sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Onoki Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/onoki_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
