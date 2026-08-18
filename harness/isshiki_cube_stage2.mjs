// harness/isshiki_cube_stage2.mjs
// CUBE-TRAP STAGE 2 (isolated): the cube OBJECT + the SHRINK visual, spawned directly via a harness hook
// (NOT yet wired to the special). Proves: cast small → descend → grow-on-land (scale ramps to full) → the
// trapped foe SHRINKS inside it (_trapShrinkFrac eases 1→~0.35) + is frozen + UNTOUCHABLE to normal hits +
// the cube has a hittable hurtbox rect; then the trap RELEASES (foe back to normal scale + hittability).
// Screenshots → harness/shots/isshiki_cube_s2_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cube = () => page.evaluate(() => window.__harness.cubeTrap());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `isshiki_cube_s2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);
  await waitGrounded();
  // position p2 in front of p1 (close enough that a normal WOULD connect if not untouchable)
  await page.evaluate(() => { window.__harness.healP2(); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 64 * (a.facing || 1)); });
  await wf(2);

  console.log("\n── spawn the cube trap (p1 caster → p2) — INERT (isolated cube+shrink+gate; no tick/bonus/mash) ──");
  const s0 = await page.evaluate(() => window.__harness.spawnCubeTrap("p1", { inert: true }));
  check("cube trap spawned", !!s0 && s0.phase === "descend", `state=${JSON.stringify(s0)}`);
  await shot("1_descend");

  // ── DESCEND → GROW → TRAPPED: sample the lifecycle ──
  console.log("\n── descend → grow-on-land → trapped (cube grows, foe shrinks) ──");
  let sawGrow = false, sawTrapped = false, maxScale = 0, minShrink = 1, everUntouchable = false, hurtOK = false;
  let grewShot = false, trappedShot = false;
  for (let i = 0; i < 60; i++) {
    const c = await cube(); if (!c) break;
    maxScale = Math.max(maxScale, c.scale);
    if (c.targetShrink != null) minShrink = Math.min(minShrink, c.targetShrink);
    if (c.targetUntouchable) everUntouchable = true;
    if (c.hurt && c.hurt.w > 40 && c.hurt.h > 40) hurtOK = true;
    if (c.phase === "grow") { sawGrow = true; if (!grewShot) { await shot("2_grow"); grewShot = true; } }
    if (c.phase === "trapped") { sawTrapped = true; if (!trappedShot && c.targetShrink != null && c.targetShrink < 0.6) { await shot("3_trapped"); trappedShot = true; } }
    await wf(1);
  }
  check("cube reached GROW phase (grew on land)", sawGrow, "");
  check("cube reached TRAPPED phase", sawTrapped, "");
  check("cube grew to ~full scale (≥ 1.2)", maxScale >= 1.2, `maxScale=${maxScale}`);
  check("foe SHRANK inside the cube (trapShrink ≤ 0.5)", minShrink <= 0.5, `minShrink=${minShrink}`);
  check("foe was UNTOUCHABLE while trapped", everUntouchable, "");
  check("cube has a hittable hurtbox rect (>40×40)", hurtOK, "");

  // ── UNTOUCHABLE GATE: a direct normal on the trapped foe must WHIFF (0 dmg) ──
  console.log("\n── trapped foe is untouchable to a direct normal (whiffs) ──");
  const cNow = await cube();
  if (cNow && cNow.phase === "trapped") {
    const hp0 = (await p2()).health;
    await page.keyboard.down("j"); await wf(3); await page.keyboard.up("j"); await wf(6);
    await page.keyboard.down("k"); await wf(4); await page.keyboard.up("k"); await wf(8);
    const dmg = hp0 - (await p2()).health;
    check("direct light/heavy on the trapped foe deals 0 (untouchable)", dmg === 0, `dmg=${dmg.toFixed(1)}`);
  } else {
    check("trap still active for untouchable test", false, `phase=${cNow?.phase}`);
  }

  // ── RELEASE: after the trap ends, the foe returns to normal scale + hittability ──
  console.log("\n── trap release (foe back to normal scale + hittable) ──");
  await page.waitForFunction(() => window.__harness.cubeTrap() === null, null, { timeout: 8000, polling: 32 }).catch(() => {});
  await wf(2); await shot("4_released");
  const rel = await p2();
  check("cube trap cleared", (await cube()) === null, "");
  check("foe shrink released (trapShrinkFrac null)", rel.trapShrinkFrac == null, `shrink=${rel.trapShrinkFrac}`);
  check("foe untouchable flag cleared", !rel.cubeTrapUntouchable, `untouchable=${rel.cubeTrapUntouchable}`);
  // after release a normal should connect again
  await page.evaluate(() => { window.__harness.healP2(); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 60 * (a.facing || 1)); });
  await wf(2);
  const hp0 = (await p2()).health;
  await page.keyboard.down("j"); await wf(4); await page.keyboard.up("j"); await wf(8);
  check("foe hittable again after release (normal connects)", hp0 - (await p2()).health > 0, `dmg=${(hp0 - (await p2()).health).toFixed(1)}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
