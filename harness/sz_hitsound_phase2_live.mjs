// harness/sz_hitsound_phase2_live.mjs — SPARKING ZERO hit-sound pack, Phase 2
// (FINISHER/ULTIMATE layering + multi-hit FLURRY + rapid-fire BARRAGE + interrupt fade + impact-frame sync).
// Boots the REAL game, starts a REAL match (render-checks BOTH fighters), then drives the audio paths via the
// __harness hooks and reads the audio-event log (clip/frame/gain/role) — the sound can't be heard in a report.
// Serve root defaults to the repo; set SZ_SERVE_ROOT to boot an archived mine-only tree.
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
const shot = n => page.screenshot({ path: path.join(OUT, `sz_p2_${n}.png`) });
const state = () => page.evaluate(() => { const s = window.__harness.state(); return (typeof s === "string") ? s : (s && s.gameState) || String(s); });
const waitFrames = async n => page.waitForTimeout(Math.ceil(n * 16.7));
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || Math.abs(d[i+1]-d[i+2]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const log = () => page.evaluate(() => window.__harness.juice.hitSfxLog());
const clearLog = () => page.evaluate(() => window.__harness.juice.clearHitSfxLog());

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.mouse.click(640, 360); await waitFrames(10);

console.log("\n══ SPARKING ZERO hit sounds — Phase 2 (finisher + flurry + barrage + sync) ══");
ok(PERR === 0, "game boots with 0 page errors");
let st = null; for (let i = 0; i < 60 && (!st || (st.sparkingLoaded||0) < 37); i++) { st = await page.evaluate(() => window.__harness.juice.sfxStatus()); await waitFrames(8); }
ok(st && st.sparkingLoaded === 37, `37 Sparking clips decoded (${st?.sparkingLoaded})`);

await page.evaluate(() => window.__harness.boot()); await waitFrames(24);
const gs = await state(); const lpx = await vivid(0.04, 0.42), rpx = await vivid(0.54, 0.42);
ok(gs === "battle", "match is in BATTLE");
ok(lpx > 8000 && rpx > 8000, `BOTH fighters render (L=${lpx}, R=${rpx})`);
await page.evaluate(() => { window.__harness.juice.setHitSoundPack(0, "sparking"); window.__harness.juice.setHitSoundPack(1, "sparking"); });
await shot("01_match");

const longFin = /^sz_hit_long_tail_(09|1[0-4])$/, booms = ["boom_huge_01","boom_huge_02_roar"], flurryc = /^sz_flurry_\d\d$/, barragec = /^sz_barrage_\d\d$/;

// 1) FINISHER / ULTIMATE connect: long-tail 09..14 @1.0 + earlier-pack boom @1.0 + rumble @0.6, on the impact frame.
await clearLog();
await page.evaluate(() => window.__harness.juice.hit("finisher", "p1")); await waitFrames(10);
const fin = await log();
console.log("\n  ── FINISHER event log ──"); for (const e of fin) console.log(`  f${e.frame} P${e.player} ${e.pack} ${e.tier} ${e.role.padEnd(8)} ${e.clip.padEnd(20)} gain ${e.gain}`);
ok(fin.some(e => e.role === "longtail" && longFin.test(e.clip) && e.gain === 1.0), "FINISHER long-tail = sz_hit_long_tail_09..14 @1.0");
ok(fin.some(e => e.role === "boom" && booms.includes(e.clip) && e.gain === 1.0), "FINISHER + earlier-pack boom (boom_huge_*) @1.0");
ok(fin.some(e => e.role === "rumble" && e.clip === "rumble_tail_01" && e.gain === 0.6), "FINISHER + rumble_tail_01 @0.6");
ok(fin.length <= 3, `≤3 layers stacked on the finisher (${fin.length})`);

// 2) MULTI-HIT FLURRY: 5 rapid same-move hits → ONE flurry clip; per-hit impacts suppressed after hit 3.
await clearLog(); await page.evaluate(() => window.__harness.juice.szForceInterrupt("p1")); await waitFrames(25);   // clear any prior streak
await clearLog();
for (let k = 0; k < 5; k++) { await page.evaluate(() => window.__harness.juice.hitMove("light", "p1", "PalmRush")); await waitFrames(4); }
const fl = await log();
console.log("\n  ── FLURRY event log ──"); for (const e of fl) console.log(`  f${e.frame} P${e.player} ${e.tier.padEnd(7)} ${e.role.padEnd(12)} ${e.clip}`);
const streamStart = fl.find(e => e.role === "stream-start");
const perHitAfterStream = streamStart ? fl.filter(e => e.role === "primary" && e.frame > streamStart.frame).length : -1;
const sFl = await page.evaluate(() => window.__harness.juice.szStreak(0));
ok(streamStart && flurryc.test(streamStart.clip) && streamStart.tier === "flurry", `3+-hit rush → ONE flurry clip (${streamStart?.clip})`);
ok(fl.filter(e => e.role === "primary").length === 2, `first 2 hits play per-hit impacts, then the flurry OWNS it (${fl.filter(e=>e.role==="primary").length} per-hit)`);
ok(perHitAfterStream === 0, `no per-hit impacts after the flurry starts (suppressed) (${perHitAfterStream})`);
ok(sFl && sFl.streaming && sFl.kind === "flurry" && sFl.count >= 5, `streak live: kind=${sFl?.kind}, count=${sFl?.count}`);

// 3) INTERRUPT: the attacker is hit mid-rush → the flurry stops early (with a fade); streak clears.
await page.evaluate(() => window.__harness.juice.szForceInterrupt("p1")); await waitFrames(4);
const sAfter = await page.evaluate(() => window.__harness.juice.szStreak(0));
ok(sAfter === null, "flurry interrupted → stream fades out + streak clears");

// 4) BARRAGE: a rapid energy string (barrage-keyword move) → single sz_barrage_* clip over the move.
await clearLog(); await page.evaluate(() => window.__harness.juice.szForceInterrupt("p1")); await waitFrames(25);
await clearLog();
for (let k = 0; k < 8; k++) { await page.evaluate(() => window.__harness.juice.hitMove("medium", "p1", "Ki Barrage")); await waitFrames(2); }
const bar = await log();
const barStart = bar.find(e => e.role === "stream-start");
const sBar = await page.evaluate(() => window.__harness.juice.szStreak(0));
console.log("\n  ── BARRAGE event log ──"); for (const e of bar.filter(e => e.role.startsWith("stream"))) console.log(`  f${e.frame} ${e.tier} ${e.role} ${e.clip}`);
ok(barStart && barragec.test(barStart.clip) && barStart.tier === "barrage", `rapid barrage → single sz_barrage_* clip (${barStart?.clip})`);
ok(sBar && sBar.kind === "barrage" && sBar.streaming, `barrage streak live (kind=${sBar?.kind}, chained=${sBar?.chained})`);

// 5) BARRAGE CHAINING: keep firing past the clip length → a 2nd barrage clip crossfades in (if the move outlasts the clip).
for (let k = 0; k < 90; k++) { await page.evaluate(() => window.__harness.juice.hitMove("medium", "p1", "Ki Barrage")); await waitFrames(2); }
const bar2 = await log();
const chain = bar2.find(e => e.role === "stream-chain");
const sBar2 = await page.evaluate(() => window.__harness.juice.szStreak(0));
console.log(`  barrage after ~3s: streaming=${!!(sBar2&&sBar2.streaming)}, chained=${!!(sBar2&&sBar2.chained)}, chainEvent=${!!chain}${chain?" ("+chain.clip+")":""}`);
ok(sBar2 && sBar2.streaming, "barrage still streaming across a long move (sized to the move)");
ok(!!chain === !!(sBar2 && sBar2.chained), `crossfade-chain state consistent (chained=${!!(sBar2&&sBar2.chained)})`);
await page.evaluate(() => window.__harness.juice.szForceInterrupt("p1")); await waitFrames(6);

// 6) Voice cap still holds under spam.
const spam = await page.evaluate(() => { let p = 0; for (let i = 0; i < 40; i++) if (window.__harness.juice.playSfx("sz_hit_short_01", { gain: 0.3 })) p++; const s = window.__harness.juice.sfxStatus(); return { p, cap: s.voiceCap, active: s.activeVoices }; });
ok(spam.p <= spam.cap && spam.active <= spam.cap, `voice cap holds (≤${spam.cap}; played ${spam.p}, active ${spam.active})`);

console.log(`\n${FAILS === 0 && PERR === 0 ? "✅" : "❌"} SZ hit sounds Phase 2 live: ${FAILS} failed, ${PERR} page errors`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
