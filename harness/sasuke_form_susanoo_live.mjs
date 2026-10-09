// harness/sasuke_form_susanoo_live.mjs — REAL-INPUT verification that sasuke_adult and sasuke_sensei can
// enter the shared giant Susanoo on CHARGE + Ultimate (Lv1 -> re-press Lv2 -> revert), that it reuses the
// original Sasuke's lvl_1/lvl_2 body sheets, and that their EXISTING ultimates (adult directional ult /
// sensei Up+Ult eye-cycle) are UNCHANGED (a plain / Up Ultimate without Charge does NOT enter Susanoo).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let perr = null; page.on("pageerror", e => { perr = e.message; console.log("  PAGEERROR:", e.message); });
const shot = n => page.screenshot({ path: path.join(OUT, `sus_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const snap = () => page.evaluate(() => window.__harness.p1Snap());
const idleSheet = () => page.evaluate(() => window.__harness.skinAnimDump(["idle"]).entries[0]?.sheet || null);
const eyeSet = () => page.evaluate(() => window.__harness.dojutsu("p1")?.eyeSet || null);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function fill() { await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(1); }
// Hold Charge (P) + tap Ultimate (U). keepCharge=true leaves P held for an escalation re-press.
async function chargeUlt(keepCharge = false) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2); if (!keepCharge) await page.keyboard.up("p"); }
async function revert() { await page.evaluate(() => window.__harness.expireSusanoo?.()); await waitFrames(6); }

async function boot(who) {
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  await waitFrames(4);
}

// ───────────────────────── SASUKE (ADULT) ─────────────────────────
await boot("sasuke_adult");
ok(!perr, `[adult] page loaded, no errors`);
await fill();
await chargeUlt(true);                                   // Lv1 (keep Charge held for the escalation)
let s = await snap(); let sheet = await idleSheet(); await shot("adult_lv1");
ok(s.susanooStage === 1, `[adult] Charge+Ultimate enters Susanoo Lv1 (stage=${s.susanooStage})`);
ok(/sasuke_susanoo_lvl_1/.test(sheet || ""), `[adult] Lv1 body-swap uses the shared sheet (${(sheet||"").split("/").pop()})`);
await waitFrames(18);                                    // clear the 15f escalation lock
await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await page.keyboard.up("p");  // re-press (Charge still held) -> Lv2
await waitFrames(4);
s = await snap(); sheet = await idleSheet(); await shot("adult_lv2");
ok(s.susanooStage === 2, `[adult] re-press escalates to Lv2 (stage=${s.susanooStage})`);
ok(/sasuke_susanoo_lvl_2/.test(sheet || ""), `[adult] Lv2 body-swap uses the shared sheet (${(sheet||"").split("/").pop()})`);
await revert();
s = await snap(); sheet = await idleSheet();
ok(s.susanooStage === 0 && !sheet, `[adult] reverts to base form (stage=${s.susanooStage}, skin=${sheet})`);
// EXISTING ult untouched: a PLAIN (no-Charge) Ultimate must NOT enter Susanoo (it fires the directional ult).
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
await waitFrames(2);
await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(4);
s = await snap();
ok(s.susanooStage === 0, `[adult] plain Ultimate (no Charge) does NOT enter Susanoo — directional ult untouched`);

// ───────────────────────── SASUKE (SENSEI) ─────────────────────────
perr = null;
await boot("sasuke_sensei");
ok(!perr, `[sensei] page loaded, no errors`);
await fill();
await chargeUlt(false);                                  // Lv1
s = await snap(); sheet = await idleSheet(); await shot("sensei_lv1");
ok(s.susanooStage === 1, `[sensei] Charge+Ultimate enters Susanoo Lv1 (stage=${s.susanooStage})`);
ok(/sasuke_susanoo_lvl_1/.test(sheet || ""), `[sensei] Lv1 body-swap uses the shared sheet (${(sheet||"").split("/").pop()})`);
await revert();
s = await snap();
ok(s.susanooStage === 0, `[sensei] reverts to base form (stage=${s.susanooStage})`);
// EXISTING Up+Ult eye-cycle untouched: Up+Ultimate (no Charge) still rotates the eye-set, does NOT enter Susanoo.
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(2);
const eye0 = await eyeSet();
await page.keyboard.down("w"); await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u"); await page.keyboard.up("w");
await waitFrames(6);
const eye1 = await eyeSet(); s = await snap(); await shot("sensei_eyecycle");
ok(eye1 && eye1 !== eye0, `[sensei] Up+Ultimate (no Charge) still CYCLES the eye-set (${eye0} -> ${eye1})`);
ok(s.susanooStage === 0, `[sensei] the Up+Ult eye-cycle does NOT enter Susanoo`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/sus_*.png`);
process.exit(FAILS ? 1 : 0);
