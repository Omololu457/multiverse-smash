// harness/sz_hitsound_phase1_live.mjs — SPARKING ZERO hit-sound pack, Phase 1 (loader + mapping + tiers LIGHT–HEAVY + per-player setting).
// Boots the REAL game, starts a REAL match (render-checks BOTH fighters), confirms the 37-clip pack decoded THROUGH the existing
// audio loader, fires LIGHT/MEDIUM/HEAVY hits (Sparking) + Classic hits, and reads the audio-event log (clip/frame/gain) so the
// mapping can be verified from text (the sound can't be heard in a report). Also checks: no clip twice in a row per player, the
// voice cap holds under spam, the per-player setting persists, and the Sparking FINISHER layers long-tail + boom.
// Serve root defaults to the repo (working tree); set SZ_SERVE_ROOT to boot an archived mine-only tree.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const REPO = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const ROOT = process.env.SZ_SERVE_ROOT || REPO;
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".ogg":"audio/ogg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `sz_p1_${n}.png`) });
const state = () => page.evaluate(() => { const s = window.__harness.state(); return (typeof s === "string") ? s : (s && s.gameState) || String(s); });
const waitFrames = async n => page.waitForTimeout(Math.ceil(n * 16.7));
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || Math.abs(d[i+1]-d[i+2]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.mouse.click(640, 360); await waitFrames(10);   // user gesture → AudioContext resume (play path is gesture-gated)

console.log("\n══ SPARKING ZERO hit sounds — Phase 1 (loader + mapping + tiers L–H + setting) ══");
ok(PERR === 0, "game boots with 0 page errors (sfx_map + sound.js + juiceSettings + game.js wired)");

// 1) Pack decoded THROUGH the existing audio loader (sound.js), preloaded alongside the core pack.
let st = null;
for (let i = 0; i < 60 && (!st || (st.sparkingLoaded || 0) < (st.sparkingCount || 37)); i++) { st = await page.evaluate(() => window.__harness.juice.sfxStatus()); await waitFrames(8); }
console.log(`  sfx: core ${st?.loaded?.length}/${st?.coreCount}; sparking ${st?.sparkingLoaded}/${st?.sparkingCount}; voiceCap=${st?.voiceCap}`);
ok(st && st.sparkingCount === 37, `pack registers 37 clips (${st?.sparkingCount})`);
ok(st && st.sparkingLoaded === 37, `all 37 Sparking clips decoded through the loader (${st?.sparkingLoaded})`);

// 2) Real match renders BOTH fighters (render check).
await page.evaluate(() => window.__harness.boot());
await waitFrames(24);
const gs = await state(); const lpx = await vivid(0.04, 0.42), rpx = await vivid(0.54, 0.42);
console.log(`  match: state=${gs}, leftPx=${lpx}, rightPx=${rpx}`);
ok(gs === "battle", "match is in BATTLE");
ok(lpx > 8000 && rpx > 8000, `BOTH fighters render (L=${lpx}, R=${rpx})`);
await shot("01_match");

// 3) Per-player setting: P1 = Sparking (default), P2 = Classic. Persists to localStorage, audio-only.
await page.evaluate(() => { window.__harness.juice.setHitSoundPack(0, "sparking"); window.__harness.juice.setHitSoundPack(1, "classic"); });
const hs = await page.evaluate(() => window.__harness.juice.hitSoundSettings());
const lsp = await page.evaluate(() => ({ p1: localStorage.getItem("ms_hitsound_p1"), p2: localStorage.getItem("ms_hitsound_p2") }));
ok(hs.p1 === "sparking" && hs.p2 === "classic", `per-player packs set (P1=${hs.p1}, P2=${hs.p2})`);
ok(lsp.p1 === "sparking" && lsp.p2 === "classic", `setting persists to localStorage (${JSON.stringify(lsp)})`);

// 4) Fire tiered hits and read the audio-event log. P1 (player 0) = Sparking, P2 (player 1) = Classic.
await page.evaluate(() => window.__harness.juice.szQuiesce());   // freeze real combat (both invuln) so it can't interleave the audio-log tests
await page.evaluate(() => window.__harness.juice.clearHitSfxLog());
const fire = async (tier, who, times) => { for (let k = 0; k < times; k++) { await page.evaluate(([t, w]) => window.__harness.juice.hit(t, w), [tier, who]); await waitFrames(5); } };
await fire("light", "p1", 4);
await fire("medium", "p1", 3);
await fire("heavy", "p1", 3);
await fire("finisher", "p1", 1);   // Sparking finisher = long-tail + boom (wired in Phase 2)
await fire("medium", "p2", 2);     // Classic pack
await fire("finisher", "p2", 1);   // Classic pack
const log = await page.evaluate(() => window.__harness.juice.hitSfxLog());

console.log("\n  ── AUDIO EVENT LOG (clip · frame · gain) ──");
for (const e of log) console.log(`  f${String(e.frame).padStart(5)} P${e.player} ${e.pack.padEnd(8)} ${e.tier.padEnd(8)} ${e.role.padEnd(7)} ${e.clip.padEnd(20)} gain ${e.gain}`);

const P1 = log.filter(e => e.player === 0), P2 = log.filter(e => e.player === 1);
const clk = /^sz_click_\d\d$/, shortc = /^sz_hit_short_\d\d$/, longc = /^sz_hit_long_tail_\d\d$/;
const longHeavy = c => longc.test(c) && +c.slice(-2) >= 1 && +c.slice(-2) <= 8;
// LIGHT (Sparking): click primary @0.40 + quiet short layer @0.35
const lP = P1.filter(e => e.tier === "light" && e.role === "primary"), lL = P1.filter(e => e.tier === "light" && e.role === "layer");
ok(lP.length > 0 && lP.every(e => e.pack === "sparking" && clk.test(e.clip) && e.gain === 0.40), `LIGHT primary = sz_click_* @0.40 (${lP.map(e=>e.clip).join(",")})`);
ok(lL.length > 0 && lL.every(e => shortc.test(e.clip) && e.gain === 0.35), `LIGHT layer = quiet sz_hit_short_* @0.35 (${lL.map(e=>e.clip).join(",")})`);
// MEDIUM (Sparking): short @0.55, single
const mP = P1.filter(e => e.tier === "medium" && e.role === "primary");
ok(mP.length > 0 && mP.every(e => e.pack === "sparking" && shortc.test(e.clip) && e.gain === 0.55 && !P1.some(x=>x!==e&&x.tier==="medium"&&x.role==="layer")), `MEDIUM = sz_hit_short_* @0.55, no layer (${mP.map(e=>e.clip).join(",")})`);
// HEAVY (Sparking): long_tail 01..08 @0.75
const hP = P1.filter(e => e.tier === "heavy" && e.role === "primary");
ok(hP.length > 0 && hP.every(e => e.pack === "sparking" && longHeavy(e.clip) && e.gain === 0.75), `HEAVY = sz_hit_long_tail_01..08 @0.75 (${hP.map(e=>e.clip).join(",")})`);
// FINISHER (Sparking): long-tail 09..14 + the earlier pack's boom (wired in Phase 2).
const fP1 = P1.filter(e => e.tier === "finisher");
ok(fP1.some(e => e.role === "longtail" && e.pack === "sparking") && fP1.some(e => e.role === "boom"), `FINISHER (Sparking) = long-tail + boom (Phase 2) (${fP1.map(e=>e.role+":"+e.clip).join(",")})`);
// P2 CLASSIC: medium = the exact prior clip (hit_flurry_01 @0.55); finisher = hit_heavy_boom_01 @0.90
const mP2 = P2.filter(e => e.tier === "medium" && e.role === "primary");
ok(mP2.length > 0 && mP2.every(e => e.pack === "classic" && e.clip === "hit_flurry_01" && e.gain === 0.55), `P2 Classic MEDIUM = hit_flurry_01 @0.55 (exact prior sound)`);
const fP2 = P2.filter(e => e.tier === "finisher");
ok(fP2.length > 0 && fP2.every(e => e.pack === "classic" && e.clip === "hit_heavy_boom_01" && e.gain === 0.90), `P2 Classic FINISHER = hit_heavy_boom_01 @0.90`);

// 5) Never the same SPARKING clip twice in a row for the same player (primary channel).
//    (Classic intentionally uses fixed single clips — repeating is the exact prior behavior, not a bug.)
const noRepeat = arr => { for (let i = 1; i < arr.length; i++) if (arr[i].clip === arr[i-1].clip) return false; return true; };
ok(noRepeat(P1.filter(e => e.pack === "sparking" && e.role === "primary")), "P1 Sparking: no primary clip twice in a row");
// Dedicated no-repeat stress: put P2 on Sparking and fire a MEDIUM string (one pool) in ONE synchronous
// burst, so no sim tick (real combat) interleaves a different clip into P2's sequence. Drain active voices
// first (the ~12-voice cap would otherwise drop later hits in a single-instant burst → fewer logged).
await page.evaluate(() => window.__harness.juice.szQuiesce()); await waitFrames(90);   // let the juice voice pool drain
await page.evaluate(() => { window.__harness.juice.setHitSoundPack(1, "sparking"); window.__harness.juice.szQuiesce(); window.__harness.juice.clearHitSfxLog(); for (let k = 0; k < 8; k++) window.__harness.juice.hit("medium", "p2"); });
const p2spark = (await page.evaluate(() => window.__harness.juice.hitSfxLog())).filter(e => e.player === 1 && e.role === "primary");
ok(p2spark.length >= 6 && p2spark.every(e => e.pack === "sparking" && shortc.test(e.clip)) && noRepeat(p2spark), `P2 Sparking: ${p2spark.length} MEDIUM hits, none twice in a row (${p2spark.map(e=>e.clip.slice(-2)).join(" ")})`);
await page.evaluate(() => window.__harness.juice.setHitSoundPack(1, "classic"));   // restore the per-player split for the report

// 6) Voice cap holds under spam (12-cap; non-boom beyond the cap is dropped → playSfx returns false).
const spam = await page.evaluate(() => { let played = 0; for (let i = 0; i < 40; i++) if (window.__harness.juice.playSfx("sz_hit_short_01", { gain: 0.3 })) played++; return { played, cap: window.__harness.juice.sfxStatus().voiceCap, active: window.__harness.juice.sfxStatus().activeVoices }; });
console.log(`  voice-cap spam: played=${spam.played}/40, cap=${spam.cap}, active=${spam.active}`);
ok(spam.played <= spam.cap && spam.active <= spam.cap, `voice cap holds (≤${spam.cap} simultaneous; played ${spam.played}, active ${spam.active})`);

// 7) Settings screen renders with the new Hit Sounds row.
await page.evaluate(() => window.__harness.showSettings());
await waitFrames(3);
ok((await state()) === "settings" && await vivid(0, 1) > 20000, "Settings screen renders (with Hit Sounds row)");
await shot("02_settings");

console.log(`\n${FAILS === 0 && PERR === 0 ? "✅" : "❌"} SZ hit sounds Phase 1 live: ${FAILS} failed, ${PERR} page errors`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
