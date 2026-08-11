// harness/killua.test.mjs — CANONICAL full-kit test for Killua Zoldyck (Stages 1-5 in one run),
// plus a fallback-box sweep (every exercised action must resolve to a real killua sheet).
// Stage-level detail lives in killua_stage{1..5}.mjs; this is the single regression gate.
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
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function prep(gap, refillEnergy = true) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(re => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); if (re) window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); }, refillEnergy);
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function dmgFrom(pressFn) { const hp0 = (await p2()).health; await pressFn(); await waitFrames(22); return hp0 - (await p2()).health; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── STAGE 1: registration + stats ──
  section("registration + stats");
  const g = await record();
  check("P1 is Killua", g.key === "killua", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle uses the atlas at the idle row (Stage 22)", (g.spriteSheet || "").includes("killua_atlas") && g.spriteSourceY === 0, `sheet=${g.spriteSheet} sy=${g.spriteSourceY}`);
  check("fragile-rushdown HP 1030", g.maxHealth === 1030, `HP=${g.maxHealth}`);
  check("Nen pool 180", g.maxEnergy === 180, `EN=${g.maxEnergy}`);

  // ── STAGE 1: movement/state ──
  section("movement + state");
  await page.keyboard.down("d"); await waitFrames(14); await record(); await page.keyboard.up("d"); await waitFrames(4);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); await record(); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__harness.p1().vy > 6, null, { timeout: 4000, polling: 16 }).catch(() => {}); await record();
  await waitGrounded();
  await page.keyboard.down(";"); await waitFrames(14); const bk = await record(); await page.keyboard.up(";"); await waitFrames(4);
  check("guard resolves to the block row of the atlas", bk.action === "guard" && (bk.spriteSheet || "").includes("killua_atlas") && bk.spriteSourceY === 164, `action=${bk.action} sy=${bk.spriteSourceY}`);
  await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); const h = await record();
  check("hurt resolves to the hit row of the atlas", h.action === "hurt" && (h.spriteSheet || "").includes("killua_atlas") && h.spriteSourceY === 222, `action=${h.action} sy=${h.spriteSourceY}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── STAGE 2: 5 normals ──
  section("5 normals connect");
  for (const [name, key, gap] of [["light", "j", 46], ["heavy", "k", 52], ["up", "i", 48]]) {
    await prep(gap); const d = await dmgFrom(async () => { await page.keyboard.down(key); await waitFrames(4); await record(); await page.keyboard.up(key); });
    check(`${name} connects`, d > 0, `−${d.toFixed(0)}`);
  }
  await prep(44); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(42)); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); }); check("air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded(); await prep(30); { const d = await dmgFrom(async () => { await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await page.keyboard.up("s"); }); check("down_air connects", d > 0, `−${d.toFixed(0)}`); }
  await waitGrounded();

  // ── STAGE 2: Barrage command chain (Down+Heavy rekka) ──
  section("Barrage command chain (Forward+Heavy rekka)");   // combo-string standardization Stage B: was Down+Heavy
  await prep(40);
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("d");
  const seq = []; { const m = (await p1()).currentMove; if (m) seq.push(m); }
  for (const want of ["barrage2", "barrage3", "barrage4"]) {
    let rec = false; for (let i = 0; i < 40; i++) { const p = await record(); if (!p.attacking) break; if (p.attackPhase === "recovery") { rec = true; break; } await waitFrames(1); }
    if (!rec) break; await tapKey("k"); await record(); const m = (await p1()).currentMove; if (m && seq[seq.length - 1] !== m) seq.push(m); if (m !== want) break;
  }
  check("barrage chains 1→2→3→4", seq.join("→") === "barrage1→barrage2→barrage3→barrage4", `seq=${seq.join("→")}`);
  await waitFrames(20);

  // ── STAGE 3: Yo-Yo (throw → travel → retract) ──
  section("Yo-Yo special (neutral) — throw → travel → retract");
  await prep(200);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(2); await record();
  await page.waitForFunction(() => window.__harness.projectiles().some(p => (p.name || "").includes("yoyo")), null, { timeout: 3000, polling: 16 }).catch(() => {});
  const yo = (await projs()).find(p => (p.name || "").includes("yoyo"));
  check("yo-yo spawns as a boomerang", !!yo && yo.boomerang === true, `boomerang=${yo?.boomerang}`);
  await page.waitForFunction(() => { const y = window.__harness.projectiles().filter(p => (p.name || "").includes("yoyo")); return y.length && y[0].returning; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("yo-yo retracts after connecting", ((await projs()).find(p => (p.name || "").includes("yoyo")) || {}).returning === true || (await projs()).every(p => !(p.name || "").includes("yoyo")), "");
  await page.evaluate(() => window.__harness.clearProjectiles());

  // ── STAGE 4: Lightning Palm (Fwd+Special) + Electric Ball (Down+Special) ──
  section("electric specials");
  await prep(70);
  { const d = await dmgFrom(async () => { await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await record(); await page.keyboard.up("l"); await waitFrames(14); await page.keyboard.up("d"); });
    check("Lightning Palm (Fwd+Special) connects", d > 0, `−${d.toFixed(0)}`); }
  await prep(220);
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await record(); await page.keyboard.up("l"); await page.keyboard.up("s");
  await page.waitForFunction(() => window.__harness.projectiles().some(p => (p.name || "").includes("electricBall")), null, { timeout: 3000, polling: 16 }).catch(() => {});
  const orb = (await projs()).find(p => (p.name || "").includes("electricBall"));
  check("Electric Ball (Down+Special) spawns a straight orb", !!orb && orb.boomerang === false, `orb=${!!orb}`);
  await page.waitForFunction(h => window.__harness.p2().health < h, (await p2()).health + 1, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.clearProjectiles());

  // ── STAGE 5: Godspeed ultimate ──
  section("Godspeed ultimate (buff-mode)");
  await prep(300);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const on = await record();
  check("Godspeed activates", on.godspeedActive === true, `active=${on.godspeedActive}`);
  check("buffs applied (dmg×1.25, atkSpeed×1.4)", Math.abs((on.damageMultiplier || 1) - 1.25) < 0.001 && Math.abs((on.attackSpeedMultiplier || 1) - 1.4) < 0.001, `dmg=${on.damageMultiplier} atkSpd=${on.attackSpeedMultiplier}`);
  check("activation cinematic plays", (await page.evaluate(() => window.__harness.godspeedCine().active)) === true, "");
  await record();
  // wait for the freeze cinematic to end (drain/revert only runs once combat resumes)
  await page.waitForFunction(() => !window.__harness.godspeedCine().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.setP1Energy(0.05)); await waitFrames(3);
  const off = await p1();
  check("Godspeed auto-reverts when the meter empties", off.godspeedActive === false && Math.abs((off.damageMultiplier || 1) - 1) < 0.001, `active=${off.godspeedActive} dmg=${off.damageMultiplier}`);

  // ── fallback-box sweep + integrity ──
  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("killua"));
  check(`all ${seenActions.size} exercised actions use a killua sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("portrait file present", await page.evaluate(async () => { try { const r = await fetch("./killua_portrait.png"); return r.ok; } catch { return false; } }), "");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  KILLUA full kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
