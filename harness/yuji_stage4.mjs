// harness/yuji_stage4.mjs — Stage 4 evidence for Yuji's "Koma" REPEAT engine (isolation test; the
// Ultimate trigger lands in Stage 5). Proves the mash-extend flurry → auto-chain finisher:
//   • start → FLURRY phase (loops yuji_koma1), each attack-button MASH = +1 hit (raw-key edge, not buffered)
//   • CAP: mashing past the cap stops adding hits (no infinite extension) → auto-finisher
//   • STOP mashing → after the grace window, auto-chains to the FINISHER (yuji_koma2) launcher, then ends
//   • MORE mashes = MORE hits/damage (the defining "REPEAT" property)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p2 = () => page.evaluate(() => window.__harness.p2());
const koma = () => page.evaluate(() => window.__harness.komaState());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function mash() { await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j"); await waitFrames(1); }
async function prep(gap = 40) {
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP1(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const a = await page.evaluate(() => window.__harness.p1()); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const shot = name => page.screenshot({ path: path.join(OUT, `yuji_s4_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setSession?.({ dummyBehavior: "stand" }));
  await waitFrames(6);

  // ── START → FLURRY ──
  section("start → FLURRY phase (loops yuji_koma1)");
  await prep(40);
  const started = await page.evaluate(() => window.__harness.startKoma());
  await waitFrames(2);
  let k = await koma();
  check("startKoma begins the release", started === true && k.active, `active=${k.active}`);
  check("phase = flurry", k.phase === "flurry", `phase=${k.phase}`);
  check("flurry sprite = yuji_koma1_uniform", (k.spriteSheet || "").includes("yuji_koma1_uniform"), `sheet=${k.spriteSheet}`);
  await shot("flurry");

  // ── CAP: mash far past the cap → hits stop at cap, then auto-finisher ──
  section("mash past the CAP → hits stop at cap (no infinite extension)");
  const h0 = (await p2()).health;
  for (let i = 0; i < 16; i++) { await mash(); }   // 16 mashes >> cap
  k = await koma();
  const capHits = k.hits;   // may already be in finisher; hits is latched at cap
  const flurryDmg = h0 - (await p2()).health;
  check("hit count capped at 10 (not 16)", capHits === 10, `hits=${capHits}`);
  check("flurry dealt damage (multi-hit)", flurryDmg > 0, `−${flurryDmg.toFixed(0)}`);
  check("capped flurry auto-advanced to finisher", k.phase === "finisher" || !k.active, `phase=${k.phase} active=${k.active}`);
  // let the finisher resolve
  await page.waitForFunction(() => !window.__harness.komaState().active, null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("release ended (returns to neutral)", !(await koma()).active, `active=${(await koma()).active}`);

  // ── STOP MASHING → grace elapses → FINISHER (yuji_koma2) ──
  section("stop mashing → auto-chain to FINISHER (yuji_koma2)");
  await prep(40);
  await page.evaluate(() => window.__harness.startKoma());
  await waitFrames(2);
  for (let i = 0; i < 3; i++) { await mash(); }    // only 3 mashes, then stop
  const midHits = (await koma()).hits;
  // Stop mashing and sample a per-frame timeline through grace → finisher → end (mirrors the raw probe:
  // no intervening waitForFunction awaits that would race the fast finisher).
  const timeline = []; let preFinHp = null, finalHp = null, sawFinisher = false, koma2Rendered = false;
  for (let i = 0; i < 80; i++) {
    const kk = await koma(); const hp = (await p2()).health;
    if (kk.phase === "finisher") { sawFinisher = true; if (preFinHp === null) preFinHp = hp; }
    if ((kk.spriteSheet || "").includes("yuji_koma2_uniform")) koma2Rendered = true;
    if (kk.phase === "finisher" && !timeline.length) await shot("finisher");
    timeline.push(kk.active);
    if (!kk.active) { finalHp = hp; break; }
    await waitFrames(1);
  }
  if (finalHp === null) finalHp = (await p2()).health;
  const finisherDmg = (preFinHp ?? finalHp) - finalHp;
  check("only 3 mashes registered (not capped)", midHits === 3, `hits=${midHits}`);
  check("stopping mash triggered the finisher", sawFinisher, `sawFinisher=${sawFinisher}`);
  check("finisher sprite = yuji_koma2_uniform", koma2Rendered, `rendered=${koma2Rendered}`);
  check("finisher blow landed (extra damage)", finisherDmg > 0, `−${finisherDmg.toFixed(0)}`);
  check("release ended after finisher", !(await koma()).active, `active=${(await koma()).active}`);

  // ── REPEAT PROPERTY: more mashes = more total damage ──
  section("REPEAT property — more mashes = more damage");
  async function komaRun(mashes) {
    await prep(40);
    await page.evaluate(() => window.__harness.startKoma());
    await waitFrames(2);
    const hp0 = (await p2()).health;
    for (let i = 0; i < mashes; i++) { await mash(); }
    await page.waitForFunction(() => !window.__harness.komaState().active, null, { timeout: 4000, polling: 16 }).catch(() => {});
    return hp0 - (await p2()).health;
  }
  const dmg2 = await komaRun(2);
  const dmg8 = await komaRun(8);
  check("8-mash release out-damages 2-mash release", dmg8 > dmg2, `8-mash=−${dmg2 < dmg8 ? dmg8.toFixed(0) : dmg8.toFixed(0)}  vs  2-mash=−${dmg2.toFixed(0)}`);

  section("stability");
  check("no JS errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
