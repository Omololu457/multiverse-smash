// harness/kakashi_anbu_phase3_live.mjs — REAL live verification for Kakashi (ANBU) PHASE 3.
// Kuchiyose: Ninken Tsuiga (Down+Special pin), Sharingan Read counter (Back+Special), Sharingan Genjutsu
// (Up+Special). Directional specials driven via the REAL dispatch (__harness.p1SpecialDir → triggerSpecial →
// executeKakashiAnbuSpecial), Sharingan via real Charge-tap keystroke.
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
const shot = n => page.screenshot({ path: path.join(OUT, `kanbu3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
const ks = () => page.evaluate(() => window.__harness.kakashiAnbu.state());
const hp2 = () => page.evaluate(() => Math.round((window.__harness.p2() || {}).health));
const p1x = () => page.evaluate(() => Math.round((window.__harness.p1() || {}).x));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(6); }
const spDir = d => page.evaluate(dir => window.__harness.p1SpecialDir(dir), d);
const sharOn = async () => { if (!(await ks()).sharingan) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3); } return (await ks()).sharingan; };
const sharOff = async () => { if ((await ks()).sharingan) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3); } };

await boot(`${base}/index.html?harness=1&p1=kakashi_anbu&p2=naruto`);
await toBattle();

// ── 1) KUCHIYOSE: NINKEN — TSUIGA (Down+Special): cast → dogs PIN the foe (root + damage) → dismissal ──
await reset(); await sharOff();
await page.evaluate(() => window.__harness.kakashiAnbu.putOppNear(150));
const nBefore = await hp2();
await spDir("D");
await waitFrames(22); const nPin = await ks(); await shot("01_ninken_pin");
ok(nPin.ninkenPin, `Ninken: dogs PIN active after the cast (pinT=${nPin.ninkenPinT})`);
ok(nPin.oppHitstun > 0, `Ninken: the foe is ROOTED during the pin (hitstun=${nPin.oppHitstun})`);
await waitFrames(60); const nAfter = await hp2();
ok(nAfter < nBefore - 20, `Ninken: pin + Bull bite damages the foe (hp2 ${nBefore}→${nAfter})`);
await waitFrames(30); const nEnd = await ks(); await shot("02_ninken_dismiss");
ok(!nEnd.ninkenPin, `Ninken: pin ends → dismissal (ninkenPin=${nEnd.ninkenPin}, dismiss=${nEnd.ninkenDismiss})`);

// ── 2) NINKEN pin longer with Sharingan ON ──
await reset(); const onOk = await sharOn(); ok(onOk, `Sharingan ON for Ninken-duration test`);
await page.evaluate(() => window.__harness.kakashiAnbu.putOppNear(150));
await spDir("D"); await waitFrames(22); const pinShar = (await ks()).ninkenPinT;
await reset(); await sharOff();
await page.evaluate(() => window.__harness.kakashiAnbu.putOppNear(150));
await spDir("D"); await waitFrames(22); const pinBase = (await ks()).ninkenPinT;
ok(pinShar > pinBase, `Sharingan ON → longer pin (${pinShar} > ${pinBase})`);

// ── 3) SHARINGAN GENJUTSU (Up+Special; needs Sharingan): close-range STUN + tomoe swirl ──
await reset();
await spDir("U"); const gNo = await ks();
ok(gNo.oppGenjutsuFx === 0 && (gNo.genjutsuCd === 0), `Genjutsu REFUSED without Sharingan`);
await sharOn();
await page.evaluate(() => window.__harness.kakashiAnbu.putOppNear(120));
await spDir("U"); await waitFrames(3); const gYes = await ks(); await shot("03_genjutsu");
ok(gYes.oppGenjutsuFx > 0, `Genjutsu: tomoe swirl on the foe (oppGenjutsuFx=${gYes.oppGenjutsuFx})`);
ok(gYes.oppHitstun > 20, `Genjutsu: the foe is STUNNED (hitstun=${gYes.oppHitstun})`);

// ── 4) SHARINGAN READ (Back+Special; needs Sharingan): counter on the foe's attack ──
await reset(); await sharOff();
await spDir("B"); const rNo = await ks();
ok(rNo.readWindow === 0, `Read REFUSED without Sharingan (window=${rNo.readWindow})`);
await sharOn();
await page.evaluate(() => window.__harness.kakashiAnbu.putOppNear(90));
await spDir("B"); const rArm = await ks();
ok(rArm.readWindow > 0, `Read window ARMED with Sharingan (window=${rArm.readWindow})`);
const bx = await p1x(); const rhp = await hp2();
await page.evaluate(() => { window.__harness.kakashiAnbu.putOppNear(90); window.__harness.kakashiAnbu.forceOppAttack(); });
await waitFrames(3); const ax = await p1x(); await shot("04_read_counter");
ok((await hp2()) < rhp, `Read COUNTER: foe's attack is punished (hp2 ${rhp}→${await hp2()})`);
ok(Math.abs(ax - bx) >= 40, `Read COUNTER: Kakashi Body Flickers (Δx=${Math.abs(ax - bx)})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kanbu3_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
