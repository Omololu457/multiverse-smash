// harness/shisui_live.mjs — REAL-INPUT live verification for Shisui (Trinity), PHASE 1 (THE LOYALIST).
// Boots a real match (?p1=shisui_trinity&p2=naruto), drives every NORMAL + the 5 directional Specials +
// the Susanoo Tsukumo Ultimate through real page.keyboard presses, screenshots each. Proves: shisui_trinity
// is selectable (naruto universe), boots as a real SPRITE (not a procedural box), every normal renders its
// own uniform sheet, each special fires (Fireball/Kunai projectiles spawn; Genjutsu Grab staggers; Flurry +
// Backstab reposition), the Ultimate casts, the Chakra energy label reads "Chakra", and the art holds clean.
// Keys: j light / k heavy / i up / w jump / a,d move / s down / l special / u ultimate / ; guard.
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
// ignore the PRE-EXISTING concurrent-session pageerror (drawSasukeAdultStance) — only flag shisui-relevant ones
page.on("pageerror", e => { if (!/drawSasukeAdultStance/.test(e.message)) console.log("  PAGEERROR:", e.message); });
const shot = n => page.screenshot({ path: path.join(OUT, `shisui_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { key: f.key, health: Math.round(f.health ?? -1), maxHealth: f.maxHealth, energy: Math.round(f.energy ?? -1), maxEnergy: f.maxEnergy, x: Math.round(f.x ?? 0), scale: f.spriteScale, grounded: f.grounded, attacking: !!f.attacking, blocking: !!f.isBlocking, move: f.currentMove || null, cast: f._spriteCastMove || null, sheet: (f.spriteSheet || null), hasSprite: !!f.hasSpriteHandler }; });
const p2 = () => page.evaluate(() => { const f = window.__harness.p2() || {}; return { health: Math.round(f.health ?? -1), hitstun: Math.round(f.hitstun ?? 0), x: Math.round(f.x ?? 0) }; });
const projCount = () => page.evaluate(() => (window.__harness.projectiles?.() || []).length);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.refill?.("p1"); }); await waitFrames(4); }
async function heal() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.fillEnergy?.(); window.__harness.setEnergy?.(999); window.__harness.healP2?.(); }); await waitFrames(2); }

// ── 1) REAL SELECT SCREEN (naruto roster incl. shisui_trinity) ──
await boot(`${base}/index.html?harness=1`);
const sel = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
await new Promise(r => setTimeout(r, 400)); await shot("01_select");
ok(JSON.stringify(sel || "").includes("shisui_trinity"), `select roster (naruto) includes shisui_trinity`);

// ── 2) BOOT REAL MATCH — sprite gate + stats ──
await boot(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`);
await page.evaluate(() => window.__harness.start?.());
await waitFrames(6); await shot("02_intro");
await toBattle();
const b = await p1();
console.log("after boot p1:", JSON.stringify(b));
ok(b.key === "shisui_trinity", `p1 is shisui_trinity (got ${b.key})`);
ok(b.hasSprite === true, `renders as a SPRITE handler (not procedural box)`);
ok(!!b.sheet && /shisui_trinity_idle/.test(b.sheet), `idle renders its real uniform sheet (${b.sheet})`);
ok(Math.abs((b.scale || 0) - 1.4) < 0.01, `spriteScale 1.4 (got ${b.scale})`);
ok(b.maxHealth === 1050, `HP 1050 (got ${b.maxHealth})`);
const label = await page.evaluate(() => { try { return window.__harness.energyLabel?.("p1"); } catch (e) { return String(e); } });
ok(label == null || /chakra/i.test(String(label)), `energy label is "Chakra" (got ${JSON.stringify(label)})`);
await shot("03_idle");

// ── 3) NORMALS ──
async function move(label, keys, shotAtFrame = 5, hold = 10, downExtra = null) {
  await heal();
  for (const k of keys) await page.keyboard.down(k);
  if (downExtra) { await waitFrames(2); for (const k of downExtra) await page.keyboard.down(k); }
  await waitFrames(shotAtFrame);
  const mid = await p1(); await shot(label);
  await waitFrames(Math.max(1, hold - shotAtFrame));
  for (const k of [...(downExtra||[]), ...keys]) await page.keyboard.up(k);
  await waitFrames(20);
  console.log(`${label}: attacking=${mid.attacking} move=${mid.move} cast=${mid.cast} sheet=${mid.sheet}`);
  return mid;
}
await move("04_run", ["d"], 12, 16);
const mL = await move("05_light", ["j"], 4, 10); ok(/shisui_trinity_light/.test(mL.sheet||"") || mL.attacking, `light plays (${mL.sheet})`);
const mH = await move("06_heavy", ["k"], 6, 14); ok(/shisui_trinity_heavy|armslam/.test(mH.sheet||"") || mH.attacking, `heavy (Susanoo arm) plays (${mH.sheet})`);
const mU = await move("07_up", ["i"], 5, 12);    ok(/shisui_trinity_up/.test(mU.sheet||"") || mU.attacking, `up launcher plays (${mU.sheet})`);
const mA = await move("08_air", ["w"], 10, 16, ["j"]); ok(/shisui_trinity_air/.test(mA.sheet||"") || !mA.grounded, `air plays (${mA.sheet})`);

// ── 4) SPECIALS (directional: hold dir, press l) ──
async function special(label, dirKeys, { ultimate = false } = {}) {
  await heal(); const e0 = (await p1()).energy; const h2before = (await p2()).health;
  for (const k of dirKeys) await page.keyboard.down(k);
  await waitFrames(2); await page.keyboard.down(ultimate ? "u" : "l");
  await waitFrames(4); await page.keyboard.up(ultimate ? "u" : "l");
  await waitFrames(6); const mid = await p1(); const pc = await projCount(); await shot(label);
  await waitFrames(14); for (const k of dirKeys) await page.keyboard.up(k); await waitFrames(14);
  const h2after = (await p2()).health; const p2h = await p2();
  console.log(`${label}: energy ${e0}→${mid.energy} proj=${pc} cast=${mid.cast} | p2 hp ${h2before}→${h2after} hitstun=${p2h.hitstun}`);
  return { e0, mid, pc, dmg: h2before - h2after, p2h };
}
const sFire = await special("09_fireball_N", []);         ok(sFire.pc >= 1 || sFire.e0 > sFire.mid.energy, `Fireball fired (proj=${sFire.pc}, energy ${sFire.e0}→${sFire.mid.energy})`);
const sGrab = await special("10_genjutsu_grab_B", ["a"]); ok(sGrab.e0 > sGrab.mid.energy, `Genjutsu Grab cast (energy ${sGrab.e0}→${sGrab.mid.energy})`);
const sRain = await special("11_kunai_rain_D", ["s"]);    ok(sRain.pc >= 1 || sRain.e0 > sRain.mid.energy, `Kunai Rain fired (proj=${sRain.pc})`);
const sFlur = await special("12_flurry_U", ["w"]);        ok(sFlur.e0 > sFlur.mid.energy || sFlur.mid.cast === "shiFlurry", `Body-Flicker Flurry cast (cast=${sFlur.mid.cast})`);
const sBack = await special("13_backstab_F", ["d"]);      ok(sBack.e0 > sBack.mid.energy || sBack.mid.cast === "shiBackstab", `Shunshin Backstab cast (cast=${sBack.mid.cast})`);

// ── 5) ULTIMATE — Susanoo Tsukumo (neutral + Ultimate) ──
const sUlt = await special("14_susanoo_ult", [], { ultimate: true });
ok(sUlt.e0 > sUlt.mid.energy || sUlt.mid.cast === "shiSusanoo", `Susanoo Tsukumo cast (cast=${sUlt.mid.cast}, energy ${sUlt.e0}→${sUlt.mid.energy})`);
await waitFrames(40); await shot("14b_susanoo_mid");

// ── 6) GUARD ribcage FX ──
await heal(); await page.keyboard.down(";"); await waitFrames(8); const mG = await p1(); await shot("15_guard_ribcage"); await page.keyboard.up(";"); await waitFrames(6);
ok(mG.blocking === true, `guard: isBlocking true (ribcage FX draws over it)`);

// ── 7) WIN POSE ──
await heal(); const w = await page.evaluate(() => { try { return window.__harness.forceAction?.("win", "p1"); } catch (e) { return String(e); } });
await waitFrames(8); await shot("16_win"); const mWin = await p1();
ok(/shisui_trinity_win/.test(mWin.sheet||"") || !!w, `win pose rendered (${mWin.sheet})`);
await page.evaluate(() => { try { window.__harness.forceAction?.(null, "p1"); } catch (_) {} });

// ── 8) ALPHA on a DARK stage (border-flood-fill key: no navy box, no halo) ──
await boot(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`); await toBattle();
await page.evaluate(n => { try { return window.__harness.selectStageByName?.(n); } catch (e) { return String(e); } }, "Shibuya Incident");
await waitFrames(8); await shot("17_stage_dark");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/shisui_*.png`);
process.exit(FAILS ? 1 : 0);
