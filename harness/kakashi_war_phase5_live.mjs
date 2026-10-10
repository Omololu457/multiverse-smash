// harness/kakashi_war_phase5_live.mjs — REAL live verification for Kakashi (Kamui) PHASE 5: PERFECT SUSANOO.
// Full chain: Gift → Perfect Susanoo (giant, HP absorbs) → punch/sword/volley/Susanoo-Kamui-Raikiri → exit →
// Kamui LOCKOUT. P1 keys: move a/d, jump w, crouch s, light j, heavy k, special l, charge p, ultimate u.
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
const shot = n => page.screenshot({ path: path.join(OUT, `kwar5_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sus = (setBond = null) => page.evaluate((b) => window.__harness.kakashiAnbu.kakashiWarGift("p1", b), setBond);
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function setP2Near(dx) { await page.evaluate((d) => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + d); } catch (_) {} }, dx); await waitFrames(2); }
async function clearIn() { await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await waitFrames(2); }

await boot(`${base}/index.html?harness=1&p1=kakashi_war&p2=naruto`);
await toBattle();
ok(((await p1()).key || "").toLowerCase() === "kakashi_war", `P1 is kakashi_war`);
ok(PERR === 0, `no page errors on boot`);

// ── 1) Gift → PERFECT SUSANOO (Ultimate during the Gift) ──
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); });
await sus(100); await setP2Near(160);
await page.keyboard.down("w"); await waitFrames(1); await tap("u", 3); await page.keyboard.up("w"); await waitFrames(6);  // Up+Ult → enter Gift
ok((await sus()).gift === true, `entered the Gift`);
await clearIn(); await tap("u", 3); await waitFrames(8);   // Ultimate again → PERFECT SUSANOO
const s1 = await sus();
await shot("01_susano");
console.log(`  Susanoo: active=${s1.susano} hp=${s1.susanoHp}/${s1.susanoMax} timer=${s1.susanoT}`);
ok(s1.susano === true && s1.susanoHp > 0, `Ultimate during the Gift enters PERFECT SUSANOO (hp=${s1.susanoHp}/${s1.susanoMax})`);

// ── 2) SUSANOO MELEE — Light = winged punch · Heavy = sword (both damage the foe) ──
const idle = async () => page.waitForFunction(() => { const g = window.__harness.kakashiAnbu.kakashiWarGift("p1"); return !g.susanoAction && !g.susanoVolley && !g.susanoRaikiri; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await idle(); await clearIn(); await setP2Near(150);
let h0 = (await p2()).health;
await tap("j", 3); await waitFrames(20);
let h1 = (await p2()).health;
console.log(`  Susanoo punch (Light): p2 dmg Δ${Math.round(h0 - h1)}`);
ok(h0 - h1 > 0, `Light = winged punch damages the foe (Δ${Math.round(h0 - h1)})`);
await idle(); await clearIn(); await setP2Near(170); h0 = (await p2()).health;
await tap("k", 3); await waitFrames(30); await shot("02_sword");
h1 = (await p2()).health;
console.log(`  Susanoo sword (Heavy): p2 dmg Δ${Math.round(h0 - h1)}`);
ok(h0 - h1 > 0, `Heavy = sword combo damages the foe (Δ${Math.round(h0 - h1)})`);

// ── 3) HP ABSORB — incoming damage is redirected to the Susanoo's HP (Kakashi refunded) ──
await clearIn();
const before = await sus(); const pHp0 = (await p1()).health;
await page.evaluate(() => window.__harness.damageP1(120)); await waitFrames(3);
const after = await sus(); const pHp1 = (await p1()).health;
console.log(`  HP absorb: Kakashi hp ${Math.round(pHp0)}→${Math.round(pHp1)}  SusanooHP ${before.susanoHp}→${after.susanoHp}`);
ok((pHp0 - pHp1) < 30 && (before.susanoHp - after.susanoHp) >= 80, `Susanoo HP absorbs the hit (Kakashi refunded, shell -${before.susanoHp - after.susanoHp})`);

// ── 4) KAMUI SHURIKEN VOLLEY — neutral Special fires large shuriken ──
await idle(); await clearIn(); await tap("l", 3); await waitFrames(22);   // cast is ~16f before the first shuriken
const vn = await projNames();
console.log(`  Kamui Shuriken Volley: projectiles=${JSON.stringify(vn)}  volley=${(await sus()).susanoVolley}`);
ok(vn.some(n => (n || "").includes("susano-shuriken")), `neutral Special = Kamui Shuriken Volley (large shuriken)`);

// ── 5) SUSANOO KAMUI RAIKIRI — Ultimate fires the scaled strike (big damage) ──
// wait for the shuriken volley to finish (canAct is blocked while a volley/action is live).
await page.waitForFunction(() => window.__harness.kakashiAnbu.kakashiWarGift("p1").susanoVolley === false, null, { timeout: 8000, polling: 16 }).catch(() => {});
await clearIn(); await setP2Near(170);
await page.evaluate(() => { window.__harness.healP2?.(); }); await waitFrames(2);
h0 = (await p2()).health;
await tap("u", 3); await waitFrames(6); const sr = await sus();
await waitFrames(55); await shot("03_susano_raikiri");
h1 = (await p2()).health;
console.log(`  Susanoo Kamui Raikiri: raikiri=${sr.susanoRaikiri} p2 dmg Δ${Math.round(h0 - h1)}`);
ok(h0 - h1 > 120, `Ultimate = Susanoo Kamui Raikiri big strike (Δ${Math.round(h0 - h1)})`);

// ── 6) EXIT (timeout) → Gift ends → Kamui LOCKOUT + exhaustion ──
await page.waitForFunction(() => window.__harness.kakashiAnbu.kakashiWarGift("p1").susano === false, null, { timeout: 25000, polling: 16 });
await waitFrames(4);   // the gift-end (lockout) processes the frame AFTER the Susanoo exits
const ex = await sus();
console.log(`  Susanoo ended: susano=${ex.susano} gift=${ex.gift} lockout=${ex.lockout} exhaust=${ex.exhaust}`);
ok(ex.susano === false, `Perfect Susanoo ends (timeout/chakra/HP break)`);
ok(ex.lockout === true, `after the Susanoo the Gift ends → Kamui LOCKOUT for the round`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kwar5_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
