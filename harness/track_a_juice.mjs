// harness/track_a_juice.mjs — LIVE verification for Track A (camera / hit-feedback juice):
//   A1 combo-counter escalation (real keyboard combo drives the counter; high tiers probed) ,
//   A2 parry/clash "sell" wash (fires off the REAL parryFlash/clashFlash fields combat.js sets),
//   A3 low-HP red edge vignette (driven by the REAL production low-HP latch reading live HP).
// Real match, real keyboard, real draw path — asserts state + captures evidence shots, zero JS errors.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gohan&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.juice), null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await waitFrames(6);

  // ── A1 — COMBO COUNTER ESCALATION ─────────────────────────────────────
  // Real keyboard: position point-blank, freeze the dummy in hitstun, and land real light hits so the
  // live comboCounter climbs through the escalation pipeline (this is the REAL _drawComboCounters path).
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.resetFighterInput("p1"); });
  const a0 = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a0.x + 40 * (a0.facing || 1));
  let landed = 0;
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.__harness.hurtP2(30));   // keep dummy stunned so the string connects
    await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await waitFrames(4);
    const c = await page.evaluate(() => window.__harness.juice.combo("p1"));
    landed = Math.max(landed, c?.count || 0);
  }
  check(`A1 real keyboard combo climbs the live counter (reached ${landed})`, landed >= 3, `count=${landed}`);

  // High-tier escalation: drive the counter up so the 5/9/15 color tiers + rank callouts render.
  const tiers = [];
  for (const n of [5, 9, 15]) {
    await page.evaluate(v => window.__harness.setCombo("p1", v), n);
    await waitFrames(3);
    const c = await page.evaluate(() => window.__harness.juice.combo("p1"));
    tiers.push({ n, tier: c?.tier, rank: c?.rankText, op: c?.opacity });
    if (n === 15) await page.screenshot({ path: path.join(OUT, "TRACKA_combo15.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  }
  const t5 = tiers[0], t9 = tiers[1], t15 = tiers[2];
  check("A1 escalation crosses rank tiers as count rises (5<9<15)", t5.tier >= 1 && t9.tier > t5.tier && t15.tier > t9.tier, JSON.stringify(tiers));
  check("A1 counter is visible (opacity>0) at high tier", (t15.op || 0) > 0, `op=${t15.op}`);

  // ── A3 — LOW-HP RED EDGE VIGNETTE ─────────────────────────────────────
  await page.evaluate(() => { window.__harness.healP2(); });
  await waitFrames(4);
  const vOff = await page.evaluate(() => window.__harness.juice.lowHp());
  check("A3 vignette OFF at full HP", vOff.on === false, JSON.stringify(vOff));
  // Drop P2 to ~7% → below the 25% engage threshold that also drives the low-HP music crossfade.
  const mh = (await page.evaluate(() => window.__harness.p2())).maxHealth || 1200;
  await page.evaluate(h => window.__harness.brutality.setHp("p2", h), Math.round(mh * 0.07));
  await waitFrames(40);
  const vOn = await page.evaluate(() => window.__harness.juice.lowHp());
  check("A3 vignette ENGAGES + eases in below 25% HP", vOn.on === true && vOn.a > 0.1, JSON.stringify(vOn));
  await page.screenshot({ path: path.join(OUT, "TRACKA_lowhp_vignette.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  // Heal back above the 32% release threshold → latch releases, vignette eases out.
  await page.evaluate(() => window.__harness.healP2());
  await waitFrames(30);
  const vRel = await page.evaluate(() => window.__harness.juice.lowHp());
  check("A3 vignette RELEASES + eases out after heal (hysteresis)", vRel.on === false && vRel.a < vOn.a, JSON.stringify(vRel));

  // ── A2 — PARRY / CLASH SELL FLASH ─────────────────────────────────────
  // Fire the exact per-fighter fields combat.js sets on a parry/clash; the production rising-edge
  // detector (_updateParryClashFlash in updateBattle) + draw path react — no bypass of my code.
  await page.evaluate(() => window.__harness.juice.firePseudoParry("p2"));
  await waitFrames(2);
  const pc1 = await page.evaluate(() => window.__harness.juice.parryClash());
  check("A2 parry raises a CYAN sell-wash", pc1.flash > 0 && pc1.color === "#38bdf8", JSON.stringify(pc1));
  await page.screenshot({ path: path.join(OUT, "TRACKA_parry_flash.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await waitFrames(12);  // let it decay
  await page.evaluate(() => window.__harness.juice.firePseudoClash("p1"));
  await waitFrames(2);
  const pc2 = await page.evaluate(() => window.__harness.juice.parryClash());
  check("A2 clash raises a WHITE sell-wash", pc2.flash > 0 && pc2.color === "#ffffff", JSON.stringify(pc2));
  await waitFrames(14);
  const pc3 = await page.evaluate(() => window.__harness.juice.parryClash());
  check("A2 sell-wash fully decays (brief, non-obstructive)", pc3.flash <= 0, JSON.stringify(pc3));

  check("no JS errors during Track A live run", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
} catch (e) {
  check("harness completed without throwing", false, String(e));
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
