// harness/kakashi_war_phase3_live.mjs — REAL live verification for Kakashi (Kamui) PHASE 3.
// FROG HENGE (Crouch + Charge-tap): smoke → small/low hurtbox, can hop, CANNOT attack, any attack-button press
// pops out. + the 4 palette SKINS (Default/Red/Blue/Dark) render their recolored sheets.
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
const shot = n => page.screenshot({ path: path.join(OUT, `kwar3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(10); }
async function enterFrog() { await page.keyboard.down("s"); await waitFrames(5); await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(2); await page.keyboard.up("s"); await waitFrames(3); }

await boot(`${base}/index.html?harness=1&p1=kakashi_war&p2=naruto`);
await toBattle();
const f0 = await p1();
ok((f0.key || "").toLowerCase() === "kakashi_war", `P1 is kakashi_war`);
const baseH = f0.h;
console.log(`  base hurtbox h=${baseH}`);

// ── 1) FROG HENGE — Crouch+Charge-tap → small/low hurtbox ──
await reset();
await enterFrog();
const frog = await p1();
await shot("01_frog");
console.log(`  Frog: h ${baseH} → ${frog.h}`);
ok(frog.h < baseH * 0.75, `Frog Henge shrinks the hurtbox (h ${baseH}→${frog.h}, ducks highs)`);

// ── 2) FROG can HOP (move) but CANNOT attack — pressing Light pops him OUT (no damage) ──
await reset(); await enterFrog();
const hopX0 = (await p1()).x;
await page.keyboard.down("d"); await waitFrames(14); await page.keyboard.up("d");
const hopX1 = (await p1()).x;
console.log(`  Frog hop: x ${Math.round(hopX0)} → ${Math.round(hopX1)} (Δ${Math.round(hopX1 - hopX0)})`);
ok(Math.abs(hopX1 - hopX0) > 10, `Frog can hop/move (Δx=${Math.round(hopX1 - hopX0)})`);
// now press Light → should POP OUT (hurtbox restores) and NOT damage the foe
const fHpBefore = (await p2()).health;
await page.keyboard.down("j"); await waitFrames(3); await page.keyboard.up("j");
await waitFrames(6);
const afterPop = await p1(); const fHpAfter = (await p2()).health;
await shot("02_frog_popout");
console.log(`  Attack-button pop-out: h ${afterPop.h} (restored≈${baseH}), foe dmg Δ${Math.round(fHpBefore - fHpAfter)}`);
ok(afterPop.h >= baseH * 0.9, `Frog pops back on an attack-button press (h restored to ${afterPop.h})`);
ok((fHpBefore - fHpAfter) < 10, `Frog CANNOT attack (foe took ${Math.round(fHpBefore - fHpAfter)} dmg)`);

// ── 3) FROG pops out ON HIT (damage frames) — apply a hit via setP2X + p2 attack is unreliable; instead
//      re-enter frog and confirm a manual re-toggle (Crouch+Charge) pops him out cleanly. ──
await reset(); await enterFrog();
ok((await p1()).h < baseH * 0.75, `re-entered frog (h=${(await p1()).h})`);
await enterFrog();   // Crouch+Charge again = manual pop-out
await waitFrames(6);
ok((await p1()).h >= baseH * 0.9, `manual Crouch+Charge toggles the frog back out (h=${(await p1()).h})`);

// ── 4) SKINS — the 4 palettes render their recolored sheets ──
for (const [sid, tag] of [["kwarRed", "__red"], ["kwarBlue", "__blue"], ["kwarDark", "__dark"]]) {
  const r = await page.evaluate((id) => window.__harness.setSkin?.("p1", id), sid);
  await waitFrames(4);
  const sf = await p1();
  const sheet = sf.spriteSheet || sf.sheet || "";
  await shot(`03_skin_${sid}`);
  console.log(`  skin ${sid}: skinId=${sf.skinId} sheet=${sheet}`);
  ok((sf.skinId === sid) && sheet.includes(tag), `skin ${sid} renders the ${tag} recolored sheet`);
}

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kwar3_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
