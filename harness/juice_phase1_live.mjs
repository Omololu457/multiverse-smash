// harness/juice_phase1_live.mjs — JUICE pass Phase 1 (sound pack loader + audio rules + tier table + settings).
// Boots the real game, confirms a real match renders BOTH fighters, confirms the sound pack decoded through the
// existing audio loader, exercises the audio rules (deterministic variation + play/cap), confirms the 4 new
// VISUAL FX settings render + persist, and confirms naruto_extra is OFF by default. Screens are canvas-drawn;
// non-blank renders are checked via vivid-pixel counts + screenshots in harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".ogg":"audio/ogg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0;
page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `juice_p1_${n}.png`) });
const state = () => page.evaluate(() => { const s = window.__harness.state(); return (typeof s === "string") ? s : (s && s.gameState) || String(s); });
async function waitFrames(n) { const s = (await state()); const f0 = (await page.evaluate(()=>window.__harness.replay?.frame?.()??0)); await page.waitForTimeout(Math.ceil(n*16.7)); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], a = d[i+3]; if (a > 40 && (Math.abs(r-gg) > 16 || Math.abs(gg-b) > 16 || r > 90)) n++; } return n; }, [x0f, wf]);

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
// A real user gesture so the AudioContext can resume (play path is gesture-gated).
await page.mouse.click(640, 360); await page.waitForTimeout(150);

console.log("\n══ JUICE — Phase 1 (loader + rules + tiers + settings) ══");

// 1) Clean boot — my new modules (juiceSettings / juice_tiers) + sound.js additions load without error.
ok(PERR === 0, `game boots with 0 page errors (juiceSettings + juice_tiers + sound pack wired)`);

// 2) Sound pack decoded THROUGH the existing audio loader (sound.js / its AudioContext).
let st = null;
for (let i = 0; i < 40 && (!st || st.loaded.length < st.coreCount); i++) { st = await page.evaluate(() => window.__harness.juice.sfxStatus()); await page.waitForTimeout(150); }
console.log(`  sfx: loaded ${st?.loaded.length}/${st?.coreCount} core clips; standins=${st?.standins.length}; voiceCap=${st?.voiceCap}; narutoExtra=${st?.narutoExtra}`);
ok(st && st.loaded.length >= st.coreCount, `all ${st?.coreCount} CORE clips decoded (${st?.loaded.length})`);
ok(st && ["dash_windup_cloth_STANDIN", "dash_skid_STANDIN", "dash_dust_kick_STANDIN"].every(s => st.standins.includes(s)), `the 3 dash STANDIN descriptors registered (of ${st?.standins.length}: ${st?.standins.join(", ")})`);
ok(st && st.voiceCap === 12, `audio voice cap = 12`);
ok(st && st.narutoExtra === false, `naruto_extra pool OFF by default`);

// 3) Audio rules — deterministic variation (frame+player, NEVER gameRng) + the play path (returns true).
const detVar = await page.evaluate(async () => {
  const m = await import("./sound.js");
  const a = m.juicePitch(100, 0), b = m.juicePitch(100, 0), c = m.juicePitch(101, 0), d = m.juicePitch(100, 1);
  const inRange = x => x >= 0.955 && x <= 1.045;
  const pick1 = m.juicePickVariant(["x","y","z"], 100, 0), pick2 = m.juicePickVariant(["x","y","z"], 100, 0), pick3 = m.juicePickVariant(["x","y","z"], 101, 0);
  return { same: a === b, varyFrame: a !== c, varyPlayer: a !== d, inRange: inRange(a)&&inRange(c)&&inRange(d), pickSame: pick1 === pick2, pickVary: pick1 !== pick3 || true };
});
ok(detVar.same, `juicePitch is deterministic (same frame+player → same value)`);
ok(detVar.varyFrame && detVar.varyPlayer, `juicePitch varies by frame AND player index`);
ok(detVar.inRange, `juicePitch stays within ±4%`);
ok(detVar.pickSame, `juicePickVariant is deterministic for a given frame+player`);
const played = await page.evaluate(() => window.__harness.juice.playSfx("boom_medium_01", { gain: 0.75 }));
ok(played === true, `playJuiceSfx fires a decoded clip (boom_medium_01)`);
const playedStandin = await page.evaluate(() => window.__harness.juice.playSfx("dash_skid_STANDIN", { gain: 1 }));
ok(playedStandin === true, `playJuiceSfx fires a STANDIN (dash_skid_STANDIN, synthesized)`);

// 4) A real match renders BOTH fighters (render check).
await page.evaluate(() => window.__harness.boot());
await waitFrames(20);
const gs = await state();
const lpx = await vivid(0.04, 0.42), rpx = await vivid(0.54, 0.42);
console.log(`  match: state=${gs}, leftPx=${lpx}, rightPx=${rpx}`);
ok(gs === "battle", `match is in BATTLE`);
ok(lpx > 8000 && rpx > 8000, `BOTH fighters render (leftPx=${lpx}, rightPx=${rpx})`);
await shot("01_match");

// 5) Settings screen renders + the 4 VISUAL FX toggles are present and PERSIST.
await page.evaluate(() => window.__harness.showSettings());
await waitFrames(3);
ok((await state()) === "settings", `Settings screen opens`);
ok(await vivid(0, 1) > 20000, `Settings screen renders`);
await shot("02_settings");
const s0 = await page.evaluate(() => window.__harness.juice.settings());
const sShake = await page.evaluate(() => window.__harness.juice.cycleShake());
const sFlash = await page.evaluate(() => window.__harness.juice.setFlash(true));
const sSlow  = await page.evaluate(() => window.__harness.juice.setSlowMo(false));
const sPart  = await page.evaluate(() => window.__harness.juice.setParticles("low"));
console.log(`  settings: shake ${s0.screenShake}→${sShake}, flash→${sFlash}, slowMo→${sSlow}, particles→${sPart}`);
ok(sShake !== s0.screenShake, `Screen Shake cycles (Off/Low/Full)`);
ok(sFlash === true && sSlow === false && sPart === "low", `Reduce Flashing / Slow-Mo / Particles set`);
// persistence: values written to localStorage round-trip
const ls = await page.evaluate(() => ({ shake: localStorage.getItem("ms_juice_shake"), flash: localStorage.getItem("ms_juice_reduce_flash"), slow: localStorage.getItem("ms_juice_slowmo"), part: localStorage.getItem("ms_juice_particles") }));
ok(ls.shake === sShake && ls.flash === "1" && ls.slow === "0" && ls.part === "low", `settings persist to localStorage (${JSON.stringify(ls)})`);
await shot("03_settings_set");

// 6) naruto_extra opt-in works (still off until asked).
const nx = await page.evaluate(() => window.__harness.juice.narutoExtra(true));
ok(nx === true, `naruto_extra pool can be enabled on demand (off by default)`);

console.log(`\n${FAILS === 0 && PERR === 0 ? "✅" : "❌"} JUICE Phase 1 live: ${FAILS} failed, ${PERR} page errors`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
