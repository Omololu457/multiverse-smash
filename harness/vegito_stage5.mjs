// harness/vegito_stage5.mjs
// STAGE 5 evidence: Vegito's ULTRA INSTINCT -SIGN- evasion RESOURCE (`_uiMeter`, separate from ki).
// (1) INIT — the meter starts FULL and reads tier 0 (relaxed idle tell).
// (2) PASSIVE DRAIN — the meter bleeds every frame while neutral (not charging).
// (3) REAL EVASION — while meter > 0 (and not charging), an incoming hit is NEGATED (no HP loss) for a
//     per-dodge meter cost + i-frames. Works for both melee and projectiles.
// (4) EVASION DISABLED WHILE CHARGING — holding Charge (P) REFILLS the meter but the same incoming hit LANDS.
// (5) HEALTH CONVERSION AT 0 — with the meter empty, the passive drain converts to a small HP bleed.
// (6) METER TELL — _uiTier drives the idle pose (full=idle / mid=idle_mid / low=idle_low).
// Screenshots → harness/shots/vegito_stage5_*.png. See VEGITO_ASSET_MAP.md + combat.VEGITO_UI.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const ui = () => page.evaluate(() => window.__harness.vegitoUI("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `vegito_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const setMeter = (v) => page.evaluate(x => window.__harness.vegitoSetMeter(x), v);
async function prep(gap = 64) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1(); window.__harness.healP2(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegito`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── (1) init: meter starts FULL, tier 0 ──");
  await waitFrames(2);
  const u0 = await ui();
  check("meter initialised to max", u0.meter != null && Math.abs(u0.meter - u0.max) <= u0.max * 0.06, `meter=${u0.meter?.toFixed(1)}/${u0.max}`);
  check("tell tier = 0 (relaxed idle) at full", u0.tier === 0, `tier=${u0.tier}`);

  console.log("\n── (2) passive drain: meter bleeds while neutral (not charging) ──");
  await prep();
  const m0 = (await ui()).meter;
  await waitFrames(60);
  const m1 = (await ui()).meter;
  check(`meter drains passively over 60f (${m0.toFixed(1)}→${m1.toFixed(1)})`, m1 < m0 - 2, `Δ=${(m0 - m1).toFixed(2)}`);

  console.log("\n── (3) REAL evasion: incoming hit negated for a meter cost (meter > 0, not charging) ──");
  await prep(60);
  await setMeter(90); await waitFrames(1);
  const before = await ui();
  await page.evaluate(() => window.__harness.p2Attack());   // real incoming swing into Vegito
  await waitFrames(16);
  const after = await ui();
  check(`Vegito takes NO damage (evaded)`, after.health >= before.health - 0.5, `hp ${before.health.toFixed(0)}→${after.health.toFixed(0)}`);
  check(`meter spent on the dodge (${before.meter.toFixed(1)}→${after.meter.toFixed(1)})`, before.meter - after.meter >= 5, `Δ=${(before.meter - after.meter).toFixed(1)}`);
  await shot("evade");

  console.log("\n── (4) evasion DISABLED while charging (hold P) — hit LANDS + meter refills ──");
  await prep(60);
  await setMeter(50); await waitFrames(1);
  await page.keyboard.down("p"); await waitFrames(6);
  const cMid = await ui();
  check(`charging flag set while holding P`, cMid.charging === true, `charging=${cMid.charging}`);
  const chBefore = await ui();
  await page.evaluate(() => window.__harness.p2Attack());
  await waitFrames(16);
  const chAfter = await ui();
  check(`hit LANDS while charging (evasion off)`, chAfter.health < chBefore.health, `hp ${chBefore.health.toFixed(0)}→${chAfter.health.toFixed(0)}`);
  await page.keyboard.up("p"); await waitFrames(2);
  check(`meter REFILLED while charging (${cMid.meter.toFixed(1)} rising)`, cMid.meter > 50, `meter=${cMid.meter.toFixed(1)}`);
  await shot("charging");

  console.log("\n── (5) health conversion at 0: empty meter bleeds HP ──");
  await prep(200);   // far P2 so nothing else can touch Vegito
  await page.evaluate(() => window.__harness.healP1());
  await setMeter(0); await waitFrames(1);
  const hb = await ui();
  await waitFrames(60);
  const ha = await ui();
  check(`meter stays 0 (empty)`, ha.meter <= 0.001, `meter=${ha.meter}`);
  check(`HP bleeds while empty (${hb.health.toFixed(1)}→${ha.health.toFixed(1)})`, ha.health < hb.health - 2, `Δ=${(hb.health - ha.health).toFixed(1)}`);
  check(`bleeding flag set`, ha.bleeding === true, `bleeding=${ha.bleeding}`);

  console.log("\n── (5b) empty meter = NO evasion (hit lands) ──");
  await prep(60);
  await page.evaluate(() => window.__harness.healP1());
  await setMeter(0); await waitFrames(1);
  const eb = await ui();
  await page.evaluate(() => window.__harness.p2Attack());
  await waitFrames(16);
  const ea = await ui();
  check(`empty meter takes damage (no dodge)`, ea.health < eb.health, `hp ${eb.health.toFixed(0)}→${ea.health.toFixed(0)}`);

  console.log("\n── (6) meter TELL: tier drives the idle pose (full/mid/low) ──");
  await prep(200);
  await page.evaluate(() => window.__harness.resetFighterInput("p1"));
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vx) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await setMeter(90); await waitFrames(4); const tFull = await ui();
  check(`full meter → tier 0 → idle`, tFull.tier === 0 && (tFull.action === "idle"), `tier=${tFull.tier} action=${tFull.action}`);
  await setMeter(40); await waitFrames(4); const tMid = await ui();
  check(`mid meter → tier 1 → idle_mid`, tMid.tier === 1 && tMid.action === "idle_mid", `tier=${tMid.tier} action=${tMid.action}`);
  await shot("tell_mid");
  await setMeter(10); await waitFrames(4); const tLow = await ui();
  check(`low meter → tier 2 → idle_low`, tLow.tier === 2 && tLow.action === "idle_low", `tier=${tLow.tier} action=${tLow.action}`);
  await shot("tell_low");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
