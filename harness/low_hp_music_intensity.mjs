// harness/low_hp_music_intensity.mjs — live verification for DYNAMIC MUSIC INTENSITY.
//
// Feature: when either fighter drops below 25% HP, OR it's the final (decider) round,
// the stage's calm track CROSSFADES (no hard cut) to a higher-energy library track that
// is franchise-paired (JJK stage → "Sukuna_Theme.mp3"). It reverts on heal / new round.
//
// This boots a REAL match (Jujutsu High stage → base "JJk_3.mp3"), drives P2 to low HP,
// and watches the crossfade mix move smoothly base→intense, then reverts on heal, then
// checks the final-round trigger. Uses the same window.__harness surface + headless
// autoplay flag as menu_music.test.mjs.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const ms = () => P(() => window.__harness.musicState());
const sleep = (t) => new Promise(r => setTimeout(r, t));
const base1 = f => (f || "").replace(/^\.\//, "");

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.boot, null, { timeout: 15000 });
  await page.mouse.click(640, 360);            // first-gesture unlock (audio)
  await P(() => window.__harness.boot());       // start match → BATTLE (stages[0] = Jujutsu High)
  await sleep(200);

  // ── BASELINE: calm stage track playing, no intensity ───────────────────────
  let s = await ms();
  check("base stage track is the calm JJK track", base1(s.fileSrc) === "JJk_3.mp3", `fileSrc=${base1(s.fileSrc)}`);
  check("intensity OFF at full HP, round 1", s.intense === false && s.latch === false, JSON.stringify({ intense: s.intense, latch: s.latch }));
  check("resolved intense pick is the franchise-paired Sukuna theme", base1(s.resolvedIntense) === "Sukuna_Theme.mp3", `resolvedIntense=${base1(s.resolvedIntense)}`);
  check("no intense layer element yet", s.intenseSrc === null, `intenseSrc=${base1(s.intenseSrc)}`);
  check("base layer at full mix", Math.abs((s.baseMix ?? 0) - 1) < 0.02 && Math.abs(s.intenseMix ?? 1) < 0.02, JSON.stringify({ baseMix: s.baseMix, intenseMix: s.intenseMix }));

  // ── TRIGGER: drive P2 below 25% HP ─────────────────────────────────────────
  await P(() => window.__harness.setP2Health(40));   // ~3% of ~1150 → well under 25%
  await sleep(120);                                   // a few frames for updateBattle → updateMusicIntensity
  s = await ms();
  check("intensity ENGAGES on low HP", s.intense === true && s.latch === true, JSON.stringify({ intense: s.intense, latch: s.latch }));
  check("intense layer is the paired Sukuna theme, and playing", base1(s.intenseSrc) === "Sukuna_Theme.mp3" && s.intensePaused === false, JSON.stringify({ intenseSrc: base1(s.intenseSrc), paused: s.intensePaused }));

  // ── SMOOTH CROSSFADE: sample the mix mid-blend (not a hard cut) ─────────────
  const mid = await ms();
  await sleep(1500);                                  // > crossfade window (1200ms)
  const done = await ms();
  const midBlending = mid.intenseMix > 0 && mid.intenseMix < 1;   // caught mid-transition → not an instant jump
  check("crossfade is mid-blend shortly after engage (no hard cut)", midBlending || (mid.intenseMix < done.intenseMix), JSON.stringify({ midIntenseMix: mid.intenseMix, doneIntenseMix: done.intenseMix }));
  check("crossfade completes to intense (base→0, intense→1)", done.intenseMix > 0.98 && done.baseMix < 0.02, JSON.stringify({ baseMix: done.baseMix, intenseMix: done.intenseMix }));
  check("intense layer audible, base layer silent after blend", done.intenseVol > 0.2 && done.baseVol < 0.05, JSON.stringify({ intenseVol: done.intenseVol, baseVol: done.baseVol }));
  check("base track still exists underneath (looping at vol 0, not stopped)", base1(done.fileSrc) === "JJk_3.mp3" && done.paused === false, JSON.stringify({ fileSrc: base1(done.fileSrc), paused: done.paused }));

  // ── REVERT ON HEAL ─────────────────────────────────────────────────────────
  await P(() => window.__harness.healP2());          // back to full HP, round still 1
  await sleep(120);
  const healLatch = await ms();
  check("intensity RELEASES when HP recovers", healLatch.intense === false && healLatch.latch === false, JSON.stringify({ intense: healLatch.intense, latch: healLatch.latch }));
  await sleep(1500);                                  // let the crossfade back finish
  const calm = await ms();
  check("crossfaded back to calm (base→1, intense→0)", calm.baseMix > 0.98 && calm.intenseMix < 0.02, JSON.stringify({ baseMix: calm.baseMix, intenseMix: calm.intenseMix }));
  check("intense layer torn down after revert", calm.intenseSrc === null, `intenseSrc=${base1(calm.intenseSrc)}`);
  check("base track restored to audible volume", calm.baseVol > 0.2, `baseVol=${calm.baseVol}`);

  // ── FINAL-ROUND TRIGGER (independent of HP) ─────────────────────────────────
  await P(() => window.__harness.setRoundNumber(3)); // decider round
  await sleep(120);
  const fr = await ms();
  check("intensity ENGAGES on the final round at full HP", fr.intense === true && base1(fr.intenseSrc) === "Sukuna_Theme.mp3", JSON.stringify({ intense: fr.intense, intenseSrc: base1(fr.intenseSrc) }));
  await P(() => window.__harness.setRoundNumber(1)); // back to a non-final round
  await sleep(1600);
  const fr2 = await ms();
  check("intensity releases again once it's no longer the final round", fr2.intense === false && fr2.intenseMix < 0.02, JSON.stringify({ intense: fr2.intense, intenseMix: fr2.intenseMix }));

  check("no page/JS errors during the run", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) {
  check("harness ran without throwing", false, String(e));
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}
