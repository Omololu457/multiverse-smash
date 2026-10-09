// harness/gaara_live2.mjs — REAL live verification for Gaara PHASE 2 (sand specials). Boots a real match
// (?p1=gaara&p2=naruto), fires each directional special via the deterministic p1SpecialDir hook (sets
// _specialHeldDir + triggers the special, bypassing keyboard hold-timing), screenshots each, and asserts
// the observable effect: Sand Coffin BINDS the foe (hitstun up + vx 0) → Sand Burial DAMAGES; Sand Tsunami
// spawns a forward projectile; Sand Dome grants i-frames; Sand Shunshin TELEPORTS (x jumps). Light + dark
// stage alpha proof. (Ultimate Defense / Sand Armor passives are proven in gaara_phase2.test.mjs.)
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
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `gaara2_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { key: f.key, energy: Math.round(f.energy ?? -1), x: Math.round(f.x ?? 0), invuln: f.invulnTimer ?? 0, move: f.currentMove || null, cast: f._spriteCastMove || null, sheet: f.spriteSheet || null }; });
const p2 = () => page.evaluate(() => { const f = window.__harness.p2() || {}; return { health: Math.round(f.health ?? -1), hitstun: f.hitstun ?? 0, vx: Math.round((f.vx ?? 0) * 100) / 100, x: Math.round(f.x ?? 0) }; });
const projCount = () => page.evaluate(() => (window.__harness.projectiles?.() || []).length);
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.refill?.("p1"); }); await waitFrames(4); }
async function heal() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); }
// fire a directional special deterministically (dir: null=neutral, "F"/"B"/"U"/"D")
async function fireSpecial(dir) { return page.evaluate(d => window.__harness.p1SpecialDir(d), dir); }

// fresh battle each time → no cross-contamination from leftover windows / cast timers / teleport position
async function freshBattle() { await boot(`${base}/index.html?harness=1&p1=gaara&p2=naruto`); await toBattle(); }
// walk p1 toward p2 until within `range` px (coffin reach), so a ground special connects
async function closeIn(range = 380) {
  for (let i = 0; i < 60; i++) {
    const a = await p1(), b = await p2();
    if (Math.abs(a.x - b.x) <= range) break;
    const dir = a.x < b.x ? "d" : "a";
    await page.keyboard.down(dir); await waitFrames(6); await page.keyboard.up(dir); await waitFrames(1);
  }
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.refill?.("p1"); window.__harness.healP2?.(); });
  await waitFrames(2);
}

// ── 1) SAND COFFIN (neutral) → BIND, then SAND BURIAL (Special again) → DAMAGE ──
await freshBattle(); await closeIn(360);
const before = await p2();
const r1 = await fireSpecial(null);
await waitFrames(14); await shot("01_coffin"); const afterCoffin = await p2(); const a1 = await p1();
console.log(`coffin: ${JSON.stringify(r1)} p2.hitstun ${before.hitstun}→${afterCoffin.hitstun} p2.vx=${afterCoffin.vx}`);
ok(afterCoffin.hitstun > before.hitstun && afterCoffin.vx === 0, `Sand Coffin BINDS the foe (hitstun ${before.hitstun}→${afterCoffin.hitstun}, vx=${afterCoffin.vx})`);
const hpBeforeBurial = (await p2()).health;
const r2 = await fireSpecial(null);   // Special again inside the coffin window → Burial
await waitFrames(16); await shot("02_burial"); const hpAfterBurial = (await p2()).health;
console.log(`burial: ${JSON.stringify(r2)} p2.health ${hpBeforeBurial}→${hpAfterBurial}`);
ok(hpAfterBurial < hpBeforeBurial, `Sand Burial deals damage to the bound foe (${hpBeforeBurial}→${hpAfterBurial})`);

// ── 2) SAND TSUNAMI (Forward) → forward sand-wave projectile ──
await freshBattle();
const r3 = await fireSpecial("F");
await waitFrames(14); await shot("03_tsunami"); const names = await projNames();
console.log(`tsunami: ${JSON.stringify(r3)} proj=${JSON.stringify(names)}`);
ok(names.some(n => /tsunami/.test(n || "")), `Sand Tsunami spawns a sand-wave projectile (${JSON.stringify(names)})`);

// ── 3) SAND DOME (Back) → i-frames + dome FX ──
await freshBattle();
const r4 = await fireSpecial("B");
const a4imm = await p1();   // read i-frames immediately (invulnTimer decays each frame)
await waitFrames(5); await shot("04_dome");
console.log(`dome: ${JSON.stringify(r4)} p1.invuln=${a4imm.invuln}`);
ok(a4imm.invuln > 0 && /gaaraSandCast/.test(r4.cast || ""), `Sand Dome grants i-frames + casts (invuln=${a4imm.invuln}, cast=${r4.cast})`);

// ── 4) SAND SHUNSHIN (Up) → dodge-teleport (x jumps) + i-frames ──
await freshBattle();
const xBefore = (await p1()).x;
const r5 = await fireSpecial("U");
await waitFrames(8); await shot("05_shunshin"); const a5 = await p1();
console.log(`shunshin: ${JSON.stringify(r5)} x ${xBefore}→${a5.x} invuln=${a5.invuln}`);
ok(Math.abs(a5.x - xBefore) > 60, `Sand Shunshin teleports (Δx=${a5.x - xBefore})`);

// ── 5) SAND BULLET still works (Down) — regression ──
await freshBattle();
const r6 = await fireSpecial("D");
await waitFrames(12); await shot("06_bullet"); const names6 = await projNames();
console.log(`bullet: ${JSON.stringify(r6)} proj=${JSON.stringify(names6)}`);
ok(names6.some(n => /bullet/.test(n || "")), `Sand Bullet still fires (Down) (${JSON.stringify(names6)})`);

// ── 6) ALPHA on a LIGHT and DARK stage (FX sheets key clean) ──
async function stageShot(label, stageName) {
  await boot(`${base}/index.html?harness=1&p1=gaara&p2=naruto`);
  await toBattle();
  await page.evaluate(n => window.__harness.selectStageByName?.(n), stageName);
  await fireSpecial(null); await waitFrames(10); await fireSpecial(null); await waitFrames(8); await shot(label);
}
await stageShot("07_stage_light", "Hidden Leaf Village");
await stageShot("08_stage_dark",  "Shibuya Incident");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/gaara2_*.png`);
process.exit(FAILS ? 1 : 0);
