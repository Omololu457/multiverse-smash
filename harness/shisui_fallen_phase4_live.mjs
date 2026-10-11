// harness/shisui_fallen_phase4_live.mjs — REAL live verification of SHISUI (FALLEN) Phase 4: KOTOAMATSUKAMI.
// Up+Ult (hook stamps _ultVariant="kotoamatsukami") → mind-control: the victim's _kotoMirror is set (L/R mirror
// + specials/ult lock), a crimson genjutsu-world overlay blooms on the caster, and a Clan-Hunter chip lands.
// EASTER EGG: cast on a fellow UCHIHA → longer control + a crimson curse-break eye (_kotoCurseBreak). Verifies
// both the vs-Uchiha and vs-non-Uchiha paths, the overlay render, and the chip. combat.js untouched.
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
const shot = n => page.screenshot({ path: path.join(OUT, `shisui_fallen_p4_${n}.png`) });
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
async function setup() {
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(560); window.__harness.setP2X?.(720); });
  await waitFrames(6);
}
const koto = () => page.evaluate(() => window.__harness.shisuiFallenUlt("kotoamatsukami"));
// crimson pixels anywhere on screen (the Fallen genjutsu-world wash)
async function crimsonPixels() {
  return page.evaluate(() => {
    const cv = document.querySelector("canvas"); if (!cv) return -1;
    const g = cv.getContext("2d"); const w = cv.width, h = cv.height;
    const d = g.getImageData(0, 0, w, h).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], a = d[i+3]; if (a > 40 && r > 90 && r > gg + 40 && r > b + 30) n++; }
    return n;
  });
}

async function run(oppKey, isUchiha) {
  console.log(`\n── Kotoamatsukami vs ${oppKey} (${isUchiha ? "UCHIHA — easter egg" : "non-Uchiha"}) ──`);
  await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=${oppKey}`);
  await toBattle("Hidden Leaf Village");
  const h0 = (await p2()).health; const e0 = (await p1()).energy;
  const r = await koto(); await waitFrames(4);
  const cs = await p1(); const foe = await p2();
  console.log(`  cast=${r.cast}, energy ${Math.round(e0)}→${cs.energy}, kotoOverlay=${cs.kotoOverlay}, curseBreak=${cs.kotoCurseBreak}, victim kotoMirror=${foe.kotoMirror}`);
  ok(r.cast && cs.energy <= 25, `Kotoamatsukami fires + spends the meter`);
  ok(cs.kotoOverlay > 0, `genjutsu-world overlay blooms on the caster (${cs.kotoOverlay})`);
  ok(foe.kotoMirror > 0, `victim is mind-controlled — L/R mirror + specials/ult lock (kotoMirror=${foe.kotoMirror})`);
  if (isUchiha) {
    ok(cs.kotoCurseBreak > 0, `EASTER EGG — curse-break eye blooms vs an Uchiha (${cs.kotoCurseBreak})`);
    ok(foe.kotoMirror > 200, `vs-Uchiha control runs longer (kotoMirror=${foe.kotoMirror} > 200)`);
  } else {
    ok(cs.kotoCurseBreak === 0, `no curse-break eye vs a non-Uchiha`);
    ok(foe.kotoMirror > 0 && foe.kotoMirror <= 200, `standard control window vs non-Uchiha (kotoMirror=${foe.kotoMirror})`);
  }
  await waitFrames(16);   // let the genjutsu-world overlay fade fully in (~18f ease) before sampling
  const px = await crimsonPixels();
  console.log(`  crimson genjutsu-world pixels (at peak) = ${px}`);
  ok(px > 20000, `the crimson genjutsu-world renders (px=${px})`);
  await shot(isUchiha ? "uchiha" : "generic");
  // chip damage as the genjutsu takes hold (scheduled ~30f from cast)
  await waitFrames(20);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  genjutsu chip: foe Δ${dmg}`);
  ok(dmg > 0, `Kotoamatsukami lands a Clan-Hunter chip (Δ=${dmg})`);
}

console.log("\n══ SHISUI (FALLEN) — PHASE 4: KOTOAMATSUKAMI ══");
await run("naruto", false);     // non-Uchiha → standard control
await run("itachi", true);      // UCHIHA → easter egg: longer control + curse-break eye

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Phase 4`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
