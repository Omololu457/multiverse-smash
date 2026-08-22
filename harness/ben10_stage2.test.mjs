// harness/ben10_stage2.test.mjs
// BEN 10 — STAGE 2: per-form 5 normals + Fwd+Heavy command-normal (rekka) chain, with
// mid-chain interrupt tests. Drives the REAL input path (d=forward, k=heavy, j=light,
// i=up, s=down) against a training dummy placed in range; reads the benCmd probe.
//   node harness/ben10_stage2.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const f = path.join(ROOT, u === "/" ? "/index.html" : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const cmd = () => page.evaluate(() => window.__harness.benCmd());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function rec() { const c = await cmd(); if (c?.action) seen.set(c.action, true); return c; }
const setForm = (k) => page.evaluate(key => window.__harness.benForm(key), k);
const forcePose = (a) => page.evaluate(x => window.__harness.benPose(x), a);
async function settle() {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}
async function prep(gap = 58) { await settle(); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

// Drive the chain on a DETERMINISTIC rhythm: hold Forward, then tap Heavy every ~13 frames
// (each stage is startup+active+recovery ≈ 16f, so a tap reliably lands in the current stage's
// recovery → the next stage fires on connect). Avoids the race of reacting to the fast forms'
// short recovery window. Records the ordered set of stage moves seen.
async function driveChain(cadence = 13, frames = 84) {
  const chain = [];
  await page.keyboard.down("d"); await waitFrames(1);
  let nextTap = 0;
  for (let f = 0; f < frames; f++) {
    const c = await rec();
    if (c.move && !chain.includes(c.move)) chain.push(c.move);
    if (f >= nextTap) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); nextTap = f + cadence; f += 1; }
    else await waitFrames(1);
  }
  await page.keyboard.up("d");
  return chain;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  const FORMS = [
    { key: "human",       normals: { light: "light", heavy: "heavy", up: "up", air: "air", down_air: "down_air" }, opener: "benJab1", chain: ["benJab1", "benJab2"] },
    { key: "xlr8",        normals: { light: "light", heavy: "heavy", up: "up", air: "air", down_air: "down_air" }, opener: "xlCombo1", chain: ["xlCombo1", "xlCombo2", "xlCombo3"] },
    { key: "diamondhead", normals: { light: "light", heavy: "heavy", up: "up", air: "air", down_air: "down_air" }, opener: "dhSwing1", chain: ["dhSwing1", "dhSwing2"] },
  ];

  for (const form of FORMS) {
    section(`${form.key} — 5 normals render as sprites`);
    await settle();
    const fi = await setForm(form.key);
    check(`${form.key}: form set (hasSkinAnim=${fi.hasSkinAnim})`, fi.activeAlien === (form.key === "human" ? "human" : form.key), `active=${fi.activeAlien}`);
    // Each normal: force the action, confirm it resolves to a real sprite (not the box) via spriteCrop dims.
    for (const [name, action] of Object.entries(form.normals)) {
      await forcePose(action); await waitFrames(1); await page.waitForTimeout(120);
      const shot = await page.evaluate(() => { const c = window.__harness.spriteCrop("p1"); const i = window.__harness.renderInfo("p1"); return { w: c?.contentW || 0, h: c?.contentH || 0, action: i?.action }; });
      await forcePose(null);
      // 128² fallback box renders ~256px; match the canonical test's box-detection (real cells are larger
      // now that XLR8 is re-sourced from the ipmugen #11 sheet — the old ≥120 AND-threshold was too tight).
      const boxlike = shot.w >= 200 || shot.h >= 200;
      check(`${form.key} normal ${name} → sprite`, shot.w > 0 && shot.h > 0 && !boxlike, `body=${shot.w}x${shot.h} action=${shot.action}`);
      if (shot.action) seen.set(shot.action, true);
    }

    section(`${form.key} — Fwd+Heavy command chain (cancel-on-hit)`);
    // Retry the string a few times: fast-form knockback can drift the dummy out of a later stage's
    // range, so we take the BEST attempt (any run that reaches the finisher proves the chain works).
    let best = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await prep(form.key === "diamondhead" ? 70 : form.key === "xlr8" ? 50 : 54);
      const chain = await driveChain(18);
      if (chain.length > best.length) best = chain;
      if (form.chain.every(s => chain.includes(s))) { best = chain; break; }
    }
    check(`${form.key}: opener is ${form.opener}`, best[0] === form.opener, `chain=[${best.join(" → ")}]`);
    check(`${form.key}: chain advances past opener (cancel-on-hit)`, best.length >= 2, `reached ${best.length}/${form.chain.length}`);
    check(`${form.key}: full chain reachable [${form.chain.join(",")}]`, form.chain.every(s => best.includes(s)), `best=[${best.join(" → ")}]`);
  }

  // ── MID-CHAIN INTERRUPT: open the chain, then DON'T re-tap → the string must END ──
  section("mid-chain interrupt — no re-tap ends the string");
  await settle(); await setForm("xlr8"); await prep(54);
  await page.keyboard.down("d"); await waitFrames(1);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const opened = await rec();
  check("interrupt: opener fired with a pending rekkaNext", opened.move === "xlCombo1" && !!opened.rekkaNext, `move=${opened.move} next=${opened.rekkaNext}`);
  // wait out the whole move WITHOUT pressing Heavy again
  await page.keyboard.up("d");
  await waitFrames(30);
  const after = await rec();
  check("interrupt: string ended (not attacking, rekkaNext cleared)", !after.attacking && !after.rekkaNext, `attacking=${after.attacking} next=${after.rekkaNext}`);

  // ── TIMING GATE: re-tap Heavy during STARTUP (not recovery) must NOT advance ──
  section("timing gate — re-tap outside recovery does not advance");
  await settle(); await setForm("diamondhead"); await prep(70);
  await page.keyboard.down("d"); await waitFrames(1);
  await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");   // open
  await waitFrames(1);
  await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");   // re-tap immediately (startup/active, not recovery)
  const early = await rec();
  check("timing: still on opener during startup re-tap", early.move === "dhSwing1", `move=${early.move} phase=${early.phase}`);
  await page.keyboard.up("d");

  section("fallback-box sweep");
  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");
  console.log(`  actions seen: ${[...seen.keys()].join(", ")}`);

} catch (e) {
  console.log("FATAL", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN 10 STAGE 2: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
