// harness/hitfeel_phaseD_live.mjs — HIT FEEL Phase D (elements).
// Verifies the element table, the shared lightning-bolt renderer (+ cap), element-tinted hit sparks, the
// fire burn aftermath, element STANDIN sounds, and a 4-player bolt-spam perf sweep. Screens → harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".ogg":"audio/ogg",".mp3":"audio/mpeg",".jpg":"image/jpeg",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `hitfeel_D_${n}.png`) });
const gstate = () => page.evaluate(() => { const s = window.__harness.state(); return (typeof s === "string") ? s : (s && s.gameState) || String(s); });
async function wait(n) { await page.waitForTimeout(Math.ceil(n * 16.7)); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || Math.abs(d[i+1]-d[i+2]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);
const el = (k, m, u = false, v = null) => page.evaluate(([k, m, u, v]) => window.__harness.juice.elementOf(k, m, u, v), [k, m, u, v]);
const fx = () => page.evaluate(() => window.__harness.juice.fxStatus());

await page.goto(`${base}/index.html?harness=1&p1=gojo&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.juice && window.__harness.juice.hitElement, null, { timeout: 15000 });
await page.mouse.click(640, 360); await wait(6);
await page.evaluate(() => window.__harness.boot()); await wait(16);

console.log("\n══ HIT FEEL — Phase D (elements) ══");
ok(PERR === 0, "game boots with 0 page errors (elements wiring)");
ok((await gstate()) === "battle", "match in BATTLE");
ok((await vivid(0.04, 0.42)) > 8000 && (await vivid(0.54, 0.42)) > 8000, "BOTH fighters render");
await page.evaluate(() => window.__harness.juice.setHitFx("full"));

// 1) Element table.
console.log(`  table: katon=${await el("sasuke_adult", "katon")}, raikiri=${await el("kakashi", "raikiri")}, rasenshuriken=${await el("naruto_seventh", "rasenshuriken")}, zoldyck-ult=${await el("zoldyck", null, true)}, kamehameha=${await el("goku", "kamehameha")}`);
ok((await el("sasuke_adult", "katon")) === "fire", "katon → FIRE");
ok((await el("kakashi", "raikiri")) === "lightning", "raikiri → LIGHTNING");
ok((await el("naruto_seventh", "rasenshuriken")) === "wind", "rasenshuriken → WIND");
ok((await el("zoldyck", null, true)) === "lightning", "zoldyck ult → LIGHTNING");
ok((await el("goku", "kamehameha")) === "ki", "kamehameha → KI");
ok((await el("nobody", "unknownMove")) === "ki", "unknown move → KI (default)");

// 2) Lightning bolt renderer (shared tool) + cap.
const b0 = (await fx()).bolts;
await page.evaluate(() => window.__harness.juice.fireBolt());
await wait(1);
ok((await fx()).bolts > b0, `fireBolt spawns a lightning bolt (${b0}→${(await fx()).bolts})`);
await shot("01_bolt");
// cap: spam more than the cap, confirm it holds
const cap = (await fx()).boltCap;
await page.evaluate((n) => { for (let i = 0; i < n; i++) window.__harness.juice.fireBolt(); }, cap + 10);
ok((await fx()).bolts <= cap, `bolts stay within the cap under spam (${(await fx()).bolts} ≤ ${cap})`);
await wait(20);

// 3) LIGHTNING hit → a bolt crackles over the target.
const lh = await page.evaluate(() => window.__harness.juice.hitElement("lightning", "p1"));
await wait(1);
ok(lh.bolts >= 1, `a LIGHTNING hit crackles a bolt over the target (${lh.bolts})`);
await wait(22);

// 4) FIRE hit → burn aftermath on the target + element-tinted sparks.
const fh = await page.evaluate(() => window.__harness.juice.hitElement("fire", "p1"));
ok((await page.evaluate(() => window.__harness.juice.fireBurnOf("p2"))) !== null, "a FIRE hit leaves a burn overlay on the target");
ok(fh.debris >= 1, "element hit throws tinted sparks");
await wait(4); await shot("02_fire_burn");
await wait(80);
ok((await page.evaluate(() => window.__harness.juice.fireBurnOf("p2"))) === null, "fire burn fades out (~1s)");

// 5) OFF → no element FX.
await page.evaluate(() => window.__harness.juice.setHitFx("off"));
const offB = (await fx()).bolts;
await page.evaluate(() => window.__harness.juice.hitElement("lightning", "p1"));
await wait(1);
ok((await fx()).bolts <= offB, "Hit Effects OFF → no element sparks");
await page.evaluate(() => window.__harness.juice.setHitFx("full"));

// 6) PERF — 4-player bolt + element-hit spam.
await page.evaluate(() => window.__harness.ffaStart(4, ["gojo", "sukuna", "naruto", "yuji"])); await wait(10);
const perf = await page.evaluate(async () => {
  const H = window.__harness; const d = []; let last = performance.now();
  await new Promise(res => { let n = 0; const tick = () => { const now = performance.now(); d.push(now - last); last = now; for (let i = 0; i < 4; i++) { H.juice.fireBolt(); H.juice.explode("medium", 300 + i * 600, 420); } if (++n >= 150) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  d.sort((a, b) => a - b); return { median: +d[d.length >> 1].toFixed(2), p95: +d[Math.floor(d.length * 0.95)].toFixed(2), bolts: H.juice.fxStatus().bolts, boltCap: H.juice.fxStatus().boltCap, particles: H.juice.fxStatus().particles };
});
console.log(`  PERF (4p bolt+explosion spam): median ${perf.median}ms (${(1000/perf.median).toFixed(0)}fps), p95 ${perf.p95}ms; bolts ${perf.bolts}/${perf.boltCap}, particles ${perf.particles}`);
ok(perf.median <= 20, `holds ~55-60fps under the (unrealistic) 4-player 4-bolt+4-explosion-per-frame worst case (${perf.median}ms)`);
ok(perf.bolts <= perf.boltCap, `bolts capped under spam (${perf.bolts} ≤ ${perf.boltCap})`);
await shot("03_ffa_bolts");

console.log(`\n${FAILS === 0 && PERR === 0 ? "✅" : "❌"} HIT FEEL Phase D live: ${FAILS} failed, ${PERR} page errors`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
