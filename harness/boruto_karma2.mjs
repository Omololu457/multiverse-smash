// harness/boruto_karma2.mjs — KARMA STAGE 2: Chakra/Energy Absorption ability (Karma-only reactive absorb).
// Verifies the FOUR contract points from the design:
//   (1) UNAVAILABLE outside Karma — the attempt no-ops in base form (no HP cost, no window).
//   (2) COST EVERY TIME — the attempt pays a fixed HP chunk up front, win or lose.
//   (3) SUCCESS vs projectile/energy — an incoming PROJECTILE in the window is fully NEGATED (no projectile
//       damage) + refunds energy proportional to the absorbed attack.
//   (4) FAILURE vs melee — a MELEE hit in the window is NOT absorbed (Boruto takes it); the HP cost stands.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projCount = () => page.evaluate(() => window.__harness.projectiles().length);
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const setEnergy = v => page.evaluate(e => window.__harness.setEnergy(e), v);
const karma = op => page.evaluate(o => window.__harness.p1Karma(o), op);
const absorb = () => page.evaluate(() => window.__harness.p1Absorb());
const healP1full = () => page.evaluate(() => { const p = window.__harness.p1(); return p; });
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.45)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=boruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await page.evaluate(() => { window.__harness.setInfiniteHP?.(false); });   // ensure HP damage registers (no infinite-HP pin)

  console.log("\n── (1) UNAVAILABLE outside Karma ──");
  await setEnergy(180); await waitFrames(1);
  let r = await absorb();
  check("absorb attempt no-ops in base form (not fired)", r.fired === false, `fired=${r.fired}`);
  check("no HP paid in base form", r.hpCost === 0, `hpCost=${r.hpCost}`);
  check("no window opens in base form", (await p1()).absorbWindow === 0, "");

  console.log("\n── (2) COST EVERY TIME (attempt pays HP up front) ──");
  await setEnergy(180); await karma("enter"); await waitFrames(2);
  check("in Karma", (await p1()).karmaActive === true, "");
  r = await absorb();
  check("absorb fires in Karma", r.fired === true, `fired=${r.fired}`);
  check("attempt pays a fixed HP chunk (60)", r.hpCost === 60, `hpCost=${r.hpCost}`);
  check("absorb window opened", r.window > 0, `window=${r.window}`);
  await waitFrames(20);   // let the window expire unused (whiff) — HP already spent, nothing refunded
  const whiff = await p1();
  check("WHIFF: window expired, no energy refund (HP spent for nothing)", whiff.absorbWindow === 0 && whiff.absorbRefund === 0, `window=${whiff.absorbWindow} refund=${whiff.absorbRefund}`);

  console.log("\n── (3) SUCCESS vs a PROJECTILE (negate + energy refund, no projectile damage) ──");
  await waitGrounded(); await setEnergy(180); await karma("enter"); await waitFrames(2);
  { const before = await p1(); const projBefore = await projCount();
    const a = await absorb();                         // opens window, pays 60 HP
    const hpAfterAttempt = (await p1()).health;
    await page.evaluate(() => window.__harness.enemyProjAtP1(60));   // enemy energy projectile overlapping P1
    let negated = false; for (let i = 0; i < 12; i++) { await waitFrames(1); if ((await projCount()) <= projBefore) { negated = true; break } }
    const after = await p1();
    check("incoming projectile NEGATED (consumed)", negated, `projCount ${projBefore} → ${await projCount()}`);
    check("no projectile damage taken (only the attempt HP cost)", Math.abs(after.health - hpAfterAttempt) < 1, `hp ${hpAfterAttempt.toFixed(0)} → ${after.health.toFixed(0)}`);
    check("energy REFUNDED proportional to the absorbed attack (~36 = 60×0.6)", after.absorbRefund >= 20 && after.absorbRefund <= 60, `refund=${after.absorbRefund}`);
  }

  console.log("\n── (4) FAILURE vs a MELEE attack (NOT absorbed — Boruto takes it) ──");
  await waitGrounded(); await setEnergy(180); await karma("enter"); await waitFrames(2);
  await setupAdjacent(56);
  await setEnergy(180); await karma("enter"); await waitFrames(2);   // re-ensure Karma after repositioning
  { await absorb();                                   // opens window, pays 60 HP
    const hpAfterAttempt = (await p1()).health;
    await page.evaluate(() => window.__harness.p2Attack());   // p2 MELEE (light) into the window
    let tookMelee = false; for (let i = 0; i < 20; i++) { await waitFrames(1); if ((await p1()).health < hpAfterAttempt - 1) { tookMelee = true; break } }
    check("MELEE hit is NOT absorbed — Boruto takes the damage", tookMelee, `hp after attempt=${hpAfterAttempt.toFixed(0)} → ${(await p1()).health.toFixed(0)}`);
  }

  console.log("\n── no JS errors ──");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Boruto Karma Stage 2: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
