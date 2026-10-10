// harness/kakashi_war_phase4_live.mjs — REAL live verification for Kakashi (Kamui) PHASE 4: OBITO'S GIFT.
// Bond meter fills from Sharingan moves → Up+Ult at full enters the Double-Mangekyō Gift → Mini Kamui Shuriken
// (neutral Sp) / Kamui Warp (Fwd+Sp) / Kamui Intangibility (Back+Sp) → Gift ends → Kamui LOCKOUT + exhaustion.
// P1 keys: move a/d, jump w, crouch s, light j, heavy k, upAttack i, special l, charge p, ultimate u, block ;.
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
const shot = n => page.screenshot({ path: path.join(OUT, `kwar4_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const gift = (setBond = null) => page.evaluate((b) => window.__harness.kakashiAnbu.kakashiWarGift("p1", b), setBond);
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(10); }
async function sharinganOn() { for (let i = 0; i < 3; i++) { if ((await gift()).sharingan) return true; await tap("p", 2); await waitFrames(2); } return (await gift()).sharingan; }
async function setP2Near(dx) { await page.evaluate((d) => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + d); } catch (_) {} }, dx); await waitFrames(2); }

await boot(`${base}/index.html?harness=1&p1=kakashi_war&p2=naruto`);
await toBattle();
ok(((await p1()).key || "").toLowerCase() === "kakashi_war", `P1 is kakashi_war`);
ok(PERR === 0, `no page errors on boot`);

// ── 1) BOND meter fills from a Sharingan move landing (Kamui) ──
await reset(); await gift(0); await sharinganOn(); await setP2Near(420);
const b0 = (await gift()).bond;
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(42);
const b1 = (await gift()).bond;
console.log(`  Bond from Kamui: ${Math.round(b0)} → ${Math.round(b1)}`);
ok(b1 > b0, `Bond meter fills from a Sharingan move landing (Δ${Math.round(b1 - b0)})`);

// ── 2) ENTER THE GIFT — Up+Ultimate at full bond ──
await reset(); await gift(100); await setP2Near(160);
await page.keyboard.down("w"); await waitFrames(1); await tap("u", 3); await page.keyboard.up("w");
await waitFrames(6); await shot("01_gift_cutin");
const g = await gift();
console.log(`  Gift: active=${g.gift} timer=${g.giftTimer} bond(after)=${g.bond}`);
ok(g.gift === true && g.giftTimer > 0, `Up+Ult at full bond ENTERS the Gift (timer=${g.giftTimer})`);
ok(g.bond === 0, `entering the Gift consumes the bond (bond=${g.bond})`);

// ── 3) MINI KAMUI SHURIKEN — neutral Special during the Gift fires a projectile ──
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); });  // keep Gift active (no reset())
await waitFrames(3);
const pc0 = (await projNames()).length;
await tap("l", 2); await waitFrames(4);
const names = await projNames();
await shot("02_mini_shuriken");
console.log(`  Mini Kamui Shuriken: projectiles=${JSON.stringify(names)}`);
ok(names.some(n => (n || "").includes("mini-kamui")), `neutral Special fires a Mini Kamui Shuriken projectile`);

// ── 4) KAMUI INTANGIBILITY — Back+Special during the Gift (phase window). Tested BEFORE the warp so the
//      facing is unambiguous (the warp can teleport past the foe and flip facing). ──
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); }); await waitFrames(14);  // let the shuriken cooldown clear
await page.keyboard.down("a"); await waitFrames(3); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("a");
await waitFrames(2);
const gi = await gift();
console.log(`  Kamui Intangibility: intangible=${gi.intangible} phased=${gi.phased}`);
ok(gi.intangible > 0 && gi.phased, `Back+Special = Kamui Intangibility (phase window=${gi.intangible})`);

// ── 5) KAMUI WARP — Fwd+Special during the Gift teleports ──
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); }); await waitFrames(16);  // let the intangibility cast clear
const wx0 = (await p1()).x;
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(4);
const wx1 = (await p1()).x;
console.log(`  Kamui Warp: x ${Math.round(wx0)} → ${Math.round(wx1)} (Δ${Math.round(wx1 - wx0)})`);
ok(Math.abs(wx1 - wx0) >= 120, `Fwd+Special = Kamui Warp teleport (Δx=${Math.round(wx1 - wx0)})`);

// ── 6) GIFT ENDS → Kamui LOCKOUT + exhaustion ──
await page.waitForFunction(() => window.__harness.kakashiAnbu.kakashiWarGift("p1").gift === false, null, { timeout: 20000, polling: 16 });  // run out the ~7.2s Gift timer
const ge = await gift();   // read immediately at Gift end (before the exhaustion decays)
console.log(`  Gift ended: active=${ge.gift} lockout=${ge.lockout} exhaust=${ge.exhaust}`);
ok(ge.gift === false && ge.lockout === true, `the Gift ends → Kamui LOCKOUT for the round (lockout=${ge.lockout})`);
ok(ge.exhaust > 0, `the Gift ends → brief EXHAUSTION (exhaust frames=${ge.exhaust})`);
// Kamui (Fwd+Special) must now NO-OP (locked out) — foe takes no Kamui damage
await sharinganOn(); await setP2Near(420);
const lHp0 = (await p2()).health;
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(42);
const lHp1 = (await p2()).health;
console.log(`  Post-Gift Kamui: p2 dmg Δ${Math.round(lHp0 - lHp1)} (should be ~0, locked out)`);
ok((lHp0 - lHp1) < 10, `Kamui is DISABLED after the Gift (foe took ${Math.round(lHp0 - lHp1)})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kwar4_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
