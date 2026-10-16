// harness/hitfeel_phaseA_live.mjs — HIT FEEL Phase A (punchy hit).
// Verifies, in a real Training match: tiered spark bursts + visual knockback (LIGHT/MEDIUM/HEAVY/FINISHER),
// the white hit-flash on a real light hit (black silhouette PRESERVED on a combo hit), a KO pop, damage
// numbers (forced ON in Training), and that Hit Effects = Off restores the exact previous look. Screenshots
// land in harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".ogg":"audio/ogg",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `hitfeel_A_${n}.png`) });
const gstate = () => page.evaluate(() => { const s = window.__harness.state(); return (typeof s === "string") ? s : (s && s.gameState) || String(s); });
async function wait(n) { await page.waitForTimeout(Math.ceil(n * 16.7)); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || Math.abs(d[i+1]-d[i+2]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);
const hit = (tier) => page.evaluate(t => window.__harness.juice.hit(t), tier);
const fx = () => page.evaluate(() => window.__harness.juice.fxStatus());
const reseat = async (gap=48) => { const x = await page.evaluate(() => window.__harness.p1().x); await page.evaluate(v => window.__harness.setP2X(v), x + gap); };

await page.goto(`${base}/index.html?harness=1&p1=gojo&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.juice && window.__harness.juice.hit, null, { timeout: 15000 });
await page.mouse.click(640, 360); await wait(6);
await page.evaluate(() => window.__harness.boot()); await wait(16);

console.log("\n══ HIT FEEL — Phase A (punchy hit) ══");
ok(PERR === 0, "game boots with 0 page errors (hit-feel wiring)");
ok((await gstate()) === "battle", "match in BATTLE (Training)");
ok((await vivid(0.04, 0.42)) > 8000 && (await vivid(0.54, 0.42)) > 8000, "BOTH fighters render");

// Damage Numbers forced ON in Training.
const hs = await page.evaluate(() => window.__harness.juice.hitSettings());
ok(hs.dmgEffective === true, `Damage Numbers forced ON in Training (effective=${hs.dmgEffective}, pref=${hs.dmgNumbers})`);

// Tiered spark burst + visual knockback, scaling LIGHT < MEDIUM < HEAVY.
await page.evaluate(() => window.__harness.juice.setHitFx("full"));
const dbg = async (tier) => { const before = (await fx()).debris; const r = await hit(tier); await wait(1); return { count: (await fx()).debris, kb: r.targetKb, before }; };
const L = await dbg("light"); console.log(`  LIGHT  sparks+=${L.count-L.before}, kb=${L.kb}`);
await wait(20);
const M = await dbg("medium"); console.log(`  MEDIUM sparks+=${M.count-M.before}, kb=${M.kb}`);
await wait(20);
const H = await dbg("heavy"); console.log(`  HEAVY  sparks+=${H.count-H.before}, kb=${H.kb}`);
ok((L.count-L.before) >= 2 && (M.count-M.before) > (L.count-L.before) && (H.count-H.before) > (M.count-M.before), `spark count scales by tier (${L.count-L.before} < ${M.count-M.before} < ${H.count-H.before})`);
ok(Math.abs(H.kb) > Math.abs(L.kb), `knockback nudge scales by tier (light ${L.kb}px → heavy ${H.kb}px)`);
await shot("01_heavy_hit");

// Damage numbers appear.
ok((await page.evaluate(() => window.__harness.juice.hit("medium").dmgNums)) >= 1, "damage numbers spawn on a hit (Training)");

// White hit-flash on a REAL light hit; black silhouette PRESERVED on a combo hit.
// The white flash is only 2f, so sample the flash phase every render frame and keep the first seen.
const recordFlash = async (triggerFn) => {
  await page.evaluate(() => { window.__hfRec = { phase: null }; const tick = () => { const fl = window.__harness.juice.flashState("p2"); if (fl && fl.phase && !window.__hfRec.phase) window.__hfRec.phase = fl.phase; window.__hfRAF = requestAnimationFrame(tick); }; tick(); });
  await triggerFn(); await wait(12);
  return await page.evaluate(() => { cancelAnimationFrame(window.__hfRAF); return window.__hfRec.phase; });
};
await reseat(46);
await page.evaluate(() => { window.__harness.setCombo("p1", 0); window.__harness.setCombo("p2", 0); window.__harness.setImpactFlash(-1); });
const phW = await recordFlash(() => page.evaluate(() => window.__harness.p1ForceLight()));
ok(phW === "white", `real LIGHT hit flashes WHITE (phase=${phW})`);
await shot("02_white_flash");
await wait(10);
await reseat(46);
await page.evaluate(() => { window.__harness.setImpactFlash(-1); window.__harness.setCombo("p1", 9); window.__harness.setCombo("p2", 0); });
const phB = await recordFlash(() => page.evaluate(() => window.__harness.p1ForceLight()));
ok(phB && phB !== "white", `combo hit PRESERVES the black silhouette (phase=${phB}, not white)`);

// KO pop.
const koBefore = (await fx()).debris;
await page.evaluate(() => window.__harness.juice.koPop("p2")); await wait(1);
ok((await fx()).debris > koBefore, `KO pop bursts coloured pieces (${koBefore}→${(await fx()).debris})`);
await shot("03_ko_pop");
await wait(30);

// Hit Effects OFF → no hit-feel additions run (exact previous look).
await wait(70);   // let any live debris settle so the delta is clean
await page.evaluate(() => window.__harness.juice.setHitFx("off"));
const offBefore = (await fx()).debris;
const offRes = await hit("heavy"); await wait(1);
const offAfter = (await fx()).debris;
ok(offAfter <= offBefore && Math.abs(offRes.targetKb) < 1, `Hit Effects OFF → no new sparks (${offBefore}→${offAfter}), no knockback (kb=${offRes.targetKb}) — exact previous look`);
await page.evaluate(() => window.__harness.juice.setHitFx("full"));

console.log(`\n${FAILS === 0 && PERR === 0 ? "✅" : "❌"} HIT FEEL Phase A live: ${FAILS} failed, ${PERR} page errors`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
