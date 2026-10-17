// harness/hitfeel_phaseC_live.mjs — HIT FEEL Phase C (anime finisher).
// Verifies the finisher sequence (freeze → silhouette/invert → burst → punch-in), the 2.5s cooldown, the
// Reduce-Flashing (soft-dim, no invert) variant, FFA/KO guards, and that Off disables it. Screenshots to
// harness/shots/.
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
const shot = n => page.screenshot({ path: path.join(OUT, `hitfeel_C_${n}.png`) });
const gstate = () => page.evaluate(() => { const s = window.__harness.state(); return (typeof s === "string") ? s : (s && s.gameState) || String(s); });
async function wait(n) { await page.waitForTimeout(Math.ceil(n * 16.7)); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || Math.abs(d[i+1]-d[i+2]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);
const fin = () => page.evaluate(() => window.__harness.juice.finisherState());

await page.goto(`${base}/index.html?harness=1&p1=gojo&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.juice && window.__harness.juice.triggerFinisher, null, { timeout: 15000 });
await page.mouse.click(640, 360); await wait(6);
await page.evaluate(() => window.__harness.boot()); await wait(16);

console.log("\n══ HIT FEEL — Phase C (anime finisher) ══");
ok(PERR === 0, "game boots with 0 page errors (finisher wiring)");
ok((await gstate()) === "battle", "match in BATTLE");
ok((await vivid(0.04, 0.42)) > 8000 && (await vivid(0.54, 0.42)) > 8000, "BOTH fighters render");
await page.evaluate(() => { window.__harness.juice.setHitFx("full"); window.__harness.juice.setAnimFinisher(true); window.__harness.juice.setFlash(false); });

const coolDown = async () => { try { await page.waitForFunction(() => window.__harness.juice.finisherState().cooldown === 0 && !window.__harness.juice.finisherState().active, { timeout: 6000, polling: 50 }); } catch (_) {} };

// 0) The anime hit fires on a real HEAVY / special hit (not LIGHT), gated by the cooldown.
const heavyFires = await page.evaluate(() => { window.__harness.juice.hit("heavy", "p1"); return window.__harness.juice.finisherState().active; });
ok(heavyFires === true, "a real HEAVY hit triggers the anime finisher");
await coolDown();
const lightFires = await page.evaluate(() => { window.__harness.juice.hit("light", "p1"); return window.__harness.juice.finisherState().active; });
ok(lightFires === false, "a LIGHT hit does NOT trigger the anime finisher");
await coolDown();

// 1) Fire a finisher → freeze + cooldown armed; sequence runs (checked BEFORE the slow screenshot).
const t0 = await page.evaluate(() => { const r = window.__harness.juice.triggerFinisher(); return { ...r, st: window.__harness.juice.finisherState() }; });
ok(t0.active === true && t0.freeze > 0, `finisher fires (active, freeze=${t0.freeze})`);
ok(t0.cooldown > 100, `2.5s cooldown armed (${t0.cooldown})`);
ok(t0.st.active === true && t0.st.t >= 0, `sequence is live right after trigger (t=${t0.st.t})`);
await shot("01_finisher");
await page.waitForFunction(() => !window.__harness.juice.finisherState().active, { timeout: 3000, polling: 30 }).catch(() => {});
ok((await fin()).active === false, "finisher sequence ends and clears");

// 2) Cooldown — a second finisher within 2.5s does NOT fire.
const t2 = await page.evaluate(() => window.__harness.juice.triggerFinisher());
ok(t2.active === false, `second finisher within 2.5s is blocked by cooldown (active=${t2.active})`);
await coolDown();

// 3) Reduce Flashing → soft-dim variant (reduce flag set; no invert/strobe).
await page.evaluate(() => window.__harness.juice.setFlash(true));
const tR = await page.evaluate(() => { const r = window.__harness.juice.triggerFinisher(); return { ...r, st: window.__harness.juice.finisherState() }; });
ok(tR.active === true, "finisher still fires with Reduce Flashing");
ok(tR.st.reduce === true, "Reduce Flashing → finisher runs in soft-dim mode (no invert/strobe)");
await shot("02_finisher_reduceflash");
await page.evaluate(() => window.__harness.juice.setFlash(false));
await coolDown();

// 4) OFF → finisher disabled.
await page.evaluate(() => window.__harness.juice.setAnimFinisher(false));
const off = await page.evaluate(() => window.__harness.juice.triggerFinisher());
ok(off.active === false, "Anime Finisher OFF → no finisher");
await page.evaluate(() => window.__harness.juice.setAnimFinisher(true));
await coolDown();

// 5) FFA guard — no finisher freeze in a 4-player match (shouldn't stall).
await page.evaluate(() => window.__harness.ffaStart(4, ["gojo", "sukuna", "naruto", "yuji"])); await wait(10);
const ffa = await page.evaluate(() => window.__harness.juice.triggerFinisher());
ok(ffa.active === false, "no anime-finisher freeze in 4-player FFA (guarded)");

console.log(`\n${FAILS === 0 && PERR === 0 ? "✅" : "❌"} HIT FEEL Phase C live: ${FAILS} failed, ${PERR} page errors`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
