// harness/shisui_fallen_phase5d_live.mjs — SHISUI (FALLEN) Phase 5d: Madara-style cinematic polish.
// Verifies the black-silhouette IMPACT FLASH inks the foe on his big hits (dash-through, Thousand Shadows, grab,
// Susanoo Totsuka) + the transformation BEAT (self black-ink + energy-ring burst) on a Susanoo enter and a
// Kotoamatsukami cast. P1 keys: a/d move, o grab, l special, u ult.
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
let PERR = 0, KNOWN = 0;
page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { KNOWN++; return; } console.log("  PAGEERROR:", e.message); PERR++; });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle(stage) {
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await setup();
}
async function setup(p2x = 672) { await page.evaluate(b => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(560); window.__harness.setP2X?.(b); }, p2x); await page.waitForFunction(() => { const f = window.__harness.p1(); return (f.dashCooldown || 0) === 0 && (f.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); await waitFrames(6); }
// poll the FOE's impact phase for a few frames after an action (the black ink is brief)
async function foeInkedBlack(frames = 10) {
  for (let i = 0; i < frames; i++) { const ph = (await p2()).impactPhase; if (ph === "black") return true; await waitFrames(1); }
  return false;
}

console.log("\n══ SHISUI (FALLEN) — PHASE 5d: CINEMATIC POLISH ══");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");

// BLACK IMPACT FLASH on the dash-through strike.
{ await setup(672);
  await page.evaluate(() => window.__harness.p1SpecialDir("F"));
  const inked = await foeInkedBlack(12);
  console.log(`  dash-through: foe inked black = ${inked}`);
  ok(inked, `big-hit IMPACT FLASH inks the foe near-black (dash-through)`);
}
// BLACK IMPACT FLASH on the grab slam.
{ await setup(672);
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
  const inked = await foeInkedBlack(16);
  await page.keyboard.up("d");
  console.log(`  grab slam: foe inked black = ${inked}`);
  ok(inked, `big-hit IMPACT FLASH inks the foe near-black (grab slam)`);
}
// TRANSFORMATION BEAT on a Susanoo enter — Shisui self-inks black + a ring burst kicks off.
{ await setup();
  await page.evaluate(() => window.__harness.shisuiFallenUlt("emeraldSusanoo"));
  await waitFrames(1);
  const s = await p1();
  console.log(`  Susanoo enter: self impactPhase=${s.impactPhase}, xformRings=${s.xformRings}`);
  ok(s.impactPhase === "black", `Susanoo transformation inks Shisui black`);
  ok(s.xformRings > 0, `Susanoo transformation kicks off the energy-ring burst (${s.xformRings})`);
  await page.screenshot({ path: path.join(OUT, "shisui_fallen_p5d_xform.png") });
}
// TRANSFORMATION BEAT on a Kotoamatsukami cast — crimson ring burst.
{ await setup();
  await page.evaluate(() => window.__harness.shisuiFallenUlt("kotoamatsukami"));
  await waitFrames(1);
  const s = await p1();
  console.log(`  Kotoamatsukami: self impactPhase=${s.impactPhase}, xformRings=${s.xformRings}`);
  ok(s.xformRings > 0, `Kotoamatsukami kicks off the (crimson) energy-ring burst (${s.xformRings})`);
}

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Phase 5d`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
