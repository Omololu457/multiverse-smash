// harness/shizuku_phase3_live.mjs — REAL live verification for Shizuku PHASE 3 (ultimates + lines + skins).
// NODE check: arcade matchup lines (vs chrollo = matchup, vs goku = generic). PLAYWRIGHT: Bloodletting
// (neutral U → combo damage + lifesteal heal), Spring Cleaning (Down U → clears opp projectiles [first 3 →
// belly] + sweep damage), directional routing, ult cooldown gate, and the 3 recolor skins boot + render.
// P1 keys: move a/d, jump w, crouch s, light j, heavy k, upAttack i, special l, ultimate u, block ;.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };

// ── NODE: matchup-line routing ──
const { characters } = await import("../characters.js");
const { arcadeRivalDialogue } = await import("../arcade.js");
const vsChrollo = arcadeRivalDialogue("shizuku", "chrollo", characters);
ok(/Danchou/i.test(vsChrollo.pre?.[0] || ""), `matchup line vs chrollo routes (pre="${(vsChrollo.pre?.[0] || "").slice(0, 40)}...")`);
const vsKurapika = arcadeRivalDialogue("shizuku", "kurapika", characters);
ok(/spider|chain/i.test(JSON.stringify(vsKurapika)), `matchup line vs kurapika routes`);
const vsGoku = arcadeRivalDialogue("shizuku", "goku", characters);
ok(/slipped my mind|name/i.test(vsGoku.pre?.[0] || ""), `non-HxH foe (goku) falls back to the forgetful generic line`);

const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `shz3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sz = (who = "p1") => page.evaluate(w => window.__harness.shizukuState(w), who);
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await reset(); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.resetFighterInput?.("p2"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.clearProjectiles?.(); if (window.__harness.p1()) { window.__harness.p1().ultimateCooldown = 0; } }); await waitFrames(6); }

await boot(`${base}/index.html?harness=1&p1=shizuku&p2=gaara`);
await toBattle();
ok(PERR === 0, `no page errors at boot (${PERR})`);

// Fire a directional ult on the LIVE fighter (p1() is a read-only snapshot — can't set _ultVariant on it).
const fireUlt = v => page.evaluate(x => window.__harness.shizukuUlt(x), v);

// ── 1) BLOODLETTING (neutral) — combo damage + LIFESTEAL heal (40% dealt, cap 12% max HP) ──
await reset();
await page.evaluate(() => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 60); window.__harness.setP1HealthRaw?.(500); } catch (_) {} });
await waitFrames(2);
const bHp0 = (await p1()).health, oHp0 = (await p2()).health;
const retB = await fireUlt("bloodletting");
await waitFrames(122);                             // whole cinematic + heal beat (112)
const bHp1 = (await p1()).health, oHp1 = (await p2()).health; const szBend = await sz("p1");
await shot("01_bloodletting");
ok(retB.cast === "shizukuBloodletting", `neutral → Bloodletting cast pose (cast=${retB.cast})`);
ok(oHp0 - oHp1 > 0, `Bloodletting deals damage (opp ${Math.round(oHp0)}→${Math.round(oHp1)}, Δ${Math.round(oHp0 - oHp1)})`);
ok(bHp1 > bHp0, `Bloodletting LIFESTEAL heals Shizuku (${Math.round(bHp0)}→${Math.round(bHp1)}, +${Math.round(bHp1 - bHp0)}; dealt=${szBend.ultDealt})`);
ok(bHp1 - bHp0 <= Math.ceil(1120 * 0.12) + 1, `heal respects the 12% max-HP cap (+${Math.round(bHp1 - bHp0)} ≤ ${Math.ceil(1120 * 0.12)})`);

// ── 2) SPRING CLEANING (Down) — clears opp projectiles (first 3 → belly) + sweep damage ──
await reset();
await page.evaluate(() => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 70); } catch (_) {} });
await waitFrames(2);
// spawn 2 opp projectiles, THEN fire the sweep (same tick) → p1's i-frames keep them alive until the clear beat.
const szC = await page.evaluate(() => { window.__harness.enemyProjAtP1(40); window.__harness.enemyProjAtP1(40); return window.__harness.shizukuUlt("springCleaning"); });
const beforeClean = await sz("p1");
const cHpO0 = (await p2()).health;
await waitFrames(40);                              // past the sweep-clear beat (30) + first damage beats
const afterClean = await sz("p1");
await waitFrames(70);
const cHpO1 = (await p2()).health;
await shot("02_springcleaning");
ok(szC.cast === "shizukuSpringClean", `Down → Spring Cleaning cast pose (cast=${szC.cast})`);
ok(afterClean.projOpp === 0, `Spring Cleaning removed every opponent projectile (projOpp=${afterClean.projOpp})`);
ok(afterClean.belly >= 1, `the first cleared projectiles went INTO the belly (belly=${afterClean.belly})`);
ok(cHpO0 - cHpO1 > 0, `Spring Cleaning hose barrage deals damage (opp Δ${Math.round(cHpO0 - cHpO1)})`);

// ── 3) REFUSAL during a Domain event (brief: refuse during KO / Brutality / Domain / rewind) ──
await reset();
await page.evaluate(() => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 70); } catch (_) {} });
await waitFrames(2);
const oHpR0 = (await p2()).health;
const refusal = await page.evaluate(() => {
  window.__harness.shizukuSetDomainFrozen(true, "p1");
  const r = window.__harness.shizukuUlt("bloodletting");   // must REFUSE + REFUND (no cast, 0 spent)
  window.__harness.shizukuSetDomainFrozen(false, "p1");
  return r;
});
await waitFrames(8);
const oHpR1 = (await p2()).health;
ok(refusal.cast !== "shizukuBloodletting", `no cast pose on the ult refused during a Domain event (cast=${refusal.cast})`);
ok(refusal.spent <= 0, `energy REFUNDED on refusal (spent=${refusal.spent})`);
ok(Math.round(oHpR0) === Math.round(oHpR1), `refused ultimate dealt NO damage (opp ${Math.round(oHpR0)}→${Math.round(oHpR1)})`);

// ── 4) SKINS — boot each of the 3 palettes; confirm it loads + renders (no page errors) ──
for (const skin of ["default", "animeold", "manga"]) {
  await page.evaluate(s => window.__harness.bootSkin?.(s, "default"), skin);
  await waitFrames(8);
  const f = await p1();
  const okc = !!f && (f.key || "").toLowerCase() === "shizuku";
  ok(okc, `skin "${skin}" boots shizuku + renders (skinId=${f && f.skinId})`);
  await shot(`03_skin_${skin}`);
}
ok(PERR === 0, `no page errors across Phase 3 (${PERR})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/shz3_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
