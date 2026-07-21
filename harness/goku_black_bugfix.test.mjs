// harness/goku_black_bugfix.test.mjs
// ---------------------------------------------------------------------------
// Two Stage-1/2 bug fixes, verified in real play with screenshots:
//  BUG 1 — SSJ Rose didn't trigger in real play. Real matches start at 50% energy
//          (below the 90% threshold) and charge(hold)/transform(tap) share a button.
//          FIX: hold P to build energy, RELEASE at/near max → transform (any duration).
//  BUG 2 — hit reaction cut off + no get-up chain. hit/get_up sheets weren't re-sliced
//          (clipping), and knockdownState is never triggered in real play. FIX: re-slice,
//          + on a strong hit Goku Black knocks down → plays the FULL fall (black_goku_hit)
//          then chains into the RISE (black_goku_get_up) then idle.
// Shots → harness/shots/GBFIX_*.png
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 160, y: 150, width: 420, height: 480 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(REPO, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sheet = s => (s.spriteSheet || "");
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  // ── BUG 1 — SSJ Rose: charge-and-release at real (sub-threshold) starting energy ──
  section("BUG 1 — SSJ Rose: hold P to charge, RELEASE at/near max → transform");
  {
    await page.evaluate(() => window.__harness.setEnergy(100));   // real match starting energy (50%)
    // (a) a bare quick TAP at 100 (below 180) must NOT transform
    await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p"); await wf(2);
    check("quick tap at 100 energy (below threshold) does NOT transform", (await p1()).currentForm !== "ssjRose", `form=${(await p1()).currentForm} energy=${(await p1()).energy.toFixed(0)}`);
    // (b) HOLD P to charge up past the threshold, then release → transforms
    await page.keyboard.down("p");
    const reached = await page.waitForFunction(() => window.__harness.p1().energy >= 180, null, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
    const eAtRelease = (await p1()).energy;
    await page.keyboard.up("p");
    check("charging reaches threshold (>=180) via P-hold", reached, `energy@release=${eAtRelease.toFixed(0)}`);
    // the transform is a frozen CINEMATIC now — wait for it to resolve, then the form-swap has landed
    await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
    await wf(4);
    const after = await p1();
    check("RELEASE at/near max ENTERS SSJ Rose (after the transform cinematic)", after.currentForm === "ssjRose" && after.hasSkinAnim, `form=${after.currentForm} skinAnim=${after.hasSkinAnim}`);
    check("SSJ Rose art swapped in (Rose idle sheet)", sheet(after).includes("goku_black_ssj_rose"), `sheet=${after.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GBFIX_ssjrose_realplay.png") });
    // quick tap reverts
    await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p"); await wf(3);
    check("quick tap while transformed reverts", (await p1()).currentForm !== "ssjRose", `form=${(await p1()).currentForm}`);
    await page.evaluate(() => window.__harness.setEnergy(200));
  }

  // ── BUG 2 — hit → full fall → get-up chain (via a real strong hit) ───────────
  section("BUG 2 — strong hit → FULL fall (hit sheet) → RISE (get_up sheet) → idle");
  {
    // p1 (goku_black) Ki Slash (heavy) into p2 (goku_black) → p2 knocks down
    await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2?.(); });
    await actionable();
    const a = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), a.x + 46);
    await page.evaluate(() => window.__harness.setEnergy(120));
    await wf(2);
    await page.keyboard.down("k"); await wf(6); await page.keyboard.up("k");   // Ki Slash hits p2
    // observe p2's reaction chain over the knockdown
    const seenActions = new Set(); const seenSheets = new Set();
    for (let i = 0; i < 70; i++) {
      const d = await p2();
      if (d.action) seenActions.add(d.action);
      if (d.spriteSheet) seenSheets.add((d.spriteSheet || "").replace("./", ""));
      await wf(1);
    }
    check("strong hit (real) put Goku Black into the KNOCKDOWN (fall) pose", seenActions.has("knockdown"), `actions=[${[...seenActions].join(",")}]`);
    check("fall pose uses the black_goku_hit sheet (full sequence)", [...seenSheets].some(s => s.includes("black_goku_hit")), `sheets=[${[...seenSheets].join(",")}]`);
    check("chained into the GET-UP (rise) pose", seenActions.has("getup"), `actions=[${[...seenActions].join(",")}]`);
    check("get-up pose uses the black_goku_get_up sheet", [...seenSheets].some(s => s.includes("black_goku_get_up")), `sheets=[${[...seenSheets].join(",")}]`);
    check("recovered back to idle after the chain", seenActions.has("idle"), `actions=[${[...seenActions].join(",")}]`);
  }

  // ── BUG 2 — clean framed capture of the fall→getup chain on P1 ───────────────
  // knockdownP1 sets the SAME knockdownState a strong hit does (proven above) — used here only to
  // frame P1 (left) for clear screenshots of the FALL and RISE poses.
  section("BUG 2 — clean fall + get-up screenshots (P1)");
  {
    await page.evaluate(() => window.__harness.healP1());
    await actionable();
    await page.evaluate(() => window.__harness.knockdownP1(60));
    let fShot = false, gShot = false;
    for (let i = 0; i < 66 && !(fShot && gShot); i++) {
      const d = await p1();
      if (d.action === "knockdown" && !fShot) { fShot = true; await page.screenshot({ path: path.join(OUT, "GBFIX_knockdown_fall.png") }); }
      if (d.action === "getup" && !gShot) { gShot = true; await page.screenshot({ path: path.join(OUT, "GBFIX_knockdown_getup.png") }); }
      await wf(1);
    }
    check("captured clean FALL + GET-UP screenshots", fShot && gShot, `fall=${fShot} getup=${gShot}`);
    await page.evaluate(() => window.__harness.healP1());
  }

  // ── BUG 2b — light jab stays a brief FLINCH (hurt), does NOT knock down ──────
  section("BUG 2b — a LIGHT jab flinches (hurt), does NOT knock down");
  {
    await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2?.(); });
    await actionable();
    const a = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), a.x + 44);
    await wf(2);
    await page.keyboard.down("j"); await wf(4); await page.keyboard.up("j");
    let knocked = false, hurtSeen = false;
    for (let i = 0; i < 24; i++) { const d = await p2(); if (d.action === "knockdown" || d.action === "getup") knocked = true; if (d.action === "hurt") hurtSeen = true; await wf(1); }
    check("light jab → hurt (flinch), NOT knockdown", hurtSeen && !knocked, `hurt=${hurtSeen} knocked=${knocked}`);
  }

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n  Goku Black BUGFIX (SSJ Rose trigger + hit→getup chain): ${PASS} passed, ${FAIL} failed\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
