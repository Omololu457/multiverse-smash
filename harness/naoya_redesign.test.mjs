// harness/naoya_redesign.test.mjs — LIVE verification of the Naoya FULL-KIT REDESIGN (2026-09-11).
// Proves both new signature mechanics in real matches, all four required cases:
//   SNARE-BROKEN  — land the 24FPS Snare, then act while snared → the opponent hard-freezes (~1s).
//   SNARE-HELD    — land it, then hold neutral the whole window → it expires harmlessly (no freeze).
//   ROUTE-SUCCESS — Fwd+Heavy → Heavy → Light on time → full Planned Route completes (launcher, big dmg).
//   ROUTE-FAIL    — open the route then miss a window → NAOYA freezes himself 1s, fully punishable.
// Plus the ULT enhancement: guaranteed sequence → freeze finish that ALSO re-applies the Snare.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const fx = () => page.evaluate(() => window.__harness.naoyaFx("p1"));
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function actionable() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && (p.hitstun || 0) <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await actionable();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.42)); await wf(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1));
  await wf(2);
}
async function tap(key) { await page.keyboard.down(key); await wf(1); await page.keyboard.up(key); }
// land the neutral palm snare on P2; returns fx after it applies
async function landSnare() {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.evaluate(() => window.__harness.naoyaClear());   // clean slate — no stale snare/route leaking in
    await prep(46);
    await specialDir(null);                              // neutral Special = 24FPS Snare (palm)
    for (let i = 0; i < 30; i++) { const a = await fx(); if ((a.oppSnare || 0) > 0) return a; await wf(1); }
    await actionable();
  }
  return await fx();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=naoya&p2=naoya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await grounded();

  // ═══════════════ 24FPS SNARE ═══════════════
  section("24FPS SNARE — lands on the opponent (palm contact applies the rule)");
  {
    const s = await landSnare();
    check("neutral Special lands the Snare (opponent is snared)", (s.oppSnare || 0) > 0, `oppSnare=${s.oppSnare} max=${s.oppSnareMax}`);
    await page.screenshot({ path: path.join(OUT, "naoya_snare_applied.png") });
  }

  section("CASE 1 — SNARE-BROKEN: opponent ACTS while snared → hard 1s freeze (fully punishable)");
  {
    const s = await landSnare();
    if ((s.oppSnare || 0) > 0) {
      await page.waitForFunction(() => { const p = window.__harness.p2(); return (p.hitstun || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});   // let the palm hitstun clear (grace)
      await page.evaluate(() => window.__harness.p2Attack());   // opponent takes an action = breaks the rule
      let frozenPeak = 0, sawBroke = false;
      for (let i = 0; i < 10; i++) { const a = await fx(); frozenPeak = Math.max(frozenPeak, a.oppFrozen || 0); if ((a.oppSnareBroke || 0) > 0) sawBroke = true; await wf(1); }
      const after = await fx();
      check("acting while snared triggers a ~1s freeze on the opponent", frozenPeak >= 50, `oppFrozen peak=${frozenPeak}`);
      check("snare is consumed on the break (no lingering rule)", (after.oppSnare || 0) === 0, `oppSnare=${after.oppSnare}`);
      check("HUD 'RULE BROKEN' flash fired", sawBroke, `broke flag seen=${sawBroke}`);
      await page.screenshot({ path: path.join(OUT, "naoya_snare_broken.png") });
    } else { check("snare applied (precondition)", false, "could not land snare"); }
  }

  section("CASE 2 — SNARE-HELD: opponent HOLDS NEUTRAL the full window → expires harmlessly");
  {
    const s = await landSnare();
    if ((s.oppSnare || 0) > 0) {
      const startFrozen = (await fx()).oppFrozen || 0;
      // P2 is a stationary dummy = holds neutral. Wait out the whole window (max + margin).
      let expired = false, everFroze = false, sawSafe = false;
      for (let i = 0; i < (s.oppSnareMax || 110) + 40; i++) {
        const a = await fx();
        if ((a.oppFrozen || 0) > startFrozen + 4) everFroze = true;   // must NOT freeze from a clean hold
        if ((a.oppSnareSafe || 0) > 0) sawSafe = true;
        if ((a.oppSnare || 0) === 0) { expired = true; }
        if (expired && (a.oppSnare || 0) === 0 && i > (s.oppSnareMax || 110)) break;
        await wf(1);
      }
      const after = await fx();
      check("snare expires on a clean hold (rule lifts)", (after.oppSnare || 0) === 0, `oppSnare=${after.oppSnare}`);
      check("NO freeze triggered by holding neutral (intended counterplay)", !everFroze, `everFroze=${everFroze}`);
      check("HUD 'SAFE' flash fired on the clean expire", sawSafe, `safe flag seen=${sawSafe}`);
    } else { check("snare applied (precondition)", false, "could not land snare"); }
  }

  // ═══════════════ PLANNED ROUTE ═══════════════
  section("CASE 3 — ROUTE-SUCCESS: Fwd+Heavy → Heavy → Light on time → full string + reward");
  {
    let ok = null;
    for (let attempt = 0; attempt < 6 && !ok; attempt++) {
      await prep(52); const h0 = (await p2()).health;
      const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
      await page.keyboard.down(fwd); await wf(1);
      await tap("k");                                  // opener (Fwd+Heavy) → route armed
      const armed = await fx();
      // Adaptively press each follow-up's WANTED button as soon as its window is open (poll ftStep/ftSeq).
      let done = null, lastStep = -1;
      for (let i = 0; i < 24; i++) {
        const a = await fx();
        if ((a.selfFrozen || 0) > 0) { done = a; break; }          // dropped (shouldn't on clean input)
        if (!a.routeArmed) { done = a; break; }                    // route resolved (completed)
        const want = a.ftSeq ? a.ftSeq[a.ftStep] : null;
        if (want && a.ftStep !== lastStep) { lastStep = a.ftStep; await tap(want === "heavy" ? "k" : "j"); }
        await wf(1);
      }
      await wf(4); if (!done) done = await fx();
      const dmg = h0 - (await p2()).health;
      await page.keyboard.up(fwd);
      if (armed.routeArmed && !done.routeArmed && done.ftFlash === "freeze" && (done.selfFrozen || 0) === 0 && dmg > 40) {
        ok = { armed, done, dmg };
      }
      await actionable();
    }
    check("route ARMS on the Fwd+Heavy opener (committed)", !!ok, ok ? "" : "opener never armed the route");
    check("perfect H→H→L completes the route (FRAMES SET, not dropped)", ok && ok.done.ftFlash === "freeze" && !ok.done.routeArmed, ok ? `flash=${ok.done.ftFlash}` : "");
    check("clean route = strong reward damage + NO self-freeze", ok && ok.dmg > 40 && (ok.done.selfFrozen || 0) === 0, ok ? `dmg=${ok.dmg.toFixed(0)} selfFrozen=${ok.done.selfFrozen}` : "");
    if (ok) await page.screenshot({ path: path.join(OUT, "naoya_route_success.png") });
  }

  section("CASE 4 — ROUTE-FAIL: open the route then MISS a window → Naoya self-freezes 1s (punishable)");
  {
    let failed = null;
    for (let attempt = 0; attempt < 5 && !failed; attempt++) {
      await prep(52);
      const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
      await page.keyboard.down(fwd); await wf(1);
      await tap("k");                                  // opener → route armed
      const armed = await fx();
      // now deliberately do NOTHING — let the first follow-up window elapse (late = drop)
      let sawSelfFreeze = false, sawDrop = false;
      for (let i = 0; i < 40; i++) { const a = await fx(); if ((a.selfFrozen || 0) > 0) sawSelfFreeze = true; if (a.ftFlash === "drop") sawDrop = true; await wf(1); }
      const after = await fx();
      await page.keyboard.up(fwd);
      if (armed.routeArmed && sawSelfFreeze && sawDrop && !after.routeArmed) failed = { armed, sawSelfFreeze, sawDrop, after };
      await actionable();
    }
    check("missing a window DROPS the route (red DROP flash)", failed && failed.sawDrop, failed ? "" : "no drop observed");
    check("a dropped route FREEZES Naoya himself ~1s (fully punishable)", failed && failed.sawSelfFreeze, failed ? "" : "Naoya never self-froze");
    check("route state is cleared after the drop (not stuck armed)", failed && !failed.after.routeArmed, failed ? `armed=${failed.after.routeArmed} rooted=${failed.after.rooted}` : "");
    if (failed) await page.screenshot({ path: path.join(OUT, "naoya_route_fail.png") });
  }

  section("ULTIMATE — guaranteed Frame-Trap + ENHANCEMENT: freeze finish RE-APPLIES the Snare");
  {
    await prep(52); await grounded(); const hpU = (await p2()).health;
    const ult = await page.evaluate(() => window.__harness.p1Ultimate());
    let sawFinish = false, frozenPeak = 0, snareReapplied = false;
    for (let i = 0; i < 24; i++) { await wf(2); const s = await fx(); if (s.castMove === "naoyaFtFinish") sawFinish = true; frozenPeak = Math.max(frozenPeak, s.oppFrozen || 0); if ((s.oppSnare || 0) > 0) snareReapplied = true; }
    const dmgU = hpU - (await p2()).health;
    check("ultimate fires + reaches the white-wing finish", !!ult?.cast && sawFinish, `cast=${ult?.cast} finish=${sawFinish}`);
    check("ult guarantees the freeze finish (~1s) + big damage (~198 EFF)", frozenPeak >= 50 && dmgU >= 150 && dmgU <= 240, `frozen=${frozenPeak} dmg=${dmgU.toFixed(0)}`);
    check("ENHANCEMENT: the freeze finish ALSO re-applies the 24FPS Snare", snareReapplied, `snareReapplied=${snareReapplied}`);
  }

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Naoya redesign (Snare + Planned Route + Ult): ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
