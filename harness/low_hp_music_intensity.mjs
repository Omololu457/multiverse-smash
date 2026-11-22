// harness/low_hp_music_intensity.mjs — live verification for DYNAMIC MUSIC INTENSITY.
//
// CHANGED 2026-11-21 (user request): the low-HP / final-round crossfade to a hype track is GONE — the stage's
// song must never change mid-match (it kept switching to "Who Want Smoke"). This now checks the song stays put
// while the tension latch (announcer / vignette) still fires.
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

  // ── USER REQUEST (2026-11-21): the stage's song must NEVER change mid-match. Low HP and the final round still set
  //    the tension latch (announcer line, low-HP vignette), but no second song starts and the stage song stays audible.
  const steady = (st, label) => {
    check(`${label}: no second song starts`, st.intense === false && !st.intenseSrc, JSON.stringify({ intense: st.intense, intenseSrc: base1(st.intenseSrc) }))
    check(`${label}: the stage song keeps playing (full mix; only the announcer ducks it)`, base1(st.fileSrc) === "JJk_3.mp3" && st.paused === false && st.baseMix > 0.98 && st.baseVol > 0.1, JSON.stringify({ fileSrc: base1(st.fileSrc), paused: st.paused, baseMix: st.baseMix, baseVol: st.baseVol }))
  }
  await P(() => window.__harness.setP2Health(40));   // ~3% of ~1150 → well under 25%
  await sleep(120)
  s = await ms()
  check("low HP still sets the tension latch (announcer / vignette)", s.latch === true, JSON.stringify({ latch: s.latch }))
  await sleep(1500); steady(await ms(), "low HP")
  await P(() => window.__harness.healP2()); await sleep(300)
  check("latch releases when HP recovers", (await ms()).latch === false)
  await P(() => window.__harness.setRoundNumber(3)); await sleep(1500)
  steady(await ms(), "final round")
  await P(() => window.__harness.setRoundNumber(1)); await sleep(300)

  check("no page/JS errors during the run", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) {
  check("harness ran without throwing", false, String(e));
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}
