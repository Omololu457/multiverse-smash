// harness/saitama_stage3.mjs
// STAGE 3 evidence: Saitama's tiered tap/hold punch-combo special (neutral Special, resolved on RELEASE).
// TAP L → "Consecutive Normal Punches" 10× (saitama_combo10). HOLD L → 20× (saitama_combo20).
// Verifies: (1) both tiers wired to real sheets; (2) a quick TAP fires the 10× tier, a long HOLD fires the
// 20× tier (distinct sheets); (3) each is a genuine MULTI-HIT flurry (combo counter climbs > 1); (4) the
// 20× tier out-damages the 10×. Screenshots → harness/shots/saitama_stage3_*.png.
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
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `saitama_stage3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setDummyBehavior?.("stand"); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
// Fire the combo and sample: returns { sheet, hits (health-drop events), dmg, maxCombo }.
async function fireCombo(holdMs) {
  const h0 = (await p2()).health;
  let sheet = "", hits = 0, prevH = h0, maxCombo = 0;
  await page.keyboard.down("l");
  // Always hold ≥2 frames so the neutral-Special press path can ARM the combo before release; a real "tap"
  // is a couple frames (well under the 200ms hold threshold), a "hold" waits past it.
  await waitFrames(holdMs > 0 ? Math.ceil(holdMs / 16) + 2 : 2);
  await page.keyboard.up("l");
  for (let i = 0; i < 34; i++) {
    const a = await p1(), b = await p2();
    if ((a.spriteSheet || "").match(/saitama_combo(10|20)_uniform/)) sheet = a.spriteSheet;
    if (b.health < prevH - 0.01) hits++;
    prevH = b.health;
    maxCombo = Math.max(maxCombo, a.comboCounter || 0);
    await waitFrames(1);
  }
  const dmg = h0 - (await p2()).health;
  return { sheet, hits, dmg, maxCombo };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=saitama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("saitama").animationData);

  console.log("\n── (1) both tiers wired to real sheets (no box) ──");
  check("saitamaCombo10 wired → saitama_combo10_uniform", (ad.saitamaCombo10?.sheet || "").includes("saitama_combo10_uniform"), `sheet=${ad.saitamaCombo10?.sheet}`);
  check("saitamaCombo20 wired → saitama_combo20_uniform", (ad.saitamaCombo20?.sheet || "").includes("saitama_combo20_uniform"), `sheet=${ad.saitamaCombo20?.sheet}`);

  console.log("\n── (2) TAP Special → 10× tier (saitama_combo10), genuine multi-hit ──");
  await prep(40);
  const tap = await fireCombo(0);
  await shot("tap_combo10");
  check("TAP renders saitama_combo10_uniform", /saitama_combo10_uniform/.test(tap.sheet), `sheet=${tap.sheet}`);
  check(`TAP is a multi-hit flurry (${tap.hits} hits / combo ${tap.maxCombo})`, tap.hits >= 2 || tap.maxCombo >= 2, `hits=${tap.hits} combo=${tap.maxCombo}`);
  check(`TAP deals damage (${tap.dmg.toFixed(0)})`, tap.dmg > 0, `dmg=${tap.dmg}`);

  console.log("\n── (3) HOLD Special → 20× tier (saitama_combo20), genuine multi-hit ──");
  await prep(40);
  const hold = await fireCombo(280);   // hold ≥ 200ms threshold
  await shot("hold_combo20");
  check("HOLD renders saitama_combo20_uniform", /saitama_combo20_uniform/.test(hold.sheet), `sheet=${hold.sheet}`);
  check(`HOLD is a multi-hit flurry (${hold.hits} hits / combo ${hold.maxCombo})`, hold.hits >= 2 || hold.maxCombo >= 2, `hits=${hold.hits} combo=${hold.maxCombo}`);
  check(`HOLD deals damage (${hold.dmg.toFixed(0)})`, hold.dmg > 0, `dmg=${hold.dmg}`);

  console.log("\n── (4) tiers are distinct: HOLD (20×) out-damages TAP (10×) ──");
  check(`HOLD out-damages TAP (${hold.dmg.toFixed(0)} > ${tap.dmg.toFixed(0)})`, hold.dmg > tap.dmg, `hold=${hold.dmg} tap=${tap.dmg}`);
  check("tiers render different sheets", /combo10/.test(tap.sheet) && /combo20/.test(hold.sheet), `tap=${tap.sheet} hold=${hold.sheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
