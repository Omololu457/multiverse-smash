// harness/killua_stage3.mjs — Stage 3: the Yo-Yo special (throw → travel → hit → retract boomerang).
// Verifies: throw cast pose, projectile spawns + travels outward with its own collision, connects for
// damage, then RETRACTS (homes back to Killua) and despawns on pickup; plus a max-range retract on whiff.
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
const yoyos = () => page.evaluate(() => window.__harness.projectiles().filter(p => (p.name || "").includes("yoyo")));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `killua_s3_${name}.png`) });
async function prep(gap, invuln = 0) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  await page.evaluate(v => window.__harness.setP2Invuln?.(v), invuln);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── throw → travel → hit → retract (dummy in range) ──
  section("Yo-Yo throw → travel outward → connect");
  await prep(200);
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  check("special spent Nen energy", (await p1()).energy < en0, `${en0}→${(await p1()).energy}`);
  // throw cast pose while the yo-yo is being released
  await waitFrames(2);
  check("throw plays the yoyoThrow cast pose", (await p1()).action === "yoyoThrow", `action=${(await p1()).action}`);
  // yo-yo spawns (after the 6f release delay) and uses its spin sheet
  await page.waitForFunction(() => window.__harness.projectiles().some(p => (p.name || "").includes("yoyo")), null, { timeout: 3000, polling: 16 }).catch(() => {});
  const born = await yoyos();
  check("yo-yo projectile spawned", born.length === 1, `count=${born.length}`);
  check("yo-yo uses the spin sheet", (born[0]?.sheet || "").includes("killua_yoyo_fx"), `sheet=${born[0]?.sheet}`);
  check("yo-yo is a boomerang, flying OUT (not yet returning)", born[0]?.boomerang === true && born[0]?.returning === false, `boomerang=${born[0]?.boomerang} returning=${born[0]?.returning}`);
  const px = await p1();
  check("yo-yo travels outward (toward the opponent)", Math.sign(born[0].vx) === px.facing, `vx=${born[0]?.vx?.toFixed(1)} facing=${px.facing}`);
  const x0 = born[0].x;
  await waitFrames(4);
  await shot("travel");
  const mid = await yoyos();
  check("yo-yo x advanced outward over frames", mid.length && Math.abs(mid[0].x - px.x) > Math.abs(x0 - px.x), `x0=${x0.toFixed(0)} → x1=${mid[0]?.x?.toFixed(0)}`);
  // connect
  await page.waitForFunction(h => window.__harness.p2().health < h, hp0, { timeout: 3000, polling: 16 }).catch(() => {});
  const dmg = hp0 - (await p2()).health;
  check("yo-yo connects for special-tier damage", dmg > 25, `−${dmg.toFixed(0)}`);

  // ── retract on hit ──
  section("Yo-Yo retracts on hit → homes back → despawns on pickup");
  await page.waitForFunction(() => { const y = window.__harness.projectiles().filter(p => (p.name || "").includes("yoyo")); return y.length && y[0].returning; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const ret = await yoyos();
  check("yo-yo entered the returning (retract) phase after hitting", ret.length && ret[0].returning === true, `returning=${ret[0]?.returning}`);
  const pk = await p1();
  check("retract homes back toward Killua (velocity reversed)", ret.length && Math.sign(ret[0].vx) === -pk.facing, `vx=${ret[0]?.vx?.toFixed(1)} facing=${pk.facing}`);
  await shot("retract");
  // it should catch and despawn (not linger)
  await page.waitForFunction(() => window.__harness.projectiles().every(p => !(p.name || "").includes("yoyo")), null, { timeout: 4000, polling: 16 }).catch(() => {});
  check("yo-yo despawns after returning to Killua", (await yoyos()).length === 0, `count=${(await yoyos()).length}`);

  // ── max-range retract on a whiff (dummy invulnerable → yo-yo passes through) ──
  section("Yo-Yo retracts at MAX RANGE on a whiff (no double-hit)");
  await prep(500, 600);   // far + invulnerable → yo-yo can't hit, must retract at maxRange
  const hpW = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => { const y = window.__harness.projectiles().filter(p => (p.name || "").includes("yoyo")); return y.length && y[0].returning; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const wret = await yoyos();
  check("whiffed yo-yo still retracts (max-range trigger)", wret.length && wret[0].returning === true, `returning=${wret[0]?.returning}`);
  check("whiffed yo-yo deals no damage (return trip is visual-only)", Math.abs(hpW - (await p2()).health) < 1, `Δhp=${(hpW - (await p2()).health).toFixed(0)}`);
  await page.waitForFunction(() => window.__harness.projectiles().every(p => !(p.name || "").includes("yoyo")), null, { timeout: 5000, polling: 16 }).catch(() => {});
  check("whiffed yo-yo returns home + despawns", (await yoyos()).length === 0, `count=${(await yoyos()).length}`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  KILLUA Stage 3: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
