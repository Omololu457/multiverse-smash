// harness/sasuke_form_susanoo_live.mjs — REAL-INPUT verification that sasuke_adult and sasuke_sensei can
// enter the shared giant Susanoo on CHARGE + Ultimate (Lv1 -> re-press Lv2 -> revert), that it reuses the
// original Sasuke's lvl_1/lvl_2 body sheets, that while in Susanoo their SPECIAL fires the shared command-set
// (sword / arrow / grab), and that their EXISTING ultimates (adult directional ult / sensei Up+Ult eye-cycle)
// are UNCHANGED (a plain / Up Ultimate without Charge does NOT enter Susanoo).
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
const hasProj = (nm) => page.evaluate((n) => (window.__harness.projectiles?.() || []).some(p => p.name === n), nm);
const hasFx = (ss) => page.evaluate((s) => (window.__harness.projectiles?.() || []).some(p => p.name === "susanooFx" && (p.sheet || "").includes(s)), ss);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function fill() { await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(1); }
async function chargeUlt(keepCharge = false) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2); if (!keepCharge) await page.keyboard.up("p"); }
async function revert() { await page.evaluate(() => window.__harness.expireSusanoo?.()); await waitFrames(6); }
// clear p1's projectiles + reset spacing/cooldown (KEEPS _susanooStage) so each command-set sub-test is clean
async function clearProj() { await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.fillEnergy?.(); }); await waitFrames(2); }

async function boot(who) {
  perr = null;
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  await waitFrames(4);
}

// Full form test: enter Lv1 (grab is the Lv1 Special), escalate to Lv2 (arrow@far / sword@close), via REAL
// Charge+Ultimate. Asserts both stages, the shared body-swap, and all three command-set attacks.
async function runForm(tag) {
  await fill();
  await chargeUlt(true);                                   // Lv1 (keep Charge held for the escalation)
  let s = await snap(), sheet = await idleSheet(); await shot(`${tag}_lv1`);
  ok(s.susanooStage === 1, `[${tag}] Charge+Ultimate enters Susanoo Lv1 (stage=${s.susanooStage})`);
  ok(/sasuke_susanoo_lvl_1/.test(sheet || ""), `[${tag}] Lv1 body-swap uses the shared sheet (${(sheet || "").split("/").pop()})`);
  // GRAB — at Lv1 the Special is ALWAYS the ribcage command-grab (no arrow/sword unlocked yet).
  await clearProj();
  await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(3);
  ok(await hasFx("susanoo_grab"), `[${tag}] Lv1 Special = Susanoo GRAB (ribcage arm)`);
  // escalate to Lv2 (Charge still held → re-press Ultimate). clearProj first so attackCooldown<=0.
  await clearProj();
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await page.keyboard.up("p");
  await waitFrames(4);
  s = await snap(); sheet = await idleSheet(); await shot(`${tag}_lv2`);
  ok(s.susanooStage === 2, `[${tag}] re-press escalates to Lv2 (stage=${s.susanooStage})`);
  ok(/sasuke_susanoo_lvl_2/.test(sheet || ""), `[${tag}] Lv2 body-swap uses the shared sheet (${(sheet || "").split("/").pop()})`);
  // ARROW — Lv2 at long range (default spacing ~500 > 170).
  await clearProj();
  await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(3);
  ok(await hasProj("susanooArrow"), `[${tag}] Lv2 Special @far = Susanoo ARROW`);
  // SWORD — Lv2 at close range (bring p2 next to p1).
  await clearProj();
  await page.evaluate(() => window.__harness.setP2X?.((window.__harness.p1Snap().x) + 120)); await waitFrames(1);
  await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(3);
  ok(await hasFx("sword_attack"), `[${tag}] Lv2 Special @close = Susanoo SWORD`);
  await shot(`${tag}_sword`);
}

// ───────────────────────── SASUKE (ADULT) ─────────────────────────
await boot("sasuke_adult");
ok(!perr, `[adult] page loaded, no errors`);
await runForm("adult");
await revert();
let s = await snap(); let sheet = await idleSheet();
ok(s.susanooStage === 0 && !sheet, `[adult] reverts to base form (stage=${s.susanooStage}, skin=${sheet})`);
// EXISTING ult untouched: a PLAIN (no-Charge) Ultimate must NOT enter Susanoo (it fires the directional ult).
await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(4);
await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(4);
s = await snap();
ok(s.susanooStage === 0, `[adult] plain Ultimate (no Charge) does NOT enter Susanoo — directional ult untouched`);

// ───────────────────────── SASUKE (SENSEI) ─────────────────────────
await boot("sasuke_sensei");
ok(!perr, `[sensei] page loaded, no errors`);
// EXISTING Up+Ult eye-cycle untouched — tested on a FRESH state (no Charge): still rotates the eye-set, no Susanoo.
const eye0 = await eyeSet();
await page.keyboard.down("w"); await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u"); await page.keyboard.up("w");
await waitFrames(6);
const eye1 = await eyeSet(); s = await snap(); await shot("sensei_eyecycle");
ok(eye1 && eye1 !== eye0, `[sensei] Up+Ultimate (no Charge) still CYCLES the eye-set (${eye0} -> ${eye1})`);
ok(s.susanooStage === 0, `[sensei] the Up+Ult eye-cycle does NOT enter Susanoo`);
// Now the giant form + command-set.
await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(4);
await runForm("sensei");
await revert();
s = await snap();
ok(s.susanooStage === 0, `[sensei] reverts to base form (stage=${s.susanooStage})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/sus_*.png`);
process.exit(FAILS ? 1 : 0);
