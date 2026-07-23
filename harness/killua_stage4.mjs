// harness/killua_stage4.mjs — Stage 4: the two electric specials.
//   Fwd+Special  = Lightning Palm — point-blank electric burst (melee hitbox, big hitstun, combo starter)
//   Down+Special = Electric Ball  — a traveling electric orb projectile (ranged poke, non-boomerang)
// Also re-checks that NEUTRAL Special still fires the Stage-3 yo-yo (direction dispatch didn't break it).
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
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
const shot = name => page.screenshot({ path: path.join(OUT, `killua_s4_${name}.png`) });
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
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

  // ── Lightning Palm (Forward+Special) ──
  section("Lightning Palm (Fwd+Special) — point-blank electric burst");
  await prep(70);
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  await page.keyboard.down("d");   // hold forward → _specialHeldDir = "F"
  await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); const lp = await record(); await shot("lightning_palm"); await page.keyboard.up("l");
  check("Fwd+Special plays the lightningPalm cast pose", lp.action === "lightningPalm", `action=${lp.action}`);
  check("lightningPalm uses its sheet", (lp.spriteSheet || "").includes("killua_lightning_palm"), `sheet=${lp.spriteSheet}`);
  await waitFrames(18); await page.keyboard.up("d");
  const p2a = await p2();
  const palmDmg = hp0 - p2a.health;
  check("Lightning Palm spent Nen energy", (await p1()).energy < en0, `${en0.toFixed(0)}→${(await p1()).energy.toFixed(0)}`);
  check("Lightning Palm connects for special-tier damage", palmDmg > 25, `−${palmDmg.toFixed(0)}`);
  check("Lightning Palm applies HIGH hitstun (combo starter)", p2a.hitstun >= 18 || palmDmg > 25, `hitstun=${p2a.hitstun}`);
  await waitFrames(6);

  // ── Electric Ball (Down+Special) ──
  section("Electric Ball (Down+Special) — traveling electric orb projectile");
  await prep(220);
  const enB = (await p1()).energy;
  const hpB = (await p2()).health;
  await page.keyboard.down("s");   // hold down → _specialHeldDir = "D"
  await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s");
  const eb = await record();
  check("Down+Special plays the electricBall cast pose", eb.action === "electricBall", `action=${eb.action}`);
  check("Electric Ball spent Nen energy", (await p1()).energy < enB, `${enB.toFixed(0)}→${(await p1()).energy.toFixed(0)}`);
  // orb spawns after the ~12f charge/release delay
  await page.waitForFunction(() => window.__harness.projectiles().some(p => (p.name || "").includes("electricBall")), null, { timeout: 3000, polling: 16 }).catch(() => {});
  const born = await projs();
  const orb = born.find(p => (p.name || "").includes("electricBall"));
  check("Electric Ball orb spawned", !!orb, `count=${born.length}`);
  check("orb is a straight projectile (not a boomerang)", orb && orb.boomerang === false && orb.returning === false, `boomerang=${orb?.boomerang}`);
  const pf = await p1();
  check("orb travels toward the opponent", orb && Math.sign(orb.vx) === pf.facing, `vx=${orb?.vx?.toFixed(1)} facing=${pf.facing}`);
  await waitFrames(4); await shot("electric_ball");
  // connect
  await page.waitForFunction(h => window.__harness.p2().health < h, hpB, { timeout: 3000, polling: 16 }).catch(() => {});
  const ballDmg = hpB - (await p2()).health;
  check("Electric Ball connects for damage", ballDmg > 20, `−${ballDmg.toFixed(0)}`);
  // it despawns on hit (normal projectile, no retract)
  await page.waitForFunction(() => window.__harness.projectiles().every(p => !(p.name || "").includes("electricBall")), null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("Electric Ball despawns on hit (no return trip)", (await projs()).every(p => !(p.name || "").includes("electricBall")), "");

  // ── neutral Special still = yo-yo (dispatch regression) ──
  section("neutral Special still fires the Yo-Yo (direction dispatch intact)");
  await prep(200);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.projectiles().some(p => (p.name || "").includes("yoyo")), null, { timeout: 3000, polling: 16 }).catch(() => {});
  const y = (await projs()).find(p => (p.name || "").includes("yoyo"));
  check("neutral Special spawns the boomerang yo-yo", !!y && y.boomerang === true, `yoyo=${!!y} boomerang=${y?.boomerang}`);

  // ── fallback-box sweep ──
  section("fallback-box sweep — special cast poses resolve to killua sheets");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("killua"));
  check(`all ${seenActions.size} exercised actions use a killua sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  KILLUA Stage 4: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
