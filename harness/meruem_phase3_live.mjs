// harness/meruem_phase3_live.mjs — REAL-MATCH verification for Meruem PHASE 3 (passives + lines).
// Boots p1=meruem vs p2=netero. Uses the additive __harness.meruemHit (named-move hit injector that sets the
// exact signals updateMeruem reads) + __harness.meruemState (reads custom passive fields the p1() snapshot
// hides). Verifies: GUNGI MIND adaptation (3 same-move hits → auto-parry once + learned + −30% after),
// NEVER PUSHED (a combo ≥25% max HP → Evolution stack: dmg×/speed up), FINAL HOURS (<20% HP → poison that
// never KOs, +15% dmg), and the intro matchup banner line.
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
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `meruem3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const ms = () => page.evaluate(() => window.__harness.meruemState?.());
const hit = (move, dmg) => page.evaluate(([m, d]) => window.__harness.meruemHit?.(m, d), [move, dmg]);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await waitFrames(4); }
const healFull = () => page.evaluate(() => { if (window.__harness.healP1) window.__harness.healP1(); });

await boot(`${base}/index.html?harness=1&p1=meruem&p2=netero`);
await toBattle();
const s0 = await ms();
ok(!!s0, `meruemState hook available`);
ok(PERR === 0, `no page errors on boot`);

// ── 0) INTRO MATCHUP LINE — vs netero, the banner should read the netero matchup line ──
await shot("00_intro");
ok(!!s0?.banner && /gungi|board|stone|chairman|remember/i.test(s0.banner), `intro matchup line vs netero set (${JSON.stringify(s0?.banner)})`);

// ── 1) GUNGI MIND adaptation — 3 hits of the SAME move "jab" → 3rd auto-parries (HP refunded) + learned ──
await healFull(); await waitFrames(2);
await hit("jab", 40); await waitFrames(6); const g1 = await ms();
await hit("jab", 40); await waitFrames(6); const g2 = await ms();
const hpBefore3 = (await ms()).hp;
await hit("jab", 40); await waitFrames(6); const g3 = await ms();
console.log(`  Gungi: adapt after h1=${JSON.stringify(g1.adapt)} h2=${JSON.stringify(g2.adapt)} h3=${JSON.stringify(g3.adapt)} learned=${JSON.stringify(g3.learned)}`);
console.log(`  Gungi: HP before 3rd=${hpBefore3} after 3rd=${g3.hp} (auto-parry refunds the hit → ~equal)`);
ok((g2.adapt?.jab || 0) === 2, `after 2 hits, "jab" count = 2 (got ${g2.adapt?.jab})`);
ok(g3.learned?.includes("jab"), `3rd hit → "jab" LEARNED (auto-parry) (learned=${JSON.stringify(g3.learned)})`);
ok(Math.abs(g3.hp - hpBefore3) <= 2, `3rd hit AUTO-PARRIED — HP refunded (${hpBefore3}→${g3.hp})`);
await shot("01_gungi_read");

// ── 1b) −30% after learning — a LEARNED "jab" now deals 30% less (≈28 of 40) ──
await waitFrames(14);   // let the counter i-frames expire
const hpPre4 = (await ms()).hp;
await hit("jab", 40); await waitFrames(6); const g4 = await ms();
const dmg4 = hpPre4 - g4.hp;
console.log(`  Gungi −30%: HP ${hpPre4}→${g4.hp} (Δ${dmg4}; raw 40, expect ≈28)`);
ok(dmg4 > 0 && dmg4 <= 32, `learned "jab" dulled to ≈70% (Δ=${dmg4} ≤ 32, not 40)`);

// ── 2) NEVER PUSHED — a single combo ≥25% of maxHP (335) grants an Evolution stack (dmg×/speed up) ──
await healFull(); await waitFrames(2);
const before = await ms();
await hit("c1", 120); await waitFrames(5);
await hit("c2", 120); await waitFrames(5);
await hit("c3", 120); await waitFrames(6);   // 360 total within the combo window → ≥335
const after = await ms();
console.log(`  Never Pushed: evo ${before.evo}→${after.evo}  dmgMult ${before.dmgMult}→${after.dmgMult}  speed ${before.speed}→${after.speed} (base ${after.baseSpeed})`);
ok(after.evo >= 1, `combo ≥25% HP granted an Evolution stack (evo=${after.evo})`);
ok(after.dmgMult > before.dmgMult + 0.01, `Evolution raises damage multiplier (${before.dmgMult}→${after.dmgMult})`);
ok(after.speed > after.baseSpeed, `Evolution raises speed (${after.speed} > base ${after.baseSpeed})`);
await shot("02_evolution");

// ── 3) FINAL HOURS — drop HP below 20% (one big hit) → poison drains but NEVER KOs (floors at 1) + +15% dmg ──
await healFull(); await waitFrames(2);
await hit("bigshot", 1160);   // 1340-1160 = 180 ≈ 13% (<20% = 268)
await waitFrames(4); const fh0 = await ms();
await waitFrames(220); const fh1 = await ms();   // long enough for poison to drain toward the floor
console.log(`  Final Hours: finalHours=${fh1.finalHours}  HP ${fh0.hp}→${fh1.hp}  elim=${fh1.elim}  dmgMult=${fh1.dmgMult}`);
ok(fh1.finalHours === true, `Final Hours awakened below 20% HP`);
ok(fh1.hp >= 1 && fh1.elim === false, `poison drains but NEVER KOs (HP=${fh1.hp} ≥ 1, not eliminated)`);
ok(fh1.hp < fh0.hp, `poison is draining (${fh0.hp}→${fh1.hp})`);
ok(fh1.dmgMult >= 1.14, `Final Hours grants +15% damage (dmgMult=${fh1.dmgMult})`);
await shot("03_final_hours");

// drain to the floor and confirm it STOPS at 1 (never below)
await waitFrames(400); const fh2 = await ms();
console.log(`  Final Hours floor: HP after long drain = ${fh2.hp} (must be ≥1, not eliminated=${fh2.elim})`);
ok(fh2.hp >= 1 && fh2.elim === false, `poison floors at 1 HP (HP=${fh2.hp}, elim=${fh2.elim})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/meruem3_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
